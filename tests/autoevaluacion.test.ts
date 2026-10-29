// Fuente 1 · Autoevaluación directiva por persona (node:test + tsx): permisos,
// rangos, avance parcial, visibilidad por rol, cierre al publicar y consolidación.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveF1Response, getF1Responses, f1Closed, platformResponses, captureVariable, publishCapture, resetStore,
} from "../src/server/store";
import { consolidate } from "../src/lib/od";
import { PRACTICES, DIMS } from "../src/data/mapa";
import type { SessionUser } from "../src/lib/session";

const consultor: SessionUser = { email: "a@4shine.co", name: "Advisor", role: "CONSULTOR" };
const admin: SessionUser = { email: "admin@algoritmot.com", name: "Administración", role: "ADMIN" };
const directivo: SessionUser = { email: "j@siegfried.example", name: "Junta", role: "DIRECTIVO" };
const resp: SessionUser = { email: "o@siegfried.example", name: "Operaciones", role: "RESPONSABLE", line: 3 };
const todos = (v: number) => Object.fromEntries(PRACTICES.map((p) => [p.code, v]));

test("F1: toda cuenta responde; rangos y códigos inválidos devuelven 422; el avance parcial se guarda", () => {
  resetStore();
  const mal = saveF1Response(directivo, { r: { "DIR-1.1": 7 } });
  assert.ok(!mal.ok && mal.status === 422);
  const codigo = saveF1Response(directivo, { r: { "ZZZ-9.9": 3 } });
  assert.ok(!codigo.ok && codigo.status === 422);
  const vacio = saveF1Response(directivo, { r: {} });
  assert.ok(!vacio.ok && vacio.status === 422);
  const parcial = saveF1Response(directivo, { r: { "DIR-1.1": 3, "DIR-1.2": "4" }, cargo: "Directora" });
  assert.ok(parcial.ok && parcial.answered === 2 && parcial.response.r["DIR-1.2"] === 4 && parcial.response.cargo === "Directora");
  // la segunda escritura reemplaza a la primera y conserva el cargo si no se envía
  const completa = saveF1Response(directivo, { r: todos(4) });
  assert.ok(completa.ok && completa.answered === PRACTICES.length && completa.response.cargo === "Directora");
  assert.ok((saveF1Response(resp, { r: todos(2) }) as { ok: boolean }).ok);
});

test("F1: cada quien ve la suya; el advisor y el administrador ven todas", () => {
  resetStore();
  saveF1Response(directivo, { r: todos(4) });
  saveF1Response(resp, { r: todos(2) });
  assert.equal(getF1Responses(directivo).length, 1);
  assert.equal(getF1Responses(directivo)[0].email, directivo.email);
  assert.equal(getF1Responses(resp)[0].r["EJE-2.1"], 2);
  assert.equal(getF1Responses(consultor).length, 2);
  assert.equal(getF1Responses(admin).length, 2);
});

test("F1: alimenta el motor como fuente 1 por persona y manda sobre la percepción de la captura A3", () => {
  resetStore();
  captureVariable(resp, "EJE-2.1", { perception: 5 });   // percepción de la captura: solo cuenta sin autoevaluaciones
  assert.equal(platformResponses().filter((r) => r.tipo === "f1").length, 1);
  saveF1Response(directivo, { r: todos(4) });
  saveF1Response(resp, { r: todos(2) });
  const f1 = platformResponses().filter((r) => r.tipo === "f1");
  assert.equal(f1.length, 2);
  assert.ok(f1.every((r) => Object.keys(r.r).length === PRACTICES.length));
  const C = consolidate(platformResponses());
  assert.equal(C.f1n, 2);
  for (const d of C.dims) assert.equal(d.f1, 3);       // promedio de 4 y 2 en todas las dimensiones
  assert.equal(C.dims.length, DIMS.length);
});

test("F1: al publicar el corte A3 la autoevaluación queda cerrada", () => {
  resetStore();
  assert.equal(f1Closed(), false);
  for (const p of PRACTICES) captureVariable(consultor, p.code, { level: 3 });
  assert.ok(publishCapture(consultor).ok);
  assert.equal(f1Closed(), true);
  const tarde = saveF1Response(directivo, { r: todos(3) });
  assert.ok(!tarde.ok && tarde.status === 422);
  resetStore();
});
