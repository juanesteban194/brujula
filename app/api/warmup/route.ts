import { NextResponse } from "next/server";

import { getState, isWarm } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cold start parses the ~68k-row CSV; give the function room (§1, §11).
export const maxDuration = 30;

/**
 * Forces the in-memory graph singleton to build, so the first *real* routing
 * request is fast. Ping this ~1 min before the live demo to kill cold-start lag
 * (and optionally on a Vercel cron every few minutes to keep the instance warm).
 */
export async function GET() {
  const yaEstabaCaliente = isWarm();
  const inicio = performance.now();
  const { grafo, reportes } = getState();
  const tiempoMs = Math.round(performance.now() - inicio);

  return NextResponse.json({
    status: "ok",
    yaEstabaCaliente,
    tiempoMs,
    nodos: grafo.totalNodos(),
    aristas: grafo.totalAristas(),
    componentePrincipal: grafo.componentePrincipal.size,
    reportes: reportes.length,
  });
}
