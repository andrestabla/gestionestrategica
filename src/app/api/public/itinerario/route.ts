import { NextResponse } from "next/server";
import { z } from "zod";
import { inTenant } from "@/app/api/td/_helpers";
import { hydrateCompanies, companyBySlug, publicItineraryOf, itineraryComments, addItineraryComment } from "@/server/store";
import { publicItinerary } from "@/lib/itinerario";

// Itinerario público (sin sesión): el token del enlace es la autorización.
// GET ?tenant&token → itinerario y comentarios. POST { tenant, token,
// momentId, kind, author, email?, text } → comentario firmado por quien escribe.
const Q = z.object({ tenant: z.string().max(40), token: z.string().min(16).max(64) });

async function resolve(tenant: string, token: string) {
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) return null;
  const it = await inTenant(c.slug, async () => publicItineraryOf(token));
  return it ? { company: c, itinerary: it } : null;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = Q.safeParse({ tenant: u.searchParams.get("tenant"), token: u.searchParams.get("token") });
  if (!q.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const r = await resolve(q.data.tenant, q.data.token);
  if (!r) return NextResponse.json({ error: "El itinerario no está publicado o el enlace no es válido." }, { status: 404 });
  const comments = await inTenant(r.company.slug, async () => itineraryComments());
  return NextResponse.json({ company: { name: r.company.name, shortName: r.company.shortName }, itinerary: publicItinerary(r.itinerary), comments });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const q = Q.safeParse({ tenant: body?.tenant, token: body?.token });
  if (!q.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const r = await resolve(q.data.tenant, q.data.token);
  if (!r) return NextResponse.json({ error: "El itinerario no está publicado o el enlace no es válido." }, { status: 404 });
  const res = await inTenant(r.company.slug, async () => addItineraryComment(body, { public: true }));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  const comments = await inTenant(r.company.slug, async () => itineraryComments());
  return NextResponse.json({ ok: true, comment: res.comment, comments });
}
