import { PaymentStatus, Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CheckoutCartItemRecord {
  bookId: string;
  quantity: number;
  book: {
    price: number;
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
        book: {
          select: {
            price: true,
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
