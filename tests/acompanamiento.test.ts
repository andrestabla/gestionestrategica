// Modo acompañamiento (node:test + tsx): modo válido, vocabulario, reglas de KR
// compartidas con la convención y calificación por sesión de prioridad.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import {
  createCompany, updateCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, upsertInitiative,
  evaluateInitiative, setPrioSession, catalog,
} from "../src/server/store";
import { isCompanyMode } from "../src/lib/acceso";
import { isAcompanamiento, isGuiada } from "../src/data/catalogo";
import { vocabOf, yearOfFirstHorizon, startQuarters } from "../src/lib/vocabulario";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@sf.example", name: "Directiva", role: "DIRECTIVO" };

test("acompañamiento: es un modo válido con su vocabulario y trimestres según el primer horizonte", () => {
  assert.ok(isCompanyMode("acompanamiento"));
  assert.ok(!isCompanyMode("otro"));
  const v = vocabOf({ mode: "acompanamiento" });
  assert.equal(v.lever, "Prioridad estratégica"); assert.equal(v.group, "Sponsor"); assert.equal(v.tabs.okr, "Resultados clave");
  assert.equal(vocabOf({ mode: "convencion" }).tabs.direccion, "Dirección 3x3");
  assert.equal(vocabOf({ mode: "completa" }).group, "Tribu");
  assert.ok(isAcompanamiento({ mode: "acompanamiento" }) && isGuiada({ mode: "acompanamiento" }) && isGuiada({ mode: "convencion" }) && !isGuiada({ mode: "completa" }));
  assert.equal(yearOfFirstHorizon([{ label: "H1 · 2026" }]), 2026);
  assert.deepEqual(startQuarters(2026)[0], ["2026-T1", "T1"]); assert.deepEqual(startQuarters(2026)[4], ["2027-T1", "Después"]);
});

test("acompañamiento: KR completo para vincular, máximo dos iniciativas por KR y calificación solo con la sesión de la prioridad abierta", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Acompañada SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2026", months: 12 }] })).ok);
  await runWithTenant("acompanada-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Sponsor comercial", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Crecer la demanda y el share", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    // KR incompleto (sin meta ni definición): no admite iniciativas
    assert.ok(upsertKpi(advisor, { code: "EXC-01", line: 1, cmi: "OE-01", name: "Share de mercado", unit: "%" }).ok);
    const ini = (n: number, kpi: string) => upsertInitiative(advisor, { id: `i${n}`, name: `Iniciativa ${n}`, capability: "DIR-3", cmi: "OE-01", ownerId: "R01", kpi });
    const bloqueada = ini(1, "EXC-01");
    assert.ok(!bloqueada.ok && bloqueada.status === 422);
    // KR completo: nombre con cifra, base, meta, dueño, plazo y definición
    assert.ok(upsertKpi(advisor, { code: "EXC-01", line: 1, cmi: "OE-01", name: "Share de mercado del 3,2 % al 3,4 % en 2026", unit: "%", baseline: 3.2, target: 3.4, ownerId: "R01", due: "2026-T4", definition: "Participación en el mercado farmacéutico colombiano medida por IQVIA." }).ok);
    assert.ok(ini(1, "EXC-01").ok); assert.ok(ini(2, "EXC-01").ok);
    const tercera = ini(3, "EXC-01");
    assert.ok(!tercera.ok && tercera.status === 422);
    // el comité no califica mientras la sesión de la prioridad (su sponsor) no esté abierta
    const ev = { scores: { D: 3, E: 3, M: 2, L: 3 }, type: {}, notes: {} };
    const cerrada = evaluateInitiative(directivo, "i1", ev);
    assert.ok(!cerrada.ok && cerrada.status === 403);
    assert.ok(setPrioSession(advisor, "R01", "abrir").ok);
    assert.ok(evaluateInitiative(directivo, "i1", ev).ok);
    const repetida = evaluateInitiative(directivo, "i1", ev);
    assert.ok(!repetida.ok && repetida.status === 409);
    assert.ok(evaluateInitiative(advisor, "i1", ev).ok, "el advisor califica sin depender de la sesión");
    assert.equal(catalog().company.mode, "acompanamiento");
  });
  assert.ok((await updateCompany(admin, "acompanada-sa", { mode: "completa" })).ok);
  resetStore();
});
