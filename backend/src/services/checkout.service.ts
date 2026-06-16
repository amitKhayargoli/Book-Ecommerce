import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { AppError, BadRequestError, NotFoundError } from "../utils/errors";
import { CheckoutRepository } from "../repositories/checkout.repository";
import {
  CheckoutFailureResponse,
  CheckoutInitiationResponse,
  CheckoutVerificationResponse,
  ICheckoutService,
} from "../types/checkout.types";

const SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code";
const TRANSACTION_UUID_REGEX = /^[A-Za-z0-9-]{8,64}$/;
const AMOUNT_EPSILON = 0.001;
const KHALTI_PAISA_MULTIPLIER = 100;
const DEFAULT_KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const DEFAULT_KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";

interface EsewaSuccessPayload {
  transaction_code?: string;
  status?: string;
  total_amount?: string;
  transaction_uuid?: string;
  product_code?: string;
  signed_field_names?: string;
  signature?: string;
}

interface EsewaStatusCheckPayload {
  status?: string;
  ref_id?: string;
  transaction_uuid?: string;
}

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
  private readonly productCode: string;
  private readonly secretKey: string;
  private readonly formUrl: string;
  private readonly statusCheckUrl: string;
  private readonly frontendBaseUrl: string;
  private readonly khaltiSecretKey?: string;
  private readonly khaltiInitiateUrl?: string;
  private readonly khaltiLookupUrl?: string;
  private readonly khaltiWebsiteUrl?: string;

  constructor() {
    this.repo = new CheckoutRepository();
    this.productCode = this.getRequiredEnv("ESEWA_PRODUCT_CODE");
    this.secretKey = this.getRequiredEnv("ESEWA_SECRET_KEY");
    this.formUrl = this.getRequiredEnv("ESEWA_FORM_URL");
    this.statusCheckUrl = this.getRequiredEnv("ESEWA_STATUS_CHECK_URL");
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

    const secretKey = this.khaltiSecretKey;
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

  private formatAmount(value: number): string {
    return value.toFixed(2);
  }

  private generateTransactionUuid(): string {
    return `ESW-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  private generateKhaltiTransactionUuid(): string {
    return `KHL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  private buildHmacSignature(message: string): string {
    return crypto.createHmac("sha256", this.secretKey).update(message).digest("base64");
  }

  private safeCompareSignature(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }

  private parseAmount(value: string | undefined, fieldName: string): number {
    if (!value) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestError(`${fieldName} is invalid`);
    }

    return amount;
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

  private assertTransactionUuid(transactionUuid: string | undefined): string {
    if (!transactionUuid || !TRANSACTION_UUID_REGEX.test(transactionUuid)) {
      throw new BadRequestError("Invalid transaction_uuid");
    }

    return transactionUuid;
  }

  private parseTransactionUuid(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    return TRANSACTION_UUID_REGEX.test(value) ? value : null;
  }

  private assertOrderProvider(orderProvider: string, expectedProvider: "ESEWA" | "KHALTI"): void {
    if (orderProvider !== expectedProvider) {
      throw new BadRequestError(`Unexpected payment provider: ${orderProvider}`);
    }
  }

  private decodeSuccessPayload(encodedData: string): EsewaSuccessPayload {
    let decoded = "";
    try {
      decoded = Buffer.from(encodedData, "base64").toString("utf8");
    } catch {
      throw new BadRequestError("Invalid eSewa callback payload encoding");
    }

    try {
      return JSON.parse(decoded) as EsewaSuccessPayload;
    } catch {
      throw new BadRequestError("Invalid eSewa callback payload format");
    }
  }

  private verifySuccessPayloadSignature(payload: EsewaSuccessPayload): void {
    const signature = payload.signature;
    const signedFieldNames = payload.signed_field_names;

    if (!signature || !signedFieldNames) {
      throw new BadRequestError("Missing callback signature fields");
    }

    const fieldNames = signedFieldNames
      .split(",")
      .map((field) => field.trim())
      .filter((field) => field.length > 0);

    if (fieldNames.length === 0) {
      throw new BadRequestError("signed_field_names is invalid");
    }

    const payloadRecord = payload as Record<string, unknown>;
    const message = fieldNames
      .map((fieldName) => {
        const value = payloadRecord[fieldName];
        if (typeof value !== "string" || value.length === 0) {
          throw new BadRequestError(`Missing signed callback field: ${fieldName}`);
        }

        return `${fieldName}=${value}`;
      })
      .join(",");

    const expectedSignature = this.buildHmacSignature(message);
    if (!this.safeCompareSignature(expectedSignature, signature)) {
      throw new BadRequestError("Invalid callback signature");
    }
  }

  private async callEsewaStatusCheck(
    transactionUuid: string,
    totalAmount: string,
  ): Promise<EsewaStatusCheckPayload> {
    const params = new URLSearchParams({
      product_code: this.productCode,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
    });

    const response = await fetch(`${this.statusCheckUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new AppError("Failed to verify eSewa transaction status", 502);
    }

    const payload = (await response.json()) as EsewaStatusCheckPayload;
    return payload;
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

  async initiateEsewa(userId: string): Promise<CheckoutInitiationResponse> {
    const cartItems = await this.repo.findCartItemsByUserId(userId);
    if (cartItems.length === 0) {
      throw new BadRequestError("Cart is empty");
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.book.price * item.quantity,
      0,
    );

    const transactionUuid = this.generateTransactionUuid();
    const formattedTotalAmount = this.formatAmount(totalAmount);
    const signatureMessage = `total_amount=${formattedTotalAmount},transaction_uuid=${transactionUuid},product_code=${this.productCode}`;
    const signature = this.buildHmacSignature(signatureMessage);

    const order = await this.repo.createPendingOrder({
      userId,
      totalAmount,
      paymentProvider: "ESEWA",
      paymentTransactionUuid: transactionUuid,
      items: cartItems.map((item) => ({
        bookId: item.bookId,
        quantity: item.quantity,
        price: item.book.price,
      })),
    });

    return {
      orderId: order.id,
      transactionUuid,
      paymentProvider: "ESEWA",
      action: this.formUrl,
      form: {
        amount: formattedTotalAmount,
        tax_amount: this.formatAmount(0),
        total_amount: formattedTotalAmount,
        transaction_uuid: transactionUuid,
        product_code: this.productCode,
        product_service_charge: this.formatAmount(0),
        product_delivery_charge: this.formatAmount(0),
        success_url: `${this.frontendBaseUrl}/checkout/success`,
        failure_url: `${this.frontendBaseUrl}/checkout/failure`,
        signed_field_names: SIGNED_FIELD_NAMES,
        signature,
      },
    };
  }

  async initiateKhalti(userId: string): Promise<CheckoutInitiationResponse> {
    const config = this.getKhaltiConfig();
    const cartItems = await this.repo.findCartItemsByUserId(userId);
    if (cartItems.length === 0) {
      throw new BadRequestError("Cart is empty");
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.book.price * item.quantity,
      0,
    );
    const totalAmountInPaisa = Math.round(totalAmount * KHALTI_PAISA_MULTIPLIER);
    if (totalAmountInPaisa <= 0) {
      throw new BadRequestError("Order total must be greater than zero");
    }
    if (totalAmountInPaisa < 1000) {
      throw new BadRequestError("Khalti requires minimum payable amount of NPR 10 (1000 paisa)");
    }

    const transactionUuid = this.generateKhaltiTransactionUuid();
    const order = await this.repo.createPendingOrder({
      userId,
      totalAmount,
      paymentProvider: "KHALTI",
      paymentTransactionUuid: transactionUuid,
      items: cartItems.map((item) => ({
        bookId: item.bookId,
        quantity: item.quantity,
        price: item.book.price,
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

  async verifyEsewaSuccess(encodedData: string): Promise<CheckoutVerificationResponse> {
    const payload = this.decodeSuccessPayload(encodedData);
    this.verifySuccessPayloadSignature(payload);

    if (payload.product_code !== this.productCode) {
      throw new BadRequestError("Unexpected eSewa product_code");
    }

    const transactionUuid = this.assertTransactionUuid(payload.transaction_uuid);
    const callbackAmount = this.parseAmount(payload.total_amount, "total_amount");

    const order = await this.repo.findOrderByTransactionUuid(transactionUuid);
    if (!order) {
      throw new NotFoundError("Order");
    }
    this.assertOrderProvider(order.paymentProvider, "ESEWA");

    if (Math.abs(order.totalAmount - callbackAmount) > AMOUNT_EPSILON) {
      throw new BadRequestError("Callback amount does not match order total");
    }

    const statusCheck = await this.callEsewaStatusCheck(transactionUuid, this.formatAmount(callbackAmount));
    const status = statusCheck.status?.toUpperCase() ?? "UNKNOWN";

    if (status === "COMPLETE") {
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
        typeof statusCheck.ref_id === "string" && statusCheck.ref_id.length > 0
          ? statusCheck.ref_id
          : null;

      await this.repo.markOrderPaidAndClearCart(
        order.id,
        order.userId,
        order.items.map((item) => item.bookId),
        paymentRefId,
        this.toJsonValue({
          callback: payload,
          statusCheck,
        }),
      );

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
          callback: payload,
          statusCheck,
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
    this.assertOrderProvider(order.paymentProvider, "KHALTI");

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

  async handleEsewaFailure(query: Record<string, unknown>): Promise<CheckoutFailureResponse> {
    const transactionUuidValue = query.transaction_uuid;
    const transactionUuid =
      typeof transactionUuidValue === "string" && TRANSACTION_UUID_REGEX.test(transactionUuidValue)
        ? transactionUuidValue
        : null;

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
    this.assertOrderProvider(order.paymentProvider, "KHALTI");

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
}
