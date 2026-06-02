import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LayerKey =
  | "riskHeatmap"
  | "communityReports"
  | "criticalZones"
  | "weatherRain"
  | "airQuality"
  | "siataAlerts";

type LayersState = {
  riskHeatmap: boolean;
  communityReports: boolean;
  criticalZones: boolean;
  weatherRain: boolean;
  airQuality: boolean;
  siataAlerts: boolean;
  lastUpdate: Partial<Record<LayerKey, number>>;

  toggle: (key: LayerKey) => void;
  setUpdateTime: (key: LayerKey) => void;
};

export const useLayersStore = create<LayersState>()(
  persist(
    (set) => ({
      riskHeatmap: true,
      communityReports: false,
      criticalZones: false,
      weatherRain: false,
      airQuality: false,
      siataAlerts: false,
      lastUpdate: {},

      toggle: (key) =>
        set((s) => ({ [key]: !s[key] } as Partial<LayersState>)),

      setUpdateTime: (key) =>
        set((s) => ({
          lastUpdate: { ...s.lastUpdate, [key]: Date.now() },
        })),
    }),
    { name: "brujula:layers:v1", skipHydration: true }
  )
);
