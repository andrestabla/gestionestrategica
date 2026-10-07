import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { surveyToken } from "@/lib/public-token";
import { INSTITUTION } from "@/data/demo";
import { getF2Responses } from "@/server/store";

// GET /api/td/f2 — enlace anónimo de la encuesta y conteo de respuestas recibidas.
// Solo advisor, líder y admin ven el enlace; los agregados nunca bajan a una
// respuesta individual con nombre (no existe tal cosa).
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const canLink = ["CONSULTOR", "LIDER", "ADMIN"].includes(user.role);
  const origin = new URL(req.url).origin;
  const all = getF2Responses();
  const byArea: Record<string, number> = {};
  for (const r of all) byArea[r.area ?? "Sin área"] = (byArea[r.area ?? "Sin área"] ?? 0) + 1;
  return NextResponse.json({
    url: canLink ? `${origin}/e/${INSTITUTION.slug}-${surveyToken(INSTITUTION.slug)}` : null,
    total: all.length,
    byArea,
    latest: all.at(-1)?.at ?? null,
    open: canLink ? all.map((r) => r.abierta).filter(Boolean) : [],
  });
}
