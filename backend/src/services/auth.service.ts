import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ConflictError, NotFoundError, UnauthorizedError, TooManyRequestsError, BadRequestError } from "../utils/errors";
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
  UpdateProfileDto,
} from "../dto/auth.dto";
import {
  AuthTokensResponse,
  AuthUserPayload,
  BackupCodesResponse,
  BackupCodesStatus,
  ForgotPasswordResponse,
  LoginResult,
  MfaChallengeResponse,
  MfaSetupResponse,
  MfaStatusResponse,
  RegisterResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
} from "../types/auth.types";
import { signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken } from "../utils/jwt";
import { encrypt, decrypt } from "../utils/encryption";

/**
 * Safely retrieve the TOTP secret, handling both encrypted and
 * legacy plain-text formats for backward compatibility.
 */
function getTotpSecret(stored: string | null): string {
  if (!stored) return "";
  // If it looks encrypted (contains colons from iv:authTag:ciphertext), decrypt it
  if (stored.includes(":")) {
    try {
      return decrypt(stored);
    } catch {
      // Fall through to treat as plain text
    }
  }
  return stored;
}
import { MfaService } from "./mfa.service";
import { AuditService, AuditContext } from "./audit.service";
import { MailService } from "./mail.service";

const SALT_ROUNDS = 12;

const MAX_FAILED_ATTEMPTS = 15;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const PASSWORD_HISTORY_LIMIT = 5; // Remember last 5 passwords to prevent reuse
const PASSWORD_EXPIRY_DAYS = 90; // Force password change every 90 days
const googleClient = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

export class AuthService {
  private readonly mfaService: MfaService;
  private readonly audit: AuditService;
  private readonly mail: MailService;

  constructor(audit?: AuditService) {
    this.mfaService = new MfaService();
    this.audit = audit ?? new AuditService();
    this.mail = new MailService();
  }

  /** Build a standard audit context from a request context */
  private ctx(overrides: AuditContext): AuditContext {
    return {
      ip: overrides.ip,
      userAgent: overrides.userAgent,
      userId: overrides.userId,
      email: overrides.email,
      metadata: overrides.metadata,
    };
  }

  async register(dto: RegisterDto, auditCtx?: AuditContext): Promise<RegisterResponse> {
    const normalizedEmail = dto.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      this.audit.log("login_failed", this.ctx({ email: normalizedEmail, ...auditCtx, metadata: { reason: "email_taken" } }));
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: normalizedEmail,
        password: passwordHash,
        role: UserRole.CUSTOMER,
        emailVerified: null,
        passwordChangedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Save password hash to password history (reuse prevention)
    await prisma.passwordHistory.create({
      data: {
        userId: user.id,
        hash: passwordHash,
      },
    });

    // Generate a verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    console.log("\n─── Email Verification ────────────────────────────────");
    console.log(`  Email: ${normalizedEmail}`);
    console.log(`  Verify URL: ${verificationUrl}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log("──────────────────────────────────────────────────\n");

    // Send verification email
    await this.mail.sendVerificationEmail(normalizedEmail, dto.name, verificationUrl);

    this.audit.log("email_verification_sent", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));
    this.audit.log("register", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));

    return {
      message: "Account created! Please check your email to verify your account before signing in.",
      verificationUrl: process.env.NODE_ENV === "development" ? verificationUrl : undefined,
    };
  }

  async login(dto: LoginDto, auditCtx?: AuditContext, userAgentHash?: string): Promise<LoginResult> {
    const normalizedEmail = dto.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
        role: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        isMfaEnabled: true,
        emailVerified: true,
        tokenVersion: true,
        passwordChangedAt: true,
      },
    });

    if (!user) {
      this.audit.log("login_failed", this.ctx({ email: normalizedEmail, ...auditCtx, metadata: { reason: "user_not_found" } }));
      throw new UnauthorizedError("Invalid email or password");
    }

    // ─── Check email verification ──────────────────────────────────────
    if (!user.emailVerified) {
      throw new BadRequestError("Please verify your email before signing in.");
    }

    // ─── Check password expiry ────────────────────────────────────────
    if (user.passwordChangedAt) {
      const expiredAt = new Date(user.passwordChangedAt.getTime() + PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (expiredAt < new Date()) {
        this.audit.log("login_failed", this.ctx({ userId: user.id, email: user.email, ...auditCtx, metadata: { reason: "password_expired" } }));
        throw new BadRequestError(
          "Your password has expired. Please reset your password.",
        );
      }
    }

    // ─── Check account lockout ────────────────────────────────────────
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.audit.log("login_locked", this.ctx({ userId: user.id, email: user.email, ...auditCtx }));
      const remainingMs = user.lockoutUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new TooManyRequestsError(
        `Account is locked. Try again in ${remainingMin} minute(s).`,
      );
    }

    // ─── If lockout expired, reset the counter ────────────────────────
    let wasLockoutReset = false;
    if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      });
      wasLockoutReset = true;
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // ─── Increment failed attempts and possibly lock ────────────────
      const newAttempts = user.failedLoginAttempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockoutUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
          },
        });
        this.audit.log("login_account_locked", this.ctx({ userId: user.id, email: user.email, ...auditCtx, metadata: { attempts: newAttempts } }));
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts },
        });
      }

      this.audit.log("login_failed", this.ctx({ userId: user.id, email: user.email, ...auditCtx, metadata: { attempts: newAttempts } }));
      throw new UnauthorizedError("Invalid email or password");
    }

    // ─── Successful password - reset failed attempt counter ──────────
    if (!wasLockoutReset) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      });
    }

    // ─── If MFA is enabled, return a challenge token ──────────────────
    if (user.isMfaEnabled) {
      const mfaToken = signMfaChallengeToken({ id: user.id, email: user.email });

      this.audit.log("mfa_challenge_issued", this.ctx({ userId: user.id, email: user.email, ...auditCtx }));

      return {
        mfaRequired: true,
        mfaToken,
      } satisfies MfaChallengeResponse;
    }

    this.audit.log("login_success", this.ctx({ userId: user.id, email: user.email, ...auditCtx }));

    const safeUser: AuthUserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      tokenVersion: user.tokenVersion,
      userAgentHash,
    };

    return {
      accessToken: signAccessToken(safeUser),
      user: safeUser,
    };
  }

  async loginWithGoogle(dto: GoogleOAuthDto, auditCtx?: AuditContext, userAgentHash?: string): Promise<LoginResult> {
    const normalizedEmail = dto.email.toLowerCase();
    // ─── Verify the Google ID token server-side ─────────────────────
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.AUTH_GOOGLE_ID,
      });
      const payload = ticket.getPayload();
      const verifiedEmail = payload?.email?.toLowerCase();

      if (!verifiedEmail || verifiedEmail !== normalizedEmail) {
        this.audit.log("login_failed", this.ctx({ ...auditCtx, metadata: { reason: "oauth_token_email_mismatch" } }));
        throw new UnauthorizedError("Invalid Google ID token");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      this.audit.log("login_failed", this.ctx({ ...auditCtx, metadata: { reason: "oauth_token_verification_failed" } }));
      throw new UnauthorizedError("Failed to verify Google ID token. Please try signing in again.");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        tokenVersion: true,
        provider: true,
      },
    });

    if (existingUser) {
      // Ensure the provider is set to GOOGLE (might have been EMAIL from initial registration)
      if (existingUser.provider !== "GOOGLE") {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            provider: "GOOGLE",
            // Google already verified this email during OAuth - trust it
            emailVerified: new Date(),
          },
        });
        existingUser.provider = "GOOGLE";

        this.audit.log("account_linked", this.ctx({
          userId: existingUser.id,
          email: normalizedEmail,
          ...auditCtx,
          metadata: {
            method: "google_oauth",
            previousProvider: "EMAIL",
            newProvider: "GOOGLE",
          },
        }));
      }

      // Google OAuth users skip app-level MFA - Google handles their own MFA
      this.audit.log("google_oauth_success", this.ctx({ userId: existingUser.id, email: normalizedEmail, ...auditCtx }));
      return this.buildAuthResponse(existingUser);
    }

    const randomPassword = Math.random().toString(36).slice(-16);
    const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: normalizedEmail,
        password: passwordHash,
        role: UserRole.CUSTOMER,
        provider: "GOOGLE",
        // Google-verified emails are automatically trusted
        emailVerified: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        tokenVersion: true,
      },
    });

    // Send welcome email for new Google OAuth sign-ups
    await this.mail.sendWelcomeEmail(normalizedEmail, dto.name);

    this.audit.log("google_oauth_success", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));

    return this.buildAuthResponse(user, userAgentHash);
  }

  // ────────────────────────────────────────────────────────────────────
  //  Email Verification Methods
  // ────────────────────────────────────────────────────────────────────

  async verifyEmail(token: string, auditCtx?: AuditContext): Promise<VerifyEmailResponse> {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      this.audit.log("email_verification_failed", this.ctx({ ...auditCtx, metadata: { reason: "token_not_found" } }));
      throw new NotFoundError("Verification token");
    }

    if (record.usedAt) {
      this.audit.log("email_verification_failed", this.ctx({ ...auditCtx, metadata: { reason: "token_already_used" } }));
      throw new BadRequestError("This verification link has already been used");
    }

    if (record.expiresAt < new Date()) {
      this.audit.log("email_verification_failed", this.ctx({ ...auditCtx, metadata: { reason: "token_expired" } }));
      throw new BadRequestError("This verification link has expired. Please request a new one.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Send welcome email
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { name: true, email: true },
    });
    if (user) {
      await this.mail.sendWelcomeEmail(user.email, user.name);
    }

    this.audit.log("email_verified", this.ctx({ userId: record.userId, ...auditCtx }));

    return {
      message: "Your email has been verified successfully. You can now sign in.",
    };
  }

  async resendVerification(dto: ForgotPasswordDto, auditCtx?: AuditContext): Promise<{ message: string; verificationUrl?: string }> {
    const normalizedEmail = dto.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, emailVerified: true },
    });

    if (!user) {
      // Don't reveal whether the email exists
      return { message: "If an account exists, a new verification link has been sent." };
    }

    if (user.emailVerified) {
      return { message: "Your email is already verified. You can sign in." };
    }

    // Invalidate existing unused tokens
    await prisma.verificationToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date(0) },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    console.log("\n─── Email Verification (Resend) ────────────────────────");
    console.log(`  Email: ${normalizedEmail}`);
    console.log(`  Verify URL: ${verificationUrl}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log("──────────────────────────────────────────────────\n");

    // Send the new verification email
    await this.mail.sendVerificationEmail(normalizedEmail, user.name ?? "there", verificationUrl);

    this.audit.log("email_verification_resend", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));

    return {
      message: "If an account exists, a new verification link has been sent.",
      verificationUrl: process.env.NODE_ENV === "development" ? verificationUrl : undefined,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  //  Password Reset Methods
  // ────────────────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto, auditCtx?: AuditContext): Promise<ForgotPasswordResponse> {
    const normalizedEmail = dto.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true },
    });

    // Always return the same message regardless of whether the email exists
    // to prevent email enumeration
    if (!user) {
      this.audit.log("forgot_password_requested", this.ctx({ email: normalizedEmail, ...auditCtx, metadata: { reason: "email_not_found" } }));
      return {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      };
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date(0) },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    console.log("\n─── Password Reset ───────────────────────────────────");
    console.log(`  Email: ${normalizedEmail}`);
    console.log(`  Reset URL: ${resetUrl}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log("──────────────────────────────────────────────────\n");

    // Send password reset email
    await this.mail.sendPasswordResetEmail(normalizedEmail, user.name, resetUrl);

    this.audit.log("forgot_password_requested", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));

    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
      resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto, auditCtx?: AuditContext): Promise<ResetPasswordResponse> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!record) {
      this.audit.log("password_reset_failed", this.ctx({ ...auditCtx, metadata: { reason: "token_not_found" } }));
      throw new NotFoundError("Password reset token");
    }

    if (record.usedAt) {
      this.audit.log("password_reset_failed", this.ctx({ userId: record.userId, ...auditCtx, metadata: { reason: "token_already_used" } }));
      throw new UnauthorizedError("This reset link has already been used");
    }

    if (record.expiresAt < new Date()) {
      this.audit.log("password_reset_expired", this.ctx({ userId: record.userId, ...auditCtx }));
      throw new UnauthorizedError("This reset link has expired");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // ─── Check password reuse ────────────────────────────────────────
    const recentHashes = await prisma.passwordHistory.findMany({
      where: { userId: record.userId },
      orderBy: { createdAt: "desc" },
      take: PASSWORD_HISTORY_LIMIT,
    });

    for (const entry of recentHashes) {
      const isReused = await bcrypt.compare(dto.password, entry.hash);
      if (isReused) {
        this.audit.log("password_reset_failed", this.ctx({ userId: record.userId, ...auditCtx, metadata: { reason: "password_reused" } }));
        throw new BadRequestError(
          `This password has been used recently. Please choose a different password.`,
        );
      }
    }

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          password: passwordHash,
          tokenVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockoutUntil: null,
          passwordChangedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Save new hash to password history
    await prisma.passwordHistory.create({
      data: {
        userId: record.userId,
        hash: passwordHash,
      },
    });

    // Clean up old history entries beyond the limit
    const allEntries = await prisma.passwordHistory.findMany({
      where: { userId: record.userId },
      orderBy: { createdAt: "desc" },
      skip: PASSWORD_HISTORY_LIMIT,
    });
    if (allEntries.length > 0) {
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: allEntries.map((e) => e.id) } },
      });
    }

    this.audit.log("password_reset_success", this.ctx({ userId: record.userId, ...auditCtx }));

    return {
      message: "Your password has been reset successfully. You can now sign in with your new password.",
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, auditCtx?: AuditContext): Promise<AuthUserPayload> {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.image !== undefined) data.image = dto.image;

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("No fields to update");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        tokenVersion: true,
      },
    });

    this.audit.log("profile_updated", this.ctx({ userId, email: updated.email, ...auditCtx, metadata: { fields: Object.keys(data) } }));

    return updated;
  }

  async exportData(userId: string): Promise<Record<string, unknown>> {
    const [user, orders, reviews, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: { book: { select: { title: true, slug: true } } },
          },
          address: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.findMany({
        where: { userId },
        include: { book: { select: { title: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        paymentProvider: o.paymentProvider,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          bookTitle: i.book.title,
          quantity: i.quantity,
          price: i.price,
        })),
        address: o.address
          ? {
              fullName: o.address.fullName,
              phone: o.address.phone ?? "",
              street: o.address.street,
              city: o.address.city,
              state: o.address.state,
              postalCode: o.address.postalCode,
              country: o.address.country,
              isDefault: o.address.isDefault ?? false,
            }
          : null,
      })),
      reviews: reviews.map((r) => ({
        bookTitle: r.book.title,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      activityLog: auditLogs.map((l) => ({
        event: l.event,
        ip: l.ip,
        createdAt: l.createdAt,
      })),
    };
  }

  async exportDataCsv(userId: string): Promise<string> {
    const data = await this.exportData(userId);
    const rows: string[] = [];

    // Helper to escape a CSV field
    const esc = (val: unknown): string => {
      const s = val == null ? "" : String(val);
      // If the value contains commas, quotes, or newlines, wrap in quotes
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // ── User Info ───────────────────────────────────────────────
    rows.push("=== USER INFO ===");
    rows.push("Field,Value");
    const user = data.user as Record<string, unknown> | null;
    if (user) {
      for (const [key, val] of Object.entries(user)) {
        rows.push(`${esc(key)},${esc(val)}`);
      }
    }
    rows.push("");

    // ── Orders ──────────────────────────────────────────────────
    rows.push("=== ORDERS ===");
    rows.push("Order ID,Status,Total Amount,Payment Status,Payment Provider,Created At");
    for (const order of data.orders as Array<Record<string, unknown>>) {
      rows.push(
        [
          esc(order.id),
          esc(order.status),
          esc(order.totalAmount),
          esc(order.paymentStatus),
          esc(order.paymentProvider),
          esc(order.createdAt),
        ].join(","),
      );
      // Items within each order
      const items = order.items as Array<Record<string, unknown>> | undefined;
      if (items && items.length > 0) {
        rows.push("  Items: Book Title,Quantity,Price");
        for (const item of items) {
          rows.push(`  ${esc(item.bookTitle)},${esc(item.quantity)},${esc(item.price)}`);
        }
      }
    }
    rows.push("");

    // ── Reviews ─────────────────────────────────────────────────
    rows.push("=== REVIEWS ===");
    rows.push("Book Title,Rating,Comment,Created At");
    for (const review of data.reviews as Array<Record<string, unknown>>) {
      rows.push(
        [
          esc(review.bookTitle),
          esc(review.rating),
          esc(review.comment),
          esc(review.createdAt),
        ].join(","),
      );
    }
    rows.push("");

    // ── Activity Log ────────────────────────────────────────────
    rows.push("=== ACTIVITY LOG ===");
    rows.push("Event,IP Address,Created At");
    for (const log of data.activityLog as Array<Record<string, unknown>>) {
      rows.push(
        [esc(log.event), esc(log.ip), esc(log.createdAt)].join(","),
      );
    }

    return rows.join("\n");
  }

  async importData(
    userId: string,
    importData: Record<string, unknown>,
    auditCtx?: AuditContext,
  ): Promise<{ message: string }> {
    const parts: string[] = [];

    // ── Import profile name ───────────────────────────────────────
    const importedUser = importData.user as Record<string, unknown> | undefined;
    const updates: Record<string, unknown> = {};

    if (importedUser?.name && typeof importedUser.name === "string") {
      updates.name = importedUser.name;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updates,
      });
      parts.push("profile");

      this.audit.log(
        "profile_updated",
        this.ctx({
          userId,
          ...auditCtx,
          metadata: {
            fields: Object.keys(updates),
            source: "import",
          },
        }),
      );
    }

    // ── Import addresses ──────────────────────────────────────────
    const importedOrders = (importData.orders as Array<Record<string, unknown>> | undefined) ?? [];
    let addressCount = 0;

    // Collect unique addresses from orders
    const uniqueAddresses: Array<{
      fullName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault: boolean;
    }> = [];

    for (const order of importedOrders) {
      const addr = order.address as Record<string, unknown> | null | undefined;
      if (!addr || !addr.fullName || !addr.street || !addr.city) continue;

      const key = `${addr.fullName}|${addr.street}|${addr.city}|${addr.postalCode}`;
      if (uniqueAddresses.some((a) => `${a.fullName}|${a.street}|${a.city}|${a.postalCode}` === key)) continue;

      uniqueAddresses.push({
        fullName: String(addr.fullName ?? ""),
        phone: String(addr.phone ?? ""),
        street: String(addr.street ?? ""),
        city: String(addr.city ?? ""),
        state: String(addr.state ?? ""),
        postalCode: String(addr.postalCode ?? ""),
        country: String(addr.country ?? ""),
        isDefault: Boolean(addr.isDefault ?? false),
      });
    }

    if (uniqueAddresses.length > 0) {
      // Check which addresses already exist to avoid duplicates
      const existingAddresses = await prisma.address.findMany({
        where: { userId },
        select: { street: true, city: true, postalCode: true },
      });

      const existingKeys = new Set(
        existingAddresses.map((a) => `${a.street}|${a.city}|${a.postalCode}`),
      );

      for (const addr of uniqueAddresses) {
        const key = `${addr.street}|${addr.city}|${addr.postalCode}`;
        if (existingKeys.has(key)) continue;

        await prisma.address.create({
          data: {
            userId,
            fullName: addr.fullName,
            phone: addr.phone,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            postalCode: addr.postalCode,
            country: addr.country,
            isDefault: addr.isDefault,
          },
        });
        addressCount++;
      }
    }

    if (addressCount > 0) {
      parts.push(`${addressCount} address(es)`);

      this.audit.log(
        "address_imported",
        this.ctx({
          userId,
          ...auditCtx,
          metadata: { count: addressCount, source: "import" },
        }),
      );
    }

    // ── Import orders ─────────────────────────────────────────────
    let orderCount = 0;
    let orderItemCount = 0;
    let skippedOrderCount = 0;

    if (importedOrders.length > 0) {
      // Collect unique book titles from all order items
      const allTitles = new Set<string>();
      for (const order of importedOrders) {
        const items = (order.items as Array<Record<string, unknown>> | undefined) ?? [];
        for (const item of items) {
          if (item.bookTitle && typeof item.bookTitle === "string") {
            allTitles.add(item.bookTitle);
          }
        }
      }

      // If no book titles found, skip all order imports
      if (allTitles.size === 0) {
        skippedOrderCount += importedOrders.length;
      } else {
        // Look up books by title
        const books = await prisma.book.findMany({
          where: { title: { in: Array.from(allTitles) } },
          select: { id: true, title: true },
        });
        const titleToBookId = new Map(books.map((b) => [b.title, b.id]));

        for (const order of importedOrders) {
          const items = (order.items as Array<Record<string, unknown>> | undefined) ?? [];

          // Resolve item book IDs; skip if any book can't be found
          const resolvedItems: Array<{ bookId: string; quantity: number; price: number }> = [];
          let allResolved = true;

          for (const item of items) {
            const bookTitle = String(item.bookTitle ?? "");
            const bookId = titleToBookId.get(bookTitle);
            if (!bookId) {
              allResolved = false;
              break;
            }
            resolvedItems.push({
              bookId,
              quantity: Number(item.quantity ?? 1),
              price: Number(item.price ?? 0),
            });
          }

          if (!allResolved || resolvedItems.length === 0) {
            skippedOrderCount++;
            continue;
          }

          const totalAmount = Number(order.totalAmount ?? resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
          const validOrderStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
          const validPaymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

          const rawStatus = String(order.status ?? "PENDING").toUpperCase();
          const rawPaymentStatus = String(order.paymentStatus ?? "PENDING").toUpperCase();

          const safeStatus = validOrderStatuses.includes(rawStatus as any) ? rawStatus : "PENDING";
          const safePaymentStatus = validPaymentStatuses.includes(rawPaymentStatus as any) ? rawPaymentStatus : "PENDING";
          const paymentProvider = String(order.paymentProvider ?? "IMPORT");
          const transactionUuid = crypto.randomUUID();

          await prisma.order.create({
            data: {
              userId,
              totalAmount,
              status: safeStatus as any,
              paymentStatus: safePaymentStatus as any,
              paymentProvider,
              paymentTransactionUuid: transactionUuid,
              items: {
                create: resolvedItems,
              },
            },
          });

          orderCount++;
          orderItemCount += resolvedItems.length;
        }
      }
    }

    if (orderCount > 0) {
      parts.push(`${orderCount} order(s) with ${orderItemCount} item(s)`);

      this.audit.log(
        "orders_imported",
        this.ctx({
          userId,
          ...auditCtx,
          metadata: {
            count: orderCount,
            items: orderItemCount,
            skipped: skippedOrderCount,
            source: "import",
          },
        }),
      );
    }

    if (skippedOrderCount > 0) {
      parts.push(`${skippedOrderCount} order(s) skipped (books not found in catalog)`);
    }

    const summary = parts.length > 0
      ? `Data imported successfully: ${parts.join("; ")}.`
      : "Data imported successfully. No new information to restore from this export.";

    return { message: summary };
  }

  async getOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentProvider: true,
        paymentTransactionUuid: true,
        paymentRefId: true,
        createdAt: true,
        updatedAt: true,
        address: {
          select: {
            fullName: true,
            street: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            book: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                author: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ────────────────────────────────────────────────────────────────────
  //  Change Password (Step-Up Authentication)
  // ────────────────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto, auditCtx?: AuditContext): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // ─── Step-up: verify current password ───────────────────────────
    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      this.audit.log("password_change_failed", this.ctx({ userId, ...auditCtx, metadata: { reason: "invalid_current_password" } }));
      throw new UnauthorizedError("Current password is incorrect.");
    }

    // ─── Check new password is different from current ───────────────
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestError("New password must be different from your current password.");
    }

    // ─── Check password reuse history ───────────────────────────────
    const recentHashes = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: PASSWORD_HISTORY_LIMIT,
    });

    for (const entry of recentHashes) {
      const isReused = await bcrypt.compare(dto.newPassword, entry.hash);
      if (isReused) {
        this.audit.log("password_change_failed", this.ctx({ userId, ...auditCtx, metadata: { reason: "password_reused" } }));
        throw new BadRequestError(
          "This password has been used recently. Please choose a different password.",
        );
      }
    }

    // ─── Update password ────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        tokenVersion: { increment: 1 },
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    // Save new hash to password history
    await prisma.passwordHistory.create({
      data: { userId, hash: passwordHash },
    });

    // Clean up old history entries beyond the limit
    const allEntries = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: PASSWORD_HISTORY_LIMIT,
    });
    if (allEntries.length > 0) {
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: allEntries.map((e) => e.id) } },
      });
    }

    this.audit.log("password_changed", this.ctx({ userId, ...auditCtx }));

    return { message: "Password changed successfully. Please sign in with your new password." };
  }

  async me(user: AuthUserPayload): Promise<AuthUserPayload> {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        tokenVersion: true,
        provider: true,
      },
    });

    if (!dbUser) {
      throw new NotFoundError("User");
    }

    return dbUser;
  }

  // ────────────────────────────────────────────────────────────────────
  //  MFA Methods
  // ────────────────────────────────────────────────────────────────────

  /** Step 2 of login: verify TOTP or backup code after password check */
  async verifyMfaLogin(dto: MfaVerifyLoginDto, auditCtx?: AuditContext, userAgentHash?: string): Promise<AuthTokensResponse> {
    let payload: { id: string; email: string };
    try {
      payload = verifyMfaChallengeToken(dto.mfaToken);
    } catch (err: unknown) {
      // Catch JWT errors (expired token, invalid signature, etc.) and throw a clean 401
      if (err instanceof Error && (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')) {
        throw new UnauthorizedError('MFA session expired. Please sign in again.');
      }
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isMfaEnabled: true,
        totpSecret: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isMfaEnabled) {
      this.audit.log("mfa_verify_failed", this.ctx({ ...auditCtx, metadata: { reason: "mfa_not_enabled" } }));
      throw new UnauthorizedError("MFA is not enabled for this account");
    }

    const isBackup = this.mfaService.isBackupCode(dto.totpCode);

    if (isBackup) {
      const valid = await this.mfaService.verifyAndConsumeBackupCode(user.id, dto.totpCode);
      if (!valid) {
        this.audit.log("mfa_verify_failed", this.ctx({ userId: user.id, email: user.email, ...auditCtx, metadata: { method: "backup_code", reason: "invalid" } }));
        throw new UnauthorizedError("Invalid backup code");
      }
    } else {
      // TOTP verification (decrypt the secret first - handles legacy plain-text too)
      const valid = this.mfaService.verifyCode(getTotpSecret(user.totpSecret), dto.totpCode);
      if (!valid) {
        this.audit.log("mfa_verify_failed", this.ctx({ userId: user.id, email: user.email, ...auditCtx, metadata: { method: "totp", reason: "invalid" } }));
        throw new UnauthorizedError("Invalid verification code");
      }
    }

    this.audit.log("mfa_verify_success", this.ctx({ userId: user.id, email: user.email, ...auditCtx, metadata: { method: isBackup ? "backup_code" : "totp" } }));

    return this.buildAuthResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      tokenVersion: user.tokenVersion,
      userAgentHash,
    });
  }

  async getMfaStatus(userId: string): Promise<MfaStatusResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMfaEnabled: true },
    });

    return { isMfaEnabled: user?.isMfaEnabled ?? false };
  }

  async setupMfa(userId: string, email: string): Promise<MfaSetupResponse> {
    const secret = this.mfaService.generateSecret();
    const provisioningUri = this.mfaService.getProvisioningUri(secret, email);
    const qrCode = await this.mfaService.generateQrCodeDataUri(provisioningUri);

    return { secret, qrCode, provisioningUri };
  }

  async enableMfa(
    userId: string,
    dto: MfaEnableDto,
    auditCtx?: AuditContext,
  ): Promise<{ message: string; backupCodes?: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // If a secret was already set (from a previous setup attempt), verify against it
    if (user.totpSecret) {
      // Allow using a backup code to enable, or the correct TOTP
      const isBackup = this.mfaService.isBackupCode(dto.totpCode);
      if (!isBackup) {
        const valid = this.mfaService.verifyCode(getTotpSecret(user.totpSecret), dto.totpCode);
        if (!valid) {
          throw new UnauthorizedError("Invalid verification code");
        }
      }
    }

    // Save the encrypted secret and enable MFA
    const encryptedSecret = encrypt(dto.secret);
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: encryptedSecret,
        isMfaEnabled: true,
      },
    });

    // Generate 10 one-time backup codes
    const backupCodes = await this.mfaService.generateBackupCodes(userId);

    this.audit.log("mfa_enabled", this.ctx({ userId, ...auditCtx, metadata: { backupCodeCount: backupCodes.length } }));

    return {
      message: "MFA has been enabled successfully. Save your backup codes in a safe place.",
      backupCodes,
    };
  }

  async disableMfa(
    userId: string,
    dto: MfaDisableDto,
    auditCtx?: AuditContext,
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true, isMfaEnabled: true },
    });

    if (!user || !user.isMfaEnabled) {
      throw new UnauthorizedError("MFA is not enabled for this account");
    }

    // Verify the code before disabling
    const isBackup = this.mfaService.isBackupCode(dto.totpCode);
    let valid = false;

    if (isBackup) {
      valid = await this.mfaService.verifyAndConsumeBackupCode(userId, dto.totpCode);
    } else {
      // Decrypt the secret before verifying (handles legacy plain-text too)
      valid = this.mfaService.verifyCode(getTotpSecret(user.totpSecret), dto.totpCode);
    }

    if (!valid) {
      throw new UnauthorizedError("Invalid verification code");
    }

    // Remove MFA settings and delete backup codes
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totpSecret: null, isMfaEnabled: false },
      }),
      prisma.backupCode.deleteMany({
        where: { userId },
      }),
    ]);

    this.audit.log("mfa_disabled", this.ctx({ userId, ...auditCtx }));

    return { message: "MFA has been disabled." };
  }

  // ────────────────────────────────────────────────────────────────────
  //  Backup Code Methods
  // ────────────────────────────────────────────────────────────────────

  async regenerateBackupCodes(userId: string, password: string, auditCtx?: AuditContext): Promise<BackupCodesResponse> {
    // ─── Step-up: verify the user's password before allowing regeneration ──
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid password. Please try again.");
    }

    const codes = await this.mfaService.generateBackupCodes(userId);

    this.audit.log("mfa_backup_codes_regenerated", this.ctx({ userId, ...auditCtx, metadata: { count: codes.length } }));

    return {
      codes,
      message:
        "New backup codes generated. Previous backup codes are no longer valid.",
    };
  }

  async getBackupCodesStatus(userId: string): Promise<BackupCodesStatus> {
    const remaining = await this.mfaService.getRemainingBackupCodes(userId);

    return { remaining };
  }

  /**
   * Build an auth response with tokenVersion embedded in the JWT.
   * The caller is responsible for including the latest tokenVersion in the user object.
   */
  private buildAuthResponse(user: AuthUserPayload, userAgentHash?: string): AuthTokensResponse {
    return {
      accessToken: signAccessToken({ ...user, userAgentHash }),
      user,
    };
  }
}
