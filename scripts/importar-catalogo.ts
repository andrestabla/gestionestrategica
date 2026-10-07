// Importa el catálogo de una empresa desde un JSON (la forma de las entidades
// del editor de catálogo) usando las mismas funciones del store, dentro del
// contexto de la empresa, con escritura a la base configurada en DATABASE_URL.
//
//   npx tsx scripts/importar-catalogo.ts <ruta.json> [--slug <slug>] [--crear]
//
// --crear: crea la empresa (vacía) si no existe, con los datos de `company`.
// Sin --crear, la empresa debe existir. Idempotente: repetirlo actualiza.
// Las referencias se cargan en orden: responsables → personas → objetivos (sin
// KPI) → KPI → objetivos (con KPI) → iniciativas → finanzas → territorio.

import { readFileSync } from "node:fs";
import { runWithTenant } from "../src/server/tenant";
import {
  hydrateCompanies, hydrateFromDb, companyBySlug, createCompany, updateCompany, catalog,
  upsertResponsible, upsertPerson, upsertObjective, upsertKpi, upsertInitiative, setFinancials, setTerritories,
} from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) { console.error("uso: tsx scripts/importar-catalogo.ts <ruta.json> [--slug <slug>] [--crear]"); process.exit(1); }
const slugArg = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined;
const crear = args.includes("--crear");
const data = JSON.parse(readFileSync(file, "utf8"));
const slug: string = slugArg ?? data.company?.slug;
const admin: SessionUser = { email: "admin@algoritmot.com", name: "Importación de catálogo", role: "ADMIN" };

async function main() {
  await hydrateCompanies();
  let c = companyBySlug(slug);
  if (!c) {
    if (!crear) throw new Error(`La empresa «${slug}» no existe (usa --crear).`);
    const r = await createCompany(admin, { ...data.company, slug, template: "vacia" });
    if (!r.ok) throw new Error(r.error);
    c = r.company;
    console.log("empresa creada:", c.slug);
  } else if (data.company) {
    const { slug: _s, template: _t, ...patch } = data.company; void _s; void _t;
    const r = await updateCompany(admin, slug, patch);
    if (!r.ok) throw new Error(r.error);
  }
  await runWithTenant(slug, async () => {
    await hydrateFromDb();
    const actor: SessionUser = { ...admin, company: { slug, name: c!.name, shortName: c!.shortName } };
    const check = (what: string, r: { ok: boolean; error?: string }) => { if (!r.ok) throw new Error(`${what}: ${r.error}`); };
    for (const r of data.responsibles ?? []) check(`responsable ${r.id ?? r.cargo}`, upsertResponsible(actor, r));
    for (const p of data.people ?? []) check(`persona ${p.id ?? p.name}`, upsertPerson(actor, p));
    for (const o of data.objectives ?? []) check(`objetivo ${o.id}`, upsertObjective(actor, { ...o, kpis: [] }));
    for (const k of data.kpis ?? []) check(`KPI ${k.code}`, upsertKpi(actor, k));
    for (const o of data.objectives ?? []) check(`objetivo ${o.id}`, upsertObjective(actor, o));
    for (const i of data.initiatives ?? []) check(`iniciativa ${i.id ?? i.name}`, upsertInitiative(actor, i));
    if (data.financials !== undefined) check("finanzas", setFinancials(actor, data.financials));
    if (Array.isArray(data.territories)) check("territorio", setTerritories(actor, data.territories));
    const cat = catalog();
    console.log(`importado en «${slug}»:`, cat.responsibles.length, "responsables ·", cat.people.length, "personas ·", cat.objectives.length, "objetivos ·", cat.kpis.length, "KPI ·", cat.initiatives.length, "iniciativas");
  });
  // dar tiempo a los write-through (fuera de una petición no hay after())
  await new Promise((r) => setTimeout(r, 3000));
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
