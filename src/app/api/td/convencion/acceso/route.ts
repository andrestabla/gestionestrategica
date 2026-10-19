import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { accessLinks, updateAccess, flushOrError } from "@/server/store";
import { accessUrl } from "@/lib/acceso";

// Origen público (detrás de Vercel llega en x-forwarded-*).
export function originOf(req: Request): string {
  const h = req.headers; const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// GET /api/td/convencion/acceso — enlaces de acceso de las cinco secciones
// (token, rol y URL del QR). POST { section, regenerate?, role? } los cambia.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const r = accessLinks(user);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const origin = originOf(req), slug = user.company!.slug;
  return NextResponse.json({ access: r.access.map((a) => ({ ...a, url: accessUrl(origin, slug, a.token) })) });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.section) return NextResponse.json({ error: "Falta la sección" }, { status: 400 });
  const r = updateAccess(user, body.section, { regenerate: !!body.regenerate, role: body.role });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const guardado = await flushOrError(); if (guardado) return NextResponse.json({ error: guardado }, { status: 500 });
  const origin = originOf(req), slug = user.company!.slug;
  return NextResponse.json({ access: r.access.map((a) => ({ ...a, url: accessUrl(origin, slug, a.token) })) });
});
