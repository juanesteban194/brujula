import { NextResponse } from "next/server";

import { astar } from "@/lib/server/algorithms/astar";
import { dijkstra } from "@/lib/server/algorithms/dijkstra";
import { greedy } from "@/lib/server/algorithms/greedy";
import { resultadoToResponse } from "@/lib/server/response";
import { normalizeRequest, resolveEndpoints } from "@/lib/server/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Compare A* vs Dijkstra vs Greedy side by side for the same params. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const num = (k: string, d: number) => {
    const v = Number(url.searchParams.get(k));
    return Number.isFinite(v) ? v : d;
  };

  const req = normalizeRequest({
    origen: { lat: num("origen_lat", NaN), lon: num("origen_lon", NaN) },
    destino: { lat: num("destino_lat", NaN), lon: num("destino_lon", NaN) },
    alpha: num("alpha", 1.0),
    beta: num("beta", 100.0),
  });
  if (!req) {
    return NextResponse.json({ detail: "Parámetros inválidos" }, { status: 422 });
  }

  const { grafo, origenNodo, destinoNodo } = resolveEndpoints(req);
  if (!origenNodo || !destinoNodo) {
    return NextResponse.json(
      { detail: "No se pudo resolver origen o destino" },
      { status: 400 },
    );
  }

  const resultados = ([astar, dijkstra, greedy] as const).map((fn) =>
    resultadoToResponse(
      fn(grafo, origenNodo, destinoNodo, req.alpha, req.beta),
      origenNodo,
      destinoNodo,
    ),
  );
  return NextResponse.json(resultados);
}
