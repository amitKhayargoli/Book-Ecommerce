import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { AddCartItemSchema, CartBookParamSchema } from "../dto/cart.dto";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();
const controller = new CartController();

router.get("/", authMiddleware, asyncHandler(controller.getCart));
router.get("/count", authMiddleware, asyncHandler(controller.getCartCount));
router.get(
  "/items/:bookId/status",
  authMiddleware,
  validate(CartBookParamSchema, "params"),
  asyncHandler(controller.getItemStatus),
);

router.post(
  "/items",
  authMiddleware,
  validate(AddCartItemSchema),
  asyncHandler(controller.addItem),
);

router.delete(
  "/items/:bookId",
  authMiddleware,
  validate(CartBookParamSchema, "params"),
  asyncHandler(controller.removeItem),
);

export default router;
