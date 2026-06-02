import { NextResponse } from "next/server";

import { cache5m, fetchWeatherCurrent, getCacheAge } from "@/lib/server/services/siata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchWeatherCurrent();
  if (data.error) {
    return NextResponse.json({ detail: data.error }, { status: 503 });
  }
  return NextResponse.json({ ...data, cache_age_seconds: getCacheAge("weather", cache5m) });
}
