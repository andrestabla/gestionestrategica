import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAlineacion, encargoAlineacion } from "../src/lib/alineacion";

test("parseAlineacion: exigencia, faltantes, reformulación y recomendación obligatoria", () => {
  const r = parseAlineacion({ items: [
    { id: "OE-01", color: "verde", naturaleza: "objetivo", faltan: [], recomendaciones: [] },
    { id: "OE-02", color: "verde", naturaleza: "objetivo", faltan: ["indicador"], recomendaciones: [] },
    { id: "OE-03", color: "rojo", naturaleza: "iniciativa", duplicaDe: ["OE-01", "OE-03", "OE-99"], recomendaciones: [], reformulacion: "" },
    { id: "oe-04", color: "amarillo", faltan: ["plazo", "rarísimo"], recomendaciones: ["Fijar el plazo al cierre de 2027."], reformulacion: "Consolidar X, medido por Y, al cierre de 2027.", indicadorPropuesto: "Y" },
  ], resumen: "ok" }, "H1", ["OE-01", "OE-02", "OE-03", "OE-04", "OE-05"]);
  assert.equal(r.items.length, 5);
  assert.equal(r.items[0].color, "verde");
  assert.equal(r.items[1].color, "amarillo");                       // verde con faltantes baja a amarillo
  assert.deepEqual(r.items[1].faltan, ["indicador"]);
  assert.equal(r.items[2].color, "rojo");
  assert.deepEqual(r.items[2].duplicaDe, ["OE-01"]);                 // ni a sí mismo ni ids desconocidos
  assert.equal(r.items[2].recomendaciones.length, 1);               // sin recomendación ni reformulación: se añade una
  assert.deepEqual(r.items[3].faltan, ["plazo"]);
  assert.equal(r.items[3].reformulacion, "Consolidar X, medido por Y, al cierre de 2027.");
  assert.equal(r.items[3].indicadorPropuesto, "Y");
  assert.equal(r.items[4].color, "amarillo");                       // sin lectura del modelo
  assert.ok(r.items[4].recomendaciones.length);
});

test("encargoAlineacion incluye prioridades, objetivos, KR, iniciativas y línea base", () => {
  const e = encargoAlineacion({ empresa: { name: "ACME" }, horizonte: "H1 · 2027", prioridades: [{ id: "EXC", order: 1, name: "Excelencia", indicator: "MS" }],
    objetivos: [{ id: "OE-01", lever: "EXC", name: "Obtener X", krs: 1, krNombres: ["KR uno"], iniciativas: ["Ini A"] }], lineaBase: "- EXC · Resultados 2026: ventas = 10 COP", fecha: "hoy" });
  assert.match(e.user, /KR uno/); assert.match(e.user, /Ini A/); assert.match(e.user, /LÍNEA BASE/); assert.match(e.system, /EXIGENCIA/); assert.match(e.system, /REFORMULACIÓN/);
});
