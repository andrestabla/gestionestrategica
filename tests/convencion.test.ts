// Convención: palancas, objetivos por palanca y horizonte, calidad de OKR,
// cobertura de la evaluación y exportación del portafolio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { objectivesMatrix, okrChecks, evaluationCoverage, portfolioSummary, portfolioCsv } from "../src/lib/convencion";
import { consolidate } from "../src/lib/priorizacion";
import { resetStore, catalog, setLevers, parseLevers, upsertObjective, upsertKpi, createCompany } from "../src/server/store";
import { runWithTenant } from "../src/server/tenant";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const LEVERS = [{ id: "MS", name: "Market Share" }, { id: "FID", name: "Fidelización del cliente" }, { id: "MAD", name: "Madurez organizacional" }, { id: "MAR", name: "Margen (GMROI)", indicator: "GMROI" }];

test("palancas: hasta ocho, con id y nombre; el orden lo da la lista", () => {
  const r = parseLevers(LEVERS);
  assert.ok(r.ok && r.levers?.length === 4 && r.levers[3].order === 4 && r.levers[3].indicator === "GMROI");
  assert.ok(!parseLevers([{ id: "", name: "x" }]).ok);
  assert.ok(!parseLevers([{ id: "A", name: "Uno x" }, { id: "A", name: "Dos x" }]).ok);
});

test("objetivos: palanca y horizonte válidos; matriz palanca × horizonte y chequeos de OKR", async () => {
  resetStore();
  const c = await createCompany(admin, { name: "Convención SA", template: "vacia", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }, { id: "H2", label: "H2 · 2030", months: 36 }] });
  assert.ok(c.ok);
  await runWithTenant("convencion-sa", async () => {
    const actor: SessionUser = { ...admin, company: { slug: "convencion-sa", name: "Convención SA", shortName: "C" } };
    assert.ok(setLevers(actor, LEVERS).ok);
    assert.deepEqual(catalog().company.levers?.map((l) => l.id), ["MS", "FID", "MAD", "MAR"]);
    const bad = upsertObjective(actor, { id: "OE-01", perspective: "clientes", name: "Objetivo de prueba", kpis: [], lever: "ZZ" } as never);
    assert.ok(!bad.ok && bad.status === 422, "palanca inexistente");
    const badH = upsertObjective(actor, { id: "OE-01", perspective: "clientes", name: "Objetivo de prueba", kpis: [], horizon: "H9" } as never);
    assert.ok(!badH.ok && badH.status === 422, "horizonte inexistente");
    const ok = upsertObjective(actor, { id: "OE-01", perspective: "clientes", name: "Ganar participación en Guayaquil", kpis: [], lever: "MS", horizon: "H1", pillar: "Ecosistema de bienestar", desc: "Aspiración", indicator: "Share retail" } as never);
    assert.ok(ok.ok);
    const o = catalog().objectives.find((x) => x.id === "OE-01")!;
    assert.equal(o.lever, "MS"); assert.equal(o.horizon, "H1"); assert.equal(o.indicator, "Share retail");
    assert.ok(upsertObjective(actor, { id: "OE-02", perspective: "financiera", name: "Objetivo sin palanca aún", kpis: [], horizon: "H1" } as never).ok);
    const m = objectivesMatrix(catalog());
    assert.equal(m.cell("MS", "H1").length, 1); assert.equal(m.orphan.length, 1);
    // un KR completo y uno incompleto
    const r1 = upsertObjective(actor, { id: "R01", } as never); void r1;
    const resp = (await import("../src/server/store")).upsertResponsible(actor, { cargo: "Líder", dependencia: "Tribu", rolPlataforma: "RESPONSABLE" });
    assert.ok(resp.ok);
    assert.ok(upsertKpi(actor, { code: "KR-1", line: 1, cmi: "OE-01", name: "Participación de mercado", unit: "%", frequency: "Trimestral", ownerId: resp.id, baseline: 8, target: 10, goodDirection: "up", series: [], due: "2027-T4", definition: "Ventas propias / ventas del mercado × 100" } as never).ok, "KR completo");
    assert.ok(!upsertKpi(actor, { code: "KR-X", line: 1, cmi: "OE-01", name: "Plazo malo", unit: "%", frequency: "Trimestral", ownerId: resp.id, baseline: 1, target: 2, goodDirection: "up", series: [], due: "mañana" } as never).ok, "plazo inválido");
    assert.ok(upsertKpi(actor, { code: "KR-2", line: 1, cmi: "OE-01", name: "Sin meta ni plazo", unit: "%", frequency: "Trimestral", ownerId: "", baseline: 0, target: 0, goodDirection: "up", series: [] } as never).ok);
    // KR-2 sin plazo pasa a KPI de salud en cuanto el objetivo tiene un KR con plazo (KR-1)
    const { healthKpisOf, keyResultsOf } = await import("../src/lib/convencion");
    const o1 = catalog().objectives.find((x) => x.id === "OE-01")!;
    assert.deepEqual(keyResultsOf(catalog(), o1).map((k) => k.code), ["KR-1"]);
    assert.deepEqual(healthKpisOf(catalog(), o1).map((k) => k.code), ["KR-2"]);
    assert.ok(upsertKpi(actor, { code: "KR-2", line: 1, cmi: "OE-01", name: "Sin meta ni plazo", unit: "%", frequency: "Trimestral", ownerId: "", baseline: 0, target: 0, goodDirection: "up", series: [], due: "2027" } as never).ok);
    const issues = okrChecks(catalog(), "H1");
    assert.ok(issues.some((i) => i.kind === "objetivo-sin-kr" && i.ref === "OE-02"));
    assert.ok(issues.some((i) => i.kind === "objetivo-sin-palanca" && i.ref === "OE-02"));
    assert.ok(issues.some((i) => i.kind === "kr-incompleto" && i.ref === "KR-2" && /meta/.test(i.text) && /dueño/.test(i.text)));
    assert.ok(!issues.some((i) => i.kind === "kr-incompleto" && i.ref === "KR-1"));
    assert.ok(issues.some((i) => i.kind === "objetivo-pocos-kr" && i.ref === "OE-01") === false, "con dos KR con plazo ya no es «pocos»");
    assert.ok(issues.some((i) => i.kind === "kr-sin-iniciativa" && i.ref === "KR-1"));
  });
  resetStore();
});

test("cobertura de evaluación y resumen/exportación del portafolio", () => {
  const ev = (iniId: string, by: string) => ({ iniId, by, name: by, role: "LIDER" as const, scores: { D: 3 as const, E: 3 as const, M: 3 as const, L: 3 as const }, type: {}, at: "2026-10-22" });
  const cov = evaluationCoverage([{ id: "a" }, { id: "b" }, { id: "c" }], [ev("a", "x"), ev("a", "y"), ev("b", "x")], 2);
  assert.equal(cov.total, 3); assert.equal(cov.evaluated, 2); assert.equal(cov.pct, 67); assert.equal(cov.complete, 1);
  assert.deepEqual(cov.evaluators.map((e) => [e.by, e.count]), [["x", 2], ["y", 1]]);
  const c = consolidate([ev("a", "x")]);
  const rows = [
    { id: "a", name: "Uno; con punto y coma", horizon: "H1", suggested: "H1", c, decision: "IMPLEMENTAR" as const, lever: "MS" },
    { id: "b", name: "Dos", horizon: "H2", suggested: null, c: consolidate([]), decision: null },
  ];
  const sum = portfolioSummary(rows, ["H1", "H2", "H3"]);
  assert.equal(sum.H1.IMPLEMENTAR, 1); assert.equal(sum.H2.PENDIENTE, 1); assert.equal(sum.H3.PENDIENTE, 0);
  const csv = portfolioCsv(rows);
  assert.ok(csv.startsWith("id;iniciativa;palanca"));
  assert.ok(csv.includes('"Uno; con punto y coma"'));
  assert.equal(csv.split("\n").length, 3);
});
