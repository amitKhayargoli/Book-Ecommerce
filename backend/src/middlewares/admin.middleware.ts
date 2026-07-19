import { Request, Response, NextFunction } from "express";
import { AuthUserPayload } from "../types/auth.types";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

export function adminMiddleware(
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

  if (user.role !== "ADMIN") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return;
  }

  next();
}
