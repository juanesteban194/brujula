import { create } from "zustand";
import { calcularAlternativas, type RouteResponse, type AlternativesResponse } from "@/lib/api/routes";
import type { ExplorationEvent } from "@/lib/api/sse";
import { alphaFromPreference, betaFromPreference, haversineM, parseNodeId } from "@/lib/utils";
import { openExploreStream, openExploreMulti } from "@/lib/api/sse";
import { ROUTE_DRAW_DELAY_MS } from "@/lib/constants";
import { toast } from "sonner";

export type Coord = { lat: number; lon: number };

type RouteState = {
  origen: Coord | null;
  destino: Coord | null;
  preference: number;         // 0 = full speed, 1 = full safety
  algoritmo: "astar" | "dijkstra" | "yens" | "greedy";
  showAlternatives: boolean;
  comparisonMode: boolean;
  avoidCriticalZones: boolean;
  resultado: RouteResponse | null;
  alternativas: AlternativesResponse | null;
  comparison: { astar: RouteResponse; dijkstra: RouteResponse } | null;
  isCalculating: boolean;
  eventosExploracion: ExplorationEvent[];
  selectedAlternative: number;

  setOrigen: (p: Coord | null) => void;
  setDestino: (p: Coord | null) => void;
  clearOrigen: () => void;
  clearDestino: () => void;
  swapEndpoints: () => void;
  clearAll: () => void;
  setPreference: (v: number) => void;
  setAlgoritmo: (a: RouteState["algoritmo"]) => void;
  setShowAlternatives: (v: boolean) => void;
  setComparisonMode: (v: boolean) => void;
  setAvoidCritical: (v: boolean) => void;
  setSelectedAlternative: (i: number) => void;
  calcular: () => Promise<void>;
  addExplorationEvent: (e: ExplorationEvent) => void;
  reset: () => void;
};

export const useRouteStore = create<RouteState>((set, get) => ({
  origen: null,
  destino: null,
  preference: 0.5,
  algoritmo: "astar",
  showAlternatives: false,
  comparisonMode: false,
  avoidCriticalZones: true, // evitar zonas de reporte por defecto (buffer ~3 calles)
  resultado: null,
  alternativas: null,
  comparison: null,
  isCalculating: false,
  eventosExploracion: [],
  selectedAlternative: 0,

  setOrigen: (p) => set({ origen: p }),
  setDestino: (p) => set({ destino: p }),
  // Clear one endpoint independently; the existing route/exploration are no
  // longer valid without both ends, so wipe those but keep the other endpoint.
  clearOrigen: () => { set({ origen: null }); get().reset(); },
  clearDestino: () => { set({ destino: null }); get().reset(); },
  swapEndpoints: () => { const { origen, destino } = get(); set({ origen: destino, destino: origen }); get().reset(); },
  clearAll: () => { set({ origen: null, destino: null }); get().reset(); },
  setPreference: (v) => set({ preference: v }),
  setAlgoritmo: (a) => set({ algoritmo: a }),
  // "3 alternativas" and "comparación" are mutually exclusive search modes.
  setShowAlternatives: (v) => set(v ? { showAlternatives: true, comparisonMode: false } : { showAlternatives: false }),
  setComparisonMode: (v) => set(v ? { comparisonMode: true, showAlternatives: false } : { comparisonMode: false }),
  setAvoidCritical: (v) => set({ avoidCriticalZones: v }),
  setSelectedAlternative: (i) => set({ selectedAlternative: i }),

  addExplorationEvent: (e) =>
    set((s) => ({ eventosExploracion: [...s.eventosExploracion, e] })),

  calcular: async () => {
    const { origen, destino, preference, showAlternatives, comparisonMode, avoidCriticalZones } = get();
    if (!origen || !destino) {
      toast.error("Selecciona origen y destino primero");
      return;
    }

    const alpha = alphaFromPreference(preference);
    const beta = betaFromPreference(preference);
    // "Evitar zonas con alerta" → hard-avoid reportes + calles críticas (≥0.95).
    // gamma alto (≥CRITICAL_GAMMA) para que también esquive las calles rojas.
    const gamma = avoidCriticalZones ? 9000 : 0;

    set({ isCalculating: true, resultado: null, alternativas: null, comparison: null, eventosExploracion: [] });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);

    const coverageWarn = (r: RouteResponse) => {
      const snapO = parseNodeId(r.origen_nodo);
      const snapD = parseNodeId(r.destino_nodo);
      const dO = snapO ? haversineM(origen.lat, origen.lon, snapO[0], snapO[1]) : 0;
      const dD = snapD ? haversineM(destino.lat, destino.lon, snapD[0], snapD[1]) : 0;
      if (Math.max(dO, dD) > 400) {
        toast.warning("Punto fuera de cobertura", {
          description: "Se usó la calle con datos más cercana. Cubrimos Medellín central.",
        });
      }
    };

    try {
      if (comparisonMode) {
        // A* vs Dijkstra EN PARALELO. Pesos DISTANCIA (alpha=1, beta=0): aquí la
        // heurística haversine es ajustada, así que A* explora un corredor delgado
        // y Dijkstra anillos concéntricos → ~8-18x menos nodos, MISMA ruta.
        // (Con pesos de seguridad altos la heurística se debilita y ambos convergen:
        //  el costo lo domina beta*risk*length, que haversine no acota. Trade-off real.)
        const bodies = [
          { origen, destino, alpha: 1, beta: 0, algoritmo: "astar" },
          { origen, destino, alpha: 1, beta: 0, algoritmo: "dijkstra" },
        ];
        await new Promise<void>((resolve) => {
          const cancel = openExploreMulti(
            bodies,
            (results, events) => {
              const aStar = results[0] as RouteResponse | null;
              const dij = results[1] as RouteResponse | null;
              set({ eventosExploracion: events }); // streets fill first
              const ruta = aStar?.encontrada ? aStar : dij?.encontrada ? dij : null;
              if (!ruta) {
                toast.error("No se encontró ruta entre esos puntos", { description: "Probá puntos dentro de Medellín." });
                set({ isCalculating: false });
                resolve();
                return;
              }
              // Mark the final route only AFTER the exploration finishes drawing.
              setTimeout(() => {
                coverageWarn(ruta);
                set({
                  resultado: ruta,
                  comparison: aStar?.encontrada && dij?.encontrada ? { astar: aStar, dijkstra: dij } : null,
                });
                resolve();
              }, ROUTE_DRAW_DELAY_MS);
            },
            () => resolve()
          );
          setTimeout(() => { cancel(); resolve(); }, 25_000);
        });
      } else if (showAlternatives) {
        // 3 rutas DISTINTAS desde el endpoint (diversidad por penalización de
        // solapamiento, server-side). Animación: una sola exploración (rápida).
        const altPromise = calcularAlternativas({ origen, destino }).catch(() => null);
        const evPromise = new Promise<ExplorationEvent[]>((res) => {
          const cancel = openExploreStream(
            { origen, destino, alpha: 1, beta: 0, algoritmo: "astar" },
            (_r, events) => res(events),
            () => res([]),
          );
          setTimeout(() => { cancel(); res([]); }, 20_000);
        });
        const [alt, events] = await Promise.all([altPromise, evPromise]);
        set({ eventosExploracion: events }); // streets fill first
        const rutas = (alt?.rutas ?? []) as RouteResponse[];
        const etiquetas = (alt?.etiquetas ?? []) as ("rapida" | "balanceada" | "segura")[];
        if (rutas.length === 0) {
          toast.error("No se encontró ruta entre esos puntos", { description: "Probá puntos dentro de Medellín." });
          set({ isCalculating: false });
        } else {
          coverageWarn(rutas[0]);
          const iRap = etiquetas.indexOf("rapida");
          const iSeg = etiquetas.indexOf("segura");
          const iBal = etiquetas.indexOf("balanceada");
          const selected =
            preference >= 0.66 && iSeg >= 0 ? iSeg
            : preference <= 0.33 && iRap >= 0 ? iRap
            : iBal >= 0 ? iBal : 0;
          // Reveal the routes only AFTER the exploration finishes drawing.
          await new Promise((r) => setTimeout(r, ROUTE_DRAW_DELAY_MS));
          set({ alternativas: { rutas, etiquetas }, resultado: rutas[selected] ?? rutas[0], selectedAlternative: selected });
        }
      } else {
        // Single A* exploration + single route
        await new Promise<void>((resolve) => {
          const cancel = openExploreStream(
            { origen, destino, alpha, beta, algoritmo: "astar", gamma },
            (resultado, events) => {
              const r = resultado as RouteResponse;
              set({ eventosExploracion: events }); // streets fill first
              if (r.encontrada) {
                // Mark the final route only AFTER the exploration finishes drawing.
                setTimeout(() => { set({ resultado: r }); coverageWarn(r); resolve(); }, ROUTE_DRAW_DELAY_MS);
              } else {
                set({ resultado: r });
                resolve();
              }
            },
            () => resolve()
          );
          setTimeout(() => { cancel(); resolve(); }, 25_000);
        });

        if (!get().resultado?.encontrada) {
          toast.error("No se encontró ruta entre esos puntos", { description: "Probá puntos dentro de Medellín." });
          set({ isCalculating: false, resultado: null });
          return;
        }
      }

      set({ isCalculating: false });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    } catch {
      toast.error("No se pudo calcular la ruta", { description: "¿Está corriendo el backend en :8000?" });
      set({ isCalculating: false });
    }
  },

  reset: () =>
    set({
      resultado: null,
      alternativas: null,
      comparison: null,
      isCalculating: false,
      eventosExploracion: [],
      selectedAlternative: 0,
    }),
}));
