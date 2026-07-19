import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie.
 */
export async function POST() {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
}
