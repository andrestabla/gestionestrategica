import { NextResponse } from "next/server";
import { hydrateCompanies, companyBySlug } from "@/server/store";
import { verifyInformeToken, splitSignedLink } from "@/lib/public-token";
import { generarPdf, nombrePdf } from "@/server/pdf";
import { frenado, ipDe } from "@/server/freno";

// GET /api/r/pdf?t=<enlace firmado> — el informe ejecutivo compartido por enlace público (/r/…), en PDF. Sin sesión:
// vale lo mismo que el enlace (firma HMAC verificada antes de abrir nada) y con tope por dirección.
export const maxDuration = 60;
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const link = t.length <= 120 ? splitSignedLink(t) : null;
  if (!link || !/^[a-z0-9-]{2,80}$/.test(link.slug) || !/^[A-Za-z0-9_-]+$/.test(link.token)) return NextResponse.json({ error: "Enlace inválido." }, { status: 404 });
  await hydrateCompanies();
  const company = companyBySlug(link.slug);
  if (!company?.active || !verifyInformeToken(link.slug, link.token)) return NextResponse.json({ error: "Enlace inválido." }, { status: 404 });
  if (frenado(`pdf-publico:${ipDe(req)}`, 6, 10 * 60_000)) return NextResponse.json({ error: "Demasiados PDF seguidos. Espera unos minutos." }, { status: 429 });
  try {
    const pdf = await generarPdf({ url: new URL(`/r/${encodeURIComponent(t)}`, url.origin).href, empresa: company.name, titulo: "Informe ejecutivo del comité", hojas: true });
    const nombre = nombrePdf([company.name, "Informe ejecutivo del comité"]);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nombre.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`, "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[4shine] PDF público:", (e as Error).message);
    return NextResponse.json({ error: "No se pudo generar el PDF. Inténtalo de nuevo en un momento." }, { status: 500 });
  }
}
