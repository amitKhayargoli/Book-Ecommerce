import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export class CartRepository {
  async findBookById(bookId: string): Promise<{ id: string } | null> {
    return prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
  }

  async findCartByUserId(userId: string): Promise<{ id: string } | null> {
    return prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  async createCart(userId: string): Promise<{ id: string }> {
    return prisma.cart.create({
      data: { userId },
      select: { id: true },
    });
  }

  async findItemByCartAndBook(
    cartId: string,
    bookId: string,
  ): Promise<{ id: string } | null> {
    return prisma.cartItem.findFirst({
      where: { cartId, bookId },
      select: { id: true },
    });
  }

  async createItem(cartId: string, bookId: string, format?: string): Promise<{ id: string }> {
    return prisma.cartItem.create({
      data: { cartId, bookId, format },
      select: { id: true },
    });
  }

  async removeItem(cartId: string, bookId: string): Promise<number> {
    const result = await prisma.cartItem.deleteMany({
      where: { cartId, bookId },
    });

    return result.count;
  }

  async findCartItemsByUserId(userId: string) {
    return prisma.cartItem.findMany({
      where: {
        cart: {
          userId,
        },
      },
      select: {
        id: true,
        bookId: true,
        format: true,
        quantity: true,
        createdAt: true,
        book: {
          select: {
            id: true,
            title: true,
            price: true,
            coverImage: true,
            author: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    );
  }
}
