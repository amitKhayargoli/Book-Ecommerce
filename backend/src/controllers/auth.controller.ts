import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  ForgotPasswordDto,
  GoogleOAuthDto,
  LoginDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaVerifyLoginDto,
  RegisterDto,
  ResetPasswordDto,
  ResendVerificationDto,
  UpdateProfileDto,
} from "../dto/auth.dto";
import { sendSuccess, sendPaginated, buildPaginationMeta } from "../utils/response";
import { AuthUserPayload } from "../types/auth.types";
import prisma from "../lib/prisma";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

import crypto from "crypto";

/** Extract audit context (IP + User-Agent) from the Express request */
function auditCtx(req: Request) {
  return {
    ip: req.ip ?? req.socket.remoteAddress,
    userAgent: req.headers["user-agent"] as string,
  };
}

/** Hash the User-Agent header for session binding */
function userAgentHash(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  if (!ua) return undefined;
  return crypto.createHash("sha256").update(ua as string).digest("hex");
}

export class AuthController {
  private readonly service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body as RegisterDto, auditCtx(req));
    // Registration no longer returns auth tokens — email verification required
    sendSuccess(res, result, result.message, 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body as LoginDto, auditCtx(req), userAgentHash(req));

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
    const result = await this.service.loginWithGoogle(req.body as GoogleOAuthDto, auditCtx(req), userAgentHash(req));

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

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.updateProfile(user.id, req.body, auditCtx(req));
    sendSuccess(res, result, "Profile updated successfully");
  };

  exportData = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.exportData(user.id);
    sendSuccess(res, result, "Data exported successfully");
  };

  // ─── MFA Endpoints ──────────────────────────────────────────────────

  /** Step 2 of login: verify TOTP code after password verification */
  verifyMfaLogin = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.verifyMfaLogin(req.body as MfaVerifyLoginDto, auditCtx(req), userAgentHash(req));
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
    const result = await this.service.enableMfa(user.id, req.body as MfaEnableDto, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  /** Disable MFA (requires current TOTP code) */
  disableMfa = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.disableMfa(user.id, req.body as MfaDisableDto, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  /** Regenerate backup codes (requires MFA to be enabled) */
  regenerateBackupCodes = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.regenerateBackupCodes(user.id, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  /** Get remaining backup code count */
  backupCodesStatus = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.getBackupCodesStatus(user.id);
    sendSuccess(res, result, "Backup codes status fetched");
  };

  // ─── Email Verification Endpoints ────────────────────────────────────

  /** Verify email with a token from the email link */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ success: false, message: "Verification token is required" });
      return;
    }
    const result = await this.service.verifyEmail(token, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  /** Resend verification email */
  resendVerification = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.resendVerification(req.body as ResendVerificationDto, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  // ─── Password Reset Endpoints ────────────────────────────────────────

  /** Request a password reset email */
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.forgotPassword(req.body as ForgotPasswordDto, auditCtx(req));
    // Always return 200 to prevent email enumeration
    sendSuccess(res, result, result.message, 200);
  };

  /** Reset password using a valid token */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.resetPassword(req.body as ResetPasswordDto, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  // ─── Audit Log Viewer (Admin) ───────────────────────────────────────

  /** Fetch paginated audit logs (admin only) */
  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const event = req.query.event as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const andFilters: Record<string, unknown>[] = [];

    if (event) {
      andFilters.push({ event });
    }

    if (dateFrom) {
      andFilters.push({ createdAt: { gte: new Date(dateFrom) } });
    }

    if (dateTo) {
      andFilters.push({ createdAt: { lte: new Date(dateTo) } });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendPaginated(res, logs, buildPaginationMeta(total, page, limit));
  };
}
