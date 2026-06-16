import { Prisma } from "@prisma/client";
import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { PaginationMeta } from "../utils/response";
import { CreateBookDto, UpdateBookDto, BookQueryDto } from "../dto/book.dto";

// ═══════════════════════════════════════════════════════════════════
//  SECTION 1 — PRISMA-DERIVED DOMAIN TYPES
//  These are inferred directly from the Prisma select shape so they
//  never drift from the actual DB schema.
// ═══════════════════════════════════════════════════════════════════

/** Minimal author shape embedded in every book response */
export type BookAuthor = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

/** Minimal genre shape embedded in every book response */
export type BookGenreTag = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

/**
 * The full Book domain object returned by the repository.
 * Derived from Prisma's type system — single source of truth.
 */
export type BookRecord = Prisma.BookGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    description: true;
    price: true;
    stock: true;
    coverImage: true;
    mockupImage: true;
    featured: true;
    trending: true;
    createdAt: true;
    updatedAt: true;
    author: {
      select: { id: true; name: true; slug: true; image: true };
    };
    bookGenres: {
      select: {
        genre: {
          select: { id: true; name: true; slug: true; color: true };
        };
      };
    };
    _count: {
      select: { reviews: true };
    };
  };
}>;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 2 — API RESPONSE SHAPES
//  What the controller actually sends back to the client.
//  Flattened/transformed from BookRecord for clean JSON.
// ═══════════════════════════════════════════════════════════════════

/** Flattened genre inside a book response (no join-table wrapper) */
export interface BookGenreResponse {
  id: string;
  name: string;
  slug: string;
  color: string;
}

/** Single book as returned in API responses */
export interface BookResponse {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  coverImage: string;
  mockupImage: string | null;
  featured: boolean;
  trending: boolean;
  inStock: boolean; // computed: stock > 0
  reviewCount: number; // flattened from _count.reviews
  author: BookAuthor;
  genres: BookGenreResponse[]; // flattened from bookGenres[].genre
  createdAt: Date;
  updatedAt: Date;
}

/** Response for list endpoints — data + pagination meta */
export interface PaginatedBooksResponse {
  books: BookResponse[];
  meta: PaginationMeta;
}

/** Lightweight book card — used in featured/trending/author lists */
export interface BookSummary {
  id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
  inStock: boolean;
  coverImage: string;
  mockupImage: string | null;
  featured: boolean;
  trending: boolean;
  author: Pick<BookAuthor, "id" | "name" | "slug">;
  genres: Pick<BookGenreResponse, "id" | "name" | "color">[];
  reviewCount: number;
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 3 — SERVICE LAYER INTERFACES
//  Contract the service exposes — decouples controller from impl.
// ═══════════════════════════════════════════════════════════════════

export interface IBookService {
  getBooks(query: BookQueryDto): Promise<PaginatedBooksResponse>;
  getBookById(id: string): Promise<BookResponse>;
  getBookBySlug(slug: string): Promise<BookResponse>;
  createBook(dto: CreateBookDto): Promise<BookResponse>;
  updateBook(id: string, dto: UpdateBookDto): Promise<BookResponse>;
  deleteBook(id: string): Promise<void>;
  getFeaturedBooks(limit?: number): Promise<BookSummary[]>;
  getTrendingBooks(limit?: number): Promise<BookSummary[]>;
  getBooksByAuthor(authorId: string): Promise<BookSummary[]>;
  toggleFeatured(id: string): Promise<BookResponse>;
  toggleTrending(id: string): Promise<BookResponse>;
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 4 — REPOSITORY LAYER INTERFACES
//  Contract the repository exposes — makes it swappable/mockable.
// ═══════════════════════════════════════════════════════════════════

export interface FindManyResult {
  books: BookRecord[];
  total: number;
}

export interface IBookRepository {
  findMany(query: BookQueryDto): Promise<FindManyResult>;
  findById(id: string): Promise<BookRecord | null>;
  findBySlug(slug: string): Promise<BookRecord | null>;
  existsBySlug(slug: string): Promise<boolean>;
  existsById(id: string): Promise<boolean>;
  create(dto: CreateBookDto): Promise<BookRecord>;
  update(id: string, dto: UpdateBookDto): Promise<BookRecord>;
  delete(id: string): Promise<void>;
  findFeatured(limit?: number): Promise<BookRecord[]>;
  findTrending(limit?: number): Promise<BookRecord[]>;
  findByAuthor(authorId: string): Promise<BookRecord[]>;
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 5 — TYPED EXPRESS REQUEST EXTENSIONS
//
//  The correct pattern is to use Request<Params, ResBody, ReqBody, Query>
//  generics rather than extending and overriding individual properties.
//  Overriding query directly breaks the ParsedQs index signature constraint.
//
//  Usage in controller:
//    const query = req.query as BookQueryDto;   ← safe after validate() middleware
// ═══════════════════════════════════════════════════════════════════

// Body: CreateBookDto, Params: none, Query: raw ParsedQs (coerced by validate())
export type CreateBookRequest = Request<
  ParamsDictionary,
  unknown,
  CreateBookDto,
  ParsedQs
>;

// Body: UpdateBookDto, Params: { id }
export type UpdateBookRequest = Request<
  { id: string },
  unknown,
  UpdateBookDto,
  ParsedQs
>;

// Query carries raw strings — validate() middleware coerces them to BookQueryDto
// Use `req.query as unknown as BookQueryDto` after middleware runs
export type GetBooksRequest = Request<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs
>;

// Param-only requests
export type BookByIdRequest = Request<
  { id: string },
  unknown,
  unknown,
  ParsedQs
>;
export type BookBySlugRequest = Request<
  { slug: string },
  unknown,
  unknown,
  ParsedQs
>;
export type BooksByAuthorRequest = Request<
  { authorId: string },
  unknown,
  unknown,
  ParsedQs
>;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 6 — SORT / FILTER ENUMS
//  Centralised so the DTO, service, and consumers all use the same
//  values — no magic strings scattered across the codebase.
// ═══════════════════════════════════════════════════════════════════

export const BOOK_SORT_FIELDS = [
  "createdAt",
  "price",
  "title",
  "stock",
] as const;
export type BookSortField = (typeof BOOK_SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ═══════════════════════════════════════════════════════════════════
//  SECTION 7 — UTILITY / TRANSFORMER HELPERS
//  Pure functions that convert BookRecord → response shapes.
//  Keep them here so controller and service share the same logic.
// ═══════════════════════════════════════════════════════════════════

/**
 * Transforms a raw BookRecord (with nested bookGenres join table)
 * into the clean BookResponse sent to the client.
 */
export function toBookResponse(record: BookRecord): BookResponse {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    description: record.description,
    price: record.price,
    stock: record.stock,
    coverImage: record.coverImage,
    mockupImage: record.mockupImage,
    featured: record.featured,
    trending: record.trending,
    inStock: record.stock > 0,
    reviewCount: record._count.reviews,
    author: record.author,
    genres: record.bookGenres.map((bg) => bg.genre),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Transforms a BookRecord into the lighter BookSummary shape
 * used in list/card contexts (featured, trending, author pages).
 */
export function toBookSummary(record: BookRecord): BookSummary {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    price: record.price,
    stock: record.stock,
    inStock: record.stock > 0,
    coverImage: record.coverImage,
    mockupImage: record.mockupImage,
    featured: record.featured,
    trending: record.trending,
    author: {
      id: record.author.id,
      name: record.author.name,
      slug: record.author.slug,
    },
    genres: record.bookGenres.map((bg) => ({
      id: bg.genre.id,
      name: bg.genre.name,
      color: bg.genre.color,
    })),
    reviewCount: record._count.reviews,
  };
}
