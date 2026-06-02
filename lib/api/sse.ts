import { API_URL } from "@/lib/constants";

export interface ExplorationEvent {
  tipo: "edge" | "done";
  coords?: [number, number][]; // [[lat,lon],[lat,lon]] of the explored segment
  orden?: number;
  g?: number;
  ruta?: number; // which of the parallel searches (0/1/2) — for color
  resultado?: unknown;
}

/**
 * Streams /api/route/explore-stream, collecting visit events in an array.
 * Calls onDone(resultado, events) ONCE at the end — no per-event React updates
 * (which would cause thousands of re-renders and freeze the UI).
 * Returns a cancel function.
 */
export function openExploreStream(
  body: unknown,
  onDone: (resultado: unknown, events: ExplorationEvent[]) => void,
  onError?: () => void
): () => void {
  const controller = new AbortController();
  const events: ExplorationEvent[] = [];

  fetch(`${API_URL}/api/route/explore-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) { onError?.(); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev: ExplorationEvent = JSON.parse(line.slice(6));
            if (ev.tipo === "done") {
              onDone(ev.resultado, events);
            } else {
              events.push(ev);
            }
          } catch {
            /* ignore malformed line */
          }
        }
      }
    })
    .catch(() => onError?.());

  return () => controller.abort();
}

/**
 * Runs several explore-stream searches IN PARALLEL (one per body, e.g. different
 * safety weights). Collects each search's events tagged with its index, then
 * interleaves them round-robin so the frontiers appear to grow simultaneously.
 * Calls onDone(results, interleavedEvents) once all searches finish.
 */
export function openExploreMulti(
  bodies: unknown[],
  onDone: (results: unknown[], events: ExplorationEvent[]) => void,
  onError?: () => void
): () => void {
  const controller = new AbortController();
  const results: unknown[] = new Array(bodies.length).fill(null);
  const perRoute: ExplorationEvent[][] = bodies.map(() => []);
  let finishedStreams = 0;
  let called = false;

  const finish = () => {
    if (called) return;
    called = true;
    const max = Math.max(0, ...perRoute.map((a) => a.length));
    const merged: ExplorationEvent[] = [];
    for (let k = 0; k < max; k++) {
      for (let i = 0; i < bodies.length; i++) {
        if (perRoute[i][k]) merged.push(perRoute[i][k]);
      }
    }
    onDone(results, merged);
  };

  bodies.forEach((body, i) => {
    fetch(`${API_URL}/api/route/explore-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) { finishedStreams++; if (finishedStreams === bodies.length) finish(); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const ev: ExplorationEvent = JSON.parse(line.slice(6));
              if (ev.tipo === "done") results[i] = ev.resultado;
              else perRoute[i].push({ ...ev, ruta: i });
            } catch { /* ignore */ }
          }
        }
        finishedStreams++;
        if (finishedStreams === bodies.length) finish();
      })
      .catch(() => {
        finishedStreams++;
        if (finishedStreams === bodies.length) finish();
        if (finishedStreams === bodies.length && results.every((r) => r === null)) onError?.();
      });
  });

  return () => controller.abort();
}
