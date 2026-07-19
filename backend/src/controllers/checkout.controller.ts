import { Request, Response } from "express";
import { CheckoutService } from "../services/checkout.service";
import { sendSuccess } from "../utils/response";
import { UnauthorizedError } from "../utils/errors";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

export class CheckoutController {
  private readonly service: CheckoutService;

  constructor() {
    this.service = new CheckoutService();
  }

  private getAuthenticatedUser(req: Request): AuthUserPayload {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    return user;
  }

  initiateKhalti = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const { addressId, customerName, customerEmail } = req.body as {
      addressId?: string;
      customerName?: string;
      customerEmail?: string;
    };
    const data = await this.service.initiateKhalti(user.id, addressId, {
      name: customerName ?? user.name,
      email: customerEmail ?? user.email,
    });

    sendSuccess(res, data, "Khalti checkout initiated", 201);
  };

  verifyKhalti = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const { pidx, purchaseOrderId } = req.body as {
      pidx: string;
      purchaseOrderId?: string;
    };
    const verification = await this.service.verifyKhaltiSuccess(pidx, purchaseOrderId, user.id);

    sendSuccess(res, verification, "Khalti payment verified");
  };

  handleKhaltiFailure = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.handleKhaltiFailure(req.query as Record<string, unknown>);

    sendSuccess(res, data, "Khalti failure callback handled");
  };
}
