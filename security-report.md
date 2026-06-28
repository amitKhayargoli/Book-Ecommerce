# Security Report — Book E-Commerce Platform

> **Generated:** June 2026
>
> A comprehensive inventory of every security control implemented across the platform,
> organized by security domain. Each feature includes implementation details, the
> file(s) responsible, and any relevant configuration notes.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Authorization & Access Control](#2-authorization--access-control)
3. [Password Security](#3-password-security)
4. [Multi-Factor Authentication (MFA)](#4-multi-factor-authentication-mfa)
5. [Email Verification](#5-email-verification)
6. [Password Reset](#6-password-reset)
7. [Session Management](#7-session-management)
8. [Rate Limiting](#8-rate-limiting)
9. [CAPTCHA / Bot Protection](#9-captcha--bot-protection)
10. [Audit Logging](#10-audit-logging)
11. [Input Validation & Sanitization](#11-input-validation--sanitization)
12. [HTTP Security Headers](#12-http-security-headers)
13. [Payment Gateway Security](#13-payment-gateway-security)
14. [Error Handling & Leak Prevention](#14-error-handling--leak-prevention)
15. [Data Models (Prisma Schema)](#15-data-models-prisma-schema)
16. [Remaining Gaps](#16-remaining-gaps)

---

## 1. Authentication

### 1.1 JWT-Based Bearer Token Auth

| Property | Value |
|---|---|
| **Algorithm** | HS256 (via `jsonwebtoken`) |
| **Default expiry** | 7 days (configurable via `JWT_EXPIRES_IN`) |
| **Secret** | Configured via `JWT_SECRET` env var |
| **Implementation** | `backend/src/utils/jwt.ts` |

The JWT payload includes `sub` (user ID), `name`, `email`, `role`, and `tokenVersion`.

**Files:** `backend/src/utils/jwt.ts`, `backend/src/middlewares/auth.middleware.ts`

### 1.2 Credential-based Login

- Email + password authentication with bcrypt verification
- Account lockout after 15 failed attempts (30-minute lockout)
- Failed attempt counter reset on successful login
- Lockout expires automatically after 30 minutes
- All events logged via audit service

**Files:** `backend/src/services/auth.service.ts` (method: `login`)

### 1.3 Google OAuth

- Server-side ID token verification via `google-auth-library`
- Auto-creates account if email doesn't exist
- Auto-verifies email (Google-verified emails are trusted)
- Random password generated for OAuth-only accounts (user cannot log in with password)

**Files:** `backend/src/services/auth.service.ts` (method: `loginWithGoogle`)
**Config:** `AUTH_GOOGLE_ID` env var

### 1.4 Registration

- Email uniqueness check (case-insensitive, normalized to lowercase)
- bcrypt password hashing (12 salt rounds)
- CAPTCHA verification required
- Rate-limited (10 req/15min)
- Account created with `emailVerified: null` — login blocked until email is verified
- Audit log entry on registration

**Files:** `backend/src/services/auth.service.ts` (method: `register`), `backend/src/middlewares/captcha.middleware.ts`

### 1.5 NextAuth.js Session

- NextAuth v5 with Credentials provider (JWT-based)
- Google OAuth provider
- Session stores `accessToken` for backend API calls
- MFA-pending flag carried in session

**Files:** `frontend/src/auth.ts`, `frontend/src/app/api/auth/[...nextauth]/route.ts`

---

## 2. Authorization & Access Control

### 2.1 Role-Based Access Control

| Role | Description |
|---|---|
| `CUSTOMER` | Default role. Can browse, add to cart, wishlist, write reviews |
| `ADMIN` | Can manage books, view audit logs, access admin dashboard |

**Implementation:** `UserRole` enum in Prisma schema (`backend/prisma/schema.prisma`)

### 2.2 Auth Middleware

- Extracts Bearer token from `Authorization` header
- Verifies JWT signature and expiry
- Checks `tokenVersion` against database (invalidates sessions after password change)
- Attaches `AuthUserPayload` to `req.user`

**File:** `backend/src/middlewares/auth.middleware.ts`

### 2.3 Admin Middleware

- Checks `req.user.role === "ADMIN"`
- Returns 403 if not admin
- Must be used after `authMiddleware`

**File:** `backend/src/middlewares/admin.middleware.ts`

### 2.4 Protected Routes

| Route Group | Protection |
|---|---|
| `/api/cart/*` | `authMiddleware` on all routes |
| `/api/wishlist/*` | `authMiddleware` on all routes |
| `/api/auth/me` | `authMiddleware` |
| `/api/auth/mfa/*` | `authMiddleware` on setup/enable/disable/backup-codes |
| `/api/auth/audit-logs` | `authMiddleware` + `adminMiddleware` |
| `/api/books` (POST/PATCH/DELETE) | `authMiddleware` + `adminMiddleware` |
| `/api/books/:id/reviews` (POST) | `authMiddleware` |

---

## 3. Password Security

### 3.1 Hashing

- **Algorithm:** bcrypt
- **Salt rounds:** 12
- **Library:** `bcryptjs`

**File:** `backend/src/services/auth.service.ts` (constant `SALT_ROUNDS = 12`)

### 3.2 Complexity Requirements (Zod superRefine)

Enforced on both registration and password reset:

| Requirement | Validation |
|---|---|
| Minimum length | 8 characters |
| Maximum length | 72 characters (bcrypt limit) |
| Uppercase | At least 1 (`/[A-Z]/`) |
| Lowercase | At least 1 (`/[a-z]/`) |
| Digit | At least 1 (`/\\d/`) |
| Special character | At least 1 (`/[!@#$%^&*(),.?\":{}|<>_\\-~`]/`) |

All failing rules are reported simultaneously via `superRefine`.

**File:** `backend/src/dto/auth.dto.ts` (schemas: `RegisterSchema`, `ResetPasswordSchema`)

### 3.3 Account Lockout

| Property | Value |
|---|---|
| Max failed attempts | 15 |
| Lockout duration | 30 minutes |
| Lockout auto-resets | After 30 minutes from last failed attempt |
| Counter resets on | Successful login, password reset |

**Files:** `backend/src/services/auth.service.ts` (constants `MAX_FAILED_ATTEMPTS`, `LOCKOUT_DURATION_MS`)

### 3.4 Password Change Invalidation

- `tokenVersion` field on User model (incremented on password change/reset)
- JWT carries `tokenVersion` at time of signing
- Auth middleware compares JWT `tokenVersion` against DB on every request
- Stale tokens are rejected with "Session expired" message

**Files:** `backend/prisma/schema.prisma` (User.tokenVersion), `backend/src/services/auth.service.ts` (resetPassword), `backend/src/middlewares/auth.middleware.ts`

---

## 4. Multi-Factor Authentication (MFA)

### 4.1 TOTP Setup

| Feature | Details |
|---|---|
| Secret generation | `otplib.generateSecret()` via `@otplib/plugin-crypto-node` |
| Provisioning URI | `otpauth://` URI with issuer "Book E-Commerce" |
| QR code | Generated via `qrcode` library (data URI) |
| Setup flow | 1. User requests setup → receives secret + QR code. 2. User scans QR in authenticator app. 3. User submits TOTP code to enable MFA |

**Files:** `backend/src/services/mfa.service.ts`, `backend/src/services/auth.service.ts`

### 4.2 TOTP Verification

- `otplib.verifySync()` with the stored secret
- Applied at: login (MFA challenge step), MFA enable (verify before saving), MFA disable (verify before removing)
- 5-min MFA challenge token (short-lived JWT issued after password verification)

### 4.3 MFA Challenge Flow

```
Login → Password correct → MFA enabled? → Yes → Issue 5-min challenge token
                                                              ↓
                                          User submits TOTP/backup code
                                                              ↓
                                          Token verified → Full session JWT issued
```

**File:** `backend/src/utils/jwt.ts` (`signMfaChallengeToken`)

### 4.4 MFA Recovery / Backup Codes

| Property | Value |
|---|---|
| **Count** | 10 one-time codes |
| **Format** | 10-character hex string (e.g., `a3f8c92b1e`) |
| **Generation** | `crypto.randomBytes(5).toString("hex")` |
| **Storage** | bcrypt-hashed before storing in DB |
| **Verification** | bcrypt.compare, case-insensitive |
| **Consumption** | Marked `usedAt` on first match |
| **Auto-generated** | On MFA enable (returned to user once) |
| **Regeneration** | Old unused codes deleted, 10 new codes created |

**Files:** `backend/src/services/mfa.service.ts`, `backend/src/prisma/schema.prisma` (BackupCode model)

### 4.5 MFA UI

- `/mfa/settings` — Setup, enable/disable, view backup codes, regenerate
- Login page MFA step — Accepts 6-digit TOTP or 10-char backup code
- NextAuth middleware redirects MFA-pending users

**Files:** `frontend/src/app/mfa/settings/page.tsx`, `frontend/src/app/(auth)/login/page.tsx`

---

## 5. Email Verification

### 5.1 Registration Verification

- Account created with `emailVerified: null`
- 32-byte crypto-random verification token generated
- Token expires after 24 hours
- Token stored in `VerificationToken` model
- Returns success message (does NOT return auth tokens)
- Dev mode: verification URL printed to console + returned in response

### 5.2 Login Block

- Login checks `user.emailVerified` before password verification
- Returns 400 "Please verify your email before signing in"
- Resend verification link shown on login page

### 5.3 Google OAuth Auto-Verify

- Google OAuth users get `emailVerified: new Date()` automatically
- Google already verified the email during OAuth

### 5.4 Token Security

- `crypto.randomBytes(32)` = 256-bit token
- Single-use (marked `usedAt` after verification)
- Expired tokens rejected
- Existing tokens invalidated when a new verification is requested
- Atomic transaction: update `emailVerified` + mark token used

**Files:** `backend/src/services/auth.service.ts`, `backend/prisma/schema.prisma` (VerificationToken model)

---

## 6. Password Reset

### 6.1 Request Flow

1. User submits email via `/forgot-password`
2. If email exists: generate 32-byte crypto-random token, 1-hour expiry
3. Existing unused tokens are invalidated before creating a new one
4. Same response returned regardless of whether email exists (prevents enumeration)
5. Dev mode: reset URL printed to console + returned in response

### 6.2 Reset Flow

1. User clicks link → `/reset-password?token=...`
2. Token validation: exists, not used, not expired
3. Atomic transaction: update password + mark token used
4. Lockout counter reset + `tokenVersion` incremented (invalidates all sessions)
5. Audit event logged on success/failure/expiry

### 6.3 Email Enumeration Protection

- Same generic message returned whether email exists or not:
  > "If an account with that email exists, a password reset link has been sent."

**Files:** `backend/src/services/auth.service.ts` (methods: `forgotPassword`, `resetPassword`)

---

## 7. Session Management

### 7.1 JWT Token Structure

```typescript
interface SignedAuthTokenPayload {
  sub: string;         // User ID
  name: string;
  email: string;
  role: UserRole;
  tokenVersion: number; // Invalidated on password change
  iat?: number;        // Issued at
  exp?: number;        // Expiry
}
```

**File:** `backend/src/utils/jwt.ts`

### 7.2 Token Versioning

- Every JWT includes the user's `tokenVersion` from the DB at sign-in
- Auth middleware checks `tokenVersion` against DB on every authenticated request
- `tokenVersion` is incremented on password reset → all existing tokens become invalid
- Single long-lived JWT (7d), no refresh token rotation

---

## 8. Rate Limiting

### 8.1 Auth Endpoint Rate Limits

| Endpoint | Window | Max Requests | Scope |
|---|---|---|---|
| `POST /login` | 15 min | 20 | IP |
| `POST /register` | 15 min | 10 | IP |
| `POST /oauth/google` | 15 min | 20 | IP |
| `POST /mfa/verify-login` | 15 min | 10 | IP |
| `POST /forgot-password` | 15 min | 5 | IP |
| `POST /reset-password` | 15 min | 10 | IP |
| `GET /verify-email` | 15 min | 10 | IP |
| `POST /resend-verification` | 15 min | 5 | IP |

All auth rate limiters use `express-rate-limit` with standard headers.

### 8.2 Per-User Rate Limits (Cart, Wishlist, Books)

| Route Group | Window | Max | Scope |
|---|---|---|---|
| `/api/cart/*` | 15 min | 60 | Per user (by userId) |
| `/api/wishlist/*` | 15 min | 60 | Per user (by userId) |
| `/api/books` (POST/PATCH/DELETE) | 15 min | 30 | Per admin (by userId) |
| `/api/books/:id/reviews` (POST) | 15 min | 20 | Per user (by userId) |

**Key design:** `keyGenerator` checks `req.user?.id` for authenticated requests, falling back to IP.
`authMiddleware` runs BEFORE the rate limiter, so `req.user` is populated.

**File:** `backend/src/middlewares/rateLimiter.middleware.ts` (factory: `perUserRateLimit`)

---

## 9. CAPTCHA / Bot Protection

### 9.1 Cloudflare Turnstile

| Property | Value |
|---|---|
| **Provider** | Cloudflare Turnstile (invisible) |
| **Server verification** | `POST challenges.cloudflare.com/turnstile/v0/siteverify` |
| **Protected routes** | `POST /login`, `POST /register` |
| **Secret** | `TURNSTILE_SECRET_KEY` env var |
| **Site key** | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` env var |
| **Fallback** | Captures remote IP for server-side verification |

**Files:** `backend/src/middlewares/captcha.middleware.ts`, `frontend/src/app/(auth)/login/page.tsx`, `frontend/src/app/(auth)/signup/page.tsx`

---

## 10. Audit Logging

### 10.1 Audit Service

- Fire-and-forget logging (errors swallowed, never breaks auth flows)
- Structured log entries stored in database (`AuditLog` model)
- Indexed on `event`, `userId`, and `createdAt`

### 10.2 Tracked Events (20 events)

| Category | Events |
|---|---|
| **Registration** | `register` |
| **Login** | `login_success`, `login_failed`, `login_locked`, `login_account_locked` |
| **Google OAuth** | `google_oauth_success` |
| **MFA** | `mfa_challenge_issued`, `mfa_verify_success`, `mfa_verify_failed`, `mfa_enabled`, `mfa_disabled`, `mfa_backup_codes_regenerated` |
| **Password Reset** | `forgot_password_requested`, `password_reset_success`, `password_reset_failed`, `password_reset_expired` |
| **Email Verification** | `email_verification_sent`, `email_verified`, `email_verification_resend`, `email_verification_failed` |

### 10.3 Log Entry Schema

```typescript
{
  id: string;
  event: string;           // Event type (see above)
  userId?: string;         // Target user (if applicable)
  email?: string;          // Target email (if applicable)
  ip?: string;             // Client IP
  userAgent?: string;      // Client User-Agent
  metadata: Json;          // Event-specific data (reasons, attempt counts, etc.)
  createdAt: DateTime;
}
```

### 10.4 Admin Audit Log Viewer

- Route: `GET /api/auth/audit-logs` (admin-only, paginated)
- Filters: event type, date range (from/to), text search
- Frontend page: `/admin/audit-logs` with interactive table and filters

**Files:** `backend/src/services/audit.service.ts`, `backend/src/controllers/auth.controller.ts` (`getAuditLogs`),
`frontend/src/app/admin/audit-logs/`

---

## 11. Input Validation & Sanitization

### 11.1 Zod Schema Validation

Every incoming request is validated by a Zod schema before reaching the controller:

- **Registration:** name (min 2), email (valid format), password (complexity rules), captchaToken
- **Login:** email, password, captchaToken
- **Google OAuth:** name, email, idToken
- **MFA:** TOTP code (6 digits or 10-char hex backup code)
- **Password reset:** email, token, password (complexity rules)
- **Book CRUD:** Full validation of book fields
- **Cart/Wishlist:** Book ID parameter validation

**File:** `backend/src/middlewares/validate.middleware.ts` (generic Zod validation middleware)

### 11.2 Validation Features

- All rules run simultaneously (errors reported together)
- Detailed error response with field-level messages
- Type coercion via `z.infer` for TypeScript type safety
- Mutation-safe: replaces `req.body` with parsed data (strips unknown fields)

---

## 12. HTTP Security Headers

### 12.1 Helmet.js

Applied globally with `crossOriginResourcePolicy` configured for uploads:

```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

Helmet sets the following headers by default:
- `Content-Security-Policy` (default config — **not explicitly customized**)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security` (if HTTPS)
- `Referrer-Policy: strict-origin-when-cross-origin`

**Note:** CSP is not explicitly configured for Cloudflare Turnstile. See [Remaining Gaps](#16-remaining-gaps).

### 12.2 CORS

```javascript
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
```

**File:** `backend/src/app.ts`

---

## 13. Payment Gateway Security

### 13.1 eSewa

| Control | Implementation |
|---|---|
| **HMAC signature** | HMAC-SHA256 of `total_amount,transaction_uuid,product_code` |
| **Signature comparison** | `crypto.timingSafeEqual` (constant-time) |
| **Field verification** | Only signed fields are used in signature check |
| **Amount validation** | Callback amount compared against stored order total (epsilon: 0.001) |
| **Transaction UUID** | Regex validated: `/^[A-Za-z0-9-]{8,64}$/` |
| **Status check** | Server-side re-verification via eSewa status API |
| **Idempotency** | Already-paid orders detected (`alreadyProcessed: true`) |
| **Provider assertion** | Order's `paymentProvider` must match `ESEWA` |
| **Callback encoding** | Base64-decoded, JSON-parsed |

### 13.2 Khalti

| Control | Implementation |
|---|---|
| **Lookup verification** | Server-side payment lookup via Khalti API |
| **Secret key auth** | `Authorization: Key {secret}` header |
| **Amount validation** | Amount in paisa compared against order total (tolerance: 1 paisa) |
| **Transaction UUID** | Regex validated, passed from callback query params |
| **Idempotency** | Already-paid orders detected |
| **Provider assertion** | Order's `paymentProvider` must match `KHALTI` |
| **Minimum amount** | Khalti minimum: NPR 10 (1000 paisa) |

### 13.3 Shared Controls

| Control | Implementation |
|---|---|
| **Transaction UUID format** | `{PREFIX}-{timestamp}-{random hex}` (e.g., `ESW-1712345678-a1b2c3d4`) |
| **Double-spend prevention** | `paymentTransactionUuid` is unique in database |
| **Order reconciliation** | Amount matched + status verified via provider API |
| **Payment response storage** | Raw callback + verification response stored in `paymentRawResponse` (JSON) |

**File:** `backend/src/services/checkout.service.ts`

---

## 14. Error Handling & Leak Prevention

### 14.1 Structured Error Classes

```typescript
class AppError           // Base — statusCode + isOperational
class NotFoundError      // 404
class BadRequestError    // 400
class ConflictError      // 409
class UnauthorizedError  // 401
class TooManyRequestsError  // 429
```

**File:** `backend/src/utils/errors.ts`

### 14.2 Global Error Handler

- Operational errors (`AppError` instances): return `statusCode` + message
- Prisma errors: mapped to user-friendly messages (P2002 → 409, P2025 → 404, P2003 → 400)
- Unhandled errors: `500` with message in dev, generic "Internal server error" in production
- Async handler wrapper catches promise rejections

**Files:** `backend/src/middlewares/error.middleware.ts`, `backend/src/middlewares/asyncHandler.ts`

### 14.3 Email Enumeration Prevention

- **Login:** Same message for "email not found" and "wrong password"
- **Password reset:** Same message whether email exists or not
- **Register:** Returns error if email already exists (required for UX, but rate-limited)
- **Resend verification:** Same message whether email exists or not

---

## 15. Data Models (Prisma Schema)

### 15.1 User Model Security Fields

```prisma
model User {
  id                   String     @id @default(auto()) @map("_id") @db.ObjectId
  email                String     @unique          // Enforced unique
  password             String                      // bcrypt hash
  role                 UserRole   @default(CUSTOMER) // CUSTOMER | ADMIN

  // Account lockout
  failedLoginAttempts  Int        @default(0)
  lockoutUntil         DateTime?

  // Email verification
  emailVerified        DateTime?

  // MFA
  totpSecret           String?    @default("")
  isMfaEnabled         Boolean    @default(false)

  // Session invalidation
  tokenVersion         Int        @default(0)

  // Relationships
  passwordResets       PasswordResetToken[]
  backupCodes          BackupCode[]
  verificationTokens   VerificationToken[]
}
```

### 15.2 Token Models

| Model | Purpose | Fields |
|---|---|---|
| `PasswordResetToken` | Password reset flow | `token` (unique), `expiresAt`, `usedAt` |
| `VerificationToken` | Email verification | `token` (unique), `expiresAt`, `usedAt` |
| `BackupCode` | MFA recovery codes | `code` (bcrypt hashed), `usedAt` |
| `AuditLog` | Security event log | `event`, `userId`, `email`, `ip`, `userAgent`, `metadata` |

**File:** `backend/prisma/schema.prisma`

---

## 16. Remaining Gaps

| # | Gap | Priority | Notes |
|---|---|---|---|
| 1 | **Content Security Policy (CSP)** | 🟡 Medium | Helmet is used but CSP not explicitly configured for Cloudflare Turnstile CDN |
| 2 | ~~File upload validation~~ | ✅ **Done** | Upload validated for size (5MB), type (MIME + extension), and SVG XSS sanitization |
| 3 | **Payment callback IP allow-listing** | 🟡 Medium | eSewa/Khalti success endpoints are unauthenticated GET endpoints |
| 4 | **Refresh token rotation** | 🟡 Medium | Single long-lived JWT (7d) with no short-lived access + refresh pattern |
| 5 | **HTTPS enforcement** | 🟢 Low | No HTTP→HTTPS redirect. Dev only, but needed for production |
| 6 | **Input sanitization (XSS)** | 🟢 Low | User-provided text not sanitized before rendering (reviews, names) |
| 7 | **MFA re-auth on sensitive actions** | 🟡 Medium | Changing email/password doesn't require MFA re-verification |
| 8 | **Account deletion** | 🟡 Medium | No way for users to delete their own data (GDPR) |
| 9 | **Sensitive data exposure in errors** | 🟢 Low | Dev mode leaks error messages (mitigated by production env config) |
| 10 | **Device tracking / remember MFA** | 🟢 Low | No "trust this device" option for MFA |

---

## Implementation Summary by File

| File | Security Role |
|---|---|
| `backend/src/middlewares/auth.middleware.ts` | JWT verification, token version check |
| `backend/src/middlewares/admin.middleware.ts` | Admin role gate |
| `backend/src/middlewares/captcha.middleware.ts` | Cloudflare Turnstile verification |
| `backend/src/middlewares/rateLimiter.middleware.ts` | Per-user rate limit factory |
| `backend/src/middlewares/validate.middleware.ts` | Zod schema validation |
| `backend/src/middlewares/error.middleware.ts` | Global error handler |
| `backend/src/middlewares/asyncHandler.ts` | Promise rejection catcher |
| `backend/src/services/auth.service.ts` | Auth business logic (password, MFA, reset, verification) |
| `backend/src/services/mfa.service.ts` | TOTP generation/verification, backup codes |
| `backend/src/services/audit.service.ts` | Structured event logging |
| `backend/src/services/checkout.service.ts` | Payment verification (HMAC, lookup, amount match) |
| `backend/src/utils/jwt.ts` | JWT signing/verification, MFA challenge tokens |
| `backend/src/utils/errors.ts` | Typed error classes |
| `backend/src/utils/response.ts` | Structured API responses |
| `backend/src/dto/auth.dto.ts` | Input validation schemas (password complexity, MFA codes, etc.) |
| `backend/prisma/schema.prisma` | Data models (User, tokens, audit log) |
| `backend/src/app.ts` | Helmet, CORS, route configuration |
