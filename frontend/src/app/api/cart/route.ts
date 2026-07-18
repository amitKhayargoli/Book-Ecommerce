import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/cart`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
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
