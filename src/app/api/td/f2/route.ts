import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { surveyToken } from "@/lib/public-token";

import { getF2Responses, catalog } from "@/server/store";

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
    url: canLink ? `${origin}/e/${catalog().company.slug}-${surveyToken(catalog().company.slug)}` : null,
    total: all.length,
    byArea,
    latest: all.at(-1)?.at ?? null,
    open: canLink ? all.map((r) => r.abierta).filter(Boolean) : [],
  });
});
