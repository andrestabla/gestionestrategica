import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { verificarPersistencia } from "@/server/store";
import { can } from "@/lib/permissions";

// GET /api/td/persistencia[?detalle=1] — lee la empresa directamente de la base y la compara con lo que la plataforma
// muestra: prioridades, objetivos, resultados clave, iniciativas, validaciones, decisiones, calificaciones, metas y
// autoevaluaciones. Para el advisor, el líder y el administrador.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog") || user.role === "DIRECTIVO") return NextResponse.json({ error: "La verificación la consulta el advisor, el líder o el administrador." }, { status: 403 });
  const r = await verificarPersistencia(new URL(req.url).searchParams.get("detalle") === "1");
  if (!("secciones" in r)) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json(r);
});
