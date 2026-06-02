import { NextResponse } from "next/server";

import type { Arista } from "@/lib/server/graph/models";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Largest index i such that sorted[i] <= x (bisect_right). */
function bisectRight(sorted: number[], x: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (x < sorted[mid]) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/**
 * Edges as GeoJSON LineStrings with a `risk` property. Returns the top-`limit`
 * highest-risk edges (deduped undirected) plus a percentile-rank `risk_norm`
 * for a meaningful color scale on the heatmap layer.
 */
export async function GET(request: Request) {
  const { grafo } = getState();
  const limit = Math.max(
    1,
    Number(new URL(request.url).searchParams.get("limit")) || 8000,
  );

  const seen = new Set<string>();
  type Edge = [number, string, Arista, number, number, number, number];
  const allEdges: Edge[] = [];

  for (const [nid, aristas] of grafo.adjacencia) {
    const c1 = grafo.coordenadas.get(nid);
    if (!c1) continue;
    const [lat1, lon1] = c1;
    for (const arista of aristas) {
      const key =
        nid < arista.destino ? `${nid}|${arista.destino}` : `${arista.destino}|${nid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c2 = grafo.coordenadas.get(arista.destino);
      if (!c2) continue;
      allEdges.push([arista.risk, nid, arista, lat1, lon1, c2[0], c2[1]]);
    }
  }

  const risksSorted = allEdges.map((e) => e[0]).sort((a, b) => a - b);
  const n = Math.max(risksSorted.length, 1);

  const topEdges = [...allEdges].sort((a, b) => b[0] - a[0]).slice(0, limit);

  const features = topEdges.map(([, , arista, lat1, lon1, lat2, lon2]) => ({
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [lon1, lat1],
        [lon2, lat2],
      ],
    },
    properties: {
      risk: Math.round(arista.risk * 1e4) / 1e4,
      risk_norm: Math.round((bisectRight(risksSorted, arista.risk) / n) * 1e4) / 1e4,
      length: arista.length,
      name: arista.name,
    },
  }));

  return NextResponse.json({ type: "FeatureCollection", features });
}
