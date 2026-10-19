// Laboratorio de OKR: ejemplo completo por palanca y validación de las
// sugerencias que devuelve el modelo (reglas puras, sin llamar a OpenAI).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSugerencias, ejemploPara, OKR_EJEMPLOS, armarEncargo, armarVinculo, parseVinculo, armarValidacion, parseValidacion } from "../src/lib/okr-sugerencias";
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

test("encargo con los KR que el objetivo ya tiene: el modelo propone solo los complementarios", () => {
  const lever = { id: "MS", name: "Más tiendas", order: 1 } as Lever;
  const { system, user } = armarEncargo(ANDINA_CATALOG, lever, "Tribu", [], { name: "Elevar el Market Share a 12 %" }, ["PDV en funcionamiento", "Días al punto de equilibrio"]);
  assert.match(system, /no los repitas/); assert.ok(user.includes("- PDV en funcionamiento")); assert.ok(user.includes("- Días al punto de equilibrio"));
  const sin = armarEncargo(ANDINA_CATALOG, lever, "Tribu", [], { name: "Elevar el Market Share a 12 %" });
  assert.doesNotMatch(sin.system, /no los repitas/);
});

test("validación: el encargo lleva las reglas del método, los KR con sus datos y las alertas de la plataforma", () => {
  const lever = { id: "MS", name: "Más tiendas", order: 1, indicator: "PDV en funcionamiento" } as Lever;
  const { system, user } = armarValidacion(ANDINA_CATALOG, lever, "Tribu Cercanía", { name: "Elevar el Market Share a 12 %" },
    [{ code: "MS-01", name: "Implementar el simulador de PDV", unit: "%", goodDirection: "up", frequency: "Trimestral", baseline: 0, target: 100, owner: "Tribu Cercanía", due: "2027-T4", initiatives: 1 }], ["MS-01 sin línea base."]);
  assert.match(system, /nunca una actividad/); assert.match(system, /de 2 a 4 KR/);
  assert.ok(user.includes("MS-01: Implementar el simulador de PDV")); assert.ok(user.includes("Alertas automáticas")); assert.ok(user.includes("PDV en funcionamiento"));
});

test("validación: solo códigos existentes, estados conocidos, propuesta solo si hay ajuste, faltantes acotados a 2", () => {
  const v = parseValidacion({ veredicto: "ajustar", resumen: "Dos ajustes.", krs: [
    { code: "ms-01", estado: "reemplazar", comentario: "Es una actividad.", propuesta: { name: "Nuevos PDV con punto de equilibrio en menos de 12 meses (%)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "PDV nuevos en equilibrio / PDV nuevos × 100", target: 80 } },
    { code: "MS-02", estado: "ok", comentario: "Bien.", propuesta: { name: "No debería venir" } },
    { code: "XX-99", estado: "ok", comentario: "No existe." },
    { code: "MS-01", estado: "ok", comentario: "Repetido." },
  ], faltantes: [{ name: "Market Share de farmacia (%)", unit: "%" }, { name: "x" }, { name: "Clientes activos de alto valor", unit: "clientes" }, { name: "Un tercero que sobra", unit: "%" }] }, ["MS-01", "MS-02", "MS-03"]);
  assert.ok(v); assert.equal(v!.veredicto, "ajustar");
  assert.deepEqual(v!.krs.map((k) => [k.code, k.estado]), [["MS-01", "reemplazar"], ["MS-02", "ok"], ["MS-03", "ajustar"]]);
  assert.equal(v!.krs[0].propuesta?.target, 80); assert.equal(v!.krs[1].propuesta, undefined); assert.match(v!.krs[2].comentario, /no se pronunció/);
  assert.deepEqual(v!.faltantes.map((k) => k.name), ["Market Share de farmacia (%)", "Clientes activos de alto valor"]);
  assert.equal(parseValidacion({ veredicto: "otro", resumen: "x", krs: [] }, ["MS-01"]), null); assert.equal(parseValidacion(null, []), null);
});
