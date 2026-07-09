import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError, BadRequestError, NotFoundError } from "../utils/errors";
import { CheckoutRepository } from "../repositories/checkout.repository";
import { MailService } from "./mail.service";
import {
  CheckoutFailureResponse,
  CheckoutInitiationResponse,
  CheckoutVerificationResponse,
  ICheckoutService,
} from "../types/checkout.types";

const TRANSACTION_UUID_REGEX = /^[A-Za-z0-9-]{8,64}$/;
const AMOUNT_EPSILON = 0.001;
const KHALTI_PAISA_MULTIPLIER = 100;
const DEFAULT_KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const DEFAULT_KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";

interface KhaltiInitiateResponsePayload {
  pidx?: string;
  payment_url?: string;
  expires_at?: string;
  expires_in?: number;
}

interface KhaltiLookupPayload {
  pidx?: string;
  status?: string;
  purchase_order_id?: string;
  transaction_id?: string;
  total_amount?: number | string;
}

interface KhaltiConfig {
  secretKey: string;
  initiateUrl: string;
  lookupUrl: string;
  websiteUrl: string;
}

export class CheckoutService implements ICheckoutService {
  private readonly repo: CheckoutRepository;
  private readonly mail: MailService;
  private readonly frontendBaseUrl: string;
  private readonly khaltiSecretKey?: string;
  private readonly khaltiInitiateUrl?: string;
  private readonly khaltiLookupUrl?: string;
  private readonly khaltiWebsiteUrl?: string;

  constructor() {
    this.repo = new CheckoutRepository();
    this.mail = new MailService();
    this.frontendBaseUrl = this.getRequiredEnv("FRONTEND_BASE_URL");
    this.khaltiSecretKey =
      this.getOptionalEnv("KHALTI_SECRET_KEY") ?? this.getOptionalEnv("KHALTI_SECRET");
    this.khaltiInitiateUrl = this.getOptionalEnv("KHALTI_INITIATE_URL");
    this.khaltiLookupUrl = this.getOptionalEnv("KHALTI_LOOKUP_URL");
    this.khaltiWebsiteUrl = this.getOptionalEnv("KHALTI_WEBSITE_URL");
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new AppError(`Missing required environment variable: ${name}`, 500);
    }

    return value;
  }

  private getOptionalEnv(name: string): string | undefined {
    const value = process.env[name];
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getKhaltiConfig(): KhaltiConfig {
    const missing: string[] = [];
    if (!this.khaltiSecretKey) missing.push("KHALTI_SECRET_KEY");

    if (missing.length > 0) {
      throw new AppError(
        `Missing required Khalti configuration: ${missing.join(", ")}`,
        500,
      );
    }

    const secretKey = this.khaltiSecretKey!;
    const initiateUrl = this.khaltiInitiateUrl ?? DEFAULT_KHALTI_INITIATE_URL;
    const lookupUrl = this.khaltiLookupUrl ?? DEFAULT_KHALTI_LOOKUP_URL;

    if (!secretKey || !initiateUrl || !lookupUrl) {
      throw new AppError("Khalti configuration is incomplete", 500);
    }

    return {
      secretKey,
      initiateUrl,
      lookupUrl,
      websiteUrl: this.khaltiWebsiteUrl ?? this.frontendBaseUrl,
    };
  }

  private generateTransactionUuid(): string {
    return `KHL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  private async readErrorPayload(response: Response): Promise<string> {
    try {
      const text = await response.text();
      if (!text) {
        return `HTTP ${response.status}`;
      }

      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const detail =
          (typeof parsed.detail === "string" && parsed.detail) ||
          (typeof parsed.error_key === "string" && parsed.error_key) ||
          "";

        const fieldEntries = Object.entries(parsed)
          .filter(([key, value]) => key !== "detail" && key !== "status_code")
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(", ")}`;
            }
            if (typeof value === "string") {
              return `${key}: ${value}`;
            }
            return `${key}: ${JSON.stringify(value)}`;
          });

        const combined = [detail, ...fieldEntries].filter((part) => part.length > 0).join(" | ");
        return combined.length > 0 ? combined : text;
      } catch {
        return text;
      }
    } catch {
      return `HTTP ${response.status}`;
    }
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private parseTransactionUuid(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    return TRANSACTION_UUID_REGEX.test(value) ? value : null;
  }

  private getUnitPrice(
    book: { price: number; formatPrices: Array<{ format: string; price: number }> },
    format: string | null | undefined,
  ): number {
    if (!format) return book.price;
    return book.formatPrices?.find((fp) => fp.format === format)?.price ?? book.price;
  }

  private async callKhaltiLookup(pidx: string, config: KhaltiConfig): Promise<KhaltiLookupPayload> {
    const response = await fetch(config.lookupUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${config.secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    if (!response.ok) {
      const upstreamError = await this.readErrorPayload(response);
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestError(`Khalti lookup rejected: ${upstreamError}`);
      }
      throw new AppError(`Failed to verify Khalti transaction status: ${upstreamError}`, 502);
    }

    const payload = (await response.json()) as KhaltiLookupPayload;
    return payload;
  }

  async initiateKhalti(userId: string, addressId?: string): Promise<CheckoutInitiationResponse> {
    const config = this.getKhaltiConfig();
    const cartItems = await this.repo.findCartItemsByUserId(userId);
    if (cartItems.length === 0) {
      throw new BadRequestError("Cart is empty");
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + this.getUnitPrice(item.book, item.format) * item.quantity,
      0,
    );
    const totalAmountInPaisa = Math.round(totalAmount * KHALTI_PAISA_MULTIPLIER);
    if (totalAmountInPaisa <= 0) {
      throw new BadRequestError("Order total must be greater than zero");
    }
    if (totalAmountInPaisa < 1000) {
      throw new BadRequestError("Khalti requires minimum payable amount of NPR 10 (1000 paisa)");
    }

    const transactionUuid = this.generateTransactionUuid();
    const order = await this.repo.createPendingOrder({
      userId,
      totalAmount,
      paymentProvider: "KHALTI",
      paymentTransactionUuid: transactionUuid,
      addressId,
      items: cartItems.map((item) => ({
        bookId: item.bookId,
        quantity: item.quantity,
        price: this.getUnitPrice(item.book, item.format),
      })),
    });

    const response = await fetch(config.initiateUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${config.secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        return_url: `${this.frontendBaseUrl}/checkout/success`,
        website_url: config.websiteUrl,
        amount: totalAmountInPaisa,
        purchase_order_id: transactionUuid,
        purchase_order_name: `Book order ${order.id}`,
      }),
    });

    if (!response.ok) {
      const upstreamError = await this.readErrorPayload(response);
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestError(`Khalti initiate rejected: ${upstreamError}`);
      }
      throw new AppError(`Failed to initiate Khalti checkout: ${upstreamError}`, 502);
    }

    const payload = (await response.json()) as KhaltiInitiateResponsePayload;
    if (!payload.pidx || !payload.payment_url) {
      throw new AppError("Invalid response from Khalti checkout initiation", 502);
    }

    return {
      orderId: order.id,
      transactionUuid,
      paymentProvider: "KHALTI",
      paymentUrl: payload.payment_url,
      pidx: payload.pidx,
    };
  }

  async verifyKhaltiSuccess(
    pidx: string,
    purchaseOrderId?: string,
  ): Promise<CheckoutVerificationResponse> {
    if (!pidx || pidx.trim().length === 0) {
      throw new BadRequestError("pidx is required");
    }

    const config = this.getKhaltiConfig();
    const lookup = await this.callKhaltiLookup(pidx, config);
    const status = lookup.status?.toUpperCase() ?? "UNKNOWN";

    // The Khalti lookup API does NOT return purchase_order_id in its response.
    // Use the purchase_order_id from the callback redirect query params instead.
    if (!purchaseOrderId || !TRANSACTION_UUID_REGEX.test(purchaseOrderId)) {
      throw new BadRequestError("Invalid transaction_uuid");
    }
    const transactionUuid = purchaseOrderId;

    const order = await this.repo.findOrderByTransactionUuid(transactionUuid);
    if (!order) {
      throw new NotFoundError("Order");
    }

    const callbackAmountInPaisa = this.parseKhaltiAmountInPaisa(lookup.total_amount);
    const expectedAmountInPaisa = Math.round(order.totalAmount * KHALTI_PAISA_MULTIPLIER);
    if (Math.abs(expectedAmountInPaisa - callbackAmountInPaisa) > 1) {
      throw new BadRequestError("Khalti callback amount does not match order total");
    }

    if (status === "COMPLETED") {
      if (this.repo.isPaid(order.paymentStatus)) {
        return {
          orderId: order.id,
          transactionUuid,
          paymentStatus: "PAID",
          orderStatus: "CONFIRMED",
          statusCheck: status,
          alreadyProcessed: true,
        };
      }

      const paymentRefId =
        typeof lookup.transaction_id === "string" && lookup.transaction_id.length > 0
          ? lookup.transaction_id
          : null;

      await this.repo.markOrderPaidAndClearCart(
        order.id,
        order.userId,
        order.items.map((item) => item.bookId),
        paymentRefId,
        this.toJsonValue({
          lookup,
          pidx,
        }),
      );

      // Send order confirmation email (non-blocking)
      await this.sendOrderConfirmation(order.userId, order.id, order.totalAmount);

      return {
        orderId: order.id,
        transactionUuid,
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
        statusCheck: status,
        alreadyProcessed: false,
      };
    }

    if (!this.repo.isPaid(order.paymentStatus)) {
      await this.repo.markOrderFailed(
        order.id,
        this.toJsonValue({
          lookup,
          pidx,
        }),
      );
    }

    return {
      orderId: order.id,
      transactionUuid,
      paymentStatus: "FAILED",
      orderStatus: "PENDING",
      statusCheck: status,
      alreadyProcessed: false,
    };
  }

  async handleKhaltiFailure(query: Record<string, unknown>): Promise<CheckoutFailureResponse> {
    const purchaseOrderIdFromQuery = this.parseTransactionUuid(query.purchase_order_id);
    let transactionUuid = purchaseOrderIdFromQuery;

    if (!transactionUuid) {
      const pidx = typeof query.pidx === "string" ? query.pidx : null;
      if (pidx) {
        try {
          const config = this.getKhaltiConfig();
          const lookup = await this.callKhaltiLookup(pidx, config);
          transactionUuid = this.parseTransactionUuid(lookup.purchase_order_id);
        } catch {
          transactionUuid = null;
        }
      }
    }

    if (!transactionUuid) {
      return {
        handled: false,
        orderId: null,
        transactionUuid: null,
        paymentStatus: null,
      };
    }

    const order = await this.repo.findOrderByTransactionUuid(transactionUuid);
    if (!order) {
      return {
        handled: false,
        orderId: null,
        transactionUuid,
        paymentStatus: null,
      };
    }

    if (this.repo.isPaid(order.paymentStatus)) {
      return {
        handled: true,
        orderId: order.id,
        transactionUuid,
        paymentStatus: "PAID",
      };
    }

    await this.repo.markOrderFailed(
      order.id,
      this.toJsonValue({
        failureQuery: query,
      }),
    );

    return {
      handled: true,
      orderId: order.id,
      transactionUuid,
      paymentStatus: "FAILED",
    };
  }

  private async sendOrderConfirmation(userId: string, orderId: string, totalAmount: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (!user) return;

      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
        select: {
          quantity: true,
          price: true,
          book: { select: { title: true } },
        },
      });

      await this.mail.sendOrderConfirmation(user.email, user.name, {
        id: orderId,
        totalAmount,
        items: orderItems.map((item) => ({
          title: item.book.title,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    } catch (err) {
      console.error(`[CheckoutService] Failed to send order confirmation for ${orderId}:`, err);
    }
  }

  private parseKhaltiAmountInPaisa(value: string | number | undefined): number {
    if (value === undefined || value === null) {
      throw new BadRequestError("Khalti total_amount is required");
    }

    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new BadRequestError("Khalti total_amount is invalid");
    }

    return Math.round(numeric);
  }
}
