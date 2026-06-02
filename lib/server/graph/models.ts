import { haversineM } from "./haversine";

/** Ordered (lat, lon) pair. */
export type Coord = [number, number];

/**
 * A directed street segment. `risk` is dimensionless (0–1) and may be mutated in
 * memory by the community-report overlay. Node ids are `"lat,lon"` strings.
 */
export class Arista {
  constructor(
    public destino: string,
    public length: number, // meters
    public risk: number, // 0.0 – 1.0
    public name: string = "",
  ) {}

  /** Combined cost: alpha * distance + beta * risk * distance. */
  costo(alpha: number, beta: number): number {
    return alpha * this.length + beta * this.risk * this.length;
  }
}

/**
 * Adjacency-list graph of Medellín's pedestrian network.
 * `componentePrincipal` is the largest strongly-connected component; snapping
 * both endpoints into it guarantees a *directed* path exists between them.
 */
export class Grafo {
  adjacencia: Map<string, Arista[]> = new Map();
  coordenadas: Map<string, Coord> = new Map();
  componentePrincipal: Set<string> = new Set();

  vecinos(nodo: string): Arista[] {
    return this.adjacencia.get(nodo) ?? [];
  }

  existeNodo(nodo: string): boolean {
    return this.coordenadas.has(nodo);
  }

  totalNodos(): number {
    return this.coordenadas.size;
  }

  totalAristas(): number {
    let total = 0;
    for (const aristas of this.adjacencia.values()) total += aristas.length;
    return total;
  }

  /**
   * Closest node to the coordinates, restricted to the main connected component
   * so any two snapped endpoints are reachable from each other.
   */
  nodoMasCercano(lat: number, lon: number): string {
    const candidatos =
      this.componentePrincipal.size > 0
        ? this.componentePrincipal
        : this.coordenadas.keys();
    let bestNid = "";
    let bestDist = Infinity;
    for (const nid of candidatos) {
      const c = this.coordenadas.get(nid);
      if (!c) continue;
      const d = haversineM(lat, lon, c[0], c[1]);
      if (d < bestDist) {
        bestDist = d;
        bestNid = nid;
      }
    }
    return bestNid;
  }

  /**
   * Shallow clone for Yen's: shares node coords and Arista instances but copies
   * the adjacency arrays so they can be mutated without touching the original.
   */
  clonarParaSimulacion(): Grafo {
    const nuevo = new Grafo();
    nuevo.coordenadas = this.coordenadas; // shared, read-only during simulation
    nuevo.adjacencia = new Map();
    for (const [k, v] of this.adjacencia) nuevo.adjacencia.set(k, [...v]);
    return nuevo;
  }
}
