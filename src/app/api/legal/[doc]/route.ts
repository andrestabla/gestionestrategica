import { docLegal } from "@/lib/legal";
import { docLegalDocx, nombreDocx } from "@/server/legal-docx";

// GET /api/legal/<id> — el Word de una política o del modelo de un acuerdo, sin datos de ninguna empresa (público).
// El acuerdo lleno con los datos de una empresa se descarga desde Administración → Acuerdos (/api/td/acuerdos/<id>).
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ doc: string }> }) {
  const doc = docLegal((await params).doc);
  if (!doc) return Response.json({ error: "Documento no encontrado." }, { status: 404 });
  const buf = await docLegalDocx(doc);
  return new Response(new Uint8Array(buf), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nombreDocx(doc))}`,
    "Cache-Control": "public, max-age=3600",
  } });
}
