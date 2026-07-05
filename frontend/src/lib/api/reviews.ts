import { api } from "../api-client";
import { AxiosRequestConfig } from "axios";

export interface ReviewPayload {
  rating: number;
  comment?: string;
  images?: string[];
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
}

export interface ReviewResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  meta?: unknown;
  errors?: Array<{ message: string }>;
}

export const reviewEndpoints = {
  getReviewsByBookId: (bookId: string, page = 1, limit = 10, sortBy?: string, sortOrder?: string) =>
    api.get<ReviewResponse>(`/api/books/${bookId}/reviews`, { params: { page, limit, sortBy, sortOrder } }),

  addReview: (bookId: string, payload: ReviewPayload, config?: AxiosRequestConfig) =>
    api.post<ReviewResponse>(`/api/books/${bookId}/reviews`, payload, config),

  updateReview: (bookId: string, reviewId: string, payload: Partial<ReviewPayload>, config?: AxiosRequestConfig) =>
    api.put<ReviewResponse>(`/api/books/${bookId}/reviews/${reviewId}`, payload, config),

  getMyReview: (bookId: string, config?: AxiosRequestConfig) =>
    api.get<ReviewResponse>(`/api/books/${bookId}/reviews/mine`, config),
};
