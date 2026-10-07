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

import { type Task, type TaskStatus, DEMO_TODAY } from "@/data/proyectos";
import { type AssessmentRecord, type CellScore, type KpiFull, type InitiativeFull } from "@/data/cmi";
import {
  ANDINA_CATALOG, emptyCatalog, catalogFromTemplate, PLATFORM_USERS, responsibleIn,
  type Catalog, type CompanyInfo,
} from "@/data/catalogo";
import { currentTenant, DEFAULT_TENANT, hasTenantContext } from "@/server/tenant";
import { PRACTICES, DIMS, dimOf, F2_GENERAL } from "@/data/mapa";
import { periodIndex, isValidPeriod } from "@/lib/period";
import type { SessionUser } from "@/lib/session";
import { consolidate, decisionCheck, isLevel, TYPE_CRITERIA, type Evaluation, type Decision, type Consolidated, type CriterionKey } from "@/lib/priorizacion";
import type { DecisionRecord } from "@/data/priorizacion-demo";
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

/* ═══ Estado por empresa (tenant) ═══
   Cada empresa tiene su propio estado en memoria, creado desde su catálogo
   (Andina: la plantilla demo; las demás: lo que haya en la base). El estado
   activo lo decide el contexto de la petición (src/server/tenant.ts). */

export type TenantState = {
  slug: string;
  dbId: string | null;                 // Company.id en la base (null sin base)
  catalog: Catalog;
  tasks: Task[];
  archived: Task[];
  evidence: Map<string, EvidenceStatus>;
  audit: AuditEntry[];
  comments: TaskComment[];
  uploads: UploadedEvidence[];
  baselines: Map<string, { start: string; due: string }>;
  capture: Map<string, VariableCapture>;
  published: AssessmentRecord | null;
  kpiReports: Map<string, KpiReport[]>;
  tests: Map<string, TestResponse>;
  f2: F2Response[];
  testNotes: Map<string, TestNotes>;
  iniOverrides: Map<string, InitiativeOverride>;
  evals: Map<string, Evaluation>;          // clave iniId|email
  decisions: Map<string, DecisionRecord>;  // clave iniId
  users: ManagedUser[];
  integrations: Map<IntegrationKey, IntegrationConfig>;
  branding?: Branding;
  notifRead: Map<string, Set<string>>;
  hydrated: boolean;
};

export type CompanyRecord = CompanyInfo & { dbId: string | null };

type Registry = {
  companies: Map<string, CompanyRecord>;   // por slug
  tenants: Map<string, TenantState>;
  platformUsers: ManagedUser[];            // admins de plataforma (sin empresa)
  companiesHydrated: boolean;
};

const g = (() => {
  const gg = globalThis as unknown as { __4shine?: Registry };
  if (!gg.__4shine) {
    gg.__4shine = {
      companies: new Map([[DEFAULT_TENANT, { ...ANDINA_CATALOG.company, dbId: null }]]),
      tenants: new Map(),
      platformUsers: PLATFORM_USERS.map((u) => ({ email: u.email, name: u.name, role: u.role, active: true, seeded: true })),
      companiesHydrated: false,
    };
  }
  return gg.__4shine;
})();

function newState(slug: string, source: Catalog, dbId: string | null): TenantState {
  // copia propia: el catálogo de la empresa se edita desde la plataforma y
  // no debe tocar la plantilla ni el de otra empresa
  const catalog = structuredClone(source);
  return {
    slug, dbId, catalog,
    tasks: catalog.tasks.map((t) => ({ ...t })),
    archived: [],
    evidence: new Map(catalog.evidences.map((e) => [e.id, e.status])),
    audit: [], comments: [], uploads: [],
    // línea base del cronograma: las fechas del plan aprobado se congelan;
    // las reprogramaciones mueven las vigentes y el deslizamiento se mide contra esta.
    baselines: new Map(catalog.tasks.map((t) => [t.id, { start: t.start, due: t.due }])),
    capture: new Map(), published: null, kpiReports: new Map(), tests: new Map(), f2: [], testNotes: new Map(),
    iniOverrides: new Map(),
    evals: new Map(catalog.seedEvaluations.map((e) => [`${e.iniId}|${e.by}`, e])),
    decisions: new Map(catalog.seedDecisions.map((d) => [d.iniId, d])),
    users: catalog.seedUsers.map((u) => ({ email: u.email, name: u.name, role: u.role, line: u.line, active: true, seeded: true })),
    integrations: new Map(), notifRead: new Map(), hydrated: false,
  };
}

/** Estado de la empresa activa (se crea la primera vez que se usa). */
function S(): TenantState {
  const slug = currentTenant();
  let t = g.tenants.get(slug);
  if (!t) {
    const c = g.companies.get(slug);
    if (!c) throw new Error(`Empresa desconocida: ${slug}`);
    t = newState(slug, slug === DEFAULT_TENANT ? ANDINA_CATALOG : emptyCatalog(c), c.dbId);
    g.tenants.set(slug, t);
  }
  return t;
}

/** Catálogo de la empresa activa. */
export const catalog = (): Catalog => S().catalog;
const cat = catalog;
export const responsible = (id: string) => responsibleIn(cat(), id);

/** Company.id de la empresa activa en la base (para el write-through). */
const cid = (): string => {
  const id = S().dbId ?? g.companies.get(S().slug)?.dbId;
  if (!id) throw new Error(`la empresa ${S().slug} no está en la base`);
  return id;
};

/** Última medición publicada del catálogo y la anterior. */
const latestPublished = (list: AssessmentRecord[]) => [...list].reverse().find((a) => a.status === "PUBLICADA" && a.scores) ?? null;
const previousPublished = (list: AssessmentRecord[]) => {
  const pubs = list.filter((a) => a.status === "PUBLICADA" && a.scores);
  return pubs.length > 1 ? pubs[pubs.length - 2] : null;
};

const tasks = () => S().tasks;
const comments = () => S().comments;
const uploads = () => S().uploads;
const baselines = () => S().baselines;
const evidenceStatus = () => S().evidence;
const auditLog = () => S().audit;
const capture = () => S().capture;

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
    let url = process.env.DATABASE_URL!;
    let adapter: AnyPrisma;
    if (/^postgres(ql)?:\/\//.test(url)) {
      // PostgreSQL (Neon, Vercel Postgres, local): prisma/postgres/schema.prisma
      const { PrismaPg } = await serverImport("@prisma/adapter-pg") as AnyPrisma;
      adapter = new PrismaPg({ connectionString: url });
    } else {
      // SQLite local; ruta absoluta porque el runtime de Next puede resolver ./ contra otro CWD
      const { PrismaBetterSqlite3 } = await serverImport("@prisma/adapter-better-sqlite3") as AnyPrisma;
      if (url.startsWith("file:./")) url = "file:" + process.cwd() + "/" + url.slice(7);
      adapter = new PrismaBetterSqlite3({ url });
    }
    gp.__pgtdPrisma = new PrismaClient({ adapter });
  }
  return gp.__pgtdPrisma;
}

/* ═══ Empresas (tenants) ═══
   El registro de empresas es global; el estado de cada una se hidrata la
   primera vez que una petición la activa. */

import {
  writeCatalog, readCatalog, companyRow, writeCompanyExtras, writeResponsible, deleteResponsible as dbDeleteResponsible,
  writeObjective, deleteObjective as dbDeleteObjective, writeKpi, deleteKpi as dbDeleteKpi, writeInitiative,
  deleteInitiative as dbDeleteInitiative, writePerson, deletePerson as dbDeletePerson,
} from "@/server/catalog-db";
import { frameworkOfPractice } from "@/data/mapa";
import type { Responsible, CmiObjective } from "@/data/cmi";
import type { Person } from "@/data/proyectos";
import type { Financials } from "@/data/catalogo";
import type { Territory } from "@/data/demo";

/** Carga las empresas y los admins de plataforma desde la base (una vez). */
export async function hydrateCompanies() {
  if (!hasDb() || g.companiesHydrated) return;
  try {
    const db = await prisma();
    for (const c of await db.company.findMany()) {
      const prev = g.companies.get(c.slug);
      g.companies.set(c.slug, {
        slug: c.slug, name: c.name, shortName: c.shortName, city: c.city, department: c.department,
        sector: c.sector ?? "", size: c.size ?? "", sectorKey: c.sectorKey ?? prev?.sectorKey ?? "suministros-industriales",
        ciiu: c.ciiu ?? "", active: c.active, template: (c.template as CompanyInfo["template"]) ?? "vacia",
        createdBy: c.createdBy ?? undefined, createdAt: c.createdAt.toISOString(), dbId: c.id,
      });
      const t = g.tenants.get(c.slug);
      if (t) t.dbId = c.id;
    }
    for (const u of await db.user.findMany({ where: { companyId: null } })) {
      const existing = g.platformUsers.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
      if (existing) { existing.name = u.name; existing.active = u.active; }
      else g.platformUsers.push({ email: u.email, name: u.name, role: u.role as SessionUser["role"], active: u.active, seeded: false, at: u.createdAt.toISOString() });
    }
    g.companiesHydrated = true;
  } catch (e) {
    console.error("[4shine] hidratación de empresas falló:", (e as Error).message);
  }
}

/** Hidrata la memoria de la empresa activa desde la base (una vez por proceso y empresa). */
export async function hydrateFromDb() {
  if (!hasDb()) return;
  await hydrateCompanies();
  const st = S();
  if (st.hydrated) return;
  try {
    const db = await prisma();
    const companyId = st.dbId ?? g.companies.get(st.slug)?.dbId;
    if (!companyId) { st.hydrated = true; return; }   // empresa solo en memoria
    st.dbId = companyId;
    // catálogo: la demo nace del seed; las demás empresas, de la base
    if (st.slug !== DEFAULT_TENANT) {
      const fresh = await readCatalog(db, { ...st.catalog.company, dbId: companyId });
      const next = newState(st.slug, fresh, companyId);
      next.users = st.users;
      Object.assign(st, next);
    }
    const W = { where: { companyId } };
    type DbTaskRow = {
      id: string; status: string; assigneeId: string; coAssigneeIds: unknown;
      start: Date; due: Date; note: string | null; evidenceIds: unknown;
    };
    const rows = (await db.projectTask.findMany(W)) as (DbTaskRow & {
      iniCode: string; title: string; desc: string | null; requiresEvidence: boolean; dependsOn: unknown;
      baseStart: Date | null; baseDue: Date | null; archived: boolean;
    })[];
    if (rows.length) {
      const seedIds = new Set(cat().tasks.map((t) => t.id));
      for (const r of rows) {
        const day = (d: Date) => d.toISOString().slice(0, 10);
        let t = tasks().find((x) => x.id === r.id) ?? archived().find((x) => x.id === r.id);
        if (!t && !seedIds.has(r.id)) {
          // tarea creada desde la plataforma
          t = { id: r.id, iniId: r.iniCode, title: r.title, desc: r.desc ?? "", assigneeId: r.assigneeId, start: day(r.start), due: day(r.due), status: r.status as TaskStatus };
          (r.archived ? archived() : tasks()).push(t);
        }
        if (!t) continue;
        t.status = r.status as TaskStatus;
        t.assigneeId = r.assigneeId;
        t.coAssigneeIds = (r.coAssigneeIds as string[] | null) ?? t.coAssigneeIds;
        t.start = day(r.start);
        t.due = day(r.due);
        t.note = r.note ?? t.note;
        t.evidenceIds = (r.evidenceIds as string[] | null) ?? t.evidenceIds;
        t.dependsOn = (r.dependsOn as string[] | null)?.length ? (r.dependsOn as string[]) : t.dependsOn;
        t.requiresEvidence = r.requiresEvidence;
        if (r.baseStart && r.baseDue) baselines().set(t.id, { start: day(r.baseStart), due: day(r.baseDue) });
        if (r.archived && tasks().includes(t)) { tasks().splice(tasks().indexOf(t), 1); if (!archived().includes(t)) archived().push(t); }
      }
    }
    // gestor: comentarios y archivos adjuntos
    if (comments().length === 0) {
      for (const c of await db.taskComment.findMany({ where: { companyId }, orderBy: { id: "asc" } })) comments().push({ id: c.id, taskId: c.taskId, author: c.author, role: c.role, text: c.text, at: c.at.toISOString() });
    }
    if (uploads().length === 0) {
      for (const u of await db.fileAsset.findMany({ where: { companyId }, orderBy: { at: "asc" } })) uploads().push({ id: u.id, taskId: u.taskId, title: u.title, kind: u.kind, fileName: u.fileName, filePath: u.filePath, size: u.size, mime: u.mime, uploadedBy: u.uploadedBy, date: u.at.toISOString().slice(0, 10), status: u.status as EvidenceStatus });
    }
    // KPI e iniciativas
    for (const r of await db.kpiReport.findMany({ where: { companyId }, orderBy: { at: "asc" } })) {
      const list = kpiReports().get(r.code) ?? [];
      if (!list.some((x) => x.period === r.period)) list.push({ code: r.code, period: r.period, value: r.value, note: r.note ?? undefined, by: r.by, at: r.at.toISOString() });
      kpiReports().set(r.code, list);
    }
    for (const o of await db.initiativeOverride.findMany(W)) iniOverrides().set(o.code, o.data as InitiativeOverride);
    // priorización: evaluaciones de la matriz y decisiones de tiempo
    for (const e of await db.initiativeEvaluation.findMany(W)) evals().set(e.id, e.data as Evaluation);
    for (const d of await db.initiativeDecision.findMany(W)) decisions().set(d.code, d.data as DecisionRecord);
    // usuarios de la empresa, integraciones, branding y notificaciones leídas
    const dbUsers = await db.user.findMany(W);
    if (dbUsers.length) {
      const seedEmails = new Set(cat().seedUsers.map((u) => u.email));
      const list = users();
      for (const u of dbUsers) {
        const existing = list.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
        if (existing) { existing.name = u.name; existing.role = u.role as SessionUser["role"]; existing.line = u.line ?? undefined; existing.active = u.active; }
        else list.push({ email: u.email, name: u.name, role: u.role as SessionUser["role"], line: u.line ?? undefined, active: u.active, seeded: seedEmails.has(u.email), at: u.createdAt.toISOString() });
      }
    }
    for (const i of await db.integration.findMany(W)) integrations().set(i.key as IntegrationKey, { enabled: i.enabled, fields: i.fields as Record<string, string>, updatedBy: i.updatedBy ?? undefined, at: i.at.toISOString() });
    const br = await db.branding.findUnique({ where: { companyId } });
    if (br) Object.assign(branding(), br.data as Partial<Branding>);
    for (const n of await db.notifRead.findMany(W)) notifRead().set(n.email, new Set(n.ids as string[]));
    // diagnóstico: captura del corte en curso, corte publicado, respuestas y evidencias
    for (const c of await db.practiceCapture.findMany({ where: { companyId, cut: "A3" } })) {
      capture().set(c.practice, {
        perception: c.perception ?? undefined, evidence: (c.evidence as VariableCapture["evidence"]) ?? undefined,
        level: c.level ?? undefined, note: c.note ?? undefined, by: c.by, at: c.at.toISOString(),
      });
    }
    const a3 = await db.assessment.findUnique({ where: { companyId_id: { companyId, id: "A3" } }, include: { scores: true } });
    if (a3?.status === "PUBLICADA" && a3.scores.length) {
      const scores: Record<number, Record<string, CellScore>> = { 1: {}, 2: {}, 3: {}, 4: {} };
      for (const sc of a3.scores) scores[sc.line][sc.dimension] = { value: sc.value, target: sc.target ?? 0 };
      S().published = { id: "A3", label: a3.label, period: a3.period, status: "PUBLICADA", note: a3.note ?? "", scores };
    }
    for (const t of await db.testResponse.findMany(W)) {
      testStore().set(t.email, { email: t.email, name: t.name, role: t.role, cargo: t.cargo ?? undefined, objetivo: t.objetivo ?? undefined, at: t.at.toISOString(), r: t.answers as TestResponse["r"] });
    }
    for (const n of await db.testNote.findMany(W)) {
      testNotes().set(n.participant, { restriccion: n.restriccion ?? undefined, evidencias: n.evidencias ?? undefined, accion: n.accion ?? undefined, noNecesita: n.noNecesita ?? undefined, by: n.by, at: n.at.toISOString() });
    }
    if (f2Store().length === 0) {
      for (const f of await db.teamResponse.findMany({ where: { companyId }, orderBy: { at: "asc" } })) {
        f2Store().push({ id: f.id, at: f.at.toISOString(), area: f.area ?? undefined, r: f.answers as F2Response["r"], abierta: f.abierta ?? undefined });
      }
    }
    for (const e of await db.evidence.findMany({ where: { companyId, status: "VERIFICADA" } })) evidenceStatus().set(e.id, "VERIFICADA");
    st.hydrated = true;
  } catch (e) {
    // sin conexión: se continúa en modo memoria
    console.error("[4shine] hidratación falló:", (e as Error).message);
  }
}

/* ── registro y administración de empresas (manage_companies) ── */

export const listCompanies = (): CompanyRecord[] => [...g.companies.values()];
export const companyBySlug = (slug: string): CompanyRecord | null => g.companies.get(slug) ?? null;

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export type CompanyInput = {
  name: string; shortName?: string; slug?: string; city?: string; department?: string; sector?: string; size?: string;
  sectorKey?: string; ciiu?: string; template?: "demo" | "vacia";
};

/** Crea una empresa (vacía o desde la plantilla demo) y, con base, la persiste con su catálogo. */
export async function createCompany(actor: SessionUser, input: CompanyInput): Promise<{ ok: true; company: CompanyRecord } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_companies")) return { ok: false, status: 403, error: "Solo el administrador de la plataforma crea empresas." };
  const name = input.name?.trim() ?? "";
  if (name.length < 3) return { ok: false, status: 422, error: "El nombre de la empresa debe tener al menos 3 caracteres." };
  const slug = slugify(input.slug?.trim() || name);
  if (!slug || slug.length < 2) return { ok: false, status: 422, error: "El identificador (slug) no es válido." };
  if (g.companies.has(slug)) return { ok: false, status: 422, error: `Ya existe una empresa con el identificador «${slug}».` };
  const template = input.template === "demo" ? "demo" : "vacia";
  const info: CompanyInfo = {
    slug, name, shortName: input.shortName?.trim() || name.split(" ")[0], city: input.city?.trim() ?? "", department: input.department?.trim() ?? "",
    sector: input.sector?.trim() ?? "", size: input.size?.trim() ?? "", sectorKey: input.sectorKey?.trim() || "suministros-industriales",
    ciiu: input.ciiu?.trim() ?? "", active: true, template, createdBy: actor.name, createdAt: new Date().toISOString(),
  };
  const catalog = template === "demo" ? catalogFromTemplate(info) : emptyCatalog(info);
  const rec: CompanyRecord = { ...info, dbId: null };
  if (hasDb()) {
    try {
      const db = await prisma();
      const row = await db.company.create({ data: companyRow(info) });
      rec.dbId = row.id;
      await writeCatalog(db, row.id, catalog);
    } catch (e) {
      return { ok: false, status: 500, error: `No se pudo crear la empresa en la base: ${(e as Error).message}` };
    }
  }
  g.companies.set(slug, rec);
  const st = newState(slug, catalog, rec.dbId);
  st.hydrated = true;
  g.tenants.set(slug, st);
  audit(actor, "task", `empresa:${slug}`, `empresa creada (${template})`);
  return { ok: true, company: rec };
}

export async function updateCompany(actor: SessionUser, slug: string, patch: Partial<CompanyInput> & { active?: boolean }): Promise<{ ok: true; company: CompanyRecord } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_companies")) return { ok: false, status: 403, error: "Solo el administrador de la plataforma edita empresas." };
  const c = g.companies.get(slug);
  if (!c) return { ok: false, status: 404, error: "La empresa no existe." };
  if (patch.name !== undefined && patch.name.trim().length < 3) return { ok: false, status: 422, error: "El nombre debe tener al menos 3 caracteres." };
  if (patch.active === false && slug === DEFAULT_TENANT && [...g.companies.values()].filter((x) => x.active).length <= 1) {
    return { ok: false, status: 422, error: "Debe quedar al menos una empresa activa." };
  }
  const fields = ["name", "shortName", "city", "department", "sector", "size", "sectorKey", "ciiu"] as const;
  for (const f of fields) if (patch[f] !== undefined) (c as Record<string, unknown>)[f] = String(patch[f]).trim();
  if (patch.active !== undefined) c.active = patch.active;
  const t = g.tenants.get(slug);
  if (t) t.catalog.company = { ...t.catalog.company, ...c };
  if (hasDb() && c.dbId) {
    const dbId = c.dbId;
    void persist("empresa", (db) => db.company.update({ where: { id: dbId }, data: companyRow(c) }));
  }
  audit(actor, "task", `empresa:${slug}`, `empresa actualizada`);
  return { ok: true, company: c };
}

/** Elimina una empresa con todos sus datos (en cascada). La demo no se elimina. */
export async function deleteCompany(actor: SessionUser, slug: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_companies")) return { ok: false, status: 403, error: "Solo el administrador de la plataforma elimina empresas." };
  const c = g.companies.get(slug);
  if (!c) return { ok: false, status: 404, error: "La empresa no existe." };
  if (slug === DEFAULT_TENANT) return { ok: false, status: 422, error: "La empresa de demostración no se elimina; puede desactivarse." };
  if (hasDb() && c.dbId) {
    try {
      const db = await prisma();
      await db.company.delete({ where: { id: c.dbId } });
    } catch (e) {
      return { ok: false, status: 500, error: `No se pudo eliminar en la base: ${(e as Error).message}` };
    }
  }
  g.companies.delete(slug);
  g.tenants.delete(slug);
  audit(actor, "task", `empresa:${slug}`, `empresa eliminada`);
  return { ok: true };
}

/** Busca un usuario en cualquier empresa (login): admins de plataforma, memoria y base. */
export async function findUserForLogin(email: string): Promise<{ user: ManagedUser; company: CompanyRecord | null } | null> {
  const e = email.trim().toLowerCase();
  await hydrateCompanies();
  const admin = g.platformUsers.find((u) => u.active && u.email.toLowerCase() === e);
  if (admin) return { user: admin, company: null };
  if (hasDb()) {
    try {
      const db = await prisma();
      const u = await db.user.findUnique({ where: { email: e }, include: { company: true } });
      if (u && u.active) {
        const company = u.company ? g.companies.get(u.company.slug) ?? null : null;
        if (u.companyId && !company) return null;
        return { user: { email: u.email, name: u.name, role: u.role as SessionUser["role"], line: u.line ?? undefined, active: true, seeded: false }, company };
      }
    } catch (e2) { console.error("[4shine] búsqueda de usuario falló:", (e2 as Error).message); }
  }
  for (const [slug, c] of g.companies) {
    const st = g.tenants.get(slug) ?? (slug === DEFAULT_TENANT ? (g.tenants.set(slug, newState(slug, ANDINA_CATALOG, c.dbId)), g.tenants.get(slug)!) : null);
    const u = st?.users.find((x) => x.active && x.email.toLowerCase() === e);
    if (u) return { user: u, company: c };
  }
  return null;
}

export const getPlatformUsers = (): ManagedUser[] => g.platformUsers;

/** Escribe en la base si está configurada; la memoria sigue siendo la fuente. */
// En un entorno serverless (Vercel) la función se congela al responder: una
// escritura lanzada sin esperar se perdería. `after()` de Next registra la
// promesa para que la plataforma la complete antes de apagar la función; fuera
// de una petición (pruebas, seed) no hay ámbito y se omite sin fallar.
async function persist(what: string, fn: (db: AnyPrisma) => Promise<unknown>) {
  if (!hasDb()) return;
  const run = (async () => {
    try { await fn(await prisma()); } catch (e) { console.error(`[4shine] write-through (${what}) falló:`, (e as Error).message); }
  })();
  try {
    const { after } = await serverImport("next/server") as { after?: (task: Promise<unknown>) => void };
    after?.(run);
  } catch { /* sin ámbito de petición: la promesa sigue su curso */ }
  await run;
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
  const ini = cat().initiatives.find((i) => i.id === t.iniId)!;
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
        patch.coAssigneeIds.some((p) => typeof p !== "string" || !cat().people.some((x) => x.id === p))) {
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
  const ev = cat().evidences.find((e) => e.id === evidenceId);
  if (!ev) return { ok: false, status: 404, error: "La evidencia no existe." };
  if (getEvidenceStatus(evidenceId) === "VERIFICADA") {
    return { ok: true, status: "VERIFICADA" };
  }
  evidenceStatus().set(evidenceId, "VERIFICADA");
  audit(user, "evidence", evidenceId, `evidencia verificada («${ev.title}»)`);

  if (hasDb()) {
    try {
      const db = await prisma();
      await db.evidence.upsert({ where: { id: ev.id }, update: { status: "VERIFICADA", verifiedBy: user.name, verifiedAt: new Date() }, create: { id: ev.id, practice: ev.practice, status: "VERIFICADA", verifiedBy: user.name, verifiedAt: new Date() } });
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
  void persist("comentario", (db) => db.taskComment.create({ data: { id: comment.id, companyId: cid(), taskId, author: comment.author, role: comment.role, text: comment.text, at: new Date(comment.at) } }));
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
  const ini = cat().initiatives.find((i) => i.id === t.iniId)!;
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
  void persist("archivo", (db) => db.fileAsset.create({ data: { id: evidence.id, companyId: cid(), taskId, title: evidence.title, kind: evidence.kind, fileName: evidence.fileName, filePath: evidence.filePath, size: evidence.size, mime: evidence.mime, uploadedBy: evidence.uploadedBy, status: evidence.status, at: new Date() } }));
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
  void persist("archivo verificado", (db) => db.fileAsset.update({ where: { companyId_id: { companyId: cid(), id: evidenceId } }, data: { status: "VERIFICADA" } }));
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

const archived = () => S().archived;

export const getArchivedTasks = (): Task[] => archived();

export function createTask(
  user: SessionUser,
  input: {
    iniId: string; title: string; desc: string; assigneeId: string;
    coAssigneeIds?: string[]; start: string; due: string;
    dependsOn?: string[]; requiresEvidence?: boolean; note?: string;
  },
): MutationResult {
  const ini = cat().initiatives.find((i) => i.id === input.iniId);
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
  if (!cat().people.some((p) => p.id === input.assigneeId)) {
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
      .filter((c) => c !== input.assigneeId && cat().people.some((p) => p.id === c)),
    start: input.start, due: input.due,
    status: "POR_HACER",
    requiresEvidence: Boolean(input.requiresEvidence),
    dependsOn: input.dependsOn?.length ? input.dependsOn : undefined,
    note: input.note?.trim() || undefined,
  };
  tasks().push(task);
  baselines().set(id, { start: task.start, due: task.due });
  void persist("tarea nueva", (db) => db.projectTask.create({ data: {
    id, companyId: cid(), iniCode: task.iniId, title: task.title, desc: task.desc, assigneeId: task.assigneeId, coAssigneeIds: task.coAssigneeIds ?? [],
    start: new Date(task.start), due: new Date(task.due), baseStart: new Date(task.start), baseDue: new Date(task.due),
    status: task.status, requiresEvidence: task.requiresEvidence ?? false, evidenceIds: [], dependsOn: task.dependsOn ?? [], note: task.note ?? null,
  } }));
  audit(user, "task", id, `tarea creada («${title}») en ${ini.name}`);
  return { ok: true, task };
}

export function archiveTask(user: SessionUser, id: string): MutationResult {
  const t = getTask(id);
  if (!t) return { ok: false, status: 404, error: "La tarea no existe." };
  const ini = cat().initiatives.find((i) => i.id === t.iniId)!;
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
  void persist("tarea archivada", (db) => db.projectTask.update({ where: { companyId_id: { companyId: cid(), id } }, data: { archived: true } }));
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
    const ini = cat().initiatives.find((i) => i.id === t.iniId)!;
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
  void persist("cascada", async (db) => {
    for (const tid of allIds) {
      const t = getTask(tid)!;
      await db.projectTask.update({ where: { companyId_id: { companyId: cid(), id: tid } }, data: { start: new Date(t.start), due: new Date(t.due) } });
    }
  });
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
  if (S().published) {
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
  const row = { perception: next.perception ?? null, evidence: next.evidence ?? null, level: next.level ?? null, note: next.note ?? null, by: next.by, at: new Date(next.at) };
  void persist("captura", (db) => db.practiceCapture.upsert({ where: { companyId_cut_practice: { companyId: cid(), cut: "A3", practice: varId } }, update: row, create: { companyId: cid(), cut: "A3", practice: varId, ...row } }));
  return { ok: true, capture: next };
}

/** Publica el corte A3: exige las 68 prácticas con nivel calificado. */
export function publishCapture(
  user: SessionUser,
): { ok: true; assessment: AssessmentRecord } | { ok: false; status: number; error: string } {
  if (!can(user, "publish_maturity")) {
    return { ok: false, status: 403, error: "Solo el advisor publica mediciones." };
  }
  const already = S().published;
  if (already) {
    return { ok: true, assessment: already };
  }
  const prog = captureProgress();
  if (prog.level < prog.total) {
    return {
      ok: false, status: 422,
      error: `Faltan ${prog.total - prog.level} prácticas por calificar (nivel contra la rúbrica). Una medición parcial no se publica.`,
    };
  }
  // dimensión = promedio simple de sus prácticas calificadas
  const base = (latestPublished(cat().assessments) ?? emptyAssessment()).scores!;
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
  S().published = assessment;
  audit(user, "task", "A3", "medición A3 publicada (corte vigente)");
  void dimOf;
  void persist("publicación", async (db) => {
    const company = { id: cid() };
    await db.assessment.upsert({
      where: { companyId_id: { companyId: company.id, id: "A3" } },
      update: { status: "PUBLICADA", note: assessment.note, publishedAt: new Date(), publishedBy: user.name },
      create: { id: "A3", companyId: company.id, label: assessment.label, period: assessment.period, status: "PUBLICADA", note: assessment.note, publishedAt: new Date(), publishedBy: user.name },
    });
    for (const d of DIMS) {
      const sc = scores[d.line][d.code];
      await db.dimensionScore.upsert({ where: { assessmentId_dimension: { assessmentId: "A3", dimension: d.code } }, update: { value: sc.value, target: sc.target }, create: { assessmentId: "A3", line: d.line, dimension: d.code, value: sc.value, target: sc.target } });
    }
  });
  return { ok: true, assessment };
}

/* ═══ Test de capacidad empresarial ═══
   Cualquier usuario con sesión responde el test; cada persona guarda una
   sola respuesta (la última reemplaza). El advisor y el líder ven todas;
   los demás solo la propia. */

function testStore() { return S().tests; }

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
  void persist("test", async (db) => {
    const company = { id: cid() };
    const data = { name: response.name, role: response.role, cargo: response.cargo ?? null, objetivo: response.objetivo ?? null, answers: response.r, at: new Date(response.at) };
    await db.testResponse.upsert({ where: { companyId_email: { companyId: company.id, email: response.email } }, update: data, create: { email: response.email, companyId: company.id, ...data } });
  });
  return { ok: true, response };
}

/* ═══ Informe de una página del test: campos que completa el consultor ═══ */

function testNotes() { return S().testNotes; }
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
  const data = { restriccion: notes.restriccion ?? null, evidencias: notes.evidencias ?? null, accion: notes.accion ?? null, noNecesita: notes.noNecesita ?? null, by: notes.by, at: new Date(notes.at) };
  void persist("notas del test", (db) => db.testNote.upsert({ where: { companyId_participant: { companyId: cid(), participant: id } }, update: data, create: { companyId: cid(), participant: id, ...data } }));
  return { ok: true, notes };
}

/* ═══ Fuente 2 · percepción de equipos (anónima) ═══
   Llega por el enlace de la empresa, sin sesión ni identidad: no se guarda
   quién responde ni desde dónde. El advisor y el líder ven el conteo y los
   agregados; nadie ve una respuesta individual con nombre. */

function f2Store() { return S().f2; }
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
  void persist("fuente 2", async (db) => {
    const company = { id: cid() };
    await db.teamResponse.create({ data: { id: response.id, companyId: company.id, area: response.area ?? null, answers: response.r, abierta: response.abierta ?? null, at: new Date(response.at) } });
  });
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

const kpiReports = () => S().kpiReports;

export const getKpiReports = (code?: string): KpiReport[] =>
  code ? (kpiReports().get(code) ?? []) : [...kpiReports().values()].flat();

/** Serie efectiva: seed + valores reportados, ordenada por periodo. */
export function effectiveKpiSeries(code: string): KpiFull["series"] {
  const k = cat().kpis.find((x) => x.code === code);
  if (!k) return [];
  const reported = (kpiReports().get(code) ?? []).map((r) => ({
    period: r.period, value: r.value, note: r.note ?? `Reportado por ${r.by}`,
  }));
  const merged = [...k.series.filter((s) => !reported.some((r) => r.period === s.period)), ...reported];
  return merged.sort((a, b) => periodIndex(a.period) - periodIndex(b.period));
}

export const effectiveKpis = (): KpiFull[] =>
  cat().kpis.map((k) => ({ ...k, series: effectiveKpiSeries(k.code) }));

export function reportKpi(
  user: SessionUser,
  code: string,
  period: string,
  value: number,
  note?: string,
): { ok: true; report: KpiReport; series: KpiFull["series"] } | { ok: false; status: number; error: string } {
  const k = cat().kpis.find((x) => x.code === code);
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
  const row = { value: report.value, note: report.note ?? null, by: report.by, at: new Date(report.at) };
  void persist("kpi", (db) => db.kpiReport.upsert({ where: { companyId_code_period: { companyId: cid(), code, period } }, update: row, create: { companyId: cid(), code, period, ...row } }));
  return { ok: true, report, series: effectiveKpiSeries(code) };
}

/* ═══ Actualización de iniciativas ═══
   Avance, estado, factores de éxito (con historial de revisiones), bitácora
   y próximo hito. El responsable de línea edita SU línea. */

const iniOverrides = () => S().iniOverrides;

export const getInitiativeOverrides = (): Record<string, InitiativeOverride> =>
  Object.fromEntries(iniOverrides());

/** Iniciativas efectivas: seed + cambios hechos desde la plataforma. */
export function effectiveInitiatives(): InitiativeFull[] {
  return cat().initiatives.map((i) => {
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
  const base = cat().initiatives.find((i) => i.id === id);
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
  void persist("iniciativa", (db) => db.initiativeOverride.upsert({ where: { companyId_code: { companyId: cid(), code: id } }, update: { data: o }, create: { companyId: cid(), code: id, data: o } }));
  return { ok: true, initiative: effectiveInitiatives().find((i) => i.id === id)! };
}

/* ═══ Matriz 4Shine de priorización ═══
   Cada evaluador califica D·E·M·L (1–4) y marca estratégico/táctico; la
   plataforma consolida por promedio y aplica las reglas de la matriz. La
   decisión de tiempo (implementar, preparar, backlog, renunciar) la toma la
   gerencia o el advisor y debe ser admisible con el consolidado. */

const evals = () => S().evals;
const decisions = () => S().decisions;

export const getEvaluations = (iniId?: string): Evaluation[] =>
  [...evals().values()].filter((e) => !iniId || e.iniId === iniId);

export const getDecision = (iniId: string): DecisionRecord | null => decisions().get(iniId) ?? null;
export const getDecisions = (): Record<string, DecisionRecord> => Object.fromEntries(decisions());

export const consolidatedOf = (iniId: string): Consolidated => consolidate(getEvaluations(iniId));

export function evaluateInitiative(
  user: SessionUser,
  iniId: string,
  input: { scores: Record<string, unknown>; type: Record<string, unknown>; notes?: Record<string, unknown> },
): { ok: true; evaluation: Evaluation; consolidated: Consolidated } | { ok: false; status: number; error: string } {
  const base = cat().initiatives.find((i) => i.id === iniId);
  if (!base) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!can(user, "evaluate_initiatives", base.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "ADMIN"
        ? "El administrador de la plataforma no evalúa iniciativas."
        : user.role === "RESPONSABLE"
          ? `Evalúas las iniciativas de tu capacidad (${capName(user.line)}); esta es de ${capName(base.line)}.`
          : "Tu rol no evalúa la priorización.",
    };
  }
  const scores = {} as Record<CriterionKey, 1 | 2 | 3 | 4>;
  for (const k of ["D", "E", "M", "L"] as CriterionKey[]) {
    const v = Number(input.scores?.[k]);
    if (!isLevel(v)) return { ok: false, status: 422, error: `El criterio ${k} se califica de 1 (débil) a 4 (decisivo).` };
    scores[k] = v;
  }
  const type: Record<string, "ESTRATEGICO" | "TACTICO"> = {};
  for (const c of TYPE_CRITERIA) {
    const v = input.type?.[c.key];
    if (v !== "ESTRATEGICO" && v !== "TACTICO") return { ok: false, status: 422, error: `Marca «${c.name}» como estratégico o táctico.` };
    type[c.key] = v;
  }
  const notes: Partial<Record<CriterionKey, string>> = {};
  for (const k of ["D", "E", "M", "L"] as CriterionKey[]) {
    const t = typeof input.notes?.[k] === "string" ? (input.notes![k] as string).trim() : "";
    if (t.length > 600) return { ok: false, status: 422, error: "Cada nota admite hasta 600 caracteres." };
    if (t) notes[k] = t;
  }
  const key = `${iniId}|${user.email.toLowerCase()}`;
  const evaluation: Evaluation = {
    iniId, by: user.email.toLowerCase(), name: user.name, role: user.role, scores, type,
    notes: Object.keys(notes).length ? notes : undefined, at: new Date().toISOString(),
  };
  evals().set(key, evaluation);
  audit(user, "task", iniId, `priorización: D${scores.D} E${scores.E} M${scores.M} L${scores.L}`);
  void persist("evaluación", (db) => db.initiativeEvaluation.upsert({
    where: { companyId_id: { companyId: cid(), id: key } }, update: { data: evaluation }, create: { companyId: cid(), id: key, iniCode: iniId, by: evaluation.by, data: evaluation },
  }));
  return { ok: true, evaluation, consolidated: consolidatedOf(iniId) };
}

export function decideInitiative(
  user: SessionUser,
  iniId: string,
  input: { decision: unknown; rationale?: unknown },
): { ok: true; decision: DecisionRecord } | { ok: false; status: number; error: string } {
  const base = cat().initiatives.find((i) => i.id === iniId);
  if (!base) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!can(user, "decide_initiatives")) {
    return { ok: false, status: 403, error: "La decisión de tiempo la toma la gerencia o el advisor; tu rol evalúa o consulta." };
  }
  const d = input.decision as Decision;
  if (!["IMPLEMENTAR", "PREPARAR", "BACKLOG", "RENUNCIAR"].includes(d)) {
    return { ok: false, status: 422, error: "Decisión inválida: implementar, preparar, backlog o renunciar." };
  }
  const rationale = typeof input.rationale === "string" ? input.rationale.trim() : "";
  const check = decisionCheck(d, consolidatedOf(iniId), rationale);
  if (!check.ok) return { ok: false, status: 422, error: check.reason };
  const rec: DecisionRecord = { iniId, decision: d, rationale: rationale || undefined, by: user.email.toLowerCase(), name: user.name, at: new Date().toISOString() };
  decisions().set(iniId, rec);
  audit(user, "task", iniId, `decisión de tiempo → ${d}`);
  void persist("decisión", (db) => db.initiativeDecision.upsert({ where: { companyId_code: { companyId: cid(), code: iniId } }, update: { data: rec }, create: { companyId: cid(), code: iniId, data: rec } }));
  return { ok: true, decision: rec };
}

/* ── medición efectiva: la publicada en el store manda sobre el seed ── */

export const publishedAssessment = (): AssessmentRecord | null => S().published ?? null;

export const effectiveCurrent = (): AssessmentRecord =>
  S().published ?? latestPublished(cat().assessments) ?? emptyAssessment();

export const effectivePrevious = (): AssessmentRecord | null =>
  S().published ? latestPublished(cat().assessments) : previousPublished(cat().assessments);

export const effectiveAssessments = () =>
  cat().assessments.map((a) =>
    a.id === "A3" && S().published
      ? { id: a.id, label: a.label, period: S().published!.period, status: "PUBLICADA" as const, note: S().published!.note }
      : { id: a.id, label: a.label, period: a.period, status: a.status, note: a.note });

/* ═══ Editor del catálogo de la empresa (manage_catalog) ═══
   Responsables (cargos), personas, objetivos, KPI, iniciativas, finanzas y
   territorio. Cada mutación valida, mantiene las referencias entre entidades
   y persiste su fila; los códigos se asignan en secuencia cuando faltan. */

type CatResult = { ok: true } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): CatResult => ({ ok: false, status, error });
const nextCode = (prefix: string, used: string[], width: number) => {
  let n = 1;
  const taken = new Set(used);
  while (taken.has(`${prefix}${String(n).padStart(width, "0")}`)) n++;
  return `${prefix}${String(n).padStart(width, "0")}`;
};
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback);
const int = (v: unknown, lo: number, hi: number, fallback: number) => Math.min(hi, Math.max(lo, Math.round(num(v, fallback))));
const QUARTER = /^\d{4}-T[1-4]$/;

function canCatalog(user: SessionUser): CatResult | null {
  return can(user, "manage_catalog") ? null : fail(403, "El catálogo lo editan el advisor y el líder de la empresa (o el admin de la plataforma).");
}

export function upsertResponsible(user: SessionUser, input: Partial<Responsible>): CatResult & { id?: string } {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const cargo = str(input.cargo, 120), dependencia = str(input.dependencia, 120);
  const rol = input.rolPlataforma;
  if (cargo.length < 3) return fail(422, "El cargo debe tener al menos 3 caracteres.");
  if (!dependencia) return fail(422, "La dependencia es obligatoria.");
  if (!["LIDER", "RESPONSABLE", "APORTA", "CONSULTA"].includes(rol ?? "")) return fail(422, "Rol en la plataforma inválido (LIDER, RESPONSABLE, APORTA o CONSULTA).");
  const id = str(input.id, 10) || nextCode("R", c.responsibles.map((r) => r.id), 2);
  const r: Responsible = { id, cargo, dependencia, rolPlataforma: rol as Responsible["rolPlataforma"] };
  const idx = c.responsibles.findIndex((x) => x.id === id);
  if (idx >= 0) c.responsibles[idx] = r; else c.responsibles.push(r);
  audit(user, "task", `cat:${id}`, `responsable ${idx >= 0 ? "actualizado" : "creado"} (${cargo})`);
  void persist("catálogo", (db) => writeResponsible(db, cid(), r));
  return { ok: true, id };
}

export function removeResponsible(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!c.responsibles.some((r) => r.id === id)) return fail(404, "El responsable no existe.");
  const refs = [
    ...c.kpis.filter((k) => k.ownerId === id).map((k) => `KPI ${k.code}`),
    ...c.initiatives.filter((i) => i.ownerId === id).map((i) => `iniciativa ${i.id}`),
    ...c.people.filter((p) => p.responsibleId === id).map((p) => `persona ${p.name}`),
  ];
  if (refs.length) return fail(422, `No se puede eliminar: lo referencian ${refs.slice(0, 4).join(", ")}${refs.length > 4 ? "…" : ""}. Reasigna primero.`);
  c.responsibles = c.responsibles.filter((r) => r.id !== id);
  audit(user, "task", `cat:${id}`, "responsable eliminado");
  void persist("catálogo", (db) => dbDeleteResponsible(db, cid(), id));
  return { ok: true };
}

export function upsertPerson(user: SessionUser, input: Partial<Person>): CatResult & { id?: string } {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const name = str(input.name, 120), cargo = str(input.cargo, 120), dependencia = str(input.dependencia, 120), email = str(input.email, 160).toLowerCase();
  const responsibleId = str(input.responsibleId, 10);
  if (name.length < 3) return fail(422, "El nombre debe tener al menos 3 caracteres.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(422, "Correo inválido.");
  if (responsibleId && !c.responsibles.some((r) => r.id === responsibleId)) return fail(422, "El cargo responsable no existe en el catálogo.");
  const id = str(input.id, 10) || nextCode("P", c.people.map((p) => p.id), 2);
  if (email && c.people.some((p) => p.id !== id && p.email.toLowerCase() === email)) return fail(422, "Ya hay una persona con ese correo.");
  const p: Person = { id, name, cargo, dependencia, email, responsibleId };
  const idx = c.people.findIndex((x) => x.id === id);
  if (idx >= 0) c.people[idx] = p; else c.people.push(p);
  audit(user, "task", `cat:${id}`, `persona ${idx >= 0 ? "actualizada" : "creada"} (${name})`);
  void persist("catálogo", (db) => writePerson(db, cid(), p));
  return { ok: true, id };
}

export function removePerson(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!c.people.some((p) => p.id === id)) return fail(404, "La persona no existe.");
  const n = tasks().filter((t) => t.assigneeId === id || t.coAssigneeIds?.includes(id)).length;
  if (n) return fail(422, `No se puede eliminar: tiene ${n} tarea${n === 1 ? "" : "s"} asignada${n === 1 ? "" : "s"}. Reasígnalas primero.`);
  c.people = c.people.filter((p) => p.id !== id);
  audit(user, "task", `cat:${id}`, "persona eliminada");
  void persist("catálogo", (db) => dbDeletePerson(db, cid(), id));
  return { ok: true };
}

export function upsertObjective(user: SessionUser, input: Partial<CmiObjective>): CatResult & { id?: string } {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const name = str(input.name, 240), perspective = str(input.perspective, 20);
  if (name.length < 5) return fail(422, "El objetivo debe tener al menos 5 caracteres.");
  if (!["financiera", "clientes", "procesos", "aprendizaje"].includes(perspective)) return fail(422, "Perspectiva inválida.");
  const kpis = Array.isArray(input.kpis) ? input.kpis.map((k) => str(k, 20).toUpperCase()).filter(Boolean) : [];
  const missing = kpis.filter((k) => !c.kpis.some((x) => x.code === k));
  if (missing.length) return fail(422, `KPI inexistentes: ${missing.join(", ")}.`);
  const line = input.line === undefined || input.line === null ? undefined : int(input.line, 1, 4, 1);
  const id = str(input.id, 10) || nextCode("OE-", c.objectives.map((o) => o.id), 2);
  const o: CmiObjective = { id, perspective, name, kpis, ...(line ? { line } : {}) };
  const idx = c.objectives.findIndex((x) => x.id === id);
  if (idx >= 0) c.objectives[idx] = o; else c.objectives.push(o);
  audit(user, "task", `cat:${id}`, `objetivo ${idx >= 0 ? "actualizado" : "creado"}`);
  void persist("catálogo", (db) => writeObjective(db, cid(), o));
  return { ok: true, id };
}

export function removeObjective(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!c.objectives.some((o) => o.id === id)) return fail(404, "El objetivo no existe.");
  const refs = [...c.kpis.filter((k) => k.cmi === id).map((k) => `KPI ${k.code}`), ...c.initiatives.filter((i) => i.cmi === id).map((i) => `iniciativa ${i.id}`)];
  if (refs.length) return fail(422, `No se puede eliminar: lo usan ${refs.slice(0, 4).join(", ")}${refs.length > 4 ? "…" : ""}.`);
  c.objectives = c.objectives.filter((o) => o.id !== id);
  audit(user, "task", `cat:${id}`, "objetivo eliminado");
  void persist("catálogo", (db) => dbDeleteObjective(db, cid(), id));
  return { ok: true };
}

export function upsertKpi(user: SessionUser, input: Partial<KpiFull>): CatResult & { code?: string } {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const code = str(input.code, 20).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(code)) return fail(422, "El código del KPI usa letras, números y guiones (p. ej. DIR-04).");
  const name = str(input.name, 200), unit = str(input.unit, 20);
  if (name.length < 5) return fail(422, "El nombre del KPI debe tener al menos 5 caracteres.");
  if (!unit) return fail(422, "La unidad es obligatoria (%, número, días…).");
  const line = int(input.line, 1, 4, 1);
  const cmi = str(input.cmi, 10);
  if (cmi && !c.objectives.some((o) => o.id === cmi)) return fail(422, "El objetivo del cuadro de mando no existe.");
  const ownerId = str(input.ownerId, 10);
  if (ownerId && !c.responsibles.some((r) => r.id === ownerId)) return fail(422, "El responsable del dato no existe en el catálogo.");
  const frequency = (["Mensual", "Trimestral", "Semestral", "Anual"] as const).find((f) => f === input.frequency) ?? "Trimestral";
  const goodDirection = input.goodDirection === "down" ? "down" : "up";
  const series = (Array.isArray(input.series) ? input.series : [])
    .map((v) => ({ period: str(v?.period, 12), value: num(v?.value, NaN), ...(str(v?.note, 200) ? { note: str(v?.note, 200) } : {}) }))
    .filter((v) => v.period && Number.isFinite(v.value));
  const badPeriod = series.find((v) => !isValidPeriod(v.period));
  if (badPeriod) return fail(422, `Periodo inválido en la serie: ${badPeriod.period} (usa AAAA-Tn, AAAA-Sn o AAAA).`);
  series.sort((x, y) => periodIndex(x.period) - periodIndex(y.period));
  const k: KpiFull = {
    code, line, cmi, name, definition: str(input.definition, 600), formula: str(input.formula, 300), unit, frequency,
    source: str(input.source, 160), ownerId, baseline: num(input.baseline), target: num(input.target), goodDirection, series,
  };
  const idx = c.kpis.findIndex((x) => x.code === code);
  if (idx >= 0) c.kpis[idx] = k; else c.kpis.push(k);
  audit(user, "task", `cat:${code}`, `KPI ${idx >= 0 ? "actualizado" : "creado"} (${name})`);
  void persist("catálogo", (db) => writeKpi(db, cid(), k));
  return { ok: true, code };
}

export function removeKpi(user: SessionUser, code: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!c.kpis.some((k) => k.code === code)) return fail(404, "El KPI no existe.");
  const refs = [...c.objectives.filter((o) => o.kpis.includes(code)).map((o) => `objetivo ${o.id}`), ...c.initiatives.filter((i) => i.kpi === code).map((i) => `iniciativa ${i.id}`)];
  if (refs.length) return fail(422, `No se puede eliminar: lo usan ${refs.slice(0, 4).join(", ")}${refs.length > 4 ? "…" : ""}.`);
  c.kpis = c.kpis.filter((k) => k.code !== code);
  kpiReports().delete(code);
  audit(user, "task", `cat:${code}`, "KPI eliminado");
  void persist("catálogo", (db) => dbDeleteKpi(db, cid(), code));
  return { ok: true };
}

export function upsertInitiative(user: SessionUser, input: Partial<InitiativeFull>): CatResult & { id?: string } {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const name = str(input.name, 200);
  if (name.length < 5) return fail(422, "El nombre de la iniciativa debe tener al menos 5 caracteres.");
  const dim = DIMS.find((d) => d.code === str(input.capability, 10));
  if (!dim) return fail(422, "La dimensión que instala (DIR-1 … MUL-5) es obligatoria.");
  const cmi = str(input.cmi, 10);
  if (!c.objectives.some((o) => o.id === cmi)) return fail(422, "El objetivo del cuadro de mando es obligatorio y debe existir.");
  const ownerId = str(input.ownerId, 10);
  if (ownerId && !c.responsibles.some((r) => r.id === ownerId)) return fail(422, "El responsable no existe en el catálogo.");
  const kpi = str(input.kpi, 20).toUpperCase();
  if (kpi && !c.kpis.some((k) => k.code === kpi)) return fail(422, "El KPI asociado no existe.");
  const start = str(input.start, 8), end = str(input.end, 8);
  if ((start && !QUARTER.test(start)) || (end && !QUARTER.test(end))) return fail(422, "Inicio y fin van en trimestres (AAAA-Tn).");
  if (start && end && periodIndex(start) > periodIndex(end)) return fail(422, "El fin no puede ser anterior al inicio.");
  const SUB: InitiativeFull["subsistema"][] = ["Dirección", "Comercial", "Operación", "Administración", "Talento"];
  const STATUS: InitiativeFull["status"][] = ["PLANEADA", "EN_CURSO", "EN_RIESGO", "COMPLETADA"];
  const ACT: ("HECHA" | "EN_CURSO" | "PENDIENTE")[] = ["HECHA", "EN_CURSO", "PENDIENTE"];
  const FS = ["VERDE", "AMBAR", "ROJO"] as const;
  const id = str(input.id, 10) || (() => { let n = 1; while (c.initiatives.some((i) => i.id === `i${n}`)) n++; return `i${n}`; })();
  const prev = c.initiatives.find((i) => i.id === id);
  const i: InitiativeFull = {
    id, line: dim.line, subsistema: SUB.find((x) => x === input.subsistema) ?? "Dirección", cmi, name,
    objetivo: str(input.objetivo, 600), horizon: input.horizon === "MEDIANO" ? "MEDIANO" : "CORTO",
    impact: int(input.impact, 1, 5, 3), feasibility: int(input.feasibility, 1, 5, 3), urgency: int(input.urgency, 1, 5, 3), dependency: int(input.dependency, 1, 5, 3),
    status: STATUS.find((x) => x === input.status) ?? "PLANEADA", start, end, ownerId, metaResultado: str(input.metaResultado, 400),
    budgetPlanned: num(input.budgetPlanned), budgetCommitted: num(input.budgetCommitted), budgetExecuted: num(input.budgetExecuted),
    progress: int(input.progress, 0, 100, 0), capability: dim.code, framework: frameworkOfPractice(dim.prac[0].code)?.id ?? "", kpi,
    actions: (Array.isArray(input.actions) ? input.actions : []).map((a) => ({ name: str(a?.name, 200), meta: str(a?.meta, 200), status: ACT.find((x) => x === a?.status) ?? "PENDIENTE", quarter: str(a?.quarter, 8) })).filter((a) => a.name),
    log: Array.isArray(input.log) ? input.log.filter((l) => l && typeof l.text === "string") : (prev?.log ?? []),
    nextMilestone: { date: str(input.nextMilestone?.date, 12), text: str(input.nextMilestone?.text, 200) },
    factors: (Array.isArray(input.factors) ? input.factors : []).map((f) => ({ name: str(f?.name, 160), state: FS.find((x) => x === f?.state) ?? "VERDE", history: Array.isArray(f?.history) ? f.history.filter((h) => typeof h === "string") : [], ...(str(f?.note, 200) ? { note: str(f?.note, 200) } : {}) })).filter((f) => f.name),
  };
  const idx = c.initiatives.findIndex((x) => x.id === id);
  if (idx >= 0) c.initiatives[idx] = i; else c.initiatives.push(i);
  iniOverrides().delete(id);
  audit(user, "task", `cat:${id}`, `iniciativa ${idx >= 0 ? "actualizada" : "creada"} (${name})`);
  void persist("catálogo", async (db) => { await writeInitiative(db, cid(), i); await db.initiativeOverride.deleteMany({ where: { companyId: cid(), code: id } }); });
  return { ok: true, id };
}

export function removeInitiative(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!c.initiatives.some((i) => i.id === id)) return fail(404, "La iniciativa no existe.");
  const n = tasks().filter((t) => t.iniId === id).length + archived().filter((t) => t.iniId === id).length;
  if (n) return fail(422, `No se puede eliminar: tiene ${n} tarea${n === 1 ? "" : "s"} en el plan de trabajo.`);
  c.initiatives = c.initiatives.filter((i) => i.id !== id);
  iniOverrides().delete(id);
  decisions().delete(id);
  for (const k of [...evals().keys()]) if (k.startsWith(`${id}|`)) evals().delete(k);
  audit(user, "task", `cat:${id}`, "iniciativa eliminada");
  void persist("catálogo", async (db) => {
    const companyId = cid();
    await dbDeleteInitiative(db, companyId, id);
    await db.initiativeOverride.deleteMany({ where: { companyId, code: id } });
    await db.initiativeDecision.deleteMany({ where: { companyId, code: id } });
    await db.initiativeEvaluation.deleteMany({ where: { companyId, iniCode: id } });
  });
  return { ok: true };
}

export function setFinancials(user: SessionUser, input: Partial<Financials> | null): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (input === null) { c.financials = null; }
  else {
    const f: Financials = {
      year: int(input.year, 2000, 2100, new Date().getFullYear()), revenue: num(input.revenue), revenuePrev: num(input.revenuePrev),
      grossProfit: num(input.grossProfit), operatingProfit: num(input.operatingProfit), netProfit: num(input.netProfit),
      assets: num(input.assets), liabilities: num(input.liabilities), equity: num(input.equity),
    };
    if (f.revenue <= 0) return fail(422, "Los ingresos del año deben ser mayores que cero (COP millones).");
    c.financials = f;
  }
  audit(user, "task", "cat:finanzas", "estados financieros actualizados");
  void persist("catálogo", (db) => writeCompanyExtras(db, cid(), { financials: c.financials, territories: c.territories }));
  return { ok: true };
}

export function setTerritories(user: SessionUser, input: unknown): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!Array.isArray(input)) return fail(422, "Se esperaba una lista de departamentos.");
  const list: Territory[] = [];
  for (const t of input as Partial<Territory>[]) {
    const name = str(t?.name, 60);
    if (!name) continue;
    const weight = ([1, 2, 3] as const).find((w) => w === num(t?.weight, 1)) ?? 1;
    const presence = (["sede", "cobertura", "oportunidad"] as const).find((p) => p === t?.presence) ?? "cobertura";
    if (list.some((x) => x.name === name)) return fail(422, `Departamento repetido: ${name}.`);
    list.push({ name, weight, presence, reading: str(t?.reading, 300) });
  }
  c.territories = list;
  audit(user, "task", "cat:territorio", `presencia territorial actualizada (${list.length} departamentos)`);
  void persist("catálogo", (db) => writeCompanyExtras(db, cid(), { financials: c.financials, territories: c.territories }));
  return { ok: true };
}

/* ═══ Vista de la empresa activa (para la UI y la lógica) ═══ */

import { emptyAssessment, type TenantView } from "@/lib/vista";

export function tenantView(): TenantView {
  const current = effectiveCurrent();
  return {
    catalog: cat(),
    initiatives: effectiveInitiatives(),
    kpis: effectiveKpis(),
    tasks: getTasks(),
    current,
    previous: effectivePrevious(),
    assessments: effectiveAssessments(),
    published: Boolean(publishedAssessment()),
  };
}

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


/** Usuarios de la empresa activa (los admins de plataforma viven aparte). */
const users = () => S().users;

export const getUsers = (): ManagedUser[] => users();

export const findActiveUser = (email: string): ManagedUser | null =>
  users().find((u) => u.active && u.email.toLowerCase() === email.toLowerCase()) ?? null;

const VALID_ROLES: SessionUser["role"][] = ["CONSULTOR", "LIDER", "RESPONSABLE", "DIRECTIVO"];   // los roles de empresa; ADMIN es de plataforma

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
    return { ok: false, status: 422, error: input.role === "ADMIN" ? "El rol de administrador es de la plataforma, no de una empresa." : "Rol inválido." };
  }
  if (g.platformUsers.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, status: 422, error: "Ese correo es de un administrador de la plataforma." };
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
  void persist("usuario", async (db) => {
    const companyId = cid();
    await db.user.upsert({ where: { email }, update: { name: user.name, role: user.role, line: user.line ?? null, active: true, companyId }, create: { email, name: user.name, role: user.role, line: user.line ?? null, passwordHash: "", companyId } });
  });
  audit(actor, "task", email, `usuario creado (${input.role}${user.line ? ` · ${capName(user.line)}` : ""})`);
  return { ok: true, user };
}

/** Reasigna un usuario de la empresa activa a otra empresa (solo admin de plataforma). */
export async function moveUser(actor: SessionUser, email: string, toSlug: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_companies")) return { ok: false, status: 403, error: "Solo el administrador de la plataforma reasigna usuarios entre empresas." };
  const u = users().find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return { ok: false, status: 404, error: "El usuario no existe en esta empresa." };
  const target = g.companies.get(toSlug);
  if (!target) return { ok: false, status: 404, error: "La empresa destino no existe." };
  if (toSlug === currentTenant()) return { ok: false, status: 422, error: "El usuario ya está en esa empresa." };
  users().splice(users().indexOf(u), 1);
  let dest = g.tenants.get(toSlug);
  if (!dest) {
    dest = newState(toSlug, toSlug === DEFAULT_TENANT ? ANDINA_CATALOG : emptyCatalog(target), target.dbId);
    g.tenants.set(toSlug, dest);
  }
  dest.users.push({ ...u, seeded: false });
  if (hasDb() && target.dbId) {
    const companyId = target.dbId;
    await persist("usuario", (db) => db.user.updateMany({ where: { email: u.email.toLowerCase() }, data: { companyId } }));
  }
  audit(actor, "task", u.email, `usuario reasignado a la empresa ${target.name}`);
  return { ok: true };
}

/** Contraseña real contra la base (bcrypt). Devuelve null cuando no hay base
    o el usuario no tiene contraseña fijada: entonces aplica la demo, si está
    permitida (DEMO_LOGIN distinto de «off»). */
export async function verifyPassword(email: string, password: string): Promise<boolean | null> {
  if (!hasDb()) return null;
  try {
    const db = await prisma();
    const u = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { passwordHash: true, active: true } });
    if (!u || !u.passwordHash) return null;
    const bcrypt = await serverImport("bcryptjs") as AnyPrisma;
    return Boolean(u.active) && (await (bcrypt.default ?? bcrypt).compare(password, u.passwordHash));
  } catch {
    return null;
  }
}

/** Fija o cambia la contraseña de un usuario (manage_users). Exige base de datos. */
export async function setUserPassword(
  actor: SessionUser, email: string, password: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_users")) return { ok: false, status: 403, error: "Solo el equipo consultor administra usuarios." };
  const target = users().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!target) return { ok: false, status: 404, error: "El usuario no existe." };
  if (typeof password !== "string" || password.length < 10) return { ok: false, status: 422, error: "La contraseña debe tener al menos 10 caracteres." };
  if (!hasDb()) return { ok: false, status: 422, error: "Fijar contraseñas exige base de datos; en modo demo todos entran con la contraseña demo." };
  const bcrypt = await serverImport("bcryptjs") as AnyPrisma;
  const hash = await (bcrypt.default ?? bcrypt).hash(password, 10);
  const db = await prisma();
  await db.user.upsert({
    where: { email: target.email.toLowerCase() },
    update: { passwordHash: hash },
    create: { email: target.email.toLowerCase(), name: target.name, role: target.role, line: target.line ?? null, passwordHash: hash, companyId: target.role === "ADMIN" ? null : cid() },
  });
  audit(actor, "task", target.email, "contraseña fijada");
  return { ok: true };
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
    u.active = patch.active;
    changes.push(patch.active ? "reactivado" : "desactivado");
  }

  if (patch.role !== undefined && patch.role !== u.role) {
    if (!VALID_ROLES.includes(patch.role)) {
      return { ok: false, status: 422, error: "Rol inválido." };
    }
    if (patch.role === "ADMIN") {
      return { ok: false, status: 422, error: "El rol de administrador es de la plataforma, no de una empresa." };
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
  void persist("usuario", (db) => db.user.updateMany({ where: { email: u.email }, data: { name: u.name, role: u.role, line: u.line ?? null, active: u.active } }));
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

const integrations = () => S().integrations;

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
  void persist("integración", (db) => db.integration.upsert({ where: { companyId_key: { companyId: cid(), key } }, update: { enabled: cfg.enabled, fields: cfg.fields, updatedBy: cfg.updatedBy ?? null }, create: { companyId: cid(), key, enabled: cfg.enabled, fields: cfg.fields, updatedBy: cfg.updatedBy ?? null } }));
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
  const gb = S();
  if (!gb.branding) {
    gb.branding = structuredClone(DEFAULT_BRANDING);
    gb.branding.institutionName = cat().company.name;
    gb.branding.shortName = cat().company.shortName;
  }
  // migración defensiva: si el objeto en memoria viene de una versión
  // anterior del modelo, se completan las claves faltantes con el default
  for (const [k, v] of Object.entries(DEFAULT_BRANDING)) {
    if ((gb.branding as Record<string, unknown>)[k] === undefined) {
      (gb.branding as Record<string, unknown>)[k] = structuredClone(v);
    }
  }
  return gb.branding;
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
  void persist("branding", (db) => db.branding.upsert({ where: { companyId: cid() }, update: { data: { ...b } }, create: { companyId: cid(), data: { ...b } } }));
  return { ok: true, branding: { ...b } };
}

/** Historial de cambios de branding (auditoría filtrada). */
export const getBrandingHistory = () =>
  auditLog().filter((a) => a.entity === "branding");

/* ═══ Notificaciones: estado de lectura por usuario ═══ */

const notifRead = () => S().notifRead;

export const getNotifRead = (email: string): Set<string> =>
  notifRead().get(email) ?? new Set();

export function markNotifRead(email: string, ids: string[]) {
  const set = notifRead().get(email) ?? new Set<string>();
  for (const id of ids) set.add(id);
  notifRead().set(email, set);
  void persist("notificaciones", (db) => db.notifRead.upsert({ where: { companyId_email: { companyId: cid(), email } }, update: { ids: [...set] }, create: { companyId: cid(), email, ids: [...set] } }));
}

/* ═══ Utilidad para la demo ═══ */

export function resetStore() {
  // la empresa activa vuelve a su catálogo; las demás empresas no se tocan
  const slug = currentTenant();
  const c = g.companies.get(slug);
  if (!c) return;
  g.tenants.set(slug, newState(slug, slug === DEFAULT_TENANT ? ANDINA_CATALOG : (g.tenants.get(slug)?.catalog ?? emptyCatalog(c)), c.dbId));
}

export { DEMO_TODAY };

