"use client";

import { useRouteStore } from "@/lib/store/routeStore";

const LABELS = [
  { v: 0.0, text: "Rapidez total" },
  { v: 0.3, text: "Algo de margen" },
  { v: 0.5, text: "Balanceado" },
  { v: 0.7, text: "Prefiero seguro" },
  { v: 1.0, text: "Máxima seguridad" },
];

function getLabel(v: number) {
  let closest = LABELS[0];
  for (const l of LABELS) {
    if (Math.abs(l.v - v) < Math.abs(closest.v - v)) closest = l;
  }
  return closest.text;
}

export default function PreferenceSlider() {
  const { preference, setPreference } = useRouteStore();
  const pct = preference * 100;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          Prioridad
        </span>
        <span
          className="text-xs font-mono px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(245,158,11,0.12)",
            color: "var(--accent)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          {getLabel(preference)}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-12 flex items-center gap-3">
        {/* Icon fast */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M8 2L9.5 7H14L10.5 10L12 15L8 12L4 15L5.5 10L2 7H6.5L8 2Z"
            fill="var(--route-fast)" opacity="0.8"/>
        </svg>

        {/* Slider track */}
        <div className="relative flex-1 h-2 rounded-full" style={{ background: "var(--border-strong)" }}>
          {/* Filled portion */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(to right, var(--route-fast) 0%, var(--accent) 50%, var(--route-safe) 100%)`,
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md transition-all duration-150"
            style={{
              left: `calc(${pct}% - 10px)`,
              background: "var(--text-primary)",
              border: "2.5px solid var(--accent)",
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}
          />
          {/* Hidden input for accessibility */}
          <input
            type="range" min={0} max={1} step={0.05} value={preference}
            onChange={(e) => setPreference(parseFloat(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ margin: 0 }}
            aria-label={`Prioridad: ${getLabel(preference)}`}
          />
        </div>

        {/* Icon safe */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M8 1.5L13 4V8.5C13 11.5 10.8 13.8 8 14.5C5.2 13.8 3 11.5 3 8.5V4L8 1.5Z"
            fill="var(--route-safe)" opacity="0.8"/>
          <path d="M6 8L7.5 9.5L10 7" stroke="var(--bg-base)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Tick labels */}
      <div className="flex justify-between px-6">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Rápido</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Seguro</span>
      </div>
    </div>
  );
}
