import { AxiosRequestConfig } from "axios";
import { api } from "../api-client";

export interface AddWishlistItemPayload {
  bookId: string;
}

export interface WishlistAddItemData {
  wishlistId: string;
  bookId: string;
  added: boolean;
}

export interface WishlistRemoveItemData {
  wishlistId: string | null;
  bookId: string;
  removed: boolean;
}

export interface WishlistStatusData {
  bookId: string;
  inWishlist: boolean;
}

export interface WishlistBook {
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

export interface WishlistItem {
  id: string;
  bookId: string;
  createdAt: string;
  book: WishlistBook;
}

export interface WishlistListData {
  items: WishlistItem[];
}

export interface WishlistResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const wishlistEndpoints = {
  addItem: (payload: AddWishlistItemPayload, config?: AxiosRequestConfig) =>
    api.post<WishlistResponse<WishlistAddItemData>>("/api/wishlist/items", payload, config),

  removeItem: (bookId: string, config?: AxiosRequestConfig) =>
    api.delete<WishlistResponse<WishlistRemoveItemData>>(
      `/api/wishlist/items/${bookId}`,
      config,
    ),

  getStatus: (bookId: string, config?: AxiosRequestConfig) =>
    api.get<WishlistResponse<WishlistStatusData>>(
      `/api/wishlist/items/${bookId}/status`,
      config,
    ),

  getWishlist: (config?: AxiosRequestConfig) =>
    api.get<WishlistResponse<WishlistListData>>("/api/wishlist", config),
};
