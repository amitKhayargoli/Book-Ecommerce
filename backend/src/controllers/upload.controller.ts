import { Response } from "express";
import { sendSuccess } from "../utils/response";
import { Request } from "express";

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

    const port = process.env.PORT ?? 3001;
    const host = req.get("host") ?? `localhost:${port}`;

    // Build the public URL to access the uploaded file
    const url = `${req.protocol}://${host}/uploads/${req.file.filename}`;

    sendSuccess(res, { url, filename: req.file.filename }, "Image uploaded successfully");
  };
}
