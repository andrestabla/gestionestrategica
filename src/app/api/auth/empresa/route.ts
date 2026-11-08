import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies, companyBySlug, membershipOf } from "@/server/store";
import type { SessionUser } from "@/lib/session";

/** Sesión para operar en otra empresa: el admin conserva su rol; las demás cuentas toman el rol y el ámbito de su membresía allí. */
async function sesionEn(user: SessionUser, slug: string): Promise<SessionUser | null> {
  const c = companyBySlug(slug);
  if (!c) return null;
  const company = { slug: c.slug, name: c.name, shortName: c.shortName, mode: c.mode };
  if (can(user, "manage_companies")) return { ...user, company };
  if (!c.active) return null;
  const m = await membershipOf(user.email, slug);
  if (!m) return null;
  return { ...user, role: m.role, line: m.line, responsibleId: m.responsibleId, company };
}

// GET /api/auth/empresa?slug=&next= — el admin activa la empresa de la URL que
// abrió y vuelve a ella (lo usa el layout del panel al entrar por /empresa/…).
export async function GET(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const next = url.searchParams.get("next") ?? "";
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const session = await sesionEn(user, slug);
  if (!session) return NextResponse.redirect(new URL(user.company ? `/${user.company.slug}/panel` : "/empresas", req.url));
  await setSession(session);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : `/${slug}/panel`;
  return NextResponse.redirect(new URL(safeNext, req.url));
}

// POST /api/auth/empresa { slug } — el admin de plataforma cambia la empresa
// activa de su sesión. Los demás roles están atados a su empresa.
export async function POST(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const c = body?.slug ? companyBySlug(String(body.slug)) : null;
  if (!c) return NextResponse.json({ error: "La empresa no existe." }, { status: 404 });
  const session = await sesionEn(user, c.slug);
  if (!session) return NextResponse.json({ error: "Tu cuenta no pertenece a esa empresa." }, { status: 403 });
  await setSession(session);
  return NextResponse.json({ ok: true, user: session });
}
