import { NextResponse } from "next/server";

import { astar } from "@/lib/server/algorithms/astar";
import type { ResultadoRuta } from "@/lib/server/algorithms/base";
import { CRITICAL_RISK } from "@/lib/server/graph/models";
import type { Grafo } from "@/lib/server/graph/models";
import { resultadoToResponse } from "@/lib/server/response";
import { normalizeRequest, resolveEndpoints } from "@/lib/server/route-helpers";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Edge keys "from|to" of a route's node sequence. */
function edgeSet(r: ResultadoRuta): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < r.ruta.length - 1; i++) s.add(`${r.ruta[i]}|${r.ruta[i + 1]}`);
  return s;
}

/** Fraction of `r`'s edges also present in `other` (0..1). */
function overlap(r: ResultadoRuta, other: Set<string>): number {
  if (r.ruta.length < 2) return 0;
  let shared = 0;
  for (let i = 0; i < r.ruta.length - 1; i++) if (other.has(`${r.ruta[i]}|${r.ruta[i + 1]}`)) shared++;
  return shared / (r.ruta.length - 1);
}

/** Count dangerous segments crossed: risk ≥ critical OR community-reported. */
function peligrosas(grafo: Grafo, r: ResultadoRuta): number {
  let n = 0;
  for (let i = 0; i < r.ruta.length - 1; i++) {
    const arista = grafo.vecinos(r.ruta[i]).find((a) => a.destino === r.ruta[i + 1]);
    if (arista && (arista.reportado || arista.risk >= CRITICAL_RISK)) n++;
  }
  return n;
}

/**
 * Three genuinely distinct routes (§5):
 *  - Rápido  = pure distance (ignores risk).
 *  - Seguro  = risk-weighted + hard-avoid critical/reported streets (γ high).
 *  - Balance = moderate, FORCED to diverge by penalizing the edges already used
 *    by Rápido and Seguro (overlap-penalty diversity).
 * Labelled by real metrics (shortest = rápida, lowest risk = segura) and deduped.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const req = normalizeRequest(body);
  if (!req) return NextResponse.json({ detail: "origen/destino inválidos" }, { status: 422 });

  const { grafo, origenNodo, destinoNodo } = resolveEndpoints(req);
  if (!origenNodo || !destinoNodo) {
    return NextResponse.json({ detail: "No se pudo resolver origen o destino" }, { status: 400 });
  }

  const A = (beta: number, gamma: number, pen?: Set<string>, mult = 0) =>
    astar(grafo, origenNodo, destinoNodo, 1, beta, false, gamma, pen, mult);

  const rapido = A(0, 0);                  // distancia pura
  let seguro = A(1000, 9000);              // riesgo + evita críticas/reportes
  const edgesR = edgeSet(rapido);
  // Si la segura quedó casi igual a la rápida, forzarla a separarse.
  if (overlap(seguro, edgesR) > 0.85) seguro = A(1000, 9000, edgesR, 3);

  const edgesS = edgeSet(seguro);
  const usadas = new Set([...edgesR, ...edgesS]);
  let balance = A(400, 1500);
  // Balance casi siempre converge → forzar un tercer corredor distinto.
  if (overlap(balance, edgesR) > 0.7 || overlap(balance, edgesS) > 0.7) {
    balance = A(400, 1500, usadas, 2.5);
  }

  const crudas = [rapido, balance, seguro].filter((r) => r.encontrada);
  if (crudas.length === 0) {
    return NextResponse.json({ detail: "No se encontraron rutas" }, { status: 404 });
  }

  // Dedupe rutas idénticas.
  const uniq: ResultadoRuta[] = [];
  const seen = new Set<string>();
  for (const r of crudas) {
    const key = r.ruta.join(">");
    if (!seen.has(key)) { seen.add(key); uniq.push(r); }
  }

  // Etiquetar por métricas reales: más corta = Rápida; MENOS tramos peligrosos
  // = Segura (mejor proxy de "evita zonas peligrosas" que el riesgo promedio,
  // que una ruta más larga puede subir aunque esquive lo crítico).
  const peli = uniq.map((r) => peligrosas(grafo, r));
  let iRapida = 0, iSegura = 0;
  uniq.forEach((r, i) => {
    if (r.distanciaTotalM < uniq[iRapida].distanciaTotalM) iRapida = i;
    if (peli[i] < peli[iSegura] || (peli[i] === peli[iSegura] && r.riesgoPromedio < uniq[iSegura].riesgoPromedio)) iSegura = i;
  });
  if (iSegura === iRapida && uniq.length > 1) iSegura = iRapida === 0 ? uniq.length - 1 : 0;

  const etiquetas = uniq.map((_, i) =>
    i === iRapida ? "rapida" : i === iSegura ? "segura" : "balanceada",
  );
  const rutas = uniq.map((r, i) => ({
    ...resultadoToResponse(r, origenNodo, destinoNodo),
    aristas_peligrosas: peli[i],
    solapamiento_rapida: i === iRapida ? 0 : Math.round(overlap(r, edgeSet(uniq[iRapida])) * 100) / 100,
  }));

  getState().contadorRutas += rutas.length;
  return NextResponse.json({ rutas, etiquetas });
}
