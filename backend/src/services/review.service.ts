import { ReviewRepository } from "../repositories/review.repository";
import { BookRepository } from "../repositories/book.repository";
import { CreateReviewDto, ReviewQueryDto, UpdateReviewDto } from "../dto/review.dto";
import { NotFoundError, ConflictError, ForbiddenError } from "../utils/errors";
import { buildPaginationMeta } from "../utils/response";
import {
  IReviewService,
  PaginatedReviewsResponse,
  ReviewResponse,
  toReviewResponse,
} from "../types/review.types";

export class ReviewService implements IReviewService {
  private readonly reviewRepo: ReviewRepository;
  private readonly bookRepo: BookRepository;

  constructor() {
    this.reviewRepo = new ReviewRepository();
    this.bookRepo = new BookRepository();
  }

  async getReviewsByBookId(bookId: string, query: ReviewQueryDto): Promise<PaginatedReviewsResponse> {
    const bookExists = await this.bookRepo.existsById(bookId);
    if (!bookExists) {
      throw new NotFoundError("Book");
    }

    const { reviews, total } = await this.reviewRepo.findManyByBookId(bookId, query);
    const meta = buildPaginationMeta(total, query.page, query.limit);

    return {
      reviews: reviews.map(toReviewResponse),
      meta,
    };
  }

  async createReview(userId: string, bookId: string, dto: CreateReviewDto): Promise<ReviewResponse> {
    const bookExists = await this.bookRepo.existsById(bookId);
    if (!bookExists) {
      throw new NotFoundError("Book");
    }

    const alreadyReviewed = await this.reviewRepo.existsByUserAndBook(userId, bookId);
    if (alreadyReviewed) {
      throw new ConflictError("You have already reviewed this book");
    }

    const review = await this.reviewRepo.create(userId, bookId, dto);
    return toReviewResponse(review);
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto): Promise<ReviewResponse> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) {
      throw new NotFoundError("Review");
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError("You can only edit your own reviews");
    }

    const review = await this.reviewRepo.update(reviewId, dto);
    return toReviewResponse(review);
  }

  async getMyReview(userId: string, bookId: string): Promise<ReviewResponse | null> {
    const review = await this.reviewRepo.findByUserAndBook(userId, bookId);
    return review ? toReviewResponse(review) : null;
  }
}
