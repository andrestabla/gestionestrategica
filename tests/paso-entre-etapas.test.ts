// Reglas de paso entre etapas en el acompañamiento: un objetivo sin prioridad no pasa a resultados clave
// y una iniciativa sin resultado clave no pasa a priorización ni recibe decisión de tiempo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, upsertInitiative, removeLever, decideInitiative, calificabilidad, catalog } from "../src/server/store";
import { okrObjectivesOf, objetivosSinPrioridad, pasaAPriorizacion } from "../src/lib/convencion";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const kr = (code: string, cmi: string) => ({ code, line: 1, cmi, name: `Cobertura del panel ${code}: de 12 % a 100 %`, unit: "%", baseline: 12, target: 100, ownerId: "R01", definition: "Panel con contacto presencial y digital", formula: "cubiertos ÷ panel", frequency: "Trimestral" as const, source: "CRM", due: "2027-T4" });

test("acompañamiento: sin prioridad no hay resultados clave; sin resultado clave no hay priorización", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Etapas SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("etapas-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Director comercial", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01" }, { id: "INN", name: "Innovación", order: 2, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Elevar la cobertura del panel médico, medida por la cobertura omnicanal", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-02", perspective: "clientes", name: "Aumentar el peso de los lanzamientos en la venta, medido por su participación", kpis: [], lever: "INN", horizon: "H1" }).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-03", perspective: "clientes", name: "Objetivo que el comité aún no ubica en ninguna prioridad", kpis: [], horizon: "H1" }).ok);

    // regla 1: OE-03 (sin prioridad) no pasa a resultados clave, ni en pantalla ni en el servidor
    assert.deepEqual(okrObjectivesOf(catalog(), "H1").map((o) => o.id), ["OE-01", "OE-02"]);
    assert.deepEqual(objetivosSinPrioridad(catalog(), "H1").map((o) => o.id), ["OE-03"]);
    const r3 = upsertKpi(advisor, kr("SIN-01", "OE-03")); assert.ok(!r3.ok && r3.status === 422 && /no está vinculado a una prioridad/.test(r3.error));
    assert.ok(upsertKpi(advisor, kr("EXC-01", "OE-01")).ok);
    assert.ok(upsertKpi(advisor, kr("INN-01", "OE-02")).ok);
    // al vincularlo a una prioridad, pasa
    assert.ok(upsertObjective(advisor, { id: "OE-03", perspective: "clientes", name: "Objetivo que el comité aún no ubica en ninguna prioridad", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertKpi(advisor, kr("EXC-02", "OE-03")).ok);
    // al eliminar una prioridad, sus objetivos quedan sin ella y dejan de pasar; sus KR existentes se pueden seguir editando
    assert.ok(removeLever(advisor, "INN").ok);
    assert.deepEqual(objetivosSinPrioridad(catalog(), "H1").map((o) => o.id), ["OE-02"]);
    assert.ok(!okrObjectivesOf(catalog(), "H1").some((o) => o.id === "OE-02"));
    assert.ok(upsertKpi(advisor, { ...kr("INN-01", "OE-02"), target: 90 }).ok, "editar un KR que ya existía no se bloquea");
    const nuevo = upsertKpi(advisor, kr("INN-02", "OE-02")); assert.ok(!nuevo.ok && nuevo.status === 422);

    // regla 2: iniciativa sin KR no pasa a priorización ni recibe decisión
    const base = { capability: "MUL-4", ownerId: "R01", start: "2027-T1", end: "2027-T4", budgetPlanned: 100, objetivo: "Cubrir el panel con visita presencial y digital", metaResultado: "100 % de cobertura" };
    const con = upsertInitiative(advisor, { id: "in01", name: "Modelo omnicanal del panel médico", cmi: "OE-01", kpi: "EXC-01", ...base }); assert.ok(con.ok, JSON.stringify(con));
    const c = catalog();
    c.initiatives.push({ ...c.initiatives.find((i) => i.id === "in01")!, id: "in02", name: "Iniciativa sin resultado clave", kpi: "" });
    c.initiatives.push({ ...c.initiatives.find((i) => i.id === "in01")!, id: "in03", name: "Iniciativa de un objetivo sin prioridad", cmi: "OE-02", kpi: "INN-01" });
    const ini = (id: string) => catalog().initiatives.find((i) => i.id === id)!;
    assert.ok(pasaAPriorizacion(catalog(), ini("in01"))); assert.ok(!pasaAPriorizacion(catalog(), ini("in02")));
    const d = decideInitiative(advisor, "in02", { decision: "BACKLOG", rationale: "sin KR" }); assert.ok(!d.ok && d.status === 422 && /no está vinculada a un resultado clave/.test(d.error));
    assert.match(calificabilidad(ini("in02")).motivo ?? "", /sin resultado clave/);
    // la iniciativa de un objetivo sin prioridad tampoco se califica
    assert.match(calificabilidad(ini("in03")).motivo ?? "", /no está vinculado a una prioridad/);
  });
});

test("fuera del acompañamiento las reglas de paso no aplican", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Completa SA", template: "vacia", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("completa-sa", async () => {
    assert.ok(upsertResponsible(admin, { id: "R01", cargo: "Gerente", dependencia: "Gerencia", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(upsertObjective(admin, { id: "OE-01", perspective: "clientes", name: "Objetivo sin palanca en una empresa en modo completo", kpis: [], horizon: "H1" }).ok);
    assert.deepEqual(okrObjectivesOf(catalog(), "H1").map((o) => o.id), ["OE-01"]);
    assert.ok(upsertKpi(admin, kr("GEN-01", "OE-01")).ok);
    assert.ok(pasaAPriorizacion(catalog(), { kpi: "" }));
  });
});
