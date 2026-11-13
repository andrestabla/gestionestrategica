import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { accessLinks, updateAccess, flushOrError } from "@/server/store";
import { accessUrl } from "@/lib/acceso";

// Origen público (detrás de Vercel llega en x-forwarded-*).
/** Origen con el que se arman los enlaces que salen de la plataforma (correos, QR, enlaces públicos). En producción
    solo se acepta el dominio propio o los que asigna el despliegue; si la petición dice otro (una cabecera Host o
    X-Forwarded-Host falsificada), se usa el dominio propio. Así un correo de restablecimiento nunca lleva a otro sitio. */
const SITIO = (process.env.SITIO_ORIGEN?.trim() || "https://gestionestrategica.io").replace(/\/$/, "");
export function originOf(req: Request): string {
  const h = req.headers; const host = (h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host).trim().toLowerCase();
  if (process.env.NODE_ENV !== "production") return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const propios = [SITIO.replace(/^https?:\/\//, ""), process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map((x) => String(x).toLowerCase());
  return propios.includes(host) || propios.includes(host.replace(/^www\./, "")) ? `https://${host}` : SITIO;
}

// GET /api/td/convencion/acceso — enlaces de acceso de las cinco secciones
// (token, rol, URL del QR y si está activo). POST { section, regenerate?, role?, enabled? } los cambia:
// enabled false desactiva el QR (nadie entra, ni por la URL corta) hasta volver a activarlo.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const r = accessLinks(user);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const origin = originOf(req), slug = user.company!.slug;
  return NextResponse.json({ access: r.access.map((a) => ({ ...a, url: accessUrl(origin, slug, a.token) })) });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.section) return NextResponse.json({ error: "Falta la sección" }, { status: 400 });
  const r = updateAccess(user, body.section, { regenerate: !!body.regenerate, role: body.role, enabled: typeof body.enabled === "boolean" ? body.enabled : undefined });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const guardado = await flushOrError(); if (guardado) return NextResponse.json({ error: guardado }, { status: 500 });
  const origin = originOf(req), slug = user.company!.slug;
  return NextResponse.json({ access: r.access.map((a) => ({ ...a, url: accessUrl(origin, slug, a.token) })) });
});
