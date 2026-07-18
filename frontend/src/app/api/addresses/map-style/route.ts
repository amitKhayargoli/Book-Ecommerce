import { NextResponse } from "next/server";

const BAATO_API_KEY = process.env.BAATO_API_KEY ?? "";

export async function GET() {
  if (!BAATO_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Baato API key not configured" },
      { status: 500 },
    );
  }

  try {
    const url = `https://api.baato.io/api/v1/styles/breeze?key=${BAATO_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch map style" },
        { status: response.status },
      );
    }

    const style = (await response.json()) as Record<string, unknown>;

    // The Baato style JSON already contains tile URLs with the API key embedded.
    // Return it as-is for MapLibre to consume.
    return NextResponse.json(style);
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch map style" },
      { status: 502 },
    );
  }
}
