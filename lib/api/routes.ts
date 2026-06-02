import { apiGet, apiPost } from "./client";

export interface Coordenada { lat: number; lon: number; }

export interface RouteRequest {
  origen: Coordenada;
  destino: Coordenada;
  alpha?: number;
  beta?: number;
  algoritmo?: "astar" | "dijkstra" | "yens" | "greedy";
}

export interface RouteResponse {
  algoritmo: string;
  encontrada: boolean;
  coordenadas: [number, number][];
  costo_total: number;
  distancia_total_m: number;
  riesgo_promedio: number;
  duracion_estimada_min: number;
  nodos_explorados: number;
  tiempo_ms: number;
  origen_nodo: string;
  destino_nodo: string;
}

export interface AlternativesResponse {
  rutas: RouteResponse[];
  etiquetas: ("rapida" | "segura" | "balanceada")[];
}

export interface GraphStats {
  total_nodos: number;
  total_aristas: number;
  riesgo_promedio_global: number;
  segmentos_alto_riesgo: number;
  rutas_calculadas: number;
}

export const calcularRuta = (req: RouteRequest) =>
  apiPost<RouteResponse>("/api/route", req);

export const calcularAlternativas = (req: RouteRequest) =>
  apiPost<AlternativesResponse>("/api/route/alternatives", req);

export const compararAlgoritmos = (
  origenLat: number, origenLon: number,
  destinoLat: number, destinoLon: number,
  alpha = 1.0, beta = 100.0
) =>
  apiGet<RouteResponse[]>(
    `/api/route/compare?origen_lat=${origenLat}&origen_lon=${origenLon}&destino_lat=${destinoLat}&destino_lon=${destinoLon}&alpha=${alpha}&beta=${beta}`
  );

export const getRiskGeoJSON = () =>
  apiGet<{ type: string; features: unknown[] }>("/api/graph/risk-geojson");

export const getGraphStats = () => apiGet<GraphStats>("/api/graph/stats");
