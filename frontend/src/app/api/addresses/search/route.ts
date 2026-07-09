import { NextRequest, NextResponse } from "next/server";

const BAATO_API_KEY = process.env.BAATO_API_KEY ?? "";
const BAATO_SEARCH_URL = "https://api.baato.io/api/v1/search";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = searchParams.get("limit") ?? "5";

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  if (!BAATO_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Baato API key not configured" },
      { status: 500 },
    );
  }

  try {
    const url = `${BAATO_SEARCH_URL}?key=${BAATO_API_KEY}&q=${encodeURIComponent(q.trim())}&limit=${limit}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to search places" },
      { status: 502 },
    );
  }
}
