import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server-config";
import {
  Session,
  SessionUser,
  encodeSession,
  buildSessionCookie,
} from "@/lib/session";

/**
 * POST /api/auth/set-session
 *
 * Accepts a backend access token and creates a signed session cookie.
 *
 * Body: { accessToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { accessToken?: string };
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { success: false, message: "accessToken is required" },
        { status: 400 },
      );
    }

    // Validate the token by fetching the user profile from the backend
    const profileResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired access token" },
        { status: 401 },
      );
    }

    const profilePayload = (await profileResponse.json()) as {
      success: boolean;
      data?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        role: string;
        provider?: string;
      };
    };

    if (!profilePayload.success || !profilePayload.data) {
      return NextResponse.json(
        { success: false, message: "Failed to verify access token" },
        { status: 401 },
      );
    }

    const userData = profilePayload.data;

    const sessionUser: SessionUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      image: userData.image ?? null,
      role: userData.role,
      provider: userData.provider ?? "EMAIL",
    };

    const session: Session = {
      user: sessionUser,
      accessToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    const cookieValue = await encodeSession(session);

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Set-Cookie": buildSessionCookie(cookieValue),
        },
      },
    );
  } catch (error) {
    console.error("[set-session] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
