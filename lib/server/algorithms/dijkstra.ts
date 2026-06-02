import type { Grafo } from "@/lib/server/graph/models";

import {
  EventoExploracion,
  ResultadoRuta,
  noEncontrada,
  reconstruir,
} from "./base";
import { MinHeap } from "./minheap";

type HeapItem = { g: number; counter: number; nodo: string };

const less = (a: HeapItem, b: HeapItem): boolean =>
  a.g < b.g || (a.g === b.g && a.counter < b.counter);

/** Classic Dijkstra — A* with h=0. Used as the oracle and inside Yen's. */
export function dijkstra(
  grafo: Grafo,
  origen: string,
  destino: string,
  alpha: number,
  beta: number,
  capturarEventos = false,
): ResultadoRuta {
  const inicio = performance.now();

  if (!grafo.existeNodo(origen) || !grafo.existeNodo(destino)) {
    return noEncontrada("Dijkstra", inicio);
  }

  const openHeap = new MinHeap<HeapItem>(less);
  let counter = 0;
  openHeap.push({ g: 0.0, counter, nodo: origen });
  const gScore = new Map<string, number>([[origen, 0.0]]);
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();
  let nodosExplorados = 0;
  const eventos: EventoExploracion[] = [];

  while (openHeap.size > 0) {
    const { g: gActual, nodo: actual } = openHeap.pop()!;
    if (closed.has(actual)) continue;
    closed.add(actual);
    nodosExplorados++;

    if (capturarEventos) {
      const [lat, lon] = grafo.coordenadas.get(actual)!;
      eventos.push({
        tipo: "visit",
        nodo: actual,
        lat,
        lon,
        f: Math.round(gActual * 100) / 100,
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
        "Dijkstra",
        eventos,
      );
    }

    for (const arista of grafo.vecinos(actual)) {
      if (closed.has(arista.destino)) continue;
      const tentativeG = gScore.get(actual)! + arista.costo(alpha, beta);
      if (tentativeG < (gScore.get(arista.destino) ?? Infinity)) {
        cameFrom.set(arista.destino, actual);
        gScore.set(arista.destino, tentativeG);
        counter++;
        openHeap.push({ g: tentativeG, counter, nodo: arista.destino });
      }
    }
  }

  return noEncontrada("Dijkstra", inicio, nodosExplorados, eventos);
}
