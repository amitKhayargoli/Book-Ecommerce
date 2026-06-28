# Security Features — Gap Analysis

## ✅ Already Implemented (30 features)

### Authentication & Authorization

| Feature | Status |
|---|---|
| JWT-based auth (Bearer tokens) | ✅ `auth.middleware.ts` |
| Admin role authorization | ✅ `admin.middleware.ts` |
| Role-based access (CUSTOMER/ADMIN) | ✅ Prisma schema |
| NextAuth v5 (Credentials + Google OAuth) | ✅ |
| Google OAuth via `google-auth-library` | ✅ |
| JWT with configurable expiry (default 7d) | ✅ |

### Password Security

| Feature | Status |
|---|---|
| bcrypt hashing (rounds: 12) | ✅ |
| Account lockout (15 fails → 30 min) | ✅ |
| Min password length (8 chars) | ✅ `dto/auth.dto.ts` |

### Rate Limiting

| Feature | Status |
|---|---|
| Login: 20 req/15min | ✅ |
| Register: 10 req/15min | ✅ |
| Google OAuth: 20 req/15min | ✅ |
| MFA verify: 10 req/15min | ✅ |
| Forgot password: 5 req/15min | ✅ |
| Reset password: 10 req/15min | ✅ |
| Cart endpoints: 60 req/15min per user | ✅ `rateLimiter.middleware.ts` |
| Wishlist endpoints: 60 req/15min per user | ✅ `rateLimiter.middleware.ts` |
| Book CRUD (admin): 30 req/15min per user | ✅ `rateLimiter.middleware.ts` |
| Review submission: 20 req/15min per user | ✅ `rateLimiter.middleware.ts` |

### Multi-Factor Auth

| Feature | Status |
|---|---|
| TOTP generation + verification | ✅ `mfa.service.ts` |
| QR code provisioning | ✅ |
| 5-min MFA challenge token | ✅ |
| MFA settings page with enable/disable | ✅ `/mfa/settings` |
| MFA on login (credentials + Google OAuth) | ✅ |
| MFA middleware redirect | ✅ `middleware.ts` |

### CAPTCHA

| Feature | Status |
|---|---|
| Cloudflare Turnstile (server verify) | ✅ `captcha.middleware.ts` |
| Turnstile widget on login/signup | ✅ both pages |

### Password Reset

| Feature | Status |
|---|---|
| Forgot password request endpoint | ✅ `POST /forgot-password` |
| Reset password with token | ✅ `POST /reset-password` |
| Crypto-random tokens (32 bytes) | ✅ |
| Token expiry (1 hour) | ✅ |
| Atomic transaction (update password + mark token used) | ✅ |
| Email enumeration prevention | ✅ |
| Existing token invalidation | ✅ |
| Lockout counter reset on password change | ✅ |
| Forgot password page | ✅ `/forgot-password` |
| Reset password page | ✅ `/reset-password` |
| Dev-mode reset link display | ✅ |

### Password Complexity

| Feature | Status |
|---|---|
| Min 8 characters | ✅ |
| Requires uppercase letter | ✅ |
| Requires lowercase letter | ✅ |
| Requires digit | ✅ |
| Requires special character | ✅ |
| All failing rules reported at once (superRefine) | ✅ |

### General

| Feature | Status |
|---|---|
| Helmet.js security headers | ✅ |
| CORS configuration | ✅ |
| Zod validation on all DTOs | ✅ |
| Structured error handling | ✅ `error.middleware.ts` |
| Async handler wrapper | ✅ |
| Timing-safe comparison (eSewa) | ✅ |
| Auth event audit logging (20 events) | ✅ `audit.service.ts` |
| Admin audit log viewer | ✅ `/admin/audit-logs` |
| Per-user rate limiter (factory) | ✅ `rateLimiter.middleware.ts` |

---

## ❌ Gaps — Not Yet Implemented (14 items)

### High Priority

| # | Gap | Why it matters | Difficulty |
|---|---|---|---|
| 1 | ~~Forgot password / password reset~~ | ~~Login page has a "Forgot?" link but `/forgot-password` gives 404. Users can't recover accounts.~~ | ✅ **Done** |
| 2 | ~~Email verification on registration~~ | ~~Anyone can register with any email — no ownership verification. Enables spam accounts.~~ | ✅ **Done** |
| 3 | **MFA recovery codes** | If a user loses their authenticator app, they're permanently locked out. Industry standard is 8-10 one-time backup codes on setup. | 🟡 Add to MFA setup flow |
| 4 | ~~Password complexity~~ | ~~Only min-length enforced. No requirement for uppercase, lowercase, digits, special chars.~~ | ✅ **Done** |
| 5 | ~~Session invalidation on password change~~ | ~~Changing password doesn't invalidate existing JWTs. Stolen tokens remain valid.~~ | ✅ **Done** |

### Medium Priority

| # | Gap | Why it matters | Difficulty |
|---|---|---|---|
| 6 | ~~Auth event audit logging~~ | ~~No structured logging of logins, MFA events, lockouts — makes incident response hard.~~ | ✅ **Done** |
| 7 | ~~File upload validation~~ | ~~Upload routes exist but haven't been audited for size limits, type restrictions~~ | ✅ **Done** |
| 8 | **Content Security Policy (CSP)** | Helmet is used but CSP not explicitly configured. Turnstile script loads from CDN. | 🟢 Add CSP to Helmet config |
| 9 | ~~Rate limiting on other routes~~ | ~~Only auth routes have rate limiting. Cart, wishlist, books, checkout are unprotected.~~ | ✅ **Done** |
| 10 | **API key for external services** | eSewa/Khalti success endpoints are unauthenticated (expected) but have no request validation beyond queries. | 🟡 Add IP allow-listing for payment callbacks |
| 11 | **No refresh token rotation** | Single long-lived JWT (7d). No short-lived access + long-lived refresh pattern. | 🟡 Architectural change |

### Lower Priority

| # | Gap | Why it matters | Difficulty |
|---|---|---|---|
| 10 | **HTTPS enforcement** | No HTTP→HTTPS redirect. Dev only, but important for production. | 🟢 Prod config |
| 11 | **Input sanitization (XSS)** | User-provided text (names, reviews, comments) not sanitized before rendering. | 🟢 Add DOMPurify on client |
| 12 | **MFA re-auth on sensitive actions** | Disabling MFA requires TOTP ✓ but changing email/password doesn't. | 🟡 Add to password change flow |
| 13 | **Account deletion** | No way for users to delete their own account/data (GDPR/privacy). | 🟡 Need deletion endpoint |
| 14 | ~~Brute-force on other endpoints~~ | ~~Lockout only protects login. Cart/wishlist/book routes are wide open.~~ | ✅ **Done** |

---

## Payment Gateway Security

The checkout service has good cryptographic verification:

- **eSewa**: HMAC-SHA256 signature verification with `timingSafeEqual` ✅
- **Khalti**: Server-side payment lookup verification ✅
- **Amount validation**: Callback amounts matched against stored order totals ✅
- **Transaction UUID validation**: Regex + type checks ✅

But the success/failure callback endpoints (`/esewa/success`, `/khalti/success`, etc.) are **unauthenticated GET** endpoints (required for payment provider redirects) — no IP allow-listing or additional request validation beyond query param parsing.

---

## Recommendations for Next Steps

1. 🔴 **MFA Recovery Codes** — Essential before going to production, otherwise users WILL get locked out
2. 🟡 **CSP** — Configure Content Security Policy for Turnstile CDN
3. 🟡 **File upload validation** — Add size limits and type restrictions
4. 🟡 **API key for payment callbacks** — IP allow-listing for eSewa/Khalti
