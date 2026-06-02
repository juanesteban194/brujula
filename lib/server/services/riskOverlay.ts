import { haversineM } from "@/lib/server/graph/haversine";
import type { Arista, Grafo } from "@/lib/server/graph/models";
import type { Report } from "@/lib/server/types";

export const RADIO_M = 80.0; // meters of influence
export const PESO_GLOBAL = 0.3; // max additional risk contribution
export const DECAY_DAYS = 30.0; // half-life for temporal decay
const GRID_CELL = 0.0015; // ~150m spatial grid cell (deg)

function decay(timestampStr: string): number {
  try {
    const ts = new Date(timestampStr.replace("Z", "+00:00"));
    if (Number.isNaN(ts.getTime())) return 1.0;
    const ageDays = Math.floor((Date.now() - ts.getTime()) / 86_400_000);
    return Math.exp(-ageDays / DECAY_DAYS);
  } catch {
    return 1.0;
  }
}

/**
 * Adjust `arista.risk` in memory based on nearby community reports.
 * Uses a spatial grid so we only test edges near each report instead of every
 * edge against every report — critical for the ~126k-edge real graph. Never
 * persisted back to the CSV.
 */
export function aplicarOverlay(
  grafo: Grafo,
  reportes: Report[],
  radioM: number = RADIO_M,
): void {
  const activos = reportes.filter((r) => r.active ?? true);
  if (activos.length === 0) return;

  // Build spatial grid of edges keyed by midpoint cell — O(E)
  const grid = new Map<string, Array<[number, number, Arista]>>();
  for (const [nid, aristas] of grafo.adjacencia) {
    const co = grafo.coordenadas.get(nid);
    if (!co) continue;
    const [lat1, lon1] = co;
    for (const a of aristas) {
      const cd = grafo.coordenadas.get(a.destino);
      if (!cd) continue;
      const [lat2, lon2] = cd;
      const ml = (lat1 + lat2) / 2;
      const mo = (lon1 + lon2) / 2;
      const key = `${Math.floor(ml / GRID_CELL)},${Math.floor(mo / GRID_CELL)}`;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push([ml, mo, a]);
    }
  }

  let modificadas = 0;
  for (const rep of activos) {
    const { lat: rlat, lon: rlon } = rep;
    const sev = rep.severity ?? 3;
    const d = decay(rep.timestamp ?? "");
    const cx = Math.floor(rlat / GRID_CELL);
    const cy = Math.floor(rlon / GRID_CELL);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get(`${cx + dx},${cy + dy}`);
        if (!cell) continue;
        for (const [ml, mo, a] of cell) {
          const dist = haversineM(ml, mo, rlat, rlon);
          if (dist >= radioM) continue;
          const contrib = (sev / 5.0) * d * (1 - dist / radioM) * PESO_GLOBAL;
          a.risk = Math.min(1.0, a.risk + contrib);
          modificadas++;
        }
      }
    }
  }

  console.info(
    `[overlay] Risk overlay aplicado: ${modificadas} aristas modificadas para ${activos.length} reportes`,
  );
}
