import { Router } from "express";
import { WishlistController } from "../controllers/wishlist.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { AddWishlistItemSchema, WishlistBookParamSchema } from "../dto/wishlist.dto";
import { asyncHandler } from "../middlewares/asyncHandler";
import { perUserRateLimit } from "../middlewares/rateLimiter.middleware";

const router = Router();
const controller = new WishlistController();

// 60 wishlist requests per 15 minutes per user
const wishlistLimiter = perUserRateLimit(60);

router.get("/", authMiddleware, wishlistLimiter, asyncHandler(controller.getWishlist));

router.get(
  "/items/:bookId/status",
  authMiddleware,
  wishlistLimiter,
  validate(WishlistBookParamSchema, "params"),
  asyncHandler(controller.getItemStatus),
);

router.post(
  "/items",
  authMiddleware,
  wishlistLimiter,
  validate(AddWishlistItemSchema),
  asyncHandler(controller.addItem),
);

router.delete(
  "/items/:bookId",
  authMiddleware,
  wishlistLimiter,
  validate(WishlistBookParamSchema, "params"),
  asyncHandler(controller.removeItem),
);

export default router;
