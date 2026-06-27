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

/**
 * Sign a short-lived MFA challenge token (5 minutes).
 * Used to carry the user's identity from password verification to TOTP verification.
 */
export function signMfaChallengeToken(user: { id: string; email: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, purpose: "mfa_challenge" },
    getJwtSecret(),
    { expiresIn: "5m" },
  );
}

/**
 * Verify an MFA challenge token and return the user ID.
 */
export function verifyMfaChallengeToken(token: string): { id: string; email: string } {
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload & {
    sub: string;
    email: string;
    purpose: string;
  };

  if (decoded.purpose !== "mfa_challenge") {
    throw new Error("Invalid token purpose");
  }

  return { id: decoded.sub, email: decoded.email };
}
