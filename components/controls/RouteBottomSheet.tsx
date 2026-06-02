"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Navigation, Loader2, Share2, Compass, ChevronUp, ChevronDown,
  Clock, Footprints, AlertTriangle, X, GitCompare, ArrowUpDown, Trash2,
} from "lucide-react";
import { useRouteStore } from "@/lib/store/routeStore";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import PreferenceSlider from "./PreferenceSlider";
import RouteAlternatives from "./RouteAlternatives";
import { formatDistance, formatDuration, riskLabel, riskToColor } from "@/lib/utils";

const PANEL_LEFT = 12;
const PANEL_TOP = "calc(56px + var(--safe-top) + 8px)";
const PANEL_WIDTH = "min(340px, calc(100vw - 24px))";

export default function RouteBottomSheet() {
  const [full, setFull] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("brujula:panel:v2");
    if (v === "hidden") setHidden(true);
    else if (v === "mini") setFull(false);
  }, []);
  const persist = (state: "full" | "mini" | "hidden") => {
    localStorage.setItem("brujula:panel:v2", state);
  };

  const origen = useRouteStore((s) => s.origen);
  const destino = useRouteStore((s) => s.destino);
  const setOrigen = useRouteStore((s) => s.setOrigen);
  const clearOrigen = useRouteStore((s) => s.clearOrigen);
  const clearDestino = useRouteStore((s) => s.clearDestino);
  const swapEndpoints = useRouteStore((s) => s.swapEndpoints);
  const clearAll = useRouteStore((s) => s.clearAll);
  const resultado = useRouteStore((s) => s.resultado);
  const alternativas = useRouteStore((s) => s.alternativas);
  const isCalculating = useRouteStore((s) => s.isCalculating);
  const showAlternatives = useRouteStore((s) => s.showAlternatives);
  const setShowAlternatives = useRouteStore((s) => s.setShowAlternatives);
  const comparisonMode = useRouteStore((s) => s.comparisonMode);
  const setComparisonMode = useRouteStore((s) => s.setComparisonMode);
  const avoidCriticalZones = useRouteStore((s) => s.avoidCriticalZones);
  const setAvoidCritical = useRouteStore((s) => s.setAvoidCritical);
  const calcular = useRouteStore((s) => s.calcular);

  const geo = useGeolocation();
  useEffect(() => {
    if (geo.status === "success" && !origen) setOrigen({ lat: geo.lat, lon: geo.lon });
  }, [geo, origen, setOrigen]);

  const handleCalc = async () => {
    if (!origen || !destino) { toast.error("Marca origen y destino primero"); return; }
    setFull(true); persist("full");
    await calcular();
  };

  const handleShare = async () => {
    if (!resultado) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ruta · Brújula", text: `${formatDistance(resultado.distancia_total_m)} · ${formatDuration(resultado.duracion_estimada_min)}`, url: window.location.href });
      } else {
        await navigator.clipboard?.writeText(window.location.href);
        toast.success("Link copiado");
      }
    } catch { /* cancelled */ }
  };

  const canCalc = !!origen && !!destino;

  // Hidden → small FAB where the panel lives
  if (hidden) {
    return (
      <button
        onClick={() => { setHidden(false); persist(full ? "full" : "mini"); }}
        className="fixed z-40 flex items-center gap-2 h-11 px-4 rounded-2xl glass-warm shadow-lg active:scale-95 transition-transform"
        style={{ left: PANEL_LEFT, top: PANEL_TOP, color: "var(--accent)" }}
        aria-label="Mostrar panel de ruta"
      >
        <Compass className="w-5 h-5" />
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Ruta</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-40 flex flex-col rounded-3xl glass-warm shadow-lg overflow-hidden"
      style={{
        left: PANEL_LEFT,
        top: PANEL_TOP,
        width: PANEL_WIDTH,
        maxHeight: "calc(100dvh - 84px - var(--safe-top) - var(--safe-bottom) - 88px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: full ? "1px solid var(--border-subtle)" : "none" }}>
        <Compass className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold flex-1">Planear ruta</span>
        <button
          onClick={() => { const nf = !full; setFull(nf); persist(nf ? "full" : "mini"); }}
          className="touch-target" style={{ color: "var(--text-tertiary)" }}
          aria-label={full ? "Contraer" : "Expandir"}
        >
          {full ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <button
          onClick={() => { setHidden(true); persist("hidden"); }}
          className="touch-target" style={{ color: "var(--text-tertiary)" }}
          aria-label="Ocultar panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto scrollbar-hide px-4 py-3 space-y-3">
        {/* Origen */}
        <PointRow
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="4" fill="var(--route-fast)" />
              <circle cx="8" cy="8" r="7" stroke="var(--route-fast)" strokeWidth="1" strokeOpacity="0.35" />
            </svg>
          }
          label="Desde"
          value={origen ? `${origen.lat.toFixed(4)}, ${origen.lon.toFixed(4)}` : "Sin definir — GPS o tap en mapa"}
          action={
            <div className="flex items-center">
              {origen && (
                <button onClick={clearOrigen} style={{ color: "var(--text-tertiary)", minWidth: 40, minHeight: 40 }} className="flex items-center justify-center" aria-label="Borrar origen" title="Borrar origen">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={geo.request} disabled={geo.status === "loading"} style={{ color: "var(--accent)", minWidth: 40, minHeight: 40 }} className="flex items-center justify-center" aria-label="Usar mi ubicación" title="Usar mi ubicación">
                {geo.status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              </button>
            </div>
          }
        />

        {/* Swap origen ↔ destino */}
        {(origen || destino) && (
          <div className="flex justify-center -my-1">
            <button
              onClick={swapEndpoints}
              disabled={!origen || !destino}
              className="w-9 h-9 rounded-full glass flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
              style={{ color: "var(--accent)" }}
              aria-label="Intercambiar origen y destino"
              title="Intercambiar"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Destino */}
        <PointRow
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1C5.24 1 3 3.24 3 6C3 9.5 8 15 8 15C8 15 13 9.5 13 6C13 3.24 10.76 1 8 1Z" fill="var(--accent)" />
              <circle cx="8" cy="6" r="2" fill="var(--bg-base)" />
            </svg>
          }
          label="Hasta"
          value={destino ? `${destino.lat.toFixed(4)}, ${destino.lon.toFixed(4)}` : "Tap (o tap largo) en el mapa"}
          action={
            destino ? (
              <button onClick={clearDestino} style={{ color: "var(--text-tertiary)", minWidth: 40, minHeight: 40 }} className="flex items-center justify-center" aria-label="Borrar destino" title="Borrar destino">
                <X className="w-4 h-4" />
              </button>
            ) : null
          }
        />

        {/* Full-only controls */}
        {full && (
          <>
            <PreferenceSlider />
            <div className="flex flex-col gap-2">
              <Toggle label="3 alternativas" checked={showAlternatives} onChange={setShowAlternatives} />
              <Toggle label="Comparar A* vs Dijkstra" checked={comparisonMode} onChange={setComparisonMode} icon={<GitCompare className="w-3.5 h-3.5" />} />
              <Toggle label="Evitar zonas con alerta" checked={avoidCriticalZones} onChange={setAvoidCritical} />
            </div>
          </>
        )}

        {/* CTA */}
        <button
          onClick={handleCalc}
          data-testid="btn-calcular"
          disabled={!canCalc || isCalculating}
          className="w-full h-13 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: canCalc ? "var(--accent)" : "var(--bg-elevated)", color: canCalc ? "var(--bg-base)" : "var(--text-muted)", minHeight: 50, boxShadow: canCalc ? "0 4px 16px rgba(245,158,11,0.25)" : "none" }}
        >
          {isCalculating ? (<><Loader2 className="w-5 h-5 animate-spin" /> Calculando…</>) : "Calcular ruta"}
        </button>

        {/* Limpiar todo */}
        {(origen || destino) && (
          <button
            onClick={clearAll}
            className="w-full h-8 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Limpiar origen, destino y ruta"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpiar todo
          </button>
        )}

        {/* Results */}
        {resultado?.encontrada && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard icon={<Clock className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />} value={formatDuration(resultado.duracion_estimada_min)} label="tiempo" />
              <MetricCard icon={<Footprints className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />} value={formatDistance(resultado.distancia_total_m)} label="dist." />
              <MetricCard icon={<AlertTriangle className="w-4 h-4" style={{ color: riskToColor(resultado.riesgo_promedio) }} />} value={riskLabel(resultado.riesgo_promedio)} label="riesgo" valueColor={riskToColor(resultado.riesgo_promedio)} />
            </div>
            {alternativas && <RouteAlternatives />}
            <button onClick={handleShare} className="w-full h-10 rounded-xl text-sm flex items-center justify-center gap-2" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </motion.div>
        )}

        {!isCalculating && resultado && !resultado.encontrada && (
          <p className="text-center text-sm py-1" style={{ color: "var(--risk-high)" }}>No se encontró ruta.</p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Sub-components ── */

function PointRow({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-sm truncate mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
      </div>
      {action}
    </div>
  );
}

function Toggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 w-full text-left"
      style={{ minHeight: 40 }}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span
        className="relative shrink-0 rounded-full transition-colors duration-200"
        style={{ width: 38, height: 22, background: checked ? "var(--accent)" : "var(--border-strong)" }}
      >
        <span
          className="absolute rounded-full bg-white shadow transition-all duration-200"
          style={{ width: 16, height: 16, top: 3, left: checked ? 19 : 3 }}
        />
      </span>
      <span className="text-xs flex items-center gap-1.5" style={{ color: checked ? "var(--text-primary)" : "var(--text-secondary)" }}>
        {icon}
        {label}
      </span>
    </button>
  );
}

function MetricCard({ icon, value, label, valueColor }: { icon: React.ReactNode; value: string; label: string; valueColor?: string }) {
  return (
    <div className="rounded-xl p-2.5 flex flex-col items-center gap-1" style={{ background: "var(--bg-elevated)" }}>
      {icon}
      <p className="font-mono font-bold text-sm leading-none text-center" style={{ color: valueColor ?? "var(--text-primary)" }}>{value}</p>
      <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
