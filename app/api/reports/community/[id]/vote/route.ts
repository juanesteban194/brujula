import { NextResponse } from "next/server";

import { getState, persistReports } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const vote = body?.vote as "confirm" | "deny" | undefined;
  if (vote !== "confirm" && vote !== "deny") {
    return NextResponse.json({ detail: "vote inválido" }, { status: 422 });
  }

  const report = getState().reportes.find((r) => r.id === id);
  if (!report) {
    return NextResponse.json({ detail: "Reporte no encontrado" }, { status: 404 });
  }

  report.votes[vote] = (report.votes[vote] ?? 0) + 1;

  // Auto-deactivate if > 3 votes and > 80% deny
  const total = report.votes.confirm + report.votes.deny;
  if (total > 3 && report.votes.deny / total > 0.8) {
    report.active = false;
  }

  persistReports();
  return NextResponse.json({ ok: true, votes: report.votes, active: report.active });
}
