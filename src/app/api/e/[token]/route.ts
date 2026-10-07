import { NextResponse } from "next/server";
import { verifySurveyToken } from "@/lib/public-token";
import { saveF2Response, hydrateCompanies, companyBySlug } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";

// POST /api/e/<slug>-<token> — recibe una respuesta anónima de la Fuente 2.
// Sin sesión: el acceso lo da el token firmado del enlace de la empresa.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  await hydrateCompanies();
  const { token } = await params;
  const [slug, ...rest] = token.split("-");
  const company = companyBySlug(slug);
  if (!company?.active || !verifySurveyToken(slug, rest.join("-"))) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.r) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  return inTenant(slug, async () => {
    const result = saveF2Response({ r: body.r, area: body.area, abierta: body.abierta });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, total: result.total });
  });
}
