import { Response } from "express";
import { sendSuccess } from "../utils/response";
import { Request } from "express";
import fs from "fs";
import path from "path";

/**
 * Sanitize an SVG file by removing <script> tags and on* event handler attributes.
 * Rewrites the file in place with the sanitized content.
 */
function sanitizeSvg(filePath: string): void {
  const raw = fs.readFileSync(filePath, "utf-8");

  // Remove <script>...</script> blocks (including any content between them)
  let sanitized = raw.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove SVG <script/> self-closing tags
  sanitized = sanitized.replace(/<script[\s\S]*?\/>/gi, "");

  // Remove event handler attributes (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Remove javascript: URLs in href/xlink:href attributes
  sanitized = sanitized.replace(/(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, (match) => match.replace(/javascript:.*/i, ''));

  if (sanitized !== raw) {
    fs.writeFileSync(filePath, sanitized, "utf-8");
    console.log(`[upload] Sanitized SVG: ${path.basename(filePath)}`);
  }
}

export class UploadController {
  /**
   * POST /api/upload
   * Accepts a single image file via multipart/form-data (field name: "image").
   * Returns the public URL of the uploaded file.
   */
  uploadImage = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No image file provided. Use field name 'image'.",
      });
      return;
    }

    // ── Sanitize SVG content (XSS prevention) ──────────────────
    if (req.file.mimetype === "image/svg+xml") {
      sanitizeSvg(req.file.path);
    }

    const port = process.env.PORT ?? 3001;
    const host = req.get("host") ?? `localhost:${port}`;

    // Build the public URL to access the uploaded file
    const url = `${req.protocol}://${host}/uploads/${req.file.filename}`;

    sendSuccess(res, { url, filename: req.file.filename }, "Image uploaded successfully");
  };
}
