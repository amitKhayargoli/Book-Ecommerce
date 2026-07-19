import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AuthUserPayload } from "../types/auth.types";
import prisma from "../lib/prisma";
import { isBrowserUA, userAgentHash } from "../utils/userAgent";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
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
    // (fire-and-forget - fetching the user on every request is fast with indexed lookup)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
      return;
    }

    // ─── Session binding: verify User-Agent hash matches ──────────
    // Only enforce when BOTH the JWT-payload UA and the incoming request UA
    // look like real browser sessions. This tolerates BFF re-fetch patterns
    // (NextAuth `authorize()` and `jwt` callbacks run in Node and use a
    // `node`-style or empty User-Agent) while still detecting a stolen-token
    // replay from a different browser/device.
    //
    // Symmetric with the controller layer: non-browser logins never receive a
    // userAgentHash in the first place (see utils/userAgent.ts), so when the
    // outer `if (payload.userAgentHash)` matches the token was definitely
    // issued from a browser — and the check below becomes the right gate.
    if (payload.userAgentHash) {
      const currentHash = userAgentHash(req);
      const incomingLooksLikeBrowser = isBrowserUA(req.headers["user-agent"]);

      if (
        incomingLooksLikeBrowser &&
        currentHash &&
        currentHash !== payload.userAgentHash
      ) {
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
