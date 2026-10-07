// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de una empresa: todo lo que la plataforma gestiona POR EMPRESA y
// que antes vivía como constantes de Andina (objetivos, KPI, iniciativas,
// personas, tareas del plan, mediciones, evidencias, finanzas y territorio).
// El mapa 4Shine (capacidades, dimensiones, prácticas) no está aquí: es la
// definición del sistema y es igual para todas las empresas.
// ─────────────────────────────────────────────────────────────────────────────

import {
  RESPONSIBLES, CMI_OBJECTIVES, KPI_CATALOG, EVIDENCE_CATALOG, INITIATIVES_FULL, SCORES_HISTORY,
  type Responsible, type CmiObjective, type KpiFull, type EvidenceFull, type InitiativeFull, type AssessmentRecord,
} from "@/data/cmi";
import { PEOPLE, TASKS, type Person, type Task } from "@/data/proyectos";
import { INSTITUTION, FINANCIALS, TERRITORIES, DEMO_USERS, type Territory } from "@/data/demo";
import { OD_RESPONSES } from "@/data/od-demo";
import { EVALUATIONS_SEED, DECISIONS_SEED, type DecisionRecord } from "@/data/priorizacion-demo";
import type { Response as OdResponse } from "@/lib/od";
import type { Evaluation } from "@/lib/priorizacion";
import { PRACTICES } from "@/data/mapa";

export type CompanyInfo = {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  department: string;
  sector: string;
  size: string;
  sectorKey: string;        // sector de referencia para M2/M7 (src/data/sector/<key>.json)
  ciiu: string;
  country?: "CO" | "EC";    // país: mapa territorial (departamentos/provincias) y benchmark
  currency?: "COP" | "USD"; // moneda de las cifras financieras
  active: boolean;
  template?: "demo" | "vacia";
  createdBy?: string;
  createdAt?: string;
};

export type Financials = typeof FINANCIALS;

export type SeedUser = { email: string; name: string; role: "ADMIN" | "CONSULTOR" | "LIDER" | "RESPONSABLE" | "DIRECTIVO"; line?: number };

export type Catalog = {
  company: CompanyInfo;
  responsibles: Responsible[];
  objectives: CmiObjective[];
  kpis: KpiFull[];
  evidences: EvidenceFull[];
  initiatives: InitiativeFull[];
  people: Person[];
  tasks: Task[];                       // plan de trabajo aprobado (línea base)
  assessments: AssessmentRecord[];     // mediciones publicadas y en captura
  financials: Financials | null;
  territories: Territory[];
  demoResponses: OdResponse[];         // fuentes demo del 4Shine-OD (solo la plantilla)
  seedEvaluations: Evaluation[];       // matriz de priorización demo
  seedDecisions: DecisionRecord[];
  seedUsers: SeedUser[];               // cuentas iniciales de la empresa
};

/** Catálogo de Andina Suministros: la plantilla de demostración. */
export const ANDINA_CATALOG: Catalog = {
  company: {
    slug: INSTITUTION.slug, name: INSTITUTION.name, shortName: INSTITUTION.shortName, city: INSTITUTION.city,
    department: INSTITUTION.department, sector: INSTITUTION.sector, size: INSTITUTION.size,
    sectorKey: INSTITUTION.sectorKey, ciiu: INSTITUTION.ciiu, active: true, template: "demo",
  },
  responsibles: RESPONSIBLES, objectives: CMI_OBJECTIVES, kpis: KPI_CATALOG, evidences: EVIDENCE_CATALOG,
  initiatives: INITIATIVES_FULL, people: PEOPLE, tasks: TASKS, assessments: SCORES_HISTORY,
  financials: FINANCIALS, territories: TERRITORIES, demoResponses: OD_RESPONSES,
  seedEvaluations: EVALUATIONS_SEED, seedDecisions: DECISIONS_SEED,
  seedUsers: DEMO_USERS.filter((u) => u.role !== "ADMIN").map((u) => ({ email: u.email, name: u.name, role: u.role, line: "line" in u ? (u as { line?: number }).line : undefined })),
};

/** Evidencias del mapa para una empresa nueva: una por práctica, pendiente de
    verificación, con el título y el tipo deducidos de la evidencia esperada. */
export function evidencesForMap(): EvidenceFull[] {
  const kindOf = (text: string): EvidenceFull["kind"] => {
    const t = text.toLowerCase();
    if (/acta|memo/.test(t)) return "Acta";
    if (/tablero|sistema|crm|reporte autom/.test(t)) return "Sistema";
    if (/encuesta|medici[oó]n de clima/.test(t)) return "Encuesta";
    if (/registro|inventario|calendario|matriz|mapa|lista/.test(t)) return "Registro";
    if (/informe|an[aá]lisis|proyecci[oó]n/.test(t)) return "Informe";
    return "Documento";
  };
  const firstSentence = (t: string) => { const m = t.match(/^[^.]+\./); return (m ? m[0] : t).replace(/\.$/, ""); };
  return PRACTICES.map((p, i) => ({
    id: `EV-${String(i + 1).padStart(2, "0")}`, line: p.line, dimension: p.dim, practice: p.code,
    title: firstSentence(p.ev), kind: kindOf(p.ev), date: "", status: "PENDIENTE", sourceId: "",
  }));
}

/** Catálogo vacío: la empresa arranca con el mapa 4Shine (y sus 68 evidencias
    por verificar) y sin portafolio. */
export function emptyCatalog(company: CompanyInfo): Catalog {
  return {
    company, responsibles: [], objectives: [], kpis: [], evidences: evidencesForMap(), initiatives: [], people: [], tasks: [],
    assessments: [], financials: null, territories: [], demoResponses: [], seedEvaluations: [], seedDecisions: [], seedUsers: [],
  };
}

/** Copia profunda de la plantilla para otra empresa (los códigos se conservan;
    la identidad, las finanzas y el territorio son de la empresa nueva). */
export function catalogFromTemplate(company: CompanyInfo): Catalog {
  const c = structuredClone(ANDINA_CATALOG);
  return { ...c, company, seedUsers: [], financials: null, territories: [] };
}

/** Usuarios de plataforma (sin empresa): administran empresas y cuentas. */
export const PLATFORM_USERS: SeedUser[] = DEMO_USERS.filter((u) => u.role === "ADMIN").map((u) => ({ email: u.email, name: u.name, role: u.role }));

export const responsibleIn = (cat: Catalog, id: string): Responsible =>
  cat.responsibles.find((r) => r.id === id) ?? { id, cargo: "Sin responsable", dependencia: "—", rolPlataforma: "CONSULTA" };
export const personIn = (cat: Catalog, id: string): Person =>
  cat.people.find((p) => p.id === id) ?? { id, name: "Sin asignar", cargo: "—", dependencia: "—", email: "", responsibleId: "" };
