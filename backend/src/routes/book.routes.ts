import { Router } from "express";
import { BookController } from "../controllers/book.controller";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  CreateBookSchema,
  UpdateBookSchema,
  BookQuerySchema,
} from "../dto/book.dto";

const router = Router();
const controller = new BookController();

// ─────────────────────────────────────────────────────────────────
//  PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────

router.get(
  "/",
  validate(BookQuerySchema, "query"),
  asyncHandler(controller.getBooks),
);

router.get("/featured", asyncHandler(controller.getFeaturedBooks));

router.get("/trending", asyncHandler(controller.getTrendingBooks));

router.get("/slug/:slug", asyncHandler(controller.getBookBySlug));

router.get("/author/:authorId", asyncHandler(controller.getBooksByAuthor));

router.get("/:id", asyncHandler(controller.getBookById));

// ─────────────────────────────────────────────────────────────────
//  PROTECTED ROUTES  (attach auth middleware here when ready)
//  e.g.   router.use(authMiddleware);
// ─────────────────────────────────────────────────────────────────

router.post(
  "/",
  // authMiddleware,
  validate(CreateBookSchema),
  asyncHandler(controller.createBook),
);

router.patch(
  "/:id",
  // authMiddleware,
  validate(UpdateBookSchema),
  asyncHandler(controller.updateBook),
);

router.delete(
  "/:id",
  // authMiddleware,
  asyncHandler(controller.deleteBook),
);

router.patch(
  "/:id/toggle-featured",
  // authMiddleware,
  asyncHandler(controller.toggleFeatured),
);

router.patch(
  "/:id/toggle-trending",
  // authMiddleware,
  asyncHandler(controller.toggleTrending),
);

export default router;
