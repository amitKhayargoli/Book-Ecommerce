import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ConflictError, NotFoundError, UnauthorizedError, TooManyRequestsError, BadRequestError } from "../utils/errors";
import {
  ForgotPasswordDto,
  GoogleOAuthDto,
  LoginDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaVerifyLoginDto,
  RegisterDto,
  ResetPasswordDto,
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
import { MfaService } from "./mfa.service";
import { AuditService, AuditContext } from "./audit.service";

const SALT_ROUNDS = 12;

const MAX_FAILED_ATTEMPTS = 15;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const googleClient = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

export class AuthService {
  private readonly mfaService: MfaService;
  private readonly audit: AuditService;

  constructor(audit?: AuditService) {
    this.mfaService = new MfaService();
    this.audit = audit ?? new AuditService();
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
      },
      select: {
        id: true,
        email: true,
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

    // In production, send the verification email here

    this.audit.log("email_verification_sent", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));
    this.audit.log("register", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));

    return {
      message: "Account created! Please check your email to verify your account before signing in.",
      verificationUrl: process.env.NODE_ENV === "development" ? verificationUrl : undefined,
    };
  }

  async login(dto: LoginDto, auditCtx?: AuditContext): Promise<LoginResult> {
    const normalizedEmail = dto.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        isMfaEnabled: true,
        emailVerified: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      this.audit.log("login_failed", this.ctx({ email: normalizedEmail, ...auditCtx, metadata: { reason: "user_not_found" } }));
      throw new UnauthorizedError("Invalid email or password");
    }

    // ─── Check email verification ────────────────────────────────────
    if (!user.emailVerified) {
      throw new BadRequestError("Please verify your email before signing in. Check your inbox or request a new verification link.");
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

    // ─── Successful password — reset failed attempt counter ──────────
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
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return {
      accessToken: signAccessToken(safeUser),
      user: safeUser,
    };
  }

  async loginWithGoogle(dto: GoogleOAuthDto, auditCtx?: AuditContext): Promise<AuthTokensResponse> {
    const normalizedEmail = dto.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    });

    if (existingUser) {
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
        // Google-verified emails are automatically trusted
        emailVerified: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    });

    this.audit.log("google_oauth_success", this.ctx({ userId: user.id, email: normalizedEmail, ...auditCtx }));

    return this.buildAuthResponse(user);
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

    this.audit.log("email_verified", this.ctx({ userId: record.userId, ...auditCtx }));

    return {
      message: "Your email has been verified successfully. You can now sign in.",
    };
  }

  async resendVerification(dto: ForgotPasswordDto, auditCtx?: AuditContext): Promise<{ message: string; verificationUrl?: string }> {
    const normalizedEmail = dto.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
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
      select: { id: true },
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

    // In production, send the reset URL via email here

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

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          password: passwordHash,
          tokenVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    this.audit.log("password_reset_success", this.ctx({ userId: record.userId, ...auditCtx }));

    return {
      message: "Your password has been reset successfully. You can now sign in with your new password.",
    };
  }

  me(user: AuthUserPayload): AuthUserPayload {
    return user;
  }

  // ────────────────────────────────────────────────────────────────────
  //  MFA Methods
  // ────────────────────────────────────────────────────────────────────

  /** Step 2 of login: verify TOTP or backup code after password check */
  async verifyMfaLogin(dto: MfaVerifyLoginDto, auditCtx?: AuditContext): Promise<AuthTokensResponse> {
    const payload = verifyMfaChallengeToken(dto.mfaToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
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
      // TOTP verification
      const valid = this.mfaService.verifyCode(user.totpSecret ?? "", dto.totpCode);
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
      role: user.role,
      tokenVersion: user.tokenVersion,
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
        const valid = this.mfaService.verifyCode(user.totpSecret!, dto.totpCode);
        if (!valid) {
          throw new UnauthorizedError("Invalid verification code");
        }
      }
    }

    // Save the secret and enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: dto.secret,
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
      valid = this.mfaService.verifyCode(user.totpSecret ?? "", dto.totpCode);
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

  async regenerateBackupCodes(userId: string, auditCtx?: AuditContext): Promise<BackupCodesResponse> {
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
  private buildAuthResponse(user: AuthUserPayload): AuthTokensResponse {
    return {
      accessToken: signAccessToken(user),
      user,
    };
  }
}
