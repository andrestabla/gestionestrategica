// Códigos de acceso a los diagnósticos: envío del código por correo a la persona.

import { marcarCodigoEnviado } from "@/server/store";
import { sendMail } from "@/server/mail";
import { correoCodigoAcceso, formatoCodigo, type CodigoAcceso } from "@/lib/codigos";

/** Dirección de la página donde se usa el código, con el código ya puesto. */
export const enlaceCodigo = (origin: string, c: Pick<CodigoAcceso, "code">) => `${origin}/codigo?c=${formatoCodigo(c.code)}`;

/** Envía el código al correo de la persona y deja constancia del envío. */
export async function enviarCodigoAcceso(c: CodigoAcceso, origin: string): Promise<{ ok: true; codigo: CodigoAcceso } | { ok: false; error: string }> {
  // en desarrollo el código sale por la consola del servidor y no se envía ningún correo, salvo que se pida con CODIGO_POR_CORREO=on
  if (process.env.NODE_ENV !== "production" && process.env.CODIGO_POR_CORREO !== "on") {
    console.log(`[4shine] código de acceso a diagnósticos (desarrollo; no se envía correo) para ${c.email}: ${formatoCodigo(c.code)} · ${enlaceCodigo(origin, c)}`);
    return { ok: true, codigo: await marcarCodigoEnviado(c) };
  }
  const m = correoCodigoAcceso(c, enlaceCodigo(origin, c));
  const sent = await sendMail({ to: c.email, subject: m.subject, text: m.text, html: m.html }, { kind: "codigo-diagnostico", by: c.createdBy, companySlug: null });
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true, codigo: await marcarCodigoEnviado(c) };
}
