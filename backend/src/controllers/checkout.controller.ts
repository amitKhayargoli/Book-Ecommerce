import { Request, Response } from "express";
import { CheckoutService } from "../services/checkout.service";
import { sendSuccess } from "../utils/response";
import { UnauthorizedError } from "../utils/errors";
import { AuthUserPayload } from "../types/auth.types";
import { EsewaSuccessQueryDto, KhaltiSuccessQueryDto } from "../dto/checkout.dto";

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

  initiateEsewa = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const data = await this.service.initiateEsewa(user.id);

    sendSuccess(res, data, "eSewa checkout initiated", 201);
  };

  initiateKhalti = async (req: Request, res: Response): Promise<void> => {
    const user = this.getAuthenticatedUser(req);
    const data = await this.service.initiateKhalti(user.id);

    sendSuccess(res, data, "Khalti checkout initiated", 201);
  };

  verifyEsewaSuccess = async (req: Request, res: Response): Promise<void> => {
    const { data } = req.query as unknown as EsewaSuccessQueryDto;
    const verification = await this.service.verifyEsewaSuccess(data);

    sendSuccess(res, verification, "eSewa payment verified");
  };

  verifyKhaltiSuccess = async (req: Request, res: Response): Promise<void> => {
    const { pidx } = req.query as unknown as KhaltiSuccessQueryDto;
    const purchaseOrderId =
      typeof req.query.purchase_order_id === "string" ? req.query.purchase_order_id : undefined;
    const verification = await this.service.verifyKhaltiSuccess(pidx, purchaseOrderId);

    sendSuccess(res, verification, "Khalti payment verified");
  };

  handleEsewaFailure = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.handleEsewaFailure(req.query as Record<string, unknown>);

    sendSuccess(res, data, "eSewa failure callback handled");
  };

  handleKhaltiFailure = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.handleKhaltiFailure(req.query as Record<string, unknown>);

    sendSuccess(res, data, "Khalti failure callback handled");
  };
}
