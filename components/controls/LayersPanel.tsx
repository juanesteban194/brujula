"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLayersStore, type LayerKey } from "@/lib/store/layersStore";
import { useQueryClient } from "@tanstack/react-query";
import { useTimeAgo } from "@/lib/hooks/useTimeAgo";
import { cn } from "@/lib/utils";

/* ── Custom icons (no generic Lucide) ── */
const Icons = {
  layers: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M10 2L17 6L10 10L3 6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 10L10 14L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 14L10 18L17 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  heatmap: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.9"/>
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="0.75" opacity="0.2"/>
    </svg>
  ),
  report: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M10 3C6.13 3 3 6.13 3 10C3 11.9 3.73 13.63 4.93 14.93L3 17H10C13.87 17 17 13.87 17 10C17 6.13 13.87 3 10 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 7V11M10 13V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  critical: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M10 2L18 16H2L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 9V12M10 14V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  rain: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M4 9C4 6.24 6.24 4 9 4C9.34 4 9.67 4.04 10 4.1C10.55 2.87 11.81 2 13.25 2C15.32 2 17 3.68 17 5.75C17 5.84 17 5.92 16.99 6H17C18.1 6 19 6.9 19 8S18.1 10 17 10H4C2.9 10 2 9.1 2 8S2.9 6 4 6L4 9Z"
        stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <path d="M7 13L6 16M10 13L9 16M13 13L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  air: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M3 8C3 8 4 7 6 7C8.5 7 9.5 9 12 9C14 9 15 8 15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 12C3 12 5 11 7.5 11C10 11 11 13 13.5 13C15.5 13 16.5 12 17 11.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.25"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.7"/>
      <path d="M10 2V4M18 10H16M10 18V16M2 10H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path d="M15.5 4.5C13.9 2.9 11.6 2 9 2C4.58 2 1 5.58 1 10C1 14.42 4.58 18 9 18C12.42 18 15.33 16.07 16.71 13.23"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M19 2L16 5L13 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const LAYER_GROUPS = [
  {
    section: "Seguridad",
    items: [
      {
        key: "riskHeatmap" as LayerKey,
        icon: Icons.heatmap,
        label: "Riesgo de acoso",
        sublabel: "Dataset Medellín",
        color: "var(--risk-high)",
        live: false,
      },
      {
        key: "communityReports" as LayerKey,
        icon: Icons.report,
        label: "Reportes",
        sublabel: "Comunidad",
        color: "var(--route-balanced)",
        live: false,
      },
      {
        key: "criticalZones" as LayerKey,
        icon: Icons.critical,
        label: "Zonas críticas",
        sublabel: "Brújula + SIATA",
        color: "var(--alert-orange)",
        live: true,
      },
    ],
  },
  {
    section: "Clima en vivo",
    items: [
      {
        key: "airQuality" as LayerKey,
        icon: Icons.air,
        label: "Calidad del aire",
        sublabel: "PM2.5 · ICA",
        color: "var(--route-safe)",
        live: true,
      },
    ],
  },
];

export default function LayersPanel() {
  const [open, setOpen] = useState(false);
  const store = useLayersStore();
  const qc = useQueryClient();
  const timeAgo = useTimeAgo(store.lastUpdate.airQuality ?? null);

  const toggle = (key: LayerKey, live: boolean) => {
    store.toggle(key);
    const nowOn = !store[key];
    if (nowOn && live) {
      store.setUpdateTime(key);
      toast.success("Capa activada", { description: timeAgo || "Cargando datos…" });
    }
    if ("vibrate" in navigator) navigator.vibrate(10);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["siata"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
    toast.success("Actualizando datos…");
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Panel de capas"
        className="w-12 h-12 rounded-2xl glass flex items-center justify-center transition-all active:scale-95 shadow-md"
        style={{
          color: open ? "var(--accent)" : "var(--text-secondary)",
          borderColor: open ? "var(--border-accent)" : undefined,
        }}
      >
        {Icons.layers}
      </button>

      {/* Backdrop (mobile) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 w-72 rounded-2xl overflow-hidden shadow-lg"
            style={{
              right: 16,
              top: 70,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span className="font-semibold text-sm">Capas del mapa</span>
              <button
                onClick={refresh}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-bg-surface"
                style={{ color: "var(--text-tertiary)" }}
                aria-label="Refrescar datos"
              >
                {Icons.refresh}
              </button>
            </div>

            {/* Groups */}
            <div className="p-3 space-y-4">
              {LAYER_GROUPS.map((group) => (
                <div key={group.section}>
                  <p
                    className="text-[10px] font-mono uppercase tracking-widest px-1 mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group.section}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(({ key, icon, label, sublabel, color, live }) => {
                      const on = store[key];
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 px-3 rounded-xl transition-colors hover:bg-bg-surface"
                          style={{ minHeight: 52 }}
                        >
                          {/* Icon */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                            style={{
                              background: on ? `${color}18` : "var(--bg-surface)",
                              color: on ? color : "var(--text-muted)",
                            }}
                          >
                            {icon}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium" style={{ color: on ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                {label}
                              </span>
                              {live && (
                                <span
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: "rgba(245,158,11,0.12)",
                                    color: "var(--accent)",
                                    border: "1px solid rgba(245,158,11,0.2)",
                                  }}
                                >
                                  VIVO
                                </span>
                              )}
                            </div>
                            {sublabel && (
                              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{sublabel}</p>
                            )}
                          </div>

                          {/* Switch */}
                          <button
                            role="switch"
                            aria-checked={on}
                            aria-label={`${on ? "Desactivar" : "Activar"} ${label}`}
                            onClick={() => toggle(key, live)}
                            className="relative inline-flex items-center rounded-full shrink-0 transition-colors duration-200"
                            style={{
                              width: 40,
                              height: 22,
                              background: on ? color : "var(--border-strong)",
                            }}
                          >
                            <span
                              className="absolute rounded-full bg-white shadow transition-transform duration-200"
                              style={{
                                width: 16,
                                height: 16,
                                transform: on ? "translateX(20px)" : "translateX(3px)",
                              }}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2.5"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                {timeAgo || "Sin datos recientes"} · SIATA / Open-Meteo
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
