import { haversineM } from "@/lib/server/graph/haversine";
import type { Grafo } from "@/lib/server/graph/models";

import {
  EventoExploracion,
  ResultadoRuta,
  noEncontrada,
  reconstruir,
} from "./base";
import { MinHeap } from "./minheap";

type HeapItem = { f: number; counter: number; nodo: string };

const less = (a: HeapItem, b: HeapItem): boolean =>
  a.f < b.f || (a.f === b.f && a.counter < b.counter);

/**
 * A* with an admissible heuristic: `alpha * haversine(n, destino)`.
 * The straight-line distance is always ≤ the real road distance and the risk
 * term is non-negative, so the heuristic never overestimates the true cost.
 */
export function astar(
  grafo: Grafo,
  origen: string,
  destino: string,
  alpha: number,
  beta: number,
  capturarEventos = false,
  gamma = 0,
  /** Edge keys "from|to" to penalize (forces alternative corridors, §5). */
  penalizadas?: Set<string>,
  /** Extra cost per metre on penalized edges. */
  penalMult = 0,
): ResultadoRuta {
  const inicio = performance.now();

  if (!grafo.existeNodo(origen) || !grafo.existeNodo(destino)) {
    return noEncontrada("A*", inicio);
  }

  const [latD, lonD] = grafo.coordenadas.get(destino)!;
  const h = (nodo: string): number => {
    const [lat, lon] = grafo.coordenadas.get(nodo)!;
    return alpha * haversineM(lat, lon, latD, lonD);
  };

  const openHeap = new MinHeap<HeapItem>(less);
  let counter = 0;
  openHeap.push({ f: h(origen), counter, nodo: origen });
  const gScore = new Map<string, number>([[origen, 0.0]]);
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();
  let nodosExplorados = 0;
  const eventos: EventoExploracion[] = [];

  while (openHeap.size > 0) {
    const { f: fActual, nodo: actual } = openHeap.pop()!;
    if (closed.has(actual)) continue;
    closed.add(actual);
    nodosExplorados++;

    // Emit the edge by which we reached `actual` (the shortest-path-tree edge),
    // so the frontier paints as streets expanding from the origin.
    if (capturarEventos && cameFrom.has(actual)) {
      const padre = cameFrom.get(actual)!;
      const a = grafo.coordenadas.get(padre)!;
      const b = grafo.coordenadas.get(actual)!;
      eventos.push({
        tipo: "edge",
        coords: [a, b],
        orden: nodosExplorados,
        g: Math.round((gScore.get(actual) ?? fActual) * 100) / 100,
      });
    }

    if (actual === destino) {
      return reconstruir(
        grafo,
        cameFrom,
        actual,
        gScore.get(actual)!,
        nodosExplorados,
        inicio,
        "A*",
        eventos,
      );
    }

    for (const arista of grafo.vecinos(actual)) {
      if (closed.has(arista.destino)) continue;
      const extra = penalizadas && penalMult > 0 && penalizadas.has(`${actual}|${arista.destino}`)
        ? penalMult * arista.length
        : 0;
      const tentativeG = gScore.get(actual)! + arista.costo(alpha, beta, gamma) + extra;
      if (tentativeG < (gScore.get(arista.destino) ?? Infinity)) {
        cameFrom.set(arista.destino, actual);
        gScore.set(arista.destino, tentativeG);
        counter++;
        openHeap.push({ f: tentativeG + h(arista.destino), counter, nodo: arista.destino });
      }
    }
  }

  return noEncontrada("A*", inicio, nodosExplorados, eventos);
}
