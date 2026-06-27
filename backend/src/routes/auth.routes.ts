import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { GoogleOAuthSchema, LoginSchema, MfaDisableSchema, MfaEnableSchema, MfaSetupSchema, MfaVerifyLoginSchema, RegisterSchema } from "../dto/auth.dto";
import { authMiddleware } from "../middlewares/auth.middleware";
import { captchaMiddleware } from "../middlewares/captcha.middleware";

const router = Router();
const controller = new AuthController();

// ─── Rate Limiting ────────────────────────────────────────────────
// Strict rate limit for login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts from this IP. Try again after 15 minutes.",
  },
});

// Moderate rate limit for registration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Try again after 15 minutes.",
  },
});

// Separate rate limiter for OAuth to avoid being blocked by registration attempts
const googleOAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OAuth requests. Try again after 15 minutes.",
  },
});

// Strict rate limit for MFA TOTP verification to prevent brute-force
// 6-digit code = 1M combinations, this makes guessing infeasible within the 5-min challenge window
const mfaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Try again after 15 minutes.",
  },
});

router.post("/register", authLimiter, captchaMiddleware, validate(RegisterSchema), asyncHandler(controller.register));
router.post("/login",  loginLimiter, captchaMiddleware, validate(LoginSchema), asyncHandler(controller.login));
router.post("/oauth/google", googleOAuthLimiter, validate(GoogleOAuthSchema), asyncHandler(controller.googleOauth));
router.get("/me", authMiddleware, asyncHandler(controller.me));

// ─── MFA Routes ──────────────────────────────────────────────────
router.get("/mfa/status", authMiddleware, asyncHandler(controller.mfaStatus));
router.post("/mfa/verify-login", mfaVerifyLimiter, validate(MfaVerifyLoginSchema), asyncHandler(controller.verifyMfaLogin));
router.post("/mfa/setup", authMiddleware, validate(MfaSetupSchema), asyncHandler(controller.setupMfa));
router.post("/mfa/enable", authMiddleware, validate(MfaEnableSchema), asyncHandler(controller.enableMfa));
router.post("/mfa/disable", authMiddleware, validate(MfaDisableSchema), asyncHandler(controller.disableMfa));

export default router;
