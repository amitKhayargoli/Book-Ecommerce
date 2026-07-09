import { Router } from "express";
import { CheckoutController } from "../controllers/checkout.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  KhaltiInitiateSchema,
  KhaltiSuccessQuerySchema,
} from "../dto/checkout.dto";

const router = Router();
const controller = new CheckoutController();

router.post(
  "/khalti/initiate",
  authMiddleware,
  validate(KhaltiInitiateSchema),
  asyncHandler(controller.initiateKhalti),
);

router.get(
  "/khalti/success",
  validate(KhaltiSuccessQuerySchema, "query"),
  asyncHandler(controller.verifyKhaltiSuccess),
);

router.get("/khalti/failure", asyncHandler(controller.handleKhaltiFailure));

export default router;
