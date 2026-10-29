// Informe del diagnóstico con IA (node:test + tsx): el encargo al modelo lleva el método y los datos
// de la lectura, y la respuesta del modelo se valida y normaliza antes de guardarse.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInforme, encargoF1, encargoConsolidado, contextoMetodo } from "../src/lib/informe-ia";
import { lecturaF1 } from "../src/lib/f1";
import { consolidate, recommend } from "../src/lib/od";
import { PRACTICES, DIMS } from "../src/data/mapa";

const respuestas = (v: (code: string) => number) => Object.fromEntries(PRACTICES.map((p) => [p.code, v(p.code)]));
const empresa = { name: "Siegfried", sector: "Farmacéutico", levers: [{ name: "Crecer en Ecuador" }] };

test("el contexto del método lleva las cuatro capacidades, las 17 dimensiones, la escala y el umbral", () => {
  const c = contextoMetodo(["DIR-1"]);
  assert.match(c, /Dirección/); assert.match(c, /Multiplicación/);
  for (const d of DIMS) assert.ok(c.includes(`${d.code} ${d.name}`), d.code);
  assert.ok(c.includes("Umbral de práctica instalada: 3,0"));
  assert.ok(c.includes("Rúbricas de las dimensiones en foco"));
});

test("el encargo individual incluye la persona, los promedios y las dimensiones bajo el umbral", () => {
  const L = lecturaF1(respuestas((code) => (code.startsWith("DIR") ? 2 : 4)));
  const { system, user } = encargoF1({ empresa, persona: { nombre: "Ana", cargo: "CEO" }, lectura: L, fecha: "29 de octubre de 2026" });
  assert.ok(system.includes("4Shine Empresas"));
  assert.ok(user.includes("Ana, CEO")); assert.ok(user.includes("Siegfried · Farmacéutico")); assert.ok(user.includes("Crecer en Ecuador"));
  assert.ok(user.includes("68 de 68 afirmaciones"));
  assert.match(user, /Dimensiones bajo el umbral ordenadas por arrastre: DIR-/);
  assert.ok(user.includes('"titulo"'));
});

test("el encargo consolidado incluye la dispersión y el nivel de acompañamiento", () => {
  const items = [respuestas(() => 2), respuestas(() => 4)].map((r, i) => ({ tipo: "f1" as const, meta: { nombre: `P${i}` }, r }));
  const C = consolidate(items);
  const lect = items.map((x) => lecturaF1(x.r));
  const dispersion = DIMS.map((d, i) => ({ code: d.code, name: d.name, sd: Math.abs((lect[0].dims[i].m ?? 0) - (lect[1].dims[i].m ?? 0)) }));
  const { user } = encargoConsolidado({ empresa, C, rec: recommend(C), n: 2, dispersion, fecha: "hoy" });
  assert.ok(user.includes("2 autoevaluaciones directivas")); assert.ok(user.includes("sin percepción de equipos"));
  assert.ok(user.includes("Dispersión entre miembros")); assert.ok(user.includes("nivel_acompanamiento"));
  assert.ok(user.includes(recommend(C).level));
});

const base = { titulo: "Dirección clara, ejecución frágil", resumen: ["p1", "p2"], capacidades: [{ capacidad: "Dirección", puntaje: "3,4", lectura: "ok" }] };

test("parseInforme normaliza números con coma, ordena prioridades y acepta campos opcionales", () => {
  const out = parseInforme({ ...base, brechas: [{ dimension: "EJE-1 · Ritmo", puntaje: 2.5, que_revela: "x", evidencia_a_verificar: "y", framework: "Ritmo de ejecución" }], prioridades: [{ orden: 2, dimension: "B" }, { orden: 1, dimension: "A" }], preguntas: ["¿q?"], dispersion: [{ dimension: "LID-1", lectura: "difieren" }], nivel_acompanamiento: { nivel: "Focus", por_que: "una capacidad" } });
  assert.equal(out.capacidades[0].puntaje, 3.4);
  assert.deepEqual(out.prioridades.map((p) => p.dimension), ["A", "B"]);
  assert.equal(out.brechas[0].puntaje, 2.5);
  assert.equal(out.dispersion?.[0].dimension, "LID-1");
  assert.equal(out.nivel_acompanamiento?.nivel, "Focus");
});

test("parseInforme acepta el resumen como texto con párrafos y descarta basura", () => {
  const out = parseInforme({ ...base, resumen: "uno\n\ndos", fortalezas: [{ dimension: "" }, 5, { dimension: "DIR-1", por_que: "sí" }] });
  assert.deepEqual(out.resumen, ["uno", "dos"]);
  assert.equal(out.fortalezas.length, 1);
});

test("parseInforme rechaza un informe sin resumen o sin capacidades", () => {
  assert.throws(() => parseInforme({ titulo: "x" }), /incompleto/);
  assert.throws(() => parseInforme(null));
});

test("con una sola autoevaluación el encargo no pide dispersión y avisa la lectura parcial", () => {
  const r = respuestas((code) => (code === "DIR-2.1" ? 2 : 0));
  const parcial = Object.fromEntries(Object.entries(r).filter(([, v]) => v > 0));
  const L = lecturaF1(parcial);
  const f1 = encargoF1({ empresa, persona: { nombre: "Ana" }, lectura: L, fecha: "hoy" }).user;
  assert.ok(f1.includes("LECTURA PARCIAL: faltan 67 afirmaciones"));
  const items = [{ tipo: "f1" as const, meta: { nombre: "P" }, r: parcial }];
  const C = consolidate(items);
  const u = encargoConsolidado({ empresa, C, rec: recommend(C), n: 1, dispersion: DIMS.map((d) => ({ code: d.code, name: d.name, sd: 1.2 })), fecha: "hoy", cobertura: [1] }).user;
  assert.ok(u.includes("una sola autoevaluación")); assert.ok(!u.includes("Dispersión entre miembros"));
  assert.ok(u.includes("cada persona respondió 1 de 68"));
  assert.ok(u.includes('"nivel_acompanamiento": {"nivel"'));
});
