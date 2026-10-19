import { NextResponse } from "next/server";
import { z } from "zod";
import { inTenant } from "@/app/api/td/_helpers";
import { accessUser, companyBySlug, hydrateCompanies, flushOrError } from "@/server/store";
import { setSession } from "@/lib/session";
import { sectionPath } from "@/lib/acceso";

const Body = z.object({ tenant: z.string().max(40), token: z.string().min(16).max(64), name: z.string().max(120), email: z.string().max(160), consent: z.boolean().optional(), responsibleId: z.string().max(40).optional(), entryRole: z.string().max(16).optional() });

// POST /api/auth/acceso — entrada por el QR de una sección: identifica (o
// crea una sola vez) al usuario en la empresa y abre su sesión.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const { tenant, token, name, email, consent, responsibleId, entryRole } = parsed.data;
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) return NextResponse.json({ error: "La empresa no existe o no está activa." }, { status: 404 });
  // la cuenta nueva se confirma cuando la base ya la tiene: su siguiente petición puede atenderla otra instancia
  const r = await inTenant(c.slug, async () => { const a = await accessUser(token, { name, email, consent, responsibleId, entryRole }); if (a.ok) { const e = await flushOrError(); if (e) return { ok: false as const, status: 500, error: e }; } return a; });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  await setSession(r.user);
  return NextResponse.json({ ok: true, user: r.user, created: r.created, next: sectionPath(c.slug, r.section) });
}
