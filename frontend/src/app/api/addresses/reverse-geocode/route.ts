import { NextRequest, NextResponse } from "next/server";

const BAATO_API_KEY = process.env.BAATO_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, message: "lat and lon parameters are required" },
      { status: 400 },
    );
  }

  if (!BAATO_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Baato API key not configured" },
      { status: 500 },
    );
  }

  try {
    const url = `https://api.baato.io/api/v1/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&key=${BAATO_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to reverse geocode" },
      { status: 502 },
    );
  }
}
