import { test } from "node:test";
import assert from "node:assert/strict";
import { parseValidacionIniciativas, parsePropuestasIniciativa, encargoValidacionIniciativas } from "../src/lib/iniciativas-ia";

test("parseValidacionIniciativas: exigencia, faltantes, duplicados y nombre propuesto como entrega", () => {
  const r = parseValidacionIniciativas({ items: [
    { id: "i1", color: "verde", naturaleza: "iniciativa", faltan: [], recomendaciones: [] },
    { id: "i2", color: "verde", naturaleza: "paraguas", faltan: ["plazo"], recomendaciones: [] },
    { id: "I3", color: "rojo", naturaleza: "operacion", duplicaDe: ["i1", "i3", "i99"], recomendaciones: [], reformulacion: "Implementar comité mensual de backorders", logroPropuesto: "Informe mensual" },
  ], resumen: "ok" }, "H1", ["i1", "i2", "i3", "i4"]);
  assert.equal(r.items[0].color, "verde");
  assert.equal(r.items[1].color, "amarillo");
  assert.equal(r.items[2].color, "rojo");
  assert.deepEqual(r.items[2].duplicaDe, ["i1"]);
  assert.equal(r.items[2].reformulacion, "Comité mensual de backorders");
  assert.match(r.items[2].recomendaciones[0], /^Cambiar el nombre a:/);
  assert.equal(r.items[3].color, "amarillo");
});

test("parsePropuestasIniciativa valida dimensión y trimestres", () => {
  const p = parsePropuestasIniciativa({ propuestas: [
    { name: "Implementar call center para droguerías", objetivo: "x", capability: "EJE-4", start: "2027-T2", end: "2027-T1", porque: "y" },
    { name: "Implementación de un sistema de gestión de inventarios", objetivo: "x", capability: "ZZZ", start: "mal", end: "2027-T3" },
    { name: "a" },
  ] }, ["EJE-4", "MUL-3"], 2027);
  assert.equal(p.length, 2);
  assert.equal(p[0].name, "Call center para droguerías");
  assert.equal(p[0].end, "2027-T2");
  assert.equal(p[1].capability, ""); assert.equal(p[1].start, "2027-T1"); assert.equal(p[1].name, "Sistema de gestión de inventarios");
});

test("encargoValidacionIniciativas lleva KR, objetivos e iniciativas", () => {
  const e = encargoValidacionIniciativas({ empresa: { name: "ACME" }, horizonte: "H1 · 2027", prioridades: [{ id: "OPE", name: "Operación" }], objetivos: [{ id: "OE-01", lever: "OPE", name: "Obtener" }],
    krs: [{ code: "OPE-01", name: "OTIF", objective: "OE-01" }], iniciativas: [{ id: "i1", name: "Comité", kpi: "OPE-01" }], fecha: "hoy" });
  assert.match(e.user, /OPE-01/); assert.match(e.user, /INICIATIVAS A VALIDAR/); assert.match(e.system, /EXIGENCIA/);
});
