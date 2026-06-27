import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError, TooManyRequestsError } from "../utils/errors";
import {
  GoogleOAuthDto,
  LoginDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaVerifyLoginDto,
  RegisterDto,
} from "../dto/auth.dto";
import {
  AuthTokensResponse,
  AuthUserPayload,
  LoginResult,
  MfaChallengeResponse,
  MfaSetupResponse,
  MfaStatusResponse,
} from "../types/auth.types";
import { signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken } from "../utils/jwt";
import { MfaService } from "./mfa.service";

const SALT_ROUNDS = 12;

const MAX_FAILED_ATTEMPTS = 15;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const googleClient = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

export class AuthService {
  private readonly mfaService: MfaService;

  constructor() {
    this.mfaService = new MfaService();
  }

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: passwordHash,
        role: UserRole.CUSTOMER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<LoginResult> {
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
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // ─── Check account lockout ────────────────────────────────────────
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
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
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts },
        });
      }

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

      // Return MFA challenge response (not the final JWT)
      return {
        mfaRequired: true,
        mfaToken,
      } satisfies MfaChallengeResponse;
    }

    const safeUser: AuthUserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: signAccessToken(safeUser),
      user: safeUser,
    };
  }

  async loginWithGoogle(dto: GoogleOAuthDto): Promise<AuthTokensResponse> {
    const normalizedEmail = dto.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (existingUser) {
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
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return this.buildAuthResponse(user);
  }

  me(user: AuthUserPayload): AuthUserPayload {
    return user;
  }

  private buildAuthResponse(user: AuthUserPayload): AuthTokensResponse {
    return {
      accessToken: signAccessToken(user),
      user,
    };
  }
}
