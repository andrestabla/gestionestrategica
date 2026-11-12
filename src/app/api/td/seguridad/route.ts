import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { catalog, setTwoFactor, verificarCodigo } from "@/server/store";
import { can } from "@/lib/permissions";
import { setSession } from "@/lib/session";
import { mailConfigured } from "@/server/mail";
import { enviarCodigo } from "@/server/dos-pasos";
import { limpiarCodigo, codigoValido, enmascarar, CODIGO_DIGITOS, CODIGO_MINUTOS } from "@/lib/dos-pasos";

// Seguridad del acceso de la empresa.
// GET   /api/td/seguridad — si la empresa exige el acceso en dos pasos (código al correo) y si quien pregunta puede cambiarlo.
// PATCH /api/td/seguridad { twoFactor, codigo? } — lo activa o lo desactiva (quien administra los usuarios de la empresa).
//       Para activarlo, quien lo pide confirma antes un código enviado a su propio correo: así se comprueba que el
//       correo llega antes de exigírselo a toda la empresa, y su sesión queda verificada.
const correoListo = () => mailConfigured() || process.env.NODE_ENV !== "production";

export const GET = withTenant(async (_req: Request, _ctx: unknown, user) =>
  NextResponse.json({ twoFactor: catalog().company.twoFactor === true, puede: can(user, "manage_users"), correoListo: correoListo(), minutos: CODIGO_MINUTOS }));

export const PATCH = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Solo quien administra los usuarios de la empresa cambia la seguridad del acceso." }, { status: 403 });
  const body = await req.json().catch(() => null) as { twoFactor?: unknown; codigo?: unknown } | null;
  if (typeof body?.twoFactor !== "boolean") return NextResponse.json({ error: "Indica twoFactor: true o false." }, { status: 400 });
  const c = catalog().company;
  if (!body.twoFactor) {
    const r = setTwoFactor(user, false);
    return r.ok ? NextResponse.json({ ok: true, twoFactor: false }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  if (c.twoFactor === true) return NextResponse.json({ ok: true, twoFactor: true });
  if (!correoListo()) return NextResponse.json({ error: "El envío de correo no está configurado (Administración → Integraciones → AWS SES). Sin correo no se puede enviar el código." }, { status: 422 });
  // quien ya entró con el código (otra empresa lo exige) no necesita confirmarlo de nuevo
  if (!user.mfa) {
    const pendiente = { user, empresa: c.name };
    if (body.codigo === undefined) {
      const e = await enviarCodigo(pendiente);
      if (!e.ok && e.status !== 429) return NextResponse.json({ error: e.error }, { status: e.status });
      return NextResponse.json({ ok: true, paso: "codigo", correo: enmascarar(user.email), ...(e.ok ? {} : { aviso: "Te enviamos un código hace un momento: usa ese." }) }, { status: 202 });
    }
    const codigo = limpiarCodigo(body.codigo);
    if (!codigoValido(codigo)) return NextResponse.json({ error: `El código tiene ${CODIGO_DIGITOS} dígitos.` }, { status: 400 });
    const v = await verificarCodigo(user.email, codigo);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
  }
  const r = setTwoFactor(user, true);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  await setSession({ ...user, mfa: true });
  return NextResponse.json({ ok: true, twoFactor: true });
});
