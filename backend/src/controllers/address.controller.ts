import { Request, Response } from "express";
import { AddressService } from "../services/address.service";
import { CreateAddressDto, UpdateAddressDto } from "../dto/address.dto";
import { sendSuccess } from "../utils/response";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

export class AddressController {
  private readonly service: AddressService;

  constructor() {
    this.service = new AddressService();
  }

  listAddresses = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const addresses = await this.service.getAddresses(user.id);
    sendSuccess(res, addresses, "Addresses fetched successfully");
  };

  getAddress = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const address = await this.service.getAddressById(user.id, String(req.params.id));
    sendSuccess(res, address, "Address fetched successfully");
  };

  createAddress = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const address = await this.service.createAddress(user.id, req.body as CreateAddressDto);
    sendSuccess(res, address, "Address created successfully", 201);
  };

  updateAddress = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const address = await this.service.updateAddress(user.id, String(req.params.id), req.body as UpdateAddressDto);
    sendSuccess(res, address, "Address updated successfully");
  };

  deleteAddress = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.deleteAddress(user.id, String(req.params.id));
    sendSuccess(res, result, result.message);
  };

  setDefault = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.setDefault(user.id, String(req.params.id));
    sendSuccess(res, result, result.message);
  };
}
