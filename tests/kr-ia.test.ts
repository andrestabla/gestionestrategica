import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLineaBase, encargoLineaBase, SIN_LINEA_BASE } from "../src/lib/kr-ia";
import { krFaltantes } from "../src/lib/convencion";
import type { KpiFull } from "../src/data/cmi";

test("parseLineaBase exige indicador conocido y base numérica", () => {
  assert.equal(parseLineaBase({ encontrado: true, indicador: "exc-03", baseline: "3,1", meta: 3.4, unidad: "%", periodo: "2026-T3", justificacion: "x" }, ["EXC-03"]).encontrado, true);
  assert.equal(parseLineaBase({ encontrado: true, indicador: "EXC-99", baseline: 1, meta: 2 }, ["EXC-03"]).encontrado, false);
  assert.equal(parseLineaBase({ encontrado: true, indicador: "EXC-03", baseline: null, meta: 2 }, ["EXC-03"]).encontrado, false);
  assert.match(SIN_LINEA_BASE, /No se dispone de línea base/);
  const e = encargoLineaBase({ empresa: { name: "ACME" }, horizonte: "H1 · 2027", kr: { code: "EXC-09", name: "Clientes nuevos" }, objetivo: { id: "OE-08", name: "x" }, base: [{ code: "EXC-03", name: "MS", ultimo: 3.1, periodo: "2026-T3", meta: 3.4 }], fecha: "hoy" });
  assert.match(e.user, /EXC-03/); assert.match(e.system, /encontrado=false/);
});

test("krFaltantes ya no exige cifra en el nombre", () => {
  const k = { code: "EXC-09", name: "Número de clientes nuevos por línea", baseline: 20, target: 25, unit: "Cantidad", ownerId: "R03", due: "2027-T4", definition: "Cantidad de nuevos clientes adquiridos por línea", series: [] } as unknown as KpiFull;
  assert.deepEqual(krFaltantes(k), []);
});
