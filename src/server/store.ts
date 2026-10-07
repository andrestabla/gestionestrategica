// ─────────────────────────────────────────────────────────────────────────────
// PGTD · Store de escritura (Fase 1 del gestor real).
// Memoria mutable inicializada desde los datos demo, con write-through a
// Postgres cuando DATABASE_URL está configurada:
//   - Sin base de datos: las mutaciones viven en memoria (se pierden al
//     reiniciar el servidor) — suficiente para operar la demo.
//   - Con base de datos: cada mutación se persiste vía Prisma y la memoria
//     actúa como caché de lectura, hidratada al arrancar.
// Todas las mutaciones validan reglas de negocio y escriben auditoría.
// ─────────────────────────────────────────────────────────────────────────────

import { TASKS as TASKS_SEED, PEOPLE, type Task, type TaskStatus, DEMO_TODAY } from "@/data/proyectos";
import {
  EVIDENCE_CATALOG, responsible, INITIATIVES_FULL, SCORES_HISTORY, KPI_CATALOG,
  currentAssessment as staticCurrent, previousAssessment as staticPrevious,
  type AssessmentRecord, type CellScore, type KpiFull, type InitiativeFull,
} from "@/data/cmi";
import { PRACTICES, DIMS, dimOf, F2_GENERAL } from "@/data/mapa";
import { periodIndex, isValidPeriod } from "@/lib/period";
import type { SessionUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import type { Response as OdResponse } from "@/lib/od";

/* ═══ Estado ═══ */

type EvidenceStatus = "VERIFICADA" | "PENDIENTE";

export type AuditEntry = {
  id: number;
  at: string;               // ISO
  actor: string;            // nombre del usuario
  role: string;
  entity: "task" | "evidence" | "branding";
  entityId: string;
  change: string;           // descripción legible
};

export type TaskComment = {
  id: number;
  taskId: string;
  author: string;
  role: string;
  text: string;
  at: string;               // ISO
};

export type UploadedEvidence = {
  id: string;               // EV-U01…
  taskId: string;
  title: string;
  kind: string;             // Documento | Acta | Informe | Sistema | Otro
  fileName: string;
  filePath: string;         // ruta local (var/uploads); en producción, clave R2
  size: number;
  mime: string;
  uploadedBy: string;
  date: string;             // ISO fecha
  status: EvidenceStatus;
};

/** Captura de una práctica durante el corte en curso (A3). */
export type VariableCapture = {
  perception?: number;          // 1–5 · autoevaluación directiva (responsable de la capacidad o advisor)
  evidence?: "V" | "P" | "N";   // evidencia verificada, parcial o no existe (solo advisor)
  level?: number;               // 1–5 · nivel calificado contra la rúbrica (solo advisor)
  note?: string;                // observación de la sesión de verificación
  by: string;
  at: string;                   // ISO
};

/** Test de capacidad empresarial respondido desde la plataforma (uno por persona). */
export type TestResponse = {
  email: string;
  name: string;
  role: string;
  cargo?: string;
  objetivo?: string;
  at: string;                   // ISO
  r: Record<string, number | string>;   // 1..24 → 1–5 | "NI" · 25 → A–E
};

/** Respuesta anónima de la Fuente 2 (percepción de equipos) desde el enlace de la empresa. */
export type F2Response = {
  id: string;                   // F2-0001…
  at: string;                   // ISO
  area?: string;                // corte opcional; solo se reporta con 5 o más respuestas
  r: Record<string, number>;    // F2-DIR1.a … F2-G6 → 1–5
  abierta?: string;
};

/** Notas del consultor sobre el informe de una página de un test (por participante). */
export type TestNotes = {
  restriccion?: string; evidencias?: string; accion?: string; noNecesita?: string;
  by: string; at: string;
};

/** Valor de KPI reportado desde la plataforma (se suma a la serie del seed). */
export type KpiReport = {
  code: string;
  period: string;               // "2027-T2" · "2027-S1" · "2027"
  value: number;
  note?: string;
  by: string;
  at: string;                   // ISO
};

/** Cambios de una iniciativa hechos desde la plataforma (overlay sobre el seed). */
export type InitiativeOverride = {
  progress?: number;                                            // 0–100
  status?: InitiativeFull["status"];
  factors?: Record<string, { state: "VERDE" | "AMBAR" | "ROJO"; note?: string; history: string[] }>;
  logAppends?: { date: string; type: "HITO" | "ALERTA" | "NOTA"; text: string }[];
  nextMilestone?: { date: string; text: string };
};

const g = globalThis as unknown as {
  __pgtdTasks?: Task[];
  __pgtdEvidence?: Map<string, EvidenceStatus>;
  __pgtdAudit?: AuditEntry[];
  __pgtdComments?: TaskComment[];
  __pgtdUploads?: UploadedEvidence[];
  __pgtdBaseline?: Map<string, { start: string; due: string }>;
  __pgtdCapture?: Map<string, VariableCapture>;
  __pgtdPublished?: AssessmentRecord | null;
  __pgtdKpiReports?: Map<string, KpiReport[]>;
  __pgtdTests?: Map<string, TestResponse>;
  __pgtdF2?: F2Response[];
  __pgtdTestNotes?: Map<string, TestNotes>;
  __pgtdIniOverrides?: Map<string, InitiativeOverride>;
  __pgtdHydrated?: boolean;
};

// memoria compartida entre requests (persistente durante la vida del proceso)
if (!g.__pgtdTasks) g.__pgtdTasks = TASKS_SEED.map((t) => ({ ...t }));
if (!g.__pgtdEvidence) {
  g.__pgtdEvidence = new Map(EVIDENCE_CATALOG.map((e) => [e.id, e.status]));
}
if (!g.__pgtdAudit) g.__pgtdAudit = [];
if (!g.__pgtdComments) g.__pgtdComments = [];
if (!g.__pgtdUploads) g.__pgtdUploads = [];
// línea base del cronograma: las fechas del plan aprobado (seed) se congelan;
// las reprogramaciones mueven las vigentes y el deslizamiento se mide contra esta.
if (!g.__pgtdBaseline) {
  g.__pgtdBaseline = new Map(TASKS_SEED.map((t) => [t.id, { start: t.start, due: t.due }]));
}

if (!g.__pgtdCapture) g.__pgtdCapture = new Map();
if (g.__pgtdPublished === undefined) g.__pgtdPublished = null;
if (!g.__pgtdKpiReports) g.__pgtdKpiReports = new Map();
if (!g.__pgtdTests) g.__pgtdTests = new Map();
if (!g.__pgtdF2) g.__pgtdF2 = [];
if (!g.__pgtdTestNotes) g.__pgtdTestNotes = new Map();
if (!g.__pgtdIniOverrides) g.__pgtdIniOverrides = new Map();

const tasks = () => g.__pgtdTasks!;
const comments = () => g.__pgtdComments!;
const uploads = () => g.__pgtdUploads!;
const baselines = () => g.__pgtdBaseline!;
const evidenceStatus = () => g.__pgtdEvidence!;
const auditLog = () => g.__pgtdAudit!;
const capture = () => g.__pgtdCapture!;

/* ═══ Prisma opcional (write-through) ═══ */

const hasDb = () => Boolean(process.env.DATABASE_URL);

// Import opaco: este módulo también entra al bundle del navegador (las
// páginas cliente importan el store), pero el cliente Prisma y el driver
// SQLite son solo-servidor. new Function esconde el import del bundler;
// en el navegador nunca se ejecuta (hasDb() es false sin DATABASE_URL).
const serverImport = new Function("m", "return import(m)") as (m: string) => Promise<Record<string, unknown>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

async function prisma(): Promise<AnyPrisma> {
  const gp = globalThis as unknown as { __pgtdPrisma?: AnyPrisma };
  if (!gp.__pgtdPrisma) {
    const { PrismaClient } = await serverImport("@prisma/client") as AnyPrisma;
    const { PrismaBetterSqlite3 } = await serverImport("@prisma/adapter-better-sqlite3") as AnyPrisma;
    // ruta absoluta: el runtime de Next puede resolver ./ contra otro CWD
    let url = process.env.DATABASE_URL!;
    if (url.startsWith("file:./")) url = "file:" + process.cwd() + "/" + url.slice(7);
    const adapter = new PrismaBetterSqlite3({ url });
    gp.__pgtdPrisma = new PrismaClient({ adapter });
  }
  return gp.__pgtdPrisma;
}

/** Hidrata la memoria desde Postgres (solo una vez por proceso, si hay DB). */
export async function hydrateFromDb() {
  if (!hasDb() || g.__pgtdHydrated) return;
  try {
    const db = await prisma();
    type DbTaskRow = {
      id: string; status: string; assigneeId: string; coAssigneeIds: unknown;
      start: Date; due: Date; note: string | null; evidenceIds: unknown;
    };
    const rows = (await db.projectTask.findMany()) as DbTaskRow[];
    if (rows.length) {
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const t of tasks()) {
        const r = byId.get(t.id);
        if (!r) continue;
        t.status = r.status as TaskStatus;
        t.assigneeId = r.assigneeId;
        t.coAssigneeIds = (r.coAssigneeIds as string[] | null) ?? t.coAssigneeIds;
        t.start = r.start.toISOString().slice(0, 10);
        t.due = r.due.toISOString().slice(0, 10);
        t.note = r.note ?? t.note;
        t.evidenceIds = (r.evidenceIds as string[] | null) ?? t.evidenceIds;
      }
    }
    g.__pgtdHydrated = true;
  } catch {
    // sin conexión: se continúa en modo memoria
  }
}

/* ═══ Lecturas ═══ */

export const getTasks = (): Task[] => tasks();
export const getTask = (id: string) => tasks().find((t) => t.id === id) ?? null;
export const getEvidenceStatus = (id: string): EvidenceStatus =>
  evidenceStatus().get(id) ?? "PENDIENTE";
export const getAudit = (entityId?: string): AuditEntry[] =>
  entityId ? auditLog().filter((a) => a.entityId === entityId) : auditLog();

export const getComments = (taskId?: string): TaskComment[] =>
  taskId ? comments().filter((c) => c.taskId === taskId) : comments();

export const getUploads = (taskId?: string): UploadedEvidence[] =>
  taskId ? uploads().filter((u) => u.taskId === taskId) : uploads();

export const getUploadById = (id: string) => uploads().find((u) => u.id === id) ?? null;

export const getBaseline = (taskId: string) => baselines().get(taskId) ?? null;

/** Deslizamiento en días de la fecha compromiso frente a la línea base. */
export const deviationDays = (t: Task): number => {
  const base = baselines().get(t.id);
  if (!base) return 0;
  return Math.round(
    (new Date(t.due).getTime() - new Date(base.due).getTime()) / 86_400_000,
  );
};

/** Deslizamiento acumulado del portafolio (solo positivos: días perdidos). */
export const portfolioSlippage = () => {
  const shifted = tasks().map((t) => ({ t, d: deviationDays(t) })).filter((x) => x.d !== 0);
  return {
    tasksShifted: shifted.length,
    daysLost: shifted.filter((x) => x.d > 0).reduce((a, x) => a + x.d, 0),
    daysGained: -shifted.filter((x) => x.d < 0).reduce((a, x) => a + x.d, 0),
  };
};

/* ═══ Reglas de transición ═══ */

const VALID_STATUS: TaskStatus[] = ["POR_HACER", "EN_CURSO", "EN_REVISION", "BLOQUEADA", "HECHA"];

export type MutationResult =
  | { ok: true; task: Task }
  | { ok: false; status: number; error: string };

function audit(actor: SessionUser, entity: "task" | "evidence" | "branding", entityId: string, change: string) {
  auditLog().unshift({
    id: auditLog().length + 1,
    at: new Date().toISOString(),
    actor: actor.name,
    role: actor.role,
    entity,
    entityId,
    change,
  });
}

/* ═══ Mutación: tarea ═══ */

export async function updateTask(
  user: SessionUser,
  id: string,
  patch: Partial<Pick<Task, "status" | "assigneeId" | "coAssigneeIds" | "start" | "due" | "note">> & { blockNote?: string },
): Promise<MutationResult> {
  const t = getTask(id);
  if (!t) return { ok: false, status: 404, error: "La tarea no existe." };

  // permiso: edición total o de la línea de la iniciativa
  const ini = INITIATIVES_FULL.find((i) => i.id === t.iniId)!;
  if (!can(user, "edit_tasks", ini.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no puede editar tareas."
        : `No puedes editar tareas de la capacidad ${capName(ini.line)}: tu ámbito es ${capName(user.line)}.`,
    };
  }

  const changes: string[] = [];

  if (patch.status && patch.status !== t.status) {
    if (!VALID_STATUS.includes(patch.status)) {
      return { ok: false, status: 422, error: "Estado inválido." };
    }
    // regla: NINGUNA tarea se cierra sin evidencia — cuenta la del catálogo
    // y la subida como archivo. Lo hecho se demuestra, no se declara.
    const hasEvidence = (t.evidenceIds?.length ?? 0) > 0 || getUploads(id).length > 0;
    if (patch.status === "HECHA" && !hasEvidence) {
      return {
        ok: false, status: 422,
        error: "Toda actividad exige al menos una evidencia para cerrarse: adjunta el soporte antes de marcarla como hecha.",
      };
    }
    // regla: bloquear exige motivo
    if (patch.status === "BLOQUEADA" && !patch.blockNote && !patch.note) {
      return { ok: false, status: 422, error: "Bloquear una tarea exige registrar el motivo." };
    }
    changes.push(`estado ${t.status} → ${patch.status}`);
    t.status = patch.status;
    if (patch.blockNote) t.note = patch.blockNote;
  }

  if (patch.assigneeId && patch.assigneeId !== t.assigneeId) {
    changes.push(`responsable ${t.assigneeId} → ${patch.assigneeId}`);
    t.assigneeId = patch.assigneeId;
  }

  if (patch.coAssigneeIds !== undefined) {
    // corresponsables: personas válidas, sin duplicados ni el principal
    if (!Array.isArray(patch.coAssigneeIds) ||
        patch.coAssigneeIds.some((p) => typeof p !== "string" || !PEOPLE.some((x) => x.id === p))) {
      return { ok: false, status: 422, error: "Corresponsables inválidos: deben ser personas del directorio." };
    }
    const clean = [...new Set(patch.coAssigneeIds)].filter((p) => p !== t.assigneeId);
    const before = (t.coAssigneeIds ?? []).join(",");
    if (clean.join(",") !== before) {
      changes.push(`corresponsables [${before || "—"}] → [${clean.join(",") || "—"}]`);
      t.coAssigneeIds = clean;
    }
  }

  if (patch.start && patch.start !== t.start) {
    changes.push(`inicio ${t.start} → ${patch.start}`);
    t.start = patch.start;
  }
  if (patch.due && patch.due !== t.due) {
    if ((patch.start ?? t.start) > patch.due) {
      return { ok: false, status: 422, error: "La fecha compromiso no puede ser anterior al inicio." };
    }
    changes.push(`compromiso ${t.due} → ${patch.due}`);
    t.due = patch.due;
  }
  if (patch.note !== undefined && patch.note !== t.note && !patch.blockNote) {
    changes.push("nota actualizada");
    t.note = patch.note;
  }

  if (changes.length === 0) return { ok: true, task: t };

  audit(user, "task", id, changes.join(" · "));

  // write-through a Postgres si está configurada
  if (hasDb()) {
    try {
      const db = await prisma();
      await db.projectTask.update({
        where: { id },
        data: {
          status: t.status,
          assigneeId: t.assigneeId,
          coAssigneeIds: t.coAssigneeIds ?? [],
          start: new Date(t.start),
          due: new Date(t.due),
          note: t.note,
        },
      });
    } catch (e) {
      // la memoria queda como fuente; la reconciliación ocurre al reconectar
      console.error("[pgtd] write-through falló:", (e as Error).message,
        "· cwd:", process.cwd(), "· url:", process.env.DATABASE_URL);
    }
  }

  return { ok: true, task: t };
}

/* ═══ Mutación: verificación de evidencia ═══ */

export async function verifyEvidence(
  user: SessionUser,
  evidenceId: string,
): Promise<{ ok: true; status: EvidenceStatus } | { ok: false; status: number; error: string }> {
  if (!can(user, "verify_evidence")) {
    return {
      ok: false, status: 403,
      error: "Solo el equipo consultor puede verificar evidencia: es la garantía de independencia de la medición.",
    };
  }
  const ev = EVIDENCE_CATALOG.find((e) => e.id === evidenceId);
  if (!ev) return { ok: false, status: 404, error: "La evidencia no existe." };
  if (getEvidenceStatus(evidenceId) === "VERIFICADA") {
    return { ok: true, status: "VERIFICADA" };
  }
  evidenceStatus().set(evidenceId, "VERIFICADA");
  audit(user, "evidence", evidenceId, `evidencia verificada («${ev.title}»)`);

  if (hasDb()) {
    try {
      const db = await prisma();
      await db.evidence.updateMany({ where: { title: ev.title }, data: { status: "VERIFICADA" } });
    } catch { /* memoria como fuente */ }
  }
  return { ok: true, status: "VERIFICADA" };
}

/* ═══ Mutación: comentario ═══ */

export function addComment(
  user: SessionUser,
  taskId: string,
  text: string,
): { ok: true; comment: TaskComment } | { ok: false; status: number; error: string } {
  // comentar es deliberación: cualquier rol autenticado puede (incluido el directivo)
  const t = getTask(taskId);
  if (!t) return { ok: false, status: 404, error: "La tarea no existe." };
  const clean = text.trim();
  if (!clean) return { ok: false, status: 422, error: "El comentario no puede estar vacío." };
  if (clean.length > 2000) return { ok: false, status: 422, error: "Máximo 2.000 caracteres." };
  const comment: TaskComment = {
    id: comments().length + 1,
    taskId,
    author: user.name,
    role: user.role,
    text: clean,
    at: new Date().toISOString(),
  };
  comments().push(comment);
  audit(user, "task", taskId, "comentario añadido");
  return { ok: true, comment };
}

/* ═══ Mutación: adjuntar evidencia (archivo) ═══ */

export function attachEvidence(
  user: SessionUser,
  taskId: string,
  file: { fileName: string; filePath: string; size: number; mime: string },
  meta: { title: string; kind: string },
): { ok: true; evidence: UploadedEvidence } | { ok: false; status: number; error: string } {
  const t = getTask(taskId);
  if (!t) return { ok: false, status: 404, error: "La tarea no existe." };
  const ini = INITIATIVES_FULL.find((i) => i.id === t.iniId)!;
  if (!can(user, "edit_tasks", ini.line)) {
    return { ok: false, status: 403, error: "Tu rol no puede adjuntar evidencia en esta tarea." };
  }
  if (!meta.title.trim()) {
    return { ok: false, status: 422, error: "La evidencia necesita un título descriptivo." };
  }
  const evidence: UploadedEvidence = {
    id: `EV-U${String(uploads().length + 1).padStart(2, "0")}`,
    taskId,
    title: meta.title.trim(),
    kind: meta.kind || "Documento",
    ...file,
    uploadedBy: user.name,
    date: new Date().toISOString().slice(0, 10),
    status: "PENDIENTE",   // nace pendiente: la verifica el consultor
  };
  uploads().push(evidence);
  audit(user, "task", taskId, `evidencia adjuntada («${evidence.title}», ${evidence.fileName})`);
  return { ok: true, evidence };
}

/** Verificación de evidencia subida (solo consultor). */
export function verifyUploadedEvidence(
  user: SessionUser,
  evidenceId: string,
): { ok: true } | { ok: false; status: number; error: string } {
  if (!can(user, "verify_evidence")) {
    return { ok: false, status: 403, error: "Solo el equipo consultor puede verificar evidencia." };
  }
  const ev = uploads().find((u) => u.id === evidenceId);
  if (!ev) return { ok: false, status: 404, error: "La evidencia no existe." };
  ev.status = "VERIFICADA";
  audit(user, "evidence", evidenceId, `evidencia subida verificada («${ev.title}»)`);
  return { ok: true };
}

/* ═══ Crear y archivar tareas ═══ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

const archived = () => {
  const ga = g as unknown as { __pgtdArchived?: Task[] };
  if (!ga.__pgtdArchived) ga.__pgtdArchived = [];
  return ga.__pgtdArchived;
};

export const getArchivedTasks = (): Task[] => archived();

export function createTask(
  user: SessionUser,
  input: {
    iniId: string; title: string; desc: string; assigneeId: string;
    coAssigneeIds?: string[]; start: string; due: string;
    dependsOn?: string[]; requiresEvidence?: boolean; note?: string;
  },
): MutationResult {
  const ini = INITIATIVES_FULL.find((i) => i.id === input.iniId);
  if (!ini) return { ok: false, status: 422, error: "La iniciativa no existe." };

  if (!can(user, "edit_tasks", ini.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no crea tareas."
        : `No puedes crear tareas en la capacidad ${capName(ini.line)}: tu ámbito es ${capName(user.line)}.`,
    };
  }

  const title = input.title?.trim() ?? "";
  const desc = input.desc?.trim() ?? "";
  if (title.length < 8) return { ok: false, status: 422, error: "El título debe describir la actividad (mínimo 8 caracteres)." };
  if (desc.length < 20) return { ok: false, status: 422, error: "La descripción debe declarar qué se hace y qué produce (mínimo 20 caracteres)." };
  if (!PEOPLE.some((p) => p.id === input.assigneeId)) {
    return { ok: false, status: 422, error: "El responsable principal debe ser una persona del directorio." };
  }
  if (!DATE_RE.test(input.start ?? "") || !DATE_RE.test(input.due ?? "")) {
    return { ok: false, status: 422, error: "Fechas inválidas (YYYY-MM-DD)." };
  }
  if (input.due < input.start) {
    return { ok: false, status: 422, error: "La fecha compromiso no puede ser anterior al inicio." };
  }
  for (const d of input.dependsOn ?? []) {
    if (!tasks().some((t) => t.id === d)) {
      return { ok: false, status: 422, error: `La dependencia ${d} no existe.` };
    }
  }

  // id secuencial dentro de la iniciativa (cuenta también las archivadas)
  const nums = [...tasks(), ...archived()]
    .filter((t) => t.iniId === input.iniId)
    .map((t) => Number(t.id.split("-").pop()));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = `T-${input.iniId}-${String(next).padStart(2, "0")}`;

  const task: Task = {
    id, iniId: input.iniId, title, desc,
    assigneeId: input.assigneeId,
    coAssigneeIds: [...new Set(input.coAssigneeIds ?? [])]
      .filter((c) => c !== input.assigneeId && PEOPLE.some((p) => p.id === c)),
    start: input.start, due: input.due,
    status: "POR_HACER",
    requiresEvidence: Boolean(input.requiresEvidence),
    dependsOn: input.dependsOn?.length ? input.dependsOn : undefined,
    note: input.note?.trim() || undefined,
  };
  tasks().push(task);
  baselines().set(id, { start: task.start, due: task.due });
  audit(user, "task", id, `tarea creada («${title}») en ${ini.name}`);
  return { ok: true, task };
}

export function archiveTask(user: SessionUser, id: string): MutationResult {
  const t = getTask(id);
  if (!t) return { ok: false, status: 404, error: "La tarea no existe." };
  const ini = INITIATIVES_FULL.find((i) => i.id === t.iniId)!;
  if (!can(user, "edit_tasks", ini.line)) {
    return { ok: false, status: 403, error: "Tu rol no puede archivar tareas de esta línea." };
  }
  const dependents = tasks().filter((x) => x.dependsOn?.includes(id));
  if (dependents.length) {
    return {
      ok: false, status: 422,
      error: `No se puede archivar: ${dependents.map((d) => d.id).join(", ")} depende(n) de esta tarea. Reasigna o archiva primero las dependientes.`,
    };
  }
  const idx = tasks().findIndex((x) => x.id === id);
  archived().push(tasks()[idx]);
  tasks().splice(idx, 1);
  audit(user, "task", id, `tarea archivada («${t.title}»)`);
  return { ok: true, task: t };
}

/* ═══ Reprogramación en cascada ═══
   Cuando una fecha compromiso se corre, las tareas dependientes (transitivas,
   no cerradas) se corren el mismo número de días. Vista previa antes de
   aplicar; el deslizamiento se sigue midiendo contra la línea base. */

export type CascadeShift = {
  id: string; title: string; status: TaskStatus;
  start: string; due: string;             // vigentes
  newStart: string; newDue: string;
  newDeviation: number;                    // días contra la línea base tras aplicar
};

export function cascadePreview(id: string, newDue: string):
  | { ok: true; delta: number; shifts: CascadeShift[] }
  | { ok: false; status: number; error: string } {
  const root = getTask(id);
  if (!root) return { ok: false, status: 404, error: "La tarea no existe." };
  if (!DATE_RE.test(newDue)) return { ok: false, status: 422, error: "Fecha inválida (YYYY-MM-DD)." };
  if (newDue < root.start) return { ok: false, status: 422, error: "La nueva fecha compromiso no puede ser anterior al inicio de la tarea." };
  const delta = daysBetween(root.due, newDue);
  if (delta === 0) return { ok: false, status: 422, error: "La fecha no cambia: nada que reprogramar." };

  // dependientes transitivas no cerradas
  const affected = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of tasks()) {
      if (t.status === "HECHA" || affected.has(t.id)) continue;
      if (t.dependsOn?.some((d) => affected.has(d))) {
        affected.add(t.id);
        grew = true;
      }
    }
  }
  affected.delete(id);

  const shifts: CascadeShift[] = [...affected].map((tid) => {
    const t = getTask(tid)!;
    const newStart = addDays(t.start, delta);
    const nd = addDays(t.due, delta);
    const base = baselines().get(tid);
    return {
      id: tid, title: t.title, status: t.status,
      start: t.start, due: t.due, newStart, newDue: nd,
      newDeviation: base ? daysBetween(base.due, nd) : 0,
    };
  });
  return { ok: true, delta, shifts };
}

export function applyCascade(user: SessionUser, id: string, newDue: string):
  | { ok: true; delta: number; shifted: number }
  | { ok: false; status: number; error: string } {
  const preview = cascadePreview(id, newDue);
  if (!preview.ok) return preview;

  // permiso sobre TODAS las líneas afectadas
  const root = getTask(id)!;
  const allIds = [id, ...preview.shifts.map((s) => s.id)];
  for (const tid of allIds) {
    const t = getTask(tid)!;
    const ini = INITIATIVES_FULL.find((i) => i.id === t.iniId)!;
    if (!can(user, "edit_tasks", ini.line)) {
      return {
        ok: false, status: 403,
        error: `El corrimiento toca la capacidad ${capName(ini.line)} (${tid}) y tu ámbito es ${capName(user.line)}.`,
      };
    }
  }

  root.due = newDue;
  for (const s of preview.shifts) {
    const t = getTask(s.id)!;
    t.start = s.newStart;
    t.due = s.newDue;
  }
  audit(user, "task", id,
    `reprogramación en cadena: ${preview.delta > 0 ? "+" : ""}${preview.delta} días · ${preview.shifts.length + 1} tareas (${allIds.join(", ")})`);
  return { ok: true, delta: preview.delta, shifted: preview.shifts.length + 1 };
}

/* ═══ Captura del corte A3 ═══
   El diagnóstico se aplica desde la plataforma: el responsable de la
   capacidad registra la autoevaluación de SUS prácticas; el advisor marca la
   evidencia y asigna el nivel 1–5 contra la rúbrica (garantía de
   independencia). Publicar exige las 68 prácticas calificadas y conmuta la
   medición vigente de toda la lógica del servidor. */

const capName = (n?: number) => DIMS.find((d) => d.line === n)
  ? ["", "Dirección", "Liderazgo", "Ejecución", "Multiplicación"][n!] : "sin capacidad";

const inRange = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

export function getCapture(): Record<string, VariableCapture> {
  return Object.fromEntries(capture());
}

export function captureProgress() {
  const caps = capture();
  let perception = 0, evidence = 0, level = 0;
  for (const p of PRACTICES) {
    const c = caps.get(p.code);
    if (!c) continue;
    if (c.perception !== undefined) perception++;
    if (c.evidence !== undefined) evidence++;
    if (c.level !== undefined) level++;
  }
  return { total: PRACTICES.length, perception, dik: evidence, level };
}

export function captureVariable(
  user: SessionUser,
  varId: string,
  patch: { perception?: number; evidence?: "V" | "P" | "N"; level?: number; note?: string },
): { ok: true; capture: VariableCapture } | { ok: false; status: number; error: string } {
  const v = PRACTICES.find((x) => x.code === varId);
  if (!v) return { ok: false, status: 404, error: "La práctica no existe en el mapa." };
  if (g.__pgtdPublished) {
    return { ok: false, status: 422, error: "El corte A3 ya está publicado: la captura está cerrada." };
  }
  if (!can(user, "capture_maturity", v.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "RESPONSABLE"
        ? `No puedes capturar prácticas de ${capName(v.line)}: tu ámbito es ${capName(user.line)}.`
        : "Tu rol no participa en la captura del diagnóstico.",
    };
  }
  const grading = patch.evidence !== undefined || patch.level !== undefined;
  if (grading && !can(user, "publish_maturity")) {
    return {
      ok: false, status: 403,
      error: "La verificación de evidencia y el nivel son del advisor; tu captura registra la autoevaluación.",
    };
  }
  if (patch.perception !== undefined && !inRange(patch.perception, 1, 5)) {
    return { ok: false, status: 422, error: "La autoevaluación es un entero 1–5." };
  }
  if (patch.evidence !== undefined && !["V", "P", "N"].includes(patch.evidence)) {
    return { ok: false, status: 422, error: "La evidencia se marca V (verificada), P (parcial) o N (no existe)." };
  }
  if (patch.level !== undefined && !inRange(patch.level, 1, 5)) {
    return { ok: false, status: 422, error: "El nivel es un entero 1–5 contra la rúbrica." };
  }
  const prev = capture().get(varId) ?? {} as VariableCapture;
  const next: VariableCapture = {
    ...prev,
    ...Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined)),
    by: user.name,
    at: new Date().toISOString(),
  };
  capture().set(varId, next);
  const what = Object.keys(patch).filter((k2) => patch[k2 as keyof typeof patch] !== undefined).join(", ");
  audit(user, "task", varId, `captura A3: ${what}`);
  return { ok: true, capture: next };
}

/** Publica el corte A3: exige las 68 prácticas con nivel calificado. */
export function publishCapture(
  user: SessionUser,
): { ok: true; assessment: AssessmentRecord } | { ok: false; status: number; error: string } {
  if (!can(user, "publish_maturity")) {
    return { ok: false, status: 403, error: "Solo el advisor publica mediciones." };
  }
  if (g.__pgtdPublished) {
    return { ok: true, assessment: g.__pgtdPublished };
  }
  const prog = captureProgress();
  if (prog.level < prog.total) {
    return {
      ok: false, status: 422,
      error: `Faltan ${prog.total - prog.level} prácticas por calificar (nivel contra la rúbrica). Una medición parcial no se publica.`,
    };
  }
  // dimensión = promedio simple de sus prácticas calificadas
  const base = staticCurrent().scores!;
  const scores: Record<number, Record<string, CellScore>> = { 1: {}, 2: {}, 3: {}, 4: {} };
  for (const d of DIMS) {
    const avg = d.prac.reduce((a, x) => a + capture().get(x.code)!.level!, 0) / d.prac.length;
    scores[d.line][d.code] = {
      value: Math.round(avg * 10) / 10,
      target: base[d.line][d.code].target,     // la meta a 24 meses no cambia con el corte
    };
  }
  const assessment: AssessmentRecord = {
    id: "A3",
    label: "Corte de seguimiento 2",
    period: "2027-08",
    status: "PUBLICADA",
    note: `Publicada desde la plataforma por ${user.name}: 68 prácticas calificadas, autoevaluación ${prog.perception}/68, evidencia ${prog.dik}/68.`,
    scores,
  };
  g.__pgtdPublished = assessment;
  audit(user, "task", "A3", "medición A3 publicada (corte vigente)");
  void dimOf;
  return { ok: true, assessment };
}

/* ═══ Test de capacidad empresarial ═══
   Cualquier usuario con sesión responde el test; cada persona guarda una
   sola respuesta (la última reemplaza). El advisor y el líder ven todas;
   los demás solo la propia. */

const testStore = () => g.__pgtdTests!;

export const getTestResponses = (user: SessionUser): TestResponse[] => {
  const all = [...testStore().values()];
  return user.role === "CONSULTOR" || user.role === "LIDER" || user.role === "ADMIN"
    ? all : all.filter((t) => t.email === user.email);
};

export function saveTestResponse(
  user: SessionUser,
  input: { r: Record<string, unknown>; cargo?: string; objetivo?: string },
): { ok: true; response: TestResponse } | { ok: false; status: number; error: string } {
  const r: Record<string, number | string> = {};
  let answered = 0;
  for (let n = 1; n <= 24; n++) {
    const v = input.r?.[String(n)];
    if (v === undefined || v === null || v === "") continue;
    if (v === "NI") { r[n] = "NI"; continue; }
    if (!inRange(typeof v === "string" ? Number(v) : v, 1, 5)) {
      return { ok: false, status: 422, error: `La pregunta ${n} admite 1 a 5 o «Sin información».` };
    }
    r[n] = Number(v); answered++;
  }
  const q25 = input.r?.["25"];
  if (q25 !== undefined && q25 !== "" && !["A", "B", "C", "D", "E"].includes(String(q25))) {
    return { ok: false, status: 422, error: "La pregunta 25 admite una opción de A a E." };
  }
  if (q25) r[25] = String(q25);
  if (answered < 12) {
    return { ok: false, status: 422, error: `Responde al menos 12 preguntas con un número para guardar el test (llevas ${answered}).` };
  }
  const response: TestResponse = {
    email: user.email, name: user.name, role: user.role,
    cargo: input.cargo?.trim() || undefined, objetivo: input.objetivo?.trim() || undefined,
    at: new Date().toISOString(), r,
  };
  testStore().set(user.email, response);
  audit(user, "task", `test:${user.email}`, `test de capacidad empresarial guardado (${answered} respuestas)`);
  return { ok: true, response };
}

/* ═══ Informe de una página del test: campos que completa el consultor ═══ */

const testNotes = () => g.__pgtdTestNotes!;
export const getTestNotes = (): Record<string, TestNotes> => Object.fromEntries(testNotes());

export function setTestNotes(
  user: SessionUser,
  id: string,
  patch: Partial<Pick<TestNotes, "restriccion" | "evidencias" | "accion" | "noNecesita">>,
): { ok: true; notes: TestNotes } | { ok: false; status: number; error: string } {
  if (!["CONSULTOR", "LIDER"].includes(user.role)) {
    return { ok: false, status: 403, error: "El informe del test lo completa el advisor o el líder de la empresa." };
  }
  if (!id || id.length > 120) return { ok: false, status: 422, error: "Participante inválido." };
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 800) : undefined);
  const prev = testNotes().get(id);
  const notes: TestNotes = {
    ...prev,
    ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v !== undefined)),
    by: user.name, at: new Date().toISOString(),
  };
  testNotes().set(id, notes);
  audit(user, "task", `test:${id}`, "informe del test actualizado");
  return { ok: true, notes };
}

/* ═══ Fuente 2 · percepción de equipos (anónima) ═══
   Llega por el enlace de la empresa, sin sesión ni identidad: no se guarda
   quién responde ni desde dónde. El advisor y el líder ven el conteo y los
   agregados; nadie ve una respuesta individual con nombre. */

const f2Store = () => g.__pgtdF2!;
const F2_CODES = new Set([...DIMS.flatMap((d) => d.f2.map((q) => q.code)), ...F2_GENERAL.map((q) => q.code)]);

export const getF2Responses = (): F2Response[] => [...f2Store()];

export function saveF2Response(
  input: { r: Record<string, unknown>; area?: string; abierta?: string },
): { ok: true; response: F2Response; total: number } | { ok: false; status: number; error: string } {
  const r: Record<string, number> = {};
  for (const code of F2_CODES) {
    const v = input.r?.[code];
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "string" ? Number(v) : v;
    if (!inRange(n, 1, 5)) return { ok: false, status: 422, error: `La afirmación ${code} admite 1 a 5.` };
    r[code] = n as number;
  }
  const answered = Object.keys(r).length;
  if (answered < 30) {
    return { ok: false, status: 422, error: `Responde al menos 30 de las 40 afirmaciones (llevas ${answered}).` };
  }
  const abierta = (input.abierta ?? "").trim().slice(0, 600);
  const response: F2Response = {
    id: `F2-${String(f2Store().length + 1).padStart(4, "0")}`,
    at: new Date().toISOString(),
    area: (input.area ?? "").trim().slice(0, 60) || undefined,
    r, abierta: abierta || undefined,
  };
  f2Store().push(response);
  return { ok: true, response, total: f2Store().length };
}

/* ═══ Corte en curso: lo capturado en la plataforma como fuentes del 4Shine-OD ═══
   F1 = autoevaluaciones por persona (cada quien captura las prácticas de su
   capacidad); F2 = encuesta anónima; F3 = marcas de evidencia y nivel por
   dimensión (promedio redondeado de los niveles de sus prácticas); test =
   respuestas guardadas. El motor (lib/od) consolida igual que con la demo. */

export function platformResponses(): OdResponse[] {
  const out: OdResponse[] = [];
  const byUser = new Map<string, OdResponse>();
  for (const [code, c] of capture()) {
    if (c.perception === undefined) continue;
    const r = byUser.get(c.by) ?? { tipo: "f1" as const, meta: { nombre: c.by }, r: {} };
    r.r[code] = c.perception; byUser.set(c.by, r);
  }
  out.push(...byUser.values());
  for (const f of f2Store()) out.push({ tipo: "f2", meta: { area: f.area ?? "" }, r: f.r, n: { abierta: f.abierta ?? "" } });
  const r3: OdResponse["r"] = {}; const lv: Record<string, number> = {}; let any = false;
  for (const d of DIMS) {
    const levels: number[] = [];
    for (const p of d.prac) {
      const c = capture().get(p.code);
      if (c?.evidence) { r3[p.code] = c.evidence; any = true; }
      if (c?.level !== undefined) levels.push(c.level);
    }
    if (levels.length) { lv[d.code] = Math.round(levels.reduce((x, y) => x + y, 0) / levels.length); any = true; }
  }
  if (any) out.push({ tipo: "f3", meta: { nombre: "Advisor" }, r: r3, lv });
  for (const t of testStore().values()) out.push({ tipo: "test", meta: { nombre: t.name, cargo: t.cargo ?? t.role }, r: t.r });
  return out;
}

/* ═══ Reporte de valores de KPI ═══
   El responsable de línea reporta los KPI de SU línea; líder y consultor,
   todos. El valor se suma a la serie del seed (overlay) y el motor —salud,
   proyección, alertas— lo lee como un punto más. */

const kpiReports = () => g.__pgtdKpiReports!;

export const getKpiReports = (code?: string): KpiReport[] =>
  code ? (kpiReports().get(code) ?? []) : [...kpiReports().values()].flat();

/** Serie efectiva: seed + valores reportados, ordenada por periodo. */
export function effectiveKpiSeries(code: string): KpiFull["series"] {
  const k = KPI_CATALOG.find((x) => x.code === code);
  if (!k) return [];
  const reported = (kpiReports().get(code) ?? []).map((r) => ({
    period: r.period, value: r.value, note: r.note ?? `Reportado por ${r.by}`,
  }));
  const merged = [...k.series.filter((s) => !reported.some((r) => r.period === s.period)), ...reported];
  return merged.sort((a, b) => periodIndex(a.period) - periodIndex(b.period));
}

export const effectiveKpis = (): KpiFull[] =>
  KPI_CATALOG.map((k) => ({ ...k, series: effectiveKpiSeries(k.code) }));

export function reportKpi(
  user: SessionUser,
  code: string,
  period: string,
  value: number,
  note?: string,
): { ok: true; report: KpiReport; series: KpiFull["series"] } | { ok: false; status: number; error: string } {
  const k = KPI_CATALOG.find((x) => x.code === code);
  if (!k) return { ok: false, status: 404, error: "El indicador no existe en el catálogo." };

  if (!can(user, "report_kpi", k.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no reporta valores de KPI."
        : `No puedes reportar KPI de la capacidad ${capName(k.line)}: tu ámbito es ${capName(user.line)}.`,
    };
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { ok: false, status: 422, error: "El valor debe ser un número no negativo." };
  }
  if (typeof period !== "string" || !isValidPeriod(period)) {
    return { ok: false, status: 422, error: "Periodo inválido. Formatos: 2027 · 2027-S1 · 2027-T3." };
  }
  // el periodo no puede ser anterior a la serie del seed (correcciones solo
  // sobre lo reportado desde la plataforma)
  const lastSeed = k.series[k.series.length - 1];
  if (periodIndex(period) < periodIndex(lastSeed.period)) {
    return {
      ok: false, status: 422,
      error: `La serie oficial llega hasta ${lastSeed.period}: los periodos anteriores no se reescriben desde aquí.`,
    };
  }

  const report: KpiReport = { code, period, value, note: note?.trim() || undefined, by: user.name, at: new Date().toISOString() };
  const list = kpiReports().get(code) ?? [];
  const existing = list.findIndex((r) => r.period === period);
  if (existing >= 0) list[existing] = report;   // corrección del mismo periodo (auditada)
  else list.push(report);
  kpiReports().set(code, list);

  audit(user, "task", code, `KPI ${code}: ${period} = ${value} ${k.unit}${existing >= 0 ? " (corrección)" : ""}`);
  return { ok: true, report, series: effectiveKpiSeries(code) };
}

/* ═══ Actualización de iniciativas ═══
   Avance, estado, factores de éxito (con historial de revisiones), bitácora
   y próximo hito. El responsable de línea edita SU línea. */

const iniOverrides = () => g.__pgtdIniOverrides!;

export const getInitiativeOverrides = (): Record<string, InitiativeOverride> =>
  Object.fromEntries(iniOverrides());

/** Iniciativas efectivas: seed + cambios hechos desde la plataforma. */
export function effectiveInitiatives(): InitiativeFull[] {
  return INITIATIVES_FULL.map((i) => {
    const o = iniOverrides().get(i.id);
    if (!o) return i;
    return {
      ...i,
      progress: o.progress ?? i.progress,
      status: o.status ?? i.status,
      nextMilestone: o.nextMilestone ?? i.nextMilestone,
      log: [...i.log, ...(o.logAppends ?? [])],
      factors: i.factors.map((f) => {
        const fo = o.factors?.[f.name];
        return fo ? { ...f, state: fo.state, note: fo.note ?? f.note, history: fo.history } : f;
      }),
    };
  });
}

const INI_STATUS: InitiativeFull["status"][] = ["PLANEADA", "EN_CURSO", "EN_RIESGO", "COMPLETADA"];
const FACTOR_STATES = ["VERDE", "AMBAR", "ROJO"] as const;

export function updateInitiative(
  user: SessionUser,
  id: string,
  patch: {
    progress?: number;
    status?: InitiativeFull["status"];
    factor?: { name: string; state: "VERDE" | "AMBAR" | "ROJO"; note?: string };  // registra una revisión
    log?: { type: "HITO" | "ALERTA" | "NOTA"; text: string };
    nextMilestone?: { date: string; text: string };
  },
): { ok: true; initiative: InitiativeFull } | { ok: false; status: number; error: string } {
  const base = INITIATIVES_FULL.find((i) => i.id === id);
  if (!base) return { ok: false, status: 404, error: "La iniciativa no existe." };

  if (!can(user, "edit_initiatives", base.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no edita iniciativas."
        : `No puedes editar iniciativas de la capacidad ${capName(base.line)}: tu ámbito es ${capName(user.line)}.`,
    };
  }

  const o: InitiativeOverride = iniOverrides().get(id) ?? {};
  const changes: string[] = [];

  if (patch.progress !== undefined) {
    if (!Number.isInteger(patch.progress) || patch.progress < 0 || patch.progress > 100) {
      return { ok: false, status: 422, error: "El avance es un entero 0–100." };
    }
    changes.push(`avance → ${patch.progress} %`);
    o.progress = patch.progress;
  }

  if (patch.status !== undefined) {
    if (!INI_STATUS.includes(patch.status)) {
      return { ok: false, status: 422, error: "Estado de iniciativa inválido." };
    }
    changes.push(`estado → ${patch.status}`);
    o.status = patch.status;
  }

  if (patch.factor) {
    const f = base.factors.find((x) => x.name === patch.factor!.name);
    if (!f) return { ok: false, status: 422, error: "El factor no pertenece a esta iniciativa." };
    if (!FACTOR_STATES.includes(patch.factor.state)) {
      return { ok: false, status: 422, error: "Estado de factor inválido (VERDE/AMBAR/ROJO)." };
    }
    // registrar la revisión: el estado previo pasa al historial
    const prevState = o.factors?.[f.name]?.state ?? f.state;
    const prevHistory = o.factors?.[f.name]?.history ?? f.history;
    o.factors = {
      ...o.factors,
      [f.name]: {
        state: patch.factor.state,
        note: patch.factor.note?.trim() || undefined,
        history: [...prevHistory, prevState],
      },
    };
    changes.push(`factor «${f.name}» → ${patch.factor.state}`);
  }

  if (patch.log) {
    if (!["HITO", "ALERTA", "NOTA"].includes(patch.log.type) || !patch.log.text?.trim()) {
      return { ok: false, status: 422, error: "La bitácora exige tipo (HITO/ALERTA/NOTA) y texto." };
    }
    o.logAppends = [...(o.logAppends ?? []), { date: DEMO_TODAY, type: patch.log.type, text: patch.log.text.trim() }];
    changes.push(`bitácora: ${patch.log.type.toLowerCase()}`);
  }

  if (patch.nextMilestone) {
    if (!patch.nextMilestone.date?.trim() || !patch.nextMilestone.text?.trim()) {
      return { ok: false, status: 422, error: "El próximo hito exige fecha y descripción." };
    }
    o.nextMilestone = { date: patch.nextMilestone.date.trim(), text: patch.nextMilestone.text.trim() };
    changes.push("próximo hito actualizado");
  }

  if (changes.length === 0) {
    return { ok: false, status: 422, error: "Nada que actualizar." };
  }

  iniOverrides().set(id, o);
  audit(user, "task", id, `iniciativa: ${changes.join(" · ")}`);
  return { ok: true, initiative: effectiveInitiatives().find((i) => i.id === id)! };
}

/* ── medición efectiva: la publicada en el store manda sobre el seed ── */

export const publishedAssessment = (): AssessmentRecord | null => g.__pgtdPublished ?? null;

export const effectiveCurrent = (): AssessmentRecord =>
  g.__pgtdPublished ?? staticCurrent();

export const effectivePrevious = (): AssessmentRecord | null =>
  g.__pgtdPublished ? staticCurrent() : staticPrevious();

export const effectiveAssessments = () =>
  SCORES_HISTORY.map((a) =>
    a.id === "A3" && g.__pgtdPublished
      ? { id: a.id, label: a.label, period: g.__pgtdPublished!.period, status: "PUBLICADA" as const, note: g.__pgtdPublished!.note }
      : { id: a.id, label: a.label, period: a.period, status: a.status, note: a.note });

/* ═══ Administración de usuarios (manage_users) ═══
   Usuarios efectivos: los del seed + los creados desde la plataforma.
   Contraseña demo compartida; con la migración a Auth.js, alta con
   invitación y hash bcrypt por usuario. */

export type ManagedUser = {
  email: string;
  name: string;
  role: SessionUser["role"];
  line?: number;
  active: boolean;
  seeded: boolean;             // vino del seed (no se elimina, solo se desactiva)
  createdBy?: string;
  at?: string;
};

import { DEMO_USERS } from "@/data/demo";

const users = () => {
  const gu = g as unknown as { __pgtdUsers?: ManagedUser[] };
  if (!gu.__pgtdUsers) {
    gu.__pgtdUsers = DEMO_USERS.map((u) => ({
      email: u.email, name: u.name, role: u.role as SessionUser["role"],
      line: "line" in u ? (u as { line?: number }).line : undefined,
      active: true, seeded: true,
    }));
  }
  return gu.__pgtdUsers;
};

export const getUsers = (): ManagedUser[] => users();

export const findActiveUser = (email: string): ManagedUser | null =>
  users().find((u) => u.active && u.email.toLowerCase() === email.toLowerCase()) ?? null;

const VALID_ROLES: SessionUser["role"][] = ["ADMIN", "CONSULTOR", "LIDER", "RESPONSABLE", "DIRECTIVO"];

export function createUser(
  actor: SessionUser,
  input: { email: string; name: string; role: SessionUser["role"]; line?: number },
): { ok: true; user: ManagedUser } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_users")) {
    return { ok: false, status: 403, error: "Solo el equipo consultor administra usuarios." };
  }
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, status: 422, error: "Correo inválido." };
  }
  if (users().some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, status: 422, error: "Ya existe un usuario con ese correo." };
  }
  if (!input.name?.trim() || input.name.trim().length < 5) {
    return { ok: false, status: 422, error: "El nombre debe ser completo (mínimo 5 caracteres)." };
  }
  if (!VALID_ROLES.includes(input.role)) {
    return { ok: false, status: 422, error: "Rol inválido." };
  }
  if (input.role === "RESPONSABLE" && ![1, 2, 3, 4].includes(input.line ?? 0)) {
    return { ok: false, status: 422, error: "El responsable de línea exige una línea (4.1–4.4)." };
  }
  const user: ManagedUser = {
    email, name: input.name.trim(), role: input.role,
    line: input.role === "RESPONSABLE" ? input.line : undefined,
    active: true, seeded: false,
    createdBy: actor.name, at: new Date().toISOString(),
  };
  users().push(user);
  audit(actor, "task", email, `usuario creado (${input.role}${user.line ? ` · ${capName(user.line)}` : ""})`);
  return { ok: true, user };
}

export function updateUser(
  actor: SessionUser,
  email: string,
  patch: { role?: SessionUser["role"]; line?: number; active?: boolean },
): { ok: true; user: ManagedUser } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_users")) {
    return { ok: false, status: 403, error: "Solo el equipo consultor administra usuarios." };
  }
  const u = users().find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return { ok: false, status: 404, error: "El usuario no existe." };

  const changes: string[] = [];

  if (patch.active !== undefined && patch.active !== u.active) {
    if (!patch.active && u.email.toLowerCase() === actor.email.toLowerCase()) {
      return { ok: false, status: 422, error: "No puedes desactivar tu propia cuenta." };
    }
    if (!patch.active && u.role === "ADMIN" &&
        users().filter((x) => x.active && x.role === "ADMIN").length <= 1) {
      return { ok: false, status: 422, error: "Debe quedar al menos un administrador activo." };
    }
    u.active = patch.active;
    changes.push(patch.active ? "reactivado" : "desactivado");
  }

  if (patch.role !== undefined && patch.role !== u.role) {
    if (!VALID_ROLES.includes(patch.role)) {
      return { ok: false, status: 422, error: "Rol inválido." };
    }
    if (u.role === "ADMIN" && patch.role !== "ADMIN" &&
        users().filter((x) => x.active && x.role === "ADMIN").length <= 1) {
      return { ok: false, status: 422, error: "Debe quedar al menos un administrador activo." };
    }
    changes.push(`rol ${u.role} → ${patch.role}`);
    u.role = patch.role;
    if (patch.role !== "RESPONSABLE") u.line = undefined;
  }

  if (patch.line !== undefined && patch.line !== u.line) {
    if (u.role !== "RESPONSABLE") {
      return { ok: false, status: 422, error: "La línea solo aplica al responsable de línea." };
    }
    if (![1, 2, 3, 4].includes(patch.line)) {
      return { ok: false, status: 422, error: "Línea inválida (1–4)." };
    }
    changes.push(`línea → 4.${patch.line}`);
    u.line = patch.line;
  }

  if (changes.length === 0) return { ok: false, status: 422, error: "Nada que actualizar." };
  audit(actor, "task", u.email, `usuario: ${changes.join(" · ")}`);
  return { ok: true, user: u };
}

/* ═══ Integraciones (OpenAI · Cloudflare R2 · AWS SES) ═══
   Configuración local en memoria: los secretos nunca vuelven completos al
   cliente (se enmascaran salvo los últimos 4). Con la base conectada pasan
   a variables de entorno del despliegue. */

export type IntegrationKey = "openai" | "r2" | "ses";

export type IntegrationConfig = {
  enabled: boolean;
  fields: Record<string, string>;    // valores crudos (solo servidor)
  updatedBy?: string;
  at?: string;
};

type IntegrationSpec = {
  name: string;
  purpose: string;
  fields: { key: string; label: string; secret?: boolean; placeholder: string; validate: (v: string) => string | null }[];
};

const req = (label: string) => (v: string) => (v.trim() ? null : `${label} es obligatorio`);

export const INTEGRATION_SPECS: Record<IntegrationKey, IntegrationSpec> = {
  openai: {
    name: "OpenAI",
    purpose: "Redacción asistida de hallazgos y normalización de importaciones (opcional).",
    fields: [
      {
        key: "apiKey", label: "API key", secret: true, placeholder: "sk-…",
        validate: (v) => (/^sk-[A-Za-z0-9_-]{20,}$/.test(v.trim()) ? null : "La API key de OpenAI inicia con sk- y tiene al menos 20 caracteres"),
      },
      {
        key: "model", label: "Modelo", placeholder: "gpt-4o-mini",
        validate: req("El modelo"),
      },
    ],
  },
  r2: {
    name: "Cloudflare R2",
    purpose: "Almacenamiento de evidencias, logos y exportaciones (hoy: var/uploads local).",
    fields: [
      {
        key: "accountId", label: "Account ID", placeholder: "32 caracteres hex",
        validate: (v) => (/^[a-f0-9]{32}$/i.test(v.trim()) ? null : "El Account ID de Cloudflare son 32 caracteres hexadecimales"),
      },
      { key: "accessKeyId", label: "Access Key ID", secret: true, placeholder: "…", validate: req("El Access Key ID") },
      { key: "secretAccessKey", label: "Secret Access Key", secret: true, placeholder: "…", validate: req("El Secret Access Key") },
      { key: "bucket", label: "Bucket", placeholder: "pgtd", validate: req("El bucket") },
    ],
  },
  ses: {
    name: "AWS SES",
    purpose: "Correo saliente: notificaciones, invitaciones de usuarios y resúmenes semanales.",
    fields: [
      {
        key: "region", label: "Región", placeholder: "us-east-1",
        validate: (v) => (/^[a-z]{2}-[a-z]+-\d$/.test(v.trim()) ? null : "Región AWS inválida (p. ej. us-east-1)"),
      },
      {
        key: "accessKeyId", label: "Access Key ID", secret: true, placeholder: "AKIA…",
        validate: (v) => (/^AKIA[A-Z0-9]{16}$/.test(v.trim()) ? null : "El Access Key ID de AWS inicia con AKIA (20 caracteres)"),
      },
      { key: "secretAccessKey", label: "Secret Access Key", secret: true, placeholder: "…", validate: req("El Secret Access Key") },
      {
        key: "sender", label: "Remitente verificado", placeholder: "pgtd@algoritmot.com",
        validate: (v) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? null : "El remitente debe ser un correo válido"),
      },
    ],
  },
};

const integrations = () => {
  const gi = g as unknown as { __pgtdIntegrations?: Map<IntegrationKey, IntegrationConfig> };
  if (!gi.__pgtdIntegrations) gi.__pgtdIntegrations = new Map();
  return gi.__pgtdIntegrations;
};

const maskSecret = (v: string) => (v.length <= 4 ? "••••" : "•".repeat(Math.min(12, v.length - 4)) + v.slice(-4));

/** Estado para el cliente: secretos enmascarados, nunca completos. */
export function getIntegrationsMasked() {
  return (Object.keys(INTEGRATION_SPECS) as IntegrationKey[]).map((key) => {
    const spec = INTEGRATION_SPECS[key];
    const cfg = integrations().get(key);
    return {
      key,
      name: spec.name,
      purpose: spec.purpose,
      enabled: cfg?.enabled ?? false,
      configured: Boolean(cfg && spec.fields.every((f) => cfg.fields[f.key]?.trim())),
      updatedBy: cfg?.updatedBy,
      at: cfg?.at,
      fields: spec.fields.map((f) => ({
        key: f.key, label: f.label, secret: Boolean(f.secret), placeholder: f.placeholder,
        value: cfg?.fields[f.key] ? (f.secret ? maskSecret(cfg.fields[f.key]) : cfg.fields[f.key]) : "",
      })),
    };
  });
}

export function setIntegration(
  user: SessionUser,
  key: IntegrationKey,
  patch: { enabled?: boolean; fields?: Record<string, string> },
): { ok: true } | { ok: false; status: number; error: string } {
  if (!can(user, "manage_platform")) {
    return { ok: false, status: 403, error: "Solo el administrador de la plataforma configura integraciones." };
  }
  const spec = INTEGRATION_SPECS[key];
  if (!spec) return { ok: false, status: 404, error: "Integración desconocida." };

  const cfg: IntegrationConfig = integrations().get(key) ?? { enabled: false, fields: {} };

  if (patch.fields) {
    for (const f of spec.fields) {
      const raw = patch.fields[f.key];
      if (raw === undefined || raw === "") continue;              // sin cambio
      if (f.secret && /^•/.test(raw)) continue;                    // volvió la máscara: conservar
      const problem = f.validate(raw);
      if (problem) return { ok: false, status: 422, error: `${spec.name}: ${problem}.` };
      cfg.fields[f.key] = raw.trim();
    }
  }

  if (patch.enabled !== undefined) {
    if (patch.enabled && !spec.fields.every((f) => cfg.fields[f.key]?.trim())) {
      return { ok: false, status: 422, error: `${spec.name}: completa la configuración antes de activarla.` };
    }
    cfg.enabled = patch.enabled;
  }

  cfg.updatedBy = user.name;
  cfg.at = new Date().toISOString();
  integrations().set(key, cfg);
  audit(user, "task", `int-${key}`, `integración ${spec.name} ${patch.enabled !== undefined ? (patch.enabled ? "activada" : "desactivada") : "configurada"}`);
  return { ok: true };
}

/* ═══ Branding de la plataforma ═══
   Configuración completa de marca: identidad (nombres, logos, favicon,
   zona horaria), tema visual (paleta con derivados, tipografía, radio,
   ancho, botones), login (layout, textos con visibilidad, overlay,
   imágenes en rotación, loader) y CSS avanzado. Cada guardado queda en
   el historial auditado. */

export type Branding = {
  // identidad
  platformName: string; showPlatformName: boolean;
  institutionName: string;
  shortName: string;
  tagline: string;
  logoLight: string | null;      // sobre fondos claros (URL o /api/branding-asset/…)
  logoDark: string | null;       // sobre fondos oscuros (si falta, se reusa el principal)
  favicon: string | null;
  timezone: string;
  // tema visual
  primary: string;               // hex — superficies de marca (rail, botones)
  secondary: string;             // hex — profundo (gradientes, overlays)
  accent: string;                // hex — el matiz que tiñe kickers, chips y gráficos
  font: string;                  // Google Font curada (Inter por defecto)
  radius: string;                // p. ej. "14px" · "0.8rem"
  maxWidth: string;              // ancho máximo del contenido
  buttonStyle: "solid" | "outline";
  // login
  loginLayout: "image-left" | "image-right" | "centered";
  loginTitle: string; showLoginTitle: boolean;
  loginWelcome: string; showLoginWelcome: boolean;
  loginSupport: string; showLoginSupport: boolean;
  heroTitle: string; showHeroTitle: boolean;
  heroMessages: string[];        // rotan aleatoriamente en cada carga
  showHeroMessages: boolean;
  heroSupport: string; showHeroSupport: boolean;
  overlayColor: string;          // hex del velo sobre la imagen
  overlayOpacity: number;        // 0–100
  backgroundImages: string[];    // fondos del layout centrado (rotación aleatoria)
  panelImages: string[];         // imágenes del panel lateral (rotación aleatoria)
  loader: string | null;         // imagen/GIF de carga
  loaderText: string; showLoaderText: boolean;
  customCss: string;
};

export const DEFAULT_BRANDING: Branding = {
  platformName: "4Shine Empresas", showPlatformName: true,
  institutionName: "Andina Suministros",
  shortName: "Andina",
  tagline: "Dirección elige. Liderazgo moviliza. Ejecución cumple. Multiplicación escala.",
  logoLight: null, logoDark: null, favicon: null,
  timezone: "America/Bogota",
  primary: "#0D1B2A", secondary: "#08111c", accent: "#8a6d1f",
  font: "Inter", radius: "14px", maxWidth: "1220px", buttonStyle: "solid",
  loginLayout: "image-left",
  loginTitle: "Iniciar sesión", showLoginTitle: true,
  loginWelcome: "Entra con la cuenta que te asignó el advisor de tu empresa.", showLoginWelcome: true,
  loginSupport: "Soporte: soporte@4shine.co", showLoginSupport: false,
  heroTitle: "Plataforma de gestión estratégica 4Shine Empresas", showHeroTitle: true,
  heroMessages: [], showHeroMessages: true,
  heroSupport: "", showHeroSupport: false,
  overlayColor: "#0d1830", overlayOpacity: 72,
  backgroundImages: [], panelImages: ["/back.jpg"],
  loader: null, loaderText: "Cargando experiencia", showLoaderText: true,
  customCss: "",
};

export const BRANDING_FONTS = ["Inter", "Manrope", "Outfit", "Poppins", "Roboto", "Nunito Sans", "Work Sans"] as const;
export const BRANDING_TIMEZONES = [
  "America/Bogota", "America/Mexico_City", "America/Lima", "America/Santiago",
  "America/Argentina/Buenos_Aires", "America/Panama", "UTC",
] as const;
const MAX_WIDTHS = ["1100px", "1220px", "1260px", "1440px", "1600px", "100%"];

const branding = () => {
  const gb = g as unknown as { __pgtdBranding?: Branding };
  if (!gb.__pgtdBranding) gb.__pgtdBranding = structuredClone(DEFAULT_BRANDING);
  // migración defensiva: si el objeto en memoria viene de una versión
  // anterior del modelo, se completan las claves faltantes con el default
  for (const [k, v] of Object.entries(DEFAULT_BRANDING)) {
    if ((gb.__pgtdBranding as Record<string, unknown>)[k] === undefined) {
      (gb.__pgtdBranding as Record<string, unknown>)[k] = structuredClone(v);
    }
  }
  return gb.__pgtdBranding;
};

export const getBranding = (): Branding => ({ ...branding() });

const HEX = /^#[0-9a-f]{6}$/i;
const isUrlish = (v: string) => /^https?:\/\/\S+$/.test(v) || v.startsWith("/");

export function setBranding(
  user: SessionUser,
  patch: Partial<Branding>,
): { ok: true; branding: Branding } | { ok: false; status: number; error: string } {
  if (!can(user, "manage_platform")) {
    return { ok: false, status: 403, error: "Solo el administrador de la plataforma edita el branding." };
  }
  const b = branding();
  const changes: string[] = [];
  const err = (m: string) => ({ ok: false as const, status: 422, error: m });

  // ── identidad ──
  if (patch.platformName !== undefined) {
    if (patch.platformName.trim().length < 2) return err("El nombre de la plataforma es demasiado corto.");
    b.platformName = patch.platformName.trim(); changes.push("nombre de plataforma");
  }
  if (patch.institutionName !== undefined) {
    if (patch.institutionName.trim().length < 5) return err("El nombre institucional es demasiado corto.");
    b.institutionName = patch.institutionName.trim(); changes.push("nombre institucional");
  }
  if (patch.shortName !== undefined) {
    if (!/^[A-ZÁÉÍÓÚÑ0-9]{2,10}$/i.test(patch.shortName.trim())) {
      return err("La sigla debe tener 2–10 caracteres alfanuméricos.");
    }
    b.shortName = patch.shortName.trim().toUpperCase(); changes.push("sigla");
  }
  if (patch.tagline !== undefined) { b.tagline = patch.tagline.trim(); changes.push("tagline"); }
  for (const key of ["logoLight", "logoDark", "favicon", "loader"] as const) {
    const v = patch[key];
    if (v !== undefined) {
      if (v !== null && !isUrlish(v)) return err(`${key}: debe ser una URL (https://…) o una ruta local.`);
      b[key] = v; changes.push(key);
    }
  }
  if (patch.timezone !== undefined) {
    if (!patch.timezone.trim() || !/^[A-Za-z_]+(\/[A-Za-z_]+){0,2}$/.test(patch.timezone.trim())) {
      return err("Zona horaria inválida (formato Área/Ciudad).");
    }
    b.timezone = patch.timezone.trim(); changes.push("zona horaria");
  }

  // ── tema visual ──
  for (const key of ["primary", "secondary", "accent", "overlayColor"] as const) {
    const v = patch[key];
    if (v !== undefined) {
      if (!HEX.test(v)) return err(`${key}: debe ser un color hex (#rrggbb).`);
      b[key] = v.toLowerCase(); changes.push(key);
    }
  }
  if (patch.font !== undefined) {
    if (!(BRANDING_FONTS as readonly string[]).includes(patch.font)) {
      return err(`Fuente no soportada. Opciones: ${BRANDING_FONTS.join(", ")}.`);
    }
    b.font = patch.font; changes.push("tipografía");
  }
  if (patch.radius !== undefined) {
    if (!/^\d+(\.\d+)?(px|rem)$/.test(patch.radius.trim())) return err("El radio debe ser un valor en px o rem (p. ej. 0.8rem).");
    b.radius = patch.radius.trim(); changes.push("radio de borde");
  }
  if (patch.maxWidth !== undefined) {
    if (!MAX_WIDTHS.includes(patch.maxWidth)) return err(`Ancho máximo inválido. Opciones: ${MAX_WIDTHS.join(", ")}.`);
    b.maxWidth = patch.maxWidth; changes.push("ancho máximo");
  }
  if (patch.buttonStyle !== undefined) {
    if (!["solid", "outline"].includes(patch.buttonStyle)) return err("Estilo de botón inválido (solid/outline).");
    b.buttonStyle = patch.buttonStyle; changes.push("estilo de botón");
  }

  // ── login ──
  if (patch.loginLayout !== undefined) {
    if (!["image-left", "image-right", "centered"].includes(patch.loginLayout)) {
      return err("Layout de login inválido (image-left/image-right/centered).");
    }
    b.loginLayout = patch.loginLayout; changes.push("layout del login");
  }
  for (const key of ["loginTitle", "loginWelcome", "loginSupport", "heroTitle", "heroSupport", "loaderText"] as const) {
    if (patch[key] !== undefined) { b[key] = patch[key]!.trim(); changes.push(key); }
  }
  for (const key of ["showPlatformName", "showLoginTitle", "showLoginWelcome", "showLoginSupport",
    "showHeroTitle", "showHeroMessages", "showHeroSupport", "showLoaderText"] as const) {
    if (patch[key] !== undefined) { b[key] = Boolean(patch[key]); changes.push(key); }
  }
  if (patch.overlayOpacity !== undefined) {
    if (!Number.isFinite(patch.overlayOpacity) || patch.overlayOpacity < 0 || patch.overlayOpacity > 100) {
      return err("La opacidad del velo es un número 0–100.");
    }
    b.overlayOpacity = Math.round(patch.overlayOpacity); changes.push("opacidad del velo");
  }
  if (patch.heroMessages !== undefined) {
    if (!Array.isArray(patch.heroMessages) || patch.heroMessages.some((m) => typeof m !== "string")) {
      return err("Los mensajes sobre imagen deben ser una lista de textos.");
    }
    b.heroMessages = patch.heroMessages.map((m) => m.trim()).filter(Boolean).slice(0, 8);
    changes.push("mensajes sobre imagen");
  }
  for (const key of ["backgroundImages", "panelImages"] as const) {
    const v = patch[key];
    if (v !== undefined) {
      if (!Array.isArray(v) || v.some((u) => typeof u !== "string" || !isUrlish(u))) {
        return err(`${key}: deben ser URLs (https://…) o rutas locales.`);
      }
      b[key] = v.slice(0, 10); changes.push(key);
    }
  }
  if (patch.customCss !== undefined) {
    if (patch.customCss.length > 20_000) return err("El CSS personalizado supera los 20.000 caracteres.");
    b.customCss = patch.customCss; changes.push("CSS personalizado");
  }

  if (changes.length === 0) return err("Nada que actualizar.");
  audit(user, "branding", "branding", `branding: ${changes.join(" · ")}`);
  return { ok: true, branding: { ...b } };
}

/** Historial de cambios de branding (auditoría filtrada). */
export const getBrandingHistory = () =>
  auditLog().filter((a) => a.entity === "branding");

/* ═══ Notificaciones: estado de lectura por usuario ═══ */

const notifRead = () => {
  const gn = g as unknown as { __pgtdNotifRead?: Map<string, Set<string>> };
  if (!gn.__pgtdNotifRead) gn.__pgtdNotifRead = new Map();
  return gn.__pgtdNotifRead;
};

export const getNotifRead = (email: string): Set<string> =>
  notifRead().get(email) ?? new Set();

export function markNotifRead(email: string, ids: string[]) {
  const set = notifRead().get(email) ?? new Set<string>();
  for (const id of ids) set.add(id);
  notifRead().set(email, set);
}

/* ═══ Utilidad para la demo ═══ */

export function resetStore() {
  g.__pgtdTasks = TASKS_SEED.map((t) => ({ ...t }));
  g.__pgtdEvidence = new Map(EVIDENCE_CATALOG.map((e) => [e.id, e.status]));
  g.__pgtdAudit = [];
  g.__pgtdComments = [];
  g.__pgtdUploads = [];
  g.__pgtdBaseline = new Map(TASKS_SEED.map((t) => [t.id, { start: t.start, due: t.due }]));
  g.__pgtdCapture = new Map();
  g.__pgtdPublished = null;
  g.__pgtdKpiReports = new Map();
  g.__pgtdTests = new Map();
  g.__pgtdF2 = [];
  g.__pgtdTestNotes = new Map();
  g.__pgtdIniOverrides = new Map();
  (g as unknown as { __pgtdArchived?: Task[] }).__pgtdArchived = [];
  (g as unknown as { __pgtdNotifRead?: Map<string, Set<string>> }).__pgtdNotifRead = new Map();
  (g as unknown as { __pgtdUsers?: ManagedUser[] }).__pgtdUsers = undefined;
  (g as unknown as { __pgtdIntegrations?: Map<string, unknown> }).__pgtdIntegrations = new Map();
  (g as unknown as { __pgtdBranding?: Branding }).__pgtdBranding = undefined;
}

export { DEMO_TODAY, responsible };
