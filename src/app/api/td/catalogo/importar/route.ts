import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { updateCompany, upsertResponsible, upsertPerson, upsertObjective, upsertKpi, upsertInitiative, setFinancials, setTerritories, clearCompanyCatalog, catalog, flushOrError } from "@/server/store";
import { can } from "@/lib/permissions";

// POST /api/td/catalogo/importar — importa el catálogo de la empresa activa desde el JSON del conversor
// (misma forma que scripts/importar-catalogo.ts): company (ficha), responsibles, people, objectives, kpis,
// initiatives, financials, territories. { vaciar: true } borra antes el catálogo actual. Solo el administrador
// de la plataforma. Idempotente: repetirlo actualiza. Devuelve el conteo y los errores por entidad.
export const maxDuration = 60;

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_companies")) return NextResponse.json({ error: "Solo el administrador de la plataforma importa catálogos." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const data = body?.data ?? body;
  if (!data || typeof data !== "object") return NextResponse.json({ error: "Cuerpo inválido: se esperaba el JSON del catálogo." }, { status: 400 });
  const slug = user.company?.slug;
  if (!slug) return NextResponse.json({ error: "Elige una empresa para operar." }, { status: 409 });
  const errores: string[] = [];
  const check = (what: string, r: { ok: boolean; error?: string }) => { if (!r.ok) errores.push(`${what}: ${r.error}`); };
  if (data.company && typeof data.company === "object") {
    const { slug: _s, template: _t, ...patch } = data.company as Record<string, unknown>; void _s; void _t;
    const r = await updateCompany(user, slug, patch);
    if (!r.ok) errores.push(`empresa: ${r.error}`);
  }
  if (body?.vaciar === true) check("vaciar", await clearCompanyCatalog(user));
  for (const r of data.responsibles ?? []) check(`responsable ${r.id ?? r.cargo}`, upsertResponsible(user, r));
  for (const p of data.people ?? []) check(`persona ${p.id ?? p.name}`, upsertPerson(user, p));
  for (const o of data.objectives ?? []) check(`objetivo ${o.id}`, upsertObjective(user, { ...o, kpis: [] }));
  for (const k of data.kpis ?? []) check(`KPI ${k.code}`, upsertKpi(user, k));
  for (const o of data.objectives ?? []) check(`objetivo ${o.id}`, upsertObjective(user, o));
  for (const i of data.initiatives ?? []) check(`iniciativa ${i.id ?? i.name}`, upsertInitiative(user, i));
  if (data.financials !== undefined) check("finanzas", setFinancials(user, data.financials));
  if (Array.isArray(data.territories)) check("territorio", setTerritories(user, data.territories));
  const bad = await flushOrError(); if (bad) errores.push(`escritura en la base: ${bad}`);
  const c = catalog();
  return NextResponse.json({ ok: errores.length === 0, errores, conteo: { responsables: c.responsibles.length, personas: c.people.length, objetivos: c.objectives.length, kpis: c.kpis.length, iniciativas: c.initiatives.length } }, { status: errores.length ? 207 : 200 });
});
