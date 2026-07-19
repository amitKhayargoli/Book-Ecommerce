import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { customerMiddleware } from "../middlewares/customer.middleware";
import { validate } from "../middlewares/validate.middleware";
import { AddCartItemSchema, CartBookParamSchema } from "../dto/cart.dto";
import { asyncHandler } from "../middlewares/asyncHandler";
import { perUserRateLimit } from "../middlewares/rateLimiter.middleware";

const router = Router();
const controller = new CartController();

// 60 cart requests per 15 minutes per user
const cartLimiter = perUserRateLimit(60);

router.get("/", authMiddleware, customerMiddleware, cartLimiter, asyncHandler(controller.getCart));
router.get("/count", authMiddleware, customerMiddleware, cartLimiter, asyncHandler(controller.getCartCount));
router.get(
  "/items/:bookId/status",
  authMiddleware,
  customerMiddleware,
  cartLimiter,
  validate(CartBookParamSchema, "params"),
  asyncHandler(controller.getItemStatus),
);

router.post(
  "/items",
  authMiddleware,
  customerMiddleware,
  cartLimiter,
  validate(AddCartItemSchema),
  asyncHandler(controller.addItem),
);

router.delete(
  "/items/:bookId",
  authMiddleware,
  customerMiddleware,
  cartLimiter,
  validate(CartBookParamSchema, "params"),
  asyncHandler(controller.removeItem),
);

export default router;
