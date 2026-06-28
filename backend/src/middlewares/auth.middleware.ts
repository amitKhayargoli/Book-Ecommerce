import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { verifyAccessToken } from "../utils/jwt";
import { AuthUserPayload } from "../types/auth.types";
import prisma from "../lib/prisma";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** Hash the User-Agent header for session binding comparison */
function hashUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  if (!ua) return undefined;
  return crypto.createHash("sha256").update(ua as string).digest("hex");
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const payload = verifyAccessToken(token);

    // Verify token version against DB to invalidate tokens issued before password changes
    // (fire-and-forget — fetching the user on every request is fast with indexed lookup)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
      return;
    }

    // ─── Session binding: verify User-Agent hash matches ──────────
    if (payload.userAgentHash) {
      const currentHash = hashUserAgent(req);
      if (currentHash && currentHash !== payload.userAgentHash) {
        res.status(401).json({
          success: false,
          message: "Session invalid: device or browser mismatch. Please sign in again.",
        });
        return;
      }
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
