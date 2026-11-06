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
  assert.deepEqual(r.items[3].faltan, []);                           // el plazo lo da el horizonte: nunca «falta plazo»
  assert.ok(!r.items[3].recomendaciones.some((x) => /^Fijar el plazo/.test(x)));
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

test("sinCifrasDeMeta quita metas numéricas y conserva años y plazos", async () => {
  const { sinCifrasDeMeta, tieneCifrasDeMeta } = await import("../src/lib/alineacion");
  assert.equal(sinCifrasDeMeta("Reducir el backlog de PT al menos en un 30 % al cierre de 2027."), "Reducir el backlog de PT al cierre de 2027.");
  assert.equal(sinCifrasDeMeta("Asegurar el lanzamiento de al menos cinco nuevos productos innovadores antes de H1 2027."), "Asegurar el lanzamiento de nuevos productos innovadores en el primer semestre de 2027.");
  assert.equal(sinCifrasDeMeta("Obtener un incremento del 10% en la rentabilidad de las marcas para el cierre de 2027."), "Obtener un incremento en la rentabilidad de las marcas para el cierre de 2027.");
  assert.equal(sinCifrasDeMeta("Subir la participación de mercado de 3,1 a 3,4 al cierre de 2027."), "Subir la participación de mercado al cierre de 2027.");
  assert.equal(tieneCifrasDeMeta("Consolidar la cobertura al cierre de 2027"), false);
  assert.equal(tieneCifrasDeMeta("Lanzar 5 productos en 2027"), true);
});

test("parseAlineacion: rigor con el verbo (actividad vs logro) y la reformulación que repite el verbo", () => {
  const nombres = { "OE-09": "Implementar la omnicanalidad como estrategia para aumentar la cobertura del panel médico", "OE-08": "Mejorar el share de cada línea", "OE-01": "Obtener la certificación BPM" };
  const r = parseAlineacion({ items: [
    { id: "OE-09", color: "amarillo", faltan: ["verbo", "plazo"], recomendaciones: ["Incluir un verbo de logro: 'Implementar' al inicio del enunciado.", "Fijar el plazo: cierre de 2027."], reformulacion: "Implementar la omnicanalidad para aumentar la cobertura del panel médico, al cierre de 2027." },
    { id: "OE-08", color: "amarillo", faltan: ["verbo"], recomendaciones: ["Declarar el indicador impulsor: participación por línea."], reformulacion: "Aumentar la participación de mercado por línea, medida por IQVIA, al cierre de 2027." },
    { id: "OE-01", color: "verde", faltan: [], recomendaciones: [] },
  ] }, "H1", ["OE-09", "OE-08", "OE-01"], nombres);
  const o9 = r.items[0];
  assert.deepEqual(o9.faltan, []);                                                       // empieza con verbo (de actividad): no «falta verbo»
  assert.ok(o9.recomendaciones.some((x) => /verbo de actividad «implementar»/i.test(x)));
  assert.ok(!o9.recomendaciones.some((x) => /Incluir un verbo de logro/.test(x)));
  assert.equal(o9.reformulacion, "");                                                    // la propuesta repetía el verbo criticado
  assert.ok(!o9.recomendaciones.some((x) => /^Fijar el plazo/.test(x)));
  const o8 = r.items[1];
  assert.deepEqual(o8.faltan, []);                                                       // «Mejorar» es verbo: el modelo se equivocó
  assert.equal(o8.reformulacion, "Aumentar la participación de mercado por línea, medida por IQVIA, al cierre de 2027.");
  assert.equal(r.items[2].color, "verde");
});
