import { NextResponse } from "next/server";
import { withTenant } from "../../../_helpers";
import { acuerdosOf, setArchivoAcuerdo } from "@/server/store";
import { getObject, putObject, signedUrl, pdfDisposition } from "@/server/storage";
import { ACUERDO_CONFIDENCIALIDAD, CONTRATO_TRANSMISION, esAcuerdoId } from "@/lib/legal";
import { can } from "@/lib/permissions";

// Copia firmada de un acuerdo (PDF), en el almacenamiento bajo acuerdos/<empresa>/<acuerdo>.pdf.
// POST /api/td/acuerdos/<id>/firmado (multipart: file) — la carga o la reemplaza.
// GET  /api/td/acuerdos/<id>/firmado — la descarga (enlace firmado de corta duración cuando el almacenamiento es R2).
export const runtime = "nodejs";
const MAX = 15 * 1024 * 1024;
const VERSIONES = { confidencialidad: ACUERDO_CONFIDENCIALIDAD.version, transmision: CONTRATO_TRANSMISION.version } as const;

const docDe = async (ctx: unknown) => (await (ctx as { params: Promise<{ doc: string }> }).params).doc;

export const POST = withTenant(async (req: Request, ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Los acuerdos los administra el equipo consultor." }, { status: 403 });
  const doc = await docDe(ctx);
  if (!esAcuerdoId(doc)) return NextResponse.json({ error: "Acuerdo desconocido." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Adjunta el PDF firmado." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Máximo 15 MB." }, { status: 422 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!/\.pdf$/i.test(file.name) || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return NextResponse.json({ error: "La copia firmada debe ser un PDF." }, { status: 422 });
  const key = `${user.company!.slug}/${doc}.pdf`;
  await putObject("acuerdos", key, bytes, "application/pdf");
  const r = setArchivoAcuerdo(user, doc, { key, name: file.name.slice(0, 160), size: file.size }, VERSIONES[doc]);
  return r.ok ? NextResponse.json({ acuerdos: r.acuerdos }) : NextResponse.json({ error: r.error }, { status: r.status });
});

export const GET = withTenant(async (_req: Request, ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Los acuerdos los administra el equipo consultor." }, { status: 403 });
  const doc = await docDe(ctx);
  if (!esAcuerdoId(doc)) return NextResponse.json({ error: "Acuerdo desconocido." }, { status: 404 });
  const a = acuerdosOf()?.docs?.[doc]?.archivo;
  if (!a) return NextResponse.json({ error: "Aún no hay copia firmada." }, { status: 404 });
  const disp = pdfDisposition(a.name);
  const url = await signedUrl("acuerdos", a.key, { mime: "application/pdf", disposition: disp, expiresIn: 120 });
  if (url) return NextResponse.redirect(url);
  const buf = await getObject("acuerdos", a.key);
  if (!buf) return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disp, "Cache-Control": "no-store" } });
});
