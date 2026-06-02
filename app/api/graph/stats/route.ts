import { NextResponse } from "next/server";

import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { grafo, contadorRutas } = getState();

  let sum = 0;
  let count = 0;
  let altoRiesgo = 0;
  for (const aristas of grafo.adjacencia.values()) {
    for (const a of aristas) {
      sum += a.risk;
      count++;
      if (a.risk > 0.5) altoRiesgo++;
    }
  }
  const riesgoPromedio = count > 0 ? sum / count : 0.0;

  return NextResponse.json({
    total_nodos: grafo.totalNodos(),
    total_aristas: grafo.totalAristas(),
    riesgo_promedio_global: Math.round(riesgoPromedio * 1e4) / 1e4,
    segmentos_alto_riesgo: altoRiesgo,
    rutas_calculadas: contadorRutas,
  });
}
