import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  ChangePasswordDto,
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

import { userAgentHash } from "../utils/userAgent";

/** Extract audit context (IP + User-Agent) from the Express request */
function auditCtx(req: Request) {
  return {
    ip: req.ip ?? req.socket.remoteAddress,
    userAgent: req.headers["user-agent"] as string,
  };
}

export class AuthController {
  private readonly service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body as RegisterDto, auditCtx(req));
    // Registration no longer returns auth tokens - email verification required
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
    const result = await this.service.me(user);
    sendSuccess(res, result, "Profile fetched successfully");
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

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.changePassword(user.id, req.body as ChangePasswordDto, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  /** Revoke all active sessions (increment tokenVersion) */
  revokeSessions = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const result = await this.service.revokeSessions(user.id, auditCtx(req));
    sendSuccess(res, result, result.message);
  };

  getOrders = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const orders = await this.service.getOrders(user.id);
    sendSuccess(res, orders, "Orders fetched successfully");
  };

  exportData = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const format = (req.query.format as string)?.toLowerCase() ?? "json";

    if (format === "csv") {
      const csv = await this.service.exportDataCsv(user.id);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="bookstore-export-${user.id.slice(-8)}.csv"`);
      res.status(200).send(csv);
      return;
    }

    const data = await this.service.exportData(user.id);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bookstore-export-${user.id.slice(-8)}.json"`);
    res.status(200).json(data);
  };

  /**
   * Import user data from a previously exported JSON file.
   * Currently supports importing profile name and image.
   */
  importData = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const importPayload = req.body as { data?: Record<string, unknown> };
    if (!importPayload.data) {
      res.status(400).json({ success: false, message: "No import data provided" });
      return;
    }

    const result = await this.service.importData(user.id, importPayload.data, auditCtx(req));
    sendSuccess(res, result, result.message);
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

  /** Regenerate backup codes (requires password re-entry for step-up auth) */
  regenerateBackupCodes = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    const { password } = req.body as { password: string };
    const result = await this.service.regenerateBackupCodes(user.id, password, auditCtx(req));
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

  /** Fetch paginated audit logs for the current user */
  getMyActivityLogs = async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const where = { userId: user.id };

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
