import { apiGet, apiPost } from "./client";

export interface Report {
  id: string;
  type: string;
  lat: number;
  lon: number;
  severity: number;
  description?: string;
  timestamp: string;
  votes: { confirm: number; deny: number };
  active: boolean;
}

export interface ReportCreate {
  type: "acoso_verbal" | "zona_solitaria" | "iluminacion_deficiente" | "robo" | "bien";
  lat: number;
  lon: number;
  severity: number;
  description?: string;
}

export const getReports = (params?: { bbox?: string; since?: string }) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<Report[]>(`/api/reports/community${qs ? "?" + qs : ""}`);
};

export const createReport = (body: ReportCreate) =>
  apiPost<Report>("/api/reports/community", body);

export const voteReport = (id: string, vote: "confirm" | "deny") =>
  apiPost<{ ok: boolean; votes: Record<string, number>; active: boolean }>(
    `/api/reports/community/${id}/vote`,
    { vote }
  );
