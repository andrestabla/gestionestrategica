import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { surveyToken } from "@/lib/public-token";

import { getF2Responses, catalog, removeF2Response, flushOrError } from "@/server/store";
import { can } from "@/lib/permissions";
import { hasInstrument } from "@/lib/instrumentos";

// GET /api/td/f2 — enlace anónimo de la encuesta y conteo de respuestas recibidas.
// Solo advisor, líder y admin ven el enlace; los agregados nunca bajan a una
// respuesta individual con nombre (no existe tal cosa).
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const canLink = ["CONSULTOR", "LIDER", "ADMIN"].includes(user.role);
  const origin = new URL(req.url).origin;
  const all = getF2Responses();
  const byArea: Record<string, number> = {};
  for (const r of all) byArea[r.area ?? "Sin área"] = (byArea[r.area ?? "Sin área"] ?? 0) + 1;
  return NextResponse.json({
    enabled: hasInstrument(catalog().company, "f2"),
    url: canLink && hasInstrument(catalog().company, "f2") ? `${origin}/e/${catalog().company.slug}-${surveyToken(catalog().company.slug)}` : null,
    total: all.length,
    byArea,
    latest: all.at(-1)?.at ?? null,
    open: canLink ? all.map((r) => r.abierta).filter(Boolean) : [],
    // el administrador ve las respuestas por id (sin identidad: solo fecha y área) para poder borrar una
    respuestas: can(user, "undo_any") ? all.map((r) => ({ id: r.id, at: r.at, area: r.area ?? null })) : [],
  });
});

// DELETE /api/td/f2?id=F2-0001 — el administrador borra una respuesta anónima de la encuesta.
export const DELETE = withTenant(async (req: Request, _ctx: unknown, user) => {
  const r = removeF2Response(user, new URL(req.url).searchParams.get("id"));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError();
  if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true, total: r.total });
});
