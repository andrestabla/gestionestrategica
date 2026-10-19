// Convención de planeación: reglas puras que apoyan la facilitación.
//   · objetivos por palanca y horizonte (dirección compartida)
//   · calidad de los OKR de un horizonte (de 2 a 4 resultados clave por
//     objetivo, máximo 5, con base, meta, dueño y plazo; iniciativas
//     vinculadas a un resultado clave). Los objetivos de OKR son los que
//     define cada tribu en el laboratorio (okr); los directivos viven en
//     Dirección 3x3.
//   · cobertura de la evaluación con la matriz (quién ha calificado qué)
//   · resumen y exportación del portafolio por horizonte y decisión

import type { Catalog, Lever } from "@/data/catalogo";
import { horizonsOf, leversOf, isConvencion } from "@/data/catalogo";
import type { CmiObjective, InitiativeFull, KpiFull } from "@/data/cmi";
import type { Consolidated, Decision, Evaluation } from "@/lib/priorizacion";

/** Qué le falta a un resultado clave para estar completo: nombre con una cifra real (cuánto), línea base,
    meta distinta de la base, unidad, dueño, plazo y definición con fórmula y fuente. Solo un KR completo
    se valida y recibe iniciativas. */
export function krFaltantes(k: KpiFull): string[] {
  const out: string[] = [];
  const nombre = (k.name ?? "").replace(k.code, "").trim();
  if (nombre.length < 3) out.push("resultado clave");
  else if (!/\d/.test(nombre)) out.push("cifra real en el nombre del resultado (cuánto)");
  if (!(k.baseline > 0 || (k.series ?? []).length > 0)) out.push("línea base");
  if (!(k.target > 0)) out.push("meta");
  else if (k.target === k.baseline) out.push("meta distinta de la línea base");
  if (!k.unit?.trim()) out.push("unidad");
  if (!k.ownerId) out.push("dueño");
  if (!/^\d{4}(-T[1-4])?$/i.test((k.due ?? "").trim())) out.push("plazo");
  if (!((k.definition?.trim().length ?? 0) >= 10 || k.formula?.trim())) out.push("definición con fórmula y fuente");
  return out;
}
export const krCompleto = (k: KpiFull): boolean => krFaltantes(k).length === 0;
/** Cada resultado clave recibe como máximo dos iniciativas: las que de verdad lo mueven. */
export const KR_INI_MAX = 2;

export type OkrIssue = {
  level: "alto" | "medio";
  kind: "objetivo-sin-kr" | "objetivo-pocos-kr" | "objetivo-muchos-kr" | "objetivo-sin-palanca" | "kr-incompleto" | "kr-sin-iniciativa" | "kr-muchas-iniciativas" | "iniciativa-sin-kr" | "palanca-muchos-objetivos" | "palanca-sin-okr";
  ref: string;       // id del objetivo, código del KR o id de la iniciativa
  text: string;
};

/** Objetivos agrupados por palanca (en orden) y horizonte; los que no tienen
    palanca u horizonte quedan en la clave «». */
export function objectivesMatrix(cat: Catalog): { levers: Lever[]; horizons: string[]; cell: (lever: string, horizon: string) => CmiObjective[]; orphan: CmiObjective[] } {
  const levers = leversOf(cat.company);
  const horizons = horizonsOf(cat.company).map((h) => h.id);
  const directive = cat.objectives.filter((o) => !o.okr);   // la matriz muestra los objetivos directivos; los de las tribus viven en OKR
  const cell = (lever: string, horizon: string) => directive.filter((o) => (o.lever ?? "") === lever && (o.horizon ?? "") === horizon);
  const orphan = directive.filter((o) => !o.lever || !o.horizon || !levers.some((l) => l.id === o.lever) || !horizons.includes(o.horizon));
  return { levers, horizons, cell, orphan };
}

/** KPI de un objetivo: los que declara más los que lo apuntan. */
export const kpisOf = (cat: Catalog, o: CmiObjective): KpiFull[] => {
  const codes = new Set(o.kpis);
  return cat.kpis.filter((k) => codes.has(k.code) || k.cmi === o.id);
};

/** Resultados clave de un objetivo. Regla: si el objetivo tiene KPI con plazo,
    esos son sus resultados clave y los demás son métrica; si ninguno tiene
    plazo, todos cuentan como resultados clave (catálogo sin convención). */
export const keyResultsOf = (cat: Catalog, o: CmiObjective): KpiFull[] => {
  const all = kpisOf(cat, o);
  const withDue = all.filter((k) => k.due);
  return withDue.length ? withDue : all;
};

/** métrica: los del objetivo que no son resultados clave. */
export const healthKpisOf = (cat: Catalog, o: CmiObjective): KpiFull[] => {
  const krs = new Set(keyResultsOf(cat, o).map((k) => k.code));
  return kpisOf(cat, o).filter((k) => !krs.has(k.code));
};

/** Iniciativas que mueven un resultado clave. */
export const initiativesOfKr = (cat: Catalog, code: string): InitiativeFull[] => cat.initiatives.filter((i) => i.kpi === code);

/** Objetivos sobre los que se construyen OKR en un horizonte: en modo convención, solo los definidos por las tribus (okr): los directivos
    viven en Dirección 3x3 y no se muestran en OKR. Fuera de la convención, si la empresa no usa ese nivel, todos los del horizonte. */
export const okrObjectivesOf = (cat: Catalog, horizon: string): CmiObjective[] => {
  const own = cat.objectives.filter((o) => o.horizon === horizon && o.okr);
  if (cat.company.mode === "convencion") return own;
  return cat.objectives.some((o) => o.okr) ? own : cat.objectives.filter((o) => o.horizon === horizon);
};
/** Regla de resultados clave por objetivo: de 2 a 4; 5 se admite como máximo. */
export const KR_MIN = 2, KR_IDEAL_MAX = 4, KR_MAX = 5;

/** Reglas de calidad de los OKR del horizonte dado. */
export function okrChecks(cat: Catalog, horizon: string): OkrIssue[] {
  const out: OkrIssue[] = [];
  const objectives = okrObjectivesOf(cat, horizon);
  for (const o of objectives) {
    if (!o.lever) out.push({ level: "medio", kind: "objetivo-sin-palanca", ref: o.id, text: `${o.id} no tiene palanca asignada.` });
    const krs = keyResultsOf(cat, o);
    if (krs.length === 0) out.push({ level: "alto", kind: "objetivo-sin-kr", ref: o.id, text: `${o.id} no tiene resultados clave: no es medible.` });
    else if (krs.length < KR_MIN) out.push({ level: "medio", kind: "objetivo-pocos-kr", ref: o.id, text: `${o.id} tiene un solo resultado clave; la regla pide de 2 a 4 (máximo 5).` });
    else if (krs.length > KR_MAX) out.push({ level: "alto", kind: "objetivo-muchos-kr", ref: o.id, text: `${o.id} tiene ${krs.length} resultados clave; el máximo es 5 (lo recomendado, de 2 a 4).` });
    else if (krs.length > KR_IDEAL_MAX) out.push({ level: "medio", kind: "objetivo-muchos-kr", ref: o.id, text: `${o.id} tiene 5 resultados clave: es el máximo; lo recomendado es de 2 a 4.` });
    for (const k of krs) {
      const missing = krFaltantes(k);
      if (missing.length) out.push({ level: "alto", kind: "kr-incompleto", ref: k.code, text: `${k.code} sin ${missing.join(", ")}: hasta completarlo no se valida ni recibe iniciativas.` });
      // regla de la convención: cada resultado clave debe tener al menos una iniciativa que lo mueva
      const nIni = initiativesOfKr(cat, k.code).length;
      if (nIni === 0) out.push({ level: "alto", kind: "kr-sin-iniciativa", ref: k.code, text: `${k.code} no tiene ninguna iniciativa que lo mueva: vincula una existente o crea la que lo mueve.` });
      else if (nIni > KR_INI_MAX) out.push({ level: "alto", kind: "kr-muchas-iniciativas", ref: k.code, text: `${k.code} tiene ${nIni} iniciativas; el máximo es ${KR_INI_MAX} por resultado clave: deja solo las que de verdad lo mueven.` });
    }
  }
  // convención: un solo OKR por tribu, cuyo objetivo es el objetivo rector de la palanca
  if (isConvencion(cat.company)) for (const l of leversOf(cat.company)) {
    const n = objectives.filter((o) => o.lever === l.id).length;
    if (n === 0) out.push({ level: "alto", kind: "palanca-sin-okr", ref: l.id, text: `${l.name}: la tribu aún no tiene su OKR (el objetivo rector de la palanca con 2 a 4 resultados clave).` });
    else if (n > 1) out.push({ level: "medio", kind: "palanca-muchos-objetivos", ref: l.id, text: `${l.name} tiene ${n} objetivos; la regla es un solo OKR por tribu, con el objetivo rector de la palanca.` });
  }
  const krCodes = new Set(objectives.flatMap((o) => keyResultsOf(cat, o).map((k) => k.code)));
  for (const i of cat.initiatives.filter((i) => i.horizon === horizon)) {
    if (!i.kpi || !krCodes.has(i.kpi)) out.push({ level: "medio", kind: "iniciativa-sin-kr", ref: i.id, text: `${i.id} (${i.name}) no está vinculada a un resultado clave de ${horizon}.` });
  }
  return out;
}

export type Coverage = {
  total: number; evaluated: number; pct: number; complete: number;
  evaluators: { by: string; name: string; role: string; count: number }[];
};

/** Cobertura de la evaluación: iniciativas con al menos una calificación,
    con el número esperado de evaluadores, y actividad por evaluador. */
export function evaluationCoverage(initiatives: { id: string }[], evaluations: Evaluation[], expected = 1): Coverage {
  const byIni = new Map<string, number>();
  const byUser = new Map<string, { by: string; name: string; role: string; count: number }>();
  for (const e of evaluations) {
    byIni.set(e.iniId, (byIni.get(e.iniId) ?? 0) + 1);
    const u = byUser.get(e.by) ?? { by: e.by, name: e.name, role: e.role, count: 0 };
    u.count += 1; byUser.set(e.by, u);
  }
  const total = initiatives.length;
  const evaluated = initiatives.filter((i) => (byIni.get(i.id) ?? 0) > 0).length;
  const complete = initiatives.filter((i) => (byIni.get(i.id) ?? 0) >= Math.max(1, expected)).length;
  return { total, evaluated, pct: total ? Math.round((evaluated / total) * 100) : 0, complete, evaluators: [...byUser.values()].sort((a, b) => b.count - a.count) };
}

export type PortfolioRow = { id: string; name: string; horizon: string; suggested: string | null; c: Consolidated; decision?: Decision | null; rationale?: string; lever?: string; owner?: string };

/** Conteo por horizonte y decisión (las no decididas cuentan como «pendiente»). */
export function portfolioSummary(rows: PortfolioRow[], horizons: string[]): Record<string, Record<Decision | "PENDIENTE", number>> {
  const out: Record<string, Record<Decision | "PENDIENTE", number>> = {};
  for (const h of horizons) out[h] = { IMPLEMENTAR: 0, PREPARAR: 0, BACKLOG: 0, RENUNCIAR: 0, PENDIENTE: 0 };
  for (const r of rows) {
    const h = out[r.horizon] ?? (out[r.horizon] = { IMPLEMENTAR: 0, PREPARAR: 0, BACKLOG: 0, RENUNCIAR: 0, PENDIENTE: 0 });
    h[r.decision ?? "PENDIENTE"] += 1;
  }
  return out;
}

const csvCell = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Portafolio en CSV (separador «;» para Excel en español). */
export function portfolioCsv(rows: PortfolioRow[]): string {
  const head = ["id", "iniciativa", "palanca", "responsable", "horizonte", "horizonte sugerido", "evaluadores", "D", "E", "M", "L", "puntaje", "tipo", "elegible", "capacidad primero", "decisión", "motivo"];
  const lines = rows.map((r) => [
    r.id, r.name, r.lever ?? "", r.owner ?? "", r.horizon, r.suggested ?? "", r.c.n, r.c.n ? r.c.avg.D : "", r.c.n ? r.c.avg.E : "", r.c.n ? r.c.avg.M : "", r.c.n ? r.c.avg.L : "",
    r.c.n ? r.c.score : "", r.c.type ?? "", r.c.n ? (r.c.eligible ? "sí" : "no") : "", r.c.n ? (r.c.capacityFirst ? "sí" : "no") : "", r.decision ?? "pendiente", r.rationale ?? "",
  ].map(csvCell).join(";"));
  return [head.join(";"), ...lines].join("\n");
}
