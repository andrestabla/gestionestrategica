// Una iniciativa mueve de 1 a 3 resultados clave: el principal y hasta dos adicionales.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, upsertInitiative, removeKpi, calificabilidad, catalog } from "../src/server/store";
import { initiativesOfKr, pasaAPriorizacion } from "../src/lib/convencion";
import { krsDeIniciativa, mueveKr } from "../src/data/cmi";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const kr = (code: string, cmi: string) => ({ code, line: 1, cmi, name: `Indicador ${code}: de 12 % a 100 %`, unit: "%", baseline: 12, target: 100, ownerId: "R01", definition: "Definición completa del indicador", formula: "a ÷ b", frequency: "Trimestral" as const, source: "CRM", due: "2027-T4" });
const ini = (id: string, kpi: string, krExtra?: string[]) => ({ id, name: `Iniciativa ${id} como entrega`, capability: "MUL-4", cmi: "OE-01", ownerId: "R01", kpi, ...(krExtra ? { krExtra } : {}), start: "2027-T1", end: "2027-T4", budgetPlanned: 100, objetivo: "Cubrir el panel con visita presencial y digital", metaResultado: "100 % de cobertura" });

test("helpers: principal primero, sin repetir y como máximo tres", () => {
  assert.deepEqual(krsDeIniciativa({ kpi: "A", krExtra: ["B", "A", "C", "D"] }), ["A", "B", "C"]);
  assert.deepEqual(krsDeIniciativa({ kpi: "", krExtra: [] }), []);
  assert.ok(mueveKr({ kpi: "A", krExtra: ["B"] }, "B")); assert.ok(!mueveKr({ kpi: "A" }, "B"));
});

test("iniciativa con varios resultados clave: mínimo uno, máximo tres, tope de dos iniciativas por KR", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Varios KR SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("varios-kr-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Director", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Elevar la cobertura del panel médico, medida por la cobertura", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-02", perspective: "clientes", name: "Aumentar la participación de mercado, medida por el share", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    for (const [code, o] of [["K1", "OE-01"], ["K2", "OE-01"], ["K3", "OE-02"], ["K4", "OE-02"]]) assert.ok(upsertKpi(advisor, kr(code, o)).ok);
    assert.ok(upsertKpi(advisor, { ...kr("K5", "OE-02"), target: 0 }).ok);   // incompleto: sin meta

    // tres resultados clave, incluso de otro objetivo
    const r = upsertInitiative(advisor, ini("in01", "K1", ["K2", "K3"])); assert.ok(r.ok, JSON.stringify(r));
    const i1 = catalog().initiatives.find((i) => i.id === "in01")!;
    assert.deepEqual(krsDeIniciativa(i1), ["K1", "K2", "K3"]); assert.equal(i1.cmi, "OE-01");
    assert.deepEqual(initiativesOfKr(catalog(), "K3").map((i) => i.id), ["in01"], "aparece en el KR adicional");
    assert.ok(pasaAPriorizacion(catalog(), i1));
    // cuatro no; inexistente no; incompleto no; adicional sin principal no
    const cuatro = upsertInitiative(advisor, ini("in02", "K1", ["K2", "K3", "K4"])); assert.ok(!cuatro.ok && /máximo 3/.test(cuatro.error));
    const nada = upsertInitiative(advisor, ini("in02", "K1", ["ZZ"])); assert.ok(!nada.ok && /no existe/.test(nada.error));
    const inc = upsertInitiative(advisor, ini("in02", "K1", ["K5"])); assert.ok(!inc.ok && /incompleto/.test(inc.error));
    const sinP = upsertInitiative(advisor, ini("in02", "", ["K2"])); assert.ok(!sinP.ok && /principal/.test(sinP.error));
    // el tope de dos iniciativas por KR cuenta también los adicionales
    assert.ok(upsertInitiative(advisor, ini("in02", "K4", ["K3"])).ok);
    const tope = upsertInitiative(advisor, ini("in03", "K3")); assert.ok(!tope.ok && /máximo 2 por KR/.test(tope.error));
    // editar sin enviar los adicionales los conserva; enviar la lista vacía los quita
    assert.ok(upsertInitiative(advisor, { ...ini("in01", "K1"), name: "Iniciativa in01 con otro nombre" }).ok);
    assert.deepEqual(catalog().initiatives.find((i) => i.id === "in01")!.krExtra, ["K2", "K3"]);
    assert.ok(upsertInitiative(advisor, ini("in01", "K1", [])).ok);
    assert.equal(catalog().initiatives.find((i) => i.id === "in01")!.krExtra, undefined);
    assert.ok(upsertInitiative(advisor, ini("in01", "K1", ["K2"])).ok);
    // un KR que una iniciativa mueve como adicional no se puede eliminar; si queda incompleto, la iniciativa no se califica
    const del = removeKpi(advisor, "K2"); assert.ok(!del.ok && /lo mueve/.test(del.error));
    assert.ok(upsertKpi(advisor, { ...kr("K2", "OE-01"), target: 0 }).ok);
    assert.match(calificabilidad(catalog().initiatives.find((i) => i.id === "in01")!).motivo ?? "", /adicional K2 incompleto/);
  });
});
