import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { cargarGrafoDesdeCsv } from "@/lib/server/graph/loader";
import { Grafo } from "@/lib/server/graph/models";
import { aplicarOverlay } from "@/lib/server/services/riskOverlay";
import type { Report } from "@/lib/server/types";

import { config } from "./config";

interface BrujulaState {
  grafo: Grafo;
  reportes: Report[];
  contadorRutas: number;
}

// Persist across module reloads (dev HMR) and across requests within a warm
// serverless instance. The 68k-row CSV is parsed exactly once per instance.
const globalRef = globalThis as unknown as { __brujulaState?: BrujulaState };

function build(): BrujulaState {
  console.info("[state] Inicializando grafo desde CSV…");
  const grafo = cargarGrafoDesdeCsv(config.csvPath);

  let reportes: Report[] = [];
  const seedPath = existsSync(config.reportsRuntimePath)
    ? config.reportsRuntimePath
    : config.reportsSeedPath;
  try {
    if (existsSync(seedPath)) {
      reportes = JSON.parse(readFileSync(seedPath, "utf-8")) as Report[];
      console.info(`[state] Cargados ${reportes.length} reportes comunitarios`);
      aplicarOverlay(grafo, reportes);
    }
  } catch (err) {
    console.warn("[state] No se pudieron cargar reportes:", err);
  }

  return { grafo, reportes, contadorRutas: 0 };
}

export function getState(): BrujulaState {
  if (!globalRef.__brujulaState) {
    globalRef.__brujulaState = build();
  }
  return globalRef.__brujulaState;
}

/** True if the graph singleton is already built in this instance (no cold start). */
export function isWarm(): boolean {
  return globalRef.__brujulaState !== undefined;
}

/** Best-effort persistence of community reports to a writable file (dev only). */
export function persistReports(): void {
  try {
    const { reportes } = getState();
    writeFileSync(config.reportsRuntimePath, JSON.stringify(reportes, null, 2), "utf-8");
  } catch {
    // Read-only filesystem (e.g. Vercel) — in-memory state is still authoritative.
  }
}
