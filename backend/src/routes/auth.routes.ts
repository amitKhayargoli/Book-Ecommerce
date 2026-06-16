import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { GoogleOAuthSchema, LoginSchema, RegisterSchema } from "../dto/auth.dto";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new AuthController();

router.post("/register", validate(RegisterSchema), asyncHandler(controller.register));
router.post("/login", validate(LoginSchema), asyncHandler(controller.login));
router.post("/oauth/google", validate(GoogleOAuthSchema), asyncHandler(controller.googleOauth));
router.get("/me", authMiddleware, asyncHandler(controller.me));

export default router;
