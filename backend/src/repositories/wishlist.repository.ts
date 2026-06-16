import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class WishlistRepository {
  async findBookById(bookId: string): Promise<{ id: string } | null> {
    return prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
  }

  async findWishlistByUserId(userId: string): Promise<{ id: string } | null> {
    return prisma.wishlist.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  async createWishlist(userId: string): Promise<{ id: string }> {
    return prisma.wishlist.create({
      data: { userId },
      select: { id: true },
    });
  }

  async findItemByWishlistAndBook(
    wishlistId: string,
    bookId: string,
  ): Promise<{ id: string } | null> {
    return prisma.wishlistItem.findFirst({
      where: { wishlistId, bookId },
      select: { id: true },
    });
  }

  async createItem(wishlistId: string, bookId: string): Promise<{ id: string }> {
    return prisma.wishlistItem.create({
      data: { wishlistId, bookId },
      select: { id: true },
    });
  }

  async removeItem(wishlistId: string, bookId: string): Promise<number> {
    const result = await prisma.wishlistItem.deleteMany({
      where: { wishlistId, bookId },
    });

    return result.count;
  }

  async findWishlistItemsByUserId(userId: string) {
    return prisma.wishlistItem.findMany({
      where: {
        wishlist: {
          userId,
        },
      },
      select: {
        id: true,
        bookId: true,
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
