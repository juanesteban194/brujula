/** Community report record (shared by the seed file, the API and the overlay). */
export interface Report {
  id: string;
  type: "acoso_verbal" | "zona_solitaria" | "iluminacion_deficiente" | "robo" | "bien" | string;
  lat: number;
  lon: number;
  severity: number;
  description?: string | null;
  timestamp: string;
  votes: { confirm: number; deny: number };
  active: boolean;
}
