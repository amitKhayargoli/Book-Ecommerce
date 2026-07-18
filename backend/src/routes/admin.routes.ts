import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();
const controller = new AdminController();

router.get(
  "/dashboard",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.getDashboard),
);

router.get(
  "/orders",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.getOrders),
);

router.patch(
  "/orders/:id/status",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.updateOrderStatus),
);

// ─── IP Access Rules ────────────────────────────────────────────────

router.get(
  "/ip-rules",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.getIpAccessRules),
);

router.get(
  "/ip-rules/sessions",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.getRecentSessions),
);

router.post(
  "/ip-rules",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.createIpAccessRule),
);

router.put(
  "/ip-rules/:id",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.updateIpAccessRule),
);

router.delete(
  "/ip-rules/:id",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.deleteIpAccessRule),
);

// ─── User Management ────────────────────────────────────────────────

router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.getUsers),
);

router.delete(
  "/users/:id",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.deleteUser),
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  adminMiddleware,
  asyncHandler(controller.updateUserRole),
);

export default router;
