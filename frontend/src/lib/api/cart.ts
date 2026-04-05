import { AxiosRequestConfig } from "axios";
import { api } from "../api-client";

export interface AddCartItemPayload {
  bookId: string;
}

export interface CartBook {
  id: string;
  title: string;
  price: number;
  coverImage: string;
  author: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CartItem {
  id: string;
  bookId: string;
  quantity: number;
  createdAt: string;
  book: CartBook;
}

export interface CartSummary {
  itemsCount: number;
  subtotal: number;
}

export interface CartData {
  items: CartItem[];
  summary: CartSummary;
}

export interface CartCountData {
  itemsCount: number;
}

export interface CartAddItemData {
  cartId: string;
  bookId: string;
  added: boolean;
}

export interface CartRemoveItemData {
  cartId: string | null;
  bookId: string;
  removed: boolean;
}

export interface CartResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const cartEndpoints = {
  getCart: (config?: AxiosRequestConfig) =>
    api.get<CartResponse<CartData>>("/api/cart", config),

  getCount: (config?: AxiosRequestConfig) =>
    api.get<CartResponse<CartCountData>>("/api/cart/count", config),

  addItem: (payload: AddCartItemPayload, config?: AxiosRequestConfig) =>
    api.post<CartResponse<CartAddItemData>>("/api/cart/items", payload, config),

  removeItem: (bookId: string, config?: AxiosRequestConfig) =>
    api.delete<CartResponse<CartRemoveItemData>>(`/api/cart/items/${bookId}`, config),
};
