import { Prisma } from "@prisma/client";
import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { PaginationMeta } from "../utils/response";
import { CreateReviewDto, ReviewQueryDto } from "../dto/review.dto";

// ═══════════════════════════════════════════════════════════════════
//  SECTION 1 — PRISMA-DERIVED DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════

export const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true },
  },
  bookId: true,
} satisfies Prisma.ReviewSelect;

export type ReviewRecord = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 2 — API RESPONSE SHAPES
// ═══════════════════════════════════════════════════════════════════

export interface ReviewResponse {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
  };
  bookId: string;
}

export interface PaginatedReviewsResponse {
  reviews: ReviewResponse[];
  meta: PaginationMeta;
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 3 — SERVICE / REPOSITORY INTERFACES
// ═══════════════════════════════════════════════════════════════════

export interface IReviewRepository {
  findManyByBookId(bookId: string, query: ReviewQueryDto): Promise<{ reviews: ReviewRecord[]; total: number }>;
  existsByUserAndBook(userId: string, bookId: string): Promise<boolean>;
  create(userId: string, bookId: string, dto: CreateReviewDto): Promise<ReviewRecord>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<ReviewRecord | null>;
}

export interface IReviewService {
  getReviewsByBookId(bookId: string, query: ReviewQueryDto): Promise<PaginatedReviewsResponse>;
  createReview(userId: string, bookId: string, dto: CreateReviewDto): Promise<ReviewResponse>;
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 4 — REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════

export type CreateReviewRequest = Request<
  { id: string }, // bookId
  unknown,
  CreateReviewDto,
  ParsedQs
>;

export type GetReviewsRequest = Request<
  { id: string },
  unknown,
  unknown,
  ParsedQs
>;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 5 — UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════

export function toReviewResponse(record: ReviewRecord): ReviewResponse {
  return {
    id: record.id,
    rating: record.rating,
    comment: record.comment,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    user: record.user,
    bookId: record.bookId,
  };
}
