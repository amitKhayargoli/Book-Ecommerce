import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server-config";
import {
  Session,
  SessionUser,
  encodeSession,
  buildSessionCookie,
} from "@/lib/session";

/**
 * GET /api/auth/callback/google?code=...
 *
 * Receives the Google OAuth authorization code, exchanges it
 * for an ID token, sends it to the backend for verification,
 * and creates a session cookie.
 */
/** Decode the payload of a JWT without verifying the signature.
 *  The ID token is verified server-side; we only extract UI-facing
 *  fields here so the backend schema passes validation. */
function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(atob(b64)) as T;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  // Normalise origin so redirect URLs work when Next.js binds to 0.0.0.0
  const safeOrigin = new URL(request.url).origin.replace("0.0.0.0", "localhost");

  function redirectTo(path: string): NextResponse {
    return NextResponse.redirect(new URL(path, safeOrigin));
  }

  if (error) {
    console.error("[google-callback] OAuth error:", error);
    return redirectTo("/login?error=oauth_denied");
  }

  if (!code) {
    console.error("[google-callback] No authorization code received");
    return redirectTo("/login?error=missing_code");
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const redirectUri = `${safeOrigin}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    console.error("[google-callback] Google OAuth not configured: missing AUTH_GOOGLE_ID or AUTH_GOOGLE_SECRET");
    return redirectTo("/login?error=oauth_config");
  }

  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        "[google-callback] Token exchange failed:",
        tokenResponse.status,
        errorText,
      );
      return redirectTo("/login?error=token_exchange_failed");
    }

    const tokens = (await tokenResponse.json()) as {
      id_token?: string;
      access_token?: string;
    };

    const idToken = tokens.id_token;

    if (!idToken) {
      console.error("[google-callback] No ID token in Google response");
      return redirectTo("/login?error=missing_id_token");
    }

    // Extract user info from the ID token for the backend's schema validation
    const tokenPayload = decodeJwtPayload<{ name?: string; email?: string }>(idToken);
    const name = tokenPayload?.name ?? "Google User";
    const email = tokenPayload?.email ?? "unknown@google-oauth.local";

    // Send the ID token + user info to the backend for verification
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/auth/oauth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, idToken }),
      },
    );

    const backendPayload = (await backendResponse.json()) as {
      success: boolean;
      message?: string;
      data?: {
        accessToken?: string;
        mfaRequired?: boolean;
        mfaToken?: string;
        user?: {
          id: string;
          name: string;
          email: string;
          role: string;
          image?: string | null;
        };
      };
    };

    if (!backendResponse.ok || !backendPayload.success) {
      console.error(
        "[google-callback] Backend rejected token:",
        backendPayload.message,
      );
      return redirectTo(
        `/login?error=${encodeURIComponent(backendPayload.message || "auth_failed")}`,
      );
    }

    const data = backendPayload.data!;

    // ── MFA is required: create a pending session ──────────────
    if (data.mfaRequired && data.mfaToken) {
      const pendingSession: Session = {
        user: {
          id: data.user?.id ?? "",
          name: data.user?.name ?? "Google User",
          email: data.user?.email ?? "",
          image: data.user?.image ?? null,
          role: data.user?.role ?? "CUSTOMER",
          provider: "GOOGLE",
        },
        mfaRequired: true,
        mfaToken: data.mfaToken,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min for MFA challenge
      };

      const cookieValue = await encodeSession(pendingSession);

      const response = NextResponse.redirect(
        new URL(
          `/login?mfa_pending=true&callbackUrl=${encodeURIComponent(state || "/")}`,
          safeOrigin,
        ),
      );

      response.headers.set("Set-Cookie", buildSessionCookie(cookieValue, 300));
      return response;
    }

    // ── Fully authenticated ────────────────────────────────────
    const sessionUser: SessionUser = {
      id: data.user?.id ?? "",
      name: data.user?.name ?? "Google User",
      email: data.user?.email ?? "",
      image: data.user?.image ?? null,
      role: data.user?.role ?? "CUSTOMER",
      provider: "GOOGLE",
    };

    const session: Session = {
      user: sessionUser,
      accessToken: data.accessToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    const cookieValue = await encodeSession(session);

    // Redirect admins to the admin dashboard regardless of callbackUrl
    const redirectPath = data.user?.role === "ADMIN" ? "/admin" : (state || "/");
    const response = NextResponse.redirect(new URL(redirectPath, safeOrigin));
    response.headers.set("Set-Cookie", buildSessionCookie(cookieValue));
    return response;
  } catch (err) {
    console.error("[google-callback] Unexpected error:", err);
    return redirectTo("/login?error=unexpected");
  }
}
