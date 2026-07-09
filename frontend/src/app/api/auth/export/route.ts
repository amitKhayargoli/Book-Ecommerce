import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/auth/export?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(unreadable)");
      console.error(`[Export] Backend returned ${response.status}:`, errorBody);
      return NextResponse.json(
        { success: false, message: `Backend returned ${response.status}: ${errorBody.slice(0, 200)}` },
        { status: response.status },
      );
    }

    if (format === "csv") {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": response.headers.get("Content-Disposition") ?? `attachment; filename="bookstore-export.csv"`,
        },
      });
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Export] Proxy fetch error:`, errorMessage);
    return NextResponse.json(
      { success: false, message: `Failed to export data: ${errorMessage}` },
      { status: 502 },
    );
  }
}
