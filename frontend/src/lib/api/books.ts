import { api } from "../api-client";
import { AxiosRequestConfig } from "axios";

export interface BookPayload {
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isbn?: string;
  publishedAt?: string;
  language?: string;
  pages?: number;
  coverImage?: string;
  mockupImage?: string;
  previewImages?: string[];
  featured?: boolean;
  trending?: boolean;
  authorName: string;
  publisherName?: string;
  genreNames?: string[];
}

export interface BookResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  errors?: Array<{ message: string }>;
}

export const bookEndpoints = {
  createBook: (payload: BookPayload, config?: AxiosRequestConfig) =>
    api.post<BookResponse>("/api/books", payload, config),

  getBooks: () => api.get<BookResponse>("/api/books"),

  getBookById: (id: string) =>
    api.get<BookResponse>(`/api/books/${id}`),

  updateBook: (id: string, payload: Partial<BookPayload>, config?: AxiosRequestConfig) =>
    api.put<BookResponse>(`/api/books/${id}`, payload, config),

  deleteBook: (id: string, config?: AxiosRequestConfig) =>
    api.delete<BookResponse>(`/api/books/${id}`, config),
};
