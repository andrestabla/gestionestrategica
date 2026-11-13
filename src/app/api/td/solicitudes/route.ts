import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { listarSolicitudes, decidirSolicitud } from "@/server/store";
import { enviarCodigoAcceso } from "@/server/codigos";
import { originOf } from "@/app/api/td/convencion/acceso/route";
import { formatoCodigo } from "@/lib/codigos";

// Solicitudes de código de acceso (administrador y advisor).
// GET   /api/td/solicitudes — las pendientes y las que ya decidió quien consulta (el admin ve todas).
// PATCH /api/td/solicitudes { id, accion: "aprobar", scope? } — genera el código a nombre de quien aprueba y lo envía.
// PATCH /api/td/solicitudes { id, accion: "rechazar", note? } — la cierra; la nota es interna y no se envía a nadie.
const puede = (role: string) => role === "ADMIN" || role === "CONSULTOR";
const NO = () => NextResponse.json({ error: "Las solicitudes de código las decide el administrador o el advisor." }, { status: 403 });

export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NO();
  const solicitudes = await listarSolicitudes(user);
  return NextResponse.json({ solicitudes, pendientes: solicitudes.filter((s) => s.status === "pendiente").length });
});

export const PATCH = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NO();
  const body = await req.json().catch(() => null) as { id?: unknown; accion?: unknown; scope?: unknown; note?: unknown } | null;
  if (body?.accion !== "aprobar" && body?.accion !== "rechazar") return NextResponse.json({ error: "Indica la acción: aprobar o rechazar." }, { status: 400 });
  const r = await decidirSolicitud(user, String(body.id ?? ""), body.accion, { scope: body.scope, note: body.note });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  if (!r.codigo) return NextResponse.json({ solicitud: r.solicitud });
  const e = await enviarCodigoAcceso(r.codigo, originOf(req));
  // la solicitud queda aprobada aunque el correo falle: el código se puede reenviar o copiar desde la lista de códigos
  return NextResponse.json({ solicitud: r.solicitud, codigo: formatoCodigo(r.codigo.code), enviado: e.ok, ...(e.ok ? {} : { aviso: `La solicitud quedó aprobada y el código se generó, pero el correo no se pudo enviar: ${e.error}` }) });
});
