import { Prisma, PrismaClient } from "@prisma/client";
import {
  CreateBookDbDto,
  UpdateBookDto,
  BookQueryDto,
} from "../dto/book.dto";

const prisma = new PrismaClient();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

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
  async findOrCreateAuthorByName(name: string): Promise<string> {
    const baseSlug = slugify(name) || `author-${Date.now()}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      const existing = await prisma.author.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) return existing.id;

      try {
        const created = await prisma.author.create({
          data: { name, slug },
          select: { id: true },
        });
        return created.id;
      } catch {
        // Retry with slug suffix when unique collisions happen.
      }
    }

    const fallback = await prisma.author.findFirst({
      where: { name },
      select: { id: true },
    });
    if (fallback) return fallback.id;

    throw new Error("Unable to resolve author");
  }

  async findOrCreatePublisherByName(name: string): Promise<string> {
    const baseSlug = slugify(name) || `publisher-${Date.now()}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      const existing = await prisma.publisher.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) return existing.id;

      try {
        const created = await prisma.publisher.create({
          data: { name, slug },
          select: { id: true },
        });
        return created.id;
      } catch {
        // Retry with slug suffix when unique collisions happen.
      }
    }

    const fallback = await prisma.publisher.findFirst({
      where: { name },
      select: { id: true },
    });
    if (fallback) return fallback.id;

    throw new Error("Unable to resolve publisher");
  }

  async findOrCreateGenresByNames(names: string[]): Promise<string[]> {
    const resolvedIds: string[] = [];

    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;

      const baseSlug = slugify(name) || `genre-${Date.now()}`;
      let resolved = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
        const existing = await prisma.genre.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (existing) {
          resolvedIds.push(existing.id);
          resolved = true;
          break;
        }

        try {
          const created = await prisma.genre.create({
            data: { name, slug, color: "#6b7280" },
            select: { id: true },
          });
          resolvedIds.push(created.id);
          resolved = true;
          break;
        } catch {
          // Retry with slug suffix when unique collisions happen.
        }
      }

      if (!resolved) {
        const fallback = await prisma.genre.findFirst({
          where: { name },
          select: { id: true },
        });
        if (fallback) resolvedIds.push(fallback.id);
      }
    }

    return [...new Set(resolvedIds)];
  }

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
  async create(dto: CreateBookDbDto): Promise<BookRecord> {
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
