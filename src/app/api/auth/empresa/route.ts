import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies, companyBySlug } from "@/server/store";

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
