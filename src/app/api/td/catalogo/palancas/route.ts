import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { getHistorialPalancas } from "@/server/store";
import { can } from "@/lib/permissions";

// GET /api/td/catalogo/palancas — historial de versiones de las prioridades (quien edita el catálogo), de la más reciente a la más antigua.
export const GET = withTenant(async (_req, _ctx, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "El historial lo ve quien edita las prioridades." }, { status: 403 });
  return NextResponse.json({ historial: getHistorialPalancas().map((v) => ({ id: v.id, at: v.at, by: v.by, motivo: v.motivo, nombres: v.levers.map((l) => l.name), n: v.levers.length })) });
});
