import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  getIntegrationsMasked, setIntegration, getBranding, setBranding,
  getBrandingHistory, type IntegrationKey, hydrateFromDb } from "@/server/store";

// GET /api/td/settings — configuración de administración.
// branding: cualquier sesión (el shell lo aplica); integraciones: solo
// quien administra (secretos siempre enmascarados).
export async function GET() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const admin = can(user, "manage_platform");
  return NextResponse.json({
    branding: getBranding(),
    integrations: admin ? getIntegrationsMasked() : null,
    brandingHistory: admin ? getBrandingHistory().slice(0, 30) : null,
  });
}

// POST { integration: { key, enabled?, fields? } } | { branding: {…} }
export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

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
}
