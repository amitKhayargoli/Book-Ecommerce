import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { Prisma } from "@prisma/client";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // ── Known operational errors ──────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // ── Prisma known errors ───────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const target = err.meta?.target;
        const field = Array.isArray(target)
          ? target.join(", ")
          : typeof target === "string"
            ? target
            : "field";
        res.status(409).json({
          success: false,
          message: `A record with this ${field} already exists`,
        });
        return;
      }
      case "P2025":
        res.status(404).json({ success: false, message: "Record not found" });
        return;
      case "P2003":
        res
          .status(400)
          .json({ success: false, message: "Related record not found" });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ success: false, message: "Invalid data provided" });
    return;
  }

  // ── Unhandled / programmer errors ─────────────────────────────
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
