import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UploadController } from "../controllers/upload.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

// ─── Ensure uploads directory exists ───────────────────────────────
const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Multer storage config ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Preserve extension, add timestamp prefix to avoid collisions
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

// ─── Allowed MIME types ──────────────────────────────────────────
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
] as const;

// ─── Allowed file extensions (defense-in-depth alongside MIME) ────
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"] as const;

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  const mimes = ALLOWED_MIMES as readonly string[];
  if (!mimes.includes(file.mimetype)) {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, AVIF, SVG.`));
    return;
  }

  // Check file extension (defense-in-depth)
  const ext = path.extname(file.originalname).toLowerCase();
  const extensions = ALLOWED_EXTENSIONS as readonly string[];
  if (!extensions.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    cb(new Error(`Unsupported file extension: ${ext}. Allowed: .jpg, .jpeg, .png, .webp, .gif, .avif, .svg.`));
    return;
  }

  cb(null, true);
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const router = Router();
const controller = new UploadController();

// ─── Routes ─────────────────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        // Multer errors (file too large, wrong type, etc.)
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({
              success: false,
              message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
            });
            return;
          }
          res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
          });
          return;
        }
        // File filter errors (unsupported type / extension)
        res.status(400).json({
          success: false,
          message: err.message,
        });
        return;
      }
      next();
    });
  },
  asyncHandler(controller.uploadImage),
);

export default router;
