import { Request, Response, NextFunction } from "express";
 
export async function captchaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Skip CAPTCHA in development mode if no secret key is configured
  if (process.env.NODE_ENV === "development" && !process.env.TURNSTILE_SECRET_KEY) {
    next();
    return;
  }

  const token = req.body.captchaToken;
 
  if (!token) {
    res.status(400).json({ success: false, message: "CAPTCHA token is required" });
    return;
  }
 
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: req.ip,
        }),
      },
    );
 
    const data = await response.json();
 
    if (!data.success) {
      res.status(400).json({ success: false, message: "CAPTCHA verification failed" });
      return;
    }
 
    next();
  } catch {
    res.status(500).json({ success: false, message: "CAPTCHA verification error" });
  }
}