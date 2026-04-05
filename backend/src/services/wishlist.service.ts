import { NotFoundError } from "../utils/errors";
import { WishlistRepository } from "../repositories/wishlist.repository";
import {
  IWishlistService,
  WishlistAddItemResponse,
  WishlistItemResponse,
  WishlistRemoveItemResponse,
  WishlistStatusResponse,
} from "../types/wishlist.types";

export class WishlistService implements IWishlistService {
  private readonly repo: WishlistRepository;

  constructor() {
    this.repo = new WishlistRepository();
  }

  private async ensureBookExists(bookId: string): Promise<void> {
    const book = await this.repo.findBookById(bookId);
    if (!book) {
      throw new NotFoundError("Book");
    }
  }

  async addItem(userId: string, bookId: string): Promise<WishlistAddItemResponse> {
    await this.ensureBookExists(bookId);

    let wishlist = await this.repo.findWishlistByUserId(userId);
    if (!wishlist) {
      wishlist = await this.repo.createWishlist(userId);
    }

    const existingItem = await this.repo.findItemByWishlistAndBook(wishlist.id, bookId);
    if (existingItem) {
      return {
        wishlistId: wishlist.id,
        bookId,
        added: false,
      };
    }

    try {
      await this.repo.createItem(wishlist.id, bookId);
      return {
        wishlistId: wishlist.id,
        bookId,
        added: true,
      };
    } catch (error: unknown) {
      if (this.repo.isUniqueConstraintError(error)) {
        return {
          wishlistId: wishlist.id,
          bookId,
          added: false,
        };
      }

      throw error;
    }
  }

  async removeItem(userId: string, bookId: string): Promise<WishlistRemoveItemResponse> {
    await this.ensureBookExists(bookId);

    const wishlist = await this.repo.findWishlistByUserId(userId);
    if (!wishlist) {
      return {
        wishlistId: null,
        bookId,
        removed: false,
      };
    }

    const deletedCount = await this.repo.removeItem(wishlist.id, bookId);

    return {
      wishlistId: wishlist.id,
      bookId,
      removed: deletedCount > 0,
    };
  }

  async getWishlist(userId: string): Promise<WishlistItemResponse[]> {
    const items = await this.repo.findWishlistItemsByUserId(userId);

    return items.map((item) => ({
      id: item.id,
      bookId: item.bookId,
      createdAt: item.createdAt,
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
    }));
  }

  async getItemStatus(userId: string, bookId: string): Promise<WishlistStatusResponse> {
    await this.ensureBookExists(bookId);

    const wishlist = await this.repo.findWishlistByUserId(userId);
    if (!wishlist) {
      return {
        bookId,
        inWishlist: false,
      };
    }

    const existingItem = await this.repo.findItemByWishlistAndBook(wishlist.id, bookId);

    return {
      bookId,
      inWishlist: Boolean(existingItem),
    };
  }
}
