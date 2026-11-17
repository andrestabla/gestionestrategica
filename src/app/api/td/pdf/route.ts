import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { catalog } from "@/server/store";
import { generarPdf, nombrePdf } from "@/server/pdf";
import { frenado } from "@/server/freno";

// GET /api/td/pdf?ruta=/panel/…&titulo=…[&hojas=1] — el informe en PDF, listo para descargar. El servidor abre la página
// del informe en modo documento con la sesión de quien lo pide (ve exactamente lo que esa persona puede ver) y la
// convierte en PDF. Solo las páginas de informe de esta lista: nada de rutas arbitrarias.
export const maxDuration = 60;
const INFORMES = /^\/panel\/(?:madurez\/informe|diagnostico\/informe|diagnostico\/autoevaluacion\/(?:resultado|informe)(?:\/[^/?#\s]{1,160})?|diagnostico\/test\/informe\/[^/?#\s]{1,160}|informe(?:\/[a-z-]{1,40})?)(?:\?[^#\s<>"'`]{0,1600})?$/;

export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const url = new URL(req.url);
  const ruta = url.searchParams.get("ruta") ?? "";
  if (!INFORMES.test(ruta)) return NextResponse.json({ error: "Ese informe no se puede descargar en PDF." }, { status: 400 });
  if (frenado(`pdf:${user.email.toLowerCase()}`, 12, 10 * 60_000)) return NextResponse.json({ error: "Demasiados PDF seguidos. Espera unos minutos." }, { status: 429 });
  const empresa = catalog().company.name;
  const titulo = (url.searchParams.get("titulo") ?? "Informe").replace(/\s+/g, " ").trim().slice(0, 90) || "Informe";
  const slug = user.company?.slug ?? catalog().company.slug;
  const destino = new URL(`/${slug}${ruta}`, url.origin);
  destino.searchParams.set("documento", "1");
  try {
    const pdf = await generarPdf({ url: destino.href, cookie: req.headers.get("cookie") ?? undefined, empresa, titulo, hojas: url.searchParams.get("hojas") === "1" });
    const fecha = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    const nombre = nombrePdf([empresa, titulo, fecha]);
    return new NextResponse(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Cache-Control": "no-store",
    } });
  } catch (e) {
    console.error("[4shine] PDF:", (e as Error).message);
    return NextResponse.json({ error: "No se pudo generar el PDF. Inténtalo de nuevo en un momento." }, { status: 500 });
  }
});
