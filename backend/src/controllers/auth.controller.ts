import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  GoogleOAuthDto,
  LoginDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaVerifyLoginDto,
  RegisterDto,
} from "../dto/auth.dto";
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

    // If MFA is required, return the challenge response directly
    if ("mfaRequired" in result) {
      res.status(200).json({
        success: true,
        message: "MFA verification required",
        data: result,
      });
      return;
    }

    sendSuccess(res, result, "Login successful");
  };

  googleOauth = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.loginWithGoogle(req.body as GoogleOAuthDto);

    // If MFA is required, return the challenge response directly
    if ("mfaRequired" in result) {
      res.status(200).json({
        success: true,
        message: "MFA verification required",
        data: result,
      });
      return;
    }

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

  // ─── MFA Endpoints ──────────────────────────────────────────────────

  /** Step 2 of login: verify TOTP code after password verification */
  verifyMfaLogin = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.verifyMfaLogin(req.body as MfaVerifyLoginDto);
    sendSuccess(res, result, "MFA verification successful");
  };

  /** Check if MFA is enabled for the current user */
  mfaStatus = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.getMfaStatus(user.id);
    sendSuccess(res, result, "MFA status fetched");
  };

  /** Generate TOTP secret + QR code for setup */
  setupMfa = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.setupMfa(user.id, user.email);
    sendSuccess(res, result, "MFA setup data generated");
  };

  /** Verify TOTP code and enable MFA */
  enableMfa = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.enableMfa(user.id, req.body as MfaEnableDto);
    sendSuccess(res, result, result.message);
  };

  /** Disable MFA (requires current TOTP code) */
  disableMfa = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.disableMfa(user.id, req.body as MfaDisableDto);
    sendSuccess(res, result, result.message);
  };
}
