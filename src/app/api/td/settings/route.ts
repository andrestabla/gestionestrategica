import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { can } from "@/lib/permissions";
import {
  getIntegrationsMasked, setIntegration, getBranding, setBranding,
  getBrandingHistory, type IntegrationKey } from "@/server/store";
import { sendMail } from "@/server/mail";

// GET /api/td/settings — configuración de administración.
// branding: cualquier sesión (el shell lo aplica); integraciones: solo
// quien administra (secretos siempre enmascarados).
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const admin = can(user, "manage_platform");
  return NextResponse.json({
    branding: getBranding(),
    integrations: admin ? getIntegrationsMasked() : null,
    brandingHistory: admin ? getBrandingHistory().slice(0, 30) : null,
  });
});

// POST { integration: { key, enabled?, fields? } } | { branding: {…} }
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  if (body.integration?.key === "ses" && body.integration.test) {
    if (!can(user, "manage_platform")) return NextResponse.json({ error: "Solo el administrador de la plataforma prueba el envío." }, { status: 403 });
    const r = await sendMail({ to: user.email, subject: "Prueba de envío · 4Shine Empresas (Amazon SES)", text: `Hola ${user.name},\n\nEste es un correo de prueba enviado desde Administración → Integraciones de la plataforma de gestión estratégica. Si lo recibes, el correo transaccional (recuperación de contraseña, notificaciones) está operativo.\n\n4Shine Empresas · Algoritmo T` });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 503 });
    return NextResponse.json({ ok: true, message: `Correo de prueba enviado a ${user.email} (id ${r.id ?? "—"}).` });
  }
  if (body.integration?.key) {
    const { key, enabled, fields } = body.integration;
    const result = setIntegration(user, key as IntegrationKey, { enabled, fields });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ integrations: getIntegrationsMasked() });
  }
  if (body.branding) {
    const result = setBranding(user, body.branding);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ branding: result.branding });
  }
  return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
});
