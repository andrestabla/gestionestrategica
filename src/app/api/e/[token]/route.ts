import { NextResponse } from "next/server";
import { verifySurveyToken } from "@/lib/public-token";
import { INSTITUTION } from "@/data/demo";
import { saveF2Response } from "@/server/store";

// POST /api/e/<slug>-<token> — recibe una respuesta anónima de la Fuente 2.
// Sin sesión: el acceso lo da el token firmado del enlace de la empresa.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [slug, ...rest] = token.split("-");
  if (slug !== INSTITUTION.slug || !verifySurveyToken(slug, rest.join("-"))) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.r) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const result = saveF2Response({ r: body.r, area: body.area, abierta: body.abierta });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, total: result.total });
}
