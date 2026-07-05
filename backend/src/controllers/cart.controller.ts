import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { AddCartItemDto, CartBookParamDto } from "../dto/cart.dto";
import { sendSuccess } from "../utils/response";
import { UnauthorizedError } from "../utils/errors";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

export class CartController {
  private readonly service: CartService;

  constructor() {
    this.service = new CartService();
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
    const { bookId, format } = req.body as AddCartItemDto;
    const data = await this.service.addItem(user.id, bookId, format);

    sendSuccess(res, data, data.added ? "Book added to cart" : "Book already in cart");
  };

  removeItem = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const { bookId } = req.params as CartBookParamDto;
    const data = await this.service.removeItem(user.id, bookId);

    sendSuccess(res, data, data.removed ? "Book removed from cart" : "Book was not in cart");
  };

  getCart = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const data = await this.service.getCart(user.id);

    sendSuccess(res, data, "Cart fetched successfully");
  };

  getItemStatus = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const { bookId } = req.params as CartBookParamDto;
    const data = await this.service.getItemStatus(user.id, bookId);

    sendSuccess(res, data, "Cart status fetched successfully");
  };

  getCartCount = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const data = await this.service.getCartCount(user.id);

    sendSuccess(res, data, "Cart count fetched successfully");
  };
}
