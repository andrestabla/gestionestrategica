// ─────────────────────────────────────────────────────────────────────────────
// Madurez digital · diagnóstico de transformación digital y niveles de madurez.
// Un instrumento por tipo de organización (empresa o institución educativa):
// líneas × dimensiones, variables con su protocolo (qué se pregunta, qué
// evidencia se pide, rúbrica 1–5) y dominios. La medición es de cada empresa:
// nace vacía, se captura (percepción 1–5; evidencia D/I/K 0–4; nivel 1–5 contra
// la rúbrica) y se publica como corte. Aquí viven los tipos y las reglas puras;
// el store guarda la captura y los cortes, y exige los permisos.
// ─────────────────────────────────────────────────────────────────────────────

export type OrgKind = "empresa" | "educativa";
export const ORG_KINDS: { id: OrgKind; label: string; desc: string }[] = [
  { id: "empresa", label: "Empresa", desc: "Instrumento de madurez digital para empresas." },
  { id: "educativa", label: "Institución educativa", desc: "Instrumento original para instituciones de educación superior." },
];
export const isOrgKind = (x: unknown): x is OrgKind => x === "empresa" || x === "educativa";

export type DimKey = "organizacional" | "misional" | "tecnologica" | "datos";
export const DIM_KEYS: DimKey[] = ["organizacional", "misional", "tecnologica", "datos"];
export type D7 = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7";
export const D7_KEYS: D7[] = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];

export type ItemType = "likert" | "verificacion" | "dato" | "abierta";
export const ITEM_TYPE_LABEL: Record<ItemType, string> = { likert: "Likert 1–5", verificacion: "Verificación", dato: "Dato", abierta: "Abierta" };
export type MadItem = { text: string; type: ItemType; audiences: string[] };
export type EvidenceComponent = "D" | "I" | "K";
export type MadEvidenceReq = { component: EvidenceComponent; what: string; criterio: string };
export type Rubric = [string, string, string, string, string];

export type MadVariable = {
  id: string;            // p. ej. CL-ORG-1
  line: number;          // 1..4
  dimension: DimKey;
  d7: D7;                // dimensión transversal
  ai?: boolean;          // hace parte del índice de preparación para IA
  name: string;
  desc: string;          // qué mide exactamente
  frame: string;         // referente contra el que se evalúa (clave de frames)
  items: MadItem[];      // qué se pregunta
  evidence: MadEvidenceReq[]; // qué evidencia se solicita, por componente D/I/K
  rubric: Rubric;        // niveles 1..5
};
export type MadDomain = { id: string; name: string; desc: string; variableIds: string[] };
export type MadLine = { n: number; code: string; name: string; short: string; color: string; weight: number };
export type AiqComponent = { key: string; name: string; weight: number; prep: boolean; variableIds: string[] };
export type SafeguardDef = { id: string; rule: string; cap: number | null };

export type MadInstrument = {
  kind: OrgKind;
  name: string;
  intro: string;
  lines: MadLine[];                                   // los pesos suman 1
  dimensions: { key: DimKey; name: string; short: string }[];
  frames: Record<string, { name: string; color: string }>;
  audiences: Record<string, string>;                  // clave → rótulo del grupo de actores
  d7: Record<D7, { name: string; short: string }>;
  variables: MadVariable[];
  domains: MadDomain[];
  aiq: AiqComponent[];                                // los pesos suman 1
  safeguards: SafeguardDef[];
};

/* ═══ Escalas comunes a los dos instrumentos ═══ */

export const MAD_LEVELS = [
  { n: 1, name: "Inicial", color: "var(--n1)", desc: "Prácticas informales, dependientes de personas; sin registro sistemático." },
  { n: 2, name: "En desarrollo", color: "var(--n2)", desc: "Documentadas en algunas unidades; herramientas aisladas, sin integración." },
  { n: 3, name: "Definido", color: "var(--n3)", desc: "Procesos formalizados; responsables asignados; datos consistentes." },
  { n: 4, name: "Gestionado", color: "var(--n4)", desc: "Procesos medidos con indicadores; decisiones con datos; interoperabilidad." },
  { n: 5, name: "Optimizado", color: "var(--n5)", desc: "Mejora continua sobre evidencia; analítica avanzada; capacidad de referente." },
] as const;
/** Nivel alcanzado: el entero que el valor ya completó (2,5 sigue siendo nivel 2). */
export const madLevelN = (v: number) => Math.min(5, Math.max(1, Math.floor(v + 1e-9)));
export const madLevelName = (v: number) => MAD_LEVELS[madLevelN(v) - 1].name;

/** Niveles del índice 0–100. */
export const INDEX_LEVELS = [
  { name: "Inicial", min: 0, max: 19, color: "var(--n1)", desc: "Sin dirección común; acciones reactivas; riesgos no gestionados." },
  { name: "Emergente", min: 20, max: 39, color: "var(--n2)", desc: "Intenciones y pilotos; cobertura desigual; beneficios no demostrados." },
  { name: "Gestionado", min: 40, max: 59, color: "var(--n3)", desc: "Políticas y responsables definidos; indicadores y revisiones; mejoras fragmentadas." },
  { name: "Integrado", min: 60, max: 79, color: "var(--n4)", desc: "Gobierno articulado con el negocio; prácticas interoperables; decisiones con datos." },
  { name: "Transformador", min: 80, max: 100, color: "var(--n5)", desc: "Prácticas escaladas y sostenibles; impacto demostrable; aprendizaje continuo." },
] as const;
export const indexLevel = (score: number) => INDEX_LEVELS.find((l) => score <= l.max + 0.999) ?? INDEX_LEVELS[INDEX_LEVELS.length - 1];

/** Anclas de calificación de la evidencia (0–4), las mismas para todo el instrumento. */
export const DIK_ANCHORS: Record<EvidenceComponent, { label: string; question: string; levels: Rubric }> = {
  D: { label: "Documentación", question: "¿Está escrito, aprobado y vigente?", levels: ["No existe documento", "Borrador o práctica informal sin aprobar", "Aprobado, con difusión limitada", "Aprobado, difundido y conocido", "Formalizado y revisado periódicamente"] },
  I: { label: "Implementación", question: "¿Se practica realmente?", levels: ["No implementado", "Piloto aislado o esfuerzo individual", "Parcial: opera en algunas áreas", "Desplegado en la mayor parte de la organización", "Sistemático, sostenible y con mejora"] },
  K: { label: "Indicadores", question: "¿Se mide y se usa para decidir?", levels: ["Sin datos", "Datos ocasionales o anecdóticos", "Medición regular sin metas", "Indicadores con metas y seguimiento", "Indicadores usados para decidir y mejorar"] },
};

/* ═══ Captura y cortes (datos de cada empresa) ═══ */

export type MadCapture = {
  perception?: number;    // 1–5 · percepción: promedio de las respuestas de las personas, o el valor acordado en sesión si nadie ha respondido
  perceptionN?: number;   // cuántas personas respondieron esa variable
  d?: number; i?: number; k?: number;   // 0–4 · evidencia, la califica el advisor
  level?: number;         // 1–5 · nivel contra la rúbrica, lo asigna el advisor
  target?: number;        // 1–5 · meta de la variable
  hallazgo?: string;      // el hecho encontrado
  recomendacion?: string; // la acción que cierra la brecha
  by: string;
  at: string;             // ISO
};
export type Captures = Record<string, MadCapture>;

/** Respuesta de percepción de una persona: una afirmación por variable, de 1 a 5; 0 es «No lo sé» y no entra al promedio. */
export type MadResponse = { email: string; name: string; role: string; answers: Record<string, number>; at: string; done?: string };
export const PERCEPTION_SCALE = ["Totalmente en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Totalmente de acuerdo"] as const;
export const isPerceptionAnswer = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5;
/** Percepción de una variable: promedio de las respuestas válidas (1–5) de las personas, con dos decimales. */
export function perceptionOf(resps: Iterable<MadResponse>, varId: string): { value: number; n: number } | null {
  let sum = 0, n = 0;
  for (const r of resps) { const a = r.answers[varId]; if (typeof a === "number" && a >= 1) { sum += a; n++; } }
  return n ? { value: Math.round((sum / n) * 100) / 100, n } : null;
}
export type SafeguardStatus = "CUMPLE" | "PARCIAL" | "FALLA";
export type SafeguardState = Record<string, { status: SafeguardStatus; note?: string }>;
export const SAFEGUARD_LABEL: Record<SafeguardStatus, string> = { CUMPLE: "Cumple", PARCIAL: "Parcial", FALLA: "Falla" };
export type MadCut = { id: string; label: string; at: string; by: string; kind: OrgKind; vars: Captures; safeguards: SafeguardState };
export const CAPTURE_FIELDS = ["perception", "d", "i", "k", "level", "target", "hallazgo", "recomendacion"] as const;
export type CaptureField = (typeof CAPTURE_FIELDS)[number];
/** Campos que solo califica el advisor: garantía de independencia de la medición. */
export const GRADING_FIELDS: CaptureField[] = ["d", "i", "k", "level", "target", "hallazgo", "recomendacion"];

const inRange = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
/** Valida un cambio de captura; devuelve el error o nulo. Los textos van recortados a 1.200 caracteres. */
export function captureError(patch: Partial<Record<CaptureField, unknown>>): string | null {
  if (patch.perception !== undefined && patch.perception !== null && !inRange(patch.perception, 1, 5)) return "La percepción es un entero de 1 a 5.";
  for (const k of ["d", "i", "k"] as const) if (patch[k] !== undefined && patch[k] !== null && !inRange(patch[k], 0, 4)) return `La evidencia ${k.toUpperCase()} es un entero de 0 a 4.`;
  for (const k of ["level", "target"] as const) if (patch[k] !== undefined && patch[k] !== null && !inRange(patch[k], 1, 5)) return `${k === "level" ? "El nivel" : "La meta"} es un entero de 1 a 5.`;
  for (const k of ["hallazgo", "recomendacion"] as const) if (patch[k] !== undefined && patch[k] !== null && typeof patch[k] !== "string") return "El texto no es válido.";
  return null;
}

/* ═══ Reglas de cálculo (funciones puras sobre una captura) ═══ */

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const has = (v: number | undefined | null): v is number => typeof v === "number";

/** Percepción normalizada: Likert 1–5 → 0–100. */
export const P = (c?: MadCapture) => (c && has(c.perception) ? ((c.perception - 1) / 4) * 100 : null);
/** Evidencia normalizada: E = 0,25·D + 0,35·I + 0,40·K. Pesa más el resultado: una política sin uso ni medición no crea valor. */
export const E = (c?: MadCapture) => (c && has(c.d) && has(c.i) && has(c.k) ? 0.25 * (c.d / 4) * 100 + 0.35 * (c.i / 4) * 100 + 0.4 * (c.k / 4) * 100 : null);
/** Puntuación verificada: S = 0,40·P + 0,60·E. */
export const S = (c?: MadCapture) => { const p = P(c), e = E(c); return p === null || e === null ? null : 0.4 * p + 0.6 * e; };
/** Brecha percepción − evidencia. Más de 20 puntos es un hallazgo de gestión. */
export const gapPE = (c?: MadCapture) => { const p = P(c), e = E(c); return p === null || e === null ? null : p - e; };
export type GapReading = "SOBREESTIMACION" | "CONVERGENCIA" | "PRACTICA_INVISIBLE";
export const GAP_LABEL: Record<GapReading, string> = { SOBREESTIMACION: "Sobreestimación", CONVERGENCIA: "Convergencia", PRACTICA_INVISIBLE: "Práctica invisible" };
export const gapReading = (c?: MadCapture): GapReading | null => { const d = gapPE(c); return d === null ? null : d > 20 ? "SOBREESTIMACION" : d < -20 ? "PRACTICA_INVISIBLE" : "CONVERGENCIA"; };

export type PracticeState = "AUSENTE" | "DISPONIBILIDAD" | "ADOPCION" | "INTEGRACION" | "IMPACTO";
export const PRACTICE_STATES: { key: PracticeState; label: string; question: string }[] = [
  { key: "AUSENTE", label: "Ausente", question: "No hay política, capacidad ni recursos verificables." },
  { key: "DISPONIBILIDAD", label: "Disponible", question: "¿Existen políticas, capacidades, plataformas, personas y recursos?" },
  { key: "ADOPCION", label: "Adoptada", question: "¿Las capacidades son utilizadas regularmente por quienes corresponde?" },
  { key: "INTEGRACION", label: "Integrada", question: "¿Las prácticas están articuladas con procesos, decisiones y sistemas?" },
  { key: "IMPACTO", label: "Con impacto", question: "¿Se demuestran cambios positivos, sostenibles y atribuibles?" },
];
export function practiceState(c?: MadCapture): PracticeState | null {
  if (!c || !has(c.d) || !has(c.i) || !has(c.k)) return null;
  if (c.k >= 3) return "IMPACTO";
  if (c.d >= 3 && c.i >= 3) return "INTEGRACION";
  if (c.i >= 2) return "ADOPCION";
  if (c.d >= 1 || c.i >= 1) return "DISPONIBILIDAD";
  return "AUSENTE";
}
/** Evidencia suficiente: documentado e implementado (D≥2, I≥2) y al menos medido alguna vez (K≥1). */
export const sufficientEvidence = (c?: MadCapture) => !!c && has(c.d) && has(c.i) && has(c.k) && c.d >= 2 && c.i >= 2 && c.k >= 1;

export type Progress = { total: number; perception: number; dik: number; level: number };
export function progressOf(ins: MadInstrument, caps: Captures): Progress {
  let perception = 0, dik = 0, level = 0;
  for (const v of ins.variables) {
    const c = caps[v.id]; if (!c) continue;
    if (has(c.perception)) perception++;
    if (has(c.d) && has(c.i) && has(c.k)) dik++;
    if (has(c.level)) level++;
  }
  return { total: ins.variables.length, perception, dik, level };
}

export type Cell = { value: number | null; target: number | null; n: number; graded: number };
/** Celda línea × dimensión: promedio simple del nivel de sus variables calificadas. */
export function cellOf(ins: MadInstrument, caps: Captures, line: number, dim: DimKey): Cell {
  const vars = ins.variables.filter((v) => v.line === line && v.dimension === dim);
  const lv = vars.map((v) => caps[v.id]?.level).filter(has), tg = vars.map((v) => caps[v.id]?.target).filter(has);
  return { value: lv.length ? mean(lv) : null, target: tg.length ? mean(tg) : null, n: vars.length, graded: lv.length };
}
const levelsOf = (ins: MadInstrument, caps: Captures, pick: (v: MadVariable) => boolean) => ins.variables.filter(pick).map((v) => caps[v.id]?.level).filter(has);
export const lineLevel = (ins: MadInstrument, caps: Captures, line: number) => { const xs = levelsOf(ins, caps, (v) => v.line === line); return xs.length ? mean(xs) : null; };
export const dimLevel = (ins: MadInstrument, caps: Captures, dim: DimKey) => { const xs = levelsOf(ins, caps, (v) => v.dimension === dim); return xs.length ? mean(xs) : null; };
/** Madurez general: promedio de las líneas con medición (cada línea pesa igual). */
export const overallLevel = (ins: MadInstrument, caps: Captures) => { const xs = ins.lines.map((l) => lineLevel(ins, caps, l.n)).filter(has); return xs.length ? mean(xs) : null; };
export const domainLevel = (ins: MadInstrument, caps: Captures, d: MadDomain) => { const xs = levelsOf(ins, caps, (v) => d.variableIds.includes(v.id)); return xs.length ? mean(xs) : null; };

const scoresOf = (ins: MadInstrument, caps: Captures, pick: (v: MadVariable) => boolean) => ins.variables.filter(pick).map((v) => S(caps[v.id])).filter(has);
/** Índice 0–100 de una línea: promedio simple de S de sus variables con percepción y evidencia. */
export const lineIndex = (ins: MadInstrument, caps: Captures, line: number) => { const xs = scoresOf(ins, caps, (v) => v.line === line); return xs.length ? mean(xs) : null; };
/** Índice general: líneas ponderadas por su peso (se renormaliza entre las que tienen medición). */
export function generalIndex(ins: MadInstrument, caps: Captures) {
  const parts = ins.lines.map((l) => ({ w: l.weight, s: lineIndex(ins, caps, l.n) })).filter((x): x is { w: number; s: number } => x.s !== null);
  const w = parts.reduce((a, x) => a + x.w, 0);
  return w ? parts.reduce((a, x) => a + (x.w / w) * x.s, 0) : null;
}
/** Índice por dimensión transversal, con los pesos de las líneas. */
export function d7Index(ins: MadInstrument, caps: Captures, d7: D7) {
  const parts = ins.lines.map((l) => { const xs = scoresOf(ins, caps, (v) => v.line === l.n && v.d7 === d7); return xs.length ? { w: l.weight, s: mean(xs) } : null; }).filter((x): x is { w: number; s: number } => !!x);
  const w = parts.reduce((a, x) => a + x.w, 0);
  return w ? parts.reduce((a, x) => a + (x.w / w) * x.s, 0) : null;
}
export function practiceCounts(ins: MadInstrument, caps: Captures) {
  const counts: Record<PracticeState, number> = { AUSENTE: 0, DISPONIBILIDAD: 0, ADOPCION: 0, INTEGRACION: 0, IMPACTO: 0 };
  let n = 0;
  for (const v of ins.variables) { const st = practiceState(caps[v.id]); if (st) { counts[st]++; n++; } }
  return { counts, n };
}
/** Cobertura de evidencia: variables con evidencia suficiente sobre el total del instrumento. */
export const evidenceCoverage = (ins: MadInstrument, caps: Captures) => (ins.variables.filter((v) => sufficientEvidence(caps[v.id])).length / ins.variables.length) * 100;

/** Índice de preparación para IA: componentes ponderados; una salvaguarda en falla le pone techo. */
export function aiqOf(ins: MadInstrument, caps: Captures, sg: SafeguardState) {
  const components = ins.aiq.map((c) => { const xs = scoresOf(ins, caps, (v) => c.variableIds.includes(v.id)); return { ...c, score: xs.length ? mean(xs) : null }; });
  const con = components.filter((c): c is typeof c & { score: number } => c.score !== null);
  const w = con.reduce((a, c) => a + c.weight, 0);
  const raw = w ? con.reduce((a, c) => a + (c.weight / w) * c.score, 0) : null;
  const caps2 = ins.safeguards.filter((s) => sg[s.id]?.status === "FALLA" && s.cap !== null).map((s) => s.cap as number);
  const cap = caps2.length ? Math.min(...caps2) : null;
  const sub = (prep: boolean) => { const xs = con.filter((c) => c.prep === prep).map((c) => c.score); return xs.length ? mean(xs) : null; };
  return { raw, capped: raw === null ? null : cap === null ? raw : Math.min(raw, cap), cap, capApplied: raw !== null && cap !== null && raw > cap, components, preparacion: sub(true), adopcion: sub(false) };
}

/** Comprobación de integridad de un instrumento (la usan las pruebas). */
export function instrumentIssues(ins: MadInstrument): string[] {
  const out: string[] = [], ids = new Set<string>();
  for (const v of ins.variables) {
    if (ids.has(v.id)) out.push(`id repetido ${v.id}`); ids.add(v.id);
    if (!ins.lines.some((l) => l.n === v.line)) out.push(`${v.id}: línea ${v.line} no existe`);
    if (!DIM_KEYS.includes(v.dimension)) out.push(`${v.id}: dimensión ${v.dimension}`);
    if (!ins.frames[v.frame]) out.push(`${v.id}: referente ${v.frame} sin definir`);
    if (!D7_KEYS.includes(v.d7)) out.push(`${v.id}: dimensión transversal ${v.d7}`);
    if (!v.items.some((i) => i.type === "likert")) out.push(`${v.id}: sin ítem de percepción`);
    for (const i of v.items) for (const a of i.audiences) if (!ins.audiences[a]) out.push(`${v.id}: audiencia ${a} sin definir`);
    for (const c of ["D", "I", "K"] as const) if (!v.evidence.some((e) => e.component === c)) out.push(`${v.id}: sin evidencia ${c}`);
    if (v.rubric.length !== 5 || v.rubric.some((r) => !r.trim())) out.push(`${v.id}: rúbrica incompleta`);
  }
  for (const l of ins.lines) for (const d of DIM_KEYS) if (ins.variables.filter((v) => v.line === l.n && v.dimension === d).length < 3) out.push(`celda ${l.code} × ${d}: menos de tres variables`);
  if (Math.abs(ins.lines.reduce((a, l) => a + l.weight, 0) - 1) > 1e-6) out.push("los pesos de las líneas no suman 1");
  if (Math.abs(ins.aiq.reduce((a, c) => a + c.weight, 0) - 1) > 1e-6) out.push("los pesos del índice de IA no suman 1");
  for (const d of ins.domains) for (const id of d.variableIds) if (!ids.has(id)) out.push(`dominio ${d.id}: variable ${id} no existe`);
  for (const c of ins.aiq) for (const id of c.variableIds) if (!ids.has(id)) out.push(`índice de IA ${c.key}: variable ${id} no existe`);
  return out;
}
