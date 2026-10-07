// Matriz 4Shine de priorización: fórmula, consolidación, permisos por rol y
// reglas de la decisión de tiempo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { score, consolidate, decisionCheck, rank, typeOf, CRITERIA } from "../src/lib/priorizacion";
import { evaluateInitiative, decideInitiative, getEvaluations, consolidatedOf, getDecision, resetStore } from "../src/server/store";
import { INITIATIVES_FULL } from "../src/data/cmi";
import { EVALUATIONS_SEED, DECISIONS_SEED } from "../src/data/priorizacion-demo";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "a@a.co", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "c@a.co", name: "Advisor", role: "CONSULTOR" };
const lider: SessionUser = { email: "g@a.co", name: "Gerencia", role: "LIDER" };
const resp3: SessionUser = { email: "o@a.co", name: "Operaciones", role: "RESPONSABLE", line: 3 };
const junta: SessionUser = { email: "j@a.co", name: "Junta", role: "DIRECTIVO" };
const T = { contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "TACTICO", permanencia: "ESTRATEGICO" } as const;

test("fórmula de la matriz: (40D + 30E + 20M + 10L) ÷ 4", () => {
  assert.equal(CRITERIA.reduce((a, c) => a + c.weight, 0), 100);
  assert.equal(score({ D: 4, E: 4, M: 4, L: 4 }), 100);
  assert.equal(score({ D: 1, E: 1, M: 1, L: 1 }), 25);
  assert.equal(score({ D: 4, E: 3, M: 2, L: 1 }), 75);   // (160+90+40+10)/4
  assert.equal(typeOf(T), "ESTRATEGICO");
  assert.equal(typeOf({ ...T, profundidad: "TACTICO" }), "TACTICO");
});

test("consolidación: promedio, elegibilidad por D y capacidad por L", () => {
  const c0 = consolidate([]);
  assert.equal(c0.n, 0); assert.equal(c0.eligible, false);
  const c = consolidate([
    { iniId: "x", by: "a", name: "A", role: "LIDER", scores: { D: 4, E: 3, M: 3, L: 2 }, type: T, at: "" },
    { iniId: "x", by: "b", name: "B", role: "DIRECTIVO", scores: { D: 3, E: 2, M: 3, L: 1 }, type: { ...T, contribucion: "TACTICO", profundidad: "TACTICO" }, at: "" },
  ]);
  assert.equal(c.n, 2);
  assert.deepEqual(c.avg, { D: 3.5, E: 2.5, M: 3, L: 1.5 });
  assert.equal(c.rounded.D, 4);            // redondeo a nivel
  assert.equal(c.eligible, true);
  assert.equal(c.capacityFirst, true);     // L = 2 → resolver capacidad primero
  assert.equal(c.type, "ESTRATEGICO");     // un voto de dos basta (mayoría no estricta)
  assert.equal(c.spread, 20);              // 82.5 − 62.5
  assert.equal(c.lowConsensus, true);      // más de 15 puntos: consenso bajo
});

test("reglas de la decisión de tiempo", () => {
  const strong = consolidate([{ iniId: "x", by: "a", name: "A", role: "LIDER", scores: { D: 4, E: 3, M: 3, L: 4 }, type: T, at: "" }]);
  const weakD = consolidate([{ iniId: "x", by: "a", name: "A", role: "LIDER", scores: { D: 2, E: 3, M: 3, L: 4 }, type: T, at: "" }]);
  const weakL = consolidate([{ iniId: "x", by: "a", name: "A", role: "LIDER", scores: { D: 4, E: 3, M: 3, L: 2 }, type: T, at: "" }]);
  assert.ok(decisionCheck("IMPLEMENTAR", strong).ok);
  assert.ok(!decisionCheck("IMPLEMENTAR", weakD).ok, "D < 3 no implementa");
  assert.ok(!decisionCheck("IMPLEMENTAR", weakL).ok, "L ≤ 2 resuelve capacidad primero");
  assert.ok(decisionCheck("PREPARAR", weakL).ok);
  assert.ok(!decisionCheck("IMPLEMENTAR", consolidate([])).ok, "sin evaluación no se implementa");
  assert.ok(decisionCheck("BACKLOG", consolidate([])).ok);
  assert.ok(!decisionCheck("RENUNCIAR", strong).ok, "renunciar exige motivo");
  assert.ok(decisionCheck("RENUNCIAR", strong, "la sustituye i9").ok);
});

test("el portafolio demo queda ordenado por puntaje dentro de cada horizonte", () => {
  resetStore();
  assert.equal(getEvaluations().length, EVALUATIONS_SEED.length);
  const r = rank(INITIATIVES_FULL.map((i) => ({ id: i.id, horizon: i.horizon })), consolidatedOf);
  const corto = r.filter((x) => x.horizon === "CORTO");
  for (let i = 1; i < corto.length; i++) assert.ok(corto[i - 1].c.score >= corto[i].c.score);
  assert.equal(corto[0].position, 1);
  // las decisiones demo son admisibles con sus consolidados
  for (const d of DECISIONS_SEED) assert.ok(decisionCheck(d.decision, consolidatedOf(d.iniId), d.rationale).ok, `${d.iniId} ${d.decision}`);
});

test("evaluar: la junta y el advisor evalúan todo; el responsable solo su capacidad; el admin no", () => {
  resetStore();
  const ev = { scores: { D: 3, E: 3, M: 2, L: 3 }, type: T, notes: { D: "aporte directo" } };
  assert.ok(evaluateInitiative(junta, "i4", ev).ok);
  assert.ok(evaluateInitiative(advisor, "i4", ev).ok);
  const r1 = evaluateInitiative(resp3, "i1", ev);          // i1 es de Ejecución (3)
  assert.ok(r1.ok);
  const r4 = evaluateInitiative(resp3, "i4", ev);          // i4 es de Multiplicación (4)
  assert.ok(!r4.ok && r4.status === 403);
  const ra = evaluateInitiative(admin, "i1", ev);
  assert.ok(!ra.ok && ra.status === 403);
  // una evaluación por evaluador: repetir reemplaza, no duplica
  const n = getEvaluations("i4").length;
  assert.ok(evaluateInitiative(junta, "i4", { ...ev, scores: { D: 4, E: 3, M: 2, L: 3 } }).ok);
  assert.equal(getEvaluations("i4").length, n);
  assert.equal(getEvaluations("i4").find((e) => e.by === "j@a.co")!.scores.D, 4);
  // validaciones
  const bad = evaluateInitiative(lider, "i1", { scores: { D: 5, E: 3, M: 2, L: 3 }, type: T });
  assert.ok(!bad.ok && bad.status === 422);
  const badT = evaluateInitiative(lider, "i1", { scores: { D: 3, E: 3, M: 2, L: 3 }, type: { contribucion: "ESTRATEGICO" } });
  assert.ok(!badT.ok && badT.status === 422);
  resetStore();
});

test("decidir: solo gerencia y advisor, y solo decisiones admisibles", () => {
  resetStore();
  const dj = decideInitiative(junta, "i1", { decision: "BACKLOG" });
  assert.ok(!dj.ok && dj.status === 403);
  const dr = decideInitiative(resp3, "i1", { decision: "BACKLOG" });
  assert.ok(!dr.ok && dr.status === 403);
  // i8: D decisivo pero L = 2 → implementar no es admisible
  const d8 = decideInitiative(lider, "i8", { decision: "IMPLEMENTAR" });
  assert.ok(!d8.ok && d8.status === 422 && /capacidad/i.test(d8.error));
  assert.ok(decideInitiative(lider, "i8", { decision: "PREPARAR", rationale: "cerrar la ficha" }).ok);
  assert.equal(getDecision("i8")!.decision, "PREPARAR");
  // i1 sí se implementa
  assert.ok(decideInitiative(advisor, "i1", { decision: "IMPLEMENTAR" }).ok);
  const ren = decideInitiative(lider, "i7", { decision: "RENUNCIAR" });
  assert.ok(!ren.ok && ren.status === 422);
  assert.ok(decideInitiative(lider, "i7", { decision: "RENUNCIAR", rationale: "la sustituye el plan de sucesión" }).ok);
  resetStore();
});
