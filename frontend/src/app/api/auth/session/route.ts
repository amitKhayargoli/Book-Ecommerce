import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  decodeSession,
} from "@/lib/session";

/**
 * GET /api/auth/session
 *
 * Returns the current session from the httpOnly cookie, or null if
 * not authenticated.
 */
export async function GET(_request: NextRequest) {
  const cookieValue = _request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.json({ user: null, accessToken: undefined });
  }

  const session = await decodeSession(cookieValue);

  if (!session) {
    return NextResponse.json({ user: null, accessToken: undefined });
  }

  return NextResponse.json({
    user: session.user,
    accessToken: session.accessToken,
    mfaRequired: session.mfaRequired ?? undefined,
    mfaToken: session.mfaToken ?? undefined,
    expiresAt: session.expiresAt,
  });
}
