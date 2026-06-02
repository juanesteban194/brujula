import { NextResponse } from "next/server";

import { cache5m, fetchAirQuality, getCacheAge } from "@/lib/server/services/siata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stations = await fetchAirQuality();
  return NextResponse.json({
    stations,
    count: stations.length,
    cache_age_seconds: getCacheAge("air_quality", cache5m),
  });
}
