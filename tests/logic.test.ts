// Pruebas del motor de lógica de negocio (node:test + tsx).
// Ejecutar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  periodIndex, kpiHealth, initiativeRisk, classifyFactor,
  buildAlerts, maturityRollup, objectiveHealth, executiveSummary,
  DEMO_NOW_INDEX,
} from "../src/lib/logic";
import { KPI_CATALOG, INITIATIVES_FULL, CMI_OBJECTIVES, type KpiFull, type InitiativeFull } from "../src/data/cmi";

/* ─── periodIndex ─── */

test("periodIndex ordena periodos anuales, semestrales y trimestrales", () => {
  assert.ok(periodIndex("2026-T1") < periodIndex("2026-T2"));
  assert.ok(periodIndex("2026-S1") < periodIndex("2026-S2"));
  assert.ok(periodIndex("2025") < periodIndex("2026"));
  assert.ok(periodIndex("2026-T4") > periodIndex("2026-S1"));
  assert.equal(periodIndex("2026-T3"), 2026 * 12 + 8);
});

/* ─── kpiHealth ─── */

const mkKpi = (over: Partial<KpiFull>): KpiFull => ({
  code: "TST-01", line: 1, cmi: "OE-01", name: "Test", definition: "", formula: "",
  unit: "%", frequency: "Trimestral", source: "t", ownerId: "R01",
  baseline: 10, target: 100, goodDirection: "up",
  series: [
    { period: "2026-T1", value: 10 },
    { period: "2026-T2", value: 20 },
    { period: "2026-T3", value: 30 },
    { period: "2026-T4", value: 40 },
  ],
  ...over,
});

test("kpiHealth: semáforo OK cuando está cerca de la meta", () => {
  const h = kpiHealth(mkKpi({ target: 45 }));
  assert.equal(h.semaphore, "OK");
  assert.ok(h.improving);
});

test("kpiHealth: semáforo BAD lejos de la meta", () => {
  const h = kpiHealth(mkKpi({ target: 400 }));
  assert.equal(h.semaphore, "BAD");
});

test("kpiHealth: dirección down — bajar es mejorar", () => {
  const h = kpiHealth(mkKpi({
    goodDirection: "down", target: 5,
    series: [
      { period: "2026-T3", value: 18 },
      { period: "2026-T4", value: 15 },
    ],
  }));
  assert.ok(h.improving);
  assert.equal(h.delta, -3);
});

test("kpiHealth: proyección lineal alcanza la meta con pendiente sostenida", () => {
  // +10 por trimestre desde 40 en 2026-T4 → dic-2028 son 24 meses ≈ +80 → 120 ≥ 100
  const h = kpiHealth(mkKpi({}));
  assert.ok(h.projection.slopePerMonth > 3 && h.projection.slopePerMonth < 4);
  assert.ok(h.projection.willReachTarget);
});

test("kpiHealth: proyección no alcanza cuando la pendiente es plana", () => {
  const h = kpiHealth(mkKpi({
    series: [
      { period: "2026-T1", value: 30 },
      { period: "2026-T2", value: 30 },
      { period: "2026-T3", value: 31 },
      { period: "2026-T4", value: 31 },
    ],
  }));
  assert.ok(!h.projection.willReachTarget);
});

test("kpiHealth: rezago de captura respeta la periodicidad", () => {
  // trimestral con último dato 2026-T2 (jun-2026); hoy demo = mar-2027 → 9 meses > 4.5 tolerados
  const stale = kpiHealth(mkKpi({
    series: [{ period: "2026-T1", value: 10 }, { period: "2026-T2", value: 12 }],
  }));
  assert.ok(stale.isStale);

  // anual con dato de 2026 → tolerancia 18 meses → fresco
  const fresh = kpiHealth(mkKpi({
    frequency: "Anual",
    series: [{ period: "2025", value: 10 }, { period: "2026", value: 12 }],
  }));
  assert.ok(!fresh.isStale);
});

/* ─── classifyFactor ─── */

test("classifyFactor cubre las categorías de barreras", () => {
  assert.equal(classifyFactor("Presupuesto de vigencia aprobado"), "Financiera");
  assert.equal(classifyFactor("Adopción por parte de docentes"), "Cultural");
  assert.equal(classifyFactor("Vacante del diseñador instruccional"), "Talento");
  assert.equal(classifyFactor("Integración con registro académico"), "Tecnológica");
  assert.equal(classifyFactor("Agenda del Consejo Superior"), "Gobernanza");
});

/* ─── initiativeRisk ─── */

const mkIni = (over: Partial<InitiativeFull>): InitiativeFull => ({
  id: "t1", line: 1, subsistema: "Formación", cmi: "OE-01", name: "Test",
  objetivo: "", horizon: "CORTO", impact: 3, feasibility: 3, status: "EN_CURSO",
  start: "2026-T3", end: "2027-T4", ownerId: "R01", metaResultado: "",
  urgency: 3, dependency: 3,
  budgetPlanned: 100, budgetCommitted: 0, budgetExecuted: 50, progress: 50,
  capability: "DIR-1", kpi: "DIR-01", actions: [], log: [],
  nextMilestone: { date: "2027-06-01", text: "" },
  factors: [],
  ...over,
});

test("initiativeRisk: sin señales → riesgo bajo", () => {
  const r = initiativeRisk(mkIni({}));
  assert.equal(r.level, "BAJO");
  assert.equal(r.score, 0);
});

test("initiativeRisk: racha roja pesa más que un rojo aislado", () => {
  const single = initiativeRisk(mkIni({
    factors: [{ name: "Presupuesto", state: "ROJO", history: ["VERDE", "ROJO"] }],
  }));
  const streak = initiativeRisk(mkIni({
    factors: [{ name: "Presupuesto", state: "ROJO", history: ["ROJO", "ROJO"] }],
  }));
  assert.ok(streak.score > single.score);
});

test("initiativeRisk: desalineación presupuesto↔avance dispara driver financiero", () => {
  const r = initiativeRisk(mkIni({ budgetExecuted: 80, budgetCommitted: 10, progress: 30 }));
  assert.ok(r.drivers.some((d) => d.category === "Financiera"));
  assert.ok(r.score > 0);
});

test("initiativeRisk: acciones con trimestre vencido suman riesgo", () => {
  const r = initiativeRisk(mkIni({
    actions: [
      { name: "a", meta: "m", status: "PENDIENTE", quarter: "2026-T4" }, // vencida (hoy: mar-2027)
      { name: "b", meta: "m", status: "HECHA", quarter: "2026-T3" },     // hecha: no cuenta
    ],
  }));
  assert.ok(r.drivers.some((d) => d.text.includes("trimestre vencido")));
});

test("initiativeRisk: los datos reales de i7 e i2 producen riesgo alto y medio o más", () => {
  const i7 = INITIATIVES_FULL.find((i) => i.id === "i7")!;
  const i2 = INITIATIVES_FULL.find((i) => i.id === "i2")!;
  assert.ok(["ALTO", "CRÍTICO"].includes(initiativeRisk(i7).level));
  assert.ok(["MEDIO", "ALTO", "CRÍTICO"].includes(initiativeRisk(i2).level));
});

/* ─── rollup y alertas ─── */

test("maturityRollup: 17 dimensiones, serie creciente y sin dimensiones huérfanas", () => {
  const r = maturityRollup();
  assert.equal(r.cells.length, 17);
  assert.equal(r.history.length, 2);
  assert.ok(r.history[1].institution > r.history[0].institution);
  assert.equal(r.cellsWithoutEvidence.length, 0);
});

test("buildAlerts: ordenadas por severidad y con las rachas rojas presentes", () => {
  const alerts = buildAlerts();
  assert.ok(alerts.length > 0);
  for (let i = 1; i < alerts.length; i++) {
    assert.ok(alerts[i].severity >= alerts[i - 1].severity);
  }
  const rachas = alerts.filter((a) => a.kind === "FACTOR_RACHA_ROJA");
  assert.equal(rachas.length, 2); // i7 (retención) e i4 (presupuesto)
  assert.ok(rachas.every((a) => a.severity === 1));
});

test("objectiveHealth cubre todos los objetivos sin lanzar", () => {
  for (const o of CMI_OBJECTIVES) {
    const h = objectiveHealth(o.id);
    assert.ok(["OK", "WARN", "BAD"].includes(h.semaphore));
  }
});

test("executiveSummary es consistente con los catálogos", () => {
  const s = executiveSummary();
  assert.equal(s.kpis.length, KPI_CATALOG.length);
  assert.equal(s.initiatives.length, INITIATIVES_FULL.length);
  assert.equal(s.objectives.length, CMI_OBJECTIVES.length);
  assert.equal(
    s.alertCounts.critical + s.alertCounts.warning + s.alertCounts.info,
    s.alerts.length,
  );
  assert.ok(s.budget.planned > s.budget.executed + s.budget.committed);
});

/* ─── ancla temporal del demo ─── */

test("DEMO_NOW_INDEX está en marzo de 2027", () => {
  assert.equal(DEMO_NOW_INDEX, 2027 * 12 + 2);
});

/* ─── gestor de proyectos ─── */

import { TASKS, PEOPLE, isOverdue, DEMO_TODAY, assigneesOf } from "../src/data/proyectos";
import { EVIDENCES } from "../src/data/demo";
import { taskAlerts, workload, initiativeTaskStats, portfolioTaskStats } from "../src/lib/proyectos";
import { buildAlerts as buildAllAlerts } from "../src/lib/logic";

test("proyectos: integridad referencial de tareas, personas y dependencias", () => {
  const personIds = new Set(PEOPLE.map((p) => p.id));
  const iniIds = new Set(INITIATIVES_FULL.map((i) => i.id));
  const taskIds = new Set(TASKS.map((t) => t.id));
  const evIds = new Set(EVIDENCES.map((e) => e.id));
  for (const t of TASKS) {
    assert.ok(personIds.has(t.assigneeId), `${t.id}: persona ${t.assigneeId}`);
    assert.ok(iniIds.has(t.iniId), `${t.id}: iniciativa ${t.iniId}`);
    assert.ok(t.start <= t.due, `${t.id}: inicio después del compromiso`);
    for (const d of t.dependsOn ?? []) assert.ok(taskIds.has(d), `${t.id}: dependencia ${d}`);
    for (const e of t.evidenceIds ?? []) assert.ok(evIds.has(e), `${t.id}: evidencia ${e}`);
  }
  assert.ok(TASKS.length >= 30, `volumen del plan: ${TASKS.length}`);
});

test("proyectos: toda iniciativa del roadmap tiene plan de trabajo", () => {
  for (const i of INITIATIVES_FULL) {
    assert.ok(initiativeTaskStats(i.id).total >= 3, `${i.id} sin tareas suficientes`);
  }
});

test("proyectos: vencidas detectadas y con la historia esperada", () => {
  const overdue = TASKS.filter(isOverdue);
  assert.ok(overdue.length >= 3 && overdue.length <= 8, `vencidas: ${overdue.length}`);
  const ids = overdue.map((t) => t.id);
  assert.ok(ids.includes("T-i7-02"), "plan de reemplazos bloqueado y vencido");
  assert.ok(ids.includes("T-i2-04"), "marco de descuentos en revisión y vencido");
  // una tarea HECHA nunca está vencida
  for (const t of TASKS.filter((t) => t.status === "HECHA")) assert.ok(!isOverdue(t), t.id);
});

test("proyectos: toda tarea tiene descripción y toda HECHA tiene evidencia", () => {
  for (const t of TASKS) {
    assert.ok(t.desc.trim().length > 20, `${t.id}: descripción vacía o trivial`);
    if (t.status === "HECHA") {
      assert.ok((t.evidenceIds?.length ?? 0) > 0,
        `${t.id}: hecha sin evidencia — viola la regla dura del cierre`);
    }
    // corresponsables: personas válidas, sin duplicar al principal
    for (const c of t.coAssigneeIds ?? []) {
      assert.notEqual(c, t.assigneeId, `${t.id}: corresponsable duplica al principal`);
      assert.ok(c.startsWith("P"), `${t.id}: corresponsable inválido ${c}`);
    }
  }
  // el banco incluye tareas con corresponsables (multi-responsable en la demo)
  assert.ok(TASKS.some((t) => (t.coAssigneeIds?.length ?? 0) > 0));
});

test("proyectos: alertas de tareas tipificadas e integradas al motor global", () => {
  const ta = taskAlerts();
  assert.ok(ta.some((a) => a.kind === "TAREA_VENCIDA"));
  assert.ok(ta.some((a) => a.kind === "TAREA_BLOQUEADA"));
  assert.ok(ta.some((a) => a.kind === "DEPENDENCIA_VENCIDA"), "la cadena i7-02 → i7-04 debe alertar");
  for (const a of ta) assert.ok(a.ownerName.includes(" "), "nombre propio en la alerta");
  // integración: el motor global las incluye con href al gestor
  const all = buildAllAlerts();
  const fromTasks = all.filter((a) => a.href === "/panel/proyectos");
  assert.equal(fromTasks.length, ta.length);
  for (let i = 1; i < all.length; i++) assert.ok(all[i].severity >= all[i - 1].severity);
});

test("proyectos: carga por persona y estadísticas del portafolio consistentes", () => {
  const w = workload();
  assert.ok(w.length >= 9, "la mayoría del directorio tiene tareas");
  // con corresponsables, cada tarea cuenta una vez por cada responsable
  const sumTotal = w.reduce((a, x) => a + x.total, 0);
  const totalAssignments = TASKS.reduce((a, t) => a + assigneesOf(t).length, 0);
  assert.equal(sumTotal, totalAssignments);
  assert.ok(sumTotal > TASKS.length, "los corresponsables suman carga por persona");
  const s = portfolioTaskStats();
  assert.equal(Object.values(s.byStatus).reduce((a, b) => a + b, 0), s.total);
  assert.ok(DEMO_TODAY.startsWith("2027-03"), "hoy demo coherente con DEMO_NOW_INDEX");
});

/* ─── permisos y store de escritura ─── */

import { can, describeAccess, MODULE_ACTIONS, PERMISSION_MATRIX, type ModuleKey } from "../src/lib/permissions";
import { updateTask, verifyEvidence, getTask, getAudit, resetStore } from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const U = {
  consultor: { email: "c@a", name: "Consultor Test", role: "CONSULTOR" } as SessionUser,
  lider: { email: "l@u", name: "Líder Test", role: "LIDER" } as SessionUser,
  resp1: { email: "r@u", name: "Responsable L1", role: "RESPONSABLE", line: 1 } as SessionUser,
  resp3: { email: "o@u", name: "Responsable L3", role: "RESPONSABLE", line: 3 } as SessionUser,
  directivo: { email: "d@u", name: "Directivo Test", role: "DIRECTIVO" } as SessionUser,
};

test("permisos: la matriz cubre todos los módulos y todos los roles", () => {
  const modules: ModuleKey[] = ["panel", "madurez", "benchmark", "capacidades", "kpi", "ruta", "iniciativas", "proyectos", "bi"];
  for (const u of Object.values(U)) assert.ok(u.role);
  for (const m of modules) {
    assert.ok(MODULE_ACTIONS[m].includes("view"), m);
    for (const u of Object.values(U)) {
      const acc = describeAccess(u, m);
      assert.ok(["read", "line", "full"].includes(acc.level), `${m}/${u.role}`);
    }
  }
  // toda acción define los 5 roles
  for (const [action, grants] of Object.entries(PERMISSION_MATRIX)) {
    assert.equal(Object.keys(grants).length, 5, action);
  }
});

test("permisos: reglas clave de la matriz", () => {
  assert.ok(can(U.consultor, "publish_maturity"));
  assert.ok(!can(U.lider, "publish_maturity"), "el líder no configura el instrumento");
  assert.ok(!can(U.lider, "verify_evidence"), "verificar evidencia es del consultor");
  assert.ok(can(U.resp1, "edit_tasks", 1) && !can(U.resp1, "edit_tasks", 4), "ámbito de línea");
  assert.ok(!can(U.directivo, "edit_tasks") && can(U.directivo, "view"), "directivo solo lee");
  assert.ok(!can(null, "view"), "sin sesión no hay acceso");
});

test("store: mutaciones exigen permiso y reglas de negocio", async () => {
  resetStore();
  // directivo no edita
  const r1 = await updateTask(U.directivo, "T-i1-03", { status: "HECHA" });
  assert.ok(!r1.ok && r1.status === 403);
  // responsable fuera de su capacidad no edita
  const r2 = await updateTask(U.resp1, "T-i2-04", { status: "EN_REVISION" });
  assert.ok(!r2.ok && r2.status === 403 && r2.error.includes("Liderazgo"));
  // cerrar sin evidencia exigida → 422
  const r3 = await updateTask(U.consultor, "T-i1-04", { status: "HECHA" });
  assert.ok(!r3.ok && r3.status === 422 && r3.error.includes("evidencia"));
  // bloquear sin motivo → 422
  const r4 = await updateTask(U.consultor, "T-i2-05", { status: "BLOQUEADA" });
  assert.ok(!r4.ok && r4.status === 422);
  // compromiso anterior al inicio → 422
  const r5 = await updateTask(U.consultor, "T-i1-04", { due: "2027-01-01" });
  assert.ok(!r5.ok && r5.status === 422);
  resetStore();
});

test("store: mutación válida cambia el estado y escribe auditoría", async () => {
  resetStore();
  const before = getAudit("T-i1-04").length;
  const r = await updateTask(U.resp3, "T-i1-04", { status: "EN_CURSO", due: "2027-04-18" });
  assert.ok(r.ok, JSON.stringify(r));
  const t = getTask("T-i1-04")!;
  assert.equal(t.status, "EN_CURSO");
  assert.equal(t.due, "2027-04-18");
  const log = getAudit("T-i1-04");
  assert.equal(log.length, before + 1);
  assert.ok(log[0].change.includes("EN_CURSO") && log[0].change.includes("2027-04-18"));
  assert.equal(log[0].actor, "Responsable L3");
  resetStore();
});

test("store: verificación de evidencia solo por consultor y auditada", async () => {
  resetStore();
  const denied = await verifyEvidence(U.lider, "EV-11");
  assert.ok(!denied.ok && denied.status === 403);
  const ok = await verifyEvidence(U.consultor, "EV-11");
  assert.ok(ok.ok && ok.status === "VERIFICADA");
  assert.ok(getAudit("EV-11").some((a) => a.change.includes("verificada")));
  resetStore();
});

/* ─── fase 2: comentarios, evidencia subida y línea base ─── */

import {
  addComment, attachEvidence, verifyUploadedEvidence, getComments, getUploads,
  deviationDays, portfolioSlippage, getBaseline,
} from "../src/server/store";

test("fase2: comentar es deliberación de todos los roles, con validación", () => {
  resetStore();
  const r1 = addComment(U.directivo, "T-i1-03", "Observación de la junta.");
  assert.ok(r1.ok && r1.comment.author === "Directivo Test");
  const r2 = addComment(U.resp1, "T-i1-03", "   ");
  assert.ok(!r2.ok && r2.status === 422);
  const r3 = addComment(U.consultor, "T-nope", "x");
  assert.ok(!r3.ok && r3.status === 404);
  assert.equal(getComments("T-i1-03").length, 1);
  resetStore();
});

test("fase2: adjuntar evidencia respeta permisos y desbloquea el cierre", async () => {
  resetStore();
  // responsable de Dirección no puede adjuntar en Liderazgo
  const denied = attachEvidence(U.resp1, "T-i2-05",
    { fileName: "a.pdf", filePath: "x", size: 10, mime: "application/pdf" },
    { title: "Reglas de calidad", kind: "Documento" });
  assert.ok(!denied.ok && denied.status === 403);
  // sin título → 422
  const noTitle = attachEvidence(U.consultor, "T-i1-04",
    { fileName: "a.pdf", filePath: "x", size: 10, mime: "application/pdf" },
    { title: "  ", kind: "Documento" });
  assert.ok(!noTitle.ok && noTitle.status === 422);
  // el cierre estaba bloqueado…
  const blocked = await updateTask(U.consultor, "T-i1-04", { status: "HECHA" });
  assert.ok(!blocked.ok && blocked.status === 422);
  // …y se desbloquea al adjuntar
  const attached = attachEvidence(U.consultor, "T-i1-04",
    { fileName: "acta.pdf", filePath: "k", size: 100, mime: "application/pdf" },
    { title: "Acta del comité", kind: "Acta" });
  assert.ok(attached.ok && attached.evidence.status === "PENDIENTE");
  const closed = await updateTask(U.consultor, "T-i1-04", { status: "HECHA" });
  assert.ok(closed.ok);
  // verificación de la subida: solo consultor
  const vDenied = verifyUploadedEvidence(U.lider, attached.ok ? attached.evidence.id : "");
  assert.ok(!vDenied.ok && vDenied.status === 403);
  const vOk = verifyUploadedEvidence(U.consultor, attached.ok ? attached.evidence.id : "");
  assert.ok(vOk.ok);
  assert.equal(getUploads("T-i1-04")[0].status, "VERIFICADA");
  resetStore();
});

test("fase2: la línea base congela el plan y mide el deslizamiento", async () => {
  resetStore();
  const base = getBaseline("T-i3-04")!;
  assert.equal(base.due, "2027-04-15");
  const r = await updateTask(U.consultor, "T-i3-04", { due: "2027-04-29" });
  assert.ok(r.ok);
  assert.equal(deviationDays(getTask("T-i3-04")!), 14);
  // la línea base NO se mueve con la reprogramación
  assert.equal(getBaseline("T-i3-04")!.due, "2027-04-15");
  const slip = portfolioSlippage();
  assert.equal(slip.tasksShifted, 1);
  assert.equal(slip.daysLost, 14);
  // adelantar recupera días
  const r2 = await updateTask(U.consultor, "T-i4-04", { due: "2027-04-10", start: "2027-03-25" });
  assert.ok(r2.ok, JSON.stringify(r2));
  assert.ok(portfolioSlippage().daysGained > 0);
  resetStore();
});
