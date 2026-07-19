// ─── Session Types ──────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  provider: string;
}

export interface Session {
  user: SessionUser;
  accessToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Base64url helpers ───────────────────────────────────────────────

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64u: string): string {
  let raw = b64u.replace(/-/g, "+").replace(/_/g, "/");
  while (raw.length % 4) raw += "=";
  return raw;
}

// ─── HMAC signing (Edge + Node.js via Web Crypto API) ────────────────

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(btoa(String.fromCharCode(...new Uint8Array(signature))));
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Encode session data into a signed cookie value.
 * Format: `base64url(json).base64url(hmac)`
 */
export async function encodeSession(session: Session): Promise<string> {
  const payload = btoa(JSON.stringify(session));
  const sig = await hmacSign(payload, getSecret());
  return `${toBase64Url(payload)}.${sig}`;
}

/**
 * Decode and verify a signed cookie value.
 * Returns null if the signature is invalid or the session has expired.
 */
export async function decodeSession(
  cookieValue: string,
): Promise<Session | null> {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64u, sig] = parts;
  const payload = fromBase64Url(payloadB64u);

  const expectedSig = await hmacSign(payload, getSecret());
  if (sig !== expectedSig) return null;

  try {
    const session = JSON.parse(atob(payload)) as Session;
    if (session.expiresAt && Date.now() < session.expiresAt) {
      return session;
    }
    return null; // expired
  } catch {
    return null;
  }
}

/**
 * Build a `Set-Cookie` header value string.
 */
export function buildSessionCookie(
  value: string,
  maxAge: number = SESSION_DURATION_MS / 1000,
): string {
  const isProd = process.env.NODE_ENV === "production";
  return (
    `${SESSION_COOKIE_NAME}=${value}; ` +
    `HttpOnly; ` +
    `SameSite=Lax; ` +
    `Path=/; ` +
    `${isProd ? "Secure; " : ""}` +
    `Max-Age=${maxAge}`
  );
}

/**
 * Build a `Set-Cookie` header that clears the session cookie.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required for session signing",
    );
  }
  return secret;
}
