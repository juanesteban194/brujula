import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MapTheme = "beige" | "gray" | "dark";

/** Toggle order: claro cálido → claro gris → oscuro (overlays brillan, §6.1). */
export const MAP_THEME_CYCLE: MapTheme[] = ["beige", "gray", "dark"];

type UiState = {
  mapTheme: MapTheme;
  setMapTheme: (t: MapTheme) => void;
  toggleMapTheme: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mapTheme: "beige",
      setMapTheme: (t) => set({ mapTheme: t }),
      toggleMapTheme: () =>
        set((s) => ({
          mapTheme:
            MAP_THEME_CYCLE[
              (MAP_THEME_CYCLE.indexOf(s.mapTheme) + 1) % MAP_THEME_CYCLE.length
            ],
        })),
    }),
    { name: "brujula:ui:v2", skipHydration: true }
  )
);
