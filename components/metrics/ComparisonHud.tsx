"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GitCompare, X } from "lucide-react";
import { useRouteStore } from "@/lib/store/routeStore";
import { COMPARE_COLORS } from "@/lib/constants";

/** Count from 0 → target with an easeOutCubic curve, synced (~1.2s) to the
 *  frontier reveal in ExplorationLayer so the numbers feel "live". */
function useCountUp(target: number, durationMs = 1200): number {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [target, durationMs]);
  return val;
}

const nf = (n: number) => n.toLocaleString("es-CO");
const secs = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

/**
 * Live A* vs Dijkstra scoreboard (§6.6). Appears after a comparison run:
 * both find the *same* optimal route, but A* explores far fewer nodes thanks
 * to its admissible heuristic — the most didactic demo of what a heuristic is.
 */
export default function ComparisonHud() {
  const comparison = useRouteStore((s) => s.comparison);
  const [dismissed, setDismissed] = useState(false);

  // Re-show whenever a new comparison result arrives.
  useEffect(() => { setDismissed(false); }, [comparison]);

  const aNodos = useCountUp(comparison?.astar.nodos_explorados ?? 0);
  const dNodos = useCountUp(comparison?.dijkstra.nodos_explorados ?? 0);

  if (!comparison) return null;

  const aReal = comparison.astar.nodos_explorados;
  const dReal = comparison.dijkstra.nodos_explorados;
  const ratio = aReal > 0 ? dReal / aReal : 0;
  const ratioLabel = ratio >= 10 ? Math.round(ratio).toString() : ratio.toFixed(1);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-1/2 z-40 -translate-x-1/2 rounded-2xl glass-warm shadow-lg overflow-hidden"
          style={{
            bottom: "calc(16px + max(var(--safe-bottom), 0px))",
            width: "min(380px, calc(100vw - 24px))",
          }}
          role="status"
          aria-live="polite"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3.5 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <GitCompare className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
              A* vs Dijkstra
            </span>
            <button
              onClick={() => setDismissed(true)}
              className="touch-target"
              style={{ color: "var(--text-tertiary)", minWidth: 28, minHeight: 28 }}
              aria-label="Cerrar comparación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rows */}
          <div className="px-3.5 py-2.5 space-y-2">
            <Row color={COMPARE_COLORS.astar} name="A*" nodos={aNodos} ms={comparison.astar.tiempo_ms} winner />
            <Row color={COMPARE_COLORS.dijkstra} name="Dijkstra" nodos={dNodos} ms={comparison.dijkstra.tiempo_ms} />
          </div>

          {/* Verdict */}
          <div className="px-3.5 py-2 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>Misma ruta.</span>{" "}
              A* exploró{" "}
              <span className="font-mono font-bold" style={{ color: COMPARE_COLORS.astar }}>{ratioLabel}×</span>{" "}
              menos nodos.
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              modo distancia · la heurística dirige la búsqueda al destino
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ color, name, nodos, ms, winner = false }: {
  color: string; name: string; nodos: number; ms: number; winner?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}88` }} />
      <span className="text-xs font-medium w-16 shrink-0" style={{ color: winner ? color : "var(--text-secondary)" }}>
        {name}
      </span>
      <span className="font-mono text-sm font-bold tabular-nums flex-1" style={{ color: "var(--text-primary)" }}>
        {nf(nodos)} <span className="text-[10px] font-normal" style={{ color: "var(--text-tertiary)" }}>nodos</span>
      </span>
      <span className="font-mono text-[11px] tabular-nums shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {secs(ms)}
      </span>
    </div>
  );
}
