import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies, listCompanies, createCompany, updateCompany, deleteCompany } from "@/server/store";

// /api/td/empresas — administración de empresas (tenants): solo el admin de
// plataforma. GET lista (todos los roles ven la propia); POST crea; PATCH
// edita o desactiva; DELETE elimina con todos sus datos.
export async function GET() {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const all = listCompanies().map(({ dbId: _d, ...c }) => { void _d; return c; });
  const companies = can(user, "manage_companies") ? all : all.filter((c) => c.slug === user.company?.slug);
  return NextResponse.json({ companies, active: user.company?.slug ?? null });
}

export async function POST(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "Falta el nombre de la empresa." }, { status: 400 });
  const r = await createCompany(user, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const { dbId: _d, ...company } = r.company; void _d;
  return NextResponse.json({ company }, { status: 201 });
}

export async function PATCH(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.slug) return NextResponse.json({ error: "Falta el slug de la empresa." }, { status: 400 });
  const r = await updateCompany(user, String(body.slug), body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const { dbId: _d, ...company } = r.company; void _d;
  return NextResponse.json({ company });
}

export async function DELETE(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Falta el slug de la empresa." }, { status: 400 });
  const r = await deleteCompany(user, slug);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
