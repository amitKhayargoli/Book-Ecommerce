import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/addresses/${id}/default`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      },
    );

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to set default address" },
      { status: 502 },
    );
  }
}
