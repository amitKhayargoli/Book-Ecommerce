import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google?callbackUrl=/...
 *
 * Redirects the user to Google's OAuth consent screen.
 * After authorization, Google redirects back to /api/auth/callback/google.
 */
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/";
  const clientId = process.env.AUTH_GOOGLE_ID;

  if (!clientId) {
    console.error("[google-initiate] AUTH_GOOGLE_ID is not configured");
    return NextResponse.redirect(
      new URL("/login?error=oauth_config", request.url),
    );
  }

  const origin = new URL(request.url).origin.replace("0.0.0.0", "localhost");
  const redirectUri = `${origin}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state: callbackUrl,
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}
