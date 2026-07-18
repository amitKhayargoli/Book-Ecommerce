import { PaymentStatus, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export interface CheckoutCartItemRecord {
  bookId: string;
  quantity: number;
  format: string | null;
  book: {
    price: number;
    formatPrices: Array<{ format: string; price: number }>;
  };
}

interface CreateOrderInput {
  userId: string;
  totalAmount: number;
  paymentProvider: string;
  paymentTransactionUuid: string;
  items: Array<{
    bookId: string;
    quantity: number;
    price: number;
  }>;
  addressId?: string;
}

export class CheckoutRepository {
  async findCartItemsByUserId(userId: string): Promise<CheckoutCartItemRecord[]> {
    return prisma.cartItem.findMany({
      where: {
        cart: {
          userId,
        },
      },
      select: {
        bookId: true,
        quantity: true,
        format: true,
        book: {
          select: {
            price: true,
            formatPrices: {
              select: { format: true, price: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async createPendingOrder(input: CreateOrderInput): Promise<{ id: string }> {
    return prisma.order.create({
      data: {
        userId: input.userId,
        totalAmount: input.totalAmount,
        paymentProvider: input.paymentProvider,
        paymentTransactionUuid: input.paymentTransactionUuid,
        paymentStatus: "PENDING",
        status: "PENDING",
        addressId: input.addressId ?? null,
        items: {
          create: input.items,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async findOrderByTransactionUuid(paymentTransactionUuid: string) {
    return prisma.order.findUnique({
      where: {
        paymentTransactionUuid,
      },
      select: {
        id: true,
        userId: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentProvider: true,
        paymentTransactionUuid: true,
        items: {
          select: {
            bookId: true,
          },
        },
      },
    });
  }

  async markOrderPaidAndClearCart(
    orderId: string,
    userId: string,
    bookIds: string[],
    paymentRefId: string | null,
    paymentRawResponse: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
        paymentRefId,
        paymentRawResponse,
      },
    });
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId,
        },
        bookId: {
          in: bookIds,
        },
      },
    });
  }

  async markOrderFailed(orderId: string, paymentRawResponse: Prisma.InputJsonValue): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "FAILED",
        paymentRawResponse,
      },
    });
  }

  isPaid(paymentStatus: PaymentStatus): boolean {
    return paymentStatus === "PAID";
  }
}
