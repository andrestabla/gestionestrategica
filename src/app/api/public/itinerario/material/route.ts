import { NextResponse } from "next/server";
import { inTenant } from "@/app/api/td/_helpers";
import { hydrateCompanies, companyBySlug, itineraryFileOf } from "@/server/store";
import { getObject, pdfDisposition } from "@/server/storage";
import { TOKEN_RE, FILE_ID_RE } from "@/lib/itinerario";

// GET /<empresa>/api/public/itinerario/material?token=&id= — el PDF de un
// material del itinerario publicado, sin sesión; el token del enlace autoriza.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const tenant = req.headers.get("x-tenant") ?? u.searchParams.get("tenant") ?? "";
  const token = u.searchParams.get("token") ?? "", id = u.searchParams.get("id") ?? "";
  if (!TOKEN_RE.test(token) || !FILE_ID_RE.test(id)) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const f = await inTenant(c.slug, async () => itineraryFileOf(id, token));
  if (!f) return NextResponse.json({ error: "El itinerario no está publicado o el material no existe." }, { status: 404 });
  const buf = await getObject("materiales", `${c.slug}/${id}.pdf`);
  if (!buf) return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": pdfDisposition(f.name), "Cache-Control": "public, max-age=300" } });
}
