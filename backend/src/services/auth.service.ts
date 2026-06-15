import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import { GoogleOAuthDto, LoginDto, RegisterDto } from "../dto/auth.dto";
import { AuthTokensResponse, AuthUserPayload } from "../types/auth.types";
import { signAccessToken } from "../utils/jwt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

export class AuthService {
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

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
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
