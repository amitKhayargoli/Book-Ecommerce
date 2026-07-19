import { Router } from "express";
import { CheckoutController } from "../controllers/checkout.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { customerMiddleware } from "../middlewares/customer.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  KhaltiInitiateSchema,
  KhaltiVerifySchema,
} from "../dto/checkout.dto";

const router = Router();
const controller = new CheckoutController();

router.post(
  "/khalti/initiate",
  authMiddleware,
  customerMiddleware,
  validate(KhaltiInitiateSchema),
  asyncHandler(controller.initiateKhalti),
);

router.post(
  "/khalti/verify",
  authMiddleware,
  customerMiddleware,
  validate(KhaltiVerifySchema),
  asyncHandler(controller.verifyKhalti),
);

router.get("/khalti/failure", asyncHandler(controller.handleKhaltiFailure));

export default router;
