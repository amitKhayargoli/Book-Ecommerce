import { Request, Response, NextFunction } from "express";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

/**
 * Middleware that prevents admin users from accessing customer-specific
 * endpoints (cart, checkout, wishlist, addresses, orders, etc.).
 *
 * Must be used AFTER `authMiddleware` so that `req.user` is populated.
 */
export function customerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required" });
    return;
  }

  if (user.role === "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Admins cannot access customer-specific endpoints.",
    });
    return;
  }

  next();
}
