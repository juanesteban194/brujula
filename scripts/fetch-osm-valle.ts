/**
 * fetch-osm-valle.ts — download the REAL street network of the Valle de Aburrá
 * from OpenStreetMap (Overpass) and write it in the same schema we already use
 * (`name;origin;destination;length;oneway;harassmentRisk;geometry`). Risk is left
 * empty here; augment-data.ts fills it from the real measured dataset via IDW.
 *
 * Tiled + per-tile cached so it is resumable, and built from ONE source so the
 * whole metro graph is connected. Run:  npm run fetch:osm
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { haversineM } from "../lib/geo/idw.ts";

const DATA = join(process.cwd(), "data");
const CACHE = join(DATA, ".osm-cache");
const OUT = join(DATA, "calles_valle_osm.csv");

// Urban corridor of the Valle de Aburrá (10 municipios), tiled to keep each
// Overpass request modest and the JSON parse memory-bounded.
const LAT_MIN = 5.98, LAT_MAX = 6.48, LAT_STEP = 0.10;
const LON_MIN = -75.70, LON_MAX = -75.48, LON_STEP = 0.11;

const HIGHWAY =
  "^(residential|living_street|unclassified|service|tertiary|secondary|primary|road|pedestrian|primary_link|secondary_link|tertiary_link)$";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "brujula/1.0 (pedestrian routing demo; contact: feria)";

type Geom = { lat: number; lon: number };
type Way = { type: string; tags?: Record<string, string>; geometry?: Geom[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const coordId = (lat: number, lon: number) => `${lat.toFixed(6)},${lon.toFixed(6)}`;

async function fetchTile(s: number, w: number, n: number, e: number, label: string): Promise<Way[]> {
  const cacheFile = join(CACHE, `${label}.json`);
  if (existsSync(cacheFile)) {
    const j = JSON.parse(readFileSync(cacheFile, "utf-8"));
    return (j.elements ?? []).filter((x: Way) => x.type === "way");
  }
  const query = `[out:json][timeout:150];way["highway"~"${HIGHWAY}"](${s},${w},${n},${e});out geom;`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(160000),
      });
      if (res.status === 429 || res.status === 504) throw new Error(`busy ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      writeFileSync(cacheFile, text, "utf-8");
      const j = JSON.parse(text);
      return (j.elements ?? []).filter((x: Way) => x.type === "way");
    } catch (err) {
      const wait = attempt * 5000;
      console.warn(`[osm] ${label} intento ${attempt} falló (${(err as Error).message}); reintento en ${wait / 1000}s`);
      await sleep(wait);
    }
  }
  console.error(`[osm] ${label} falló tras 4 intentos; se omite`);
  return [];
}

async function main(): Promise<void> {
  mkdirSync(CACHE, { recursive: true });

  // Deduped directed segments keyed by "originId|destId".
  const segs = new Map<string, { name: string; oLat: number; oLon: number; dLat: number; dLon: number; oneway: boolean }>();

  const tiles: Array<[number, number, number, number, string]> = [];
  for (let la = LAT_MIN; la < LAT_MAX - 1e-9; la += LAT_STEP) {
    for (let lo = LON_MIN; lo < LON_MAX - 1e-9; lo += LON_STEP) {
      const s = +la.toFixed(3), w = +lo.toFixed(3);
      const n = +Math.min(la + LAT_STEP, LAT_MAX).toFixed(3);
      const e = +Math.min(lo + LON_STEP, LON_MAX).toFixed(3);
      tiles.push([s, w, n, e, `t_${s}_${w}`]);
    }
  }
  console.info(`[osm] ${tiles.length} tiles a descargar`);

  let i = 0;
  for (const [s, w, n, e, label] of tiles) {
    i++;
    const ways = await fetchTile(s, w, n, e, label);
    let added = 0;
    for (const way of ways) {
      const g = way.geometry;
      if (!g || g.length < 2) continue;
      const oneway = (way.tags?.oneway ?? "") === "yes" || way.tags?.junction === "roundabout";
      const name = (way.tags?.name ?? "").replace(/[;\n\r]/g, " ").trim();
      for (let k = 0; k < g.length - 1; k++) {
        const a = g[k], b = g[k + 1];
        if (a.lat === b.lat && a.lon === b.lon) continue;
        const key = `${coordId(a.lat, a.lon)}|${coordId(b.lat, b.lon)}`;
        if (segs.has(key)) continue;
        segs.set(key, { name, oLat: a.lat, oLon: a.lon, dLat: b.lat, dLon: b.lon, oneway });
        added++;
      }
    }
    console.info(`[osm] (${i}/${tiles.length}) ${label}: ${ways.length} ways → +${added} segs (total ${segs.size})`);
    await sleep(1500);
  }

  const lines = ["name;origin;destination;length;oneway;harassmentRisk;geometry"];
  for (const v of segs.values()) {
    const length = haversineM(v.oLat, v.oLon, v.dLat, v.dLon);
    if (length < 0.5) continue;
    const origin = `(${v.oLon}, ${v.oLat})`;
    const destination = `(${v.dLon}, ${v.dLat})`;
    const geometry = `LINESTRING (${v.oLon} ${v.oLat}, ${v.dLon} ${v.dLat})`;
    lines.push(`${v.name};${origin};${destination};${length.toFixed(3)};${v.oneway ? "True" : "False"};;${geometry}`);
  }
  writeFileSync(OUT, lines.join("\n"), "utf-8");
  console.info(`[osm] Escrito ${OUT}: ${lines.length - 1} segmentos`);
}

main().catch((e) => { console.error(e); process.exit(1); });
