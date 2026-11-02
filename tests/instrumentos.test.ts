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

test("deshacer: solo el administrador borra autoevaluaciones, tests, encuestas, evaluaciones y decisiones; cada borrado deja rastro", async () => {
  const { removeF1Response, removeTestResponse, removeF2Response, removeEvaluation, clearDecision, getF1Responses, getTestResponses, getF2Responses, getEvaluations, getDecision, evaluateInitiative, decideInitiative, getAudit } = await import("../src/server/store");
  resetStore();
  assert.ok((await createCompany(admin, { name: "Deshacer SA", template: "demo" })).ok);
  await runWithTenant("deshacer-sa", async () => {
    const lider: SessionUser = { email: "l@d.co", name: "Líder", role: "LIDER", company: { slug: "deshacer-sa", name: "Deshacer SA", shortName: "D" } };
    assert.ok(saveF1Response(directivo, { r: Object.fromEntries(PRACTICES.map((p) => [p.code, 3])) }).ok);
    assert.ok(saveTestResponse(directivo, { r: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), 3])) }).ok);
    const codes = [...DIMS.flatMap((d) => d.f2.map((q) => q.code)), ...F2_GENERAL.map((q) => q.code)];
    const f2 = saveF2Response({ r: Object.fromEntries(codes.map((c) => [c, 4])) }); assert.ok(f2.ok);
    // el advisor no puede deshacer
    assert.equal(removeF1Response(advisor, directivo.email).ok, false);
    assert.equal(removeTestResponse(advisor, directivo.email).ok, false);
    assert.equal(removeF2Response(advisor, f2.ok ? f2.response.id : "").ok, false);
    // el administrador sí, y lo que no existe da 404
    assert.ok(removeF1Response(admin, directivo.email.toUpperCase()).ok);
    assert.equal(getF1Responses(admin).length, 0);
    assert.equal((removeF1Response(admin, directivo.email) as { status?: number }).status, 404);
    assert.ok(removeTestResponse(admin, directivo.email).ok);
    assert.equal(getTestResponses(admin).length, 0);
    assert.ok(removeF2Response(admin, f2.ok ? f2.response.id : "").ok);
    assert.equal(getF2Responses().length, 0);
    // evaluación y decisión sobre una iniciativa de la demo vinculada a un KR
    const ini = catalog().initiatives.find((i) => i.kpi);
    assert.ok(ini, "la demo trae iniciativas vinculadas");
    const ev = evaluateInitiative(lider, ini!.id, { scores: { D: 3, E: 3, M: 3, L: 3 }, type: { contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "ESTRATEGICO", permanencia: "TACTICO" } });
    assert.ok(ev.ok, (ev as { error?: string }).error);
    assert.equal(removeEvaluation(advisor, ini!.id, lider.email).ok, false);
    assert.ok(removeEvaluation(admin, ini!.id, lider.email).ok);
    assert.ok(!getEvaluations(ini!.id).some((e) => e.by === lider.email), "la evaluación del líder desaparece (las de la demo siguen)");
    const d = decideInitiative(lider, ini!.id, { decision: "BACKLOG", rationale: "después" });
    assert.ok(d.ok, (d as { error?: string }).error);
    assert.equal(clearDecision(advisor, ini!.id).ok, false);
    assert.ok(clearDecision(admin, ini!.id).ok);
    assert.equal(getDecision(ini!.id), null);
    assert.ok(getAudit().some((a) => /eliminad|deshech/.test(a.change)), "la auditoría registra los borrados");
  });
});
