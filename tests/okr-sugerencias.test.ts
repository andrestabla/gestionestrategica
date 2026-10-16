// Laboratorio de OKR: ejemplo completo por palanca y validación de las
// sugerencias que devuelve el modelo (reglas puras, sin llamar a OpenAI).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSugerencias, ejemploPara, OKR_EJEMPLOS, armarEncargo, armarVinculo, parseVinculo } from "../src/lib/okr-sugerencias";
import { ANDINA_CATALOG, type Lever } from "../src/data/catalogo";

test("ejemplo por palanca: un objetivo con tres resultados clave; palanca desconocida usa el genérico", () => {
  for (const k of Object.keys(OKR_EJEMPLOS)) { const e = ejemploPara(k); assert.ok(e.objective.name.length > 10); assert.equal(e.krs.length, 3); }
  assert.equal(ejemploPara("XX"), OKR_EJEMPLOS.default);
});

test("sugerencias: valida la respuesta del modelo y descarta propuestas incompletas", () => {
  const out = parseSugerencias({ propuestas: [
    { objective: { name: "Elevar el NPS de servicio a 60 puntos" }, krs: [{ name: "NPS de servicio", unit: "puntos", goodDirection: "up", frequency: "Mensual", target: 60 }, { name: "Tiempo de espera", unit: "minutos", goodDirection: "down", frequency: "Mensual", target: null }] },
    { objective: { name: "corto" }, krs: [] },
    { objective: { name: "Objetivo con un solo KR no sirve" }, krs: [{ name: "Uno solo", unit: "%" }] },
  ] });
  assert.equal(out.length, 1);
  assert.equal(out[0].krs[0].target, 60); assert.equal(out[0].krs[1].target, null); assert.equal(out[0].krs[1].goodDirection, "down"); assert.equal(out[0].krs[1].frequency, "Mensual");
  assert.deepEqual(parseSugerencias(null), []); assert.deepEqual(parseSugerencias({ propuestas: "x" }), []);
});

test("encargo al modelo: palanca, tribu, lineamientos directivos y regla de 2 a 4 resultados clave", () => {
  const lever = { id: "MS", name: "Más tiendas", order: 1, indicator: "PDV en funcionamiento" } as Lever;
  const { system, user } = armarEncargo(ANDINA_CATALOG, lever, "Tribu de prueba", []);
  assert.match(system, /2 a 4 resultados clave/); assert.ok(user.includes(lever.name)); assert.ok(user.includes("Tribu de prueba"));
});

test("encargo con el objetivo escrito por la tribu: una propuesta con sus resultados clave", () => {
  const lever = { id: "FID", name: "Fidelización del cliente", order: 2 } as Lever;
  const { system, user } = armarEncargo(ANDINA_CATALOG, lever, "Tribu Experiencia", [], { name: "Elevar el NPS de servicio a 60 puntos", desc: "", indicator: "NPS" });
  assert.match(system, /exactamente 1 propuesta/); assert.ok(user.includes("Elevar el NPS de servicio a 60 puntos")); assert.match(user, /3 resultados clave/);
});

test("vínculo sugerido: solo ids de la lista; el KR debe pertenecer al objetivo elegido", () => {
  const cands = [{ id: "MS-O1", name: "Cercanía optimizada", krs: [{ code: "MS-01", name: "PDV" }] }, { id: "FID-O1", name: "Experiencia", krs: [] }];
  assert.deepEqual(parseVinculo({ objective: "MS-O1", kpi: "ms-01", why: "Mueve los PDV" }, cands), { objective: "MS-O1", kpi: "MS-01", why: "Mueve los PDV" });
  assert.equal(parseVinculo({ objective: "FID-O1", kpi: "MS-01" }, cands)?.kpi, "");
  assert.equal(parseVinculo({ objective: "XX-O9" }, cands)?.none, true, "id desconocido = ningún OKR evidente"); assert.equal(parseVinculo({ objective: "", why: "nada se relaciona" }, cands)?.none, true); assert.equal(parseVinculo(null, cands), null);
  const { user } = armarVinculo(ANDINA_CATALOG, { name: "Protocolo de bienvenida" }, cands);
  assert.ok(user.includes("MS-O1") && user.includes("MS-01") && user.includes("sin resultados clave"));
});
