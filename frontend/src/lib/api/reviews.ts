import { api } from "../api-client";
import { AxiosRequestConfig } from "axios";

export interface ReviewPayload {
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  meta?: unknown;
  errors?: Array<{ message: string }>;
}

export const reviewEndpoints = {
  getReviewsByBookId: (bookId: string, page = 1, limit = 10) =>
    api.get<ReviewResponse>(`/api/books/${bookId}/reviews`, { params: { page, limit } }),

  addReview: (bookId: string, payload: ReviewPayload, config?: AxiosRequestConfig) =>
    api.post<ReviewResponse>(`/api/books/${bookId}/reviews`, payload, config),
};
