import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { AuthUserPayload } from "../types/auth.types";

interface SignedAuthTokenPayload extends JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: AuthUserPayload["role"];
}

const DEFAULT_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export function signAccessToken(user: AuthUserPayload): string {
  const payload: SignedAuthTokenPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const expiresIn =
    (process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRY) as SignOptions["expiresIn"];

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): AuthUserPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as SignedAuthTokenPayload;

  return {
    id: decoded.sub,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
  };
}
