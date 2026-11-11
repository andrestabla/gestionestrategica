// Madurez digital (node:test + tsx): integridad de los dos instrumentos, reglas de
// cálculo, instrumento según el tipo de organización, permisos de captura y publicación.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, updateCompany, resetStore, getMadurez, captureMadurez, respondMadurez, setMadSafeguard, publishMadurez } from "../src/server/store";
import { INSTRUMENTS, instrumentOf } from "../src/data/madurez";
import { instrumentIssues, P, E, S, gapReading, practiceState, sufficientEvidence, cellOf, overallLevel, generalIndex, aiqOf, progressOf, type Captures } from "../src/lib/madurez";
import { MODULES, moduleOfRoute } from "../src/lib/modulos";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.example", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@empresa.example", name: "Directiva", role: "DIRECTIVO" };
const lider: SessionUser = { email: "L@empresa.example", name: "Líder", role: "LIDER" };
const cap = (o: Partial<Captures[string]>) => ({ by: "x", at: "2026-11-10T00:00:00.000Z", ...o });

test("madurez: los dos instrumentos están completos y el de empresa no habla de educación", () => {
  assert.deepEqual(instrumentIssues(INSTRUMENTS.empresa), []);
  assert.deepEqual(instrumentIssues(INSTRUMENTS.educativa), []);
  assert.equal(INSTRUMENTS.educativa.variables.length, 52);
  assert.equal(INSTRUMENTS.empresa.variables.length, 48);
  assert.equal(instrumentOf(undefined).kind, "empresa");
  assert.ok(!/instituci[oó]n|universidad|docente|estudiante/i.test(JSON.stringify(INSTRUMENTS.empresa)));
  assert.ok(!/Valledupar|Aguachica|UPC/.test(JSON.stringify(INSTRUMENTS.educativa)));
});

test("madurez: el módulo existe en los tres modos y su ruta se reconoce", () => {
  const m = MODULES.find((x) => x.id === "madurez")!;
  assert.deepEqual([...m.modes].sort(), ["acompanamiento", "completa", "convencion"]);
  assert.equal(moduleOfRoute("/panel/madurez/captura", null, "acompanamiento"), "madurez");
});

test("madurez: reglas de cálculo sobre una captura", () => {
  const c = cap({ perception: 5, d: 4, i: 2, k: 0, level: 2, target: 4 });
  assert.equal(P(c), 100);
  assert.equal(E(c), 0.25 * 100 + 0.35 * 50);
  assert.equal(S(c), 0.4 * 100 + 0.6 * 42.5);
  assert.equal(gapReading(c), "SOBREESTIMACION");
  assert.equal(practiceState(c), "ADOPCION");
  assert.equal(practiceState(cap({ d: 0, i: 0, k: 0 })), "AUSENTE");
  assert.equal(practiceState(cap({ d: 3, i: 3, k: 3 })), "IMPACTO");
  assert.ok(!sufficientEvidence(c) && sufficientEvidence(cap({ d: 2, i: 2, k: 1 })));
  assert.equal(S(cap({ perception: 3 })), null);   // sin evidencia no hay puntuación verificada
  const ins = INSTRUMENTS.empresa, celda = ins.variables.filter((v) => v.line === 1 && v.dimension === "organizacional");
  const caps: Captures = { [celda[0].id]: cap({ level: 2, target: 4 }), [celda[1].id]: cap({ level: 4 }) };
  assert.deepEqual(cellOf(ins, caps, 1, "organizacional"), { value: 3, target: 4, n: celda.length, graded: 2 });
  assert.equal(overallLevel(ins, caps), 3);
  assert.equal(generalIndex(ins, caps), null);
  assert.equal(overallLevel(ins, {}), null);
  assert.equal(progressOf(ins, caps).level, 2);
  const ai = ins.aiq[0].variableIds[0], sg = ins.safeguards.find((s) => s.cap !== null)!;
  const conIa: Captures = { [ai]: cap({ perception: 5, d: 4, i: 4, k: 4 }) };
  assert.equal(aiqOf(ins, conIa, {}).capped, 100);
  const tope = aiqOf(ins, conIa, { [sg.id]: { status: "FALLA" } });
  assert.ok(tope.capApplied && tope.capped === sg.cap);
});

test("madurez: nace vacía, la percepción la responde cada persona, la calificación es del advisor y el corte exige todas las variables", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Digital SA", template: "vacia" })).ok);
  await runWithTenant("digital-sa", async () => {
    const ini = getMadurez(directivo);
    assert.equal(ini.kind, "empresa");
    assert.deepEqual([Object.keys(ini.vars).length, ini.cuts.length, ini.progress.level, ini.puede.calificar], [0, 0, 0, false]);
    const ins = instrumentOf("empresa"), v0 = ins.variables[0].id;
    // la percepción es de cada persona: se responde por afirmación y la variable lleva el promedio
    assert.ok(respondMadurez(directivo, v0, 4).ok);
    assert.ok(respondMadurez(lider, v0, 5).ok);
    assert.ok(respondMadurez(lider, ins.variables[1].id, 0).ok);            // «No lo sé» cuenta como respondida, no entra al promedio
    const noAdvisor = respondMadurez(advisor, v0, 3);
    assert.ok(!noAdvisor.ok && noAdvisor.status === 403);
    const invalida = respondMadurez(directivo, v0, 6);
    assert.ok(!invalida.ok && invalida.status === 422);
    assert.ok(!respondMadurez(directivo, "NO-EXISTE", 3).ok);
    const tras = getMadurez(lider);
    assert.deepEqual([tras.vars[v0].perception, tras.vars[v0].perceptionN, tras.vars[ins.variables[1].id]], [4.5, 2, undefined]);
    assert.deepEqual([tras.mia.answers, tras.mia.done, tras.participacion.personas, tras.participacion.completas, "lista" in tras.participacion], [{ [v0]: 5, [ins.variables[1].id]: 0 }, null, 2, 0, false]);
    assert.deepEqual(getMadurez(advisor).participacion.lista?.map((r) => [r.name, r.respondidas]), [["Líder", 2], ["Directiva", 1]]);
    assert.ok(respondMadurez(directivo, v0, null).ok);                      // borra su respuesta
    assert.equal(getMadurez(directivo).vars[v0].perception, 5);
    assert.ok(respondMadurez(directivo, v0, 4).ok);
    for (const sinPermiso of [captureMadurez(directivo, v0, { level: 3 }), captureMadurez(directivo, v0, { perception: 2 })]) assert.ok(!sinPermiso.ok && sinPermiso.status === 403);
    const fuera = captureMadurez(advisor, v0, { level: 6 });
    assert.ok(!fuera.ok && fuera.status === 422);
    assert.ok(!captureMadurez(advisor, "NO-EXISTE", { level: 3 }).ok);
    const ok = captureMadurez(advisor, v0, { d: 3, i: 2, k: 1, level: 3, target: 4, hallazgo: "  Hay política sin despliegue.  " });
    assert.ok(ok.ok && ok.capture.perception === 4.5 && ok.capture.hallazgo === "Hay política sin despliegue.");
    const borra = captureMadurez(advisor, v0, { hallazgo: "", target: null });
    assert.ok(borra.ok && borra.capture.hallazgo === undefined && borra.capture.target === undefined);
    assert.ok(!setMadSafeguard(directivo, "SG-1", "FALLA", "").ok);
    assert.ok(setMadSafeguard(advisor, "SG-1", "FALLA", "Sin inventario").ok);
    const parcial = publishMadurez(advisor, "Línea base");
    assert.ok(!parcial.ok && parcial.status === 422);
    assert.ok(!publishMadurez(directivo, "x").ok);
    for (const v of ins.variables) assert.ok(captureMadurez(advisor, v.id, { level: 3 }).ok);
    const pub = publishMadurez(advisor, "Línea base");
    assert.ok(pub.ok && pub.cut.label === "Línea base" && Object.keys(pub.cut.vars).length === ins.variables.length && pub.cut.safeguards["SG-1"].status === "FALLA");
    // el corte no cambia aunque la captura siga
    assert.ok(captureMadurez(advisor, v0, { level: 5 }).ok);
    // quien responde todas las afirmaciones queda con el diagnóstico completo
    for (const v of ins.variables) assert.ok(respondMadurez(directivo, v.id, 3).ok);
    const completo = getMadurez(directivo);
    assert.ok(completo.mia.done && completo.participacion.completas === 1);
    const fin = getMadurez(advisor);
    assert.deepEqual([fin.cuts[0].vars[v0].perception, fin.cuts[0].vars[v0].perceptionN, fin.vars[v0].perception], [4.5, 2, 4]);
    assert.equal(fin.cuts[0].vars[v0].level, 3);
    assert.equal(fin.vars[v0].level, 5);
    assert.ok(fin.puede.calificar);
  });
});

test("madurez: una institución educativa usa el instrumento original", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Instituto Uno", template: "vacia", orgKind: "educativa" })).ok);
  await runWithTenant("instituto-uno", async () => {
    const m = getMadurez(advisor);
    assert.equal(m.kind, "educativa");
    assert.equal(m.progress.total, 52);
    assert.ok(captureMadurez(advisor, "AV-ORG-1", { perception: 2 }).ok);
    assert.ok(!captureMadurez(advisor, instrumentOf("empresa").variables[0].id, { perception: 2 }).ok);
  });
  // al cambiar el tipo, la captura del otro instrumento deja de mostrarse
  assert.ok((await updateCompany(admin, "instituto-uno", { orgKind: "empresa" })).ok);
  await runWithTenant("instituto-uno", async () => {
    const m = getMadurez(advisor);
    assert.deepEqual([m.kind, m.progress.total, Object.keys(m.vars).length], ["empresa", 48, 0]);
  });
});
