import type { Grafo } from "@/lib/server/graph/models";
import { getState } from "@/lib/server/state";

export interface RouteRequestBody {
  origen?: { lat: number; lon: number };
  destino?: { lat: number; lon: number };
  alpha?: number;
  beta?: number;
  gamma?: number;
  algoritmo?: "astar" | "dijkstra" | "yens" | "greedy";
}

export interface NormalizedRequest {
  origen: { lat: number; lon: number };
  destino: { lat: number; lon: number };
  alpha: number;
  beta: number;
  gamma: number;
  algoritmo: "astar" | "dijkstra" | "yens" | "greedy";
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Validate + normalize an incoming route request (mirrors the Pydantic schema). */
export function normalizeRequest(body: RouteRequestBody): NormalizedRequest | null {
  const { origen, destino } = body;
  if (
    !origen ||
    !destino ||
    typeof origen.lat !== "number" ||
    typeof origen.lon !== "number" ||
    typeof destino.lat !== "number" ||
    typeof destino.lon !== "number"
  ) {
    return null;
  }
  const algoritmo = (body.algoritmo ?? "astar") as NormalizedRequest["algoritmo"];
  return {
    origen,
    destino,
    alpha: clamp(typeof body.alpha === "number" ? body.alpha : 1.0, 0, 100),
    beta: clamp(typeof body.beta === "number" ? body.beta : 100.0, 0, 5000),
    gamma: clamp(typeof body.gamma === "number" ? body.gamma : 0, 0, 20000),
    algoritmo: ["astar", "dijkstra", "yens", "greedy"].includes(algoritmo)
      ? algoritmo
      : "astar",
  };
}

export interface ResolvedGraph {
  grafo: Grafo;
  origenNodo: string;
  destinoNodo: string;
}

/** Snap origin/destination to their nearest nodes in the main component. */
export function resolveEndpoints(req: NormalizedRequest): ResolvedGraph {
  const { grafo } = getState();
  const origenNodo = grafo.nodoMasCercano(req.origen.lat, req.origen.lon);
  const destinoNodo = grafo.nodoMasCercano(req.destino.lat, req.destino.lon);
  return { grafo, origenNodo, destinoNodo };
}
