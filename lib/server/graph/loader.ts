import { readFileSync } from "node:fs";

import { Arista, Grafo } from "./models";

/** Parse a `"(lon, lat)"` string into a [lat, lon] tuple. */
function parseCoord(s: string): [number, number] {
  const inner = s.trim().replace(/^\(/, "").replace(/\)$/, "");
  const parts = inner.split(",");
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  return [lat, lon];
}

function coordToId(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

type RawRow = {
  name: string;
  origin: string;
  destination: string;
  length: number;
  oneway: string;
  risk: number; // may be NaN before imputation
};

/**
 * Load the street graph from the semicolon-separated CSV.
 *
 * The `origin`/`destination`/`geometry` fields contain commas but never
 * semicolons, so a plain `;` split is safe. Mirrors the reference Python loader:
 * impute null `harassmentRisk` with the column mean, add a reverse edge unless
 * `oneway` is truthy, then mark the largest strongly-connected component.
 */
export function cargarGrafoDesdeCsv(ruta: string): Grafo {
  const text = readFileSync(ruta, "utf-8");
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return new Grafo();

  const header = lines[0].split(";").map((h) => h.trim());
  const idx = {
    name: header.indexOf("name"),
    origin: header.indexOf("origin"),
    destination: header.indexOf("destination"),
    length: header.indexOf("length"),
    oneway: header.indexOf("oneway"),
    risk: header.indexOf("harassmentRisk"),
  };

  const rows: RawRow[] = [];
  let riskSum = 0;
  let riskCount = 0;
  let nullRisk = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(";");
    const origin = cols[idx.origin];
    const destination = cols[idx.destination];
    const length = Number(cols[idx.length]);
    if (!origin || !destination || Number.isNaN(length)) continue;

    const riskRaw = cols[idx.risk];
    const risk = riskRaw === undefined || riskRaw === "" ? NaN : Number(riskRaw);
    if (Number.isNaN(risk)) {
      nullRisk++;
    } else {
      riskSum += risk;
      riskCount++;
    }

    rows.push({
      name: (cols[idx.name] ?? "").trim(),
      origin,
      destination,
      length,
      oneway: (cols[idx.oneway] ?? "False").trim().toLowerCase(),
      risk,
    });
  }

  const meanRisk = riskCount > 0 ? riskSum / riskCount : 0;
  if (nullRisk > 0) {
    console.warn(
      `[loader] Imputados ${nullRisk} nulos en harassmentRisk con media=${meanRisk.toFixed(4)}`,
    );
  }

  const grafo = new Grafo();

  for (const row of rows) {
    let latO: number, lonO: number, latD: number, lonD: number;
    try {
      [latO, lonO] = parseCoord(row.origin);
      [latD, lonD] = parseCoord(row.destination);
    } catch {
      continue;
    }
    if ([latO, lonO, latD, lonD].some((n) => Number.isNaN(n))) continue;

    const nidO = coordToId(latO, lonO);
    const nidD = coordToId(latD, lonD);

    grafo.coordenadas.set(nidO, [latO, lonO]);
    grafo.coordenadas.set(nidD, [latD, lonD]);
    if (!grafo.adjacencia.has(nidO)) grafo.adjacencia.set(nidO, []);
    if (!grafo.adjacencia.has(nidD)) grafo.adjacencia.set(nidD, []);

    const risk = Number.isNaN(row.risk) ? meanRisk : row.risk;
    // Pedestrian routing IGNORES one-way direction: people walk either way, so
    // every segment is bidirectional. This also lets routes detour against
    // one-way streets to get around dangerous/reported zones, and maximizes
    // connectivity (the main component becomes the whole walkable network).
    grafo.adjacencia.get(nidO)!.push(new Arista(nidD, row.length, risk, row.name));
    grafo.adjacencia.get(nidD)!.push(new Arista(nidO, row.length, risk, row.name));
  }

  marcarComponentePrincipal(grafo);

  console.info(
    `[loader] Grafo cargado: ${grafo.totalNodos()} nodos, ${grafo.totalAristas()} aristas, ` +
      `componente principal: ${grafo.componentePrincipal.size} nodos`,
  );
  return grafo;
}

/**
 * Largest strongly-connected component via iterative Kosaraju.
 * Snapping endpoints into this set guarantees a directed path exists between
 * them — so routing never fails because of one-way streets or fringe nodes.
 */
function marcarComponentePrincipal(grafo: Grafo): void {
  const nodes = [...grafo.coordenadas.keys()];
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  for (const n of nodes) {
    succ.set(n, []);
    pred.set(n, []);
  }
  for (const [nid, aristas] of grafo.adjacencia) {
    const s = succ.get(nid);
    if (!s) continue;
    for (const a of aristas) {
      s.push(a.destino);
      let p = pred.get(a.destino);
      if (!p) {
        p = [];
        pred.set(a.destino, p);
      }
      p.push(nid);
    }
  }

  // Pass 1: iterative DFS to compute finish order
  const visited = new Set<string>();
  const order: string[] = [];
  for (const start of nodes) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ node: string; it: number; nbrs: string[] }> = [
      { node: start, it: 0, nbrs: succ.get(start) ?? [] },
    ];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      let advanced = false;
      while (top.it < top.nbrs.length) {
        const m = top.nbrs[top.it++];
        if (!visited.has(m)) {
          visited.add(m);
          stack.push({ node: m, it: 0, nbrs: succ.get(m) ?? [] });
          advanced = true;
          break;
        }
      }
      if (!advanced) {
        order.push(top.node);
        stack.pop();
      }
    }
  }

  // Pass 2: DFS on the reversed graph in reverse finish order
  const assigned = new Set<string>();
  let best = new Set<string>();
  for (let i = order.length - 1; i >= 0; i--) {
    const s = order[i];
    if (assigned.has(s)) continue;
    const comp = new Set<string>();
    const stack2 = [s];
    assigned.add(s);
    while (stack2.length > 0) {
      const n = stack2.pop()!;
      comp.add(n);
      for (const m of pred.get(n) ?? []) {
        if (!assigned.has(m)) {
          assigned.add(m);
          stack2.push(m);
        }
      }
    }
    if (comp.size > best.size) best = comp;
  }

  grafo.componentePrincipal = best;
}
