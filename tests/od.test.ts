// Motor del diagnóstico 4Shine-OD: reglas del documento técnico v2.0.

import { test } from "node:test";
import assert from "node:assert/strict";
import { consolidate, readTest, recommend, type Response } from "../src/lib/od";
import { DIMS, PRACTICES, F2_GENERAL, TEST_QUESTIONS } from "../src/data/mapa";
import { OD_RESPONSES } from "../src/data/od-demo";

const f1 = (v: number | ((code: string) => number)): Response => ({
  tipo: "f1", meta: {}, r: Object.fromEntries(PRACTICES.map((p) => [p.code, typeof v === "number" ? v : v(p.code)])),
});
const f2 = (v: number): Response => ({
  tipo: "f2", meta: {}, r: Object.fromEntries([...DIMS.flatMap((d) => d.f2), ...F2_GENERAL].map((q) => [q.code, v])),
});
const f3 = (lv: number | ((code: string) => number), mark: "V" | "P" | "N" = "V"): Response => ({
  tipo: "f3", meta: {}, r: Object.fromEntries(PRACTICES.map((p) => [p.code, mark])),
  lv: Object.fromEntries(DIMS.map((d) => [d.code, typeof lv === "number" ? lv : lv(d.code)])),
});

test("madurez = 0,40 F3 + 0,30 F1 + 0,30 F2 con techo de evidencia", () => {
  const c = consolidate([f1(5), ...Array(5).fill(f2(5)), f3(3)]);
  for (const d of c.dims) {
    assert.equal(d.m, 4);                       // 0,4·3 + 0,3·5 + 0,3·5 = 4,2 → techo 3 + 1
    assert.ok(d.base.includes("techo"));
    assert.ok(d.flags.some((f) => f.key === "Relato sobre realidad"));
  }
});

test("sin F2 suficiente se repondera 55/45; sin F3 el máximo es 2,9 y se marca no verificada", () => {
  const sinF2 = consolidate([f1(4), f2(1), f3(2)]);
  assert.equal(sinF2.okF2, false);
  assert.equal(sinF2.dims[0].m, 2.9);           // 0,55·2 + 0,45·4 = 2,9
  const sinF3 = consolidate([f1(5), ...Array(5).fill(f2(5))]);
  assert.equal(sinF3.dims[0].m, 2.9);
  assert.ok(sinF3.dims[0].flags.some((f) => f.key === "No verificada"));
});

test("brecha jerárquica e instalada pero no vivida", () => {
  const c = consolidate([f1(4.5), ...Array(5).fill(f2(2)), f3(4)]);
  assert.ok(c.dims[0].flags.some((f) => f.key === "Brecha jerárquica"));
  assert.ok(c.dims[0].flags.some((f) => f.key === "Instalada pero no vivida"));
});

test("prioridad = (3,0 − madurez) × arrastre: DIR-4 y EJE-2 pesan 1,5", () => {
  const c = consolidate([f1(2), ...Array(5).fill(f2(2)), f3(2)]);
  const dir4 = c.dims.find((d) => d.code === "DIR-4")!, dir1 = c.dims.find((d) => d.code === "DIR-1")!;
  assert.equal(dir4.m, 2);
  assert.equal(Math.round(dir4.priority * 100) / 100, 1.5);
  assert.equal(Math.round(dir1.priority * 100) / 100, 1);
  assert.equal(c.priorities[0].priority, Math.max(...c.priorities.map((p) => p.priority)));
});

test("nivel de acompañamiento según capacidades en brecha y condición CEO", () => {
  assert.equal(recommend(consolidate([f1(4), ...Array(5).fill(f2(4)), f3(4)])).level, "Sin intervención estructural");
  assert.equal(recommend(consolidate([f1(2), ...Array(5).fill(f2(2)), f3(2)])).level, "Enterprise Elite");
  const low = (c: string) => c.startsWith("LID-1") || c.startsWith("MUL-5");
  const ceo = consolidate([f1((c) => (low(c) ? 2 : 4)), ...Array(5).fill(f2(4)), f3((c) => (low(c) ? 2 : 4))]);
  assert.equal(recommend(ceo).level, "Enterprise Elite");      // LID-1 y MUL-5 en brecha a la vez
});

test("test: etapa por el primer umbral bajo 3,0, cobertura y patrones", () => {
  const r: Response["r"] = Object.fromEntries(TEST_QUESTIONS.map((q) => [q.n, 4]));
  r[13] = 2; r[14] = 2; r[15] = 1; r[17] = "NI"; r[25] = "B";
  const t = readTest(r);
  assert.equal(t.stage, "Sistematizar");
  assert.equal(t.hypothesis, "Sistematizar");
  assert.ok(t.provisional);                                   // 17 sin información orienta Sistematizar
  assert.ok(t.patterns.some((p) => p.qs.join(",") === "13,14,15"));
  assert.equal(t.caps[2].cov, 5);
  assert.ok(t.caps[2].reportable);
});

test("la demo de Andina es consistente: 5 F1, 9 F2, 1 F3, 3 tests y MUL-5 como cuello de botella", () => {
  const c = consolidate(OD_RESPONSES);
  assert.equal(c.f1n, 5); assert.equal(c.f2n, 9); assert.ok(c.hasF3 && c.okF2);
  assert.equal(c.priorities[0].code, "MUL-5");
  assert.equal(recommend(c).level, "Enterprise Elite");
});
