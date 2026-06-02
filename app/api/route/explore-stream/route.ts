import { astar } from "@/lib/server/algorithms/astar";
import type { ResultadoRuta } from "@/lib/server/algorithms/base";
import { dijkstra } from "@/lib/server/algorithms/dijkstra";
import { greedy } from "@/lib/server/algorithms/greedy";
import { resultadoToResponse } from "@/lib/server/response";
import { normalizeRequest, resolveEndpoints } from "@/lib/server/route-helpers";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events: emits one `visit` event per explored node (subsampled to
 * ~600 for a smooth, light animation) followed by a final `done` event carrying
 * the full route. The algorithm runs to completion first (fast enough), then the
 * captured frontier is streamed out.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const req = normalizeRequest(body);
  if (!req) {
    return new Response("origen/destino inválidos", { status: 422 });
  }

  const { grafo, origenNodo, destinoNodo } = resolveEndpoints(req);
  if (!origenNodo || !destinoNodo) {
    return new Response("No se pudo resolver origen o destino", { status: 400 });
  }

  const fn = { astar, dijkstra, greedy }[req.algoritmo as "astar" | "dijkstra" | "greedy"] ?? astar;
  const resultado: ResultadoRuta = fn(
    grafo,
    origenNodo,
    destinoNodo,
    req.alpha,
    req.beta,
    true, // capturarEventos
    req.gamma,
  );
  getState().contadorRutas += 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const eventos = resultado.eventosExploracion;
      // Subsample to ~800 edges for a dense-but-light "streets filling" animation.
      const step = Math.max(1, Math.floor(eventos.length / 800));
      for (let i = 0; i < eventos.length; i += step) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventos[i])}\n\n`));
      }
      const resp = resultadoToResponse(resultado, origenNodo, destinoNodo);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ tipo: "done", resultado: resp })}\n\n`),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
