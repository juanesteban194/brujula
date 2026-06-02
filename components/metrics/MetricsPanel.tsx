"use client";

import { motion } from "framer-motion";
import { useRouteStore } from "@/lib/store/routeStore";
import { formatDistance, formatDuration, riskLabel, riskToColor } from "@/lib/utils";
import { Clock, Footprints, AlertTriangle, Cpu, Timer } from "lucide-react";

export default function MetricsPanel() {
  const { resultado } = useRouteStore();
  if (!resultado?.encontrada) return null;

  const items = [
    {
      icon: <Clock className="w-4 h-4" />,
      value: formatDuration(resultado.duracion_estimada_min),
      label: "Tiempo estimado",
    },
    {
      icon: <Footprints className="w-4 h-4" />,
      value: formatDistance(resultado.distancia_total_m),
      label: "Distancia",
    },
    {
      icon: <AlertTriangle className="w-4 h-4" style={{ color: riskToColor(resultado.riesgo_promedio) }} />,
      value: riskLabel(resultado.riesgo_promedio),
      label: "Riesgo promedio",
      valueColor: riskToColor(resultado.riesgo_promedio),
    },
    {
      icon: <Cpu className="w-4 h-4" />,
      value: resultado.nodos_explorados.toLocaleString(),
      label: "Nodos explorados",
    },
    {
      icon: <Timer className="w-4 h-4" />,
      value: `${resultado.tiempo_ms.toFixed(1)}ms`,
      label: "Tiempo cálculo",
    },
  ];

  return (
    <div className="hidden lg:flex items-center gap-6 px-6 py-3 border-t border-border-subtle bg-bg-surface">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2"
        >
          <span className="text-text-tertiary">{item.icon}</span>
          <div>
            <p
              className="font-mono font-semibold text-sm leading-none"
              style={item.valueColor ? { color: item.valueColor } : {}}
            >
              {item.value}
            </p>
            <p className="text-xs text-text-tertiary">{item.label}</p>
          </div>
        </motion.div>
      ))}
      <div className="ml-auto text-xs text-text-tertiary">
        {resultado.algoritmo}
      </div>
    </div>
  );
}
