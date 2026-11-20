import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { acuerdosOf, catalog } from "@/server/store";
import { datosFirmaDe, docLegal, fechaLarga } from "@/lib/legal";
import { docLegalDocx, nombreDocx } from "@/server/legal-docx";
import { can } from "@/lib/permissions";

// GET /api/td/acuerdos/<confidencialidad|transmision|compromiso> — el Word del acuerdo lleno con los datos de la
// empresa activa, listo para revisión y firma. Lo descarga el equipo consultor.
export const runtime = "nodejs";

export const GET = withTenant(async (_req: Request, ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Los acuerdos los administra el equipo consultor." }, { status: 403 });
  const { doc: id } = await (ctx as { params: Promise<{ doc: string }> }).params;
  const doc = docLegal(id);
  if (!doc || !(doc.plantilla || doc.id === "compromiso")) return NextResponse.json({ error: "Acuerdo desconocido." }, { status: 404 });
  const c = catalog().company;
  const datos = doc.id === "compromiso" ? { fecha: fechaLarga(new Date().toISOString()) } : datosFirmaDe(c, acuerdosOf());
  const buf = await docLegalDocx(doc, datos);
  return new Response(new Uint8Array(buf), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nombreDocx(doc, doc.id === "compromiso" ? undefined : c.name))}`,
    "Cache-Control": "no-store",
  } });
});
