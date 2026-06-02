"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getAlerts } from "@/lib/api/siata";

const NIVEL: Record<string, { color: string; bg: string }> = {
  amarillo: { color: "#FCD34D", bg: "rgba(252,211,77,0.12)" },
  naranja: { color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
  rojo: { color: "#F87171", bg: "rgba(248,113,113,0.14)" },
};

export default function AlertsBanner({ visible }: { visible: boolean }) {
  const { data } = useQuery({
    queryKey: ["siata", "alerts"],
    queryFn: () => getAlerts(),
    enabled: visible,
    staleTime: 120_000,
    refetchInterval: visible ? 120_000 : false,
  });

  const alerts = visible ? data?.alerts ?? [] : [];

  return (
    <div className="absolute left-0 right-0 z-30 px-3 pointer-events-none" style={{ top: "calc(56px + var(--safe-top) + 56px)" }}>
      <AnimatePresence>
        {alerts.map((a, i) => {
          const cfg = NIVEL[a.nivel] ?? NIVEL.amarillo;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.06 }}
              className="pointer-events-auto mb-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl glass-warm"
              style={{ borderColor: `${cfg.color}40` }}
            >
              <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: cfg.color }} />
              <p className="text-xs leading-tight flex-1" style={{ color: "var(--text-primary)" }}>
                {a.descripcion}
              </p>
              <span
                className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {a.nivel}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
