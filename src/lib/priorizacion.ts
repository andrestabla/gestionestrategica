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
export type TypeMarks = Record<string, TypeMark>;   // por clave de criterio de la regla de tipo

/** Criterio con el que un evaluador marca estratégico o táctico. */
export type TypeCriterion = { key: string; name: string; strategic: string; tactical: string };
/** Regla de tipo de una empresa: sus criterios y cuántas marcas estratégicas
    hacen estratégica la iniciativa (min = criteria.length → todos obligatorios). */
export type TypeRule = {
  id?: string; criteria: TypeCriterion[]; min: number;
  excludeTactical?: boolean;  // lo táctico se transfiere al área y no admite implementar ni preparar (regla Cresio)
};

/** Reglas predefinidas. 4Shine: cuatro marcas comunes, tres o más = estratégica.
    Cresio: tres criterios propios, los tres obligatorios; lo de continuidad y
    mejora continua pasa como táctico al área de mayor responsabilidad. */
export const TYPE_RULES: Record<"4shine" | "cresio", TypeRule> = {
  "4shine": { id: "4shine", criteria: TYPE_CRITERIA, min: 3 },
  "cresio": {
    id: "cresio", min: 3, excludeTactical: true,
    criteria: [
      { key: "impacto", name: "Impacto en los objetivos estratégicos",
        strategic: "Cambia materialmente un objetivo o un resultado clave del horizonte, o habilita una condición indispensable para los siguientes.",
        tactical: "Mejora un indicador de ejecución sin cambiar un objetivo ni habilitar una condición indispensable." },
      { key: "transversalidad", name: "Transversalidad",
        strategic: "Depende de al menos tres áreas y ninguna concentra más del 75 % de la ejecución.",
        tactical: "Depende en más del 75 % de una sola área o de menos de tres áreas: es de esa área." },
      { key: "potencial", name: "Potencial y madurez",
        strategic: "Es nueva o disruptiva; o es de continuidad pero aún no tiene indicadores, pilotos, prototipos o MVP que validen su implementación y escalamiento.",
        tactical: "Es de continuidad o mejora continua con implementación ya validada: se transfiere al área responsable." },
    ],
  },
};
export const DEFAULT_TYPE_RULE: TypeRule = TYPE_RULES["4shine"];

/** Texto corto de la regla, para formularios y fichas. */
export function typeRuleLabel(rule: TypeRule = DEFAULT_TYPE_RULE): string {
  const n = rule.criteria.length;
  return rule.min >= n ? `los ${n} criterios son obligatorios: con uno que falle, es táctica` : `con ${rule.min} o más marcas estratégicas de ${n}, es estratégica`;
}

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

/** Tipo de iniciativa a partir de las marcas según la regla de la empresa:
    estratégica cuando al menos `min` de sus criterios apuntan a estratégico
    (regla 4Shine: tres de cuatro; regla Cresio: los tres). */
export function typeOf(marks: TypeMarks, rule: TypeRule = DEFAULT_TYPE_RULE): TypeMark {
  const n = rule.criteria.filter((c) => marks[c.key] === "ESTRATEGICO").length;
  return n >= rule.min ? "ESTRATEGICO" : "TACTICO";
}

export type Consolidated = {
  n: number;
  avg: Record<CriterionKey, number>;      // promedio por criterio (1 decimal)
  rounded: Record<CriterionKey, Level>;   // nivel redondeado, el que aplica las reglas
  score: number;
  eligible: boolean;       // D ≥ 3: puede competir como prioridad crítica
  capacityFirst: boolean;  // L ≤ 2: resolver primero la capacidad
  type: TypeMark | null;   // mayoría entre evaluadores
  transfer: boolean;       // táctica bajo una regla que la excluye del portafolio: se transfiere al área
  strategicVotes: number;
  spread: number;          // diferencia entre el mayor y el menor puntaje individual
  lowConsensus: boolean;   // spread > 15 puntos
  evaluators: { by: string; name: string; role: string; score: number; type: TypeMark; at: string }[];
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const toLevel = (v: number): Level => Math.min(4, Math.max(1, Math.round(v))) as Level;

export function consolidate(evals: Evaluation[], rule: TypeRule = DEFAULT_TYPE_RULE): Consolidated {
  const n = evals.length;
  if (n === 0) {
    return { n: 0, avg: { D: 0, E: 0, M: 0, L: 0 }, rounded: { D: 1, E: 1, M: 1, L: 1 }, score: 0, eligible: false, capacityFirst: true, type: null, transfer: false, strategicVotes: 0, spread: 0, lowConsensus: false, evaluators: [] };
  }
  const avg = { D: 0, E: 0, M: 0, L: 0 } as Record<CriterionKey, number>;
  for (const k of ["D", "E", "M", "L"] as CriterionKey[]) avg[k] = r1(evals.reduce((a, e) => a + e.scores[k], 0) / n);
  const rounded = { D: toLevel(avg.D), E: toLevel(avg.E), M: toLevel(avg.M), L: toLevel(avg.L) };
  const individual = evals.map((e) => score(e.scores));
  const strategicVotes = evals.filter((e) => typeOf(e.type, rule) === "ESTRATEGICO").length;
  const spread = r1(Math.max(...individual) - Math.min(...individual));
  return {
    n, avg, rounded, score: score(avg),
    eligible: rounded.D >= 3,
    capacityFirst: rounded.L <= 2,
    type: strategicVotes * 2 >= n ? "ESTRATEGICO" : "TACTICO",
    transfer: !!rule.excludeTactical && strategicVotes * 2 < n,
    strategicVotes,
    spread, lowConsensus: spread > 15,
    evaluators: evals.map((e, i) => ({ by: e.by, name: e.name, role: e.role, score: individual[i], type: typeOf(e.type, rule), at: e.at })),
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
  if ((decision === "IMPLEMENTAR" || decision === "PREPARAR") && c.transfer) {
    return { ok: false, reason: `El consolidado la clasifica como táctica (${c.strategicVotes} de ${c.n} evaluadores la ven estratégica): se transfiere al área de mayor responsabilidad y no compite en el portafolio estratégico. Si debe seguir, revisa las marcas de tipo; si no, déjala en backlog o renuncia.` };
  }
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
