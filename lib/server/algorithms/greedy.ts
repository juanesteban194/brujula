import { haversineM } from "@/lib/server/graph/haversine";
import type { Grafo } from "@/lib/server/graph/models";

import {
  EventoExploracion,
  ResultadoRuta,
  metricas,
  noEncontrada,
} from "./base";

/**
 * Greedy best-first: always steps to the neighbor closest (straight-line) to the
 * destination. Not optimal but very fast — kept as the baseline comparison.
 */
export function greedy(
  grafo: Grafo,
  origen: string,
  destino: string,
  alpha: number,
  beta: number,
  capturarEventos = false,
): ResultadoRuta {
  const inicio = performance.now();

  if (!grafo.existeNodo(origen) || !grafo.existeNodo(destino)) {
    return noEncontrada("Greedy", inicio);
  }

  const [latD, lonD] = grafo.coordenadas.get(destino)!;
  const h = (nodo: string): number => {
    const [lat, lon] = grafo.coordenadas.get(nodo)!;
    return haversineM(lat, lon, latD, lonD);
  };

  const visitados = new Set<string>();
  let actual = origen;
  const ruta: string[] = [origen];
  let costo = 0.0;
  let nodosExplorados = 0;
  const eventos: EventoExploracion[] = [];

  while (actual !== destino) {
    visitados.add(actual);
    nodosExplorados++;

    if (capturarEventos) {
      const [lat, lon] = grafo.coordenadas.get(actual)!;
      eventos.push({
        tipo: "visit",
        nodo: actual,
        lat,
        lon,
        f: Math.round(h(actual) * 100) / 100,
      });
    }

    const vecinos = grafo.vecinos(actual).filter((a) => !visitados.has(a.destino));
    if (vecinos.length === 0) {
      return noEncontrada("Greedy", inicio, nodosExplorados, eventos);
    }

    let mejor = vecinos[0];
    let mejorH = h(mejor.destino);
    for (let i = 1; i < vecinos.length; i++) {
      const hv = h(vecinos[i].destino);
      if (hv < mejorH) {
        mejor = vecinos[i];
        mejorH = hv;
      }
    }
    costo += mejor.costo(alpha, beta);
    actual = mejor.destino;
    ruta.push(actual);

    if (ruta.length > grafo.totalNodos() + 10) {
      return noEncontrada("Greedy", inicio, nodosExplorados, eventos);
    }
  }

  const coordenadas = ruta.map((n) => grafo.coordenadas.get(n)!);
  const [distancia, riesgoProm] = metricas(grafo, ruta);
  return {
    algoritmo: "Greedy",
    ruta,
    coordenadas,
    costoTotal: costo,
    distanciaTotalM: distancia,
    riesgoPromedio: riesgoProm,
    nodosExplorados,
    tiempoMs: performance.now() - inicio,
    encontrada: true,
    eventosExploracion: eventos,
  };
}
