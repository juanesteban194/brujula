/**
 * augment-data.ts — assemble the routing dataset with full risk coverage (§6.10).
 *
 * Risk always comes from the REAL measured dataset (`calles_de_medellin_con_acoso.csv`):
 *  - a segment that coincides (≤ MATCH_M) with a measured street keeps that real value;
 *  - otherwise it's estimated by IDW from the k nearest measured segments.
 * Every row is tagged `fuente` (real | interpolado | sin_dato) for transparency.
 *
 * Base network:
 *  - if `calles_valle_osm.csv` exists (real OSM network of the whole Valle de
 *    Aburrá, from fetch-osm-valle.ts) → build on it, so routing is connected
 *    across the metro;
 *  - else → fall back to the Medellín dataset alone (real values kept, gaps IDW'd).
 *
 * Output: `calles_de_medellin_aumentado.csv` (what the graph loader prefers).
 * Run:  npm run augment   (after  npm run fetch:osm  for full-metro coverage)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { GridIndex, idw, haversineM, type IDWPoint } from "../lib/geo/idw.ts";

const DATA_DIR = join(process.cwd(), "data");
const MEDELLIN = join(DATA_DIR, "calles_de_medellin_con_acoso.csv");
const OSM = join(DATA_DIR, "calles_valle_osm.csv");
const OUT = join(DATA_DIR, "calles_de_medellin_aumentado.csv");

const K = 8;        // neighbours per IDW estimate
const MATCH_M = 8;  // ≤ this distance to a measured segment → adopt its real value
const RISK_COL = 5; // name;origin;destination;length;oneway;harassmentRisk;geometry

function parseCoord(s: string): [number, number] | null {
  const parts = s.trim().replace(/^\(/, "").replace(/\)$/, "").split(",");
  if (parts.length !== 2) return null;
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return [lat, lon];
}
function midpoint(o: string, d: string): [number, number] | null {
  const a = parseCoord(o), b = parseCoord(d);
  if (!a || !b) return null;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function main(): void {
  // 1) Spatial index of REAL measured risk (from the official Medellín dataset).
  console.info(`[augment] Indexando riesgo medido de ${MEDELLIN}`);
  const med = readFileSync(MEDELLIN, "utf-8").split(/\r?\n/);
  const index = new GridIndex(0.004);
  let medidas = 0;
  for (let i = 1; i < med.length; i++) {
    const line = med[i];
    if (!line) continue;
    const cols = line.split(";");
    if (cols.length <= RISK_COL) continue;
    const raw = cols[RISK_COL];
    const val = raw === undefined || raw === "" ? NaN : Number(raw);
    if (Number.isNaN(val)) continue;
    const mid = midpoint(cols[1], cols[2]);
    if (!mid) continue;
    index.add({ lat: mid[0], lon: mid[1], value: val });
    medidas++;
  }
  console.info(`[augment] Segmentos medidos indexados: ${medidas}`);

  // 2) Base network: full Valle de Aburrá OSM if available, else Medellín alone.
  const useOsm = existsSync(OSM);
  const base = readFileSync(useOsm ? OSM : MEDELLIN, "utf-8").split(/\r?\n/);
  const header = base[0];
  console.info(`[augment] Base: ${useOsm ? "OSM Valle de Aburrá" : "Medellín"} (${base.length - 1} filas)`);

  const out: string[] = [`${header};fuente`];
  let real = 0, interp = 0, sin = 0, sum = 0, mn = Infinity, mx = -Infinity;

  for (let i = 1; i < base.length; i++) {
    const line = base[i];
    if (!line) continue;
    const cols = line.split(";");
    if (cols.length <= RISK_COL) continue;

    // A measured value already present (Medellín-base path) → keep it as real.
    const raw = cols[RISK_COL];
    if (raw !== undefined && raw !== "" && !Number.isNaN(Number(raw))) {
      out.push(`${cols.join(";")};real`);
      real++;
      continue;
    }

    const mid = midpoint(cols[1], cols[2]);
    let fuente = "sin_dato";
    if (mid) {
      const near: IDWPoint[] = index.nearest(mid[0], mid[1], K);
      if (near.length) {
        const d0 = haversineM(mid[0], mid[1], near[0].lat, near[0].lon);
        let v: number;
        if (d0 <= MATCH_M) {
          v = near[0].value;     // coincides with a measured street
          fuente = "real";
          real++;
        } else {
          v = clamp01(idw(mid[0], mid[1], near));
          fuente = "interpolado";
          interp++; sum += v; mn = Math.min(mn, v); mx = Math.max(mx, v);
        }
        cols[RISK_COL] = clamp01(v).toFixed(6);
      } else {
        sin++;
      }
    } else {
      sin++;
    }
    out.push(`${cols.join(";")};${fuente}`);
  }

  writeFileSync(OUT, out.join("\n"), "utf-8");
  console.info(`[augment] real(+match)=${real} · interpolado=${interp} · sin_dato=${sin}`);
  console.info(`[augment] riesgo interpolado → min=${mn === Infinity ? 0 : mn.toFixed(3)} media=${(sum / Math.max(interp, 1)).toFixed(3)} max=${mx === -Infinity ? 0 : mx.toFixed(3)}`);
  console.info(`[augment] Escrito ${OUT}: ${out.length - 1} filas`);
}

main();
