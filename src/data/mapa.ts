// ─────────────────────────────────────────────────────────────────────────────
// 4Shine Empresas · El mapa: 4 capacidades → 17 dimensiones → 68 prácticas →
// 68 evidencias, con la escala de madurez, las 15 metodologías, los 15
// frameworks, las 5 etapas y los dos instrumentos del diagnóstico 4Shine-OD.
// Fuente única: src/data/4shine.json, exportado desde los generadores de la
// línea (4Shine Empresas/_generadores/export_plataforma.py). No se edita aquí.
// ─────────────────────────────────────────────────────────────────────────────

import raw from "./4shine.json";

export type Practice = { code: string; f1: string; ev: string; verif: string };
export type F2Item = { code: string; text: string };
export type Dimension = {
  code: string; cap: string; name: string; defn: string;
  rub: [string, string, string]; mets: string[]; fws: string[];
  f2: F2Item[]; prac: Practice[];
};
export type Capacity = { name: string; q: string };
export type ScaleLevel = { n: string; name: string; desc: string };
export type TestQuestion = { n: number; q: string; demo: string; codes: string[] };
export type TestBlock = { cap: string; pregunta: string; qs: TestQuestion[] };
export type Stage = {
  name: string; pregunta: string; caracteristicas: string[]; lider: string; soporte: string;
  umbral: string[]; cond: string; preguntas: string; frameworks: string[];
};
export type Methodology = {
  code: string; name: string; principio: string; fundamento: string; pasos: string;
  frameworks: string; referentes: string;
};
export type Framework = {
  id: string; slug: string; name: string; cap: string; promise: string; para: string;
  ev: string[]; pasos: string[]; ritmo: string;
  bloques: { t: string; title: string; ev: string[] }[];
};
type Guide = { q?: string; ni?: string; n?: Record<string, string> };

type Raw = {
  caps: Capacity[]; dims: Dimension[]; g: F2Item[];
  escala: ScaleLevel[]; escalaF1: ScaleLevel[]; escalaF2: ScaleLevel[];
  test: {
    bloques: TestBlock[]; q25: { k: string; text: string; etapa: string }[]; rangos: string[];
    etapas: { name: string; pregunta: string; lider: string; umbral: string[]; cond: string; orient: number[] }[];
    patrones: { qs: number[]; hip: string; accion: string }[];
  };
  fw: Record<string, { name: string; slug: string }>; fwOf: Record<string, string>;
  peso: Record<string, number>; flagTxt: Record<string, string>;
  guia: { test: Record<string, Guide>; f1: Record<string, Guide>; f2: Record<string, Guide>;
    ev: Record<string, Record<string, string>>; niv: Record<string, Record<string, string>> };
  metodologias: Methodology[];
  base: Record<string, { mets: string[]; fundamento: string; aplicacion: string; herramienta: string }>;
  frameworks: Framework[]; etapas: Stage[]; region: { name: string; desc: string }[];
};

export const MAPA = raw as unknown as Raw;

/* ═══ Capacidades (en la plataforma conservan el índice 1..4 de «línea») ═══ */

export const CAPS = [
  { n: 1, code: "DIR", name: "Dirección", verb: "Elegir", color: "#1a2d5a", q: MAPA.caps[0].q },
  { n: 2, code: "LID", name: "Liderazgo", verb: "Movilizar", color: "#8a6d1f", q: MAPA.caps[1].q },
  { n: 3, code: "EJE", name: "Ejecución", verb: "Cumplir", color: "#0b6f88", q: MAPA.caps[2].q },
  { n: 4, code: "MUL", name: "Multiplicación", verb: "Escalar", color: "#3f9d8c", q: MAPA.caps[3].q },
] as const;
export type CapCode = (typeof CAPS)[number]["code"];

export const capOf = (n: number) => CAPS.find((c) => c.n === n)!;
export const capByName = (name: string) => CAPS.find((c) => c.name === name)!;
export const capOfDim = (dimCode: string) => CAPS.find((c) => dimCode.startsWith(c.code))!;

/* ═══ Dimensiones y prácticas ═══ */

const metCode = (x: string) => MAPA.metodologias.find((m) => m.code === x || m.name === x)?.code ?? x;
/** Las dimensiones llevan sus metodologías por código (MET-01…) aunque la fuente las nombre. */
export const DIMS: (Dimension & { line: number })[] = MAPA.dims.map((d) => ({ ...d, line: capOfDim(d.code).n, mets: d.mets.map(metCode) }));
export const dimsOf = (line: number) => DIMS.filter((d) => d.line === line);
export const dimOf = (code: string) => DIMS.find((d) => d.code === code)!;
export const PRACTICES = DIMS.flatMap((d) => d.prac.map((p) => ({ ...p, dim: d.code, line: d.line })));
export const practiceOf = (code: string) => PRACTICES.find((p) => p.code === code)!;

/* ═══ Escala de madurez 1–5 (umbral 3,0) ═══ */

export const THRESHOLD = 3.0;
export const LEVELS = MAPA.escala.map((e, i) => ({
  n: i + 1, name: e.name, desc: e.desc, color: `var(--n${i + 1})`,
}));
/** Nivel 1–5 según los rangos de lectura del diagnóstico completo. */
export const levelOf = (m: number) => (m < 2 ? 1 : m < 3 ? 2 : m < 3.8 ? 3 : m < 4.6 ? 4 : 5);
export const levelName = (m: number) => LEVELS[levelOf(m) - 1].name;

/* ═══ Metodologías, frameworks, etapas ═══ */

export const METHODOLOGIES = MAPA.metodologias;
export const methodologyOf = (code: string) => METHODOLOGIES.find((m) => m.code === code || m.name === code)!;
export const FRAMEWORKS = MAPA.frameworks;
export const frameworkOf = (id: string) => FRAMEWORKS.find((f) => f.id === id)!;
export const frameworkOfPractice = (code: string) => frameworkOf(MAPA.fwOf[code]);
export const STAGES = MAPA.etapas;
export const BASE = MAPA.base;
export const DRAG_WEIGHT = (dimCode: string) => MAPA.peso[dimCode] ?? 1;
export const FLAG_TEXT = MAPA.flagTxt;
export const TEST = MAPA.test;
export const TEST_QUESTIONS = TEST.bloques.flatMap((b, i) => b.qs.map((q) => ({ ...q, line: i + 1 })));
export const F2_GENERAL = MAPA.g;
export const GUIDES = MAPA.guia;
export const REGION = MAPA.region;
