// Instrumentos del diagnóstico por empresa (node:test + tsx): validación de la
// lista, guardado en la empresa y guardas del store al responder.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, updateCompany, resetStore, saveTestResponse, saveF1Response, saveF2Response, captureVariable, catalog } from "../src/server/store";
import { parseInstruments, instrumentsOf, hasInstrument, ALL_INSTRUMENTS } from "../src/lib/instrumentos";
import { PRACTICES, DIMS, F2_GENERAL } from "../src/data/mapa";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@sf.example", name: "Directiva", role: "DIRECTIVO" };

test("instrumentos: nulo o todos = sin restricción; desconocidos y lista vacía se rechazan", () => {
  assert.deepEqual(parseInstruments(undefined), { ok: true, instruments: undefined });
  assert.deepEqual(parseInstruments(ALL_INSTRUMENTS), { ok: true, instruments: undefined });
  assert.deepEqual(parseInstruments(["f1", "f1"]), { ok: true, instruments: ["f1"] });
  assert.deepEqual(parseInstruments(["captura", "test"]), { ok: true, instruments: ["test", "captura"] });
  assert.equal(parseInstruments(["f9"]).ok, false);
  assert.equal(parseInstruments([]).ok, false);
  assert.equal(parseInstruments("f1").ok, false);
  assert.deepEqual(instrumentsOf({}), ALL_INSTRUMENTS);
  assert.equal(hasInstrument({ instruments: ["f1"] }, "test"), false);
});

test("instrumentos: la empresa con solo autoevaluación acepta la F1 y rechaza test, encuesta y captura", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Solo F1 SA", template: "vacia", instruments: ["f1"] })).ok);
  assert.equal((await updateCompany(admin, "solo-f1-sa", { instruments: ["nada"] })).ok, false);
  await runWithTenant("solo-f1-sa", async () => {
    assert.deepEqual(catalog().company.instruments, ["f1"]);
    const f1 = saveF1Response(directivo, { r: Object.fromEntries(PRACTICES.map((p) => [p.code, 3])) });
    assert.ok(f1.ok);
    const t = saveTestResponse(directivo, { r: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), 3])) });
    assert.ok(!t.ok && t.status === 403);
    const codes = [...DIMS.flatMap((d) => d.f2.map((q) => q.code)), ...F2_GENERAL.map((q) => q.code)];
    const f2 = saveF2Response({ r: Object.fromEntries(codes.map((c) => [c, 4])) });
    assert.ok(!f2.ok && f2.status === 403);
    const cap = captureVariable(advisor, "DIR-1.1", { level: 3 });
    assert.ok(!cap.ok && cap.status === 403);
  });
  // al habilitar todos, vuelve a aceptar el test
  assert.ok((await updateCompany(admin, "solo-f1-sa", { instruments: ALL_INSTRUMENTS })).ok);
  await runWithTenant("solo-f1-sa", async () => {
    assert.equal(catalog().company.instruments, undefined);
    assert.ok(saveTestResponse(directivo, { r: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), 3])) }).ok);
  });
  resetStore();
});
