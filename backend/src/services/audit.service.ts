import prisma from "../lib/prisma";

export type AuditEvent =
  | "register"
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "login_account_locked"
  | "google_oauth_success"
  | "mfa_challenge_issued"
  | "mfa_verify_success"
  | "mfa_verify_failed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_backup_codes_regenerated"
  | "forgot_password_requested"
  | "password_reset_success"
  | "password_reset_failed"
  | "password_reset_expired"
  | "email_verification_sent"
  | "email_verified"
  | "email_verification_resend"
  | "email_verification_failed";

export interface AuditContext {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Write a structured audit log entry.
   * Fire-and-forget — errors are swallowed so logging never breaks auth flows.
   */
  async log(event: AuditEvent, ctx: AuditContext): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          event,
          userId: ctx.userId ?? null,
          email: ctx.email ?? null,
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
          metadata: ctx.metadata as object ?? undefined,
        },
      });
    } catch (err) {
      // Logging must never crash the caller
      console.error("[AuditService] Failed to write audit log:", err);
    }
  }
}
