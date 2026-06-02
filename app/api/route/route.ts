import { NextResponse } from "next/server";

import { astar } from "@/lib/server/algorithms/astar";
import { dijkstra } from "@/lib/server/algorithms/dijkstra";
import { greedy } from "@/lib/server/algorithms/greedy";
import { yensKShortest } from "@/lib/server/algorithms/yens";
import { resultadoToResponse } from "@/lib/server/response";
import { normalizeRequest, resolveEndpoints } from "@/lib/server/route-helpers";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const req = normalizeRequest(body);
  if (!req) {
    return NextResponse.json({ detail: "origen/destino inválidos" }, { status: 422 });
  }

  const { grafo, origenNodo, destinoNodo } = resolveEndpoints(req);
  if (!origenNodo || !destinoNodo) {
    return NextResponse.json(
      { detail: "No se pudo resolver origen o destino" },
      { status: 400 },
    );
  }

  let resultado;
  if (req.algoritmo === "yens") {
    const resultados = yensKShortest(grafo, origenNodo, destinoNodo, req.alpha, req.beta, 1);
    resultado = resultados[0];
    if (!resultado) {
      return NextResponse.json({ detail: "Ruta no encontrada" }, { status: 404 });
    }
  } else {
    const fn = { astar, dijkstra, greedy }[req.algoritmo] ?? astar;
    resultado = fn(grafo, origenNodo, destinoNodo, req.alpha, req.beta, false, req.gamma);
  }

  getState().contadorRutas += 1;
  return NextResponse.json(resultadoToResponse(resultado, origenNodo, destinoNodo));
}
