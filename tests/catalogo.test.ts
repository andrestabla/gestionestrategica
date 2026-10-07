// Editor del catálogo por empresa: validaciones, referencias entre entidades,
// códigos en secuencia, aislamiento y permisos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import {
  createCompany, deleteCompany, catalog, tenantView, resetStore,
  upsertResponsible, removeResponsible, upsertPerson, removePerson, upsertObjective, removeObjective,
  upsertKpi, removeKpi, upsertInitiative, removeInitiative, setFinancials, setTerritories, createTask,
} from "../src/server/store";
import { ANDINA_CATALOG } from "../src/data/catalogo";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@algoritmot.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR", company: { slug: "nueva-sa", name: "Nueva", shortName: "Nueva" } };
const junta: SessionUser = { email: "j@a.co", name: "Junta", role: "DIRECTIVO" };

test("una empresa vacía se construye desde cero en el orden recomendado", async () => {
  assert.ok((await createCompany(admin, { name: "Nueva SA", template: "vacia" })).ok);
  await runWithTenant("nueva-sa", async () => {
    const c = catalog();
    assert.equal(c.evidences.length, 68, "nace con las evidencias del mapa por verificar");
    assert.ok(!upsertResponsible(junta, { cargo: "Gerente", dependencia: "Gerencia", rolPlataforma: "LIDER" }).ok, "la junta no edita el catálogo");
    const r1 = upsertResponsible(advisor, { cargo: "Gerente general", dependencia: "Gerencia", rolPlataforma: "LIDER" });
    assert.ok(r1.ok && r1.id === "R01");
    const r2 = upsertResponsible(advisor, { cargo: "Jefe de operaciones", dependencia: "Operaciones", rolPlataforma: "RESPONSABLE" });
    assert.ok(r2.ok && r2.id === "R02");
    assert.ok(!upsertResponsible(advisor, { cargo: "X", dependencia: "Y", rolPlataforma: "LIDER" }).ok, "cargo demasiado corto");

    const p = upsertPerson(advisor, { name: "Ana Pérez", cargo: "Gerente general", dependencia: "Gerencia", email: "ana@nueva.example", responsibleId: "R01" });
    assert.ok(p.ok && p.id === "P01");
    assert.ok(!upsertPerson(advisor, { name: "Otra Persona", email: "ana@nueva.example", responsibleId: "R01" }).ok, "correo repetido");
    assert.ok(!upsertPerson(advisor, { name: "Otra Persona", responsibleId: "R99" }).ok, "responsable inexistente");

    const o = upsertObjective(advisor, { perspective: "financiera", name: "Crecer 20 % con margen", kpis: [], line: 1 });
    assert.ok(o.ok && o.id === "OE-01");
    assert.ok(!upsertObjective(advisor, { perspective: "otra", name: "Objetivo válido" }).ok, "perspectiva inválida");

    const k = upsertKpi(advisor, { code: "dir-01", line: 1, cmi: "OE-01", name: "Crecimiento de ventas", unit: "%", frequency: "Trimestral", ownerId: "R01", baseline: 5, target: 20, goodDirection: "up", series: [{ period: "2026-T1", value: 6 }, { period: "2025-T4", value: 5 }] });
    assert.ok(k.ok && k.code === "DIR-01", "el código se normaliza a mayúsculas");
    assert.deepEqual(catalog().kpis[0].series.map((s) => s.period), ["2025-T4", "2026-T1"], "la serie queda ordenada");
    assert.ok(!upsertKpi(advisor, { code: "DIR-02", name: "Sin unidad", cmi: "OE-01" }).ok, "unidad obligatoria");
    assert.ok(!upsertKpi(advisor, { code: "DIR-03", name: "Periodo malo", unit: "%", series: [{ period: "T1-2026", value: 1 }] }).ok, "periodo inválido");
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "financiera", name: "Crecer 20 % con margen", kpis: ["DIR-01"], line: 1 }).ok);

    const i = upsertInitiative(advisor, { name: "Plan trimestral con responsables únicos", cmi: "OE-01", capability: "EJE-2", ownerId: "R02", kpi: "DIR-01", horizon: "CORTO", start: "2026-T4", end: "2027-T2", actions: [{ name: "Definir prioridades", meta: "Plan aprobado", status: "PENDIENTE", quarter: "2026-T4" }], factors: [{ name: "Disciplina semanal", state: "VERDE", history: [] }] });
    assert.ok(i.ok && i.id === "i1");
    const ini = catalog().initiatives[0];
    assert.equal(ini.line, 3, "la capacidad sale de la dimensión");
    assert.ok(ini.framework.startsWith("F"), "el framework se deduce de la dimensión");
    assert.ok(!upsertInitiative(advisor, { name: "Sin dimensión válida", cmi: "OE-01", capability: "XX-9" }).ok);
    assert.ok(!upsertInitiative(advisor, { name: "Fechas invertidas", cmi: "OE-01", capability: "DIR-1", start: "2027-T2", end: "2026-T4" }).ok);

    // referencias: no se borra lo que otros usan
    assert.ok(!removeResponsible(advisor, "R01").ok, "R01 tiene KPI y persona");
    assert.ok(!removeObjective(advisor, "OE-01").ok, "OE-01 tiene KPI e iniciativa");
    assert.ok(!removeKpi(advisor, "DIR-01").ok, "DIR-01 lo usan objetivo e iniciativa");
    const t = createTask(advisor, { iniId: "i1", title: "Primera tarea del plan", desc: "Levantar las prioridades del trimestre con el comité", assigneeId: "P01", start: "2026-10-01", due: "2026-10-15" });
    assert.ok(t.ok, (t as { error?: string }).error);
    assert.ok(!removeInitiative(advisor, "i1").ok, "tiene tareas");
    assert.ok(!removePerson(advisor, "P01").ok, "tiene tareas asignadas");

    assert.ok(setFinancials(advisor, { year: 2025, revenue: 12000, revenuePrev: 10500, grossProfit: 3000, operatingProfit: 700, netProfit: 400, assets: 8000, liabilities: 4500, equity: 3500 }).ok);
    assert.ok(!setFinancials(advisor, { year: 2025, revenue: 0 }).ok);
    assert.ok(setTerritories(advisor, [{ name: "Antioquia", weight: 3, presence: "sede", reading: "Sede principal" }, { name: "Valle del Cauca", weight: 1, presence: "cobertura" }]).ok);
    assert.ok(!setTerritories(advisor, [{ name: "Antioquia" }, { name: "Antioquia" }]).ok, "departamento repetido");

    const v = tenantView();
    assert.equal(v.kpis.length, 1); assert.equal(v.initiatives.length, 1); assert.equal(v.catalog.people.length, 1);
    assert.equal(v.catalog.financials?.revenue, 12000);
  });
});

test("editar el catálogo de una empresa no toca la plantilla ni a otras empresas", async () => {
  const before = ANDINA_CATALOG.initiatives.length;
  await runWithTenant("nueva-sa", async () => {
    assert.ok(upsertInitiative(advisor, { name: "Segunda iniciativa de Nueva", cmi: "OE-01", capability: "DIR-1" }).ok);
    assert.equal(catalog().initiatives.length, 2);
  });
  assert.equal(ANDINA_CATALOG.initiatives.length, before);
  await runWithTenant("andina", async () => {
    resetStore();
    assert.equal(catalog().initiatives.length, 8);
    const adv: SessionUser = { ...advisor, company: { slug: "andina", name: "Andina", shortName: "Andina" } };
    assert.ok(upsertResponsible(adv, { id: "R01", cargo: "Gerente general (editado)", dependencia: "Gerencia general", rolPlataforma: "LIDER" }).ok);
    assert.equal(catalog().responsibles[0].cargo, "Gerente general (editado)");
    assert.equal(ANDINA_CATALOG.responsibles[0].cargo, "Gerente general", "la plantilla no se modifica");
    resetStore();
    assert.equal(catalog().responsibles[0].cargo, "Gerente general");
  });
  assert.ok((await deleteCompany(admin, "nueva-sa")).ok);
});
