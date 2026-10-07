// ─────────────────────────────────────────────────────────────────────────────
// Matriz 4Shine de priorización (Dossier · convención de prioridades).
//   Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4          → 25 a 100
//   Para competir como prioridad crítica, D debe ser 3 o 4.
//   Con L = 1 o 2, se resuelve primero la capacidad de la siguiente etapa.
//   El puntaje ordena alternativas dentro de cada horizonte; la aprobación
//   exige impacto estratégico, capacidad y recursos disponibles.
//   El puntaje consolidado también sugiere el horizonte (suggestHorizon):
//   elegible, con capacidad y ≥ 65 puntos → primer horizonte; elegible pero
//   con capacidad por resolver o entre 50 y 64 → siguiente horizonte; no
//   elegible o < 50 → último horizonte. La gerencia confirma o mueve.
// Reglas puras: sin estado, sin permisos (los exige el store).
// ─────────────────────────────────────────────────────────────────────────────

export type CriterionKey = "D" | "E" | "M" | "L";
export type Level = 1 | 2 | 3 | 4;
export type Scores = Record<CriterionKey, Level>;

export const LEVEL_NAMES: Record<Level, string> = { 1: "Débil", 2: "Limitado", 3: "Fuerte", 4: "Decisivo" };

export const CRITERIA: {
  key: CriterionKey; name: string; short: string; weight: number; question: string;
  levels: Record<Level, string>;
}[] = [
  {
    key: "D", name: "Impacto en el resultado", short: "Impacto", weight: 40,
    question: "¿Cuánto contribuye al objetivo correspondiente o cuánto desbloquea su cumplimiento?",
    levels: {
      1: "No identifica un resultado verificable.",
      2: "Aporte limitado o indirecto.",
      3: "Aporte directo y relevante según la referencia acordada.",
      4: "Aporte decisivo o eliminación de una restricción principal.",
    },
  },
  {
    key: "E", name: "Evidencia de la siguiente etapa", short: "Evidencia", weight: 30,
    question: "¿Qué podremos demostrar para confirmar el beneficio o decidir continuar, ajustar o detener?",
    levels: {
      1: "No define cómo comprobar el beneficio.",
      2: "Mide entregas o actividad, con conexión insuficiente al beneficio.",
      3: "Define indicador, método y fecha para comprobar avance útil.",
      4: "Además fija un umbral para decidir continuar, ajustar o detener.",
    },
  },
  {
    key: "M", name: "Sostenibilidad y réplica", short: "Sostenibilidad", weight: 20,
    question: "¿Qué beneficio permanece y dónde puede repetirse con una economía defendible?",
    levels: {
      1: "Beneficio puntual.",
      2: "Beneficio recurrente limitado, con alta intervención adicional.",
      3: "Beneficio sostenible y proceso reproducible.",
      4: "Réplica demostrada con mejor productividad o menor costo por resultado.",
    },
  },
  {
    key: "L", name: "Capacidad de ejecución", short: "Capacidad", weight: 10,
    question: "¿Tenemos responsable, autoridad, disponibilidad y recursos para la etapa propuesta?",
    levels: {
      1: "Falta responsable con autoridad.",
      2: "Faltan recursos, disponibilidad o una dependencia crítica.",
      3: "Capacidad identificada; quedan ajustes menores con cierre definido.",
      4: "Autoridad, disponibilidad y recursos confirmados.",
    },
  },
];

/** Cuatro criterios comunes para distinguir estratégico de táctico. */
export const TYPE_CRITERIA: { key: string; name: string; strategic: string; tactical: string }[] = [
  { key: "contribucion", name: "Contribución al resultado",
    strategic: "Cambia materialmente un objetivo estratégico o habilita una condición indispensable para alcanzarlo.",
    tactical: "Mejora un indicador de ejecución dentro de una prioridad o programa definido." },
  { key: "profundidad", name: "Profundidad del cambio",
    strategic: "Transforma una propuesta de valor, modelo de negocio, experiencia relevante o capacidad crítica.",
    tactical: "Ajusta, optimiza o aplica procesos y capacidades existentes." },
  { key: "alcance", name: "Factibilidad y alcance",
    strategic: "El efecto alcanza un resultado relevante del negocio, una marca, un formato o una capacidad compartida.",
    tactical: "El efecto se concentra en una actividad, proceso o intervención delimitada dentro del modelo vigente." },
  { key: "permanencia", name: "Permanencia del efecto",
    strategic: "Instala una nueva forma de generar resultados que permanece o puede replicarse después de implementar.",
    tactical: "Produce una mejora puntual o recurrente dentro de la forma actual de operar." },
];

export type TypeMark = "ESTRATEGICO" | "TACTICO";
export type TypeMarks = Record<string, TypeMark>;   // por clave de TYPE_CRITERIA

export type Decision = "IMPLEMENTAR" | "PREPARAR" | "BACKLOG" | "RENUNCIAR";
export const DECISIONS: { key: Decision; label: string; when: string; rule: string }[] = [
  { key: "IMPLEMENTAR", label: "Ahora: implementar", when: "Ahora",
    rule: "Su contribución justifica recursos, la etapa tiene capacidad disponible y retrasarla compromete un resultado, una dependencia o una oportunidad relevante." },
  { key: "PREPARAR", label: "Ahora: preparar o validar", when: "Ahora",
    rule: "Necesita aprendizaje, desarrollo o maduración anticipada. Se autoriza una etapa acotada con evidencia esperada, responsable y recursos propios." },
  { key: "BACKLOG", label: "Luego: backlog", when: "Luego",
    rule: "Puede esperar sin comprometer los objetivos ni llegar tarde a la preparación requerida, o depende de una condición todavía pendiente." },
  { key: "RENUNCIAR", label: "Renunciar", when: "Renuncia",
    rule: "Perdió alineación, otra alternativa la sustituye, sus supuestos se invalidaron o su beneficio no justifica el costo y esfuerzo." },
];
export const decisionLabel = (d: Decision | null | undefined) => DECISIONS.find((x) => x.key === d)?.label ?? "Sin decisión";

export type Evaluation = {
  iniId: string;
  by: string;            // email
  name: string;
  role: string;
  scores: Scores;
  type: TypeMarks;       // marca por criterio común
  notes?: Partial<Record<CriterionKey, string>>;
  at: string;            // ISO
};

export const isLevel = (v: unknown): v is Level => v === 1 || v === 2 || v === 3 || v === 4;

/** Puntaje 25–100 según la fórmula de la matriz. */
export function score(s: Record<CriterionKey, number>): number {
  return Math.round(((40 * s.D + 30 * s.E + 20 * s.M + 10 * s.L) / 4) * 10) / 10;
}

/** Tipo de iniciativa a partir de las marcas: estratégica cuando al menos tres
    de los cuatro criterios comunes apuntan a estratégico. */
export function typeOf(marks: TypeMarks): TypeMark {
  const n = TYPE_CRITERIA.filter((c) => marks[c.key] === "ESTRATEGICO").length;
  return n >= 3 ? "ESTRATEGICO" : "TACTICO";
}

export type Consolidated = {
  n: number;
  avg: Record<CriterionKey, number>;      // promedio por criterio (1 decimal)
  rounded: Record<CriterionKey, Level>;   // nivel redondeado, el que aplica las reglas
  score: number;
  eligible: boolean;       // D ≥ 3: puede competir como prioridad crítica
  capacityFirst: boolean;  // L ≤ 2: resolver primero la capacidad
  type: TypeMark | null;   // mayoría entre evaluadores
  strategicVotes: number;
  spread: number;          // diferencia entre el mayor y el menor puntaje individual
  lowConsensus: boolean;   // spread > 15 puntos
  evaluators: { by: string; name: string; role: string; score: number; type: TypeMark; at: string }[];
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const toLevel = (v: number): Level => Math.min(4, Math.max(1, Math.round(v))) as Level;

export function consolidate(evals: Evaluation[]): Consolidated {
  const n = evals.length;
  if (n === 0) {
    return { n: 0, avg: { D: 0, E: 0, M: 0, L: 0 }, rounded: { D: 1, E: 1, M: 1, L: 1 }, score: 0, eligible: false, capacityFirst: true, type: null, strategicVotes: 0, spread: 0, lowConsensus: false, evaluators: [] };
  }
  const avg = { D: 0, E: 0, M: 0, L: 0 } as Record<CriterionKey, number>;
  for (const k of ["D", "E", "M", "L"] as CriterionKey[]) avg[k] = r1(evals.reduce((a, e) => a + e.scores[k], 0) / n);
  const rounded = { D: toLevel(avg.D), E: toLevel(avg.E), M: toLevel(avg.M), L: toLevel(avg.L) };
  const individual = evals.map((e) => score(e.scores));
  const strategicVotes = evals.filter((e) => typeOf(e.type) === "ESTRATEGICO").length;
  const spread = r1(Math.max(...individual) - Math.min(...individual));
  return {
    n, avg, rounded, score: score(avg),
    eligible: rounded.D >= 3,
    capacityFirst: rounded.L <= 2,
    type: strategicVotes * 2 >= n ? "ESTRATEGICO" : "TACTICO",
    strategicVotes,
    spread, lowConsensus: spread > 15,
    evaluators: evals.map((e, i) => ({ by: e.by, name: e.name, role: e.role, score: individual[i], type: typeOf(e.type), at: e.at })),
  };
}

/** ¿Es admisible la decisión con la evaluación consolidada? Devuelve el motivo
    cuando no lo es (regla de la matriz). */
export function decisionCheck(decision: Decision, c: Consolidated, rationale?: string): { ok: true } | { ok: false; reason: string } {
  if (decision === "IMPLEMENTAR") {
    if (c.n === 0) return { ok: false, reason: "Implementar exige al menos una evaluación con la matriz." };
    if (!c.eligible) return { ok: false, reason: `Para implementar ahora, el impacto (D) debe ser 3 o 4; el consolidado es ${c.rounded.D}. Corresponde preparar, dejar en backlog o renunciar.` };
    if (c.capacityFirst) return { ok: false, reason: `Con capacidad (L) en ${c.rounded.L} se resuelve primero la capacidad de la siguiente etapa: la decisión admisible es «preparar o validar».` };
  }
  if (decision === "PREPARAR" && c.n === 0) return { ok: false, reason: "Preparar o validar exige al menos una evaluación con la matriz." };
  if (decision === "RENUNCIAR" && !rationale?.trim()) return { ok: false, reason: "Renunciar exige registrar el motivo: qué alineación perdió, qué alternativa la sustituye o qué supuesto se invalidó." };
  return { ok: true };
}

/** Umbrales del puntaje consolidado para la sugerencia de horizonte. */
export const HORIZON_THRESHOLDS = { now: 65, next: 50 } as const;

/** Horizonte que sugiere el puntaje consolidado, entre los de la empresa
    (en orden del más cercano al más lejano). Sin evaluación no hay sugerencia. */
export function suggestHorizon(c: Consolidated, horizons: string[]): string | null {
  if (c.n === 0 || horizons.length === 0) return null;
  const last = horizons[horizons.length - 1];
  const next = horizons[1] ?? last;
  if (c.eligible && !c.capacityFirst && c.score >= HORIZON_THRESHOLDS.now) return horizons[0];
  if (c.eligible && c.score >= HORIZON_THRESHOLDS.next) return next;
  return last;
}

/** Orden del portafolio: dentro de cada horizonte, por puntaje consolidado;
    las no evaluadas al final. Cada fila trae el horizonte sugerido. */
export function rank<T extends { id: string; horizon: string }>(
  items: T[], consolidatedOf: (id: string) => Consolidated, horizons: string[] = ["CORTO", "MEDIANO"],
): (T & { c: Consolidated; position: number; suggested: string | null })[] {
  const out: (T & { c: Consolidated; position: number; suggested: string | null })[] = [];
  const extra = [...new Set(items.map((i) => i.horizon))].filter((h) => !horizons.includes(h));
  for (const h of [...horizons, ...extra]) {
    const group = items.filter((i) => i.horizon === h).map((i) => { const c = consolidatedOf(i.id); return { ...i, c, position: 0, suggested: suggestHorizon(c, horizons) }; })
      .sort((a, b) => (b.c.n === 0 ? -1 : b.c.score) - (a.c.n === 0 ? -1 : a.c.score));
    group.forEach((g, i) => { g.position = i + 1; });
    out.push(...group);
  }
  return out;
}
