import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/server/admin-auth";
import { getState } from "@/lib/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ detail: "Token inválido" }, { status: 401 });
  }
  return NextResponse.json(getState().reportes);
}
