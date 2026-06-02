import { NextResponse } from "next/server";

import { cache2m, fetchAlertsActive, getCacheAge } from "@/lib/server/services/siata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await fetchAlertsActive();
  return NextResponse.json({
    alerts,
    count: alerts.length,
    cache_age_seconds: getCacheAge("alerts", cache2m),
  });
}
