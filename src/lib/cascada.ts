// ─────────────────────────────────────────────────────────────────────────────
// F04 · Cascada y plan trimestral (marco 4Shine Empresas, capacidad de Ejecución): bajar las prioridades
// de la empresa a metas trimestrales de cada área, con criterio de éxito, plan de acción (hitos con
// responsable, recursos y fecha), interdependencias entre áreas y cierre del trimestre con evaluación.
// Reglas puras: tipos, validación, propuesta desde el portafolio y lecturas del ciclo.
// ─────────────────────────────────────────────────────────────────────────────
import type { InitiativeFull } from "@/data/cmi";

export type HitoEstado = "PENDIENTE" | "EN_CURSO" | "HECHO";
export type MetaEstado = "PLANEADA" | "EN_CURSO" | "CUMPLIDA" | "PARCIAL" | "NO_CUMPLIDA";
export type Hito = { name: string; responsable?: string; fecha?: string; recursos?: string; estado: HitoEstado };
export type Dependencia = { areaId: string; que: string };
export type MetaTrimestral = {
  id: string;
  quarter: string;          // AAAA-Tn
  areaId: string;           // responsable del catálogo (área)
  lever: string;            // prioridad estratégica
  objective?: string;       // objetivo directivo
  kpi?: string;             // resultado clave
  initiative?: string;      // iniciativa del portafolio
  meta: string;             // qué logra el área este trimestre
  criterio: string;         // criterio de éxito (cómo sabremos que se cumplió)
  hitos: Hito[];
  depende: Dependencia[];   // qué necesita de otras áreas
  estado: MetaEstado;
  cierre?: { cumplimiento: number; aprendizaje: string; at: string; by: string };
  by: string; at: string;
};

export const QUARTER = /^\d{4}-T[1-4]$/;
export const METAS_ESTADOS: { id: MetaEstado; label: string }[] = [
  { id: "PLANEADA", label: "Planeada" }, { id: "EN_CURSO", label: "En curso" }, { id: "CUMPLIDA", label: "Cumplida" }, { id: "PARCIAL", label: "Parcial" }, { id: "NO_CUMPLIDA", label: "No cumplida" },
];
export const HITO_ESTADOS: { id: HitoEstado; label: string }[] = [{ id: "PENDIENTE", label: "Pendiente" }, { id: "EN_CURSO", label: "En curso" }, { id: "HECHO", label: "Hecho" }];
export const trimestresDe = (year: number) => [1, 2, 3, 4].map((n) => `${year}-T${n}`);
export const trimestreLabel = (q: string) => { const m = q.match(QUARTER) ? q.split("-T") : null; return m ? `T${m[1]} ${m[0]}` : q; };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Valida y normaliza una meta trimestral enviada por la interfaz o por un importador. */
export function normalizarMeta(input: Partial<MetaTrimestral> & Record<string, unknown>, ctx: { areas: string[]; levers: string[]; objectives: string[]; kpis: string[]; initiatives: string[] }): { ok: true; meta: Omit<MetaTrimestral, "id" | "by" | "at"> } | { ok: false; error: string } {
  const quarter = str(input.quarter, 8).toUpperCase();
  if (!QUARTER.test(quarter)) return { ok: false, error: "El trimestre va como AAAA-Tn (p. ej. 2027-T1)." };
  const areaId = str(input.areaId, 10);
  if (!ctx.areas.includes(areaId)) return { ok: false, error: "El área (responsable del catálogo) no existe." };
  const lever = str(input.lever, 12).toUpperCase();
  if (!ctx.levers.includes(lever)) return { ok: false, error: "La prioridad estratégica no existe en esta empresa." };
  const objective = str(input.objective, 10).toUpperCase() || undefined;
  if (objective && !ctx.objectives.includes(objective)) return { ok: false, error: "El objetivo directivo no existe." };
  const kpi = str(input.kpi, 20).toUpperCase() || undefined;
  if (kpi && !ctx.kpis.includes(kpi)) return { ok: false, error: "El resultado clave no existe." };
  const initiative = str(input.initiative, 10) || undefined;
  if (initiative && !ctx.initiatives.includes(initiative)) return { ok: false, error: "La iniciativa no existe." };
  const meta = str(input.meta, 300);
  if (meta.length < 5) return { ok: false, error: "La meta del trimestre necesita al menos 5 caracteres." };
  const criterio = str(input.criterio, 300);
  const hitos: Hito[] = (Array.isArray(input.hitos) ? input.hitos : []).map((h: Partial<Hito>) => ({
    name: str(h?.name, 160), responsable: str(h?.responsable, 80) || undefined, fecha: str(h?.fecha, 10) || undefined, recursos: str(h?.recursos, 160) || undefined,
    estado: HITO_ESTADOS.some((e) => e.id === h?.estado) ? (h!.estado as HitoEstado) : "PENDIENTE",
  })).filter((h) => h.name).slice(0, 20);
  const depende: Dependencia[] = (Array.isArray(input.depende) ? input.depende : []).map((d: Partial<Dependencia>) => ({ areaId: str(d?.areaId, 10), que: str(d?.que, 200) }))
    .filter((d) => d.areaId && ctx.areas.includes(d.areaId) && d.areaId !== areaId && d.que).slice(0, 10);
  const estado = METAS_ESTADOS.some((e) => e.id === input.estado) ? (input.estado as MetaEstado) : "PLANEADA";
  return { ok: true, meta: { quarter, areaId, lever, objective, kpi, initiative, meta, criterio, hitos, depende, estado, ...(input.cierre && typeof input.cierre === "object" ? { cierre: input.cierre as MetaTrimestral["cierre"] } : {}) } };
}

/** Propuesta de cascada desde el portafolio: una meta por iniciativa del año en el trimestre en que empieza
    (o el primero del año si empieza antes), en el área de su sponsor, con su prioridad y objetivo. */
export function proponerDesdePortafolio(initiatives: InitiativeFull[], objectives: { id: string; lever?: string }[], year: number, existentes: MetaTrimestral[]): Omit<MetaTrimestral, "id" | "by" | "at">[] {
  const out: Omit<MetaTrimestral, "id" | "by" | "at">[] = [];
  for (const i of initiatives) {
    if (!i.ownerId) continue;
    const o = objectives.find((x) => x.id === i.cmi);
    const lever = o?.lever; if (!lever) continue;
    const s = i.start?.match(/^(\d{4})-T([1-4])$/), e = i.end?.match(/^(\d{4})-T([1-4])$/);
    const startYear = s ? Number(s[1]) : year, endYear = e ? Number(e[1]) : startYear;
    if (startYear > year || endYear < year) continue;
    const q = startYear === year && s ? `${year}-T${s[2]}` : `${year}-T1`;
    if (existentes.some((m) => m.initiative === i.id && m.quarter === q)) continue;
    out.push({ quarter: q, areaId: i.ownerId, lever, objective: i.cmi, kpi: i.kpi || undefined, initiative: i.id, meta: i.metaResultado?.trim() ? `${i.name}: ${i.metaResultado.trim()}`.slice(0, 300) : i.name.slice(0, 300), criterio: i.metaResultado?.trim().slice(0, 300) ?? "", hitos: [], depende: [], estado: i.status === "EN_CURSO" ? "EN_CURSO" : "PLANEADA" });
  }
  return out;
}

/** Lectura del ciclo de un trimestre: planear, ejecutar, cerrar y aprender. */
export function cicloTrimestre(metas: MetaTrimestral[], quarter: string) {
  const del = metas.filter((m) => m.quarter === quarter);
  const hitos = del.flatMap((m) => m.hitos);
  const cerradas = del.filter((m) => m.cierre);
  const cumpl = cerradas.map((m) => m.cierre!.cumplimiento);
  return {
    metas: del.length, areas: new Set(del.map((m) => m.areaId)).size, sinCriterio: del.filter((m) => !m.criterio).length,
    hitos: hitos.length, hitosHechos: hitos.filter((h) => h.estado === "HECHO").length, dependencias: del.reduce((a, m) => a + m.depende.length, 0),
    cerradas: cerradas.length, cumplimiento: cumpl.length ? Math.round(cumpl.reduce((a, b) => a + b, 0) / cumpl.length) : null,
    aprendizajes: cerradas.map((m) => m.cierre!.aprendizaje).filter(Boolean),
  };
}

/** Interdependencias del trimestre como pares área → área con lo que se necesita. */
export function interdependencias(metas: MetaTrimestral[], quarter: string): { de: string; a: string; que: string; meta: string }[] {
  return metas.filter((m) => m.quarter === quarter).flatMap((m) => m.depende.map((d) => ({ de: m.areaId, a: d.areaId, que: d.que, meta: m.meta })));
}
