import { NextResponse } from "next/server";
import { crearSolicitud } from "@/server/store";
import { avisarSolicitud } from "@/server/solicitudes";
import { originOf } from "@/app/api/td/convencion/acceso/route";
import { frenado, ipDe } from "@/server/freno";

// POST /api/auth/solicitud-codigo { name, company, industry, country, email, phone?, source, scope, consent }
// Formulario público «Solicitar un código». Guarda la solicitud, avisa por correo al equipo y deja la decisión
// al administrador o al advisor. No dice si el correo ya tiene cuenta: eso se resuelve al aprobar.
// Frenos contra el abuso: un campo trampa que las personas no ven, un tope por dirección y otro de la plataforma.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "No se pudo leer la solicitud." }, { status: 400 });
  // campo trampa: un formulario automático lo llena; se responde como si todo hubiera salido bien y no se guarda nada
  if (typeof body.sitio === "string" && body.sitio.trim()) return NextResponse.json({ ok: true });
  if (frenado(`solicitud:${ipDe(req)}`, 5, 3_600_000)) return NextResponse.json({ error: "Ya enviaste varias solicitudes. Inténtalo de nuevo en una hora." }, { status: 429 });
  const r = await crearSolicitud(body);
  if (!r.ok) return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}) }, { status: r.status });
  if (!r.repetida) {
    const aviso = await avisarSolicitud(r.solicitud, originOf(req));
    if (!aviso.ok) console.error("[4shine] la solicitud de código quedó en la bandeja, pero el aviso por correo falló:", aviso.error);
  }
  return NextResponse.json({ ok: true, correo: r.solicitud.email, repetida: r.repetida }, { status: r.repetida ? 200 : 201 });
}
