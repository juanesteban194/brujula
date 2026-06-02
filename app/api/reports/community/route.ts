import { NextResponse } from "next/server";

import { aplicarOverlay } from "@/lib/server/services/riskOverlay";
import { getState, persistReports } from "@/lib/server/state";
import type { Report } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = ["acoso_verbal", "zona_solitaria", "iluminacion_deficiente", "robo", "bien"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bbox = url.searchParams.get("bbox");
  const since = url.searchParams.get("since");
  const activeOnly = url.searchParams.get("active_only") !== "false";

  let reports: Report[] = getState().reportes;

  if (activeOnly) reports = reports.filter((r) => r.active ?? true);

  if (since) {
    const sinceMs = Date.parse(since);
    if (!Number.isNaN(sinceMs)) {
      reports = reports.filter((r) => Date.parse(r.timestamp) >= sinceMs);
    }
  }

  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [lat1, lon1, lat2, lon2] = parts;
      reports = reports.filter(
        (r) => r.lat >= lat1 && r.lat <= lat2 && r.lon >= lon1 && r.lon <= lon2,
      );
    }
  }

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { type, lat, lon, severity, description } = body ?? {};

  if (
    !TIPOS.includes(type) ||
    typeof lat !== "number" ||
    lat < 6.0 ||
    lat > 7.0 ||
    typeof lon !== "number" ||
    lon < -76.0 ||
    lon > -75.0 ||
    typeof severity !== "number" ||
    severity < 1 ||
    severity > 5
  ) {
    return NextResponse.json({ detail: "Reporte inválido" }, { status: 422 });
  }

  const report: Report = {
    id: `rep_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    type,
    lat,
    lon,
    severity: Math.round(severity),
    description: typeof description === "string" ? description.slice(0, 500) : null,
    timestamp: new Date().toISOString(),
    votes: { confirm: 0, deny: 0 },
    active: true,
  };

  const state = getState();
  state.reportes.push(report);
  persistReports();

  // Apply high-severity reports immediately to the in-memory graph
  if (report.severity >= 3) {
    aplicarOverlay(state.grafo, [report]);
  }

  return NextResponse.json(report, { status: 201 });
}
