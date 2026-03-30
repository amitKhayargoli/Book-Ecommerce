import { Prisma, PrismaClient } from "@prisma/client";
import { CreateBookDto, UpdateBookDto, BookQueryDto } from "../dto/book.dto";

const prisma = new PrismaClient();

// ─── Select shape returned for list/detail queries ───────────────
const bookSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  price: true,
  stock: true,
  coverImage: true,
  mockupImage: true,
  featured: true,
  trending: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, slug: true, image: true },
  },
  bookGenres: {
    select: {
      genre: {
        select: { id: true, name: true, slug: true, color: true },
      },
    },
  },
  _count: {
    select: { reviews: true },
  },
} satisfies Prisma.BookSelect;

export type BookRecord = Prisma.BookGetPayload<{ select: typeof bookSelect }>;

// ─── Repository ──────────────────────────────────────────────────
export class BookRepository {
  // ── Find many with filters + pagination ───────────────────────
  async findMany(
    query: BookQueryDto,
  ): Promise<{ books: BookRecord[]; total: number }> {
    const {
      page,
      limit,
      search,
      authorId,
      genreId,
      featured,
      trending,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.BookWhereInput = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { author: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(authorId && { authorId }),
      ...(genreId && {
        bookGenres: { some: { genreId } },
      }),
      ...(featured !== undefined && { featured }),
      ...(trending !== undefined && { trending }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
    };

    const [books, total] = await prisma.$transaction([
      prisma.book.findMany({
        where,
        select: bookSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.book.count({ where }),
    ]);

    return { books, total };
  }

  // ── Find single by ID ─────────────────────────────────────────
  async findById(id: string): Promise<BookRecord | null> {
    return prisma.book.findUnique({ where: { id }, select: bookSelect });
  }

  // ── Find single by slug ───────────────────────────────────────
  async findBySlug(slug: string): Promise<BookRecord | null> {
    return prisma.book.findUnique({ where: { slug }, select: bookSelect });
  }

  // ── Existence checks ──────────────────────────────────────────
  async existsBySlug(slug: string): Promise<boolean> {
    const count = await prisma.book.count({ where: { slug } });
    return count > 0;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await prisma.book.count({ where: { id } });
    return count > 0;
  }

  // ── Create ────────────────────────────────────────────────────
  async create(dto: CreateBookDto): Promise<BookRecord> {
    const { genreIds, ...bookData } = dto;

    return prisma.book.create({
      data: {
        ...bookData,
        ...(genreIds?.length && {
          bookGenres: {
            create: genreIds.map((genreId) => ({ genreId })),
          },
        }),
      },
      select: bookSelect,
    });
  }

  // ── Update ────────────────────────────────────────────────────
  async update(id: string, dto: UpdateBookDto): Promise<BookRecord> {
    const { genreIds, ...bookData } = dto;

    return prisma.book.update({
      where: { id },
      data: {
        ...bookData,
        // Replace all genre associations if genreIds provided
        ...(genreIds && {
          bookGenres: {
            deleteMany: {},
            create: genreIds.map((genreId) => ({ genreId })),
          },
        }),
      },
      select: bookSelect,
    });
  }

  // ── Delete ────────────────────────────────────────────────────
  async delete(id: string): Promise<void> {
    // Cascade: delete bookGenres first (MongoDB doesn't enforce FK cascade)
    await prisma.$transaction([
      prisma.bookGenre.deleteMany({ where: { bookId: id } }),
      prisma.book.delete({ where: { id } }),
    ]);
  }

  // ── Featured books ────────────────────────────────────────────
  async findFeatured(limit = 6): Promise<BookRecord[]> {
    return prisma.book.findMany({
      where: { featured: true },
      select: bookSelect,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Trending books ────────────────────────────────────────────
  async findTrending(limit = 10): Promise<BookRecord[]> {
    return prisma.book.findMany({
      where: { trending: true },
      select: bookSelect,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Books by author ───────────────────────────────────────────
  async findByAuthor(authorId: string): Promise<BookRecord[]> {
    return prisma.book.findMany({
      where: { authorId },
      select: bookSelect,
      orderBy: { createdAt: "desc" },
    });
  }
}
