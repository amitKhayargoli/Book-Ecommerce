import { Router } from "express";
import { AddressController } from "../controllers/address.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import { CreateAddressSchema, UpdateAddressSchema } from "../dto/address.dto";

const router = Router();
const controller = new AddressController();

router.use(authMiddleware);

router.get("/", asyncHandler(controller.listAddresses));
router.get("/:id", asyncHandler(controller.getAddress));
router.post("/", validate(CreateAddressSchema), asyncHandler(controller.createAddress));
router.put("/:id", validate(UpdateAddressSchema), asyncHandler(controller.updateAddress));
router.delete("/:id", asyncHandler(controller.deleteAddress));
router.patch("/:id/default", asyncHandler(controller.setDefault));

export default router;
