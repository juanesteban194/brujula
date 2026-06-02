/**
 * augment-data.ts — fill missing harassmentRisk via IDW spatial interpolation (§6.10).
 *
 * Reads the official CSV (`calles_de_medellin_con_acoso.csv`), keeps every
 * measured value untouched, and for each segment WITHOUT a value estimates it
 * from the k nearest measured segments using Inverse Distance Weighting.
 * Adds a `fuente` column ("real" | "interpolado") for full transparency, then
 * writes `calles_de_medellin_aumentado.csv` — which the graph loader prefers.
 *
 * Run (Node ≥22 with native TS):  npm run augment
 * No new dependencies required.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { GridIndex, idw, type IDWPoint } from "../lib/geo/idw.ts";

const DATA_DIR = join(process.cwd(), "data");
const SRC = join(DATA_DIR, "calles_de_medellin_con_acoso.csv");
const OUT = join(DATA_DIR, "calles_de_medellin_aumentado.csv");

const K = 8;          // neighbours per estimate
const RISK_COL = 5;   // 0-based: name;origin;destination;length;oneway;harassmentRisk;geometry

/** Parse a "(lon, lat)" token into [lat, lon]. */
function parseCoord(s: string): [number, number] | null {
  const parts = s.trim().replace(/^\(/, "").replace(/\)$/, "").split(",");
  if (parts.length !== 2) return null;
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return [lat, lon];
}

function midpoint(originRaw: string, destRaw: string): [number, number] | null {
  const o = parseCoord(originRaw);
  const d = parseCoord(destRaw);
  if (!o || !d) return null;
  return [(o[0] + d[0]) / 2, (o[1] + d[1]) / 2];
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function main(): void {
  console.info(`[augment] Leyendo ${SRC}`);
  const text = readFileSync(SRC, "utf-8");
  const lines = text.split(/\r?\n/);
  const header = lines[0];

  type Row = { cols: string[]; mid: [number, number] | null; hasRisk: boolean };
  const rows: Row[] = [];
  const index = new GridIndex(0.004); // ~445 m cells

  let realCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(";");
    if (cols.length <= RISK_COL) continue;

    const mid = midpoint(cols[1], cols[2]);
    const raw = cols[RISK_COL];
    const val = raw === undefined || raw === "" ? NaN : Number(raw);
    const hasRisk = !Number.isNaN(val);

    if (hasRisk && mid) {
      index.add({ lat: mid[0], lon: mid[1], value: val });
      realCount++;
    }
    rows.push({ cols, mid, hasRisk });
  }

  console.info(`[augment] Filas=${rows.length} · medidas=${realCount} · a interpolar=${rows.length - realCount}`);

  // Interpolate the missing ones.
  const out: string[] = [`${header};fuente`];
  let interpCount = 0;
  let sin = 0;
  let sum = 0;
  let mn = Infinity;
  let mx = -Infinity;

  for (const row of rows) {
    if (row.hasRisk) {
      out.push(`${row.cols.join(";")};real`);
      continue;
    }
    let fuente = "interpolado";
    if (row.mid) {
      const neighbors: IDWPoint[] = index.nearest(row.mid[0], row.mid[1], K);
      const est = idw(row.mid[0], row.mid[1], neighbors);
      if (!Number.isNaN(est)) {
        const v = clamp01(est);
        row.cols[RISK_COL] = v.toFixed(6);
        interpCount++;
        sum += v;
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      } else {
        fuente = "sin_dato";
        sin++;
      }
    } else {
      fuente = "sin_dato";
      sin++;
    }
    out.push(`${row.cols.join(";")};${fuente}`);
  }

  writeFileSync(OUT, out.join("\n"), "utf-8");

  const mean = interpCount > 0 ? sum / interpCount : 0;
  console.info(`[augment] Interpolados=${interpCount} (sin vecinos=${sin})`);
  console.info(`[augment] Riesgo interpolado → min=${mn.toFixed(3)} media=${mean.toFixed(3)} max=${mx.toFixed(3)}`);
  console.info(`[augment] Escrito ${OUT} (${out.length - 1} filas + header)`);
}

main();
