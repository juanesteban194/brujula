import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/server/admin-auth";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ detail: "Token inválido" }, { status: 401 });
  }

  const { reportes, contadorRutas } = getState();
  const weekAgo = Date.now() - 7 * 86_400_000;

  const active = reportes.filter((r) => r.active ?? true);
  const recent = active.filter((r) => Date.parse(r.timestamp) >= weekAgo);

  const porTipo: Record<string, number> = {};
  for (const r of active) porTipo[r.type] = (porTipo[r.type] ?? 0) + 1;

  // Hotspot: most reported lat/lon rounded to 3 decimals
  const cellCounts = new Map<string, number>();
  for (const r of active) {
    const key = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  let hotspot: [number, number] | null = null;
  let bestCount = 0;
  for (const [key, c] of cellCounts) {
    if (c > bestCount) {
      bestCount = c;
      const [lat, lon] = key.split(",").map(Number);
      hotspot = [lat, lon];
    }
  }

  return NextResponse.json({
    total_reportes: reportes.length,
    reportes_activos: active.length,
    reportes_7d: recent.length,
    rutas_calculadas: contadorRutas,
    por_tipo: porTipo,
    hotspot,
  });
}
