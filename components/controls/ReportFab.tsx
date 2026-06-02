"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap } from "maplibre-gl";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Loader2, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReport, type ReportCreate } from "@/lib/api/reports";
import { useRouteStore } from "@/lib/store/routeStore";
import { toast } from "sonner";

const TYPES: { value: ReportCreate["type"]; label: string; emoji: string }[] = [
  { value: "acoso_verbal", label: "Acoso verbal", emoji: "🗣️" },
  { value: "robo", label: "Robo / Hurto", emoji: "🎒" },
  { value: "iluminacion_deficiente", label: "Sin luz", emoji: "💡" },
  { value: "zona_solitaria", label: "Zona sola", emoji: "🌑" },
  { value: "bien", label: "Zona segura", emoji: "✅" },
];

export default function ReportFab({ map }: { map: MapLibreMap | null }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<ReportCreate["type"] | null>(null);
  const [sev, setSev] = useState(3);
  const [desc, setDesc] = useState("");
  const [doneOk, setDoneOk] = useState(false);
  const origen = useRouteStore((s) => s.origen);
  const qc = useQueryClient();

  const reset = () => { setTipo(null); setSev(3); setDesc(""); setDoneOk(false); };

  const mut = useMutation({
    mutationFn: (body: ReportCreate) => createReport(body),
    onSuccess: () => {
      setDoneOk(true);
      qc.invalidateQueries({ queryKey: ["reports-layer"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setTimeout(() => { setOpen(false); reset(); }, 1400);
    },
    onError: () => toast.error("No se pudo enviar el reporte"),
  });

  const submit = () => {
    if (!tipo) return;
    const center = origen ?? (map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : null);
    if (!center) { toast.error("Marca tu ubicación primero"); return; }
    mut.mutate({ type: tipo, lat: center.lat, lon: center.lon, severity: sev, description: desc || undefined });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Reportar"
        className="w-12 h-12 rounded-2xl glass flex items-center justify-center shadow-md active:scale-95 transition-transform"
        style={{ color: "var(--route-balanced)" }}
      >
        <Flag className="w-5 h-5" />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => { setOpen(false); reset(); }}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full max-w-md rounded-t-3xl p-5"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", paddingBottom: "max(var(--safe-bottom), 20px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {doneOk ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(52,211,153,0.18)" }}>
                      <Check className="w-8 h-8" style={{ color: "var(--route-safe)" }} />
                    </div>
                    <p className="font-semibold">¡Gracias por reportar!</p>
                    <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>Tu reporte ayuda a otras personas a caminar más seguras.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-base">Reportar una situación</h2>
                      <button onClick={() => { setOpen(false); reset(); }} className="touch-target" style={{ color: "var(--text-tertiary)" }}><X className="w-5 h-5" /></button>
                    </div>

                    {/* Tipo */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTipo(t.value)}
                          className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                          style={{
                            background: tipo === t.value ? "var(--accent-light)" : "var(--bg-elevated)",
                            border: `1px solid ${tipo === t.value ? "var(--accent)" : "var(--border-subtle)"}`,
                          }}
                        >
                          <span className="text-2xl">{t.emoji}</span>
                          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{t.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Severidad */}
                    <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>Severidad</p>
                    <div className="flex gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s} onClick={() => setSev(s)}
                          className="flex-1 h-11 rounded-xl text-lg transition-all"
                          style={{
                            background: sev >= s ? "var(--accent-light)" : "var(--bg-elevated)",
                            border: `1px solid ${sev >= s ? "var(--accent)" : "var(--border-subtle)"}`,
                            color: sev >= s ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >★</button>
                      ))}
                    </div>

                    {/* Descripción */}
                    <textarea
                      value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={300}
                      placeholder="Descripción (opcional)"
                      className="w-full rounded-xl px-3 py-2.5 text-sm mb-2 resize-none focus:outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 16 }}
                    />
                    <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                      Ubicación: {origen ? "tu punto actual" : "centro del mapa"}
                    </p>

                    <button
                      onClick={submit}
                      disabled={!tipo || mut.isPending}
                      className="w-full h-13 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                      style={{ background: "var(--accent)", color: "var(--bg-base)", minHeight: 52 }}
                    >
                      {mut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar reporte"}
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
