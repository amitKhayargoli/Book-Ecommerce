import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { errorHandler } from "./middlewares/error.middleware";
import bookRoutes from "./routes/book.routes";
import authRoutes from "./routes/auth.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import cartRoutes from "./routes/cart.routes";
import checkoutRoutes from "./routes/checkout.routes";
import uploadRoutes from "./routes/upload.routes";
import adminRoutes from "./routes/admin.routes";
import addressRoutes from "./routes/address.routes";
import { AppError } from "./utils/errors";
import { ipAccessMiddleware } from "./middlewares/ipAccess.middleware";

const app: Application = express();

// ─── Core Middleware ─────────────────────────────────────────────
app.use(ipAccessMiddleware);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_BASE_URL || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── HTTP request logger (stdout) — token-redacted ────────
// Visible via `docker logs book-backend`. Custom URL token
// masks verification, password-reset, OAuth state, and similar
// query-string secrets so we don't leak credentials into log
// history. Format produced per line:
//   ":remote-addr :method :safeUrl :status :res[content-length] - :response-time ms"
const REDACT_KEYS = ["token", "password", "email", "secret", "code", "key"] as const;
// Built once per process instead of per request.
// NOTE: If you ever widen the format string to include :req[Authorization],
// add a `safeAuth` companion token at the same time so auth headers stay redacted.
const REDACT_REGEX = new RegExp(`([?&])(${REDACT_KEYS.join("|")})=([^&]+)`, "gi");

morgan.token("safeUrl", (req: Request) => {
  const url = req.originalUrl;
  return url.includes("?") && url.includes("=")
    ? url.replace(REDACT_REGEX, "$1$2=[REDACTED]")
    : url;
});

app.use(
  morgan(
    ":remote-addr :method :safeUrl :status :res[content-length] - :response-time ms",
  ),
);

// ─── Serve uploaded files ─────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health Check ────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────
app.use("/api/books", bookRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/addresses", addressRoutes);

// ─── 404 Catch-all ───────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// ─── Global Error Handler ────────────────────────────────────────
app.use(errorHandler);

export default app;
