import { z } from "zod";

// ─── Shared: matches a 10-hex-character backup code or a 6-digit TOTP code ─
export const totpOrBackupCode = z
  .string()
  .min(6)
  .refine(
    (val) => /^\d{6}$/.test(val) || /^[0-9a-f]{10}$/i.test(val),
    { message: "Enter a valid 6-digit code from your authenticator app or a 10-character backup code" },
  );

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .superRefine((val, ctx) => {
      if (!/[A-Z]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one uppercase letter",
        });
      }
      if (!/[a-z]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one lowercase letter",
        });
      }
      if (!/\d/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one number",
        });
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-~`]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one special character",
        });
      }
    }),
  captchaToken: z.string().min(1, "CAPTCHA is required"),
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
  totpCode: totpOrBackupCode,
});

export const MfaSetupSchema = z.object({});

export const MfaEnableSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  totpCode: totpOrBackupCode,
});

export const MfaDisableSchema = z.object({
  totpCode: totpOrBackupCode,
});

export const RegenerateBackupCodesSchema = z.object({});

// ─── Password Reset Schemas ────────────────────────────────────────────

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .superRefine((val, ctx) => {
      if (!/[A-Z]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one uppercase letter",
        });
      }
      if (!/[a-z]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one lowercase letter",
        });
      }
      if (!/\d/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one number",
        });
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-~`]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must contain at least one special character",
        });
      }
    }),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type GoogleOAuthDto = z.infer<typeof GoogleOAuthSchema>;
export type MfaVerifyLoginDto = z.infer<typeof MfaVerifyLoginSchema>;
export type MfaSetupDto = z.infer<typeof MfaSetupSchema>;
export type MfaEnableDto = z.infer<typeof MfaEnableSchema>;
export type MfaDisableDto = z.infer<typeof MfaDisableSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
// ─── Email Verification Schemas ──────────────────────────────────────

export const ResendVerificationSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type RegenerateBackupCodesDto = z.infer<typeof RegenerateBackupCodesSchema>;
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;

// ─── Profile Schemas ────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

