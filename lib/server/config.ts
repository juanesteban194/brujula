import { join } from "node:path";

/**
 * Server configuration. Secrets (ADMIN_TOKEN) come from the environment only —
 * never hard-coded for production. Data paths default to the bundled `data/`
 * folder at the project root.
 */
const root = process.cwd();

export const config = {
  csvPath: process.env.CSV_PATH || join(root, "data", "calles_de_medellin_con_acoso.csv"),
  reportsSeedPath:
    process.env.REPORTS_PATH || join(root, "data", "community_reports_seed.json"),
  /** Writable copy used in dev/local; ignored when the FS is read-only (Vercel). */
  reportsRuntimePath: join(root, "data", "community_reports.json"),
  adminToken: process.env.ADMIN_TOKEN || "brujula-admin-2025",
  riskOverlayWeight: Number(process.env.RISK_OVERLAY_WEIGHT ?? "0.3"),
} as const;
