// Same-origin by default: the API now lives inside this Next.js app as Route
// Handlers under /api/*, so an empty base resolves fetches relative to the page.
// Set NEXT_PUBLIC_API_URL only if you want to point at a remote backend.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

// Medellín center
export const MEDELLIN_CENTER: [number, number] = [-75.5812, 6.2442]; // [lon, lat]
export const MEDELLIN_ZOOM = 13;

export const WALK_SPEED_KMH = 5;

// Exploration → route timing: the streets fill in first (EXPLORE_REVEAL_MS),
// and only AFTER that does the final route get marked (ROUTE_DRAW_DELAY_MS).
export const EXPLORE_REVEAL_MS = 4000;
export const ROUTE_DRAW_DELAY_MS = EXPLORE_REVEAL_MS + 350;

// Colors for the 3 simultaneous route searches (vivid + readable on light maps)
// rápida (azul) · balanceada (magenta) · segura (verde) — verde = seguro (convención)
export const ROUTE_COLORS = {
  rapida: "#0EA5E9",
  balanceada: "#D946EF",
  segura: "#16A34A",
} as const;

// Index order used by the multi-exploration (beta: 0 → balanced → high)
export const ROUTE_COLOR_BY_INDEX = [
  ROUTE_COLORS.rapida,      // 0: beta=0   → distancia (azul)
  ROUTE_COLORS.balanceada,  // 1: balanced (magenta)
  ROUTE_COLORS.segura,      // 2: beta alto → seguridad (verde)
];
export const ROUTE_LABEL_BY_INDEX = ["rapida", "balanceada", "segura"] as const;

// Modo comparación A* vs Dijkstra (§6.6): A* verde, Dijkstra azul.
// Mismos pesos → MISMA ruta óptima, pero A* explora un corredor delgado y
// Dijkstra anillos concéntricos (muchos más nodos). Indexado por `ruta` (0=A*, 1=Dijkstra).
export const COMPARE_COLORS = { astar: "#00E5A0", dijkstra: "#5B8DEF" } as const;
export const COMPARE_COLOR_BY_INDEX = [COMPARE_COLORS.astar, COMPARE_COLORS.dijkstra];
