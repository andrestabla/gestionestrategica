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

import { isOrgKind, captureError, progressOf, perceptionOf, isPerceptionAnswer, CAPTURE_FIELDS, type OrgKind, type MadCapture, type MadResponse, type Captures, type MadCut, type SafeguardState, type SafeguardStatus, type CaptureField } from "@/lib/madurez";
import { instrumentOf } from "@/data/madurez";
import { riskError, severidad, type ProjectRisk, type RiskInput } from "@/lib/riesgos";
import { formaCiclo } from "@/lib/ruta-critica";
import { gastoError, dinero, type Gasto, type GastoInput } from "@/lib/presupuesto";
import { CONSENT_VERSION } from "@/lib/consentimiento";
import { type Task, type TaskStatus, DEMO_TODAY, hoyDe } from "@/data/proyectos";
import { type AssessmentRecord, type CellScore, type KpiFull, type InitiativeFull } from "@/data/cmi";
import {
  ANDINA_CATALOG, emptyCatalog, catalogFromTemplate, PLATFORM_USERS, responsibleIn,
  type Catalog, type CompanyInfo, horizonsOf, horizonesTodos, typeRuleOf, isGuiada, isAcompanamiento, type Horizon, type Lever } from "@/data/catalogo";
import { currentTenant, DEFAULT_TENANT, hasTenantContext, ahora, runWithTenant } from "@/server/tenant";
import { CODIGO_ALFABETO, CODIGO_LARGO, CODIGO_DIAS, alcanceDe, estadoCodigo, normalizarCodigo, validarCodigoNuevo, validarOrganizacion, type CodigoAcceso, type AlcanceCodigo } from "@/lib/codigos";
import { ALL_MODULES as TODOS_LOS_MODULOS } from "@/lib/modulos";
import { PRACTICES, DIMS, dimOf, F2_GENERAL, THRESHOLD } from "@/data/mapa";
import { lecturaF1 } from "@/lib/f1";
import { avg } from "@/lib/od";
import { periodIndex, isValidPeriod } from "@/lib/period";
import { krFaltantes, KR_INI_MAX, objetivoConPrioridad, iniciativaConKr } from "@/lib/convencion";
import { firmaObjetivo } from "@/server/firma";
import { INI_KR_MAX, mueveKr, iniCategoria, categoriaLabel, krsDeIniciativa } from "@/data/cmi";
import type { SessionUser } from "@/lib/session";
import { consolidate, decisionCheck, isLevel, TYPE_RULES, type TypeRule, type Evaluation, type Decision, type Consolidated, type CriterionKey } from "@/lib/priorizacion";
import { parseKrTemplates } from "@/lib/okr-plantillas";
import { parsePrioSessions, nextStatus, sessionOf, type PrioSessionAction } from "@/lib/priorizacion-sesion";
import { ACCESS_SECTIONS, accessSection, isAccessSection, isAccessRole, isCompanyMode, parseAccess, sectionOfToken, type AccessConfig, type AccessSection, type AccessRole, type CompanyMode, isEntryRole, entryRoleNeedsTribe, accessEnabled } from "@/lib/acceso";
import { randomBytes, randomInt, createHash, timingSafeEqual } from "crypto";
import { CODIGO_MINUTOS, CODIGO_INTENTOS, CODIGO_REENVIO_S, CODIGO_DIGITOS } from "@/lib/dos-pasos";
import { isExpired, RESET_MINUTES, passwordOk } from "@/lib/recuperacion";
import { parseItinerary, isCommentKind, TOKEN_RE as ITIN_TOKEN_RE, FILE_ID_RE, type Itinerary, type ItineraryComment, type ItineraryFile, URL_RE } from "@/lib/itinerario";
import type { DecisionRecord } from "@/data/priorizacion-demo";
import { can } from "@/lib/permissions";
import { isMailTemplateKey, validarPlantilla, type MailTemplateKey } from "@/lib/plantillas-correo";
import { parseInstruments, hasInstrument, instrumentLabel } from "@/lib/instrumentos";
import { parseModulesOff, parseModulesStored } from "@/lib/modulos";
import { normalizarMeta, proponerDesdePortafolio, type MetaTrimestral } from "@/lib/cascada";
import type { AlineacionIA, AlineacionItem } from "@/lib/alineacion";
import { RESERVED } from "@/lib/tenant-url";
import { esMoneda } from "@/lib/dinero";
import type { Response as OdResponse } from "@/lib/od";
import type { InformeGuardado, InformeIA, InformeKind } from "@/lib/informe-ia";
import { FRENTES, normalizarRevision, lecturaCapacidades, checklistHash, type ChecklistCap, type RevisionCapacidades, type Frente } from "@/lib/capacidades";
import { normalizarArticulacion, type Articulacion } from "@/lib/cascada";

/* ═══ Estado ═══ */

type EvidenceStatus = "VERIFICADA" | "PENDIENTE";

export type AuditEntry = {
  id: number;
  at: string;               // ISO
  actor: string;            // nombre del usuario
  email?: string;           // correo del usuario (para seguirlo en la actividad en vivo)
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
/** Fuente 1 · autoevaluación directiva por persona: los 68 ítems del mapa (código de práctica → 1–5). */
export type F1Response = {
  email: string;
  name: string;
  role: string;
  cargo?: string;
  at: string;                   // ISO
  r: Record<string, number>;    // DIR-1.1 … MUL-5.4 → 1–5
};

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
  f1: Map<string, F1Response>;
  informes: Map<string, InformeGuardado>;   // análisis con IA del diagnóstico, clave kind|subject
  f2: F2Response[];
  testNotes: Map<string, TestNotes>;
  madurez: { vars: Map<string, MadCapture>; resps: Map<string, MadResponse>; safeguards: SafeguardState; cuts: MadCut[] };
  riesgos: Map<string, ProjectRisk>;   // gestión de proyectos: riesgos y problemas de cada proyecto, clave RG-<ini>-NN
  gastos: Map<string, Gasto>;          // gestión de proyectos: compromisos y ejecuciones de presupuesto, clave GS-<ini>-NN   // madurez digital: captura vigente, salvaguardas y cortes publicados
  iniOverrides: Map<string, InitiativeOverride>;
  evals: Map<string, Evaluation>;          // clave iniId|email
  decisions: Map<string, DecisionRecord>;  // clave iniId
  metas: Map<string, MetaTrimestral>;      // F04 · metas trimestrales por área
  users: ManagedUser[];
  integrations: Map<IntegrationKey, IntegrationConfig>;
  branding?: Branding;
  notifRead: Map<string, Set<string>>;
  itinComments: Map<string, ItineraryComment>;   // comentarios al itinerario de la convención
  hydrated: boolean;
  version: number;        // versión de datos de la empresa que refleja esta memoria (-1 = desconocida: recargar)
  versionAt: number;      // último chequeo de la versión contra la base
  hydrating?: Promise<void>;   // recarga en curso (las peticiones concurrentes la esperan)
  writes: number;         // escrituras iniciadas en esta instancia (si hubo alguna durante una recarga, se vuelve a recargar)
};

export type CompanyRecord = CompanyInfo & { dbId: string | null };

type Registry = {
  companies: Map<string, CompanyRecord>;   // por slug
  tenants: Map<string, TenantState>;
  platformUsers: ManagedUser[];            // admins de plataforma (sin empresa)
  mailTemplates: Map<string, MailTemplateStored>; // plantillas de correo editadas (plataforma)
  mailLog: MailLogEntry[];                  // últimos envíos (memoria; la base guarda todo)
  companiesHydrated: boolean;
  companiesHydratedAt: number;   // última lectura del registro (se refresca cada minuto: varias instancias)
};

const g = (() => {
  const gg = globalThis as unknown as { __4shine?: Registry };
  if (!gg.__4shine) {
    gg.__4shine = {
      companies: new Map([[DEFAULT_TENANT, { ...ANDINA_CATALOG.company, dbId: null }]]),
      tenants: new Map(),
      platformUsers: PLATFORM_USERS.map((u) => ({ email: u.email, name: u.name, role: u.role, active: true, seeded: true })),
      companiesHydrated: false,
      mailTemplates: new Map(),
      mailLog: [],
      companiesHydratedAt: 0,
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
    capture: new Map(), published: null, kpiReports: new Map(), tests: new Map(), f1: new Map(), informes: new Map(), f2: [], testNotes: new Map(),
    madurez: { vars: new Map(), resps: new Map(), safeguards: {}, cuts: [] },
    riesgos: new Map(),
    gastos: new Map(),
    iniOverrides: new Map(),
    evals: new Map(catalog.seedEvaluations.map((e) => [`${e.iniId}|${e.by}`, e])),
    decisions: new Map(catalog.seedDecisions.map((d) => [d.iniId, d])),
    metas: new Map(),
    users: catalog.seedUsers.map((u) => ({ email: u.email, name: u.name, role: u.role, line: u.line, responsibleId: u.responsibleId, active: true, seeded: true })),
    integrations: new Map(), notifRead: new Map(), itinComments: new Map(), hydrated: false, version: -1, versionAt: 0, writes: 0,
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
      // pool pequeño por instancia: en Vercel cada función es una instancia y Neon limita las conexiones; con el
      // host «-pooler» de Neon (PgBouncer) veinte personas concurrentes caben de sobra. Tiempos acotados para que
      // una conexión colgada no bloquee una petición.
      adapter = new PrismaPg({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 5), idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000 });
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
  writeCatalog, readCatalog, companyRow, writeCompanyExtras, writeLevers, writeResponsible, deleteResponsible as dbDeleteResponsible,
  writeObjective, deleteObjective as dbDeleteObjective, writeKpi, deleteKpi as dbDeleteKpi, writeInitiative,
  deleteInitiative as dbDeleteInitiative, writePerson, deletePerson as dbDeletePerson, clearCatalog as dbClearCatalog,
} from "@/server/catalog-db";
import { frameworkOfPractice } from "@/data/mapa";
import type { Responsible, CmiObjective } from "@/data/cmi";
import type { Person } from "@/data/proyectos";
import type { Financials } from "@/data/catalogo";
import type { Territory } from "@/data/demo";

const COMPANIES_TTL_MS = 60_000;

/** Carga las empresas y los admins de plataforma desde la base. Se repite
    cada minuto para que los cambios hechos en otra instancia (alta, cambio
    de identificador, desactivación) lleguen a todas. */
export async function hydrateCompanies() {
  if (!hasDb()) return;
  if (g.companiesHydrated && Date.now() - g.companiesHydratedAt < COMPANIES_TTL_MS) return;
  try {
    const db = await prisma();
    const rows = await db.company.findMany();
    for (const c of rows) {
      const prev = g.companies.get(c.slug);
      g.companies.set(c.slug, {
        slug: c.slug, name: c.name, shortName: c.shortName, city: c.city, department: c.department,
        sector: c.sector ?? "", size: c.size ?? "", sectorKey: c.sectorKey ?? prev?.sectorKey ?? "suministros-industriales",
        ciiu: c.ciiu ?? "", active: c.active, template: (c.template as CompanyInfo["template"]) ?? "vacia",
        country: (c.country as CompanyInfo["country"]) ?? "CO", currency: (c.currency as CompanyInfo["currency"]) ?? "COP",
        horizons: parseHorizons(c.horizons).ok ? (parseHorizons(c.horizons) as { horizons?: Horizon[] }).horizons : undefined,
        levers: parseLevers(c.levers).ok ? (parseLevers(c.levers) as { levers?: Lever[] }).levers : undefined,
        typeRule: parseTypeRule(c.typeRule).ok ? (parseTypeRule(c.typeRule) as { rule?: TypeRule }).rule : undefined,
        krTemplates: (() => { const r = parseKrTemplates(c.krTemplates); return r.ok ? r.templates : undefined; })(),
        prioSessions: (() => { const r = parsePrioSessions(c.prioSessions); return r.ok ? r.sessions : undefined; })(),
        mode: isCompanyMode(c.mode) ? c.mode : "completa",
        orgKind: isOrgKind(c.orgKind) ? c.orgKind : "empresa",
        instruments: (() => { const r = parseInstruments(c.instruments); return r.ok ? r.instruments : undefined; })(),
        ...parseModulesStored(c.modulesOff),
        ...(c.twoFactor === true ? { twoFactor: true } : {}),
        access: parseAccess(c.access).ok ? (parseAccess(c.access) as { access?: AccessConfig }).access : undefined,
        itinerary: readItinerary(c.itinerary),
        createdBy: c.createdBy ?? undefined, createdAt: c.createdAt.toISOString(), dbId: c.id,
      });
      // misma dirección pero otra empresa en la base (se eliminó y se volvió a crear, p. ej. la demo): lo que esta
      // instancia tenía en memoria es de la anterior; se descarta para que la próxima petición cargue la nueva desde la base
      const t = g.tenants.get(c.slug);
      if (t && t.dbId && t.dbId !== c.id) g.tenants.delete(c.slug);
      else if (t) t.dbId = c.id;
    }
    // empresas que ya no están en la base con ese identificador (renombradas o eliminadas en otra instancia)
    const seen = new Set(rows.map((c: { slug: string }) => c.slug));
    for (const slug of [...g.companies.keys()]) {
      if (!seen.has(slug) && g.companies.get(slug)?.dbId) { g.companies.delete(slug); g.tenants.delete(slug); }
    }
    for (const u of await db.user.findMany({ where: { companyId: null } })) {
      const existing = g.platformUsers.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
      if (existing) { existing.name = u.name; existing.active = u.active; }
      else g.platformUsers.push({ email: u.email, name: u.name, role: u.role as SessionUser["role"], active: u.active, seeded: false, at: u.createdAt.toISOString() });
    }
    try { for (const t of await db.mailTemplate.findMany()) g.mailTemplates.set(t.key, { key: t.key, subject: t.subject, title: t.title, body: t.body, updatedBy: t.updatedBy ?? undefined, at: t.at.toISOString() }); } catch (e) { console.warn("[4shine] plantillas de correo:", (e as Error).message); }
    g.companiesHydrated = true;
    g.companiesHydratedAt = Date.now();
  } catch (e) {
    console.error("[4shine] hidratación de empresas falló:", (e as Error).message);
  }
}

/** Cada cuánto, como máximo, una instancia pregunta a la base si la versión de la empresa cambió. */
const VERSION_CHECK_MS = 1_000;

/** Hidrata la memoria de la empresa activa desde la base. La primera vez carga
    todo; después, en cada petición (como máximo una vez por segundo) compara la
    versión de datos de la empresa con la de la base y, si otra instancia
    escribió, recarga. Así varias instancias serverless ven lo mismo con un
    retraso de un par de segundos; las peticiones concurrentes esperan la misma recarga. */
/** Sincroniza la memoria con la base. Las lecturas comprueban la versión como máximo una vez por segundo;
    las escrituras (`force`) la comprueban siempre, para aplicar la mutación sobre lo último que guardó cualquier instancia. */
export async function hydrateFromDb(opts: { force?: boolean } = {}) {
  if (!hasDb()) return;
  await hydrateCompanies();
  const st = S();
  // una lectura no espera a una recarga en curso si ya hay datos en memoria (ve el estado anterior, consistente);
  // una escritura sí espera, para aplicarse sobre lo último
  if (st.hydrating) { if (st.hydrated && !opts.force) return; await st.hydrating; return; }
  if (st.hydrated) {
    if (!st.dbId || (!opts.force && Date.now() - st.versionAt < VERSION_CHECK_MS)) return;
    st.versionAt = Date.now();
    let remote: number | null = null;
    try {
      const db = await prisma();
      const row = await db.company.findUnique({ where: { id: st.dbId }, select: { dataVersion: true } });
      remote = row?.dataVersion ?? null;
    } catch (e) { console.error("[4shine] chequeo de versión falló:", (e as Error).message); return; }
    if (remote !== null && remote === st.version) return;
    g.companiesHydratedAt = 0;   // el registro (palancas, sesiones, itinerario…) también pudo cambiar
    await hydrateCompanies();
    // la fila de la empresa ya no existe con ese identificador: otra instancia la eliminó o la recreó. Si sigue en el
    // registro con otro identificador, se parte de cero con la nueva; si no, no hay nada que recargar
    if (remote === null) {
      if (!g.companies.has(st.slug)) return;
      g.tenants.delete(st.slug);
      const nuevo = S();
      nuevo.hydrating = loadTenant(nuevo);
      try { await nuevo.hydrating; } finally { nuevo.hydrating = undefined; }
      return;
    }
    // el registro pudo descartar este estado (la empresa se recreó): se carga el vigente
    const vigente = S();
    if (vigente !== st) {
      if (vigente.hydrating) { await vigente.hydrating; return; }
      vigente.hydrating = loadTenant(vigente);
      try { await vigente.hydrating; } finally { vigente.hydrating = undefined; }
      return;
    }
  }
  st.hydrating = loadTenant(st);
  try { await st.hydrating; } finally { st.hydrating = undefined; }
}

async function loadTenant(st: TenantState) {
  try {
    const db = await prisma();
    const companyId = st.dbId ?? g.companies.get(st.slug)?.dbId;
    if (!companyId) { st.hydrated = true; return; }   // empresa solo en memoria
    st.dbId = companyId;
    // la versión que vamos a reflejar: si alguien escribe mientras cargamos (aquí o en otra instancia), el siguiente chequeo volverá a recargar
    const writesBefore = st.writes;
    const verRow = await db.company.findUnique({ where: { id: companyId }, select: { dataVersion: true } });
    const version: number = verRow?.dataVersion ?? 0;
    // catálogo: la demo nace del seed; las demás empresas, de la base (con el registro fresco de la empresa)
    if (st.slug !== DEFAULT_TENANT) {
      const rec = g.companies.get(st.slug);
      const fresh = await readCatalog(db, { ...st.catalog.company, ...(rec ?? {}), dbId: companyId });
      const next = newState(st.slug, fresh, companyId);
      next.users = st.users; next.writes = st.writes;
      Object.assign(st, next);
    }
    st.version = st.writes === writesBefore ? version : -1; st.versionAt = Date.now();
    const W = { where: { companyId } };
    type DbTaskRow = {
      id: string; status: string; assigneeId: string; coAssigneeIds: unknown;
      start: Date; due: Date; note: string | null; evidenceIds: unknown;
    };
    // el resto de la empresa, en paralelo: una ida y vuelta a la base en lugar de quince en serie
    const [rowsRaw, commentRows, uploadRows, reportRows, overrideRows, evalRows, decisionRows, itinCommentRows, dbUsers, integrationRows, br, notifRows, captureRows, a3, testRows, noteRows, f1Rows, informeRows, metaRows, membershipRows] = await Promise.all([
      db.projectTask.findMany(W), db.taskComment.findMany({ where: { companyId }, orderBy: { id: "asc" } }), db.fileAsset.findMany({ where: { companyId }, orderBy: { at: "asc" } }),
      db.kpiReport.findMany({ where: { companyId }, orderBy: { at: "asc" } }), db.initiativeOverride.findMany(W), db.initiativeEvaluation.findMany(W), db.initiativeDecision.findMany(W),
      db.itineraryComment.findMany(W), db.user.findMany(W), db.integration.findMany(W), db.branding.findUnique({ where: { companyId } }), db.notifRead.findMany(W),
      db.practiceCapture.findMany({ where: { companyId, cut: "A3" } }), db.assessment.findUnique({ where: { companyId_id: { companyId, id: "A3" } }, include: { scores: true } }),
      db.testResponse.findMany(W), db.testNote.findMany(W), db.f1Response.findMany(W), db.diagnosticReport.findMany(W),
      db.quarterGoal.findMany(W).catch(() => []),
      db.userMembership.findMany({ where: { companyId, active: true }, include: { user: { include: { company: { select: { slug: true } } } } } }).catch(() => []),
    ]);
    const rows = rowsRaw as (DbTaskRow & {
      iniCode: string; title: string; desc: string | null; requiresEvidence: boolean; milestone?: boolean; dependsOn: unknown;
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
        if (r.milestone !== undefined) t.milestone = r.milestone || undefined;
        if (r.baseStart && r.baseDue) baselines().set(t.id, { start: day(r.baseStart), due: day(r.baseDue) });
        if (r.archived && tasks().includes(t)) { tasks().splice(tasks().indexOf(t), 1); if (!archived().includes(t)) archived().push(t); }
      }
    }
    // gestor: comentarios y archivos adjuntos
    if (comments().length === 0) {
      for (const c of commentRows) comments().push({ id: c.id, taskId: c.taskId, author: c.author, role: c.role, text: c.text, at: c.at.toISOString() });
    }
    if (uploads().length === 0) {
      for (const u of uploadRows) uploads().push({ id: u.id, taskId: u.taskId, title: u.title, kind: u.kind, fileName: u.fileName, filePath: u.filePath, size: u.size, mime: u.mime, uploadedBy: u.uploadedBy, date: u.at.toISOString().slice(0, 10), status: u.status as EvidenceStatus });
    }
    // KPI e iniciativas
    for (const r of reportRows) {
      const list = kpiReports().get(r.code) ?? [];
      if (!list.some((x) => x.period === r.period)) list.push({ code: r.code, period: r.period, value: r.value, note: r.note ?? undefined, by: r.by, at: r.at.toISOString() });
      kpiReports().set(r.code, list);
    }
    for (const o of overrideRows) iniOverrides().set(o.code, o.data as InitiativeOverride);
    // priorización: evaluaciones de la matriz y decisiones de tiempo
    for (const e of evalRows) evals().set(e.id, e.data as Evaluation);
    for (const d of decisionRows) decisions().set(d.code, d.data as DecisionRecord);
    st.metas.clear(); for (const m of metaRows as { id: string; data: unknown }[]) st.metas.set(m.id, m.data as MetaTrimestral);
    st.madurez = { vars: new Map(), resps: new Map(), safeguards: {}, cuts: [] };
    for (const r of (await db.maturityRecord.findMany(W).catch(() => [])) as { id: string; data: unknown }[]) {
      if (r.id.startsWith("var:")) st.madurez.vars.set(r.id.slice(4), r.data as MadCapture);
      else if (r.id.startsWith("resp:")) st.madurez.resps.set(r.id.slice(5), r.data as MadResponse);
      else if (r.id === "sg") st.madurez.safeguards = r.data as SafeguardState;
      else if (r.id.startsWith("cut:")) st.madurez.cuts.push(r.data as MadCut);
    }
    st.madurez.cuts.sort((a, b) => a.at.localeCompare(b.at));
    st.riesgos = new Map(); st.gastos = new Map();
    for (const r of (await db.projectRecord.findMany(W).catch(() => [])) as { id: string; data: unknown }[]) {
      if (r.id.startsWith("risk:")) st.riesgos.set(r.id.slice(5), r.data as ProjectRisk);
      else if (r.id.startsWith("gasto:")) st.gastos.set(r.id.slice(6), r.data as Gasto);
    }
    for (const c of itinCommentRows) S().itinComments.set(c.id, c.data as ItineraryComment);
    // usuarios de la empresa, integraciones, branding y notificaciones leídas
    if (dbUsers.length) {
      const seedEmails = new Set(cat().seedUsers.map((u) => u.email));
      const list = users();
      for (const u of dbUsers) {
        const existing = list.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
        if (existing) { existing.name = u.name; existing.role = u.role as SessionUser["role"]; existing.line = u.line ?? undefined; existing.responsibleId = u.responsibleId ?? undefined; existing.active = u.active; existing.consentAt = u.consentAt?.toISOString(); }
        else list.push({ email: u.email, name: u.name, role: u.role as SessionUser["role"], line: u.line ?? undefined, responsibleId: u.responsibleId ?? undefined, active: u.active, seeded: seedEmails.has(u.email), at: u.createdAt.toISOString(), ...(u.consentAt ? { consentAt: u.consentAt.toISOString() } : {}) });
      }
    }
    // membresías: cuentas de otra empresa que también operan en esta, con su propio rol y ámbito
    for (const m of membershipRows as { role: string; line: number | null; responsibleId: string | null; active: boolean; createdAt: Date; user: { email: string; name: string; active: boolean; consentAt: Date | null; company: { slug: string } | null } }[]) {
      if (!m.user.active) continue;
      const list = users();
      const existing = list.find((x) => x.email.toLowerCase() === m.user.email.toLowerCase());
      const fila: ManagedUser = { email: m.user.email, name: m.user.name, role: m.role as SessionUser["role"], line: m.line ?? undefined, responsibleId: m.responsibleId ?? undefined, active: m.active, seeded: false, membresia: true, principal: m.user.company?.slug, at: m.createdAt.toISOString(), ...(m.user.consentAt ? { consentAt: m.user.consentAt.toISOString() } : {}) };
      if (existing) Object.assign(existing, fila); else list.push(fila);
    }
    for (const i of integrationRows) integrations().set(i.key as IntegrationKey, { enabled: i.enabled, fields: i.fields as Record<string, string>, updatedBy: i.updatedBy ?? undefined, at: i.at.toISOString() });
    if (br) Object.assign(branding(), br.data as Partial<Branding>);
    for (const n of notifRows) notifRead().set(n.email, new Set(n.ids as string[]));
    // diagnóstico: captura del corte en curso, corte publicado, respuestas y evidencias
    for (const c of captureRows) {
      capture().set(c.practice, {
        perception: c.perception ?? undefined, evidence: (c.evidence as VariableCapture["evidence"]) ?? undefined,
        level: c.level ?? undefined, note: c.note ?? undefined, by: c.by, at: c.at.toISOString(),
      });
    }
    if (a3?.status === "PUBLICADA" && a3.scores.length) {
      const scores: Record<number, Record<string, CellScore>> = { 1: {}, 2: {}, 3: {}, 4: {} };
      for (const sc of a3.scores) scores[sc.line][sc.dimension] = { value: sc.value, target: sc.target ?? 0 };
      S().published = { id: "A3", label: a3.label, period: a3.period, status: "PUBLICADA", note: a3.note ?? "", scores };
    }
    for (const t of testRows) {
      testStore().set(t.email, { email: t.email, name: t.name, role: t.role, cargo: t.cargo ?? undefined, objetivo: t.objetivo ?? undefined, at: t.at.toISOString(), r: t.answers as TestResponse["r"] });
    }
    for (const f of f1Rows) {
      f1Store().set(f.email, { email: f.email, name: f.name, role: f.role, cargo: f.cargo ?? undefined, at: f.at.toISOString(), r: f.answers as F1Response["r"] });
    }
    for (const i of informeRows) {
      informes().set(`${i.kind}|${i.subject}`, { kind: i.kind as InformeKind, subject: i.subject, inputHash: i.inputHash, informe: i.content as InformeIA, model: i.model, by: i.by, at: i.at.toISOString() });
    }
    for (const n of noteRows) {
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
  sectorKey?: string; ciiu?: string; template?: "demo" | "vacia"; country?: "CO" | "EC"; currency?: "COP" | "USD";
  horizons?: unknown;   // [{id, label, months}] · lista vacía o nula = corto/mediano
  levers?: unknown;     // [{id, name, order, ownerId, indicator, desc}] · palancas estratégicas
  typeRule?: unknown;   // "4shine" | "cresio" | {criteria: [{key, name, strategic, tactical}], min} · regla estratégica/táctica
  mode?: unknown;       // "completa" | "convencion" · menú completo o solo las cinco secciones de la convención
  orgKind?: unknown;    // "empresa" | "educativa" · instrumento de madurez digital que aplica
  instruments?: unknown; // ["test","f1","f2","captura"] · instrumentos del diagnóstico habilitados (nulo = todos)
  modulesOff?: unknown;  // ["benchmark","proyectos",…] · módulos fuera del alcance de la empresa (nulo = ninguno)
  modulesPending?: unknown; // ["portafolio",…] · módulos del alcance aún no habilitados (nulo = ninguno)
  krTemplates?: unknown; // [{oe, code, name, unit, …}] · plantillas de KR por objetivo (lista vacía = sin biblioteca)
  newSlug?: string;     // solo al editar: nuevo identificador de la URL (/empresa/…)
};

/** Valida la regla de tipo: un identificador de regla predefinida («4shine» = regla general,
    «cresio»), o una regla propia con 2 a 6 criterios y un mínimo de marcas. */
export function parseTypeRule(input: unknown): { ok: true; rule?: TypeRule } | { ok: false; error: string } {
  if (input === undefined || input === null || input === "") return { ok: true, rule: undefined };
  if (typeof input === "string") {
    const preset = TYPE_RULES[input.trim().toLowerCase() as keyof typeof TYPE_RULES];
    if (!preset) return { ok: false, error: `Regla de tipo desconocida: «${input}». Opciones: ${Object.keys(TYPE_RULES).join(", ")}.` };
    return { ok: true, rule: preset.id === "4shine" ? undefined : preset };
  }
  if (typeof input !== "object") return { ok: false, error: "La regla de tipo debe ser un identificador o un objeto {criteria, min}." };
  const raw = input as Record<string, unknown>;
  // las reglas predefinidas se resuelven siempre a su versión vigente, aunque la base guarde una copia anterior
  if (typeof raw.id === "string" && TYPE_RULES[raw.id as keyof typeof TYPE_RULES]) return parseTypeRule(raw.id);
  if (!Array.isArray(raw.criteria)) return { ok: false, error: "La regla de tipo necesita una lista de criterios." };
  if (raw.criteria.length < 2 || raw.criteria.length > 6) return { ok: false, error: "La regla de tipo admite de dos a seis criterios." };
  const criteria: TypeRule["criteria"] = [];
  for (const c of raw.criteria as Record<string, unknown>[]) {
    const key = str(c?.key, 24).toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = str(c?.name, 80), strategic = str(c?.strategic, 400), tactical = str(c?.tactical, 400);
    if (!key || name.length < 3) return { ok: false, error: "Cada criterio de tipo necesita clave y nombre." };
    if (criteria.some((x) => x.key === key)) return { ok: false, error: `Criterio de tipo repetido: ${key}.` };
    criteria.push({ key, name, strategic, tactical });
  }
  const min = Math.round(num(raw.min, criteria.length));
  if (!(min >= 1 && min <= criteria.length)) return { ok: false, error: `El mínimo de marcas estratégicas va de 1 a ${criteria.length}.` };
  const id = typeof raw.id === "string" ? str(raw.id, 24) : undefined;
  return { ok: true, rule: { ...(id ? { id } : {}), criteria, min, ...(raw.excludeTactical ? { excludeTactical: true } : {}) } };
}

/** Valida las palancas estratégicas: hasta ocho, id corto y único, nombre; orden 1..n. */
export function parseLevers(input: unknown): { ok: true; levers?: Lever[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, levers: undefined };
  if (!Array.isArray(input)) return { ok: false, error: "Las palancas deben ser una lista." };
  if (input.length === 0) return { ok: true, levers: undefined };
  if (input.length > 8) return { ok: false, error: "Máximo ocho palancas." };
  const out: Lever[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const id = str(raw?.id, 12).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const name = str(raw?.name, 80);
    if (!id) return { ok: false, error: "Cada palanca necesita un identificador (p. ej. MS)." };
    if (name.length < 3) return { ok: false, error: `La palanca ${id} necesita un nombre.` };
    if (out.some((l) => l.id === id)) return { ok: false, error: `Prioridad repetida: ${id}.` };
    const ownerId = str(raw?.ownerId, 10) || undefined;
    const indicator = str(raw?.indicator, 700) || undefined;   // hasta cuatro indicadores separados por « · »
    const desc = str(raw?.desc, 800) || undefined;
    const observaciones = str(raw?.observaciones, 1000) || undefined;
    const propuesta = raw?.propuesta === true;
    out.push({ id, name, order: out.length + 1, ...(ownerId ? { ownerId } : {}), ...(indicator ? { indicator } : {}), ...(desc ? { desc } : {}), ...(observaciones ? { observaciones } : {}), ...(propuesta ? { propuesta: true } : {}) });
  }
  return { ok: true, levers: out };
}

/* ═══ Prioridades estratégicas (palancas): se cambian de una en una y cada versión queda en el historial ═══
   Varias personas editan a la vez en la sesión de acompañamiento: por eso ninguna operación reemplaza la lista
   completa a partir de lo que un navegador tenía cargado (eso borraba lo que otros acababan de guardar). Cada
   cambio se aplica sobre la lista vigente en el servidor y la versión anterior queda guardada para restaurarla. */

const HISTORIAL_PALANCAS_MAX = 60;
export type VersionPalancas = { id: string; at: string; by: string; motivo: string; levers: Lever[] };
let histSeq = 0;

/** Guarda la lista vigente como versión del historial antes de cambiarla. */
function snapshotPalancas(user: SessionUser, motivo: string) {
  const previo = (cat().company.levers ?? []).map((l) => ({ ...l }));
  const at = ahora().toISOString();
  const id = `${at}-${(++histSeq).toString(36)}`;   // varios cambios en el mismo instante no se pisan
  informes().set(`palancas|${id}`, { kind: "palancas", subject: id, inputHash: motivo.slice(0, 200), informe: { levers: previo } as unknown as InformeIA, model: "manual", by: user.email, at });
  const todas = [...informes().entries()].filter(([k]) => k.startsWith("palancas|")).sort((a, b) => (a[1].at < b[1].at ? 1 : -1));
  const sobran = todas.slice(HISTORIAL_PALANCAS_MAX);
  for (const [k] of sobran) informes().delete(k);
  if (!hasDb()) return;
  void persistQuiet("historial de prioridades", async (db) => {
    const companyId = cid();
    const data = { inputHash: motivo.slice(0, 200), content: { levers: previo }, model: "manual", by: user.email, at: new Date(at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind: "palancas", subject: id } }, update: data, create: { companyId, kind: "palancas", subject: id, ...data } });
    if (sobran.length) await db.diagnosticReport.deleteMany({ where: { companyId, kind: "palancas", subject: { in: sobran.map(([, v]) => v.subject) } } });
  });
}

/** Versiones anteriores de las prioridades, de la más reciente a la más antigua. */
export function getHistorialPalancas(): VersionPalancas[] {
  return [...informes().values()].filter((i) => i.kind === "palancas")
    .map((i) => ({ id: i.subject, at: i.at, by: i.by, motivo: i.inputHash, levers: ((i.informe as unknown as { levers?: Lever[] }).levers ?? []) }))
    .sort((a, b) => (a.id < b.id ? 1 : -1));
}

/** Aplica una lista ya validada: historial, memoria, auditoría y base. */
function commitLevers(user: SessionUser, levers: Lever[] | undefined, motivo: string): CatResult {
  const c = cat();
  if (levers) {
    const bad = levers.filter((l) => l.ownerId && !c.responsibles.some((r) => r.id === l.ownerId));
    if (bad.length) return fail(422, `Responsable inexistente en la palanca ${bad[0].id}.`);
  }
  snapshotPalancas(user, motivo);
  c.company.levers = levers;
  const rec = g.companies.get(currentTenant());
  if (rec) rec.levers = levers;
  audit(user, "task", "cat:palancas", `palancas: ${motivo} · lista: ${levers ? levers.map((l) => l.name).join(" · ") : "sin palancas"}`);
  void persist("catálogo", (db) => writeLevers(db, cid(), levers));
  return { ok: true };
}
const renumerar = (ls: Lever[]): Lever[] => ls.map((l, i) => ({ ...l, order: i + 1 }));

/** Reemplaza la lista completa (importaciones y scripts). Si llega `base` (las siglas que el cliente tenía
    cargadas) y la lista vigente ya cambió, se rechaza con 409 para no pisar lo que otros guardaron. */
export function setLevers(user: SessionUser, input: unknown, base?: string[]): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  if (base) {
    const vigentes = (cat().company.levers ?? []).map((l) => l.id).sort().join("|");
    if (vigentes !== [...base].map((x) => String(x).toUpperCase()).sort().join("|")) return fail(409, "La lista de prioridades cambió mientras la editabas (alguien más guardó). Recarga la página y vuelve a intentarlo.");
  }
  const parsed = parseLevers(input);
  if (!parsed.ok) return fail(422, parsed.error);
  return commitLevers(user, parsed.levers, "lista completa reemplazada");
}

/** Crea o actualiza una sola prioridad sobre la lista vigente; las demás no se tocan. */
export function setLever(user: SessionUser, input: unknown, prevId?: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const parsed = parseLevers([input]);
  if (!parsed.ok || !parsed.levers?.length) return fail(422, parsed.ok ? "La prioridad llega vacía." : parsed.error);
  const nueva = parsed.levers[0];
  const actual = [...(cat().company.levers ?? [])].sort((a, b) => a.order - b.order);
  const viejoId = (prevId ?? nueva.id).toUpperCase();
  const idx = actual.findIndex((l) => l.id === viejoId);
  if (nueva.id !== viejoId && actual.some((l) => l.id === nueva.id)) return fail(422, `Ya existe una prioridad con la sigla ${nueva.id}.`);
  if (idx < 0 && actual.length >= 8) return fail(422, "Máximo ocho prioridades.");
  const lista = idx >= 0 ? actual.map((l, i) => (i === idx ? { ...nueva, order: l.order } : l)) : [...actual, { ...nueva, order: actual.length + 1 }];
  return commitLevers(user, renumerar(lista), idx >= 0 ? `«${nueva.name}» actualizada` : `«${nueva.name}» añadida`);
}

/** Quita una prioridad; objetivos, KR e iniciativas que cuelgan de ella quedan sin prioridad hasta reasignarse. */
export function removeLever(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const actual = [...(cat().company.levers ?? [])].sort((a, b) => a.order - b.order);
  const l = actual.find((x) => x.id === id.toUpperCase());
  if (!l) return fail(404, "La prioridad no existe (quizá alguien ya la quitó).");
  const resto = renumerar(actual.filter((x) => x.id !== l.id));
  return commitLevers(user, resto.length ? resto : undefined, `«${l.name}» eliminada`);
}

/** Reordena por siglas; las que no se nombran conservan su posición relativa al final. */
export function reorderLevers(user: SessionUser, ids: unknown): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  if (!Array.isArray(ids)) return fail(422, "El orden debe ser una lista de siglas.");
  const actual = [...(cat().company.levers ?? [])].sort((a, b) => a.order - b.order);
  const orden = (ids as unknown[]).map((x) => String(x).toUpperCase());
  const primero = orden.map((id) => actual.find((l) => l.id === id)).filter((l): l is Lever => !!l);
  const resto = actual.filter((l) => !orden.includes(l.id));
  return commitLevers(user, renumerar([...primero, ...resto]), "orden cambiado");
}

/** Vuelve a una versión del historial (la lista vigente queda, a su vez, en el historial). */
export function restoreLevers(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const v = getHistorialPalancas().find((x) => x.id === id);
  if (!v) return fail(404, "Esa versión ya no está en el historial.");
  const parsed = parseLevers(v.levers);
  if (!parsed.ok) return fail(422, parsed.error);
  return commitLevers(user, parsed.levers, `versión del ${v.at.slice(0, 16).replace("T", " ")} restaurada`);
}

/** Valida los horizontes de una empresa: 1–6, id corto y único, etiqueta y meses crecientes. */
export function parseHorizons(input: unknown): { ok: true; horizons?: Horizon[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, horizons: undefined };
  if (!Array.isArray(input)) return { ok: false, error: "Los horizontes deben ser una lista." };
  if (input.length === 0) return { ok: true, horizons: undefined };
  if (input.length > 6) return { ok: false, error: "Máximo seis horizontes." };
  const out: Horizon[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const id = str(raw?.id, 12).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const label = str(raw?.label, 40);
    const months = Math.round(num(raw?.months, 0));
    if (!id) return { ok: false, error: "Cada horizonte necesita un identificador (p. ej. H1)." };
    if (label.length < 2) return { ok: false, error: `El horizonte ${id} necesita una etiqueta.` };
    if (!(months > 0 && months <= 240)) return { ok: false, error: `El horizonte ${id} necesita un plazo en meses (1–240).` };
    if (out.some((h) => h.id === id)) return { ok: false, error: `Horizonte repetido: ${id}.` };
    const baseline = raw?.baseline === true;
    const prevPlan = [...out].reverse().find((h) => !h.baseline);
    if (!baseline && prevPlan && months <= prevPlan.months) return { ok: false, error: "Los horizontes van de menor a mayor plazo." };
    out.push(baseline ? { id, label, months, baseline: true } : { id, label, months });
  }
  return { ok: true, horizons: out };
}

/** Crea una empresa (vacía o desde la plantilla demo) y, con base, la persiste con su catálogo. */
export async function createCompany(actor: SessionUser, input: CompanyInput): Promise<{ ok: true; company: CompanyRecord } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_companies")) return { ok: false, status: 403, error: "Solo el administrador de la plataforma crea empresas." };
  const name = input.name?.trim() ?? "";
  if (name.length < 3) return { ok: false, status: 422, error: "El nombre de la empresa debe tener al menos 3 caracteres." };
  const slug = slugify(input.slug?.trim() || name);
  if (!slug || slug.length < 2) return { ok: false, status: 422, error: "El identificador (slug) no es válido." };
  if (g.companies.has(slug)) return { ok: false, status: 422, error: `Ya existe una empresa con el identificador «${slug}».` };
  if (RESERVED.has(slug)) return { ok: false, status: 422, error: `El identificador «${slug}» está reservado por la plataforma.` };
  const template = input.template === "demo" ? "demo" : "vacia";
  const info: CompanyInfo = {
    slug, name, shortName: input.shortName?.trim() || name.split(" ")[0], city: input.city?.trim() ?? "", department: input.department?.trim() ?? "",
    sector: input.sector?.trim() ?? "", size: input.size?.trim() ?? "", sectorKey: input.sectorKey?.trim() || "suministros-industriales",
    ciiu: input.ciiu?.trim() ?? "", active: true, template, createdBy: actor.name, createdAt: ahora().toISOString(),
    country: input.country === "EC" ? "EC" : "CO", currency: input.currency === "USD" ? "USD" : "COP",
    orgKind: isOrgKind(input.orgKind) ? input.orgKind : "empresa",
  };
  const hz = parseHorizons(input.horizons);
  if (!hz.ok) return { ok: false, status: 422, error: hz.error };
  if (hz.horizons) info.horizons = hz.horizons;
  const lv = parseLevers(input.levers);
  if (!lv.ok) return { ok: false, status: 422, error: lv.error };
  if (lv.levers) info.levers = lv.levers;
  const tr = parseTypeRule(input.typeRule);
  if (!tr.ok) return { ok: false, status: 422, error: tr.error };
  if (tr.rule) info.typeRule = tr.rule;
  if (input.mode !== undefined && !isCompanyMode(input.mode)) return { ok: false, status: 422, error: "Modo inválido: completa, convencion o acompanamiento." };
  if (isCompanyMode(input.mode)) info.mode = input.mode;
  const ins = parseInstruments(input.instruments);
  if (!ins.ok) return { ok: false, status: 422, error: ins.error };
  if (ins.instruments) info.instruments = ins.instruments;
  const mo = parseModulesOff(input.modulesOff);
  if (!mo.ok) return { ok: false, status: 422, error: mo.error };
  if (mo.modulesOff) info.modulesOff = mo.modulesOff;
  const mp = parseModulesOff(input.modulesPending);
  if (!mp.ok) return { ok: false, status: 422, error: mp.error };
  if (mp.modulesOff) { const pen = mp.modulesOff.filter((m) => !info.modulesOff?.includes(m)); if (pen.length) info.modulesPending = pen; }
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
  if (patch.newSlug !== undefined) {
    const ns = slugify(String(patch.newSlug));
    if (!ns || ns.length < 2) return { ok: false, status: 422, error: "El identificador (URL) no es válido: letras minúsculas, números y guiones." };
    if (ns !== slug) {
      if (slug === DEFAULT_TENANT) return { ok: false, status: 422, error: "La empresa demo conserva su identificador." };
      if (g.companies.has(ns)) return { ok: false, status: 422, error: `Ya existe una empresa con el identificador «${ns}».` };
      if (RESERVED.has(ns)) return { ok: false, status: 422, error: `El identificador «${ns}» está reservado por la plataforma.` };
      g.companies.delete(slug); c.slug = ns; g.companies.set(ns, c);
      const t0 = g.tenants.get(slug);
      if (t0) { g.tenants.delete(slug); t0.catalog.company.slug = ns; g.tenants.set(ns, t0); }
      audit(actor, "task", `empresa:${ns}`, `identificador ${slug} → ${ns}: las sesiones abiertas de sus usuarios deben volver a entrar por /${ns}/login`);
    }
  }
  const fields = ["name", "shortName", "city", "department", "sector", "size", "sectorKey", "ciiu"] as const;
  for (const f of fields) if (patch[f] !== undefined) (c as Record<string, unknown>)[f] = String(patch[f]).trim();
  if (patch.country !== undefined) c.country = patch.country === "EC" ? "EC" : "CO";
  if (patch.currency !== undefined) c.currency = patch.currency === "USD" ? "USD" : "COP";
  if (patch.orgKind !== undefined && isOrgKind(patch.orgKind) && patch.orgKind !== (c.orgKind ?? "empresa")) {
    c.orgKind = patch.orgKind;
    audit(actor, "task", `empresa:${c.slug}`, `tipo de organización: ${patch.orgKind === "educativa" ? "institución educativa" : "empresa"}`);
  }
  if (patch.horizons !== undefined) {
    const hz = parseHorizons(patch.horizons);
    if (!hz.ok) return { ok: false, status: 422, error: hz.error };
    c.horizons = hz.horizons;
  }
  if (patch.levers !== undefined) {
    const lv = parseLevers(patch.levers);
    if (!lv.ok) return { ok: false, status: 422, error: lv.error };
    c.levers = lv.levers;
  }
  if (patch.typeRule !== undefined) {
    const tr = parseTypeRule(patch.typeRule);
    if (!tr.ok) return { ok: false, status: 422, error: tr.error };
    c.typeRule = tr.rule;
    audit(actor, "task", `empresa:${c.slug}`, `regla de tipo estratégica/táctica: ${tr.rule ? (tr.rule.id ?? "propia") : "4shine"}`);
  }
  if (patch.krTemplates !== undefined) {
    const kt = parseKrTemplates(patch.krTemplates);
    if (!kt.ok) return { ok: false, status: 422, error: kt.error };
    c.krTemplates = kt.templates;
    audit(actor, "task", `empresa:${c.slug}`, `plantillas de KR: ${kt.templates?.length ?? 0}`);
  }
  if (patch.mode !== undefined) {
    if (!isCompanyMode(patch.mode)) return { ok: false, status: 422, error: "Modo inválido: completa, convencion o acompanamiento." };
    c.mode = patch.mode;
    audit(actor, "task", `empresa:${c.slug}`, `modo ${patch.mode}`);
  }
  if (patch.instruments !== undefined) {
    const ins = parseInstruments(patch.instruments);
    if (!ins.ok) return { ok: false, status: 422, error: ins.error };
    c.instruments = ins.instruments;
    audit(actor, "task", `empresa:${c.slug}`, `instrumentos del diagnóstico: ${ins.instruments?.join(", ") ?? "todos"}`);
  }
  if (patch.modulesOff !== undefined) {
    const mo = parseModulesOff(patch.modulesOff);
    if (!mo.ok) return { ok: false, status: 422, error: mo.error };
    c.modulesOff = mo.modulesOff;
    audit(actor, "task", `empresa:${c.slug}`, `módulos fuera del alcance: ${mo.modulesOff?.join(", ") ?? "ninguno"}`);
  }
  if (patch.modulesPending !== undefined) {
    const mp = parseModulesOff(patch.modulesPending);
    if (!mp.ok) return { ok: false, status: 422, error: mp.error };
    const pen = (mp.modulesOff ?? []).filter((m) => !c.modulesOff?.includes(m));
    c.modulesPending = pen.length ? pen : undefined;
    audit(actor, "task", `empresa:${c.slug}`, `módulos pendientes: ${c.modulesPending?.join(", ") ?? "ninguno"}`);
  }
  if (patch.active !== undefined) c.active = patch.active;
  const t = g.tenants.get(c.slug);
  if (t) t.catalog.company = { ...t.catalog.company, ...c };
  if (hasDb() && c.dbId) {
    const dbId = c.dbId;
    // la edición llega desde Administración, fuera del ámbito de la empresa editada: se sube su versión de datos
    // en la misma escritura para que las demás instancias recarguen su copia (modo, instrumentos, palancas, horizontes…)
    void persist("empresa", (db) => db.company.update({ where: { id: dbId }, data: { ...companyRow(c), dataVersion: { increment: 1 } } }));
    if (t) t.version = -1;   // esta instancia también vuelve a leer la empresa en su siguiente chequeo
  }
  audit(actor, "task", `empresa:${c.slug}`, `empresa actualizada`);
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
/** Pertenencia a otra empresa (membresía): la cuenta vive en su empresa principal y opera también aquí con este rol y ámbito. */
export type Membresia = { company: CompanyRecord; role: SessionUser["role"]; line?: number; responsibleId?: string };
export type UsuarioEncontrado = { user: ManagedUser; company: CompanyRecord | null; otras: Membresia[] };

export async function findUserForLogin(email: string): Promise<UsuarioEncontrado | null> {
  const e = email.trim().toLowerCase();
  await hydrateCompanies();
  const admin = g.platformUsers.find((u) => u.active && u.email.toLowerCase() === e);
  if (admin) return { user: admin, company: null, otras: [] };
  if (hasDb()) {
    try {
      const db = await prisma();
      const u = await db.user.findUnique({ where: { email: e }, include: { company: true, memberships: { where: { active: true }, include: { company: { select: { slug: true } } } } } });
      if (u && u.active) {
        const company = u.company ? g.companies.get(u.company.slug) ?? null : null;
        if (u.companyId && !company) return null;
        const otras: Membresia[] = (u.memberships as { role: string; line: number | null; responsibleId: string | null; company: { slug: string } }[]).flatMap((m) => { const c = g.companies.get(m.company.slug); return c && c.active && c.slug !== company?.slug ? [{ company: c, role: m.role as SessionUser["role"], line: m.line ?? undefined, responsibleId: m.responsibleId ?? undefined }] : []; });
        return { user: { email: u.email, name: u.name, role: u.role as SessionUser["role"], line: u.line ?? undefined, responsibleId: u.responsibleId ?? undefined, active: true, seeded: false }, company, otras };
      }
    } catch (e2) { console.error("[4shine] búsqueda de usuario falló:", (e2 as Error).message); }
  }
  let principal: { user: ManagedUser; company: CompanyRecord } | null = null; const otras: Membresia[] = [];
  for (const [slug, c] of g.companies) {
    const st = g.tenants.get(slug) ?? (slug === DEFAULT_TENANT ? (g.tenants.set(slug, newState(slug, ANDINA_CATALOG, c.dbId)), g.tenants.get(slug)!) : null);
    const u = st?.users.find((x) => x.active && x.email.toLowerCase() === e);
    if (!u) continue;
    if (u.membresia) otras.push({ company: c, role: u.role, line: u.line, responsibleId: u.responsibleId }); else if (!principal) principal = { user: u, company: c };
  }
  return principal ? { ...principal, otras: otras.filter((o) => o.company.active) } : null;
}

/** Empresas en las que una cuenta puede operar (principal y membresías), para el selector de empresa. */
export const empresasDe = (f: UsuarioEncontrado): { slug: string; name: string; shortName: string; role: SessionUser["role"] }[] =>
  [...(f.company ? [{ slug: f.company.slug, name: f.company.name, shortName: f.company.shortName, role: f.user.role }] : []), ...f.otras.map((o) => ({ slug: o.company.slug, name: o.company.name, shortName: o.company.shortName, role: o.role }))];

/** Rol y ámbito con los que una cuenta opera en una empresa dada (principal o membresía); nulo si no pertenece. */
export async function membershipOf(email: string, slug: string): Promise<Membresia | null> {
  const f = await findUserForLogin(email);
  if (!f) return null;
  if (f.company?.slug === slug) return { company: f.company, role: f.user.role, line: f.user.line, responsibleId: f.user.responsibleId };
  return f.otras.find((o) => o.company.slug === slug) ?? null;
}

/** Membresías de una empresa tal como están en la base: se leen antes de recrearla para no perder los accesos ya concedidos. */
export type MembresiaGuardada = { userId: string; role: string; line: number | null; responsibleId: string | null; active: boolean; createdBy: string | null };
export async function leerMembresias(slug: string): Promise<MembresiaGuardada[]> {
  const companyId = g.companies.get(slug)?.dbId;
  if (!hasDb() || !companyId) return [];
  try {
    const db = await prisma();
    const rows = await db.userMembership.findMany({ where: { companyId } });
    return rows.map((m: MembresiaGuardada) => ({ userId: m.userId, role: m.role, line: m.line, responsibleId: m.responsibleId, active: m.active, createdBy: m.createdBy }));
  } catch (e) { console.error("[4shine] lectura de membresías falló:", (e as Error).message); return []; }
}
/** Vuelve a crear en la empresa (ya recreada) las membresías que tenía; devuelve cuántas quedaron. */
export async function restaurarMembresias(slug: string, rows: MembresiaGuardada[]): Promise<number> {
  const companyId = g.companies.get(slug)?.dbId;
  if (!hasDb() || !companyId || !rows.length) return 0;
  let n = 0;
  const db = await prisma();
  for (const m of rows) {
    try {
      await conReintentos("membresía", () => db.userMembership.upsert({ where: { userId_companyId: { userId: m.userId, companyId } }, update: { role: m.role, line: m.line, responsibleId: m.responsibleId, active: m.active }, create: { userId: m.userId, companyId, role: m.role, line: m.line, responsibleId: m.responsibleId, active: m.active, createdBy: m.createdBy } }));
      n++;
    } catch (e) { console.error("[4shine] no se pudo restaurar una membresía:", (e as Error).message); }
  }
  const st = g.tenants.get(slug);
  if (st) st.version = -1;   // la próxima petición recarga la empresa, con sus cuentas
  return n;
}

/** Agrega a la empresa activa una cuenta que ya existe en otra empresa (membresía con rol y ámbito propios). */
export async function addMembership(actor: SessionUser, email: string, input: { role: SessionUser["role"]; line?: number; responsibleId?: string | null }): Promise<{ ok: true; user: ManagedUser } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_users")) return { ok: false, status: 403, error: "Solo el equipo consultor administra usuarios." };
  const e = email.trim().toLowerCase();
  if (users().some((u) => u.email.toLowerCase() === e)) return { ok: false, status: 422, error: "Ya existe un usuario con ese correo en esta empresa." };
  if (!VALID_ROLES.includes(input.role)) return { ok: false, status: 422, error: "Rol inválido." };
  const f = await findUserForLogin(e);
  if (!f) return { ok: false, status: 404, error: "No existe una cuenta activa con ese correo en otra empresa." };
  if (!f.company) return { ok: false, status: 422, error: "Ese correo es de un administrador de la plataforma: ya opera en todas las empresas." };
  if (f.company.slug === currentTenant()) return { ok: false, status: 422, error: "Esa cuenta ya pertenece a esta empresa." };
  const scope = input.role === "RESPONSABLE" ? resolveScope(input.line, input.responsibleId) : { ok: true as const, line: undefined, responsibleId: undefined };
  if (!scope.ok) return { ok: false, status: 422, error: scope.error };
  const user: ManagedUser = { email: f.user.email, name: f.user.name, role: input.role, line: scope.line, responsibleId: scope.responsibleId, active: true, seeded: false, membresia: true, principal: f.company.slug, createdBy: actor.name, at: ahora().toISOString() };
  users().push(user);
  void persist("membresía", async (db) => {
    const companyId = cid();
    let row = await db.user.findUnique({ where: { email: e }, select: { id: true } });
    if (!row) {
      // cuenta que existe solo en memoria (seed): se crea su fila en su empresa principal, sin contraseña fijada
      const principalId = g.companies.get(f.company!.slug)?.dbId ?? null;
      row = await db.user.create({ data: { email: e, name: f.user.name, role: f.user.role, line: f.user.line ?? null, responsibleId: f.user.responsibleId ?? null, companyId: principalId, passwordHash: "", active: true }, select: { id: true } });
    }
    const data = { role: user.role, line: user.line ?? null, responsibleId: user.responsibleId ?? null, active: true, createdBy: actor.email };
    await db.userMembership.upsert({ where: { userId_companyId: { userId: row.id, companyId } }, update: data, create: { userId: row.id, companyId, ...data } });
  });
  audit(actor, "task", e, `cuenta de ${f.company.name} agregada a esta empresa como ${input.role}${user.role === "RESPONSABLE" ? ` · ${scopeName(user)}` : ""}`);
  return { ok: true, user };
}

export const getPlatformUsers = (): ManagedUser[] => g.platformUsers;

/** Escribe en la base si está configurada; la memoria sigue siendo la fuente. */
// En un entorno serverless (Vercel) la función se congela al responder: una
// escritura lanzada sin esperar se perdería. `after()` de Next registra la
// promesa para que la plataforma la complete antes de apagar la función; fuera
// de una petición (pruebas, seed) no hay ámbito y se omite sin fallar.
const pendingWrites = new Set<Promise<Error | null>>();
/** Códigos renombrados al guardar (otra instancia usó el mismo): «empresa|código viejo» → código definitivo. */
const rekeyed = new Map<string, string>();
/** Código definitivo de una entidad creada en esta petición (si se renombró al guardarse, el nuevo; si no, el mismo). */
export function finalId(id: string): string {
  let cur = id;
  for (let n = 0; n < 5; n++) { const next = rekeyed.get(`${currentTenant()}|${cur}`); if (!next) break; cur = next; }
  return cur;
}
/** Fallos pasajeros de la conexión (arranque en frío de Neon, conexión cortada, pool saturado): se reintenta. */
const esTransitorio = (e: unknown) => /timeout exceeded when trying to connect|ECONNRESET|ECONNREFUSED|ETIMEDOUT|Connection terminated|terminating connection|server closed the connection|57P01|53300|too many clients|Can't reach database server/i.test(String((e as Error)?.message ?? e));
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Ejecuta una escritura con hasta tres intentos cuando el fallo es de conexión. */
async function conReintentos<T>(what: string, fn: () => Promise<T>): Promise<T> {
  const pausas = [400, 1500];
  for (let n = 0; ; n++) {
    try { return await fn(); }
    catch (e) {
      if (n >= pausas.length || !esTransitorio(e)) throw e;
      console.warn(`[4shine] ${what}: fallo de conexión (${(e as Error).message.slice(0, 80)}), reintento ${n + 1}`);
      await espera(pausas[n]);
    }
  }
}
async function persist(what: string, fn: (db: AnyPrisma) => Promise<unknown>) {
  if (!hasDb()) return;
  const st = g.tenants.get(currentTenant());   // empresa activa (si la escritura es de una empresa)
  if (st) st.writes++;
  const run = (async (): Promise<Error | null> => {
    try {
      await conReintentos(what, async () => { const db = await prisma(); await fn(db); await bumpVersion(db, st); });
      return null;
    } catch (e) { console.error(`[4shine] write-through (${what}) falló:`, (e as Error).message); return e as Error; }
  })();
  pendingWrites.add(run); void run.finally(() => pendingWrites.delete(run));
  try {
    const { after } = await serverImport("next/server") as { after?: (task: Promise<unknown>) => void };
    after?.(run);
  } catch { /* sin ámbito de petición: la promesa sigue su curso */ }
  await run;
}
/** Escritura que no cambia los datos de la empresa (auditoría): no sube la versión ni cuenta como error de la petición. */
async function persistQuiet(what: string, fn: (db: AnyPrisma) => Promise<unknown>) {
  if (!hasDb()) return;
  const run = (async () => { try { await conReintentos(what, async () => fn(await prisma())); } catch (e) { console.error(`[4shine] escritura (${what}) falló:`, (e as Error).message); } })();
  try { const { after } = await serverImport("next/server") as { after?: (task: Promise<unknown>) => void }; after?.(run); } catch { /* sin ámbito de petición */ }
  await run;
}
/** Sube la versión de datos de la empresa en la base y la refleja en memoria. Si otra instancia
    escribió entre medias (la versión devuelta no es la esperada), la memoria se marca desconocida
    para que el siguiente chequeo recargue. */
async function bumpVersion(db: AnyPrisma, st: TenantState | undefined) {
  if (!st?.dbId) return;
  const row = await db.company.update({ where: { id: st.dbId }, data: { dataVersion: { increment: 1 } }, select: { dataVersion: true } });
  st.version = !st.hydrating && row.dataVersion === st.version + 1 ? row.dataVersion : -1;
}

/** Crea en la base una entidad nueva con el código asignado en memoria. Si otra instancia usó ese
    código en el mismo instante (violación de unicidad), toma el siguiente libre según la base, lo
    renombra en memoria y vuelve a intentar: no se pierde ni se pisa ninguna de las dos. */
async function createRekeying(db: AnyPrisma, label: string, current: () => string, rename: (fresh: string) => void,
  usedInDb: () => Promise<string[]>, nextFree: (used: string[]) => string, create: () => Promise<unknown>) {
  for (let n = 0; n < 5; n++) {
    try { await create(); return; }
    catch (e) {
      if ((e as { code?: string })?.code !== "P2002") throw e;
      const used = [...(await usedInDb()), current()];
      const fresh = nextFree(used);
      console.warn(`[4shine] ${label} ${current()} ya existía en la base (otra instancia): pasa a ${fresh}`);
      rekeyed.set(`${currentTenant()}|${current()}`, fresh);
      rename(fresh);
    }
  }
  throw new Error(`${label}: no se pudo asignar un código libre`);
}

/** Espera a que terminen todas las escrituras pendientes. Para scripts que corren fuera de una petición
    (carga del itinerario, seed): sin esto, el proceso puede terminar antes de que la base reciba la escritura. */
/** Espera a que terminen todas las escrituras pendientes y devuelve los errores que hubo. Las rutas que
    escriben la llaman antes de responder: así el cliente recibe la confirmación (y el código definitivo)
    solo cuando la base ya lo tiene, y cualquier otra instancia lo ve en su siguiente petición. */
export async function flushPersist(): Promise<string[]> {
  const errors: string[] = [];
  while (pendingWrites.size) {
    for (const r of await Promise.allSettled([...pendingWrites])) {
      if (r.status === "fulfilled" && r.value) errors.push(r.value.message);
      else if (r.status === "rejected") errors.push(String(r.reason));
    }
  }
  return errors;
}
/** Respuesta de error si alguna escritura de la petición no llegó a la base. */
export async function flushOrError(): Promise<string | null> {
  const e = await flushPersist();
  return e.length ? `No se pudo guardar en la base: ${e[0]}. Inténtalo de nuevo.` : null;
}

/* ═══ Verificación de persistencia ═══
   Lee la empresa directamente de la base (sin pasar por la memoria de la instancia) y la compara con lo que la
   plataforma está mostrando. Una diferencia significa que algo se ve en pantalla y no está guardado. */

export type SeccionPersistencia = { nombre: string; memoria: number; base: number; diferencias: string[] };
export type VerificacionPersistencia = { ok: boolean; at: string; empresa: string; version: { memoria: number; base: number }; secciones: SeccionPersistencia[]; detalle?: Record<string, unknown> };

const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined && x !== null && x !== "" && !(Array.isArray(x) && x.length === 0) && x !== false).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)]));
  return v;
};
const igual = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
/** Compara dos colecciones por clave: devuelve las claves que faltan en la base, sobran o difieren. */
function comparar<T>(nombre: string, mem: T[], base: T[], clave: (x: T) => string, vista: (x: T) => unknown): SeccionPersistencia {
  const m = new Map(mem.map((x) => [clave(x), x])), d = new Map(base.map((x) => [clave(x), x]));
  const diferencias: string[] = [];
  for (const [k, x] of m) { const y = d.get(k); if (!y) diferencias.push(`${k}: está en pantalla y no en la base`); else if (!igual(vista(x), vista(y))) diferencias.push(`${k}: difiere de la base`); }
  for (const k of d.keys()) if (!m.has(k)) diferencias.push(`${k}: está en la base y no en pantalla`);
  return { nombre, memoria: mem.length, base: base.length, diferencias };
}

export async function verificarPersistencia(conDetalle = false): Promise<VerificacionPersistencia | { ok: false; error: string }> {
  if (!hasDb()) return { ok: false, error: "Esta instalación no usa base de datos." };
  const st = S(); const c = cat();
  const companyId = st.dbId ?? g.companies.get(st.slug)?.dbId;
  if (!companyId) return { ok: false, error: "La empresa no tiene registro en la base." };
  const db = await prisma();
  const W = { where: { companyId } };
  const [fila, fresco, informeRows, decisionRows, evalRows, metaRows, f1Rows] = await Promise.all([
    db.company.findUnique({ where: { id: companyId }, select: { levers: true, dataVersion: true } }),
    readCatalog(db, { ...c.company, dbId: companyId }),
    db.diagnosticReport.findMany(W), db.initiativeDecision.findMany(W), db.initiativeEvaluation.findMany(W),
    db.quarterGoal.findMany(W).catch(() => []), db.f1Response.findMany(W),
  ]);
  const palancasBase = (Array.isArray(fila?.levers) ? fila!.levers : []) as Lever[];
  const ini = (i: InitiativeFull) => ({ name: i.name, cmi: i.cmi, kpi: i.kpi, krExtra: i.krExtra, ownerId: i.ownerId, start: i.start, end: i.end, budgetPlanned: i.budgetPlanned, budgetCurrency: i.budgetCurrency, capability: i.capability, objetivo: i.objetivo, metaResultado: i.metaResultado, horizon: i.horizon, status: i.status, observaciones: i.observaciones });
  const kr = (k: KpiFull) => ({ name: k.name, unit: k.unit, baseline: k.baseline, target: k.target, goodDirection: k.goodDirection, ownerId: k.ownerId, due: k.due, cmi: k.cmi, definition: k.definition, formula: k.formula, frequency: k.frequency, source: k.source, n: (k.series ?? []).length });
  const informesMem = [...informes().values()].map((x) => ({ clave: `${x.kind}|${x.subject}`, hash: x.inputHash, contenido: x.informe as unknown }));
  const informesBase = (informeRows as { kind: string; subject: string; inputHash: string; content: unknown }[]).map((x) => ({ clave: `${x.kind}|${x.subject}`, hash: x.inputHash, contenido: x.content }));
  const secciones: SeccionPersistencia[] = [
    comparar("Prioridades estratégicas", c.company.levers ?? [], palancasBase, (l) => l.id, (l) => l),
    comparar("Objetivos", c.objectives, fresco.objectives, (o) => o.id, (o) => o),
    comparar("Resultados clave e indicadores", c.kpis, fresco.kpis, (k) => k.code, kr),
    comparar("Iniciativas", c.initiatives, fresco.initiatives, (i) => i.id, ini),
    comparar("Validaciones, capacidades, articulación e historial", informesMem, informesBase, (x) => x.clave, (x) => ({ hash: x.hash, contenido: x.contenido })),
    comparar("Decisiones de tiempo", [...decisions().values()], (decisionRows as { code: string; data: DecisionRecord }[]).map((r) => r.data), (d) => d.iniId, (d) => ({ decision: d.decision, rationale: d.rationale })),
    { nombre: "Calificaciones", memoria: getEvaluations().length, base: evalRows.length, diferencias: getEvaluations().length === evalRows.length ? [] : ["el número de calificaciones no coincide"] },
    { nombre: "Metas trimestrales", memoria: getMetas().length, base: metaRows.length, diferencias: getMetas().length === metaRows.length ? [] : ["el número de metas no coincide"] },
    { nombre: "Autoevaluaciones directivas", memoria: f1Store().size, base: f1Rows.length, diferencias: f1Store().size === f1Rows.length ? [] : ["el número de autoevaluaciones no coincide"] },
  ];
  const out: VerificacionPersistencia = { ok: secciones.every((x) => x.diferencias.length === 0), at: ahora().toISOString(), empresa: st.slug, version: { memoria: st.version, base: fila?.dataVersion ?? 0 }, secciones };
  // lo que la base tiene, leído sin pasar por la memoria: sirve para comprobar que una edición concreta quedó guardada
  if (conDetalle) out.detalle = {
    prioridades: palancasBase.map((l) => `${l.order}. ${l.id} · ${l.name}`),
    objetivos: fresco.objectives.map((o) => ({ id: o.id, prioridad: o.lever ?? null, descartado: !!o.descartado, nombre: o.name.slice(0, 80) })),
    resultadosClave: fresco.kpis.map((k) => ({ code: k.code, objetivo: k.cmi, base: k.baseline, meta: k.target, mejorSi: k.goodDirection })),
    iniciativas: fresco.initiatives.map((i) => ({ id: i.id, kr: [i.kpi, ...(i.krExtra ?? [])].filter(Boolean), nombre: i.name.slice(0, 80) })),
    informes: informesBase.map((x) => x.clave).sort(),
  };
  return out;
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
  const at = ahora().toISOString();
  auditLog().unshift({ id: auditLog().length + 1, at, actor: actor.name, email: actor.email, role: actor.role, entity, entityId, change });
  // también en la base, para la actividad en vivo de Administración (todas las instancias la ven); sin subir la versión de datos
  const st = g.tenants.get(currentTenant());
  const companyId = st?.dbId ?? g.companies.get(currentTenant())?.dbId;
  if (hasDb() && companyId) void persistQuiet("auditoría", (db) => db.auditEvent.create({ data: { companyId, at: new Date(at), actor: actor.name, email: actor.email, role: actor.role, entity, entityId, change: change.slice(0, 500) } }));
}

export type ActivityEvent = { id: string; at: string; actor: string; email: string; role: string; entity: string; entityId: string; change: string };
/** Actividad reciente de la empresa, leída de la base (lo que hicieron todos, en cualquier instancia). */
export async function activityFeed(opts: { since?: string; until?: string; limit?: number } = {}): Promise<{ events: ActivityEvent[]; activeUsers: number }> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  const since = opts.since && !Number.isNaN(Date.parse(opts.since)) ? new Date(opts.since) : undefined;
  const until = opts.until && !Number.isNaN(Date.parse(opts.until)) ? new Date(opts.until) : undefined;
  if (!hasDb()) {
    const events = auditLog().filter((a) => (!since || new Date(a.at) > since) && (!until || new Date(a.at) < until)).slice(0, limit).map((a) => ({ id: String(a.id), at: a.at, actor: a.actor, email: a.email ?? "", role: a.role, entity: a.entity, entityId: a.entityId, change: a.change }));
    return { events, activeUsers: new Set(auditLog().filter((a) => Date.now() - Date.parse(a.at) < 10 * 60_000).map((a) => a.email ?? a.actor)).size };
  }
  const db = await prisma(); const companyId = cid();
  const rows = await db.auditEvent.findMany({ where: { companyId, ...(since || until ? { at: { ...(since ? { gt: since } : {}), ...(until ? { lt: until } : {}) } } : {}) }, orderBy: { at: "desc" }, take: limit }) as { id: string; at: Date; actor: string; email: string; role: string; entity: string; entityId: string; change: string }[];
  const recent = await db.auditEvent.findMany({ where: { companyId, at: { gt: new Date(Date.now() - 10 * 60_000) } }, select: { email: true, actor: true }, distinct: ["email"] }) as { email: string; actor: string }[];
  return { events: rows.map((r) => ({ id: r.id, at: r.at.toISOString(), actor: r.actor, email: r.email, role: r.role, entity: r.entity, entityId: r.entityId, change: r.change })), activeUsers: recent.length };
}

/* ═══ Mutación: tarea ═══ */

export async function updateTask(
  user: SessionUser,
  id: string,
  patch: Partial<Pick<Task, "status" | "assigneeId" | "coAssigneeIds" | "start" | "due" | "note" | "milestone" | "dependsOn">> & { blockNote?: string },
): Promise<MutationResult> {
  const t = getTask(id);
  if (!t) return { ok: false, status: 404, error: "La tarea no existe." };

  // permiso: edición total o del ámbito de la iniciativa (capacidad o responsable)
  const ini = cat().initiatives.find((i) => i.id === t.iniId)!;
  if (!can(user, "edit_tasks", ini)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no puede editar tareas."
        : `No puedes editar tareas de ${resName(user, ini)}: tu ámbito es ${scopeName(user)}.`,
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
  if (patch.milestone !== undefined && Boolean(patch.milestone) !== Boolean(t.milestone)) {
    changes.push(patch.milestone ? "hito marcado" : "hito retirado");
    t.milestone = patch.milestone ? true : undefined;
  }
  if (patch.dependsOn !== undefined) {
    // dependencias: tareas que existen, sin repetir, sin ella misma y sin formar un ciclo (A espera a B y B espera a A)
    if (!Array.isArray(patch.dependsOn) || patch.dependsOn.some((d) => typeof d !== "string" || !tasks().some((x) => x.id === d))) {
      return { ok: false, status: 422, error: "Dependencias inválidas: deben ser tareas vigentes del plan." };
    }
    const deps = [...new Set(patch.dependsOn)];
    if (deps.includes(t.id)) return { ok: false, status: 422, error: "Una tarea no puede depender de sí misma." };
    if (formaCiclo(tasks(), t.id, deps)) return { ok: false, status: 422, error: "Esa dependencia forma un ciclo: alguna de esas tareas ya depende de esta." };
    const antes = (t.dependsOn ?? []).join(",");
    if (deps.join(",") !== antes) {
      changes.push(`dependencias [${antes || "—"}] → [${deps.join(",") || "—"}]`);
      t.dependsOn = deps.length ? deps : undefined;
    }
  }

  if (changes.length === 0) return { ok: true, task: t };

  audit(user, "task", id, changes.join(" · "));

  // a la base, por la clave compuesta de la empresa. Si la tarea venía de los datos de ejemplo y aún no tenía
  // fila, se crea con su línea base. El error, si lo hay, llega a la respuesta (flushOrError), no solo a la consola.
  const base = baselines().get(t.id) ?? { start: t.start, due: t.due };
  const datos = {
    iniCode: t.iniId, title: t.title, desc: t.desc, assigneeId: t.assigneeId, coAssigneeIds: (t.coAssigneeIds ?? []) as never, start: new Date(t.start), due: new Date(t.due), status: t.status,
    requiresEvidence: t.requiresEvidence ?? false, milestone: t.milestone ?? false, evidenceIds: (t.evidenceIds ?? []) as never, dependsOn: (t.dependsOn ?? []) as never, note: t.note ?? null,
  };
  void persist("tarea", (db) => db.projectTask.upsert({ where: { companyId_id: { companyId: cid(), id: t.id } }, update: datos, create: { companyId: cid(), id: t.id, baseStart: new Date(base.start), baseDue: new Date(base.due), ...datos } }));

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
      await db.evidence.upsert({ where: { id: ev.id }, update: { status: "VERIFICADA", verifiedBy: user.name, verifiedAt: ahora() }, create: { id: ev.id, practice: ev.practice, status: "VERIFICADA", verifiedBy: user.name, verifiedAt: ahora() } });
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
    at: ahora().toISOString(),
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
    id: `EV-U${String(uploads().length + 1).padStart(2, "0")}-${randomBytes(2).toString("hex")}`,
    taskId,
    title: meta.title.trim(),
    kind: meta.kind || "Documento",
    ...file,
    uploadedBy: user.name,
    date: ahora().toISOString().slice(0, 10),
    status: "PENDIENTE",   // nace pendiente: la verifica el consultor
  };
  uploads().push(evidence);
  void persist("archivo", (db) => db.fileAsset.create({ data: { id: evidence.id, companyId: cid(), taskId, title: evidence.title, kind: evidence.kind, fileName: evidence.fileName, filePath: evidence.filePath, size: evidence.size, mime: evidence.mime, uploadedBy: evidence.uploadedBy, status: evidence.status, at: ahora() } }));
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
    dependsOn?: string[]; requiresEvidence?: boolean; milestone?: boolean; note?: string;
  },
): MutationResult {
  const ini = cat().initiatives.find((i) => i.id === input.iniId);
  if (!ini) return { ok: false, status: 422, error: "La iniciativa no existe." };

  if (!can(user, "edit_tasks", ini)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no crea tareas."
        : `No puedes crear tareas en ${resName(user, ini)}: tu ámbito es ${scopeName(user)}.`,
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
    ...(input.milestone ? { milestone: true } : {}),
    dependsOn: input.dependsOn?.length ? input.dependsOn : undefined,
    note: input.note?.trim() || undefined,
  };
  tasks().push(task);
  baselines().set(id, { start: task.start, due: task.due });
  void persist("tarea nueva", (db) => db.projectTask.create({ data: {
    id, companyId: cid(), iniCode: task.iniId, title: task.title, desc: task.desc, assigneeId: task.assigneeId, coAssigneeIds: task.coAssigneeIds ?? [],
    start: new Date(task.start), due: new Date(task.due), baseStart: new Date(task.start), baseDue: new Date(task.due),
    status: task.status, requiresEvidence: task.requiresEvidence ?? false, milestone: task.milestone ?? false, evidenceIds: [], dependsOn: task.dependsOn ?? [], note: task.note ?? null,
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
    if (!can(user, "edit_tasks", ini)) {
      return {
        ok: false, status: 403,
        error: `El corrimiento toca ${resName(user, ini)} (${tid}) y tu ámbito es ${scopeName(user)}.`,
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

/** Ámbito de un responsable, para los mensajes: su tribu/área si la tiene, si no su capacidad. */
const scopeName = (u: SessionUser) => {
  const r = u.responsibleId ? cat().responsibles.find((x) => x.id === u.responsibleId) : undefined;
  if (r) return `${r.dependencia || r.cargo}${u.line ? ` (y la capacidad ${capName(u.line)} en el diagnóstico)` : ""}`;
  return `la capacidad ${capName(u.line)}`;
};
const ownerName = (id?: string) => cat().responsibles.find((x) => x.id === id)?.dependencia;
/** Cómo nombrar el recurso en el mensaje: por su dueño si eso decidió, si no por su capacidad. */
const resName = (u: SessionUser, r: { line?: number; ownerId?: string }) =>
  (u.responsibleId && r.ownerId && ownerName(r.ownerId)) || `la capacidad ${capName(r.line)}`;
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
  if (!hasInstrument(cat().company, "captura")) return { ok: false, status: 403, error: `${instrumentLabel("captura")}: no está habilitada para esta empresa.` };
  const v = PRACTICES.find((x) => x.code === varId);
  if (!v) return { ok: false, status: 404, error: "La práctica no existe en el mapa." };
  if (S().published) {
    return { ok: false, status: 422, error: "El corte A3 ya está publicado: la captura está cerrada." };
  }
  if (!can(user, "capture_maturity", v.line)) {
    return {
      ok: false, status: 403,
      error: user.role === "RESPONSABLE"
        ? (user.line ? `No puedes capturar prácticas de ${capName(v.line)}: tu capacidad es ${capName(user.line)}.` : "Tu cuenta tiene ámbito por responsable sin capacidad asignada: la captura del diagnóstico va por capacidad.")
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
    at: ahora().toISOString(),
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
      update: { status: "PUBLICADA", note: assessment.note, publishedAt: ahora(), publishedBy: user.name },
      create: { id: "A3", companyId: company.id, label: assessment.label, period: assessment.period, status: "PUBLICADA", note: assessment.note, publishedAt: ahora(), publishedBy: user.name },
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
  if (!hasInstrument(cat().company, "test")) return { ok: false, status: 403, error: `${instrumentLabel("test")}: no está habilitado para esta empresa.` };
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
    at: ahora().toISOString(), r,
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
    by: user.name, at: ahora().toISOString(),
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

/* ═══ Fuente 1 · Autoevaluación directiva por persona ═══
   Cada cuenta de la empresa responde los 68 ítems (1–5) y ve su propio
   resultado; el advisor y el administrador ven todas las respuestas y el
   consolidado. El avance se guarda parcial y la última respuesta reemplaza a
   la anterior; al publicar el corte A3 la autoevaluación queda cerrada. */

function f1Store() { return S().f1; }

export const F1_CAN_SEE_ALL = (user: SessionUser) => ["ADMIN", "CONSULTOR"].includes(user.role);

/** Todas las respuestas para el advisor y el administrador; la propia para los demás. */
export function getF1Responses(user: SessionUser): F1Response[] {
  const all = [...f1Store().values()].sort((a, b) => a.at.localeCompare(b.at));
  return F1_CAN_SEE_ALL(user) ? all : all.filter((f) => f.email.toLowerCase() === user.email.toLowerCase());
}

/** ¿Está cerrada la autoevaluación? Sí cuando el corte A3 ya se publicó desde la plataforma. */
export const f1Closed = (): boolean => Boolean(S().published);

export function saveF1Response(
  user: SessionUser,
  input: { r: Record<string, unknown>; cargo?: string; base?: unknown },
): { ok: true; response: F1Response; answered: number; merged: boolean } | { ok: false; status: number; error: string } {
  if (!hasInstrument(cat().company, "f1")) return { ok: false, status: 403, error: `${instrumentLabel("f1")}: no está habilitada para esta empresa.` };
  if (!can(user, "answer_f1")) return { ok: false, status: 403, error: "Tu rol no responde la autoevaluación directiva." };
  if (f1Closed()) return { ok: false, status: 422, error: "El corte A3 ya está publicado: la autoevaluación está cerrada." };
  const r: Record<string, number> = {};
  for (const [code, raw] of Object.entries(input.r ?? {})) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (!PRACTICES.some((p) => p.code === code)) return { ok: false, status: 422, error: `La práctica ${code} no existe en el mapa.` };
    const v = typeof raw === "string" ? Number(raw) : raw;
    if (!inRange(v, 1, 5)) return { ok: false, status: 422, error: `El ítem ${code} admite un entero de 1 a 5.` };
    r[code] = Number(v);
  }
  if (!Object.keys(r).length) return { ok: false, status: 422, error: "Responde al menos un ítem para guardar el avance." };
  const prev = f1Store().get(user.email);
  // `base` es la fecha de la copia desde la que respondió el cliente: si el servidor ya tiene otra (otro dispositivo o
  // pestaña), se fusionan y gana lo que llega; así una copia vieja nunca borra respuestas ya guardadas.
  const merged = !!prev && typeof input.base === "string" && input.base !== prev.at;
  const final = merged ? { ...prev.r, ...r } : r;
  const answered = Object.keys(final).length;
  const response: F1Response = {
    email: user.email, name: user.name, role: user.role,
    cargo: input.cargo?.trim() || prev?.cargo || undefined,
    at: ahora().toISOString(), r: final,
  };
  f1Store().set(user.email, response);
  audit(user, "task", `f1:${user.email}`, `autoevaluación directiva guardada (${answered} de ${PRACTICES.length} ítems)${merged ? " · fusionada con la copia guardada desde otro dispositivo" : ""}`);
  void persist("autoevaluación", async (db) => {
    const companyId = cid();
    const data = { name: response.name, role: response.role, cargo: response.cargo ?? null, answers: response.r, at: new Date(response.at) };
    await db.f1Response.upsert({ where: { companyId_email: { companyId, email: response.email } }, update: data, create: { email: response.email, companyId, ...data } });
  });
  return { ok: true, response, answered, merged };
}

/* ═══ Análisis con IA del diagnóstico ═══
   Un informe por persona (su autoevaluación) y uno consolidado. Se guarda con la huella de las
   respuestas que lo originaron: si cambian, la plataforma avisa que está desactualizado. */

function informes() { return S().informes; }

export const getInforme = (kind: InformeKind, subject: string): InformeGuardado | null => informes().get(`${kind}|${subject}`) ?? null;

/** Cuántas autoevaluaciones hay (para la vista pública del consolidado, que no lleva sesión). */
export const f1CountForPublic = (): number => f1Store().size;

export function saveInforme(user: SessionUser, kind: InformeKind, subject: string, inputHash: string, informe: InformeIA, model = "openai")
  : { ok: true; saved: InformeGuardado } | { ok: false; status: number; error: string } {
  if (!hasInstrument(cat().company, "f1")) return { ok: false, status: 403, error: `${instrumentLabel("f1")}: no está habilitada para esta empresa.` };
  if (kind === "consolidado" && !can(user, "view_f1_all")) return { ok: false, status: 403, error: "El consolidado lo generan el administrador y el advisor." };
  if (kind === "f1" && subject !== user.email.toLowerCase() && !F1_CAN_SEE_ALL(user)) return { ok: false, status: 403, error: "Solo puedes generar el análisis de tu propia autoevaluación." };
  const saved: InformeGuardado = { kind, subject, inputHash, informe, model, by: user.email, at: ahora().toISOString() };
  informes().set(`${kind}|${subject}`, saved);
  void persist("informe con IA", async (db) => {
    const companyId = cid();
    const data = { inputHash, content: informe, model, by: user.email, at: new Date(saved.at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind, subject } }, update: data, create: { companyId, kind, subject, ...data } });
  });
  return { ok: true, saved };
}

function f2Store() { return S().f2; }
const F2_CODES = new Set([...DIMS.flatMap((d) => d.f2.map((q) => q.code)), ...F2_GENERAL.map((q) => q.code)]);

export const getF2Responses = (): F2Response[] => [...f2Store()];

export function saveF2Response(
  input: { r: Record<string, unknown>; area?: string; abierta?: string },
): { ok: true; response: F2Response; total: number } | { ok: false; status: number; error: string } {
  const r: Record<string, number> = {};
  for (const code of F2_CODES) {
  if (!hasInstrument(cat().company, "f2")) return { ok: false, status: 403, error: `${instrumentLabel("f2")}: no está habilitada para esta empresa.` };
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
    // id único también entre instancias (dos respuestas simultáneas en funciones distintas no deben chocar en la base)
    id: `F2-${String(f2Store().length + 1).padStart(4, "0")}-${randomBytes(2).toString("hex")}`,
    at: ahora().toISOString(),
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

/* ═══ Corte en curso: lo capturado en la plataforma como fuentes del diagnóstico de capacidades ═══
   F1 = autoevaluaciones por persona (cada quien captura las prácticas de su
   capacidad); F2 = encuesta anónima; F3 = marcas de evidencia y nivel por
   dimensión (promedio redondeado de los niveles de sus prácticas); test =
   respuestas guardadas. El motor (lib/od) consolida igual que con la demo. */

export function platformResponses(): OdResponse[] {
  const out: OdResponse[] = [];
  if (f1Store().size) {
    // autoevaluación directiva por persona (cada quien los 68 ítems); con ella, la percepción de la captura A3 no se duplica
    for (const f of f1Store().values()) out.push({ tipo: "f1", meta: { nombre: f.name, cargo: f.cargo ?? f.role }, r: { ...f.r } });
  } else {
    const byUser = new Map<string, OdResponse>();
    for (const [code, c] of capture()) {
      if (c.perception === undefined) continue;
      const r = byUser.get(c.by) ?? { tipo: "f1" as const, meta: { nombre: c.by }, r: {} };
      r.r[code] = c.perception; byUser.set(c.by, r);
    }
    out.push(...byUser.values());
  }
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

  if (!can(user, "report_kpi", k)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no reporta valores de KPI."
        : `No puedes reportar KPI de ${resName(user, k)}: tu ámbito es ${scopeName(user)}.`,
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

  const report: KpiReport = { code, period, value, note: note?.trim() || undefined, by: user.name, at: ahora().toISOString() };
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

  if (!can(user, "edit_initiatives", base)) {
    return {
      ok: false, status: 403,
      error: user.role === "DIRECTIVO"
        ? "Tu rol es de consulta: no edita iniciativas."
        : `No puedes editar iniciativas de ${resName(user, base)}: tu ámbito es ${scopeName(user)}.`,
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
    o.logAppends = [...(o.logAppends ?? []), { date: hoyDe(cat().company), type: patch.log.type, text: patch.log.text.trim() }];
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

/* ═══ Matriz de priorización ═══
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

export const consolidatedOf = (iniId: string): Consolidated => consolidate(getEvaluations(iniId), typeRuleOf(cat().company));

/** Ubica una iniciativa en otro horizonte de la empresa (p. ej. el que sugiere
    el puntaje). Es parte de la decisión de tiempo: la registra quien decide. */
export function setInitiativeHorizon(user: SessionUser, iniId: string, horizon: string): { ok: true; horizon: string } | { ok: false; status: number; error: string } {
  const c = cat();
  const base = c.initiatives.find((i) => i.id === iniId);
  if (!base) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!can(user, "decide_initiatives")) return { ok: false, status: 403, error: "Mover una iniciativa de horizonte es parte de la decisión de tiempo: la registra la gerencia o el advisor." };
  const hz = horizonsOf(c.company).find((h) => h.id === String(horizon).toUpperCase());
  if (!hz) return { ok: false, status: 422, error: "El horizonte no es de esta empresa." };
  if (base.horizon === hz.id) return { ok: false, status: 422, error: `La iniciativa ya está en ${hz.label}.` };
  const from = base.horizon;
  base.horizon = hz.id;
  audit(user, "task", iniId, `horizonte ${from} → ${hz.id}`);
  void persist("catálogo", (db) => writeInitiative(db, cid(), base));
  return { ok: true, horizon: hz.id };
}

export function evaluateInitiative(
  user: SessionUser,
  iniId: string,
  input: { scores: Record<string, unknown>; type: Record<string, unknown>; notes?: Record<string, unknown> },
): { ok: true; evaluation: Evaluation; consolidated: Consolidated } | { ok: false; status: number; error: string } {
  const base = cat().initiatives.find((i) => i.id === iniId);
  if (!base) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (cat().company.mode === "acompanamiento") { const cal = calificabilidad(base); if (!cal.ok) return { ok: false, status: 422, error: `No se califica todavía: ${cal.motivo}.` }; }
  if (!base.kpi) return { ok: false, status: 422, error: "La iniciativa aún no está vinculada a un resultado clave: el líder de la tribu la vincula en «Iniciativas → KR» y entonces queda habilitada para calificar." };
  if (!can(user, "evaluate_initiatives", base) || (tribeScope(user) && base.ownerId !== tribeScope(user))) {
    return {
      ok: false, status: 403,
      error: user.role === "ADMIN"
        ? "El administrador de la plataforma no evalúa iniciativas."
        : user.role === "RESPONSABLE" || tribeScope(user)
          ? `Evalúas las iniciativas de tu ámbito (${scopeName(user)}); esta es de ${resName(user, base)}.`
          : "Tu rol no evalúa la priorización.",
    };
  }
  // en modo convención, los miembros y líderes de tribu califican solo con la calificación de su tribu abierta, y una sola vez
  // en acompañamiento, también los directivos del comité: la sesión de la prioridad (su sponsor) la abre el advisor
  const modo = cat().company.mode;
  const porSesion = (modo === "convencion" && (user.role === "RESPONSABLE" || user.role === "LIDER")) || (modo === "acompanamiento" && (user.role === "RESPONSABLE" || user.role === "LIDER" || user.role === "DIRECTIVO"));
  if (porSesion) {
    const ses = sessionOf(cat().company.prioSessions, base.ownerId);
    if (ses.status !== "abierta") return { ok: false, status: 403, error: modo === "acompanamiento"
      ? (ses.status === "cerrada" ? "La calificación de esta prioridad aún no está abierta: la abre el advisor desde Priorización." : "La calificación de esta prioridad ya se cerró; el advisor revisa y guarda el orden.")
      : (ses.status === "cerrada" ? "La calificación de tu tribu aún no está abierta: la abre el líder de tribu desde Priorización en vivo." : "La calificación de tu tribu ya se cerró; el líder revisa y guarda la priorización.") };
    if (evals().has(`${iniId}|${user.email.toLowerCase()}`)) return { ok: false, status: 409, error: "Ya calificaste esta iniciativa: cada miembro califica una sola vez." };
  }
  const scores = {} as Record<CriterionKey, 1 | 2 | 3 | 4>;
  for (const k of ["D", "E", "M", "L"] as CriterionKey[]) {
    const v = Number(input.scores?.[k]);
    if (!isLevel(v)) return { ok: false, status: 422, error: `El criterio ${k} se califica de 1 (débil) a 4 (decisivo).` };
    scores[k] = v;
  }
  const type: Record<string, "ESTRATEGICO" | "TACTICO"> = {};
  for (const c of typeRuleOf(cat().company).criteria) {
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
    notes: Object.keys(notes).length ? notes : undefined, at: ahora().toISOString(),
  };
  evals().set(key, evaluation);
  audit(user, "task", iniId, `priorización: D${scores.D} E${scores.E} M${scores.M} L${scores.L}`);
  void persist("evaluación", (db) => db.initiativeEvaluation.upsert({
    where: { companyId_id: { companyId: cid(), id: key } }, update: { data: evaluation }, create: { companyId: cid(), id: key, iniCode: iniId, by: evaluation.by, data: evaluation },
  }));
  return { ok: true, evaluation, consolidated: consolidatedOf(iniId) };
}

/** Sesión de calificación de una tribu en la priorización en vivo: el líder la abre, la cierra para revisar, fija el orden y guarda. */
export function setPrioSession(user: SessionUser, tribeId: unknown, action: PrioSessionAction, order?: unknown): { ok: true; session: import("@/lib/priorizacion-sesion").PrioSession } | { ok: false; status: number; error: string } {
  const c = cat();
  const tribe = str(tribeId, 20);
  if (!c.responsibles.some((r) => r.id === tribe)) return { ok: false, status: 422, error: "El responsable del grupo no existe." };
  const leader = user.role === "LIDER" && (!user.responsibleId || user.responsibleId === tribe);
  if (!(leader || user.role === "CONSULTOR" || user.role === "ADMIN")) return { ok: false, status: 403, error: user.role === "LIDER" ? "Solo el líder de esa tribu (o el advisor) maneja su calificación." : "Solo el líder de tribu abre, cierra y guarda la calificación." };
  const prev = sessionOf(c.company.prioSessions, tribe);
  const status = nextStatus(prev.status, action);
  if (!status) return { ok: false, status: 422, error: `No se puede «${action}» desde el estado «${prev.status}».` };
  const now = ahora().toISOString();
  const next = { ...prev, status };
  if (action === "abrir" || action === "reabrir") { next.openedAt = now; next.openedBy = user.email.toLowerCase(); delete next.savedAt; delete next.savedBy; }
  if (action === "cerrar") next.closedAt = now;
  if (action === "guardar") {
    const own = new Set(c.initiatives.filter((i) => i.ownerId === tribe).map((i) => i.id));
    const ids = Array.isArray(order) ? [...new Set((order as unknown[]).map((x) => str(x, 20)).filter((x) => own.has(x)))] : [];
    if (ids.length) next.order = ids;
    next.savedAt = now; next.savedBy = user.email.toLowerCase();
  }
  const sessions = { ...(c.company.prioSessions ?? {}), [tribe]: next };
  c.company.prioSessions = sessions;
  const rec = g.companies.get(c.company.slug);
  if (rec) {
    rec.prioSessions = sessions;
    if (hasDb() && rec.dbId) {
      const dbId = rec.dbId;
      // solo la sesión de esta tribu: en PostgreSQL se fusiona en la base (dos líderes en instancias distintas no se pisan)
      void persist("sesión de priorización", async (db) => {
        if (/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "")) {
          // solo se fusiona sobre un objeto: si la columna trae un null JSON (así nacen las empresas nuevas) o cualquier otra
          // cosa, el operador || de jsonb concatenaría como lista ([null, {...}]) y la sesión se perdería al leerla
          await db.$executeRaw`UPDATE "Company" SET "prioSessions" = (CASE WHEN jsonb_typeof("prioSessions") = 'object' THEN "prioSessions" ELSE '{}'::jsonb END) || ${JSON.stringify({ [tribe]: next })}::jsonb WHERE "id" = ${dbId}`;
        } else {
          await db.company.update({ where: { id: dbId }, data: { prioSessions: sessions as never } });
        }
      });
    }
  }
  audit(user, "task", `tribu:${tribe}`, `priorización en vivo: ${action} → ${status}${next.order ? ` (orden de ${next.order.length} iniciativas)` : ""}`);
  return { ok: true, session: next };
}

/** Reinicia la calificación de una tribu (advisor o admin): borra las calificaciones de sus iniciativas y deja la sesión
    sin abrir, como al inicio. Para repetir una calibración o limpiar pruebas antes de la sesión real. */
export function resetPrioSession(user: SessionUser, tribeId: unknown): { ok: true; removed: number } | { ok: false; status: number; error: string } {
  const c = cat();
  const tribe = str(tribeId, 20);
  if (!c.responsibles.some((r) => r.id === tribe)) return { ok: false, status: 422, error: "El responsable del grupo no existe." };
  if (!(user.role === "CONSULTOR" || user.role === "ADMIN")) return { ok: false, status: 403, error: "Solo el advisor o el admin reinician la calificación de una tribu." };
  const ids = new Set(c.initiatives.filter((i) => i.ownerId === tribe).map((i) => i.id));
  const keys = [...evals().keys()].filter((k) => ids.has(k.split("|")[0]));
  for (const k of keys) evals().delete(k);
  const sessions = { ...(c.company.prioSessions ?? {}) };
  delete sessions[tribe];
  c.company.prioSessions = sessions;
  const rec = g.companies.get(c.company.slug);
  if (rec) {
    rec.prioSessions = sessions;
    if (hasDb() && rec.dbId) {
      const dbId = rec.dbId;
      void persist("reinicio de calificación", async (db) => {
        if (keys.length) await db.initiativeEvaluation.deleteMany({ where: { companyId: dbId, id: { in: keys } } });
        if (/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "")) {
          // se quita solo la clave de esta tribu, fusionando en la base como en setPrioSession
          await db.$executeRaw`UPDATE "Company" SET "prioSessions" = (CASE WHEN jsonb_typeof("prioSessions") = 'object' THEN "prioSessions" ELSE '{}'::jsonb END) - ${tribe}::text WHERE "id" = ${dbId}`;
        } else {
          await db.company.update({ where: { id: dbId }, data: { prioSessions: sessions as never } });
        }
      });
    }
  }
  audit(user, "task", `tribu:${tribe}`, `priorización en vivo: calificación reiniciada (${keys.length} calificaciones borradas)`);
  return { ok: true, removed: keys.length };
}

export function decideInitiative(
  user: SessionUser,
  iniId: string,
  input: { decision: unknown; rationale?: unknown },
): { ok: true; decision: DecisionRecord } | { ok: false; status: number; error: string } {
  const base = cat().initiatives.find((i) => i.id === iniId);
  if (!base) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!can(user, "decide_initiatives") || tribeScope(user)) {
    return { ok: false, status: 403, error: tribeScope(user) ? "La decisión y el trimestre definitivo los ratifica el directorio con gerencia y el advisor; el líder de tribu propone." : "La decisión de tiempo la toma la gerencia o el advisor; tu rol evalúa o consulta." };
  }
  const d = input.decision as Decision;
  if (!["IMPLEMENTAR", "PREPARAR", "BACKLOG", "RENUNCIAR"].includes(d)) {
    return { ok: false, status: 422, error: "Decisión inválida: implementar, preparar, backlog o renunciar." };
  }
  // acompañamiento: una iniciativa sin resultado clave no pasa a priorización ni al portafolio
  if (cat().company.mode === "acompanamiento" && !iniciativaConKr(cat(), base)) return { ok: false, status: 422, error: "La iniciativa no está vinculada a un resultado clave: vincúlala en Iniciativas antes de priorizarla o decidir su tiempo." };
  const rationale = typeof input.rationale === "string" ? input.rationale.trim() : "";
  const check = decisionCheck(d, consolidatedOf(iniId), rationale);
  if (!check.ok) return { ok: false, status: 422, error: check.reason };
  const rec: DecisionRecord = { iniId, decision: d, rationale: rationale || undefined, by: user.email.toLowerCase(), name: user.name, at: ahora().toISOString() };
  decisions().set(iniId, rec);
  audit(user, "task", iniId, `decisión de tiempo → ${d}`);
  void persist("decisión", (db) => db.initiativeDecision.upsert({ where: { companyId_code: { companyId: cid(), code: iniId } }, update: { data: rec }, create: { companyId: cid(), code: iniId, data: rec } }));
  return { ok: true, decision: rec };
}


/* ═══ Acceso por sección de la convención (QR) ═══ */

const newToken = () => randomBytes(18).toString("base64url");
const companyRec = () => g.companies.get(currentTenant());
function saveAccess(actor: SessionUser, access: AccessConfig | undefined, what: string) {
  const rec = companyRec(); if (!rec) return;
  rec.access = access;
  const t = g.tenants.get(rec.slug);
  if (t) t.catalog.company = { ...t.catalog.company, access };
  audit(actor, "task", `empresa:${rec.slug}`, what);
  if (hasDb() && rec.dbId) { const dbId = rec.dbId; void persist("acceso", (db) => db.company.update({ where: { id: dbId }, data: { access: (access && Object.keys(access).length ? access : null) as never } })); }
}

export type AccessInfo = { section: AccessSection; label: string; role: AccessRole; token: string; at: string; what: string; enabled: boolean };

/** Enlaces de acceso de las cinco secciones (manage_users). Crea el token de
    cada sección la primera vez; después lo conserva hasta que se regenere. */
export function accessLinks(actor: SessionUser): { ok: true; access: AccessInfo[] } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_users")) return { ok: false, status: 403, error: "Los enlaces de acceso los administra el advisor o el administrador." };
  const rec = companyRec(); if (!rec) return { ok: false, status: 404, error: "Sin empresa activa." };
  const access: AccessConfig = { ...(rec.access ?? {}) };
  let changed = false;
  for (const s of ACCESS_SECTIONS) {
    if (!access[s.id]) { access[s.id] = { token: newToken(), role: s.role, at: ahora().toISOString() }; changed = true; }
  }
  if (changed) saveAccess(actor, access, "enlaces de acceso por sección creados");
  return { ok: true, access: ACCESS_SECTIONS.map((s) => ({ section: s.id, label: s.label, role: access[s.id]!.role, token: access[s.id]!.token, at: access[s.id]!.at, what: s.what, enabled: access[s.id]!.enabled !== false })) };
}

/** Regenera el token de una sección (los QR impresos con el anterior dejan de valer)
    o cambia el rol que reciben quienes entran por ella. */
/** También activa o desactiva el acceso: desactivado, nadie entra por el QR ni por la URL corta hasta volver a activarlo. */
export function updateAccess(actor: SessionUser, section: unknown, patch: { regenerate?: boolean; role?: unknown; enabled?: boolean }): { ok: true; access: AccessInfo[] } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_users")) return { ok: false, status: 403, error: "Los enlaces de acceso los administra el advisor o el administrador." };
  if (!isAccessSection(section)) return { ok: false, status: 422, error: "Sección desconocida." };
  const cur = accessLinks(actor); if (!cur.ok) return cur;
  const rec = companyRec()!;
  const access: AccessConfig = { ...(rec.access ?? {}) };
  const e = { ...access[section]! };
  if (patch.role !== undefined) { if (!isAccessRole(patch.role)) return { ok: false, status: 422, error: "Rol inválido: DIRECTIVO (consulta y evalúa) o LIDER (edita)." }; e.role = patch.role; }
  if (patch.regenerate) { e.token = newToken(); e.at = ahora().toISOString(); }
  if (typeof patch.enabled === "boolean") { if (patch.enabled) delete e.enabled; else e.enabled = false; }
  access[section] = e;
  saveAccess(actor, access, `acceso ${accessSection(section).label}: ${[patch.regenerate ? "token regenerado" : "", patch.role ? `rol ${e.role}` : "", typeof patch.enabled === "boolean" ? (patch.enabled ? "QR activado" : "QR desactivado") : ""].filter(Boolean).join(", ")}`);
  return accessLinks(actor);
}

/** Sección a la que da acceso un token de la empresa activa. */
export const accessSectionOf = (token: string): AccessSection | null => sectionOfToken(companyRec()?.access, token);

/** Entra por el enlace de una sección: identifica a la persona por su correo,
    la crea en la empresa la primera vez (con el rol de la sección) y después
    reutiliza su cuenta. Nunca duplica: el correo es único en la base. */
export async function accessUser(token: string, input: { name?: unknown; email?: unknown; consent?: unknown; responsibleId?: unknown; entryRole?: unknown }): Promise<{ ok: true; user: SessionUser; section: AccessSection; created: boolean } | { ok: false; status: number; error: string }> {
  const rec = companyRec();
  if (!rec || !rec.active) return { ok: false, status: 404, error: "La empresa no está activa." };
  const section = accessSectionOf(String(token ?? ""));
  if (!section) return { ok: false, status: 404, error: "Este enlace de acceso ya no es válido. Pide el QR vigente de la sección." };
  if (!accessEnabled(rec.access, section)) return { ok: false, status: 403, error: "El acceso por QR está desactivado en este momento. El equipo organizador lo activa cuando empiece el bloque." };
  const email = String(input.email ?? "").trim().toLowerCase();
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, status: 422, error: "Escribe un correo válido: es tu identificación en la plataforma." };
  if (name.length < 5) return { ok: false, status: 422, error: "Escribe tu nombre completo." };
  const consent = input.consent === true;
  const sec = accessSection(section);
  // quien entra elige su rol: miembro (califica lo de su tribu), líder (además registra OKR y vincula iniciativas) o directivo (sin tribu, solo consulta);
  // miembros y líderes eligen además su tribu (responsable del catálogo)
  const entryRole = isEntryRole(input.entryRole) ? input.entryRole : null;
  const tribeId = entryRole === "directivo" ? "" : String(input.responsibleId ?? "").trim();
  if (tribeId && !cat().responsibles.some((r) => r.id === tribeId)) return { ok: false, status: 422, error: "Elige tu tribu de la lista." };
  if (g.platformUsers.some((u) => u.email.toLowerCase() === email)) return { ok: false, status: 403, error: "Ese correo es de un administrador de la plataforma: entra por /login." };
  let user = users().find((u) => u.email.toLowerCase() === email);
  let created = false;
  // el tratamiento de datos se acepta la primera vez (o si aún no consta la aceptación)
  if (!consent && (!user || !user.consentAt)) return { ok: false, status: 422, error: "Para entrar debes aceptar el tratamiento de tus datos personales." };
  if (!user && (!entryRole || (entryRoleNeedsTribe(entryRole) && !tribeId))) return { ok: false, status: 422, error: "Elige tu rol (miembro de tribu, líder de tribu o directivo) y, si eres de una tribu, cuál." };
  const consentAt = ahora();
  if (!user) {
    // el correo puede existir en otra empresa (es único en la base): no se duplica ni se mueve
    const elsewhere = await findUserForLogin(email);
    if (elsewhere && elsewhere.company && elsewhere.company.slug !== rec.slug) return { ok: false, status: 409, error: `Ese correo ya tiene cuenta en ${elsewhere.company.name}; entra por su enlace.` };
    const role: SessionUser["role"] = entryRole === "lider" ? "LIDER" : entryRole === "directivo" ? "DIRECTIVO" : "RESPONSABLE";
    user = { email, name, role, ...(tribeId ? { responsibleId: tribeId } : {}), active: true, seeded: false, createdBy: `acceso QR · ${sec.label}`, at: ahora().toISOString(), consentAt: consentAt.toISOString() };
    users().push(user);
    created = true;
    void persist("usuario", async (db) => {
      const companyId = cid();
      await db.user.upsert({ where: { email }, update: { name, active: true, companyId, consentAt, consentVersion: CONSENT_VERSION, ...(tribeId ? { responsibleId: tribeId } : {}) }, create: { email, name, role, passwordHash: "", companyId, consentAt, consentVersion: CONSENT_VERSION, ...(tribeId ? { responsibleId: tribeId } : {}) } });
    });
  } else if (!user.consentAt) {
    user.consentAt = consentAt.toISOString();
    void persist("usuario", async (db) => { await db.user.update({ where: { email }, data: { consentAt, consentVersion: CONSENT_VERSION } }); });
  }
  if (!user.active) return { ok: false, status: 403, error: "Tu cuenta está desactivada en esta empresa." };
  // una cuenta ya existente que entra como líder recibe el rol de edición solo en la sesión; la cuenta guardada conserva el suyo.
  // Si aún no tiene tribu y la indica, se le guarda.
  if (!created && tribeId && !user.responsibleId) { user.responsibleId = tribeId; void persist("usuario", async (db) => { await db.user.update({ where: { email }, data: { responsibleId: tribeId } }); }); }
  const sessionRole: SessionUser["role"] = entryRole === "lider" && (user.role === "RESPONSABLE" || user.role === "DIRECTIVO") ? "LIDER" : user.role;
  // la sesión queda marcada como entrada por QR: el itinerario que ve es la agenda de participantes
  const session: SessionUser = { email: user.email, name: user.name, role: sessionRole, line: user.line, responsibleId: user.responsibleId, qr: true, company: { slug: rec.slug, name: rec.name, shortName: rec.shortName } };
  const como = entryRole === "lider" ? "líder de tribu" : entryRole === "directivo" ? "directivo" : "miembro de tribu";
  audit(session, "task", user.email, `${created ? "cuenta creada y " : ""}entrada por QR de la convención como ${como}${sessionRole !== user.role ? " (edición en esta sesión)" : ""}`);
  return { ok: true, user: session, section, created };
}


/* ═══ Itinerario de la convención: publicación y comentarios ═══ */

function readItinerary(raw: unknown): Itinerary | undefined {
  const p = parseItinerary(raw); if (!p.ok) return undefined;
  const r = raw as Record<string, unknown>;
  const token = typeof r.token === "string" && ITIN_TOKEN_RE.test(r.token) ? r.token : undefined;
  const tokenP = typeof r.tokenP === "string" && ITIN_TOKEN_RE.test(r.tokenP) ? r.tokenP : undefined;
  return { ...p.itinerary, public: r.public === true && !!token, ...(token ? { token } : {}), ...(tokenP ? { tokenP, publicP: r.publicP === true } : {}) };
}
function saveItinerary(actor: SessionUser, it: Itinerary | undefined, what: string) {
  const rec = companyRec(); if (!rec) return;
  rec.itinerary = it;
  const t = g.tenants.get(rec.slug);
  if (t) t.catalog.company = { ...t.catalog.company, itinerary: it };
  audit(actor, "task", `empresa:${rec.slug}`, what);
  if (hasDb() && rec.dbId) { const dbId = rec.dbId; void persist("itinerario", (db) => db.company.update({ where: { id: dbId }, data: { itinerary: (it ?? null) as never } })); }
}
export const itineraryOf = (): Itinerary | undefined => companyRec()?.itinerary;

/** Carga o reemplaza el itinerario (manage_catalog); conserva publicación y enlace. */
/** El itinerario y sus materiales los administra el equipo organizador: advisor, gerencia y admin con cuenta;
    quien entra por el QR (aunque sea líder de tribu) solo lo ve. */
export const canItinerary = (actor: SessionUser): boolean => can(actor, "manage_catalog") && !actor.qr && !tribeScope(actor);

export function setItinerary(actor: SessionUser, input: unknown): { ok: true; itinerary: Itinerary } | { ok: false; status: number; error: string } {
  if (!canItinerary(actor)) return { ok: false, status: 403, error: "El itinerario lo carga el advisor o la gerencia." };
  const p = parseItinerary(input); if (!p.ok) return { ok: false, status: 422, error: p.error };
  const prev = itineraryOf();
  const it: Itinerary = { ...p.itinerary, public: prev?.public ?? false, ...(prev?.token ? { token: prev.token } : {}), ...(prev?.tokenP ? { tokenP: prev.tokenP, publicP: prev.publicP ?? false } : {}) };
  // sin la clave «files» en la carga, se conservan los materiales ya subidos y los vínculos de cada momento
  const raw = input as { files?: unknown } | null;
  if (prev?.files?.length && (raw === null || typeof raw !== "object" || raw.files === undefined)) {
    it.files = prev.files;
    const known = new Set(prev.files.map((f) => f.id));
    it.items = it.items.map((x) => { const f = prev.items.find((y) => y.id === x.id)?.files?.filter((id) => known.has(id)); return x.files?.length ? x : f?.length ? { ...x, files: f } : x; });
  }
  saveItinerary(actor, it, `itinerario cargado: ${it.items.length} momentos`);
  return { ok: true, itinerary: it };
}

/** Publica o retira el enlace público; `regenerate` cambia el enlace (el anterior deja de valer). */
export function publishItinerary(actor: SessionUser, on: boolean, regenerate = false, audience: "organizador" | "participantes" = "organizador"): { ok: true; itinerary: Itinerary } | { ok: false; status: number; error: string } {
  if (!canItinerary(actor)) return { ok: false, status: 403, error: "El enlace público lo administra el advisor o la gerencia." };
  const prev = itineraryOf(); if (!prev) return { ok: false, status: 404, error: "Esta empresa aún no tiene itinerario." };
  if (audience === "participantes") {
    const tokenP = regenerate || !prev.tokenP ? newToken() : prev.tokenP;
    const it: Itinerary = { ...prev, publicP: on, tokenP };
    saveItinerary(actor, it, `agenda para participantes ${on ? "publicada" : "retirada"}${regenerate ? " (enlace regenerado)" : ""}`);
    return { ok: true, itinerary: it };
  }
  const token = regenerate || !prev.token ? newToken() : prev.token;
  const it: Itinerary = { ...prev, public: on, token };
  saveItinerary(actor, it, `itinerario ${on ? "publicado" : "retirado del acceso público"}${regenerate ? " (enlace regenerado)" : ""}`);
  return { ok: true, itinerary: it };
}
/** Itinerario (versión para participantes) si el token es el de la agenda y está publicada. */
export function participantsItineraryOf(token: string): Itinerary | null {
  const it = itineraryOf();
  return it && it.publicP && it.tokenP && token === it.tokenP ? it : null;
}

/** Itinerario público de la empresa activa si el token es el vigente y está publicado. */
export function publicItineraryOf(token: string): Itinerary | null {
  const it = itineraryOf();
  return it && it.public && it.token && token === it.token ? it : null;
}

export const itineraryComments = (): ItineraryComment[] => [...S().itinComments.values()].sort((a, b) => a.at.localeCompare(b.at));

/** Comentario metodológico o logístico sobre un momento. Desde la sesión firma
    el usuario; desde el enlace público firma quien escribe su nombre. */
export function addItineraryComment(input: { momentId?: unknown; kind?: unknown; text?: unknown; author?: unknown; email?: unknown; consent?: unknown }, by: SessionUser | { public: true }): { ok: true; comment: ItineraryComment } | { ok: false; status: number; error: string } {
  const it = itineraryOf(); if (!it) return { ok: false, status: 404, error: "Esta empresa aún no tiene itinerario." };
  const momentId = str(input.momentId, 24).toLowerCase();
  if (!it.items.some((x) => x.id === momentId)) return { ok: false, status: 422, error: "El momento no existe en el itinerario." };
  if (!isCommentKind(input.kind)) return { ok: false, status: 422, error: "Indica si el comentario es metodológico o logístico." };
  const text = str(input.text, 1200);
  if (text.length < 3) return { ok: false, status: 422, error: "Escribe el comentario." };
  const pub = "public" in by;
  const author = pub ? str(input.author, 80) : by.name;
  if (author.length < 3) return { ok: false, status: 422, error: "Escribe tu nombre." };
  const email = pub ? str(input.email, 160).toLowerCase() : by.email;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, status: 422, error: "El correo no es válido." };
  if (pub && input.consent !== true) return { ok: false, status: 422, error: "Para comentar debes aceptar el tratamiento de tus datos personales." };
  const c: ItineraryComment = { id: `${momentId}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`, momentId, kind: input.kind, author, ...(email ? { email } : {}), text, at: ahora().toISOString(), ...(pub ? { consentAt: ahora().toISOString() } : {}), via: pub ? "publico" : "sesion" };
  S().itinComments.set(c.id, c);
  void persist("comentario del itinerario", (db) => db.itineraryComment.upsert({ where: { id: c.id }, update: { data: c }, create: { id: c.id, companyId: cid(), momentId, data: c } }));
  return { ok: true, comment: c };
}

/** Marca un comentario como atendido (manage_catalog) o lo elimina. */
export function resolveItineraryComment(actor: SessionUser, id: unknown, resolved: boolean): { ok: true; comment: ItineraryComment } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_catalog")) return { ok: false, status: 403, error: "Los comentarios los atiende el advisor o la gerencia." };
  const c = S().itinComments.get(String(id ?? "")); if (!c) return { ok: false, status: 404, error: "El comentario no existe." };
  const next: ItineraryComment = { ...c, ...(resolved ? { resolvedAt: ahora().toISOString(), resolvedBy: actor.name } : { resolvedAt: undefined, resolvedBy: undefined }) };
  if (!resolved) { delete next.resolvedAt; delete next.resolvedBy; }
  S().itinComments.set(c.id, next);
  void persist("comentario del itinerario", (db) => db.itineraryComment.update({ where: { id: c.id }, data: { data: next } }));
  return { ok: true, comment: next };
}
export function deleteItineraryComment(actor: SessionUser, id: unknown): { ok: true } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_catalog")) return { ok: false, status: 403, error: "Los comentarios los elimina el advisor o la gerencia." };
  const key = String(id ?? ""); if (!S().itinComments.has(key)) return { ok: false, status: 404, error: "El comentario no existe." };
  S().itinComments.delete(key);
  void persist("comentario del itinerario", (db) => db.itineraryComment.deleteMany({ where: { id: key, companyId: cid() } }));
  return { ok: true };
}


/* ═══ Recuperación de contraseña ═══ */

/** Emite un enlace de restablecimiento para una cuenta activa (de empresa o de
    plataforma). Devuelve null si el correo no tiene cuenta: la respuesta al
    usuario es la misma en ambos casos. Con empresa indicada, solo su cuenta. */
export async function requestPasswordReset(email: string, tenant: string | null): Promise<{ email: string; name: string; slug: string | null; token: string } | null> {
  if (!hasDb()) return null;
  const found = await findUserForLogin(email);
  if (!found || !found.user.active) return null;
  if (tenant && found.user.role !== "ADMIN" && found.company?.slug !== tenant) return null;
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + RESET_MINUTES * 60_000);
  try {
    const db = await prisma();
    await db.user.update({ where: { email: found.user.email.toLowerCase() }, data: { resetToken: token, resetExpires: expires } });
  } catch (e) { console.error("[4shine] recuperación:", (e as Error).message); return null; }
  return { email: found.user.email, name: found.user.name, slug: found.company?.slug ?? null, token };
}

/** Consume el enlace: fija la contraseña nueva, limpia el token y el bloqueo, y devuelve la sesión. */
export async function resetPassword(token: string, password: unknown): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number; error: string }> {
  if (!hasDb()) return { ok: false, status: 503, error: "Sin base de datos no se puede restablecer la contraseña." };
  if (!passwordOk(password)) return { ok: false, status: 422, error: "La contraseña debe tener al menos 10 caracteres." };
  const db = await prisma();
  const u = await db.user.findUnique({ where: { resetToken: token }, include: { company: true } });
  if (!u || !u.active) return { ok: false, status: 404, error: "El enlace no es válido o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  if (isExpired(u.resetExpires)) { await db.user.update({ where: { id: u.id }, data: { resetToken: null, resetExpires: null } }); return { ok: false, status: 410, error: `El enlace venció (vale ${RESET_MINUTES} minutos). Pide uno nuevo.` }; }
  const bcrypt = await serverImport("bcryptjs") as AnyPrisma;
  const hash = await (bcrypt.default ?? bcrypt).hash(password, 10);
  await db.user.update({ where: { id: u.id }, data: { passwordHash: hash, resetToken: null, resetExpires: null, failedLogins: 0, lockedUntil: null } });
  await hydrateCompanies();
  const company = u.company ? g.companies.get(u.company.slug) ?? null : null;
  const user: SessionUser = { email: u.email, name: u.name, role: u.role as SessionUser["role"], line: u.line ?? undefined, responsibleId: u.responsibleId ?? undefined, company: company ? { slug: company.slug, name: company.name, shortName: company.shortName } : undefined };
  audit(user, "task", u.email, "contraseña restablecida por correo");
  return { ok: true, user };
}


/** Registra un material (PDF ya guardado en el almacenamiento) en el itinerario. */
export function addItineraryFile(actor: SessionUser, file: { id: string; name: string; size: number; group?: string; kind?: ItineraryFile["kind"]; url?: string }): { ok: true; itinerary: Itinerary } | { ok: false; status: number; error: string } {
  if (!canItinerary(actor)) return { ok: false, status: 403, error: "Los materiales los administra el advisor o la gerencia." };
  const prev = itineraryOf(); if (!prev) return { ok: false, status: 404, error: "Esta empresa aún no tiene itinerario." };
  if (!FILE_ID_RE.test(file.id)) return { ok: false, status: 422, error: "Identificador de archivo inválido." };
  const kind = file.kind ?? "pdf";
  if (kind === "link" && !URL_RE.test(String(file.url ?? ""))) return { ok: false, status: 422, error: "El enlace debe empezar por http:// o https://." };
  const entry: ItineraryFile = { id: file.id, name: str(file.name, 160), size: kind === "link" ? 0 : file.size, at: ahora().toISOString(), by: actor.name, ...(file.group ? { group: str(file.group, 40) } : {}), ...(kind !== "pdf" ? { kind } : {}), ...(kind === "link" ? { url: str(file.url, 600) } : {}) };
  const files = [...(prev.files ?? []).filter((f) => f.id !== file.id), entry].sort((a, b) => a.name.localeCompare(b.name));
  const it: Itinerary = { ...prev, files };
  saveItinerary(actor, it, `material del itinerario: ${entry.name}`);
  return { ok: true, itinerary: it };
}
/** Quita un material del itinerario y de los momentos que lo enlazan (el objeto se borra aparte). */
export function removeItineraryFile(actor: SessionUser, id: unknown): { ok: true; itinerary: Itinerary } | { ok: false; status: number; error: string } {
  if (!canItinerary(actor)) return { ok: false, status: 403, error: "Los materiales los administra el advisor o la gerencia." };
  const prev = itineraryOf(); if (!prev) return { ok: false, status: 404, error: "Esta empresa aún no tiene itinerario." };
  const key = String(id ?? "");
  if (!(prev.files ?? []).some((f) => f.id === key)) return { ok: false, status: 404, error: "El material no existe." };
  const it: Itinerary = { ...prev, files: (prev.files ?? []).filter((f) => f.id !== key), items: prev.items.map((x) => {
    if (!x.files?.includes(key)) return x;
    const rest = x.files.filter((f) => f !== key);
    if (rest.length) return { ...x, files: rest };
    const { files: _f, ...sin } = x; void _f; return sin;   // sin vínculos → sin la clave
  }) };
  saveItinerary(actor, it, `material retirado: ${key}`);
  return { ok: true, itinerary: it };
}
/** Vincula materiales a un momento (lista completa de ids). */
export function setMomentFiles(actor: SessionUser, momentId: unknown, fileIds: unknown): { ok: true; itinerary: Itinerary } | { ok: false; status: number; error: string } {
  if (!canItinerary(actor)) return { ok: false, status: 403, error: "Los materiales los administra el advisor o la gerencia." };
  const prev = itineraryOf(); if (!prev) return { ok: false, status: 404, error: "Esta empresa aún no tiene itinerario." };
  const mid = str(momentId, 24).toLowerCase();
  if (!prev.items.some((x) => x.id === mid)) return { ok: false, status: 422, error: "El momento no existe." };
  const known = new Set((prev.files ?? []).map((f) => f.id));
  const ids = Array.isArray(fileIds) ? [...new Set((fileIds as unknown[]).map((f) => String(f)).filter((f) => known.has(f)))] : [];
  const it: Itinerary = { ...prev, items: prev.items.map((x) => (x.id === mid ? (ids.length ? { ...x, files: ids } : (({ files: _f, ...rest }) => { void _f; return rest; })(x)) : x)) };
  saveItinerary(actor, it, `materiales del momento ${mid}: ${ids.length}`);
  return { ok: true, itinerary: it };
}
/** Material del itinerario de la empresa activa, con el token público si aplica. */
export function itineraryFileOf(id: string, token?: string): ItineraryFile | null {
  const it = token !== undefined ? publicItineraryOf(token) : itineraryOf();
  return it?.files?.find((f) => f.id === id) ?? null;
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
  return can(user, "manage_catalog") ? null : fail(403, cat().company.mode === "acompanamiento" ? "La estrategia la definen el comité directivo, el advisor y el líder de la empresa." : "El catálogo lo editan el advisor y el líder de la empresa (o el admin de la plataforma).");
}

/** Ámbito de tribu en la convención: el líder de tribu (LIDER con tribu asignada, p. ej. por el QR) solo toca su OKR,
    sus KR, sus iniciativas y la calificación de su tribu; gerencia (LIDER sin tribu), advisor y admin ven todo. */
function tribeScope(user: SessionUser): string | null {
  return cat().company.mode === "convencion" && user.role === "LIDER" && user.responsibleId ? user.responsibleId : null;
}
const tribeOfObjective = (c: ReturnType<typeof cat>, objectiveId: string | undefined): string | undefined => {
  const o = c.objectives.find((x) => x.id === objectiveId);
  return (c.company.levers ?? []).find((l) => l.id === o?.lever)?.ownerId;
};
const OTRA_TRIBU = "Solo puedes editar el OKR, los resultados clave y las iniciativas de tu tribu.";

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
    ...users().filter((u) => u.responsibleId === id).map((u) => `cuenta ${u.email}`),
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
  const lever = str(input.lever, 12).toUpperCase() || undefined;
  if (lever && !(c.company.levers ?? []).some((l) => l.id === lever)) return fail(422, "La palanca no existe en esta empresa.");
  const horizon = str(input.horizon, 12).toUpperCase() || undefined;
  if (horizon && !horizonesTodos(c.company).some((h) => h.id === horizon)) return fail(422, "El horizonte no es de esta empresa.");   // un objetivo puede ir a la línea base (consulta)
  const pillar = str(input.pillar, 80) || undefined, desc = str(input.desc, 600) || undefined, indicator = str(input.indicator, 200) || undefined;
  // objetivo de la tribu (laboratorio de OKR): lleva la marca okr y, si lo indica, el objetivo directivo que concreta
  const okr = input.okr === true;
  // en la convención los objetivos directivos (Dirección 3x3) son fuente de consulta: el líder de tribu solo escribe los OKR de su tribu
  if (c.company.mode === "convencion" && user.role === "LIDER" && !okr) return fail(403, "Durante la convención los objetivos de Dirección 3x3 no se modifican: son la fuente de consulta de las tribus. Escribe los OKR de tu tribu en la sección OKR.");
  const scope = tribeScope(user);
  if (scope) {
    const prevTribe = tribeOfObjective(c, str(input.id, 10));
    const tribe = (c.company.levers ?? []).find((l) => l.id === lever)?.ownerId;
    if ((str(input.id, 10) && prevTribe !== scope) || tribe !== scope) return fail(403, OTRA_TRIBU);
  }
  const parent = str(input.parent, 10).toUpperCase() || undefined;
  if (parent && !c.objectives.some((x) => x.id === parent && !x.okr)) return fail(422, "El objetivo directivo que concreta no existe.");
  // descartado: queda en el registro con su motivo; las fases siguientes lo ignoran
  const descartado = input.descartado === true;
  const motivoDescarte = descartado ? (str(input.motivoDescarte, 300) || undefined) : undefined;
  const id = str(input.id, 10) || (okr ? nextCode(`${lever ?? "OK"}-O`, c.objectives.map((o) => o.id), 1) : nextCode("OE-", c.objectives.map((o) => o.id), 2));
  const o: CmiObjective = {
    id, perspective, name, kpis, ...(line ? { line } : {}),
    ...(lever ? { lever } : {}), ...(horizon ? { horizon } : {}), ...(pillar ? { pillar } : {}), ...(desc ? { desc } : {}), ...(indicator ? { indicator } : {}),
    ...(okr ? { okr: true } : {}), ...(parent ? { parent } : {}), ...(descartado ? { descartado: true } : {}), ...(motivoDescarte ? { motivoDescarte } : {}),
  };
  const idx = c.objectives.findIndex((x) => x.id === id);
  const antesDescartado = idx >= 0 && !!c.objectives[idx].descartado;
  if (idx >= 0) c.objectives[idx] = o; else c.objectives.push(o);
  audit(user, "task", `cat:${id}`, `objetivo ${idx < 0 ? "creado" : descartado && !antesDescartado ? `descartado${motivoDescarte ? ` (${motivoDescarte})` : ""}` : !descartado && antesDescartado ? "reactivado (ya no está descartado)" : "actualizado"}`);
  const generated = !str(input.id, 10);
  void persist("catálogo", (db) => idx >= 0 || !generated ? writeObjective(db, cid(), o) : createRekeying(db, "objetivo", () => o.id,
    (fresh) => { const old = o.id; o.id = fresh; for (const k of c.kpis) if (k.cmi === old) k.cmi = fresh; },
    async () => (await db.cmiObjective.findMany({ where: { companyId: cid() }, select: { id: true } })).map((x: { id: string }) => x.id),
    (used) => okr ? nextCode(`${lever ?? "OK"}-O`, used, 1) : nextCode("OE-", used, 2),
    () => writeObjective(db, cid(), o, "create")));
  return { ok: true, id };
}

export function removeObjective(user: SessionUser, id: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const prevObj = c.objectives.find((o) => o.id === id);
  if (!prevObj) return fail(404, "El objetivo no existe.");
  if (c.company.mode === "convencion" && user.role === "LIDER" && !prevObj.okr) return fail(403, "Durante la convención los objetivos de Dirección 3x3 no se modifican: son la fuente de consulta de las tribus.");
  if (tribeScope(user) && tribeOfObjective(c, id) !== tribeScope(user)) return fail(403, OTRA_TRIBU);
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
  // acompañamiento: un objetivo sin prioridad (o descartado) no pasa a resultados clave; los resultados de la línea base se cargan igual
  if (cmi && c.company.mode === "acompanamiento") {
    const o = c.objectives.find((x) => x.id === cmi)!;
    const previo = c.kpis.find((x) => x.code === code);
    const esBase = horizonesTodos(c.company).some((h) => h.id === o.horizon && (h as { baseline?: boolean }).baseline);
    if (!esBase && (!previo || previo.cmi !== cmi)) {
      if (o.descartado) return fail(422, `El objetivo ${o.id} está descartado: no admite resultados clave. Reactívalo en Objetivos directivos si vuelve a estar vigente.`);
      if (!objetivoConPrioridad(c, o)) return fail(422, `El objetivo ${o.id} no está vinculado a una prioridad estratégica: vincúlalo en Objetivos directivos antes de definir sus resultados clave.`);
    }
  }
  if (tribeScope(user)) {
    const prevKpi = c.kpis.find((x) => x.code === code);
    if (tribeOfObjective(c, cmi) !== tribeScope(user) || (prevKpi && tribeOfObjective(c, prevKpi.cmi) !== tribeScope(user))) return fail(403, OTRA_TRIBU);
  }
  const ownerId = str(input.ownerId, 10);
  if (ownerId && !c.responsibles.some((r) => r.id === ownerId)) return fail(422, "El responsable del dato no existe en el catálogo.");
  const frequency = (["Mensual", "Trimestral", "Semestral", "Anual"] as const).find((f) => f === input.frequency) ?? "Trimestral";
  const goodDirection = input.goodDirection === "down" ? "down" : input.goodDirection === "keep" ? "keep" : "up";
  const series = (Array.isArray(input.series) ? input.series : [])
    .map((v) => ({ period: str(v?.period, 12), value: num(v?.value, NaN), ...(str(v?.note, 200) ? { note: str(v?.note, 200) } : {}) }))
    .filter((v) => v.period && Number.isFinite(v.value));
  const badPeriod = series.find((v) => !isValidPeriod(v.period));
  if (badPeriod) return fail(422, `Periodo inválido en la serie: ${badPeriod.period} (usa AAAA-Tn, AAAA-Sn o AAAA).`);
  series.sort((x, y) => periodIndex(x.period) - periodIndex(y.period));
  const due = str(input.due, 10).toUpperCase() || undefined;
  if (due && !/^\d{4}(-T[1-4])?$/.test(due)) return fail(422, "El plazo del resultado clave es un año (2027) o un trimestre (2027-T4).");
  const k: KpiFull = {
    code, line, cmi, name, definition: str(input.definition, 600), formula: str(input.formula, 300), unit, frequency,
    source: str(input.source, 160), ownerId, baseline: num(input.baseline), target: num(input.target), goodDirection, series,
    ...(due ? { due } : {}),
  };
  const idx = c.kpis.findIndex((x) => x.code === code);
  if (idx >= 0) c.kpis[idx] = k; else c.kpis.push(k);
  audit(user, "task", `cat:${code}`, `KPI ${idx >= 0 ? "actualizado" : "creado"} (${name})`);
  void persist("catálogo", (db) => idx >= 0 ? writeKpi(db, cid(), k) : createRekeying(db, "KPI", () => k.code,
    (fresh) => { const old = k.code; k.code = fresh; for (const i of c.initiatives) { if (i.kpi === old) i.kpi = fresh; if (i.krExtra?.includes(old)) i.krExtra = i.krExtra.map((x) => (x === old ? fresh : x)); } },
    async () => (await db.kpi.findMany({ where: { companyId: cid() }, select: { code: true } })).map((x: { code: string }) => x.code),
    (used) => { const m = /^(.*?)(\d+)$/.exec(k.code); return m ? nextCode(m[1], used, m[2].length) : nextCode(`${k.code}-`, used, 1); },
    () => writeKpi(db, cid(), k, "create")));
  return { ok: true, code };
}

export function removeKpi(user: SessionUser, code: string): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (!c.kpis.some((k) => k.code === code)) return fail(404, "El KPI no existe.");
  if (tribeScope(user) && tribeOfObjective(c, c.kpis.find((k) => k.code === code)?.cmi) !== tribeScope(user)) return fail(403, OTRA_TRIBU);
  // un resultado clave pertenece a su objetivo: al eliminarlo se desvincula de él; lo que sí bloquea es una iniciativa que lo mueve (primero se desvincula)
  const refs = c.initiatives.filter((i) => mueveKr(i, code)).map((i) => `${i.id} ${i.name}`);
  if (refs.length) return fail(422, `No se puede eliminar: lo mueven ${refs.length === 1 ? "la iniciativa" : "las iniciativas"} ${refs.slice(0, 3).join("; ")}${refs.length > 3 ? "…" : ""}. Desvincúlalas o elimínalas primero.`);
  const objs = c.objectives.filter((o) => o.kpis.includes(code));
  for (const o of objs) o.kpis = o.kpis.filter((k) => k !== code);
  c.kpis = c.kpis.filter((k) => k.code !== code);
  kpiReports().delete(code);
  audit(user, "task", `cat:${code}`, `KPI eliminado${objs.length ? ` (desvinculado de ${objs.map((o) => o.id).join(", ")})` : ""}`);
  void persist("catálogo", async (db) => { await dbDeleteKpi(db, cid(), code); for (const o of objs) await writeObjective(db, cid(), o); });
  return { ok: true };
}

/** Vacía los OKR de la empresa: borra todos los KPI, desvincula los objetivos y las iniciativas y olvida los reportes.
    Para que cada tribu cree sus resultados clave desde cero en el laboratorio (con la biblioteca de plantillas). */
export function clearOkr(user: SessionUser): CatResult & { removed?: number; unlinked?: number } {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  const removed = c.kpis.length;
  const touchedObjectives = c.objectives.filter((o) => o.kpis.length);
  const touchedInitiatives = c.initiatives.filter((i) => i.kpi);
  for (const o of touchedObjectives) o.kpis = [];
  for (const i of touchedInitiatives) { i.kpi = ""; delete i.krExtra; }
  const codes = c.kpis.map((k) => k.code);
  c.kpis = [];
  kpiReports().clear();
  audit(user, "task", "cat:okr", `OKR vaciados: ${removed} KPI borrados, ${touchedInitiatives.length} iniciativas desvinculadas`);
  void persist("catálogo", async (db) => {
    const id = cid();
    for (const o of touchedObjectives) await writeObjective(db, id, o);
    for (const i of touchedInitiatives) await writeInitiative(db, id, i);
    for (const code of codes) await dbDeleteKpi(db, id, code);
  });
  return { ok: true, removed, unlinked: touchedInitiatives.length };
}

/** Iniciativas: quien administra el catálogo edita todas; quien solo puede crearlas
    (líder de tribu, directivo por QR) edita y elimina únicamente las suyas. */
function canInitiative(user: SessionUser, prev: InitiativeFull | undefined): CatResult | null {
  if (tribeScope(user) && prev && prev.ownerId !== tribeScope(user)) return fail(403, OTRA_TRIBU);
  if (can(user, "manage_catalog")) return null;
  if (!can(user, "create_initiatives")) return fail(403, "Las iniciativas las crean el advisor, el líder de tribu y los directivos.");
  if (prev && (prev.createdBy ?? "").toLowerCase() !== user.email.toLowerCase()) return fail(403, "Solo puedes editar o eliminar las iniciativas que creaste.");
  return null;
}

export function upsertInitiative(user: SessionUser, input: Partial<InitiativeFull>): CatResult & { id?: string } {
  const c = cat();
  const denied = canInitiative(user, c.initiatives.find((i) => i.id === str(input.id, 10))); if (denied) return denied;
  const name = str(input.name, 200);
  if (name.length < 5) return fail(422, "El nombre de la iniciativa debe tener al menos 5 caracteres.");
  const dim = DIMS.find((d) => d.code === str(input.capability, 10));
  if (!dim) return fail(422, "La dimensión que instala (DIR-1 … MUL-5) es obligatoria.");
  let cmi = str(input.cmi, 10);
  const previaIni = c.initiatives.find((i) => i.id === str(input.id, 10));
  // categoría: proyecto especial o iniciativa disruptiva. Si la petición no la trae (formularios que no la editan), se conserva
  const categoria = input.categoria === undefined ? previaIni?.categoria : iniCategoria(input.categoria);
  if (!c.objectives.some((o) => o.id === cmi)) {
    // sin resultado clave la iniciativa puede quedarse momentáneamente sin objetivo: conserva el que tenía o queda sin él
    // (acompañamiento); con resultado clave, el objetivo es el del KR
    const kr = c.kpis.find((k) => k.code === str(input.kpi, 20).toUpperCase());
    const deKr = kr ? c.objectives.find((o) => o.id === kr.cmi || o.kpis.includes(kr.code))?.id : undefined;
    const anterior = previaIni && c.objectives.some((o) => o.id === previaIni.cmi) ? previaIni.cmi : undefined;
    if (deKr) cmi = deKr;
    else if (!str(input.kpi, 20) && anterior) cmi = anterior;
    else if (!str(input.kpi, 20) && (isAcompanamiento(c.company) || categoria)) cmi = "";   // un proyecto especial o una iniciativa disruptiva se mapea aunque aún no tenga objetivo ni resultado clave
    else return fail(422, "El objetivo del cuadro de mando es obligatorio y debe existir. Si es un proyecto especial o una iniciativa disruptiva, elige esa categoría: se mapea sin objetivo ni resultado clave.");
  }
  const ownerId = str(input.ownerId, 10);
  if (ownerId && !c.responsibles.some((r) => r.id === ownerId)) return fail(422, "El responsable no existe en el catálogo.");
  if (tribeScope(user) && ownerId !== tribeScope(user)) return fail(403, "Solo registras iniciativas de tu tribu: elige tu tribu como dueña.");
  const kpi = str(input.kpi, 20).toUpperCase();
  if (kpi && !c.kpis.some((k) => k.code === kpi)) return fail(422, "El KPI asociado no existe.");
  // una iniciativa mueve de 1 a 3 resultados clave: el principal (kpi) y hasta dos más. Si la petición no trae la lista
  // de adicionales (formularios que solo editan el principal), se conservan los que ya tenía.
  const previa = c.initiatives.find((i) => i.id === str(input.id, 10));
  const extraIn = Array.isArray(input.krExtra) ? input.krExtra.map((x) => str(x, 20).toUpperCase()).filter(Boolean) : (previa?.krExtra ?? []);
  const krExtra = [...new Set(extraIn)].filter((x) => x !== kpi);
  if (krExtra.length && !kpi) return fail(422, "Elige primero el resultado clave principal; los adicionales se suman a él.");
  if (1 + krExtra.length > INI_KR_MAX && kpi) return fail(422, `Una iniciativa mueve como máximo ${INI_KR_MAX} resultados clave.`);
  const sinExistir = krExtra.find((x) => !c.kpis.some((k) => k.code === x));
  if (sinExistir) return fail(422, `El resultado clave ${sinExistir} no existe.`);
  // convención: una iniciativa solo se vincula a un resultado clave completo (nombre con cifra, base, meta, dueño, plazo y definición)
  if (isGuiada(c.company)) for (const code of [kpi, ...krExtra].filter(Boolean)) {
    const yaLoMovia = !!previa && mueveKr(previa, code);
    const faltan = krFaltantes(c.kpis.find((k) => k.code === code)!);
    if (faltan.length && !(yaLoMovia && code !== kpi)) return fail(422, `El resultado clave ${code} está incompleto (sin ${faltan.join(", ")}): complétalo en OKR antes de vincularle iniciativas.`);
    // y recibe como máximo dos iniciativas (cuenta las que lo mueven como principal o como adicional)
    const otras = c.initiatives.filter((i) => mueveKr(i, code) && i.id !== str(input.id, 10)).length;
    if (otras >= KR_INI_MAX) return fail(422, `El resultado clave ${code} ya tiene ${otras} iniciativas (máximo ${KR_INI_MAX} por KR): desvincula una o elige otro resultado clave.`);
  }
  // el líder de tribu vincula únicamente a los resultados clave del OKR de su tribu-palanca
  for (const code of [kpi, ...krExtra].filter(Boolean)) if (tribeScope(user) && tribeOfObjective(c, c.kpis.find((k) => k.code === code)?.cmi) !== tribeScope(user)) return fail(403, "Vincula la iniciativa a un resultado clave del OKR de tu tribu.");
  const start = str(input.start, 8), end = str(input.end, 8);
  if ((start && !QUARTER.test(start)) || (end && !QUARTER.test(end))) return fail(422, "Inicio y fin van en trimestres (AAAA-Tn).");
  if (start && end && periodIndex(start) > periodIndex(end)) return fail(422, "El fin no puede ser anterior al inicio.");
  const SUB: InitiativeFull["subsistema"][] = ["Dirección", "Comercial", "Operación", "Administración", "Talento"];
  const STATUS: InitiativeFull["status"][] = ["PLANEADA", "EN_CURSO", "EN_RIESGO", "COMPLETADA"];
  const ACT: ("HECHA" | "EN_CURSO" | "PENDIENTE")[] = ["HECHA", "EN_CURSO", "PENDIENTE"];
  const FS = ["VERDE", "AMBAR", "ROJO"] as const;
  const id = str(input.id, 10) || (() => { let n = 1; while (c.initiatives.some((i) => i.id === `i${n}`)) n++; return `i${n}`; })();
  const prev = c.initiatives.find((i) => i.id === id);
  // moneda del presupuesto: la que llega; si el formulario no la envía, se conserva la que tenía
  const moneda = esMoneda(input.budgetCurrency) ? input.budgetCurrency : prev?.budgetCurrency;
  const i: InitiativeFull = {
    id, line: dim.line, subsistema: SUB.find((x) => x === input.subsistema) ?? "Dirección", cmi, name,
    objetivo: str(input.objetivo, 600), horizon: horizonsOf(c.company).some((h) => h.id === input.horizon) ? String(input.horizon) : horizonsOf(c.company)[0].id,
    impact: int(input.impact, 1, 5, 3), feasibility: int(input.feasibility, 1, 5, 3), urgency: int(input.urgency, 1, 5, 3), dependency: int(input.dependency, 1, 5, 3),
    status: STATUS.find((x) => x === input.status) ?? "PLANEADA", start, end, ownerId, metaResultado: str(input.metaResultado, 400),
    budgetPlanned: num(input.budgetPlanned), budgetCommitted: num(input.budgetCommitted), budgetExecuted: num(input.budgetExecuted), ...(moneda ? { budgetCurrency: moneda } : {}),
    progress: int(input.progress, 0, 100, 0), capability: dim.code, framework: frameworkOfPractice(dim.prac[0].code)?.id ?? "", kpi, ...(krExtra.length ? { krExtra } : {}), ...(categoria ? { categoria } : {}), createdBy: prev?.createdBy ?? user.email, observaciones: str(input.observaciones, 1500) || undefined,
    actions: (Array.isArray(input.actions) ? input.actions : []).map((a) => ({ name: str(a?.name, 200), meta: str(a?.meta, 200), status: ACT.find((x) => x === a?.status) ?? "PENDIENTE", quarter: str(a?.quarter, 8) })).filter((a) => a.name),
    log: Array.isArray(input.log) ? input.log.filter((l) => l && typeof l.text === "string") : (prev?.log ?? []),
    nextMilestone: { date: str(input.nextMilestone?.date, 12), text: str(input.nextMilestone?.text, 200) },
    factors: (Array.isArray(input.factors) ? input.factors : []).map((f) => ({ name: str(f?.name, 160), state: FS.find((x) => x === f?.state) ?? "VERDE", history: Array.isArray(f?.history) ? f.history.filter((h) => typeof h === "string") : [], ...(str(f?.note, 200) ? { note: str(f?.note, 200) } : {}) })).filter((f) => f.name),
  };
  const idx = c.initiatives.findIndex((x) => x.id === id);
  if (idx >= 0) c.initiatives[idx] = i; else c.initiatives.push(i);
  iniOverrides().delete(id);
  audit(user, "task", `cat:${id}`, `iniciativa ${idx >= 0 ? "actualizada" : "creada"} (${name})${categoria ? ` · ${categoriaLabel(categoria)!.toLowerCase()}` : ""}`);
  void persist("catálogo", async (db) => {
    if (idx >= 0 || str(input.id, 10)) await writeInitiative(db, cid(), i);
    else await createRekeying(db, "iniciativa", () => i.id, (fresh) => { i.id = fresh; },
      async () => (await db.initiative.findMany({ where: { companyId: cid() }, select: { code: true } })).map((x: { code: string }) => x.code),
      (used) => { let n = 1; while (used.includes(`i${n}`)) n++; return `i${n}`; },
      () => writeInitiative(db, cid(), i, "create"));
    await db.initiativeOverride.deleteMany({ where: { companyId: cid(), code: i.id } });
  });
  return { ok: true, id };
}

export function removeInitiative(user: SessionUser, id: string): CatResult {
  const c = cat();
  const prev = c.initiatives.find((i) => i.id === id);
  if (!prev) return fail(404, "La iniciativa no existe.");
  const denied = canInitiative(user, prev); if (denied) return denied;
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

/** Vacía el catálogo de la empresa activa (solo admin de plataforma): deja la
    empresa como recién creada vacía, conservando usuarios, diagnóstico y branding. */
export async function clearCompanyCatalog(user: SessionUser): Promise<CatResult> {
  if (!can(user, "manage_companies")) return fail(403, "Solo el administrador de la plataforma vacía el catálogo de una empresa.");
  const st = S();
  const c = st.catalog;
  c.responsibles = []; c.people = []; c.objectives = []; c.kpis = []; c.initiatives = []; c.tasks = [];
  st.tasks = []; st.archived = []; st.comments = []; st.uploads = []; st.baselines = new Map();
  st.kpiReports = new Map(); st.iniOverrides = new Map(); st.evals = new Map(); st.decisions = new Map();
  audit(user, "task", "cat:vaciar", "catálogo vaciado");
  if (hasDb()) {
    try { await dbClearCatalog(await prisma(), cid()); } catch (e) { return fail(500, `No se pudo vaciar en la base: ${(e as Error).message}`); }
  }
  return { ok: true };
}

export function setFinancials(user: SessionUser, input: Partial<Financials> | null): CatResult {
  const denied = canCatalog(user); if (denied) return denied;
  const c = cat();
  if (input === null) { c.financials = null; }
  else {
    const f: Financials = {
      year: int(input.year, 2000, 2100, ahora().getFullYear()), revenue: num(input.revenue), revenuePrev: num(input.revenuePrev),
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
  responsibleId?: string;      // ámbito por responsable del catálogo (tribu, área)
  active: boolean;
  seeded: boolean;             // vino del seed (no se elimina, solo se desactiva)
  membresia?: boolean;         // pertenece a esta empresa por membresía: su cuenta (y contraseña) viven en su empresa principal
  principal?: string;          // slug de la empresa principal (solo en membresías)
  createdBy?: string;
  at?: string;
  consentAt?: string;          // aceptación del tratamiento de datos personales
};


/** Usuarios de la empresa activa (los admins de plataforma viven aparte). */
const users = () => S().users;

export const getUsers = (): ManagedUser[] => users();

export const findActiveUser = (email: string): ManagedUser | null =>
  users().find((u) => u.active && u.email.toLowerCase() === email.toLowerCase()) ?? null;

const VALID_ROLES: SessionUser["role"][] = ["CONSULTOR", "LIDER", "RESPONSABLE", "DIRECTIVO"];   // los roles de empresa; ADMIN es de plataforma

/** Ámbito de un RESPONSABLE: capacidad 4.1–4.4, responsable del catálogo, o ambos; al menos uno. */
function resolveScope(line: unknown, responsibleId: unknown):
  { ok: true; line?: number; responsibleId?: string } | { ok: false; error: string } {
  const l = line === undefined || line === null || line === "" ? undefined : Number(line);
  if (l !== undefined && ![1, 2, 3, 4].includes(l)) return { ok: false, error: "Capacidad inválida (4.1–4.4)." };
  const r = typeof responsibleId === "string" && responsibleId.trim() ? responsibleId.trim() : undefined;
  if (r && !cat().responsibles.some((x) => x.id === r)) return { ok: false, error: "El responsable del ámbito no existe en el catálogo de la empresa." };
  if (l === undefined && !r) return { ok: false, error: "El responsable exige un ámbito: una capacidad (4.1–4.4), un responsable del catálogo (tribu, área) o ambos." };
  return { ok: true, line: l, responsibleId: r };
}

export function createUser(
  actor: SessionUser,
  input: { email: string; name: string; role: SessionUser["role"]; line?: number; responsibleId?: string | null },
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
  const scope = input.role === "RESPONSABLE" ? resolveScope(input.line, input.responsibleId) : { ok: true as const, line: undefined, responsibleId: undefined };
  if (!scope.ok) return { ok: false, status: 422, error: scope.error };
  const user: ManagedUser = {
    email, name: input.name.trim(), role: input.role,
    line: scope.line, responsibleId: scope.responsibleId,
    active: true, seeded: false,
    createdBy: actor.name, at: ahora().toISOString(),
  };
  users().push(user);
  void persist("usuario", async (db) => {
    const companyId = cid();
    await db.user.upsert({ where: { email }, update: { name: user.name, role: user.role, line: user.line ?? null, responsibleId: user.responsibleId ?? null, active: true, companyId }, create: { email, name: user.name, role: user.role, line: user.line ?? null, responsibleId: user.responsibleId ?? null, passwordHash: "", companyId } });
  });
  audit(actor, "task", email, `usuario creado (${input.role}${user.role === "RESPONSABLE" ? ` · ${scopeName(user)}` : ""})`);
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

/* ═══ Códigos de acceso a los diagnósticos ═══ */
// El admin o el advisor genera un código para una persona que aún no tiene espacio. Al usarlo, la persona registra su
// organización y la plataforma le crea un espacio limitado a los diagnósticos del código, con ella como directivo.
// Los códigos son de la plataforma, no de una empresa: viven en su propia tabla (o en memoria si no hay base).

type CodFail = { ok: false; status: number; error: string };
const codMem = new Map<string, CodigoAcceso>();   // sin base de datos (pruebas)
const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : undefined);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const codDe = (r: any): CodigoAcceso => ({ id: r.id, code: r.code, name: r.name, email: r.email, ...(r.organization ? { organization: r.organization } : {}), scope: alcanceDe(r.scope), createdBy: r.createdBy, createdByName: r.createdByName,
  createdByRole: r.createdByRole === "ADMIN" ? "ADMIN" : "CONSULTOR", createdAt: iso(r.createdAt)!, expiresAt: iso(r.expiresAt)!, ...(r.sentAt ? { sentAt: iso(r.sentAt) } : {}), ...(r.usedAt ? { usedAt: iso(r.usedAt) } : {}), ...(r.companySlug ? { companySlug: r.companySlug } : {}), ...(r.revokedAt ? { revokedAt: iso(r.revokedAt) } : {}) });
async function codBuscar(code: string): Promise<CodigoAcceso | null> {
  if (!hasDb()) return codMem.get(code) ?? null;
  const r = await (await prisma()).accessCode.findUnique({ where: { code } });
  return r ? codDe(r) : null;
}
async function codGuardar(c: CodigoAcceso, nuevo = false): Promise<void> {
  if (!hasDb()) { codMem.set(c.code, c); return; }
  const data = { name: c.name, email: c.email, organization: c.organization ?? null, scope: c.scope.join(","), createdBy: c.createdBy, createdByName: c.createdByName, createdByRole: c.createdByRole, expiresAt: new Date(c.expiresAt),
    sentAt: c.sentAt ? new Date(c.sentAt) : null, usedAt: c.usedAt ? new Date(c.usedAt) : null, companySlug: c.companySlug ?? null, revokedAt: c.revokedAt ? new Date(c.revokedAt) : null };
  const db = await prisma();
  if (nuevo) await db.accessCode.create({ data: { id: c.id, code: c.code, createdAt: new Date(c.createdAt), ...data } }); else await db.accessCode.update({ where: { code: c.code }, data });
}
const puedeCodigos = (u: SessionUser) => u.role === "ADMIN" || u.role === "CONSULTOR";

/** Genera un código para una persona. El correo no puede tener ya una cuenta: el código crea una nueva. */
export async function crearCodigo(actor: SessionUser, input: { name?: unknown; email?: unknown; organization?: unknown; scope?: unknown }): Promise<{ ok: true; codigo: CodigoAcceso } | CodFail> {
  if (!puedeCodigos(actor)) return { ok: false, status: 403, error: "Los códigos de acceso los genera el administrador o el advisor." };
  const mal = validarCodigoNuevo(input); if (mal) return { ok: false, status: 422, error: mal };
  const email = String(input.email).trim().toLowerCase(), name = String(input.name).trim().replace(/\s+/g, " ");
  const ya = await findUserForLogin(email);
  if (ya) return { ok: false, status: 409, error: ya.company ? `Ese correo ya tiene una cuenta en ${ya.company.name}: no necesita código, entra por el acceso de su empresa.` : "Ese correo es de un administrador de la plataforma." };
  let code = "";
  for (let i = 0; i < 6 && (!code || (await codBuscar(code))); i++) code = Array.from({ length: CODIGO_LARGO }, () => CODIGO_ALFABETO[randomInt(0, CODIGO_ALFABETO.length)]).join("");
  const now = new Date();
  const organization = String(input.organization ?? "").trim().slice(0, 120);
  const codigo: CodigoAcceso = { id: `cod_${randomBytes(9).toString("hex")}`, code, name, email, ...(organization ? { organization } : {}), scope: alcanceDe(input.scope), createdBy: actor.email, createdByName: actor.name,
    createdByRole: actor.role === "ADMIN" ? "ADMIN" : "CONSULTOR", createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + CODIGO_DIAS * 86_400_000).toISOString() };
  // un código anterior de la misma persona que siga abierto deja de valer: solo cuenta el último
  for (const viejo of await listarCodigosDe(email)) if (!viejo.usedAt && !viejo.revokedAt) await codGuardar({ ...viejo, revokedAt: now.toISOString() });
  await codGuardar(codigo, true);
  return { ok: true, codigo };
}
async function listarCodigosDe(email: string): Promise<CodigoAcceso[]> {
  if (!hasDb()) return [...codMem.values()].filter((c) => c.email === email);
  return ((await (await prisma()).accessCode.findMany({ where: { email } })) as unknown[]).map(codDe);
}
/** Códigos generados: el admin ve todos; el advisor, los suyos. Del más reciente al más antiguo. */
export async function listarCodigos(actor: SessionUser): Promise<CodigoAcceso[]> {
  if (!puedeCodigos(actor)) return [];
  const todos: CodigoAcceso[] = hasDb() ? (await (await prisma()).accessCode.findMany({ orderBy: { createdAt: "desc" }, take: 300 })).map(codDe) : [...codMem.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return actor.role === "ADMIN" ? todos : todos.filter((c) => c.createdBy.toLowerCase() === actor.email.toLowerCase());
}
/** Código por identificador, si quien pregunta puede administrarlo. */
export async function codigoDe(actor: SessionUser, id: string): Promise<CodigoAcceso | null> { return (await listarCodigos(actor)).find((c) => c.id === id) ?? null; }
/** Deja constancia de que el código se envió por correo. */
export async function marcarCodigoEnviado(c: CodigoAcceso): Promise<CodigoAcceso> { const n = { ...c, sentAt: new Date().toISOString() }; await codGuardar(n); return n; }
/** Anula un código que no se ha usado: deja de servir. */
export async function anularCodigoAcceso(actor: SessionUser, id: string): Promise<{ ok: true; codigo: CodigoAcceso } | CodFail> {
  const c = await codigoDe(actor, id);
  if (!c) return { ok: false, status: 404, error: "Ese código no existe o lo generó otra persona." };
  if (c.usedAt) return { ok: false, status: 422, error: "El código ya se usó: la persona ya tiene su espacio. Para retirar su acceso, desactiva su cuenta." };
  const n = { ...c, revokedAt: c.revokedAt ?? new Date().toISOString() }; await codGuardar(n);
  return { ok: true, codigo: n };
}

const CODIGO_INVALIDO = "El código no es válido. Revisa que esté completo, tal como llegó a tu correo.";
/** Lo que la página necesita saber de un código antes de usarlo (sin datos de otras personas). */
export async function consultarCodigo(raw: unknown): Promise<{ ok: true; codigo: CodigoAcceso; estado: "nuevo" | "usado" } | CodFail> {
  const code = normalizarCodigo(raw);
  const c = code ? await codBuscar(code) : null;
  if (!c) return { ok: false, status: 404, error: CODIGO_INVALIDO };
  const e = estadoCodigo(c);
  if (e === "anulado") return { ok: false, status: 410, error: "Este código fue anulado. Pide uno nuevo a quien te lo envió." };
  if (e === "vencido") return { ok: false, status: 410, error: "Este código venció. Pide uno nuevo a quien te lo envió." };
  return { ok: true, codigo: c, estado: e === "usado" ? "usado" : "nuevo" };
}

const modulosDe = (scope: AlcanceCodigo[]) => { const on = new Set<string>([...(scope.includes("madurez") ? ["madurez"] : []), ...(scope.includes("test") ? ["diagnostico"] : [])]); return TODOS_LOS_MODULOS.filter((m) => !on.has(m)); };
/** A dónde entra quien usa el código: a la portada de su espacio, que presenta sus diagnósticos. */
export const destinoCodigo = (slug: string) => `/${slug}/panel`;   // la portada del espacio presenta sus diagnósticos

/** Usa un código nuevo: crea el espacio de la organización, limitado a los diagnósticos del código, y la cuenta de la
    persona como directivo. Quien generó el código queda como advisor del espacio si es consultor. Devuelve la sesión. */
export async function canjearCodigo(raw: unknown, datos: Record<string, unknown>): Promise<{ ok: true; user: SessionUser; slug: string; next: string } | CodFail> {
  const q = await consultarCodigo(raw);
  if (!q.ok) return q;
  if (q.estado === "usado") return { ok: false, status: 409, error: "Este código ya se usó para registrar una organización." };
  const c = q.codigo, v = validarOrganizacion(datos);
  if (!v.ok) return { ok: false, status: 422, error: v.error };
  await hydrateCompanies();
  if (await findUserForLogin(c.email)) return { ok: false, status: 409, error: "Ese correo ya tiene una cuenta en la plataforma: entra por el acceso de tu empresa." };
  const sistema: SessionUser = { email: c.createdBy, name: c.createdByName, role: "ADMIN" };
  const base = slugify(v.org.organizacion) || "organizacion";
  let slug = base; for (let i = 2; g.companies.has(slug) || RESERVED.has(slug) || slug.length < 2; i++) slug = `${base.slice(0, 36)}-${i}`;
  const creada = await createCompany(sistema, { name: v.org.organizacion, slug, sector: v.org.sector, city: v.org.ciudad, country: v.org.pais, currency: v.org.pais === "EC" ? "USD" : "COP", size: v.org.tamano, template: "vacia", mode: "completa",
    modulesOff: modulosDe(c.scope), ...(c.scope.includes("test") ? { instruments: ["test"] } : {}) });
  if (!creada.ok) return creada;
  const rec = creada.company;
  const fallo = await runWithTenant(rec.slug, async (): Promise<CodFail | null> => {
    const u = createUser(sistema, { email: c.email, name: c.name, role: "DIRECTIVO" });
    if (!u.ok) return u;
    let e = await flushOrError(); if (e) return { ok: false, status: 500, error: e };
    // el tratamiento de datos lo aceptó en el formulario del código
    const consentAt = new Date(); u.user.consentAt = consentAt.toISOString();
    void persist("usuario", async (db) => { await db.user.update({ where: { email: c.email }, data: { consentAt, consentVersion: CONSENT_VERSION } }); });
    // quien generó el código acompaña el diagnóstico: si es consultor, queda con acceso al espacio (el admin ya opera en todas)
    if (c.createdByRole === "CONSULTOR") { const m = await addMembership(sistema, c.createdBy, { role: "CONSULTOR" }); if (!m.ok) console.warn("[4shine] código de acceso: no se pudo dar acceso al advisor:", m.error); }
    audit(sistema, "task", c.email, `espacio creado con un código de acceso (${c.scope.join(" y ")}) para ${c.name}`);
    e = await flushOrError(); return e ? { ok: false, status: 500, error: e } : null;
  });
  if (fallo) return fallo;
  await codGuardar({ ...c, usedAt: new Date().toISOString(), companySlug: rec.slug });
  return { ok: true, slug: rec.slug, next: destinoCodigo(rec.slug), user: { email: c.email, name: c.name, role: "DIRECTIVO", company: { slug: rec.slug, name: rec.name, shortName: rec.shortName, mode: rec.mode } } };
}

/** Vuelve a entrar con un código ya usado, mientras siga vigente: abre la sesión de la persona en su espacio. */
export async function entrarConCodigo(raw: unknown): Promise<{ ok: true; user: SessionUser; slug: string; next: string } | CodFail> {
  const q = await consultarCodigo(raw);
  if (!q.ok) return q;
  if (q.estado !== "usado" || !q.codigo.companySlug) return { ok: false, status: 409, error: "Este código aún no se ha usado: registra primero tu organización." };
  await hydrateCompanies();
  const f = await findUserForLogin(q.codigo.email), rec = g.companies.get(q.codigo.companySlug);
  if (!f || !rec || !rec.active || f.company?.slug !== rec.slug) return { ok: false, status: 403, error: "Tu cuenta ya no está activa en ese espacio. Escríbele a quien te envió el código." };
  if (exigeCodigoEn(rec.slug)) return { ok: false, status: 403, error: `${rec.name} ahora exige el acceso en dos pasos: entra con tu correo y tu contraseña por su enlace de acceso (usa «¿Olvidaste tu contraseña?» si aún no tienes una).` };
  return { ok: true, slug: rec.slug, next: destinoCodigo(rec.slug), user: { email: f.user.email, name: f.user.name, role: f.user.role, line: f.user.line, responsibleId: f.user.responsibleId, company: { slug: rec.slug, name: rec.name, shortName: rec.shortName, mode: rec.mode } } };
}


/* ═══ Acceso en dos pasos: código enviado al correo ═══ */
// Cada empresa decide si lo exige (apagado por defecto). El código es de un solo uso, vence a los pocos minutos y se
// invalida tras varios intentos fallidos; en la base solo se guarda su resumen. ACCESO_DOS_PASOS=off en el entorno lo
// desactiva para toda la plataforma: es la salida de emergencia si el correo deja de funcionar.

const dosPasosApagado = () => process.env.ACCESO_DOS_PASOS === "off";
type Otp = { hash: string | null; expires: number; attempts: number; sentAt: number };
const otpMem = new Map<string, Otp>();   // sin base de datos, o para cuentas que no tienen fila en ella
const otpResumen = (email: string, code: string) => createHash("sha256").update(`${email.trim().toLowerCase()}|${code}|${process.env.AUTH_SECRET ?? "pgtd-dev-secret-cambiar-en-produccion"}`).digest("hex");

async function leerOtp(email: string): Promise<Otp | null> {
  const e = email.trim().toLowerCase();
  if (hasDb()) {
    try {
      const u = await (await prisma()).user.findUnique({ where: { email: e }, select: { otpHash: true, otpExpires: true, otpAttempts: true, otpSentAt: true } });
      if (u) return u.otpSentAt ? { hash: u.otpHash ?? null, expires: u.otpExpires ? new Date(u.otpExpires).getTime() : 0, attempts: u.otpAttempts ?? 0, sentAt: new Date(u.otpSentAt).getTime() } : null;
    } catch (err) { console.error("[4shine] código de acceso:", (err as Error).message); }
  }
  return otpMem.get(e) ?? null;
}
async function guardarOtp(email: string, o: Otp | null): Promise<void> {
  const e = email.trim().toLowerCase();
  if (hasDb()) {
    try {
      await (await prisma()).user.update({ where: { email: e }, data: o ? { otpHash: o.hash, otpExpires: new Date(o.expires), otpAttempts: o.attempts, otpSentAt: new Date(o.sentAt) } : { otpHash: null, otpExpires: null, otpAttempts: 0, otpSentAt: null } });
      return;
    } catch { /* la cuenta no tiene fila en la base (admin sembrado): queda en memoria */ }
  }
  if (o) otpMem.set(e, o); else otpMem.delete(e);
}

/** ¿Hay que pedirle el código a esta cuenta al entrar? Sí, si lo exige la empresa a la que entra o cualquiera en la
    que puede operar después sin volver a identificarse; el admin de plataforma opera en todas. */
export function exigeCodigo(found: UsuarioEncontrado, company: CompanyRecord | null): boolean {
  if (dosPasosApagado()) return false;
  if (company?.twoFactor) return true;
  if (found.user.role === "ADMIN") return [...g.companies.values()].some((c) => c.active && c.twoFactor);
  return [found.company, ...found.otras.map((o) => o.company)].some((c) => !!c && c.active && c.twoFactor === true);
}
/** Nombre de la empresa por la que se pide el código: la que se abre, o la primera de la cuenta que lo exige (el admin opera en todas: sin nombre). */
export function empresaQueExige(found: UsuarioEncontrado, company: CompanyRecord | null): string | undefined {
  if (company?.twoFactor) return company.name;
  if (found.user.role === "ADMIN") return undefined;
  return [found.company, ...found.otras.map((o) => o.company)].find((c) => !!c && c.active && c.twoFactor === true)?.name;
}
/** ¿La empresa solo admite sesiones verificadas con el código? */
export const exigeCodigoEn = (slug: string | null | undefined): boolean => !dosPasosApagado() && !!slug && g.companies.get(slug)?.twoFactor === true;

/** Emite un código nuevo para la cuenta (invalida el anterior). Entre dos envíos debe pasar un mínimo. */
export async function emitirCodigo(email: string): Promise<{ ok: true; code: string } | { ok: false; status: number; error: string; espera?: number }> {
  const prev = await leerOtp(email), now = Date.now();
  const espera = prev ? Math.ceil((prev.sentAt + CODIGO_REENVIO_S * 1000 - now) / 1000) : 0;
  if (espera > 0) return { ok: false, status: 429, error: `Acabamos de enviarte un código. Espera ${espera} segundos para pedir otro.`, espera };
  const code = String(randomInt(0, 10 ** CODIGO_DIGITOS)).padStart(CODIGO_DIGITOS, "0");
  await guardarOtp(email, { hash: otpResumen(email, code), expires: now + CODIGO_MINUTOS * 60_000, attempts: 0, sentAt: now });
  return { ok: true, code };
}

/** Invalida el código vigente (no se pudo enviar). */
export const anularCodigo = (email: string) => guardarOtp(email, null);

/** Comprueba el código. Si es correcto queda usado; si no, cuenta el intento y, al agotarlos, lo invalida. */
export async function verificarCodigo(email: string, code: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const o = await leerOtp(email);
  if (!o || !o.hash || o.expires < Date.now()) return { ok: false, status: 410, error: "El código venció o ya se usó. Pide uno nuevo." };
  if (o.attempts >= CODIGO_INTENTOS) return { ok: false, status: 429, error: "Demasiados intentos con este código. Pide uno nuevo." };
  const a = Buffer.from(otpResumen(email, code)), b = Buffer.from(o.hash);
  if (a.length === b.length && timingSafeEqual(a, b)) { await guardarOtp(email, null); return { ok: true }; }   // usado: no vuelve a servir
  const attempts = o.attempts + 1, quedan = CODIGO_INTENTOS - attempts;
  await guardarOtp(email, { ...o, attempts, ...(quedan <= 0 ? { hash: null, expires: 0 } : {}) });
  return quedan <= 0 ? { ok: false, status: 429, error: "Código incorrecto. Se agotaron los intentos: pide un código nuevo." } : { ok: false, status: 401, error: `Código incorrecto. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.` };
}

/** Activa o desactiva el acceso en dos pasos de la empresa activa (quien administra sus usuarios). */
export function setTwoFactor(actor: SessionUser, on: boolean): { ok: true; twoFactor: boolean } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_users")) return { ok: false, status: 403, error: "Solo quien administra los usuarios de la empresa cambia la seguridad del acceso." };
  const c = g.companies.get(S().slug);
  if (!c) return { ok: false, status: 404, error: "La empresa no existe." };
  if ((c.twoFactor === true) === on) return { ok: true, twoFactor: on };
  if (on) c.twoFactor = true; else delete c.twoFactor;
  const t = g.tenants.get(c.slug); if (t) t.catalog.company = { ...t.catalog.company, twoFactor: on || undefined };
  audit(actor, "task", `empresa:${c.slug}`, on ? "acceso en dos pasos activado: se pide un código enviado al correo" : "acceso en dos pasos desactivado");
  if (hasDb() && c.dbId) { const dbId = c.dbId; void persist("seguridad del acceso", (db) => db.company.update({ where: { id: dbId }, data: { twoFactor: on, dataVersion: { increment: 1 } } })); }
  return { ok: true, twoFactor: on };
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

/** Borra toda la información de una cuenta en la empresa activa: la cuenta, sus respuestas de diagnóstico
    (autoevaluación, test, notas), su análisis con IA, sus evaluaciones de iniciativas y sus notificaciones;
    lo que es de la empresa y no se puede borrar sin romperla (decisiones, comentarios, auditoría, registro de
    correos) se anonimiza. En memoria y en la base. */
export const ANON = "Cuenta eliminada";
function purgeUserData(email: string): { name: string } | null {
  const key = email.trim().toLowerCase();
  const u = users().find((x) => x.email.toLowerCase() === key) ?? null;
  const name = u?.name ?? key;
  if (u) users().splice(users().indexOf(u), 1);
  notifRead().delete(email); notifRead().delete(key);
  for (const k of [...f1Store().keys()]) if (k.toLowerCase() === key) f1Store().delete(k);
  informes().delete(`f1|${key}`);
  for (const k of [...testStore().keys()]) if (k.toLowerCase() === key) { testStore().delete(k); testNotes().delete(k); }
  for (const [k, e] of [...evals().entries()]) if (e.by.toLowerCase() === key) evals().delete(k);
  const decisionesTocadas: string[] = [];
  for (const [k, d] of decisions()) if (d.by.toLowerCase() === key) { d.by = ANON; d.name = ANON; decisionesTocadas.push(k); }
  const comentariosTocados: string[] = [];
  for (const c of S().itinComments.values()) { const cc = c as unknown as { id: string; author?: string; email?: string }; if ((cc.email ?? "").toLowerCase() === key) { cc.author = ANON; delete cc.email; comentariosTocados.push(cc.id); } }
  for (const a of auditLog()) if ((a.email ?? "").toLowerCase() === key) { a.actor = ANON; a.email = ""; }
  for (const m of metas().values()) { if (m.by.toLowerCase() === key) m.by = ANON; if (m.cierre && m.cierre.by.toLowerCase() === key) m.cierre.by = ANON; }
  for (const p of cat().people ?? []) if ((p.email ?? "").toLowerCase() === key) p.email = "";
  void persist("cuenta eliminada", async (db) => {
    const companyId = cid();
    await db.user.deleteMany({ where: { email: key, companyId } });
    await db.f1Response.deleteMany({ where: { companyId, email: key } });
    await db.diagnosticReport.deleteMany({ where: { companyId, kind: "f1", subject: key } });
    await db.testResponse.deleteMany({ where: { companyId, email: key } });
    await db.testNote.deleteMany({ where: { companyId, participant: key } });
    await db.initiativeEvaluation.deleteMany({ where: { companyId, by: key } });
    await db.notifRead.deleteMany({ where: { companyId, email: key } });
    for (const code of decisionesTocadas) { const d = decisions().get(code); if (d) await db.initiativeDecision.updateMany({ where: { companyId, code }, data: { data: d } }); }
    for (const id of comentariosTocados) { const c = S().itinComments.get(id); if (c) await db.itineraryComment.updateMany({ where: { companyId, id }, data: { data: c } }); }
    await db.auditEvent.updateMany({ where: { companyId, email: key }, data: { actor: ANON, email: "" } });
    await db.person.updateMany({ where: { companyId, email: key }, data: { email: null } });
    await db.mailLog.updateMany({ where: { to: key }, data: { to: ANON } });
    await db.mailLog.updateMany({ where: { by: key }, data: { by: ANON } });
  });
  return u ? { name } : null;
}

/** Elimina una cuenta de la empresa (no la propia) con toda su información. */
export function removeUser(actor: SessionUser, email: string): { ok: true } | { ok: false; status: number; error: string } {
  if (!can(actor, "manage_users")) return { ok: false, status: 403, error: "Solo el equipo consultor administra usuarios." };
  const key = email.trim().toLowerCase();
  const u = users().find((x) => x.email.toLowerCase() === key);
  if (!u) return { ok: false, status: 404, error: "El usuario no existe." };
  if (key === actor.email.toLowerCase()) return { ok: false, status: 422, error: "No puedes eliminar tu propia cuenta desde aquí: hazlo desde «Mi perfil»." };
  if (u.membresia) {
    // la cuenta sigue existiendo en su empresa principal: aquí solo se retira la membresía
    users().splice(users().indexOf(u), 1);
    void persist("membresía", (db) => db.userMembership.deleteMany({ where: { companyId: cid(), user: { email: key } } }));
    audit(actor, "task", key, `membresía retirada (${u.name}, ${u.role}); la cuenta sigue en su empresa principal`);
    return { ok: true };
  }
  const info = { name: u.name, role: u.role };
  purgeUserData(key);
  audit(actor, "task", key, `cuenta eliminada con toda su información (${info.name}, ${info.role})`);
  return { ok: true };
}

/* ═══ Perfil propio: datos básicos, contraseña, consentimiento y eliminación de la cuenta ═══ */

const propio = (user: SessionUser): ManagedUser | null =>
  (user.role === "ADMIN" ? g.platformUsers : users()).find((x) => x.email.toLowerCase() === user.email.toLowerCase()) ?? null;

/** ¿Debe aceptar la política de tratamiento de datos antes de usar la plataforma? (todos menos el admin de plataforma y quien entró por QR, que ya la aceptó) */
export function consentPending(user: SessionUser): boolean {
  if (user.role === "ADMIN" || user.qr) return false;
  const u = propio(user);
  return !!u && !u.consentAt;
}

/** Igual que `consentPending`, pero la respuesta la da la base cuando existe: en despliegues con varias
    instancias la memoria de una puede no saber todavía que la persona ya aceptó. */
export async function consentPendingDb(user: SessionUser): Promise<boolean> {
  if (user.role === "ADMIN" || user.qr) return false;
  if (hasDb()) {
    try {
      const db = await prisma();
      const row = await db.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { consentAt: true } });
      if (row) { const u = propio(user); if (u && row.consentAt) u.consentAt = row.consentAt.toISOString(); return !row.consentAt; }
    } catch (e) { console.warn("[4shine] consentimiento:", (e as Error).message); }
  }
  return consentPending(user);
}

/** Registra la aceptación de la política de tratamiento de datos con fecha y versión. */
export async function acceptConsent(user: SessionUser): Promise<{ ok: true; at: string } | { ok: false; status: number; error: string }> {
  const u = propio(user);
  const at = ahora().toISOString();
  if (u) u.consentAt = at;
  if (hasDb()) {
    try {
      const db = await prisma();
      const r = await db.user.updateMany({ where: { email: user.email.toLowerCase() }, data: { consentAt: new Date(at), consentVersion: CONSENT_VERSION } });
      if (!r.count && !u) return { ok: false, status: 404, error: "La cuenta no existe." };
    } catch (e) { return { ok: false, status: 500, error: `No se pudo registrar la aceptación: ${(e as Error).message}` }; }
  } else if (!u) return { ok: false, status: 404, error: "La cuenta no existe." };
  return { ok: true, at };
}

export function ownProfile(user: SessionUser): { email: string; name: string; role: SessionUser["role"]; consentAt: string | null; company: string | null } | null {
  const u = propio(user);
  return u ? { email: u.email, name: u.name, role: u.role, consentAt: u.consentAt ?? null, company: user.company?.name ?? null } : null;
}

/** La persona actualiza sus datos básicos (por ahora el nombre). */
export function updateOwnProfile(user: SessionUser, patch: { name?: unknown }): { ok: true; name: string } | { ok: false; status: number; error: string } {
  const u = propio(user);
  if (!u) return { ok: false, status: 404, error: "La cuenta no existe." };
  const name = String(patch.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, status: 422, error: "El nombre debe tener entre 2 y 80 caracteres." };
  u.name = name;
  for (const f of f1Store().values()) if (f.email.toLowerCase() === u.email.toLowerCase()) f.name = name;
  audit(user, "task", u.email, "datos básicos del perfil actualizados");
  void persist("perfil", (db) => db.user.updateMany({ where: { email: u.email.toLowerCase() }, data: { name } }));
  return { ok: true, name };
}

/** ¿La cuenta tiene contraseña fijada? (las que entraron por QR o se crearon sin contraseña, no) */
export async function hasPassword(email: string): Promise<boolean> {
  if (!hasDb()) return false;
  try { const db = await prisma(); const u = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { passwordHash: true } }); return Boolean(u?.passwordHash); } catch { return false; }
}

/** La persona cambia su contraseña: exige la actual si ya tiene una. */
export async function changeOwnPassword(user: SessionUser, actual: unknown, nueva: unknown): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!hasDb()) return { ok: false, status: 422, error: "Cambiar la contraseña exige base de datos." };
  if (typeof nueva !== "string" || nueva.length < 10 || nueva.length > 200) return { ok: false, status: 422, error: "La contraseña nueva debe tener al menos 10 caracteres." };
  const tiene = await hasPassword(user.email);
  if (tiene) {
    const ok = await verifyPassword(user.email, String(actual ?? ""));
    if (!ok) return { ok: false, status: 403, error: "La contraseña actual no es correcta." };
    if (String(actual) === nueva) return { ok: false, status: 422, error: "La contraseña nueva debe ser distinta de la actual." };
  }
  const bcrypt = await serverImport("bcryptjs") as AnyPrisma;
  const hash = await (bcrypt.default ?? bcrypt).hash(nueva, 10);
  const db = await prisma();
  await db.user.update({ where: { email: user.email.toLowerCase() }, data: { passwordHash: hash, failedLogins: 0, lockedUntil: null, resetToken: null, resetExpires: null } });
  audit(user, "task", user.email, "contraseña cambiada desde el perfil");
  return { ok: true };
}

/** La persona elimina su propia cuenta y toda su información. Exige su contraseña (o la palabra ELIMINAR si no tiene). */
export async function deleteOwnAccount(user: SessionUser, input: { password?: unknown; confirm?: unknown }): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (user.role === "ADMIN") return { ok: false, status: 422, error: "La cuenta de administrador de la plataforma no se elimina desde el perfil." };
  const u = propio(user);
  if (!u) return { ok: false, status: 404, error: "La cuenta no existe." };
  if (await hasPassword(user.email)) {
    const ok = await verifyPassword(user.email, String(input.password ?? ""));
    if (!ok) return { ok: false, status: 403, error: "La contraseña no es correcta." };
  } else if (String(input.confirm ?? "").trim().toUpperCase() !== "ELIMINAR") {
    return { ok: false, status: 422, error: "Escribe ELIMINAR para confirmar." };
  }
  const info = { name: u.name, role: u.role };
  purgeUserData(u.email);
  audit({ ...user, name: ANON, email: "" }, "task", "cuenta", `una cuenta ${info.role.toLowerCase()} eliminó su información a petición propia`);
  return { ok: true };
}
export function updateUser(
  actor: SessionUser,
  email: string,
  patch: { role?: SessionUser["role"]; line?: number | null; responsibleId?: string | null; active?: boolean },
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
    if (patch.role !== "RESPONSABLE") { u.line = undefined; u.responsibleId = undefined; }
  }

  if ((patch.line !== undefined && patch.line !== u.line) || (patch.responsibleId !== undefined && (patch.responsibleId || undefined) !== u.responsibleId)) {
    if (u.role !== "RESPONSABLE") {
      return { ok: false, status: 422, error: "El ámbito (capacidad o responsable) solo aplica al rol Responsable." };
    }
    const scope = resolveScope(patch.line === undefined ? u.line : patch.line, patch.responsibleId === undefined ? u.responsibleId : patch.responsibleId);
    if (!scope.ok) return { ok: false, status: 422, error: scope.error };
    if (scope.line !== u.line) changes.push(scope.line ? `capacidad → 4.${scope.line}` : "sin capacidad");
    if (scope.responsibleId !== u.responsibleId) changes.push(scope.responsibleId ? `ámbito → ${ownerName(scope.responsibleId) ?? scope.responsibleId}` : "sin responsable");
    u.line = scope.line; u.responsibleId = scope.responsibleId;
  }

  if (changes.length === 0) return { ok: false, status: 422, error: "Nada que actualizar." };
  audit(actor, "task", u.email, `usuario: ${changes.join(" · ")}`);
  if (u.membresia) void persist("membresía", (db) => db.userMembership.updateMany({ where: { companyId: cid(), user: { email: u.email.toLowerCase() } }, data: { role: u.role, line: u.line ?? null, responsibleId: u.responsibleId ?? null, active: u.active } }));
  else void persist("usuario", (db) => db.user.updateMany({ where: { email: u.email }, data: { name: u.name, role: u.role, line: u.line ?? null, responsibleId: u.responsibleId ?? null, active: u.active } }));
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

import { OPENAI_MODELOS } from "@/lib/modelos-ia";
type IntegrationSpec = {
  name: string;
  purpose: string;
  fields: { key: string; label: string; secret?: boolean; placeholder: string; validate: (v: string) => string | null; options?: { value: string; label: string; nota?: string; retiro?: string }[] }[];
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
        options: OPENAI_MODELOS,
      },
    ],
  },
  r2: {
    name: "Cloudflare R2",
    purpose: "Almacenamiento de evidencias, logos y exportaciones; sin configurar, los archivos se guardan en el servidor.",
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
/** SES configurado por variables de entorno del despliegue (Vercel): remitente,
    región y credenciales del usuario IAM de solo envío. */
export function sesFromEnv(): IntegrationConfig | null {
  const from = process.env.SES_FROM ?? "", id = process.env.AWS_ACCESS_KEY_ID ?? "", secret = process.env.AWS_SECRET_ACCESS_KEY ?? "";
  if (!from || !id || !secret) return null;
  const sender = (from.match(/<([^>]+)>/)?.[1] ?? from).trim();
  return { enabled: true, fields: { region: process.env.AWS_REGION ?? "us-east-1", accessKeyId: id, secretAccessKey: secret, sender }, updatedBy: "Variables de entorno del despliegue" };
}

/** Cloudflare R2 configurado por variables de entorno del despliegue. */
export function r2FromEnv(): IntegrationConfig | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return { enabled: true, fields: { accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET }, updatedBy: "Variables de entorno del despliegue" };
}
/** OpenAI configurado por variables de entorno del despliegue: OPENAI_API_KEY y, opcional, OPENAI_MODEL.
    Así el análisis con IA del diagnóstico funciona para todas las empresas sin configurarlo una por una. */
export function openaiFromEnv(): IntegrationConfig | null {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) return null;
  return { enabled: true, fields: { apiKey, model: (process.env.OPENAI_MODEL ?? "").trim() || "gpt-4o-mini" }, updatedBy: "Variables de entorno del despliegue" };
}

const envIntegration = (key: IntegrationKey): IntegrationConfig | null => (key === "ses" ? sesFromEnv() : key === "r2" ? r2FromEnv() : key === "openai" ? openaiFromEnv() : null);

/** Configuración que rige para una integración: la guardada en la plataforma
    si está activa y completa; si no, la del entorno. Sirve también fuera de
    una empresa activa (p. ej. al enviar el correo de recuperación). */
export function effectiveIntegration(key: IntegrationKey): IntegrationConfig | null {
  try {
    if (hasTenantContext()) {
      const cfg = integrations().get(key);
      if (cfg?.enabled && INTEGRATION_SPECS[key].fields.every((f) => cfg.fields[f.key]?.trim())) return cfg;
    }
  } catch { /* sin empresa activa */ }
  const env = envIntegration(key);
  // OpenAI: la clave puede venir del entorno y el modelo elegirse en Integraciones (sin volver a escribir la clave)
  if (env && key === "openai") { const m = modeloElegido(); if (m) return { ...env, fields: { ...env.fields, model: m } }; }
  return env;
}
/** Modelo de OpenAI elegido en Integraciones para la empresa activa, aunque la clave siga viniendo del entorno. */
function modeloElegido(): string | null {
  try { return hasTenantContext() ? integrations().get("openai")?.fields.model?.trim() || null : null; } catch { return null; }
}
export const effectiveSes = () => effectiveIntegration("ses");
export const effectiveR2 = () => effectiveIntegration("r2");

export function getIntegrationsMasked() {
  return (Object.keys(INTEGRATION_SPECS) as IntegrationKey[]).map((key) => {
    const spec = INTEGRATION_SPECS[key];
    const stored = integrations().get(key);
    // SES y R2: si no hay configuración propia activa, rige la del entorno y se muestra activa
    const envBase = !(stored?.enabled) ? envIntegration(key) : null;
    // OpenAI con la clave del entorno: el modelo que se muestra es el elegido aquí, si lo hay
    const env = envBase && key === "openai" && stored?.fields.model?.trim() ? { ...envBase, fields: { ...envBase.fields, model: stored.fields.model.trim() } } : envBase;
    const cfg = stored?.enabled ? stored : (env ?? stored);
    return {
      key,
      name: spec.name,
      purpose: spec.purpose,
      enabled: cfg?.enabled ?? false,
      configured: Boolean(cfg && spec.fields.every((f) => cfg.fields[f.key]?.trim())),
      source: env ? "entorno" as const : stored ? "plataforma" as const : null,
      updatedBy: cfg?.updatedBy,
      at: cfg?.at,
      fields: spec.fields.map((f) => ({
        key: f.key, label: f.label, secret: Boolean(f.secret), placeholder: f.placeholder, ...(f.options ? { options: f.options } : {}),
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
  cfg.at = ahora().toISOString();
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

// Textos del acceso anteriores al sitio público: si una empresa todavía los tiene
// guardados, se leen como los vigentes (no nombran el método ni su firma).
const BRANDING_ANTERIOR: Partial<Record<keyof Branding, string>> = {
  heroTitle: "Plataforma de gestión estratégica de 4Shine Empresas",
  tagline: "Dirección elige. Liderazgo moviliza. Ejecución cumple. Multiplicación escala.",
  loginWelcome: "Entra con la cuenta que te asignó el advisor de tu empresa.",
};

export const DEFAULT_BRANDING: Branding = {
  platformName: "Gestión estratégica", showPlatformName: true,
  institutionName: "Andina Suministros",
  shortName: "Andina",
  tagline: "Estrategia · Priorización · Proyectos · Inteligencia",
  logoLight: null, logoDark: null, favicon: null,
  timezone: "America/Bogota",
  primary: "#0D1B2A", secondary: "#08111c", accent: "#8a6d1f",
  font: "Inter", radius: "14px", maxWidth: "1220px", buttonStyle: "solid",
  loginLayout: "image-left",
  loginTitle: "Iniciar sesión", showLoginTitle: true,
  loginWelcome: "Entra con la cuenta que te asignó el asesor estratégico de tu empresa.", showLoginWelcome: true,
  loginSupport: "Soporte: soporte@algoritmot.com", showLoginSupport: false,
  heroTitle: "De la estrategia declarada a la estrategia cumplida.", showHeroTitle: true,
  heroMessages: [], showHeroMessages: true,
  heroSupport: "", showHeroSupport: false,
  overlayColor: "#0d1830", overlayOpacity: 55,
  backgroundImages: [], panelImages: ["/login.jpg"],
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
  for (const [k, viejo] of Object.entries(BRANDING_ANTERIOR)) {
    if ((gb.branding as Record<string, unknown>)[k] === viejo) {
      (gb.branding as Record<string, unknown>)[k] = DEFAULT_BRANDING[k as keyof Branding];
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
  codMem.clear(); otpMem.clear();   // códigos de acceso y de verificación en memoria (sin base de datos)
}

export { DEMO_TODAY };



/* ═══ Correos salientes: plantillas parametrizables y registro de envíos (ámbito de plataforma) ═══ */

export type MailTemplateStored = { key: string; subject: string; title: string; body: string; updatedBy?: string; at?: string };
export type MailLogEntry = { id: string; at: string; by: string; companySlug: string | null; kind: string; to: string; subject: string; status: "enviado" | "error" | "sin-config"; error?: string; messageId?: string };

export const getMailTemplateStored = (key: MailTemplateKey): MailTemplateStored | null => g.mailTemplates.get(key) ?? null;
export const getMailTemplatesStored = (): MailTemplateStored[] => [...g.mailTemplates.values()];

/** Guarda (o restaura, con `null`) una plantilla. Solo quien administra la plataforma. */
export async function saveMailTemplate(actor: SessionUser, key: unknown, data: { subject: string; title: string; body: string } | null): Promise<{ ok: true; template: MailTemplateStored | null } | { ok: false; status: number; error: string }> {
  if (!can(actor, "manage_platform")) return { ok: false, status: 403, error: "Solo el administrador de la plataforma edita las plantillas de correo." };
  if (!isMailTemplateKey(key)) return { ok: false, status: 400, error: "Plantilla desconocida." };
  if (data === null) {
    g.mailTemplates.delete(key);
    await persistQuiet("plantilla-correo", (db) => db.mailTemplate.deleteMany({ where: { key } }));
    return { ok: true, template: null };
  }
  const bad = validarPlantilla(data); if (bad) return { ok: false, status: 422, error: bad };
  const t: MailTemplateStored = { key, subject: data.subject.trim(), title: data.title.trim(), body: data.body.replace(/\r\n/g, "\n").trim(), updatedBy: actor.email, at: ahora().toISOString() };
  g.mailTemplates.set(key, t);
  await persistQuiet("plantilla-correo", (db) => db.mailTemplate.upsert({ where: { key }, update: { subject: t.subject, title: t.title, body: t.body, updatedBy: t.updatedBy }, create: { key, subject: t.subject, title: t.title, body: t.body, updatedBy: t.updatedBy } }));
  return { ok: true, template: t };
}

/** Registra un envío (o su fallo) en memoria y en la base. */
export async function logMail(entry: Omit<MailLogEntry, "id" | "at">): Promise<MailLogEntry> {
  const e: MailLogEntry = { id: `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, at: ahora().toISOString(), ...entry };
  g.mailLog.unshift(e); if (g.mailLog.length > 500) g.mailLog.length = 500;
  await persistQuiet("correo", (db) => db.mailLog.create({ data: { id: e.id, by: e.by, companySlug: e.companySlug, kind: e.kind, to: e.to, subject: e.subject, status: e.status, error: e.error ?? null, messageId: e.messageId ?? null } }));
  return e;
}

/** Últimos envíos, opcionalmente de una empresa. Con base de datos, desde la base (todas las instancias). */
export async function listMailLog(opts: { limit?: number; companySlug?: string | null } = {}): Promise<MailLogEntry[]> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  if (hasDb()) {
    try {
      const db = await prisma();
      const rows = await db.mailLog.findMany({ where: opts.companySlug ? { companySlug: opts.companySlug } : undefined, orderBy: { at: "desc" }, take: limit });
      return rows.map((r: { id: string; at: Date; by: string; companySlug: string | null; kind: string; to: string; subject: string; status: string; error: string | null; messageId: string | null }) => ({ id: r.id, at: r.at.toISOString(), by: r.by, companySlug: r.companySlug, kind: r.kind, to: r.to, subject: r.subject, status: r.status as MailLogEntry["status"], ...(r.error ? { error: r.error } : {}), ...(r.messageId ? { messageId: r.messageId } : {}) }));
    } catch (e) { console.warn("[4shine] registro de correos:", (e as Error).message); }
  }
  return g.mailLog.filter((e) => !opts.companySlug || e.companySlug === opts.companySlug).slice(0, limit);
}


/* ═══ Deshacer acciones de otros usuarios (solo el administrador de la plataforma, permiso undo_any) ═══
   Cada función borra en memoria y en la base, deja rastro en la auditoría y devuelve 403 para quien no administra. */

const puedeDeshacer = (actor: SessionUser): { ok: false; status: number; error: string } | null =>
  can(actor, "undo_any") ? null : { ok: false, status: 403, error: "Solo el administrador de la plataforma deshace acciones de otros usuarios." };

/** Borra la autoevaluación directiva de una persona y su análisis con IA; el consolidado queda desactualizado. */
export function removeF1Response(actor: SessionUser, email: unknown): { ok: true } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const key = String(email ?? "").trim().toLowerCase();
  const entry = [...f1Store().entries()].find(([k]) => k.toLowerCase() === key);
  if (!entry) return { ok: false, status: 404, error: "Esa persona no tiene autoevaluación guardada." };
  f1Store().delete(entry[0]);
  informes().delete(`f1|${key}`);
  audit(actor, "task", `f1:${entry[0]}`, `autoevaluación directiva eliminada por el administrador (${entry[1].name})`);
  void persist("autoevaluación", async (db) => {
    const companyId = cid();
    await db.f1Response.deleteMany({ where: { companyId, email: entry[0] } });
    await db.diagnosticReport.deleteMany({ where: { companyId, kind: "f1", subject: key } });
  });
  return { ok: true };
}

/** Borra la respuesta de una persona al test de capacidad empresarial (y sus notas de informe). */
export function removeTestResponse(actor: SessionUser, email: unknown): { ok: true } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const key = String(email ?? "").trim().toLowerCase();
  const entry = [...testStore().entries()].find(([k]) => k.toLowerCase() === key);
  if (!entry) return { ok: false, status: 404, error: "Esa persona no tiene test guardado." };
  testStore().delete(entry[0]);
  testNotes().delete(entry[0]);
  audit(actor, "task", `test:${entry[0]}`, `test de capacidad empresarial eliminado por el administrador (${entry[1].name})`);
  void persist("test", async (db) => {
    const companyId = cid();
    await db.testResponse.deleteMany({ where: { companyId, email: entry[0] } });
    await db.testNote.deleteMany({ where: { companyId, participant: entry[0] } });
  });
  return { ok: true };
}

/** Borra una respuesta anónima de la encuesta de equipos (por su id F2-0001…). */
export function removeF2Response(actor: SessionUser, id: unknown): { ok: true; total: number } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const i = f2Store().findIndex((r) => r.id === String(id ?? ""));
  if (i < 0) return { ok: false, status: 404, error: "Esa respuesta no existe." };
  const [r] = f2Store().splice(i, 1);
  audit(actor, "task", `f2:${r.id}`, "respuesta de la encuesta de equipos eliminada por el administrador");
  void persist("fuente 2", (db) => db.teamResponse.deleteMany({ where: { companyId: cid(), id: r.id } }));
  return { ok: true, total: f2Store().length };
}

/** Borra la evaluación de una persona sobre una iniciativa (matriz de priorización). */
export function removeEvaluation(actor: SessionUser, iniId: unknown, by: unknown): { ok: true; consolidated: Consolidated } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const id = String(iniId ?? "").toLowerCase(), who = String(by ?? "").toLowerCase();
  const key = `${id}|${who}`;
  if (!evals().has(key)) return { ok: false, status: 404, error: "Esa evaluación no existe." };
  evals().delete(key);
  audit(actor, "task", id, `evaluación de ${who} eliminada por el administrador`);
  void persist("evaluación", (db) => db.initiativeEvaluation.deleteMany({ where: { companyId: cid(), id: key } }));
  return { ok: true, consolidated: consolidatedOf(id) };
}

/** Deja una iniciativa sin decisión de tiempo. */
export function clearDecision(actor: SessionUser, iniId: unknown): { ok: true } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const id = String(iniId ?? "").toLowerCase();
  if (!decisions().has(id)) return { ok: false, status: 404, error: "La iniciativa no tiene decisión registrada." };
  decisions().delete(id);
  audit(actor, "task", id, "decisión de tiempo deshecha por el administrador");
  void persist("decisión", (db) => db.initiativeDecision.deleteMany({ where: { companyId: cid(), code: id } }));
  return { ok: true };
}

/** Borra un valor de KPI reportado desde la plataforma (no toca la serie base). */
export function removeKpiReport(actor: SessionUser, code: unknown, period: unknown): { ok: true; series: KpiFull["series"] } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const c = String(code ?? ""), p = String(period ?? "");
  const list = kpiReports().get(c) ?? [];
  const i = list.findIndex((r) => r.period === p);
  if (i < 0) return { ok: false, status: 404, error: "No hay un valor reportado para ese indicador y periodo." };
  list.splice(i, 1); kpiReports().set(c, list);
  audit(actor, "task", `kpi:${c}`, `valor reportado del periodo ${p} eliminado por el administrador`);
  void persist("kpi", (db) => db.kpiReport.deleteMany({ where: { companyId: cid(), code: c, period: p } }));
  return { ok: true, series: effectiveKpiSeries(c) };
}

/** Borra la captura A3 de una práctica (autoevaluación, evidencia y nivel). */
export function clearCapture(actor: SessionUser, varId: unknown): { ok: true } | { ok: false; status: number; error: string } {
  const no = puedeDeshacer(actor); if (no) return no;
  const v = String(varId ?? "");
  if (!capture().has(v)) return { ok: false, status: 404, error: "Esa práctica no tiene captura." };
  if (S().published) return { ok: false, status: 422, error: "El corte A3 ya está publicado: la captura no se modifica." };
  capture().delete(v);
  audit(actor, "task", `captura:${v}`, "captura A3 eliminada por el administrador");
  void persist("captura", (db) => db.practiceCapture.deleteMany({ where: { companyId: cid(), cut: "A3", practice: v } }));
  return { ok: true };
}


/* ═══ F04 · Cascada y plan trimestral: metas trimestrales por área ═══
   Las editan quienes administran el catálogo (advisor, líder, admin) y cada responsable de área sobre las de
   su área. El cierre del trimestre (cumplimiento y aprendizaje) sigue la misma regla. */

const metas = () => S().metas;
export const getMetas = (): MetaTrimestral[] => [...metas().values()].sort((a, b) => a.quarter.localeCompare(b.quarter) || a.areaId.localeCompare(b.areaId));

function puedeMeta(user: SessionUser, areaId: string): { ok: false; status: number; error: string } | null {
  if (can(user, "manage_catalog")) return null;
  if (user.role === "RESPONSABLE" && user.responsibleId && user.responsibleId === areaId) return null;
  return { ok: false, status: 403, error: "Las metas trimestrales las registran el advisor, el líder y el responsable de cada área." };
}
const ctxMetas = () => { const c = cat(); return { areas: c.responsibles.map((r) => r.id), levers: (c.company.levers ?? []).map((l) => l.id), objectives: c.objectives.map((o) => o.id), kpis: c.kpis.map((k) => k.code), initiatives: c.initiatives.map((i) => i.id) }; };

export function upsertMeta(user: SessionUser, input: Partial<MetaTrimestral> & Record<string, unknown>): { ok: true; meta: MetaTrimestral } | { ok: false; status: number; error: string } {
  const n = normalizarMeta(input, ctxMetas());
  if (!n.ok) return { ok: false, status: 422, error: n.error };
  // toda meta de una iniciativa pertenece a un área declarada en su articulación: así ninguna queda fuera del árbol
  if (n.meta.initiative) {
    const art = getArticulacion(n.meta.initiative);
    if (!art) return { ok: false, status: 422, error: "Declara primero la articulación de la iniciativa (qué áreas participan y qué hace cada una); después se registran sus metas." };
    if (!art.areas.some((a) => a.areaId === n.meta.areaId)) return { ok: false, status: 422, error: "El área de la meta no participa en la iniciativa: agrégala a la articulación con su contribución." };
  }
  const id = typeof input.id === "string" && input.id ? input.id : `mt-${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
  const prev = metas().get(id);
  const no = puedeMeta(user, n.meta.areaId) ?? (prev ? puedeMeta(user, prev.areaId) : null); if (no) return no;
  const m: MetaTrimestral = { ...n.meta, cierre: prev?.cierre, id, by: prev?.by ?? user.email, at: ahora().toISOString() };
  metas().set(id, m);
  audit(user, "task", `meta:${id}`, `${prev ? "meta trimestral actualizada" : "meta trimestral creada"} (${m.quarter} · ${m.areaId})`);
  void persist("meta trimestral", (db) => db.quarterGoal.upsert({ where: { companyId_id: { companyId: cid(), id } }, update: { data: m }, create: { companyId: cid(), id, data: m } }));
  return { ok: true, meta: m };
}

export function removeMeta(user: SessionUser, id: unknown): { ok: true } | { ok: false; status: number; error: string } {
  const m = metas().get(String(id ?? "")); if (!m) return { ok: false, status: 404, error: "La meta no existe." };
  const no = puedeMeta(user, m.areaId); if (no) return no;
  metas().delete(m.id);
  audit(user, "task", `meta:${m.id}`, "meta trimestral eliminada");
  void persist("meta trimestral", (db) => db.quarterGoal.deleteMany({ where: { companyId: cid(), id: m.id } }));
  return { ok: true };
}

/** Cierre del trimestre para una meta: cumplimiento (0–100) y aprendizaje; fija el estado según el cumplimiento. */
export function cerrarMeta(user: SessionUser, id: unknown, input: { cumplimiento?: unknown; aprendizaje?: unknown }): { ok: true; meta: MetaTrimestral } | { ok: false; status: number; error: string } {
  const m = metas().get(String(id ?? "")); if (!m) return { ok: false, status: 404, error: "La meta no existe." };
  const no = puedeMeta(user, m.areaId); if (no) return no;
  const c = Number(input.cumplimiento);
  if (!Number.isFinite(c) || c < 0 || c > 100) return { ok: false, status: 422, error: "El cumplimiento es un porcentaje de 0 a 100." };
  const aprendizaje = String(input.aprendizaje ?? "").trim().slice(0, 600);
  m.cierre = { cumplimiento: Math.round(c), aprendizaje, at: ahora().toISOString(), by: user.email };
  m.estado = c >= 90 ? "CUMPLIDA" : c > 0 ? "PARCIAL" : "NO_CUMPLIDA";
  m.at = ahora().toISOString();
  audit(user, "task", `meta:${m.id}`, `cierre del trimestre: ${m.cierre.cumplimiento} %`);
  void persist("meta trimestral", (db) => db.quarterGoal.upsert({ where: { companyId_id: { companyId: cid(), id: m.id } }, update: { data: m }, create: { companyId: cid(), id: m.id, data: m } }));
  return { ok: true, meta: m };
}

/** Propone la cascada del año desde el portafolio (una meta por iniciativa en su trimestre de inicio) y la guarda. */
export function proponerCascada(user: SessionUser, year: unknown): { ok: true; creadas: number } | { ok: false; status: number; error: string } {
  if (!can(user, "manage_catalog")) return { ok: false, status: 403, error: "La propuesta de cascada la lanza el advisor o el líder." };
  const y = Number(year); if (!Number.isInteger(y) || y < 2020 || y > 2100) return { ok: false, status: 422, error: "Indica el año (p. ej. 2027)." };
  const c = cat();
  const nuevas = proponerDesdePortafolio(c.initiatives, c.objectives, y, getMetas(), getArticulaciones());
  for (const n of nuevas) { const r = upsertMeta(user, n as Partial<MetaTrimestral> & Record<string, unknown>); if (!r.ok) return r; }
  return { ok: true, creadas: nuevas.length };
}

/* ═══ Articulación entre áreas (cascada) ═══
   Por iniciativa: qué áreas participan, cuál lidera, con qué prioridad, quién y qué debe hacer cada una. Se guarda en
   DiagnosticReport (kind articulacion, subject = id de la iniciativa). La registran quienes administran el catálogo y
   el responsable del área dueña de la iniciativa. */
export const getArticulacion = (iniId: string): Articulacion | null => { const g = informes().get(`articulacion|${iniId}`); return g ? (g.informe as unknown as Articulacion) : null; };
export const getArticulaciones = (): Record<string, Articulacion> => Object.fromEntries([...informes().values()].filter((g) => g.kind === "articulacion").map((g) => [g.subject, g.informe as unknown as Articulacion]));
export function saveArticulacion(user: SessionUser, iniId: string, input: unknown): { ok: true; articulacion: Articulacion } | { ok: false; status: number; error: string } {
  const i = cat().initiatives.find((x) => x.id === iniId);
  if (!i) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!can(user, "manage_catalog") && !(user.role === "RESPONSABLE" && user.responsibleId && user.responsibleId === i.ownerId)) return { ok: false, status: 403, error: "La articulación la registran el advisor, el líder o el responsable del área dueña de la iniciativa." };
  const r = normalizarArticulacion(input, iniId, user.email, { areas: cat().responsibles.map((x) => x.id) });
  if (!r.ok) return { ok: false, status: 422, error: r.error };
  const saved: InformeGuardado = { kind: "articulacion", subject: iniId, inputHash: String(r.articulacion.areas.length), informe: r.articulacion as unknown as InformeIA, model: "manual", by: user.email, at: r.articulacion.at };
  informes().set(`articulacion|${iniId}`, saved);
  void persist("articulación de la iniciativa", async (db) => {
    const companyId = cid();
    const data = { inputHash: saved.inputHash, content: r.articulacion as unknown as object, model: "manual", by: user.email, at: new Date(saved.at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind: "articulacion", subject: iniId } }, update: data, create: { companyId, kind: "articulacion", subject: iniId, ...data } });
  });
  audit(user, "task", `articulacion:${iniId}`, `articulación de ${iniId}: ${r.articulacion.areas.map((a) => `${a.areaId}${a.rol === "LIDERA" ? " (lidera)" : ""}`).join(", ")}`);
  return { ok: true, articulacion: r.articulacion };
}


/* ═══ Evidencia de guardados que no llegaron ═══
   Un guardado rechazado (permiso, validación, base de datos) queda en la actividad con su motivo; así un
   «yo sí lo respondí» se puede contrastar con lo que el servidor recibió. */

export function auditRechazo(user: SessionUser, instrumento: "f1" | "test", motivo: string, status: number) {
  audit(user, "task", `${instrumento}:${user.email}`, `${instrumento === "f1" ? "autoevaluación directiva" : "test"}: guardado rechazado (${status}) · ${motivo}`.slice(0, 500));
}

/** Petición de escritura sin sesión (caducada o no iniciada): se anota en la empresa que indica el referer, si la hay. */
export async function registrarSinSesion(slug: string | null, path: string) {
  if (!slug || !hasDb()) return;
  await hydrateCompanies();
  const companyId = g.companies.get(slug)?.dbId; if (!companyId) return;
  const db = await prisma();
  await db.auditEvent.create({ data: { companyId, actor: "Sin sesión", email: "", role: "", entity: "task", entityId: "sesion", change: `escritura rechazada sin sesión (sesión caducada o no iniciada) · ${path}`.slice(0, 500) } }).catch(() => undefined);
}


/* ═══ Validación de alineación de objetivos (IA) ═══
   Se guarda en la misma tabla que los informes con IA (tipo «alineacion», asunto = horizonte) con la huella de las
   prioridades y objetivos que la originaron: si cambian, se marca desactualizada. */

export const getAlineacion = (horizon: string, kind: InformeKind = "alineacion"): (Omit<InformeGuardado, "informe"> & { informe: AlineacionIA }) | null => {
  const g = informes().get(`${kind}|${horizon}`); if (!g) return null;
  const informe = g.informe as unknown as AlineacionIA;
  if (kind !== "alineacion") return { ...g, informe };
  // la aprobación del comité vale mientras el objetivo no cambie: si cambió (o ya no existe), vuelve la lectura del modelo
  const objs = cat().objectives;
  const items = informe.items.map((x) => {
    if (!x.aprobado) return x;
    const o = objs.find((y) => y.id === x.id);
    if (o && !o.descartado && firmaObjetivo(o) === x.aprobado.firma) return x;
    const { aprobado: _a, colorIA, ...resto } = x; void _a;
    return { ...resto, color: colorIA ?? "amarillo" };
  });
  return { ...g, informe: { ...informe, items } };
};

/** Aprobación del comité directivo sobre la validación de objetivos: los marcados quedan en verde y conservan la lectura
    del modelo (color, justificación y recomendaciones) como referencia. La registra quien conduce la validación
    (advisor, líder o admin). Solo se aprueba un objetivo vigente y vinculado a una prioridad. */
export function aprobarObjetivos(user: SessionUser, horizon: string, ids: string[], accion: "aprobar" | "quitar", hashSiNuevo: string): { ok: true; aprobados: string[]; omitidos: { id: string; motivo: string }[] } | { ok: false; status: number; error: string } {
  if (!can(user, "manage_catalog") || user.role === "DIRECTIVO") return { ok: false, status: 403, error: "La aprobación del comité la registra el advisor, el líder de la empresa o el administrador." };
  const c = cat();
  const previa = informes().get(`alineacion|${horizon}`);
  const informe: AlineacionIA = previa ? (previa.informe as unknown as AlineacionIA) : { horizon, items: [], resumen: "" };
  const items = [...informe.items];
  const aprobados: string[] = [], omitidos: { id: string; motivo: string }[] = [];
  const at = ahora().toISOString();
  for (const id of [...new Set(ids.map((x) => String(x).toUpperCase()))]) {
    const o = c.objectives.find((x) => x.id === id && x.horizon === horizon && !x.okr);
    if (!o) { omitidos.push({ id, motivo: "no es un objetivo directivo de este horizonte" }); continue; }
    const idx = items.findIndex((x) => x.id === id);
    if (accion === "quitar") {
      if (idx >= 0 && items[idx].aprobado) { const { aprobado: _a, colorIA, ...resto } = items[idx]; void _a; items[idx] = { ...resto, color: colorIA ?? "amarillo" }; aprobados.push(id); }
      continue;
    }
    if (o.descartado) { omitidos.push({ id, motivo: "está descartado" }); continue; }
    if (!objetivoConPrioridad(c, o)) { omitidos.push({ id, motivo: "no está vinculado a una prioridad estratégica" }); continue; }
    const base: AlineacionItem = idx >= 0 ? items[idx] : { id, color: "verde", justificacion: "Sin lectura del modelo: aprobado directamente por el comité directivo.", recomendaciones: [], naturaleza: "objetivo", duplicaDe: [], reformulacion: "", indicadorPropuesto: "", faltan: [] };
    const nuevo: AlineacionItem = { ...base, colorIA: base.aprobado ? base.colorIA : (idx >= 0 ? base.color : undefined), color: "verde", aprobado: { by: user.email.toLowerCase(), name: user.name, at, firma: firmaObjetivo(o) } };
    if (idx >= 0) items[idx] = nuevo; else items.push(nuevo);
    aprobados.push(id);
  }
  if (!aprobados.length) return { ok: true, aprobados, omitidos };
  const nuevoInforme: AlineacionIA = { ...informe, items };
  const saved: InformeGuardado = previa ? { ...previa, informe: nuevoInforme as unknown as InformeIA } : { kind: "alineacion", subject: horizon, inputHash: hashSiNuevo, informe: nuevoInforme as unknown as InformeIA, model: "manual", by: user.email, at };
  informes().set(`alineacion|${horizon}`, saved);
  audit(user, "task", `alineacion:${horizon}`, `${accion === "aprobar" ? "objetivos aprobados por el comité" : "aprobación del comité retirada"}: ${aprobados.join(" · ")}`);
  void persist("aprobación de objetivos", async (db) => {
    const companyId = cid();
    const data = { inputHash: saved.inputHash, content: nuevoInforme as unknown as object, model: saved.model, by: saved.by, at: new Date(saved.at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind: "alineacion", subject: horizon } }, update: data, create: { companyId, kind: "alineacion", subject: horizon, ...data } });
  });
  return { ok: true, aprobados, omitidos };
}

export function saveAlineacion(user: SessionUser, horizon: string, inputHash: string, informe: AlineacionIA, model = "openai", kind: InformeKind = "alineacion"): { ok: true; saved: InformeGuardado } | { ok: false; status: number; error: string } {
  if (!can(user, "manage_catalog")) return { ok: false, status: 403, error: "La validación la lanza quien administra la estrategia." };
  const subject = horizon;
  const saved: InformeGuardado = { kind, subject, inputHash, informe: informe as unknown as InformeIA, model, by: user.email, at: ahora().toISOString() };
  informes().set(`${kind}|${subject}`, saved);
  audit(user, "task", `${kind}:${horizon}`, `${kind === "alineacion" ? "validación de alineación" : "validación de iniciativas"} generada (${informe.items.filter((i) => i.color === "verde").length} verde · ${informe.items.filter((i) => i.color === "amarillo").length} amarillo · ${informe.items.filter((i) => i.color === "rojo").length} rojo)`);
  void persist("validación de alineación", async (db) => {
    const companyId = cid();
    const data = { inputHash, content: informe as unknown as object, model, by: user.email, at: new Date(saved.at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind, subject } }, update: data, create: { companyId, kind, subject, ...data } });
  });
  return { ok: true, saved };
}


/* ═══ Capacidades para ejecutar (módulo Capacidades) ═══
   Con el portafolio decidido (implementar o preparar), cada iniciativa se recorre con el checklist de cinco frentes.
   El checklist personalizado por la IA y la revisión se guardan en DiagnosticReport (kinds capacidades-checklist y
   capacidades, subject = id de la iniciativa). */

export type ElegibleCap = { id: string; decision: Decision };
/** Iniciativas del portafolio con decisión «implementar» o «preparar»: solo esas se revisan. */
export const elegiblesCapacidades = (): ElegibleCap[] => {
  // las iniciativas de un objetivo descartado no avanzan a capacidades aunque tuvieran decisión
  const descartados = new Set(cat().objectives.filter((o) => o.descartado).map((o) => o.id));
  return cat().initiatives.flatMap((i) => { const d = decisions().get(i.id)?.decision; return !descartados.has(i.cmi) && (d === "IMPLEMENTAR" || d === "PREPARAR") ? [{ id: i.id, decision: d }] : []; });
};

export const getChecklistCap = (iniId: string): ChecklistCap | null => {
  const g = informes().get(`capacidades-checklist|${iniId}`);
  return g ? (g.informe as unknown as ChecklistCap) : null;
};
export const getChecklistsCap = (): Record<string, ChecklistCap> => Object.fromEntries([...informes().values()].filter((g) => g.kind === "capacidades-checklist").map((g) => [g.subject, g.informe as unknown as ChecklistCap]));
export const getRevisionesCap = (): Record<string, RevisionCapacidades> => Object.fromEntries([...informes().values()].filter((g) => g.kind === "capacidades").map((g) => [g.subject, g.informe as unknown as RevisionCapacidades]));

/** Quién revisa: quien administra la estrategia, el sponsor de la prioridad y el responsable de la iniciativa. */
export function puedeRevisarCap(user: SessionUser, i: InitiativeFull): boolean {
  if (can(user, "manage_catalog")) return true;
  if (user.role !== "RESPONSABLE" || !user.responsibleId) return false;
  if (i.ownerId === user.responsibleId) return true;
  const o = cat().objectives.find((x) => x.id === i.cmi);
  const lever = (cat().company.levers ?? []).find((l) => l.id === o?.lever);
  return !!lever && lever.ownerId === user.responsibleId;
}

function guardarInformeCap(user: SessionUser, kind: "capacidades" | "capacidades-checklist", iniId: string, content: object, model: string, inputHash: string) {
  const saved: InformeGuardado = { kind, subject: iniId, inputHash, informe: content as unknown as InformeIA, model, by: user.email, at: ahora().toISOString() };
  informes().set(`${kind}|${iniId}`, saved);
  void persist(kind === "capacidades" ? "revisión de capacidades" : "checklist de capacidades", async (db) => {
    const companyId = cid();
    const data = { inputHash, content, model, by: user.email, at: new Date(saved.at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind, subject: iniId } }, update: data, create: { companyId, kind, subject: iniId, ...data } });
  });
}

export function saveChecklistCap(user: SessionUser, iniId: string, frentes: Frente[], resumen: string, model: string): { ok: true; checklist: ChecklistCap } | { ok: false; status: number; error: string } {
  if (!(can(user, "manage_catalog") && (user.role === "ADMIN" || user.role === "CONSULTOR"))) return { ok: false, status: 403, error: "El checklist lo personaliza el advisor o el administrador." };
  const i = cat().initiatives.find((x) => x.id === iniId);
  if (!i) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!elegiblesCapacidades().some((e) => e.id === iniId)) return { ok: false, status: 422, error: "Solo se revisan las iniciativas con decisión «implementar» o «preparar» en el portafolio." };
  const checklist: ChecklistCap = { iniId, frentes, resumen, by: user.email, at: ahora().toISOString(), model };
  guardarInformeCap(user, "capacidades-checklist", iniId, checklist, model, checklistHash(frentes));
  audit(user, "task", `capacidades-checklist:${iniId}`, `checklist de capacidades personalizado para ${iniId}`);
  return { ok: true, checklist };
}

export function saveRevisionCap(user: SessionUser, iniId: string, input: unknown): { ok: true; revision: RevisionCapacidades } | { ok: false; status: number; error: string } {
  const i = cat().initiatives.find((x) => x.id === iniId);
  if (!i) return { ok: false, status: 404, error: "La iniciativa no existe." };
  if (!puedeRevisarCap(user, i)) return { ok: false, status: 403, error: "La revisión la registran el advisor, el sponsor de la prioridad o el responsable de la iniciativa." };
  if (!elegiblesCapacidades().some((e) => e.id === iniId)) return { ok: false, status: 422, error: "Solo se revisan las iniciativas con decisión «implementar» o «preparar» en el portafolio." };
  const frentes = getChecklistCap(iniId)?.frentes ?? FRENTES;
  const r = normalizarRevision(input, iniId, user.email, frentes);
  if (!r.ok) return { ok: false, status: 422, error: r.error };
  guardarInformeCap(user, "capacidades", iniId, r.revision, "manual", r.revision.checklist);
  const lect = lecturaCapacidades(r.revision, frentes);
  audit(user, "task", `capacidades:${iniId}`, `capacidades para ejecutar ${iniId}: ${lect.semaforo ?? "incompleta"}${lect.brechas.length ? ` · brechas en ${lect.brechas.map((b) => b.name.toLowerCase()).join(", ")}` : ""}`);
  return { ok: true, revision: r.revision };
}

/** Lectura compacta del diagnóstico consolidado (Fuente 1) para el encargo a la IA: promedio por dimensión. */
export function diagnosticoResumenCap(): string {
  const rows = [...f1Store().values()];
  if (!rows.length) return "";
  const lecturas = rows.map((x) => lecturaF1(x.r));
  return DIMS.map((d) => { const ms = lecturas.map((l) => l.dims.find((x) => x.d.code === d.code)?.m ?? null).filter((m): m is number => m != null); const m = avg(ms); return m == null ? null : `${d.code} ${d.name}: ${m.toFixed(1)}/5${m < THRESHOLD ? " (brecha)" : ""}`; }).filter(Boolean).join("; ") + ` · ${rows.length} autoevaluaciones.`;
}

/* ═══ Calificabilidad (acompañamiento, F16 · condición de entrada) ═══
   Se califica toda iniciativa vinculada a un resultado clave cuyo objetivo siga en pie (no descartado y con
   prioridad). Lo demás ya no bloquea: resultado clave incompleto, formulación incompleta o validación en
   amarillo, en rojo o sin hacer quedan como `aviso` — pendientes que el comité ve mientras califica. */

export type Calificabilidad = { ok: boolean; motivo?: string; etapa?: "kr" | "formulacion" | "validacion"; aviso?: string };

/** Por qué no se califica una iniciativa sin resultado clave: las de categoría quedan mapeadas, a la espera de uno. */
const SIN_KR = (i: InitiativeFull) => (i.categoria ? `${categoriaLabel(i.categoria)!.toLowerCase()} sin resultado clave: queda mapeada y entra a Priorización cuando se le asocie uno` : "sin resultado clave vinculado");

export function calificabilidad(i: InitiativeFull): Calificabilidad {
  const c = cat();
  if (!i.kpi) return { ok: false, etapa: "kr", motivo: SIN_KR(i) };
  const k = c.kpis.find((x) => x.code === i.kpi);
  if (!k) return { ok: false, etapa: "kr", motivo: "el resultado clave vinculado ya no existe" };
  const obj = c.objectives.find((o) => o.id === i.cmi || o.id === k.cmi);
  if (obj?.descartado) return { ok: false, etapa: "kr", motivo: `su objetivo directivo ${obj.id} está descartado` };
  if (obj && !objetivoConPrioridad(c, obj)) return { ok: false, etapa: "kr", motivo: `su objetivo directivo ${obj.id} no está vinculado a una prioridad estratégica` };
  // desde aquí nada bloquea: se reúnen los pendientes y se devuelven como aviso
  const avisos: string[] = [];
  let etapa: Calificabilidad["etapa"];
  const faltanKr = krFaltantes(k);
  if (faltanKr.length) { avisos.push(`resultado clave ${k.code} incompleto (sin ${faltanKr.join(", ")})`); etapa ??= "kr"; }
  for (const code of (i.krExtra ?? [])) {
    const kx = c.kpis.find((x) => x.code === code);
    if (!kx) { avisos.push(`el resultado clave adicional ${code} ya no existe`); etapa ??= "kr"; continue; }
    const fx = krFaltantes(kx); if (fx.length) { avisos.push(`resultado clave adicional ${code} incompleto (sin ${fx.join(", ")})`); etapa ??= "kr"; }
  }
  const Q = /^\d{4}-T[1-4]$/;
  const faltan: string[] = [];
  if ((i.objetivo ?? "").trim().length < 15) faltan.push("qué logra");
  if (!i.ownerId) faltan.push("responsable");
  if (!(Q.test(i.start ?? "") && Q.test(i.end ?? ""))) faltan.push("inicio y fin");
  if (!i.capability) faltan.push("capacidad que instala");
  if (!((i.budgetPlanned ?? 0) > 0)) faltan.push("presupuesto planeado");
  if (faltan.length) { avisos.push(`formulación incompleta (falta ${faltan.join(", ")})`); etapa ??= "formulacion"; }
  const val = informes().get(`alineacion-ini|${i.horizon}`);
  const item = val ? ((val.informe as unknown as { items?: { id: string; color: string }[] }).items ?? []).find((x) => x.id === i.id) : undefined;
  if (!item) { avisos.push("sin validar en Iniciativas"); etapa ??= "validacion"; }
  else if (item.color === "rojo") { avisos.push("la validación la marca por replantear"); etapa ??= "validacion"; }
  else if (item.color !== "verde") { avisos.push("parcialmente alineada: la validación pide mejoras"); etapa ??= "validacion"; }
  return avisos.length ? { ok: true, etapa, aviso: avisos.join("; ") } : { ok: true };
}

export const calificables = (): Record<string, Calificabilidad> => Object.fromEntries(cat().initiatives.map((i) => [i.id, cat().company.mode === "acompanamiento" ? calificabilidad(i) : (i.kpi ? { ok: true } : { ok: false, etapa: "kr", motivo: SIN_KR(i) })]));

/* ═══ Madurez digital · diagnóstico de transformación digital ═══
   El instrumento depende del tipo de organización (empresa o institución educativa). Cada persona
   de la empresa responde su percepción (una afirmación por variable); la percepción de la variable
   es el promedio de esas respuestas. La evidencia D/I/K, el nivel, la meta, el hallazgo, la
   recomendación y las salvaguardas las registra el advisor, que también publica el corte y, si
   nadie ha respondido, puede anotar la percepción acordada en sesión. La medición nace vacía. */

const madState = () => S().madurez;
export const orgKindOf = (): OrgKind => (cat().company.orgKind === "educativa" ? "educativa" : "empresa");
const madInstrument = () => instrumentOf(orgKindOf());
const gradesMadurez = (u: SessionUser) => u.role === "ADMIN" || u.role === "CONSULTOR";
const madRecord = (id: string, data: unknown) => persist("madurez digital", (db) => db.maturityRecord.upsert({ where: { companyId_id: { companyId: cid(), id } }, update: { data: data as never }, create: { companyId: cid(), id, data: data as never } }));
const respKey = (u: SessionUser) => u.email.trim().toLowerCase();
type MadFail = { ok: false; status: number; error: string };

/** Captura vigente con la percepción ya promediada: lo que leen las vistas y lo que se publica. */
function madVars(): Captures {
  const m = madState(), out: Captures = {};
  for (const v of madInstrument().variables) {
    const base = m.vars.get(v.id), p = perceptionOf(m.resps.values(), v.id);
    if (!base && !p) continue;
    out[v.id] = { ...(base ?? { by: "", at: "" }), ...(p ? { perception: p.value, perceptionN: p.n } : {}) };
  }
  return out;
}

/** Captura vigente, salvaguardas y cortes del instrumento que aplica a la empresa, la respuesta propia
 *  de percepción y la participación (el advisor ve quién respondió y cuánto, no qué respondió cada quien). */
export function getMadurez(user: SessionUser) {
  const m = madState(), ins = madInstrument(), ids = new Set(ins.variables.map((v) => v.id));
  const vars = madVars(), cal = gradesMadurez(user);
  const contadas = (r: MadResponse) => Object.keys(r.answers).filter((id) => ids.has(id)).length;
  const todas = [...m.resps.values()].filter((r) => contadas(r) > 0);
  const mia = m.resps.get(respKey(user));
  return {
    kind: ins.kind, vars, safeguards: { ...m.safeguards }, cuts: m.cuts.filter((c) => c.kind === ins.kind), progress: progressOf(ins, vars), puede: { calificar: cal },
    mia: { answers: Object.fromEntries(Object.entries(mia?.answers ?? {}).filter(([id]) => ids.has(id))), at: mia?.at ?? null, done: mia && contadas(mia) >= ins.variables.length ? mia.done ?? mia.at : null },
    participacion: { personas: todas.length, completas: todas.filter((r) => contadas(r) >= ins.variables.length).length,
      ...(cal ? { lista: todas.map((r) => ({ name: r.name, role: r.role, respondidas: contadas(r), at: r.at })).sort((a, b) => b.respondidas - a.respondidas || a.name.localeCompare(b.name)) } : {}) },
  };
}

/** Respuesta de percepción de quien tiene la sesión: de 1 a 5, 0 para «No lo sé», nulo para borrarla. */
export function respondMadurez(user: SessionUser, varId: unknown, value: unknown): { ok: true; response: MadResponse } | MadFail {
  const ins = madInstrument(), v = ins.variables.find((x) => x.id === varId);
  if (!v) return { ok: false, status: 404, error: "La afirmación no existe en el instrumento de esta empresa." };
  if (gradesMadurez(user)) return { ok: false, status: 403, error: "La percepción la responden las personas de la empresa; el advisor califica la evidencia y el nivel." };
  if (value !== null && !isPerceptionAnswer(value)) return { ok: false, status: 422, error: "La respuesta es un entero de 1 a 5, o 0 para «No lo sé»." };
  const key = respKey(user), prev = madState().resps.get(key), answers = { ...(prev?.answers ?? {}) };
  if (value === null) delete answers[v.id]; else answers[v.id] = value;
  const now = ahora().toISOString(), completa = ins.variables.every((x) => answers[x.id] !== undefined);
  const next: MadResponse = { email: key, name: user.name, role: user.role, answers, at: now, ...(completa ? { done: prev?.done ?? now } : {}) };
  madState().resps.set(key, next);
  if (completa && !prev?.done) audit(user, "task", "madurez:percepcion", "madurez digital: percepción completada");
  void madRecord(`resp:${key}`, next);
  return { ok: true, response: next };
}

/** Percepción completa de una persona en una sola escritura (carga en bloque: la usa la siembra de la demo). */
export function respondMadurezLote(user: SessionUser, respuestas: Record<string, number>): { ok: true; response: MadResponse } | MadFail {
  const ins = madInstrument();
  if (gradesMadurez(user)) return { ok: false, status: 403, error: "La percepción la responden las personas de la empresa; el advisor califica la evidencia y el nivel." };
  const answers: Record<string, number> = {};
  for (const [id, v] of Object.entries(respuestas ?? {})) {
    if (!ins.variables.some((x) => x.id === id)) return { ok: false, status: 404, error: `La afirmación ${id} no existe en el instrumento de esta empresa.` };
    if (!isPerceptionAnswer(v)) return { ok: false, status: 422, error: "La respuesta es un entero de 1 a 5, o 0 para «No lo sé»." };
    answers[id] = v;
  }
  const key = respKey(user), prev = madState().resps.get(key), now = ahora().toISOString(), todas = { ...(prev?.answers ?? {}), ...answers };
  const completa = ins.variables.every((x) => todas[x.id] !== undefined);
  const next: MadResponse = { email: key, name: user.name, role: user.role, answers: todas, at: now, ...(completa ? { done: prev?.done ?? now } : {}) };
  madState().resps.set(key, next);
  if (completa && !prev?.done) audit(user, "task", "madurez:percepcion", "madurez digital: percepción completada");
  void madRecord(`resp:${key}`, next);
  return { ok: true, response: next };
}

export function captureMadurez(user: SessionUser, varId: unknown, patch: unknown): { ok: true; capture: MadCapture } | MadFail {
  const v = madInstrument().variables.find((x) => x.id === varId);
  if (!v) return { ok: false, status: 404, error: "La variable no existe en el instrumento de esta empresa." };
  const p = (patch && typeof patch === "object" ? patch : {}) as Partial<Record<CaptureField, unknown>>;
  const keys = CAPTURE_FIELDS.filter((k) => p[k] !== undefined);
  if (!keys.length) return { ok: false, status: 422, error: "No hay cambios que guardar." };
  if (!gradesMadurez(user)) {
    return { ok: false, status: 403, error: "La evidencia, el nivel, la meta, el hallazgo y la recomendación los registra el advisor; tu aporte es el diagnóstico de percepción." };
  }
  const err = captureError(p);
  if (err) return { ok: false, status: 422, error: err };
  const next: MadCapture = { ...(madState().vars.get(v.id) ?? {}), by: user.name, at: ahora().toISOString() };
  const campos = next as unknown as Record<string, unknown>;
  for (const k of keys) {
    const val = p[k];
    const texto = typeof val === "string" ? val.trim().slice(0, 1200) : val;
    if (texto === null || texto === "") delete campos[k]; else campos[k] = texto;
  }
  madState().vars.set(v.id, next);
  audit(user, "task", `madurez:${v.id}`, `madurez digital: ${keys.join(", ")}`);
  void madRecord(`var:${v.id}`, next);
  return { ok: true, capture: madVars()[v.id] ?? next };
}

/** Guarda el análisis con IA de Madurez digital: la lectura personal (de quien responde) o el informe
 *  de resultados de una medición (lo genera el advisor). Va a la misma tabla que los demás informes. */
export function saveMadInforme(user: SessionUser, kind: "madurez" | "madurez-persona", subject: string, inputHash: string, content: unknown, model = "openai"): { ok: true; saved: InformeGuardado } | MadFail {
  if (kind === "madurez" && !gradesMadurez(user)) return { ok: false, status: 403, error: "El informe de resultados lo genera el advisor." };
  if (kind === "madurez-persona" && subject !== respKey(user)) return { ok: false, status: 403, error: "Solo puedes generar la lectura de tu propio diagnóstico." };
  const saved: InformeGuardado = { kind, subject, inputHash, informe: content as InformeIA, model, by: user.email, at: ahora().toISOString() };
  informes().set(`${kind}|${subject}`, saved);
  if (kind === "madurez") audit(user, "task", `madurez:informe:${subject}`, "madurez digital: informe de resultados generado con IA");
  void persist("informe de madurez digital", async (db) => {
    const companyId = cid();
    const data = { inputHash, content: content as object, model, by: user.email, at: new Date(saved.at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind, subject } }, update: data, create: { companyId, kind, subject, ...data } });
  });
  return { ok: true, saved };
}

/* ═══ Base de Inteligencia de la empresa: hechos investigados para su industria ═══ */

export type BaseInteligenciaGuardada = { base: unknown; at: string; model: string; by: string };
/** La base investigada que tiene guardada la empresa, o nulo si aún no se ha investigado su industria. */
export const getBaseInteligencia = (): BaseInteligenciaGuardada | null => { const g = informes().get("inteligencia|base"); return g ? { base: g.informe as unknown, at: g.at, model: g.model, by: g.by } : null; };
/** Guarda la base investigada (la reemplaza completa). `by`: quien la pidió, o «plataforma» cuando se crea con el espacio de la empresa. */
export function saveBaseInteligencia(by: string, content: unknown, model: string, industria: string): BaseInteligenciaGuardada {
  const at = ahora().toISOString();
  informes().set("inteligencia|base", { kind: "inteligencia", subject: "base", inputHash: industria.slice(0, 190), informe: content as InformeIA, model, by, at });
  void persist("base de inteligencia", async (db) => {
    const companyId = cid();
    const data = { inputHash: industria.slice(0, 190), content: content as object, model, by, at: new Date(at) };
    await db.diagnosticReport.upsert({ where: { companyId_kind_subject: { companyId, kind: "inteligencia", subject: "base" } }, update: data, create: { companyId, kind: "inteligencia", subject: "base", ...data } });
  });
  return { base: content, at, model, by };
}
/** Quita la base investigada de la empresa (queda la curada del sector). */
export function clearBaseInteligencia(by: string): void {
  if (!informes().delete("inteligencia|base")) return;
  audit({ email: by, name: by, role: "CONSULTOR" }, "task", "inteligencia:base", "base de inteligencia: investigación de la industria retirada");
  void persist("base de inteligencia", async (db) => { await db.diagnosticReport.deleteMany({ where: { companyId: cid(), kind: "inteligencia", subject: "base" } }); });
}
/** Líneas del instrumento de madurez digital de la empresa: con ellas se clasifican los hechos digitales de la industria. */
export const lineasMadurez = () => madInstrument().lines.map((l) => ({ n: l.n, name: l.name, short: l.short, color: l.color }));

export function setMadSafeguard(user: SessionUser, id: unknown, status: unknown, note: unknown): { ok: true; safeguards: SafeguardState } | MadFail {
  if (!gradesMadurez(user)) return { ok: false, status: 403, error: "Las salvaguardas las evalúa el advisor." };
  const def = madInstrument().safeguards.find((s) => s.id === id);
  if (!def) return { ok: false, status: 404, error: "La salvaguarda no existe en el instrumento de esta empresa." };
  const sg = { ...madState().safeguards };
  if (status === null || status === "") delete sg[def.id];
  else if (status === "CUMPLE" || status === "PARCIAL" || status === "FALLA") sg[def.id] = { status: status as SafeguardStatus, ...(typeof note === "string" && note.trim() ? { note: note.trim().slice(0, 600) } : {}) };
  else return { ok: false, status: 422, error: "El estado de la salvaguarda es Cumple, Parcial o Falla." };
  madState().safeguards = sg;
  audit(user, "task", `madurez:${def.id}`, `salvaguarda ${def.id}: ${sg[def.id]?.status ?? "sin evaluar"}`);
  void madRecord("sg", sg);
  return { ok: true, safeguards: sg };
}

/** Publica el corte: exige todas las variables con nivel. La captura queda abierta para el corte siguiente. */
export function publishMadurez(user: SessionUser, label: unknown): { ok: true; cut: MadCut } | MadFail {
  if (!gradesMadurez(user)) return { ok: false, status: 403, error: "Solo el advisor publica un corte de la medición." };
  const m = madState(), ins = madInstrument();
  const vars = madVars();
  const prog = progressOf(ins, vars);
  if (prog.level < prog.total) return { ok: false, status: 422, error: `Faltan ${prog.total - prog.level} variables por calificar con nivel. Una medición parcial no se publica.` };
  const n = m.cuts.length + 1;
  const cut: MadCut = { id: `C${n}`, label: (typeof label === "string" && label.trim() ? label.trim().slice(0, 80) : `Corte ${m.cuts.filter((c) => c.kind === ins.kind).length + 1}`), at: ahora().toISOString(), by: user.name, kind: ins.kind, vars, safeguards: { ...m.safeguards } };
  m.cuts.push(cut);
  audit(user, "task", `madurez:${cut.id}`, `madurez digital: corte publicado «${cut.label}»`);
  void madRecord(`cut:${cut.id}`, cut);
  return { ok: true, cut };
}

/* ═══ Gestión de proyectos · riesgos y problemas ═══
   Cada proyecto (iniciativa) lleva su registro de riesgos. Los edita quien puede editar las tareas de
   ese proyecto. La auditoría guarda cada cambio con un formato fijo («estado A → B», «nivel 12 → 6»,
   «severidad N» al final) porque el tablero de impacto lo lee para clasificar el movimiento. */

const riesgosState = () => S().riesgos;
export const getRisks = (iniId?: string): ProjectRisk[] => [...riesgosState().values()].filter((r) => !iniId || r.iniId === iniId).sort((a, b) => severidad(b) - severidad(a) || a.id.localeCompare(b.id));
const riesgoRecord = (r: ProjectRisk) => persist("riesgo del proyecto", (db) => db.projectRecord.upsert({ where: { companyId_id: { companyId: cid(), id: `risk:${r.id}` } }, update: { data: r as never }, create: { companyId: cid(), id: `risk:${r.id}`, data: r as never } }));
type RiskFail = { ok: false; status: number; error: string };

export function upsertRisk(user: SessionUser, input: RiskInput): { ok: true; risk: ProjectRisk } | RiskFail {
  const c = cat(), prev = input.id ? riesgosState().get(String(input.id)) : undefined;
  if (input.id && !prev) return { ok: false, status: 404, error: "El riesgo no existe." };
  const ini = c.initiatives.find((i) => i.id === (prev?.iniId ?? input.iniId));
  if (!ini) return { ok: false, status: 422, error: "Elige el proyecto al que pertenece el riesgo." };
  if (!can(user, "edit_tasks", ini)) return { ok: false, status: 403, error: user.role === "DIRECTIVO" ? "Tu rol es de consulta: no registra riesgos." : `No puedes registrar riesgos de ${resName(user, ini)}: tu ámbito es ${scopeName(user)}.` };
  const datos: RiskInput = { ...prev, ...input };
  const err = riskError(datos); if (err) return { ok: false, status: 422, error: err };
  const ownerId = str(datos.ownerId, 10);
  if (ownerId && !c.people.some((p) => p.id === ownerId)) return { ok: false, status: 422, error: "El responsable de la respuesta debe ser una persona del directorio." };
  const krsIni = krsDeIniciativa(ini);
  const krs = Array.isArray(datos.krs) ? [...new Set(datos.krs.map((x) => str(x, 20).toUpperCase()))].filter((x) => krsIni.includes(x)) : [];
  const now = ahora().toISOString();
  const id = prev?.id ?? (() => { let n = 1; while (riesgosState().has(`RG-${ini.id}-${String(n).padStart(2, "0")}`)) n++; return `RG-${ini.id}-${String(n).padStart(2, "0")}`; })();
  const risk: ProjectRisk = {
    id, iniId: ini.id, title: str(datos.title, 200), ...(str(datos.desc, 1200) ? { desc: str(datos.desc, 1200) } : {}), category: datos.category!, probability: datos.probability!, impact: datos.impact!, status: datos.status!,
    ...(ownerId ? { ownerId } : {}), ...(str(datos.mitigation, 1200) ? { mitigation: str(datos.mitigation, 1200) } : {}), ...(datos.due ? { due: datos.due } : {}), ...(krs.length && krs.length < krsIni.length ? { krs } : {}),
    createdBy: prev?.createdBy ?? user.email, createdAt: prev?.createdAt ?? now, updatedAt: now, ...(datos.status === "CERRADO" ? { closedAt: prev?.closedAt ?? now } : {}),
  };
  const cambios: string[] = [];
  if (!prev) cambios.push(`riesgo registrado · «${risk.title}»`);
  else {
    if (prev.status !== risk.status) cambios.push(`estado ${prev.status} → ${risk.status}`);
    if (severidad(prev) !== severidad(risk)) cambios.push(`nivel ${severidad(prev)} → ${severidad(risk)}`);
    if ((prev.mitigation ?? "") !== (risk.mitigation ?? "")) cambios.push("respuesta actualizada");
    if (!cambios.length && JSON.stringify({ ...prev, updatedAt: "" }) !== JSON.stringify({ ...risk, updatedAt: "" })) cambios.push("datos del riesgo actualizados");
    if (!cambios.length) return { ok: true, risk: prev };
  }
  riesgosState().set(id, risk);
  audit(user, "task", id, `${cambios.join(" · ")} · severidad ${severidad(risk)}`);
  void riesgoRecord(risk);
  return { ok: true, risk };
}

export function removeRisk(user: SessionUser, id: unknown): { ok: true } | RiskFail {
  const prev = riesgosState().get(String(id));
  if (!prev) return { ok: false, status: 404, error: "El riesgo no existe." };
  const ini = cat().initiatives.find((i) => i.id === prev.iniId);
  if (!can(user, "edit_tasks", ini)) return { ok: false, status: 403, error: "No puedes eliminar riesgos de este proyecto." };
  riesgosState().delete(prev.id);
  audit(user, "task", prev.id, `riesgo eliminado · «${prev.title}»`);
  void persist("riesgo del proyecto", (db) => db.projectRecord.deleteMany({ where: { companyId: cid(), id: `risk:${prev.id}` } }));
  return { ok: true };
}

/* ═══ Gestión de proyectos · presupuesto: compromisos y ejecuciones ═══
   Cada movimiento es un registro propio (no se edita: si hubo un error, se elimina y se registra de nuevo). Lo
   registra quien puede editar las tareas del proyecto. La auditoría lleva el monto y el concepto, y el tablero
   de impacto lo muestra como movimiento. */

const gastosState = () => S().gastos;
export const getGastos = (iniId?: string): Gasto[] => [...gastosState().values()].filter((g) => !iniId || g.iniId === iniId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.at.localeCompare(a.at));

export function addGasto(user: SessionUser, input: GastoInput): { ok: true; gasto: Gasto } | RiskFail {
  const ini = cat().initiatives.find((i) => i.id === input.iniId);
  if (!ini) return { ok: false, status: 422, error: "Elige el proyecto al que pertenece el movimiento." };
  if (!can(user, "edit_tasks", ini)) return { ok: false, status: 403, error: user.role === "DIRECTIVO" ? "Tu rol es de consulta: no registra movimientos de presupuesto." : `No puedes registrar presupuesto de ${resName(user, ini)}: tu ámbito es ${scopeName(user)}.` };
  const err = gastoError(input); if (err) return { ok: false, status: 422, error: err };
  if (!(ini.budgetPlanned > 0)) return { ok: false, status: 422, error: "Este proyecto no tiene presupuesto planeado: defínelo en la ficha de la iniciativa antes de registrar movimientos." };
  let n = 1; while (gastosState().has(`GS-${ini.id}-${String(n).padStart(2, "0")}`)) n++;
  const moneda = ini.budgetCurrency ?? (cat().company.currency === "USD" ? "USD" : "COP");
  const gasto: Gasto = { id: `GS-${ini.id}-${String(n).padStart(2, "0")}`, iniId: ini.id, tipo: input.tipo!, concepto: str(input.concepto, 200), monto: Math.round(input.monto! * 100) / 100, fecha: input.fecha!,
    ...(str(input.soporte, 200) ? { soporte: str(input.soporte, 200) } : {}), by: user.email, at: ahora().toISOString() };
  gastosState().set(gasto.id, gasto);
  audit(user, "task", gasto.id, `${gasto.tipo === "EJECUCION" ? "ejecución registrada" : "compromiso registrado"} por ${dinero(gasto.monto, moneda)} · «${gasto.concepto}»`);
  void persist("movimiento de presupuesto", (db) => db.projectRecord.upsert({ where: { companyId_id: { companyId: cid(), id: `gasto:${gasto.id}` } }, update: { data: gasto as never }, create: { companyId: cid(), id: `gasto:${gasto.id}`, data: gasto as never } }));
  return { ok: true, gasto };
}

export function removeGasto(user: SessionUser, id: unknown): { ok: true } | RiskFail {
  const prev = gastosState().get(String(id));
  if (!prev) return { ok: false, status: 404, error: "El movimiento no existe." };
  const ini = cat().initiatives.find((i) => i.id === prev.iniId);
  if (!can(user, "edit_tasks", ini)) return { ok: false, status: 403, error: "No puedes eliminar movimientos de presupuesto de este proyecto." };
  gastosState().delete(prev.id);
  audit(user, "task", prev.id, `movimiento de presupuesto eliminado · «${prev.concepto}»`);
  void persist("movimiento de presupuesto", (db) => db.projectRecord.deleteMany({ where: { companyId: cid(), id: `gasto:${prev.id}` } }));
  return { ok: true };
}
