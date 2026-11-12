// Gestión de proyectos · registro de riesgos y problemas de cada proyecto (iniciativa).
// Un riesgo es algo que puede pasar; cuando pasa queda «materializado» y es un problema que se
// atiende. La severidad es probabilidad × impacto (1 a 25). Aquí viven los tipos y las reglas
// puras; el store guarda, exige permisos y deja la traza en la auditoría.

export type RiskStatus = "ABIERTO" | "EN_MITIGACION" | "MATERIALIZADO" | "CERRADO";
export const RISK_STATUS: { id: RiskStatus; label: string; desc: string; chip: string }[] = [
  { id: "ABIERTO", label: "Abierto", desc: "Identificado, sin plan de respuesta en marcha.", chip: "chip-warn" },
  { id: "EN_MITIGACION", label: "En mitigación", desc: "Hay una respuesta en curso que reduce su probabilidad o su impacto.", chip: "chip-cyan" },
  { id: "MATERIALIZADO", label: "Materializado", desc: "Ya ocurrió: es un problema que afecta al proyecto.", chip: "chip-bad" },
  { id: "CERRADO", label: "Cerrado", desc: "Dejó de amenazar al proyecto o se resolvió.", chip: "chip-ok" },
];
export const riskStatusLabel = (s: string) => RISK_STATUS.find((x) => x.id === s)?.label ?? s;

export type RiskCategory = "ALCANCE" | "CRONOGRAMA" | "RECURSOS" | "PRESUPUESTO" | "CALIDAD" | "EXTERNO";
export const RISK_CATEGORIES: { id: RiskCategory; label: string }[] = [
  { id: "ALCANCE", label: "Alcance" }, { id: "CRONOGRAMA", label: "Cronograma" }, { id: "RECURSOS", label: "Personas y capacidad" },
  { id: "PRESUPUESTO", label: "Presupuesto" }, { id: "CALIDAD", label: "Calidad del entregable" }, { id: "EXTERNO", label: "Externo o regulatorio" },
];
export const riskCategoryLabel = (c: string) => RISK_CATEGORIES.find((x) => x.id === c)?.label ?? c;

export const ESCALA_PROB = ["Muy baja", "Baja", "Media", "Alta", "Muy alta"] as const;
export const ESCALA_IMPACTO = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"] as const;

export type ProjectRisk = {
  id: string;              // RG-i3-01
  iniId: string;           // proyecto (iniciativa) al que pertenece
  title: string;
  desc?: string;           // qué puede pasar y por qué
  category: RiskCategory;
  probability: number;     // 1–5
  impact: number;          // 1–5
  status: RiskStatus;
  ownerId?: string;        // persona que responde por la respuesta
  mitigation?: string;     // qué se hace para reducirlo o atenderlo
  due?: string;            // AAAA-MM-DD · fecha de la respuesta
  krs?: string[];          // resultados clave que amenaza; vacío: todos los del proyecto
  createdBy: string;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
  closedAt?: string;       // ISO
};

export const severidad = (r: Pick<ProjectRisk, "probability" | "impact">) => r.probability * r.impact;
export type NivelRiesgo = "ALTO" | "MEDIO" | "BAJO";
export const nivelRiesgo = (sev: number): NivelRiesgo => (sev >= 15 ? "ALTO" : sev >= 8 ? "MEDIO" : "BAJO");
export const NIVEL_RIESGO: Record<NivelRiesgo, { label: string; color: string; chip: string }> = {
  ALTO: { label: "Alto", color: "var(--bad)", chip: "chip-bad" },
  MEDIO: { label: "Medio", color: "var(--warn)", chip: "chip-warn" },
  BAJO: { label: "Bajo", color: "var(--ok)", chip: "chip-ok" },
};
/** ¿Sigue amenazando o afectando al proyecto? */
export const riesgoVivo = (r: Pick<ProjectRisk, "status">) => r.status !== "CERRADO";

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const entero15 = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

export type RiskInput = Partial<Omit<ProjectRisk, "id" | "createdBy" | "createdAt" | "updatedAt" | "closedAt">> & { id?: string };

/** Valida los datos de un riesgo; devuelve el error o nulo. */
export function riskError(r: RiskInput): string | null {
  if (typeof r.title !== "string" || r.title.trim().length < 5) return "Describe el riesgo en al menos 5 caracteres.";
  if (!RISK_CATEGORIES.some((c) => c.id === r.category)) return "Elige la categoría del riesgo.";
  if (!entero15(r.probability)) return "La probabilidad es un entero de 1 a 5.";
  if (!entero15(r.impact)) return "El impacto es un entero de 1 a 5.";
  if (!RISK_STATUS.some((s) => s.id === r.status)) return "El estado del riesgo no es válido.";
  if (r.due && !DIA.test(r.due)) return "La fecha de respuesta va como AAAA-MM-DD.";
  if ((r.status === "EN_MITIGACION" || r.status === "MATERIALIZADO") && !(r.mitigation ?? "").trim()) return r.status === "EN_MITIGACION" ? "Un riesgo en mitigación exige registrar qué se está haciendo." : "Un riesgo materializado exige registrar cómo se atiende el problema.";
  return null;
}
