import { haversineM } from "@/lib/server/graph/haversine";
import type { Arista, Grafo } from "@/lib/server/graph/models";
import type { Report } from "@/lib/server/types";

export const RADIO_M = 110.0; // meters where a report raises the risk score
export const RADIO_AVOID_M = 280.0; // ~3 street blocks → edges flagged "reportado" (hard-avoid buffer)
export const PESO_GLOBAL = 0.55; // max additional risk contribution — reports strongly steer safe routes
export const DECAY_DAYS = 60.0; // slower temporal decay so recent reports keep weight
const GRID_CELL = 0.0015; // ~150m spatial grid cell (deg)

// "bien" marks a SAFE zone — never raise risk or flag it for avoidance.
const SAFE_TYPES = new Set(["bien"]);

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
  const activos = reportes.filter((r) => (r.active ?? true) && !SAFE_TYPES.has(r.type));
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

    // ±2 cells (~300m) so the 3-block avoid buffer (RADIO_AVOID_M) is fully covered.
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const cell = grid.get(`${cx + dx},${cy + dy}`);
        if (!cell) continue;
        for (const [ml, mo, a] of cell) {
          const dist = haversineM(ml, mo, rlat, rlon);
          if (dist >= RADIO_AVOID_M) continue;
          // Within ~3 blocks → flag for the hard-avoid (gamma) buffer.
          a.reportado = true;
          // Closer in → also raise the displayed/weighted risk.
          if (dist < radioM) {
            const contrib = (sev / 5.0) * d * (1 - dist / radioM) * PESO_GLOBAL;
            a.risk = Math.min(1.0, a.risk + contrib);
          }
          modificadas++;
        }
      }
    }
  }

  console.info(
    `[overlay] Risk overlay aplicado: ${modificadas} aristas modificadas para ${activos.length} reportes`,
  );
}
