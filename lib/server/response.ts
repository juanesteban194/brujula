import type { ResultadoRuta } from "@/lib/server/algorithms/base";

const WALK_SPEED_MPS = 5000 / 3600; // 5 km/h in m/s

/** Wire shape returned to the client (snake_case to match the existing UI types). */
export interface RouteResponse {
  algoritmo: string;
  encontrada: boolean;
  coordenadas: [number, number][]; // (lat, lon)
  costo_total: number;
  distancia_total_m: number;
  riesgo_promedio: number;
  duracion_estimada_min: number;
  nodos_explorados: number;
  tiempo_ms: number;
  origen_nodo: string;
  destino_nodo: string;
  /** # of dangerous segments crossed (risk ≥ 0.95 or reported). For the cards. */
  aristas_peligrosas?: number;
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const r2 = (n: number) => Math.round(n * 1e2) / 1e2;
const r3 = (n: number) => Math.round(n * 1e3) / 1e3;

export function resultadoToResponse(
  r: ResultadoRuta,
  origenNodo = "",
  destinoNodo = "",
): RouteResponse {
  const duracion =
    r.distanciaTotalM > 0 ? r.distanciaTotalM / WALK_SPEED_MPS / 60 : 0.0;
  return {
    algoritmo: r.algoritmo,
    encontrada: r.encontrada,
    coordenadas: r.coordenadas as [number, number][],
    costo_total: Number.isFinite(r.costoTotal) ? r4(r.costoTotal) : 0,
    distancia_total_m: r2(r.distanciaTotalM),
    riesgo_promedio: r4(r.riesgoPromedio),
    duracion_estimada_min: r2(duracion),
    nodos_explorados: r.nodosExplorados,
    tiempo_ms: r3(r.tiempoMs),
    origen_nodo: origenNodo,
    destino_nodo: destinoNodo,
  };
}
