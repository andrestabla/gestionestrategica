import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { tourOf, setTour } from "@/server/store";
import { tourAplica } from "@/lib/tour";
import { can } from "@/lib/permissions";

// GET /api/td/tour — el tour guiado de la empresa, si se le muestra solo a esta sesión y si puede editarlo.
// PUT /api/td/tour { tour | null } — guarda (o elimina) el tour; lo administra el equipo consultor (manage_users).
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const tour = tourOf() ?? null;
  return NextResponse.json({ tour, aplica: tourAplica(tour, user), lectura: !!user.lectura, puedeEditar: can(user, "manage_users") });
});

export const PUT = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body || !("tour" in body)) return NextResponse.json({ error: "Cuerpo inválido: falta el tour." }, { status: 400 });
  const r = setTour(user, body.tour);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ tour: r.tour ?? null });
});
