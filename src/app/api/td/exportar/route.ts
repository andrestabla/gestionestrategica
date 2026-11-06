import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { documentoDecisiones, esModuloExport } from "@/server/exportar";
import { documentoPdf } from "@/server/exportar-pdf";
import { documentoDocx } from "@/server/exportar-docx";
import { documentoXlsx } from "@/server/exportar-xlsx";

// GET /api/td/exportar?modulo=objetivos&formato=pdf|docx|xlsx — «Descargar decisiones» del módulo, con la marca de la plataforma.
export const maxDuration = 60;
const TIPOS = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } as const;
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const url = new URL(req.url);
  const modulo = url.searchParams.get("modulo"); const formato = url.searchParams.get("formato") ?? "pdf";
  if (!esModuloExport(modulo)) return NextResponse.json({ error: "Módulo desconocido." }, { status: 400 });
  if (!(formato in TIPOS)) return NextResponse.json({ error: "Formato: pdf, docx o xlsx." }, { status: 400 });
  const doc = documentoDecisiones(modulo, user);
  let cuerpo: Uint8Array | Buffer;
  try { cuerpo = formato === "pdf" ? await documentoPdf(doc) : formato === "docx" ? await documentoDocx(doc) : await documentoXlsx(doc); }
  catch (e) { return NextResponse.json({ error: `No se pudo generar el archivo: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 }); }
  const nombre = `decisiones-${slug(doc.titulo)}-${slug(doc.empresa)}-${new Date().toISOString().slice(0, 10)}.${formato}`;
  return new Response(new Uint8Array(cuerpo), { status: 200, headers: { "Content-Type": TIPOS[formato as keyof typeof TIPOS], "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "no-store" } });
});
