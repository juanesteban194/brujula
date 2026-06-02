import { NextResponse } from "next/server";

import { getCurrentWeather, MEDELLIN_LAT, MEDELLIN_LON } from "@/lib/server/services/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current weather (§1). OpenWeatherMap → Open-Meteo fallback. Optional ?lat&lon. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat") ?? MEDELLIN_LAT);
  const lon = Number(searchParams.get("lon") ?? MEDELLIN_LON);
  try {
    const data = await getCurrentWeather(
      Number.isFinite(lat) ? lat : MEDELLIN_LAT,
      Number.isFinite(lon) ? lon : MEDELLIN_LON,
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ detail: "Clima no disponible" }, { status: 503 });
  }
}
