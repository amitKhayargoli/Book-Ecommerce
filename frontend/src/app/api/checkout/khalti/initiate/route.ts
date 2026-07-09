import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/checkout/khalti/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to reach checkout service" },
      { status: 502 },
    );
  }
}
