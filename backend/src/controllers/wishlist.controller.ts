import { Request, Response } from "express";
import { WishlistService } from "../services/wishlist.service";
import { AddWishlistItemDto, WishlistBookParamDto } from "../dto/wishlist.dto";
import { sendSuccess } from "../utils/response";
import { UnauthorizedError } from "../utils/errors";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

export class WishlistController {
  private readonly service: WishlistService;

  constructor() {
    this.service = new WishlistService();
  }

  private getAuthenticatedUser(req: Request): AuthUserPayload {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    return user;
  }

  addItem = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);

    const { bookId } = req.body as AddWishlistItemDto;
    const data = await this.service.addItem(user.id, bookId);

    sendSuccess(
      res,
      data,
      data.added ? "Book added to wishlist" : "Book already in wishlist",
    );
  };

  removeItem = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);

    const { bookId } = req.params as WishlistBookParamDto;
    const data = await this.service.removeItem(user.id, bookId);

    sendSuccess(
      res,
      data,
      data.removed ? "Book removed from wishlist" : "Book was not in wishlist",
    );
  };

  getWishlist = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const items = await this.service.getWishlist(user.id);

    sendSuccess(res, { items }, "Wishlist fetched successfully");
  };

  getItemStatus = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);

    const { bookId } = req.params as WishlistBookParamDto;
    const data = await this.service.getItemStatus(user.id, bookId);

    sendSuccess(res, data, "Wishlist status fetched successfully");
  };
}
