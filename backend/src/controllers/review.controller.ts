import { Response } from "express";
import { ReviewService } from "../services/review.service";
import { CreateReviewDto, ReviewQuerySchema, ReviewQueryDto } from "../dto/review.dto";
import { sendSuccess, sendPaginated } from "../utils/response";
import { CreateReviewRequest, GetReviewsRequest } from "../types/review.types";

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
    // Note: Assuming `req.user` is populated by authMiddleware
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error("User unauthorized"); // Handled by authMiddleware anyway
    }

    const review = await this.service.createReview(userId, req.params.id, req.body as CreateReviewDto);
    sendSuccess(res, review, "Review added successfully", 201);
  };
}
