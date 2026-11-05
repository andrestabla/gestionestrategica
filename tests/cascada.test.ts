import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarMeta, proponerDesdePortafolio, cicloTrimestre, interdependencias, type MetaTrimestral } from "../src/lib/cascada";

const ctx = { areas: ["R01", "R02"], levers: ["EXC"], objectives: ["OE-01"], kpis: ["K1"], initiatives: ["i1"] };

test("normalizarMeta valida trimestre, área y prioridad y limpia hitos y dependencias", () => {
  const bad = normalizarMeta({ quarter: "2027-Q1", areaId: "R01", lever: "EXC", meta: "Abrir tres clientes" }, ctx);
  assert.equal(bad.ok, false);
  const ok = normalizarMeta({ quarter: "2027-t1", areaId: "R01", lever: "exc", objective: "OE-01", meta: "  Abrir   tres clientes ", criterio: "3 contratos firmados",
    hitos: [{ name: "Lista corta", estado: "HECHO" }, { name: "" }], depende: [{ areaId: "R02", que: "Ficha técnica" }, { areaId: "R01", que: "yo mismo" }, { areaId: "R09", que: "no existe" }] }, ctx);
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.meta.quarter, "2027-T1");
  assert.equal(ok.meta.lever, "EXC");
  assert.equal(ok.meta.meta, "Abrir tres clientes");
  assert.equal(ok.meta.hitos.length, 1);
  assert.deepEqual(ok.meta.depende, [{ areaId: "R02", que: "Ficha técnica" }]);
  assert.equal(ok.meta.estado, "PLANEADA");
});

test("proponerDesdePortafolio crea una meta por iniciativa del año en su trimestre de inicio sin duplicar", () => {
  const inis = [
    { id: "i1", name: "CRM", cmi: "OE-01", ownerId: "R01", start: "2027-T2", end: "2027-T4", metaResultado: "80 % de cuentas en CRM", status: "PLANEADA", kpi: "K1" },
    { id: "i2", name: "Planta", cmi: "OE-01", ownerId: "R02", start: "2026-T3", end: "2028-T1", metaResultado: "", status: "EN_CURSO" },
    { id: "i3", name: "Fuera", cmi: "OE-01", ownerId: "R02", start: "2028-T1", end: "2028-T4", metaResultado: "", status: "PLANEADA" },
  ] as unknown as Parameters<typeof proponerDesdePortafolio>[0];
  const objs = [{ id: "OE-01", lever: "EXC" }];
  const out = proponerDesdePortafolio(inis, objs, 2027, []);
  assert.deepEqual(out.map((m) => [m.initiative, m.quarter, m.areaId, m.estado]), [["i1", "2027-T2", "R01", "PLANEADA"], ["i2", "2027-T1", "R02", "EN_CURSO"]]);
  assert.equal(out[0].meta, "CRM: 80 % de cuentas en CRM");
  const existente = { ...out[0], id: "mt-1", by: "a", at: "" } as MetaTrimestral;
  assert.equal(proponerDesdePortafolio(inis, objs, 2027, [existente]).length, 1);
});

test("cicloTrimestre e interdependencias leen el trimestre", () => {
  const metas: MetaTrimestral[] = [
    { id: "a", quarter: "2027-T1", areaId: "R01", lever: "EXC", meta: "m1", criterio: "c", hitos: [{ name: "h", estado: "HECHO" }, { name: "h2", estado: "PENDIENTE" }], depende: [{ areaId: "R02", que: "datos" }], estado: "CUMPLIDA", cierre: { cumplimiento: 100, aprendizaje: "ok", at: "", by: "a" }, by: "a", at: "" },
    { id: "b", quarter: "2027-T1", areaId: "R02", lever: "EXC", meta: "m2", criterio: "", hitos: [], depende: [], estado: "PLANEADA", by: "a", at: "" },
    { id: "c", quarter: "2027-T2", areaId: "R02", lever: "EXC", meta: "m3", criterio: "", hitos: [], depende: [], estado: "PLANEADA", by: "a", at: "" },
  ];
  const c = cicloTrimestre(metas, "2027-T1");
  assert.equal(c.metas, 2); assert.equal(c.areas, 2); assert.equal(c.sinCriterio, 1); assert.equal(c.hitos, 2); assert.equal(c.hitosHechos, 1);
  assert.equal(c.cerradas, 1); assert.equal(c.cumplimiento, 100); assert.deepEqual(c.aprendizajes, ["ok"]);
  assert.deepEqual(interdependencias(metas, "2027-T1"), [{ de: "R01", a: "R02", que: "datos", meta: "m1" }]);
});
