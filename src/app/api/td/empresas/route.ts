import { NextResponse, after } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies, hydrateFromDb, listCompanies, createCompany, updateCompany, deleteCompany, sesionVigente, fichaPublica } from "@/server/store";
import { runWithTenant } from "@/server/tenant";
import { investigarIndustria } from "@/server/inteligencia-base";
import { iaDisponible } from "@/server/ia";

// /api/td/empresas — administración de empresas (tenants): solo el admin de
// plataforma. GET lista (todos los roles ven la propia); POST crea; PATCH
// edita o desactiva; DELETE elimina con todos sus datos.
// crear una empresa dispara, después de responder, la investigación de su industria
export const maxDuration = 300;

export async function GET() {
  await hydrateCompanies();
  const user = await getSession();
  if (!user || !(await sesionVigente(user)).ok) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  // la ficha va sin los tokens de acceso ni el itinerario del organizador: cada uno tiene su propia ruta, con permiso
  const all = listCompanies().map((c) => fichaPublica(c));
  const companies = can(user, "manage_companies") ? all : all.filter((c) => c.slug === user.company?.slug);
  return NextResponse.json({ companies, active: user.company?.slug ?? null });
}

export async function POST(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user || !(await sesionVigente(user)).ok) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "Falta el nombre de la empresa." }, { status: 400 });
  const r = await createCompany(user, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const { dbId: _d, ...company } = r.company; void _d;
  // la base de Inteligencia nace con el espacio: se investiga la industria de la empresa después de responder
  // (tarda uno o dos minutos). Si falla o la ficha aún no dice la industria, queda pendiente y se pide desde Inteligencia.
  const slug = r.company.slug;
  after(async () => {
    try { await runWithTenant(slug, async () => { await hydrateFromDb(); if (iaDisponible()) await investigarIndustria("plataforma"); }); }
    catch (e) { console.error("[4shine] base de inteligencia al crear la empresa:", (e as Error).message); }
  });
  return NextResponse.json({ company }, { status: 201 });
}

export async function PATCH(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user || !(await sesionVigente(user)).ok) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
  if (!user || !(await sesionVigente(user)).ok) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Falta el slug de la empresa." }, { status: 400 });
  const r = await deleteCompany(user, slug);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
