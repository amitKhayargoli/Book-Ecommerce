import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

interface RouteContext {
  params: Promise<{ bookId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { bookId } = await context.params;
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  if (!bookId || bookId.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "bookId is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/cart/items/${encodeURIComponent(bookId)}/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store",
      },
    );

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to reach cart service" },
      { status: 502 },
    );
  }
}
