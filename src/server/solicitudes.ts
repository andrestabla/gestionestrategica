// Solicitudes de código de acceso: aviso por correo al buzón del equipo cuando llega una solicitud.

import { sendMail } from "@/server/mail";
import { correoSolicitudNueva, DESTINO_SOLICITUDES, type SolicitudCodigo } from "@/lib/solicitudes";

/** Buzón que recibe los avisos; se puede cambiar con SOLICITUDES_CORREO sin tocar el código. */
export const destinoSolicitudes = () => process.env.SOLICITUDES_CORREO?.trim() || DESTINO_SOLICITUDES;
/** Bandeja donde el administrador o el advisor decide la solicitud. */
export const enlaceSolicitudes = (origin: string) => `${origin}/panel/admin/codigos`;

/** Avisa al equipo que hay una solicitud nueva. Si el correo falla, la solicitud ya quedó guardada en la bandeja. */
export async function avisarSolicitud(s: SolicitudCodigo, origin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = destinoSolicitudes();
  // en desarrollo el aviso sale por la consola del servidor y no se envía ningún correo, salvo que se pida con CODIGO_POR_CORREO=on
  if (process.env.NODE_ENV !== "production" && process.env.CODIGO_POR_CORREO !== "on") {
    console.log(`[4shine] solicitud de código (desarrollo; no se envía correo a ${to}): ${s.name} · ${s.company} · ${s.email} · ${s.scope.join("+")}`);
    return { ok: true };
  }
  const m = correoSolicitudNueva(s, enlaceSolicitudes(origin));
  const sent = await sendMail({ to, subject: m.subject, text: m.text, html: m.html }, { kind: "solicitud-codigo", by: "sistema", companySlug: null });
  return sent.ok ? { ok: true } : { ok: false, error: sent.error };
}
