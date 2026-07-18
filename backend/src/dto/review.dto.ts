import { z } from "zod";

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().optional(),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
});

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;

export const ReviewQuerySchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  limit: z.coerce.number().min(1).max(100).catch(10),
  sortBy: z.enum(["createdAt", "rating"]).catch("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).catch("desc"),
});

export type ReviewQueryDto = z.infer<typeof ReviewQuerySchema>;
