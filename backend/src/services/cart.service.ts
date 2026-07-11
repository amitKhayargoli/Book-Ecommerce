import { NotFoundError } from "../utils/errors";
import { CartRepository } from "../repositories/cart.repository";
import {
  CartAddItemResponse,
  CartCountResponse,
  CartItemResponse,
  CartRemoveItemResponse,
  CartResponse,
  CartStatusResponse,
  ICartService,
} from "../types/cart.types";

export class CartService implements ICartService {
  private readonly repo: CartRepository;

  constructor() {
    this.repo = new CartRepository();
  }

  private async ensureBookExists(bookId: string): Promise<void> {
    const book = await this.repo.findBookById(bookId);
    if (!book) {
      throw new NotFoundError("Book");
    }
  }

  async addItem(userId: string, bookId: string, format?: string): Promise<CartAddItemResponse> {
    await this.ensureBookExists(bookId);

    let cart = await this.repo.findCartByUserId(userId);
    if (!cart) {
      cart = await this.repo.createCart(userId);
    }

    // Check if the same book (any format) already exists in cart
    const existingItem = await this.repo.findItemByCartAndBook(cart.id, bookId);
    if (existingItem) {
      // If the same format exists, don't add again
      if (existingItem.format === (format ?? null)) {
        return {
          cartId: cart.id,
          bookId,
          format: format ?? null,
          added: false,
        };
      }
      // Different format - remove old one first, then add the new one
      await this.repo.removeItem(cart.id, bookId);
      // Fall through to createItem below
    }

    try {
      await this.repo.createItem(cart.id, bookId, format);

      return {
        cartId: cart.id,
        bookId,
        format: format ?? null,
        added: true,
      };
    } catch (error: unknown) {
      if (this.repo.isUniqueConstraintError(error)) {
        return {
          cartId: cart.id,
          bookId,
          format: format ?? null,
          added: false,
        };
      }

      throw error;
    }
  }

  async removeItem(userId: string, bookId: string, format?: string | null): Promise<CartRemoveItemResponse> {
    await this.ensureBookExists(bookId);

    const cart = await this.repo.findCartByUserId(userId);
    if (!cart) {
      return {
        cartId: null,
        bookId,
        removed: false,
      };
    }

    const deletedCount = await this.repo.removeItem(cart.id, bookId, format);

    return {
      cartId: cart.id,
      bookId,
      removed: deletedCount > 0,
    };
  }

  private getUnitPrice(book: { price: number; formatPrices: Array<{ format: string; price: number }> }, format: string | null | undefined): number {
    if (!format) return book.price;
    const formatPrice = book.formatPrices?.find((fp) => fp.format === format);
    return formatPrice?.price ?? book.price;
  }

  async getCart(userId: string): Promise<CartResponse> {
    const items = await this.repo.findCartItemsByUserId(userId);

    const mappedItems: CartItemResponse[] = items.map((item) => {
      const unitPrice = this.getUnitPrice(item.book, item.format);
      return {
        id: item.id,
        bookId: item.bookId,
        quantity: item.quantity,
        createdAt: item.createdAt,
        format: item.format ?? null,
        unitPrice,
        book: {
          id: item.book.id,
          title: item.book.title,
          price: item.book.price,
          coverImage: item.book.coverImage,
          author: {
            id: item.book.author.id,
            name: item.book.author.name,
            slug: item.book.author.slug,
          },
        },
      };
    });

    const summary = mappedItems.reduce(
      (acc, item) => ({
        itemsCount: acc.itemsCount + item.quantity,
        subtotal: acc.subtotal + item.unitPrice * item.quantity,
      }),
      { itemsCount: 0, subtotal: 0 },
    );

    return {
      items: mappedItems,
      summary,
    };
  }

  async getItemStatus(userId: string, bookId: string): Promise<CartStatusResponse> {
    await this.ensureBookExists(bookId);

    const cart = await this.repo.findCartByUserId(userId);
    if (!cart) {
      return {
        bookId,
        inCart: false,
      };
    }

    const existingItem = await this.repo.findItemByCartAndBook(cart.id, bookId);

    return {
      bookId,
      inCart: Boolean(existingItem),
      currentFormat: existingItem?.format ?? null,
    };
  }

  async getCartCount(userId: string): Promise<CartCountResponse> {
    const cart = await this.getCart(userId);
    return {
      itemsCount: cart.summary.itemsCount,
    };
  }
}
