import rateLimit from "express-rate-limit";
import { Request } from "express";

type AuthenticatedRequest = Request & { user?: { id: string } };

/**
 * Create a rate limiter that keys on the authenticated user ID,
 * falling back to IP for unauthenticated requests.
 *
 * @param max  Maximum number of requests within the window
 * @param windowMs  Time window in milliseconds (default 15 minutes)
 */
export function perUserRateLimit(max: number, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user?.id) {
        return `user:${authReq.user.id}`;
      }
      // Fall back to IP for unauthenticated requests
      return req.ip ?? req.socket.remoteAddress ?? "unknown";
    },
    message: {
      success: false,
      message: "Too many requests. Please slow down and try again.",
    },
  });
}
