import type { Coord, Grafo } from "@/lib/server/graph/models";

export interface EventoExploracion {
  tipo: "visit";
  nodo: string;
  lat: number;
  lon: number;
  f: number;
}

/** Normalized result returned by every pathfinding algorithm. */
export interface ResultadoRuta {
  algoritmo: string;
  ruta: string[];
  coordenadas: Coord[]; // ordered (lat, lon)
  costoTotal: number;
  distanciaTotalM: number;
  riesgoPromedio: number;
  nodosExplorados: number;
  tiempoMs: number;
  encontrada: boolean;
  eventosExploracion: EventoExploracion[];
}

/** Returns [total_distance_m, weighted_avg_risk] by walking the path. */
export function metricas(grafo: Grafo, ruta: string[]): [number, number] {
  let distancia = 0.0;
  let riesgoPonderado = 0.0;
  for (let i = 0; i < ruta.length - 1; i++) {
    for (const arista of grafo.vecinos(ruta[i])) {
      if (arista.destino === ruta[i + 1]) {
        distancia += arista.length;
        riesgoPonderado += arista.risk * arista.length;
        break;
      }
    }
  }
  const riesgoProm = distancia > 0 ? riesgoPonderado / distancia : 0.0;
  return [distancia, riesgoProm];
}

export function noEncontrada(
  algo: string,
  inicio: number,
  nodosExplorados = 0,
  eventos: EventoExploracion[] = [],
): ResultadoRuta {
  return {
    algoritmo: algo,
    ruta: [],
    coordenadas: [],
    costoTotal: Infinity,
    distanciaTotalM: 0.0,
    riesgoPromedio: 0.0,
    nodosExplorados,
    tiempoMs: performance.now() - inicio,
    encontrada: false,
    eventosExploracion: eventos,
  };
}

export function reconstruir(
  grafo: Grafo,
  cameFrom: Map<string, string>,
  fin: string,
  costo: number,
  nodosExplorados: number,
  inicio: number,
  algo: string,
  eventos: EventoExploracion[],
): ResultadoRuta {
  const ruta: string[] = [fin];
  let cursor = fin;
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor)!;
    ruta.push(cursor);
  }
  ruta.reverse();
  const coordenadas = ruta.map((n) => grafo.coordenadas.get(n)!);
  const [distancia, riesgoProm] = metricas(grafo, ruta);
  return {
    algoritmo: algo,
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
