import { Router } from "express";
import { WishlistController } from "../controllers/wishlist.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { AddWishlistItemSchema, WishlistBookParamSchema } from "../dto/wishlist.dto";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();
const controller = new WishlistController();

router.get("/", authMiddleware, asyncHandler(controller.getWishlist));

router.get(
  "/items/:bookId/status",
  authMiddleware,
  validate(WishlistBookParamSchema, "params"),
  asyncHandler(controller.getItemStatus),
);

router.post(
  "/items",
  authMiddleware,
  validate(AddWishlistItemSchema),
  asyncHandler(controller.addItem),
);

router.delete(
  "/items/:bookId",
  authMiddleware,
  validate(WishlistBookParamSchema, "params"),
  asyncHandler(controller.removeItem),
);

export default router;
