// Objetivo descartado: queda en el registro con su motivo, pero no avanza a resultados clave, iniciativas,
// calificación, capacidades ni cascada; quitar la marca lo reactiva.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, upsertInitiative, calificabilidad, catalog, elegiblesCapacidades, decideInitiative } from "../src/server/store";
import { okrObjectivesOf } from "../src/lib/convencion";
import { arbolCascada } from "../src/lib/cascada";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };

test("objetivo descartado: se conserva, no avanza y se puede reactivar", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Descarte SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("descarte-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Director comercial", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Aumentar la participación de mercado en Rx, medida por el share", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-02", perspective: "clientes", name: "Elevar la cobertura del panel médico, medida por la cobertura omnicanal", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertKpi(advisor, { code: "EXC-01", line: 1, cmi: "OE-02", name: "Cobertura omnicanal: de 12 % a 100 %", unit: "%", baseline: 12, target: 100, ownerId: "R01", definition: "Panel con contacto presencial y digital", formula: "cubiertos ÷ panel", frequency: "Trimestral", source: "CRM", due: "2027-T4" }).ok);
    const ini = upsertInitiative(advisor, { id: "in01", name: "Modelo omnicanal del panel médico", capability: "MUL-4", cmi: "OE-02", ownerId: "R01", kpi: "EXC-01", start: "2027-T1", end: "2027-T4", budgetPlanned: 100, objetivo: "Cubrir el panel con visita presencial y digital", metaResultado: "100 % de cobertura" });
    assert.ok(ini.ok, JSON.stringify(ini));
    // se descarta OE-02 con motivo
    const r = upsertObjective(advisor, { id: "OE-02", perspective: "clientes", name: "Elevar la cobertura del panel médico, medida por la cobertura omnicanal", kpis: [], lever: "EXC", horizon: "H1", descartado: true, motivoDescarte: "El comité lo funde con OE-01 (sesión del 9 de noviembre)" });
    assert.ok(r.ok);
    const o2 = catalog().objectives.find((o) => o.id === "OE-02")!;
    assert.equal(o2.descartado, true); assert.match(o2.motivoDescarte ?? "", /funde con OE-01/);
    assert.equal(catalog().objectives.length, 2, "sigue en el registro");
    assert.deepEqual(okrObjectivesOf(catalog(), "H1").map((o) => o.id), ["OE-01"], "no entra a resultados clave ni iniciativas");
    const cal = calificabilidad(catalog().initiatives.find((i) => i.id === "in01")!);
    assert.ok(!cal.ok && /descartado/.test(cal.motivo ?? ""), "su iniciativa no se califica");
    const arbol = arbolCascada({ levers: catalog().company.levers ?? [], objectives: catalog().objectives, kpis: catalog().kpis, initiatives: catalog().initiatives, metas: [], articulaciones: {}, decisions: {}, year: 2027, soloPortafolio: false });
    assert.ok(!arbol.some((p) => p.objetivos.some((o) => o.id === "OE-02")), "no aparece en la cascada");
    // reactivar
    assert.ok(upsertObjective(advisor, { id: "OE-02", perspective: "clientes", name: "Elevar la cobertura del panel médico, medida por la cobertura omnicanal", kpis: [], lever: "EXC", horizon: "H1", descartado: false, motivoDescarte: "ya no aplica" }).ok);
    const o2b = catalog().objectives.find((o) => o.id === "OE-02")!;
    assert.equal(o2b.descartado, undefined); assert.equal(o2b.motivoDescarte, undefined);
    assert.deepEqual(okrObjectivesOf(catalog(), "H1").map((o) => o.id).sort(), ["OE-01", "OE-02"]);
    void decideInitiative; void elegiblesCapacidades;
  });
});
