// Captura del corte A3 (node:test + tsx): permisos por capacidad,
// independencia de la calificación, rangos, publicación y conmutación.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureVariable, captureProgress, publishCapture, effectiveCurrent, resetStore,
  saveF2Response, getF2Responses, saveTestResponse, getTestResponses, platformResponses, tenantView } from "../src/server/store";
import { consolidate } from "../src/lib/od";
import { F2_GENERAL } from "../src/data/mapa";
import { maturityRollup } from "../src/lib/logic";
import { PRACTICES, DIMS } from "../src/data/mapa";
import type { SessionUser } from "../src/lib/session";

const consultor: SessionUser = { email: "a@4shine.co", name: "Advisor", role: "CONSULTOR" };
const resp3: SessionUser = { email: "o@andina.example", name: "Operaciones", role: "RESPONSABLE", line: 3 };
const directivo: SessionUser = { email: "j@andina.example", name: "Junta", role: "DIRECTIVO" };

test("captura: el directivo no captura; el responsable solo su capacidad; solo el advisor califica", () => {
  resetStore();
  assert.ok(!(captureVariable(directivo, "EJE-2.1", { perception: 3 }) as { ok: boolean }).ok);
  assert.ok((captureVariable(resp3, "EJE-2.1", { perception: 3 }) as { ok: boolean }).ok);
  const otra = captureVariable(resp3, "DIR-1.1", { perception: 3 });
  assert.ok(!otra.ok && otra.status === 403);
  const grade = captureVariable(resp3, "EJE-2.1", { level: 3 });
  assert.ok(!grade.ok && grade.status === 403);
  const full = captureVariable(consultor, "EJE-2.1", { evidence: "P", level: 2, note: "parcial" });
  assert.ok(full.ok && full.capture.level === 2 && full.capture.evidence === "P");
});

test("captura: rangos y códigos inválidos devuelven 422/404", () => {
  resetStore();
  assert.equal((captureVariable(consultor, "EJE-2.1", { perception: 6 }) as { status?: number }).status, 422);
  assert.equal((captureVariable(consultor, "EJE-2.1", { level: 0 }) as { status?: number }).status, 422);
  assert.equal((captureVariable(consultor, "ZZZ-9.9", { perception: 3 }) as { status?: number }).status, 404);
});

test("publicar exige las 68 prácticas calificadas; la dimensión es el promedio de sus prácticas y conmuta la medición vigente", () => {
  resetStore();
  assert.equal(captureProgress().total, 68);
  const parcial = publishCapture(consultor);
  assert.ok(!parcial.ok && parcial.status === 422);
  for (const p of PRACTICES) captureVariable(consultor, p.code, { level: p.dim === "EJE-2" ? 4 : 3 });
  assert.equal(captureProgress().level, 68);
  const pub = publishCapture(consultor);
  assert.ok(pub.ok);
  const cur = effectiveCurrent();
  assert.equal(cur.id, "A3");
  assert.equal(cur.scores![3]["EJE-2"].value, 4);
  assert.equal(cur.scores![1]["DIR-1"].value, 3);
  const roll = maturityRollup(tenantView());
  assert.equal(roll.assessment.id, "A3");
  assert.equal(roll.cells.length, DIMS.length);
  const closed = captureVariable(consultor, "EJE-2.1", { level: 4 });
  assert.ok(!closed.ok && closed.status === 422);
  resetStore();
});

test("fuente 2 anónima: valida códigos y mínimo de 30, no guarda identidad; el test guarda una respuesta por persona", () => {
  resetStore();
  const codes = [...DIMS.flatMap((d) => d.f2.map((q) => q.code)), ...F2_GENERAL.map((q) => q.code)];
  const pocas = saveF2Response({ r: { "F2-DIR1.a": 3 } });
  assert.ok(!pocas.ok && pocas.status === 422);
  const mal = saveF2Response({ r: Object.fromEntries(codes.map((c) => [c, 7])) });
  assert.ok(!mal.ok && mal.status === 422);
  const ok = saveF2Response({ r: Object.fromEntries(codes.map((c) => [c, 4])), area: "Operaciones", abierta: "Que se cumpla lo acordado." });
  assert.ok(ok.ok && ok.total === 1);
  const saved = getF2Responses()[0];
  assert.equal(Object.keys(saved).sort().join(","), "abierta,area,at,id,r");
  assert.equal(Object.keys(saved.r).length, 40);
  const t1 = saveTestResponse(resp3, { r: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), 3])) , cargo: "Operaciones" });
  assert.ok(t1.ok);
  const t2 = saveTestResponse(resp3, { r: { ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), 2])), "25": "B" } });
  assert.ok(t2.ok);
  assert.equal(getTestResponses(consultor).length, 1);
  assert.equal(getTestResponses(consultor)[0].r[1], 2);
  assert.equal(getTestResponses(directivo).length, 0);
  assert.ok(!(saveTestResponse(resp3, { r: { "1": 9 } }) as { ok: boolean }).ok);
  resetStore();
});

test("corte en curso: lo capturado se consolida con el mismo motor (F1 por persona, F3 por dimensión, F2 y test)", () => {
  resetStore();
  assert.equal(platformResponses().length, 0);
  for (const p of DIMS.find((d) => d.code === "MUL-5")!.prac) {
    captureVariable(resp3, p.code.replace("MUL-5", "EJE-2"), { perception: 4 });
    captureVariable(consultor, p.code, { perception: 2, evidence: "P", level: 2 });
  }
  const rs = platformResponses();
  assert.deepEqual(rs.map((r) => r.tipo).sort(), ["f1", "f1", "f3"]);
  const f3 = rs.find((r) => r.tipo === "f3")!;
  assert.equal(f3.lv!["MUL-5"], 2);
  assert.equal(Object.keys(f3.r).length, 4);
  const c = consolidate(rs);
  const mul5 = c.dims.find((d) => d.code === "MUL-5")!;
  assert.equal(mul5.f1, 2); assert.equal(mul5.f3, 2);
  assert.equal(mul5.m, 2);                 // 0,55·2 + 0,45·2 sin F2 suficiente
  assert.equal(c.dims.find((d) => d.code === "DIR-1")!.m, null);   // sin dato queda en blanco
  resetStore();
});
