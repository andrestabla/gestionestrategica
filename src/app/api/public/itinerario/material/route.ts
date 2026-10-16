import { NextResponse } from "next/server";
import { inTenant } from "@/app/api/td/_helpers";
import { hydrateCompanies, companyBySlug, itineraryFileOf } from "@/server/store";
import { getObject, signedUrl, materialDisposition } from "@/server/storage";
import { TOKEN_RE, FILE_ID_RE, fileKindOf, FILE_TYPES } from "@/lib/itinerario";

// GET /<empresa>/api/public/itinerario/material?token=&id= — el archivo de un
// material del itinerario publicado, sin sesión; el token del enlace autoriza.
// El PDF se abre en línea, el PowerPoint se descarga y un enlace redirige.
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
  const kind = fileKindOf(f);
  if (kind === "link") return NextResponse.redirect(f.url!, 307);
  const type = FILE_TYPES[kind];
  const disposition = materialDisposition(f.name, type.ext as "pdf" | "pptx");
  const direct = await signedUrl("materiales", `${c.slug}/${id}.${type.ext}`, { mime: type.mime, disposition });
  if (direct) return NextResponse.redirect(direct, { status: 307, headers: { "Cache-Control": "private, no-store" } });
  const buf = await getObject("materiales", `${c.slug}/${id}.${type.ext}`);
  if (!buf) return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type.mime, "Content-Disposition": materialDisposition(f.name, type.ext as "pdf" | "pptx"), "Cache-Control": "public, max-age=300" } });
}
