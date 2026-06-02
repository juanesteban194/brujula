"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Wind, Loader2, ChevronDown } from "lucide-react";
import { useRouteStore } from "@/lib/store/routeStore";
import { getWeather } from "@/lib/api/siata";
import { MEDELLIN_CENTER } from "@/lib/constants";

/**
 * Current-weather badge (§1.B v3). Real data from OpenWeatherMap (→ Open-Meteo
 * fallback). Uses the GPS origin when set, otherwise Medellín centre.
 */
export default function WeatherBadge() {
  const [open, setOpen] = useState(false);
  const origen = useRouteStore((s) => s.origen);
  const lat = origen?.lat ?? MEDELLIN_CENTER[1];
  const lon = origen?.lon ?? MEDELLIN_CENTER[0];

  const { data, isLoading } = useQuery({
    queryKey: ["weather", lat.toFixed(2), lon.toFixed(2)],
    queryFn: () => getWeather(lat, lon),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  return (
    <div className="absolute z-30" style={{ right: 16, top: "calc(56px + var(--safe-top) + 8px)" }}>
      <motion.div layout className="rounded-2xl glass-warm overflow-hidden shadow-md">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 h-10"
          aria-label="Clima actual"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          ) : (
            <>
              <span className="text-base leading-none">{data?.emoji ?? "🌡️"}</span>
              <span className="font-mono font-semibold text-xs" style={{ color: "var(--text-primary)" }}>
                {data ? `${data.temperatura_c}°` : "—"}
              </span>
              {data && (
                <span className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
                  {data.descripcion}
                </span>
              )}
            </>
          )}
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform"
            style={{ color: "var(--text-tertiary)", transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>

        <AnimatePresence>
          {open && data && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="px-3.5 pb-3.5 pt-1"
              style={{ width: 210, borderTop: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-end gap-2 mt-2.5 mb-2">
                <span className="text-3xl leading-none">{data.emoji}</span>
                <span className="font-mono font-bold text-3xl leading-none" style={{ color: "var(--text-primary)" }}>
                  {data.temperatura_c}°
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{data.descripcion}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Stat icon={<Droplets className="w-3.5 h-3.5" />} label="Prob. lluvia" value={`${data.probabilidad_lluvia_pct}%`} />
                <Stat icon={<Wind className="w-3.5 h-3.5" />} label="Viento" value={`${data.viento_kmh} km/h`} />
                <Stat icon={<Droplets className="w-3.5 h-3.5" />} label="Humedad" value={`${data.humedad_pct}%`} />
                <Stat icon={<span className="text-xs">🌧️</span>} label="Lluvia" value={`${data.precipitacion_mmh.toFixed(1)} mm`} />
              </div>

              <p className="mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                Fuente: {data.source === "openweather" ? "OpenWeatherMap" : "Open-Meteo"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: "var(--text-tertiary)" }}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate" style={{ color: "var(--text-tertiary)" }}>{label}</p>
        <p className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
      </div>
    </div>
  );
}
