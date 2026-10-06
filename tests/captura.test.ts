// Captura del corte A3 (node:test + tsx): permisos por capacidad,
// independencia de la calificación, rangos, publicación y conmutación.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureVariable, captureProgress, publishCapture, effectiveCurrent, resetStore,
} from "../src/server/store";
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
  const roll = maturityRollup();
  assert.equal(roll.assessment.id, "A3");
  assert.equal(roll.cells.length, DIMS.length);
  const closed = captureVariable(consultor, "EJE-2.1", { level: 4 });
  assert.ok(!closed.ok && closed.status === 422);
  resetStore();
});
