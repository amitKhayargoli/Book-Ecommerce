import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  captchaToken: z.string().min(1, "CAPTCHA is required")
});

export const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  captchaToken: z.string().min(1, "CAPTCHA is required"),
});

export const GoogleOAuthSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  idToken: z.string().min(1, "ID Token is required"),
});

// ─── MFA Schemas ──────────────────────────────────────────────────────

export const MfaVerifyLoginSchema = z.object({
  mfaToken: z.string().min(1, "MFA token is required"),
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});

export const MfaSetupSchema = z.object({});

export const MfaEnableSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});

export const MfaDisableSchema = z.object({
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type GoogleOAuthDto = z.infer<typeof GoogleOAuthSchema>;
export type MfaVerifyLoginDto = z.infer<typeof MfaVerifyLoginSchema>;
export type MfaSetupDto = z.infer<typeof MfaSetupSchema>;
export type MfaEnableDto = z.infer<typeof MfaEnableSchema>;
export type MfaDisableDto = z.infer<typeof MfaDisableSchema>;
