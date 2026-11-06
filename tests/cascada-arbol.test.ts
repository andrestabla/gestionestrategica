import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarArticulacion, proponerDesdePortafolio, arbolCascada, dependenciasDeArticulacion, type Articulacion, type MetaTrimestral } from "../src/lib/cascada";

const ctx = { areas: ["R01", "R02", "R03"] };

test("normalizarArticulacion: áreas del catálogo sin repetir, una sola lidera, prioridad renumerada, contribución obligatoria", () => {
  const bad = normalizarArticulacion({ areas: [{ areaId: "R09", contribucion: "algo largo de verdad" }] }, "i1", "x", ctx);
  assert.equal(bad.ok, false);
  const corta = normalizarArticulacion({ areas: [{ areaId: "R01", contribucion: "poco" }] }, "i1", "x", ctx);
  assert.equal(corta.ok, false);
  const dos = normalizarArticulacion({ areas: [{ areaId: "R01", rol: "LIDERA", contribucion: "Lidera la ejecución" }, { areaId: "R02", rol: "LIDERA", contribucion: "También quiere liderar" }] }, "i1", "x", ctx);
  assert.equal(dos.ok, false);
  const ok = normalizarArticulacion({ areas: [{ areaId: "R02", prioridad: 5, contribucion: "Integrar el CRM con la plataforma", entrega: "marzo" }, { areaId: "R01", prioridad: 2, contribucion: "Ejecutar el ciclo de visita", persona: "Gerente" }] }, "i1", "x", ctx);
  assert.ok(ok.ok);
  if (!ok.ok) return;
  assert.deepEqual(ok.articulacion.areas.map((a) => [a.areaId, a.rol, a.prioridad]), [["R01", "LIDERA", 1], ["R02", "CONTRIBUYE", 2]]);
  assert.deepEqual(dependenciasDeArticulacion(ok.articulacion), [{ de: "R01", a: "R02", que: "marzo" }]);
});

test("proponerDesdePortafolio con articulación crea una meta por área que participa y omite las no articuladas", () => {
  const inis = [
    { id: "i1", name: "CRM", cmi: "OE-01", ownerId: "R01", start: "2027-T2", end: "2027-T4", metaResultado: "80 %", status: "PLANEADA", kpi: "K1" },
    { id: "i2", name: "Planta", cmi: "OE-01", ownerId: "R02", start: "2027-T1", end: "2027-T4", metaResultado: "", status: "PLANEADA", kpi: "K2" },
  ] as unknown as Parameters<typeof proponerDesdePortafolio>[0];
  const art: Record<string, Articulacion> = { i1: { iniId: "i1", by: "x", at: "", areas: [{ areaId: "R01", rol: "LIDERA", prioridad: 1, contribucion: "Ejecutar el ciclo", persona: "Gerente" }, { areaId: "R03", rol: "CONTRIBUYE", prioridad: 2, contribucion: "Integrar el CRM", entrega: "marzo" }] } };
  const out = proponerDesdePortafolio(inis, [{ id: "OE-01", lever: "EXC" }], 2027, [], art);
  assert.deepEqual(out.map((m) => [m.initiative, m.areaId, m.quarter, m.persona, m.criterio]), [["i1", "R01", "2027-T2", "Gerente", "80 %"], ["i1", "R03", "2027-T2", undefined, "marzo"]]);
  assert.equal(proponerDesdePortafolio(inis, [{ id: "OE-01", lever: "EXC" }], 2027, []).length, 2);   // sin articulaciones: el área dueña, como antes
});

test("arbolCascada: prioridad → objetivo → KR → iniciativa → áreas con metas por trimestre; solo portafolio", () => {
  const metas: MetaTrimestral[] = [{ id: "m1", quarter: "2027-T1", areaId: "R03", lever: "EXC", objective: "OE-01", kpi: "K1", initiative: "i1", meta: "Integrar", criterio: "", hitos: [], depende: [], estado: "PLANEADA", by: "x", at: "" }, { id: "m2", quarter: "2027-T1", areaId: "R02", lever: "EXC", objective: "OE-01", kpi: "K1", initiative: "i1", meta: "Suelta", criterio: "", hitos: [], depende: [], estado: "PLANEADA", by: "x", at: "" }];
  const art: Record<string, Articulacion> = { i1: { iniId: "i1", by: "x", at: "", areas: [{ areaId: "R01", rol: "LIDERA", prioridad: 1, contribucion: "Ejecutar" }, { areaId: "R03", rol: "CONTRIBUYE", prioridad: 2, contribucion: "Integrar" }] } };
  const arbol = arbolCascada({ levers: [{ id: "EXC", name: "Excelencia", order: 1 }, { id: "OPE", name: "Operación", order: 2 }],
    objectives: [{ id: "OE-01", name: "Crecer", lever: "EXC", horizon: "H1", kpis: ["K1"] }, { id: "LB-EXC", name: "Resultados 2026", lever: "EXC", horizon: "LB", kpis: [] }],
    kpis: [{ code: "K1", name: "Cobertura", cmi: "OE-01" }], initiatives: [{ id: "i1", name: "CRM", ownerId: "R01", kpi: "K1", cmi: "OE-01" }, { id: "i9", name: "Fuera", ownerId: "R01", kpi: "K1", cmi: "OE-01" }],
    metas, articulaciones: art, decisions: { i1: { decision: "IMPLEMENTAR" } }, year: 2027, soloPortafolio: true });
  assert.equal(arbol.length, 1);
  const ini = arbol[0].objetivos[0].krs[0].iniciativas;
  assert.deepEqual(ini.map((i) => i.id), ["i1"]);
  assert.equal(ini[0].areas.length, 2);
  assert.equal(ini[0].areas[1].metas["2027-T1"]?.length, 1);
  assert.equal(ini[0].sueltas.length, 1);
});
