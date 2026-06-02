"use client";

import { useRouteStore } from "@/lib/store/routeStore";
import { formatDistance, formatDuration, riskLabel, riskToColor } from "@/lib/utils";

const CONFIG = {
  rapida: {
    label: "Rápida",
    color: "var(--route-fast)",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L9.5 7H14L10.5 10L12 15L8 12L4 15L5.5 10L2 7H6.5L8 2Z" fill="currentColor"/>
      </svg>
    ),
  },
  segura: {
    label: "Segura",
    color: "var(--route-safe)",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.2)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L13 4V8.5C13 11.5 10.8 13.8 8 14.5C5.2 13.8 3 11.5 3 8.5V4L8 1.5Z" fill="currentColor"/>
      </svg>
    ),
  },
  balanceada: {
    label: "Balance",
    color: "var(--route-balanced)",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.2)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M5 8H11M8 5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
} as const;

export default function RouteAlternatives() {
  const { alternativas, selectedAlternative, setSelectedAlternative } = useRouteStore();
  if (!alternativas) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Alternativas</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
        {alternativas.rutas.map((ruta, i) => {
          const etiqueta = alternativas.etiquetas[i] ?? "balanceada";
          const cfg = CONFIG[etiqueta] ?? CONFIG.balanceada;
          const isSelected = selectedAlternative === i;

          return (
            <button
              key={i}
              onClick={() => setSelectedAlternative(i)}
              className="shrink-0 w-32 rounded-2xl p-3 text-left transition-all snap-start"
              style={{
                background: isSelected ? cfg.bg : "var(--bg-elevated)",
                border: `1px solid ${isSelected ? cfg.border : "var(--border-subtle)"}`,
                boxShadow: isSelected ? `0 0 16px ${cfg.color}20` : "none",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-3" style={{ color: cfg.color }}>
                {cfg.icon}
                <span className="text-[11px] font-semibold">{cfg.label}</span>
              </div>

              {/* Time — big */}
              <p className="font-mono font-bold text-base leading-none mb-1" style={{ color: "var(--text-primary)" }}>
                {formatDuration(ruta.duracion_estimada_min)}
              </p>
              <p className="text-[11px] mb-2" style={{ color: "var(--text-tertiary)" }}>
                {formatDistance(ruta.distancia_total_m)}
              </p>

              {/* Risk badge */}
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: `${riskToColor(ruta.riesgo_promedio)}18`,
                  color: riskToColor(ruta.riesgo_promedio),
                }}
              >
                {riskLabel(ruta.riesgo_promedio)}
              </span>

              {/* Micro-dato diferenciador: tramos de riesgo que cruza */}
              {ruta.aristas_peligrosas != null && (
                <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                  <span>🚩</span>
                  {ruta.aristas_peligrosas === 0
                    ? "evita zonas de riesgo"
                    : `${ruta.aristas_peligrosas} tramos de riesgo`}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
