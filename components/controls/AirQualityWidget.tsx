"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, MapPin, ChevronDown, Loader2, Navigation } from "lucide-react";
import { useRouteStore } from "@/lib/store/routeStore";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { getNearestAir } from "@/lib/api/siata";
import { MEDELLIN_CENTER } from "@/lib/constants";

export default function AirQualityWidget() {
  const [open, setOpen] = useState(false);
  const origen = useRouteStore((s) => s.origen);
  const setOrigen = useRouteStore((s) => s.setOrigen);
  const geo = useGeolocation();

  // Use GPS origen if available, otherwise Medellín center
  const lat = origen?.lat ?? MEDELLIN_CENTER[1];
  const lon = origen?.lon ?? MEDELLIN_CENTER[0];
  const usingGps = !!origen;

  const { data, isLoading } = useQuery({
    queryKey: ["air-nearest", lat.toFixed(3), lon.toFixed(3)],
    queryFn: () => getNearestAir(lat, lon),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  // When the user grants GPS via this widget, set it as origen
  useEffect(() => {
    if (geo.status === "success" && !origen) {
      setOrigen({ lat: geo.lat, lon: geo.lon });
    }
  }, [geo, origen, setOrigen]);

  const color = data?.ica_color ?? "#6B7280";

  return (
    <div className="absolute z-30" style={{ left: "50%", transform: "translateX(-50%)", top: "calc(56px + var(--safe-top) + 8px)" }}>
      <motion.div layout className="rounded-2xl glass-warm overflow-hidden shadow-md" style={{ minWidth: 0 }}>
        {/* Collapsed pill */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 h-10 w-full"
          aria-label="Calidad del aire"
        >
          <span className="relative flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="absolute w-2.5 h-2.5 rounded-full animate-pulse-ring" style={{ background: color }} />
          </span>
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          ) : (
            <span className="flex items-center gap-1.5 text-xs">
              <Wind className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {data ? `ICA ${data.ica}` : "Aire"}
              </span>
              {data && (
                <span style={{ color }}>{data.ica_categoria}</span>
              )}
            </span>
          )}
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform ml-0.5"
            style={{ color: "var(--text-tertiary)", transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>

        {/* Expanded card */}
        <AnimatePresence>
          {open && data && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="px-3.5 pb-3.5 pt-1"
              style={{ width: 248, borderTop: "1px solid var(--border-subtle)" }}
            >
              {/* Big ICA */}
              <div className="flex items-end gap-2 mt-2.5 mb-1">
                <span className="font-mono font-bold text-3xl leading-none" style={{ color }}>
                  {data.ica}
                </span>
                <span className="text-xs mb-0.5" style={{ color }}>{data.ica_categoria}</span>
              </div>
              <p className="text-[11px] font-mono mb-3" style={{ color: "var(--text-tertiary)" }}>
                PM2.5 · {data.pm25.toFixed(0)} µg/m³
              </p>

              {/* Exercise recommendation */}
              <div
                className="flex items-start gap-2.5 p-2.5 rounded-xl mb-3"
                style={{ background: `${data.color}14`, border: `1px solid ${data.color}30` }}
              >
                <span className="text-base leading-none mt-0.5">
                  {data.apto_ejercicio ? "🏃" : "⚠️"}
                </span>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: data.color }}>
                    Ejercicio
                  </p>
                  <p className="text-xs leading-snug" style={{ color: "var(--text-primary)" }}>
                    {data.mensaje}
                  </p>
                </div>
              </div>

              {/* Source */}
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <MapPin className="w-3 h-3" />
                <span className="truncate flex-1">
                  {data.estimado ? "Estimación" : data.name}
                  {!data.estimado && data.distancia_m > 0 && ` · ${(data.distancia_m / 1000).toFixed(1)}km`}
                </span>
              </div>

              {/* GPS prompt if not using location yet */}
              {!usingGps && (
                <button
                  onClick={geo.request}
                  className="mt-3 w-full h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-all active:scale-95"
                  style={{ background: "var(--accent)", color: "var(--bg-base)" }}
                >
                  {geo.status === "loading"
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Navigation className="w-3.5 h-3.5" />}
                  Usar mi ubicación exacta
                </button>
              )}
              {usingGps && (
                <p className="mt-2 text-[10px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  <Navigation className="w-2.5 h-2.5" /> Según tu ubicación GPS
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
