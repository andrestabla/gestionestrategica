import { NextResponse } from "next/server";
import { withTenant } from "../../../_helpers";
import { itineraryFileOf } from "@/server/store";
import { getObject, signedUrl, materialDisposition } from "@/server/storage";
import { fileKindOf, FILE_TYPES } from "@/lib/itinerario";

// GET /api/td/itinerario/material/:id — el archivo del material (con sesión): el PDF en línea, el PowerPoint como descarga; un enlace redirige a su URL.
export const GET = withTenant(async (_req: Request, { params }: { params: Promise<{ id: string }> }, user) => {
  const { id } = await params;
  const f = itineraryFileOf(id);
  if (!f) return NextResponse.json({ error: "El material no existe." }, { status: 404 });
  const kind = fileKindOf(f);
  if (kind === "link") return NextResponse.redirect(f.url!, 307);
  const type = FILE_TYPES[kind];
  const disposition = materialDisposition(f.name, type.ext as "pdf" | "pptx");
  // en producción (R2) el navegador descarga del bucket con un enlace firmado de 10 minutos; la función no transporta el archivo
  const direct = await signedUrl("materiales", `${user.company!.slug}/${id}.${type.ext}`, { mime: type.mime, disposition });
  if (direct) return NextResponse.redirect(direct, { status: 307, headers: { "Cache-Control": "private, no-store" } });
  const buf = await getObject("materiales", `${user.company!.slug}/${id}.${type.ext}`);
  if (!buf) return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type.mime, "Content-Disposition": materialDisposition(f.name, type.ext as "pdf" | "pptx"), "Cache-Control": "private, max-age=300" } });
});
