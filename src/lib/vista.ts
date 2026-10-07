// ─────────────────────────────────────────────────────────────────────────────
// Vista de una empresa: el catálogo más lo EFECTIVO (lo escrito desde la
// plataforma) en una estructura serializable. La construye el store en el
// servidor (tenantView) y la consume la UI vía CatalogProvider. Toda la
// lógica (lib/logic, lib/proyectos) recibe la vista explícitamente: así
// ningún módulo del navegador depende de constantes de una empresa fija.
// ─────────────────────────────────────────────────────────────────────────────

import type { Catalog } from "@/data/catalogo";
import type { KpiFull, InitiativeFull, AssessmentRecord, CellScore } from "@/data/cmi";
import type { Task } from "@/data/proyectos";
import { responsibleIn, personIn, emptyCatalog } from "@/data/catalogo";
import { CAPS, DIMS } from "@/data/mapa";

export type TenantView = {
  catalog: Catalog;
  initiatives: InitiativeFull[];        // efectivas (seed + cambios)
  kpis: KpiFull[];                      // con la serie efectiva
  tasks: Task[];                        // vigentes (sin archivadas)
  current: AssessmentRecord;            // medición publicada vigente (o vacía)
  previous: AssessmentRecord | null;
  assessments: { id: string; label: string; period: string; status: AssessmentRecord["status"]; note: string }[];
  published: boolean;                   // ¿el corte A3 se publicó desde la plataforma?
};

export type Scores = Record<number, Record<string, CellScore>>;

/** Medición «vacía» para empresas sin diagnóstico publicado: todas las
    dimensiones en 1 con meta 3, para que los tableros rendericen sin datos. */
export function emptyAssessment(): AssessmentRecord {
  const scores: Scores = { 1: {}, 2: {}, 3: {}, 4: {} };
  for (const d of DIMS) scores[d.line][d.code] = { value: 1, target: 3 };
  return { id: "A0", label: "Sin medición publicada", period: "—", status: "EN_CAPTURA", note: "", scores };
}

export const scoresOf = (v: TenantView): Scores => v.current.scores ?? emptyAssessment().scores!;

export const lineScore = (v: TenantView, n: number) => {
  const dims = Object.values(scoresOf(v)[n] ?? {});
  return dims.length ? dims.reduce((a, d) => a + d.value, 0) / dims.length : 0;
};
export const lineTarget = (v: TenantView, n: number) => {
  const dims = Object.values(scoresOf(v)[n] ?? {});
  return dims.length ? dims.reduce((a, d) => a + d.target, 0) / dims.length : 0;
};
export const institutionScore = (v: TenantView) => CAPS.reduce((a, l) => a + lineScore(v, l.n), 0) / CAPS.length;

/** Promedio por capacidad del corte publicado anterior (o el vigente si no hay). */
export const prevScores = (v: TenantView): Record<number, number> =>
  Object.fromEntries([1, 2, 3, 4].map((n) => {
    const prev = v.previous?.scores;
    if (!prev) return [n, lineScore(v, n)];
    const dims = Object.values(prev[n] ?? {});
    return [n, dims.length ? dims.reduce((acc, d) => acc + d.value, 0) / dims.length : 0];
  }));

export const responsible = (v: TenantView, id: string) => responsibleIn(v.catalog, id);
export const person = (v: TenantView, id: string) => personIn(v.catalog, id);

/** Iniciativas y KPI con el nombre de la dependencia responsable (como la UI los muestra). */
export type InitiativeView = InitiativeFull & { owner: string };
export type KpiView = KpiFull & { owner: string };
export const initiativesOf = (v: TenantView): InitiativeView[] => v.initiatives.map((i) => ({ ...i, owner: responsible(v, i.ownerId).dependencia }));
export const kpisOf = (v: TenantView): KpiView[] => v.kpis.map((k) => ({ ...k, owner: responsible(v, k.ownerId).dependencia }));
export const evidencesOf = (v: TenantView) => v.catalog.evidences.map((e) => ({ ...e, source: responsible(v, e.sourceId).dependencia }));

/** Capacidades del mapa estratégico: cada dimensión con su nivel y meta. */
export const capabilitiesOf = (v: TenantView) => {
  const s = scoresOf(v);
  const OWNER: Record<number, string> = { 1: "R01", 2: "R01", 3: "R03", 4: "R04" };
  return DIMS.map((d) => ({
    id: d.code, line: d.line, name: d.name,
    current: s[d.line]?.[d.code]?.value ?? 1, target: s[d.line]?.[d.code]?.target ?? 3,
    owner: responsible(v, OWNER[d.line]).dependencia,
  }));
};

export const tasksOf = (v: TenantView, iniId: string) => v.tasks.filter((t) => t.iniId === iniId);

/** Vista vacía (sin empresa activa): la interfaz renderiza estados vacíos. */
export function emptyView(): TenantView {
  const current = emptyAssessment();
  return {
    catalog: emptyCatalog({ slug: "", name: "Sin empresa", shortName: "—", city: "", department: "", sector: "", size: "", sectorKey: "suministros-industriales", ciiu: "", active: false }),
    initiatives: [], kpis: [], tasks: [], current, previous: null, assessments: [], published: false,
  };
}
