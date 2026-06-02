import { NextResponse } from "next/server";

import { fetchAlertsActive } from "@/lib/server/services/siata";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Feature = {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
};

/**
 * Unified hazard layer: high-risk edges + community-report clusters + SIATA
 * alerts, as GeoJSON features with severity levels.
 */
export async function GET() {
  const { grafo, reportes } = getState();
  const features: Feature[] = [];

  // 1. High-risk edge midpoints — top N riskiest only (graph has ~120k edges)
  const MAX_EDGES = 300;
  const seen = new Set<string>();
  const candidates: Array<[number, number, number, string]> = []; // score, lat, lon, name
  for (const [nid, aristas] of grafo.adjacencia) {
    const c1 = grafo.coordenadas.get(nid);
    if (!c1) continue;
    const [lat1, lon1] = c1;
    for (const arista of aristas) {
      if (arista.risk <= 0.9) continue;
      const key =
        nid < arista.destino ? `${nid}|${arista.destino}` : `${arista.destino}|${nid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c2 = grafo.coordenadas.get(arista.destino);
      if (!c2) continue;
      candidates.push([arista.risk, (lat1 + c2[0]) / 2, (lon1 + c2[1]) / 2, arista.name]);
    }
  }
  candidates.sort((a, b) => b[0] - a[0]);
  for (const [score, midLat, midLon, name] of candidates.slice(0, MAX_EDGES)) {
    const nivel = score > 0.97 ? "rojo" : score > 0.94 ? "naranja" : "amarillo";
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [midLon, midLat] },
      properties: {
        tipo: "arista_alto_riesgo",
        nivel,
        score: Math.round(score * 1000) / 1000,
        nombre: name,
        radio_m: 33,
      },
    });
  }

  // 2. Community report clusters (cells of ~0.001°, ≥3 reports, severity ≥3)
  const cell = 0.001;
  const clusters = new Map<string, { lat: number; lon: number; reps: number[] }>();
  for (const rep of reportes) {
    if (!(rep.active ?? true)) continue;
    if ((rep.severity ?? 0) < 3) continue;
    const clat = Math.round(rep.lat / cell) * cell;
    const clon = Math.round(rep.lon / cell) * cell;
    const key = `${clat},${clon}`;
    let entry = clusters.get(key);
    if (!entry) {
      entry = { lat: clat, lon: clon, reps: [] };
      clusters.set(key, entry);
    }
    entry.reps.push(rep.severity);
  }
  for (const { lat, lon, reps } of clusters.values()) {
    if (reps.length < 3) continue;
    const avgSev = reps.reduce((a, b) => a + b, 0) / reps.length;
    const score = Math.min(1.0, avgSev / 5.0 + reps.length * 0.05);
    const nivel = score > 0.85 ? "rojo" : score > 0.7 ? "naranja" : "amarillo";
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        tipo: "cluster_reportes",
        nivel,
        score: Math.round(score * 1000) / 1000,
        num_reportes: reps.length,
        radio_m: 100,
      },
    });
  }

  // 3. SIATA alerts with geometry
  const alerts = await fetchAlertsActive();
  const scoreByNivel: Record<string, number> = { rojo: 0.9, naranja: 0.75, amarillo: 0.55 };
  for (const alert of alerts) {
    if (alert.nivel && alert.tipo) {
      features.push({
        type: "Feature",
        geometry: alert.poligono ?? { type: "Point", coordinates: [-75.5812, 6.2442] },
        properties: {
          tipo: `siata_${alert.tipo}`,
          nivel: alert.nivel,
          score: scoreByNivel[alert.nivel] ?? 0.55,
          descripcion: alert.descripcion ?? "",
        },
      });
    }
  }

  return NextResponse.json({ type: "FeatureCollection", features, total: features.length });
}
