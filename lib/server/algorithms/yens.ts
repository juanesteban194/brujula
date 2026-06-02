import type { Grafo } from "@/lib/server/graph/models";

import { ResultadoRuta, metricas } from "./base";
import { dijkstra } from "./dijkstra";
import { MinHeap } from "./minheap";

/** Build a ResultadoRuta by walking the given path through the graph. */
function rutaAResultado(
  grafo: Grafo,
  ruta: string[],
  alpha: number,
  beta: number,
  algoritmo: string,
): ResultadoRuta {
  let costo = 0.0;
  for (let i = 0; i < ruta.length - 1; i++) {
    for (const arista of grafo.vecinos(ruta[i])) {
      if (arista.destino === ruta[i + 1]) {
        costo += arista.costo(alpha, beta);
        break;
      }
    }
  }
  const coordenadas = ruta.map((n) => grafo.coordenadas.get(n)!);
  const [distancia, riesgoProm] = metricas(grafo, ruta);
  return {
    algoritmo,
    ruta,
    coordenadas,
    costoTotal: costo,
    distanciaTotalM: distancia,
    riesgoPromedio: riesgoProm,
    nodosExplorados: 0,
    tiempoMs: 0.0,
    encontrada: true,
    eventosExploracion: [],
  };
}

type Candidate = { costo: number; tiebreak: number; path: string[] };

const less = (a: Candidate, b: Candidate): boolean =>
  a.costo < b.costo || (a.costo === b.costo && a.tiebreak < b.tiebreak);

const samePath = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Yen's K-Shortest Paths. Returns up to K distinct shortest paths ordered by
 * cost. Every spur search runs on a *clone* of the graph, so the original is
 * never modified (covered by tests for invariance).
 */
export function yensKShortest(
  grafo: Grafo,
  origen: string,
  destino: string,
  alpha: number,
  beta: number,
  K = 3,
): ResultadoRuta[] {
  const tStart = performance.now();

  const primera = dijkstra(grafo, origen, destino, alpha, beta);
  if (!primera.encontrada) return [];

  const A: ResultadoRuta[] = [primera];
  const B = new MinHeap<Candidate>(less);
  let tiebreak = 0;

  for (let k = 1; k < K; k++) {
    const prevPath = A[k - 1].ruta;

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);

      // Work on a clone so the original graph is untouched
      const gClone = grafo.clonarParaSimulacion();

      // Remove edges used by already-found paths that share this root
      for (const pathR of A) {
        if (pathR.ruta.length > i && samePath(pathR.ruta.slice(0, i + 1), rootPath)) {
          const src = pathR.ruta[i];
          const dst = pathR.ruta[i + 1];
          const originalList = gClone.adjacencia.get(src) ?? [];
          const newList = originalList.filter((a) => a.destino !== dst);
          if (newList.length < originalList.length) {
            gClone.adjacencia.set(src, newList);
          }
        }
      }

      // Remove root-path nodes (except spur_node) so we don't loop back
      for (const n of rootPath.slice(0, -1)) {
        if (gClone.adjacencia.has(n)) gClone.adjacencia.set(n, []);
      }

      const spur = dijkstra(gClone, spurNode, destino, alpha, beta);

      if (spur.encontrada) {
        const rutaCandidata = [...rootPath.slice(0, -1), ...spur.ruta];
        const dupInA = A.some((p) => samePath(p.ruta, rutaCandidata));
        if (!dupInA) {
          // MinHeap is opaque; rebuild candidate cost from a clean walk
          const candidato = rutaAResultado(grafo, rutaCandidata, alpha, beta, "Yen's");
          tiebreak++;
          B.push({ costo: candidato.costoTotal, tiebreak, path: rutaCandidata });
        }
      }
    }

    if (B.size === 0) break;

    // Pop the cheapest candidate that isn't already in A
    let best: Candidate | undefined;
    while (B.size > 0) {
      const cand = B.pop()!;
      if (!A.some((p) => samePath(p.ruta, cand.path))) {
        best = cand;
        break;
      }
    }
    if (!best) break;

    const bestResult = rutaAResultado(grafo, best.path, alpha, beta, "Yen's");
    A.push(bestResult);
  }

  // Stamp final timing on all results
  const elapsed = performance.now() - tStart;
  for (const r of A) r.tiempoMs = elapsed;

  return A;
}
