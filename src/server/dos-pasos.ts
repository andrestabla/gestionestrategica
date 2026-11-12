// Acceso en dos pasos: emite el código, lo envía al correo de la cuenta y deja la sesión pendiente hasta que la
// persona lo escriba. Lo usan el acceso con contraseña y el acceso por QR.

import { NextResponse } from "next/server";
import { emitirCodigo, anularCodigo } from "@/server/store";
import { sendMail } from "@/server/mail";
import { setPendiente, type SesionPendiente } from "@/lib/session";
import { correoCodigo, enmascarar, mensajeCodigo, CODIGO_MINUTOS, CODIGO_REENVIO_S } from "@/lib/dos-pasos";

/** Emite un código y lo envía. `ok: false` con `status` 429 si acaba de enviarse uno (el anterior sigue valiendo). */
export async function enviarCodigo(p: SesionPendiente): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const r = await emitirCodigo(p.user.email);
  if (!r.ok) return r;
  // en desarrollo el código sale por la consola del servidor y no se envía ningún correo (aunque el entorno local tenga
  // credenciales de correo), salvo que se pida con CODIGO_POR_CORREO=on; en producción siempre va al correo
  if (process.env.NODE_ENV !== "production" && process.env.CODIGO_POR_CORREO !== "on") { console.log(`[4shine] código de acceso (desarrollo; no se envía correo) para ${p.user.email}: ${r.code}`); return { ok: true }; }
  const m = correoCodigo(p.user.name, r.code, p.empresa);
  const sent = await sendMail({ to: p.user.email, subject: m.subject, text: m.text, html: m.html }, { kind: "codigo-acceso", by: "sistema", companySlug: p.user.company?.slug ?? null });
  if (sent.ok) return { ok: true };
  await anularCodigo(p.user.email);
  return { ok: false, status: 503, error: "No pudimos enviarte el código de acceso por correo. Inténtalo de nuevo en unos minutos o avisa al administrador de la plataforma." };
}

/** Respuesta del primer paso cuando la empresa exige el código: deja la sesión pendiente y le dice al cliente que lo pida. */
export async function pedirCodigo(p: SesionPendiente): Promise<NextResponse> {
  const r = await enviarCodigo(p);
  // 429: se envió uno hace menos de un minuto (p. ej. la persona recargó): ese sigue valiendo
  if (!r.ok && r.status !== 429) return NextResponse.json({ error: r.error }, { status: r.status });
  await setPendiente(p, CODIGO_MINUTOS);
  return NextResponse.json({ ok: true, paso: "codigo", correo: enmascarar(p.user.email), mensaje: mensajeCodigo(p.empresa), minutos: CODIGO_MINUTOS, reenvio: CODIGO_REENVIO_S, ...(r.ok ? {} : { aviso: "Te enviamos un código hace un momento: usa ese." }) });
}
