import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies, companyBySlug } from "@/server/store";

// GET /api/auth/empresa?slug=&next= — el admin activa la empresa de la URL que
// abrió y vuelve a ella (lo usa el layout del panel al entrar por /empresa/…).
export async function GET(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const next = url.searchParams.get("next") ?? "";
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const c = companyBySlug(slug);
  if (!can(user, "manage_companies") || !c) return NextResponse.redirect(new URL(user.company ? `/${user.company.slug}/panel` : "/empresas", req.url));
  await setSession({ ...user, company: { slug: c.slug, name: c.name, shortName: c.shortName } });
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : `/${c.slug}/panel`;
  return NextResponse.redirect(new URL(safeNext, req.url));
}

// POST /api/auth/empresa { slug } — el admin de plataforma cambia la empresa
// activa de su sesión. Los demás roles están atados a su empresa.
export async function POST(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can(user, "manage_companies")) return NextResponse.json({ error: "Tu cuenta pertenece a una sola empresa." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const c = body?.slug ? companyBySlug(String(body.slug)) : null;
  if (!c) return NextResponse.json({ error: "La empresa no existe." }, { status: 404 });
  const session = { ...user, company: { slug: c.slug, name: c.name, shortName: c.shortName } };
  await setSession(session);
  return NextResponse.json({ ok: true, user: session });
}
