import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/server/admin-auth";
import { getState, persistReports } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Soft delete — flips `active` to false. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ detail: "Token inválido" }, { status: 401 });
  }
  const { id } = await params;
  const report = getState().reportes.find((r) => r.id === id);
  if (!report) {
    return NextResponse.json({ detail: "Reporte no encontrado" }, { status: 404 });
  }
  report.active = false;
  persistReports();
  return NextResponse.json({ ok: true });
}
