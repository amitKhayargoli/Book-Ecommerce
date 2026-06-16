export interface WishlistAddItemResponse {
  wishlistId: string | null;
  bookId: string;
  added: boolean;
}

export interface WishlistRemoveItemResponse {
  wishlistId: string | null;
  bookId: string;
  removed: boolean;
}

export interface WishlistStatusResponse {
  bookId: string;
  inWishlist: boolean;
}

export interface WishlistBookSummary {
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

export interface WishlistItemResponse {
  id: string;
  bookId: string;
  createdAt: Date;
  book: WishlistBookSummary;
}

export interface IWishlistService {
  addItem(userId: string, bookId: string): Promise<WishlistAddItemResponse>;
  removeItem(userId: string, bookId: string): Promise<WishlistRemoveItemResponse>;
  getWishlist(userId: string): Promise<WishlistItemResponse[]>;
  getItemStatus(userId: string, bookId: string): Promise<WishlistStatusResponse>;
}
