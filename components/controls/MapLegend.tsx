"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "lucide-react";
import { useLayersStore } from "@/lib/store/layersStore";

type Item = { c: string; t: string; shape?: "line" | "dot" };
type Section = { title: string; items: Item[] };

const RISK: Section = {
  title: "Riesgo de acoso",
  items: [
    { c: "#34D399", t: "Bajo", shape: "line" },
    { c: "#FBBF24", t: "Moderado", shape: "line" },
    { c: "#F97316", t: "Alto", shape: "line" },
    { c: "#EF4444", t: "Crítico", shape: "line" },
  ],
};

const REPORTS: Section = {
  title: "Reportes",
  items: [
    { c: "#F97316", t: "Acoso verbal", shape: "dot" },
    { c: "#DB2777", t: "Acoso físico", shape: "dot" },
    { c: "#EF4444", t: "Robo / Hurto", shape: "dot" },
    { c: "#FCD34D", t: "Sin iluminación", shape: "dot" },
    { c: "#FBBF24", t: "Zona solitaria", shape: "dot" },
    { c: "#34D399", t: "Zona segura", shape: "dot" },
  ],
};

const AIR: Section = {
  title: "Calidad del aire (ICA)",
  items: [
    { c: "#00E400", t: "0–50 Buena" },
    { c: "#FFFF00", t: "51–100 Moderada" },
    { c: "#FF7E00", t: "101–150 Dañina (sensibles)" },
    { c: "#FF0000", t: "151–200 Dañina" },
    { c: "#8F3F97", t: "201+ Muy dañina" },
  ],
};

const CRITICAL: Section = {
  title: "Zonas críticas",
  items: [
    { c: "#FFB020", t: "Medio", shape: "dot" },
    { c: "#FF7E00", t: "Alto", shape: "dot" },
    { c: "#FF1744", t: "Crítico (parpadea)", shape: "dot" },
  ],
};

export default function MapLegend() {
  const { riskHeatmap, communityReports, airQuality, criticalZones } = useLayersStore();
  const [open, setOpen] = useState(false);

  const sections: Section[] = [];
  if (riskHeatmap) sections.push(RISK);
  if (communityReports) sections.push(REPORTS);
  if (criticalZones) sections.push(CRITICAL);
  if (airQuality) sections.push(AIR);

  if (sections.length === 0) return null;

  return (
    <div className="absolute z-30" style={{ left: 12, bottom: "calc(var(--safe-bottom) + 16px)" }}>
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl glass-warm shadow-lg overflow-hidden"
            style={{ maxHeight: "52dvh", width: 200 }}
          >
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <span className="text-xs font-semibold">Leyenda</span>
              <button onClick={() => setOpen(false)} aria-label="Cerrar leyenda" style={{ color: "var(--text-tertiary)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto scrollbar-hide p-3 space-y-3" style={{ maxHeight: "44dvh" }}>
              {sections.map((sec) => (
                <div key={sec.title}>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                    {sec.title}
                  </p>
                  <div className="space-y-1">
                    {sec.items.map((it) => (
                      <div key={it.t} className="flex items-center gap-2">
                        {it.shape === "line" ? (
                          <span className="w-4 h-1 rounded-full shrink-0" style={{ background: it.c }} />
                        ) : (
                          <span
                            className="w-3 h-3 shrink-0"
                            style={{ background: it.c, borderRadius: it.shape === "dot" ? "9999px" : "3px" }}
                          />
                        )}
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{it.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="chip"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 h-10 px-3 rounded-2xl glass-warm shadow-md active:scale-95 transition-transform"
            aria-label="Mostrar leyenda"
          >
            <List className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Leyenda</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
