import { Response } from "express";
import { ReviewService } from "../services/review.service";
import { CreateReviewDto, UpdateReviewDto, ReviewQuerySchema, ReviewQueryDto } from "../dto/review.dto";
import { sendSuccess, sendPaginated } from "../utils/response";
import { CreateReviewRequest, GetReviewsRequest, UpdateReviewRequest } from "../types/review.types";

export class ReviewController {
  private readonly service: ReviewService;

  constructor() {
    this.service = new ReviewService();
  }

  // GET /books/:id/reviews
  getReviewsByBookId = async (req: GetReviewsRequest, res: Response): Promise<void> => {
    const query = ReviewQuerySchema.parse(req.query) as ReviewQueryDto;
    const { reviews, meta } = await this.service.getReviewsByBookId(req.params.id, query);
    sendPaginated(res, reviews, meta, "Reviews fetched successfully");
  };

  // POST /books/:id/reviews
  createReview = async (req: CreateReviewRequest, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error("User unauthorized");
    }

    const review = await this.service.createReview(userId, req.params.id, req.body as CreateReviewDto);
    sendSuccess(res, review, "Review added successfully", 201);
  };

  // PUT /books/:id/reviews/:reviewId
  updateReview = async (req: UpdateReviewRequest, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error("User unauthorized");
    }

    const { reviewId } = req.params;
    const review = await this.service.updateReview(userId, reviewId, req.body as UpdateReviewDto);
    sendSuccess(res, review, "Review updated successfully");
  };

  // GET /books/:id/reviews/mine
  getMyReview = async (req: GetReviewsRequest, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error("User unauthorized");
    }

    const review = await this.service.getMyReview(userId, req.params.id);
    sendSuccess(res, review, review ? "Review found" : "No review found");
  };
}
