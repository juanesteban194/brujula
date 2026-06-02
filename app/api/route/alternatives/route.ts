import { NextResponse } from "next/server";

import { astar } from "@/lib/server/algorithms/astar";
import type { ResultadoRuta } from "@/lib/server/algorithms/base";
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

  // Three A* routes with different safety weights → genuinely distinct
  // rápida (ignora riesgo) · balanceada · segura (evita riesgo fuerte)
  const balancedBeta = Math.max(req.beta, 300.0);
  const safeBeta = Math.max(req.beta * 3.0, 1500.0);
  const raw: ResultadoRuta[] = [
    astar(grafo, origenNodo, destinoNodo, req.alpha, 0.0, false, req.gamma),
    astar(grafo, origenNodo, destinoNodo, req.alpha, balancedBeta, false, req.gamma),
    astar(grafo, origenNodo, destinoNodo, req.alpha, safeBeta, false, req.gamma),
  ];
  const encontradas = raw.filter((r) => r.encontrada);
  if (encontradas.length === 0) {
    return NextResponse.json({ detail: "No se encontraron rutas" }, { status: 404 });
  }

  // Dedupe identical paths
  const seen = new Set<string>();
  const uniq: ResultadoRuta[] = [];
  for (const r of encontradas) {
    const k = r.ruta.join("→");
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(r);
    }
  }

  getState().contadorRutas += uniq.length;

  // Classify: min distance → rápida, min risk → segura, resto → balanceada
  let rapida = uniq[0];
  let segura = uniq[0];
  for (const r of uniq) {
    if (r.distanciaTotalM < rapida.distanciaTotalM) rapida = r;
    if (r.riesgoPromedio < segura.riesgoPromedio) segura = r;
  }
  const etiquetas: string[] = uniq.map((r) => {
    if (r === rapida && r !== segura) return "rapida";
    if (r === segura && r !== rapida) return "segura";
    if (r === rapida) return "rapida";
    return "balanceada";
  });

  const rutas = uniq.map((r) => resultadoToResponse(r, origenNodo, destinoNodo));
  return NextResponse.json({ rutas, etiquetas });
}
