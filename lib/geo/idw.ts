/**
 * Inverse Distance Weighting (IDW) — spatial interpolation (§6.10).
 *
 * Used to estimate `harassmentRisk` for street segments that have NO measured
 * value, from the k nearest *measured* segments. This is a standard GIS
 * technique: defensible, transparent (we mark what's estimated), and far better
 * than imputing a single global mean — it respects local spatial structure.
 *
 * Self-contained (no imports) so it runs in the app, in tests, and in build
 * scripts via Node's native TypeScript support.
 */

const EARTH_R = 6371000; // m
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface IDWPoint {
  lat: number;
  lon: number;
  value: number;
}

/**
 * IDW estimate at (lat,lon) from a pre-selected set of neighbours.
 * `power=2` is the GIS default (nearer points dominate). An exact coincidence
 * returns that neighbour's value directly (avoids divide-by-zero).
 */
export function idw(lat: number, lon: number, neighbors: IDWPoint[], power = 2): number {
  if (neighbors.length === 0) return NaN;
  let num = 0;
  let den = 0;
  for (const n of neighbors) {
    const d = haversineM(lat, lon, n.lat, n.lon);
    if (d < 1e-6) return n.value;
    const w = 1 / Math.pow(d, power);
    num += w * n.value;
    den += w;
  }
  return num / den;
}

/**
 * Uniform-grid spatial index for fast (approximate) k-nearest-neighbour queries.
 * Points are bucketed into ~`cellDeg` cells; queries search outward in square
 * rings until ≥k candidates are found, then two extra rings for correctness
 * (a closer point can sit just inside the next diagonal ring).
 */
export class GridIndex {
  private cells = new Map<string, IDWPoint[]>();
  private readonly cellDeg: number;

  constructor(cellDeg = 0.004) {
    this.cellDeg = cellDeg;
  }

  private cellOf(lat: number, lon: number): [number, number] {
    return [Math.floor(lat / this.cellDeg), Math.floor(lon / this.cellDeg)];
  }

  add(p: IDWPoint): void {
    const [ci, cj] = this.cellOf(p.lat, p.lon);
    const key = `${ci}:${cj}`;
    const arr = this.cells.get(key);
    if (arr) arr.push(p);
    else this.cells.set(key, [p]);
  }

  /** The k nearest indexed points to (lat,lon). */
  nearest(lat: number, lon: number, k: number): IDWPoint[] {
    const [ci, cj] = this.cellOf(lat, lon);
    const found: IDWPoint[] = [];
    let ring = 0;
    let enoughAt = -1;

    while (true) {
      for (let di = -ring; di <= ring; di++) {
        for (let dj = -ring; dj <= ring; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue; // ring only
          const arr = this.cells.get(`${ci + di}:${cj + dj}`);
          if (arr) for (const p of arr) found.push(p);
        }
      }
      if (enoughAt < 0 && found.length >= k) enoughAt = ring;
      if (enoughAt >= 0 && ring >= enoughAt + 2) break;
      ring++;
      if (ring > 500) break; // safety: nothing nearby
    }

    return found
      .map((p) => ({ p, d: haversineM(lat, lon, p.lat, p.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k)
      .map((x) => x.p);
  }
}
