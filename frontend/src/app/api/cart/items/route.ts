import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const bookId =
    typeof payload === "object" && payload !== null && "bookId" in payload
      ? (payload as { bookId?: unknown }).bookId
      : undefined;

  if (typeof bookId !== "string" || bookId.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "bookId is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ bookId }),
      cache: "no-store",
    });

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to reach cart service" },
      { status: 502 },
    );
  }
}
