export interface CartBookSummary {
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

export interface CartItemResponse {
  id: string;
  bookId: string;
  format: string | null;
  unitPrice: number;
  quantity: number;
  createdAt: Date;
  book: CartBookSummary;
}

export interface CartSummary {
  itemsCount: number;
  subtotal: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  summary: CartSummary;
}

export interface CartCountResponse {
  itemsCount: number;
}

export interface CartAddItemResponse {
  cartId: string;
  bookId: string;
  format: string | null;
  added: boolean;
}

export interface CartRemoveItemResponse {
  cartId: string | null;
  bookId: string;
  removed: boolean;
}

export interface CartStatusResponse {
  bookId: string;
  inCart: boolean;
  currentFormat?: string | null;
}

export interface ICartService {
  addItem(userId: string, bookId: string, format?: string): Promise<CartAddItemResponse>;
  removeItem(userId: string, bookId: string): Promise<CartRemoveItemResponse>;
  getItemStatus(userId: string, bookId: string): Promise<CartStatusResponse>;
  getCart(userId: string): Promise<CartResponse>;
  getCartCount(userId: string): Promise<CartCountResponse>;
}
