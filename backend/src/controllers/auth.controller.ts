import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { GoogleOAuthDto, LoginDto, RegisterDto } from "../dto/auth.dto";
import { sendSuccess } from "../utils/response";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

export class AuthController {
  private readonly service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body as RegisterDto);
    sendSuccess(res, result, "Registration successful", 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body as LoginDto);
    sendSuccess(res, result, "Login successful");
  };

  googleOauth = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.loginWithGoogle(req.body as GoogleOAuthDto);
    sendSuccess(res, result, "Google login successful");
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    sendSuccess(res, this.service.me(user), "Profile fetched successfully");
  };
}
