// ─────────────────────────────────────────────────────────────────────────────
// Vocabulario de las secciones de estrategia según el modo de la empresa.
// La convención de Cresio habla de palancas y tribus (Dirección 3x3, OKR,
// Iniciativas → KR, Priorización en vivo); un acompañamiento como el de
// Siegfried habla de prioridades estratégicas y sponsors (Prioridades,
// Objetivos directivos, Resultados clave, Iniciativas, Priorización). Las
// mismas pantallas y reglas; cambian los rótulos y los textos de ayuda.
// ─────────────────────────────────────────────────────────────────────────────

import type { CompanyMode } from "@/lib/acceso";

export type EstrategiaTab = "prioridades" | "direccion" | "okr" | "iniciativas" | "priorizacion" | "portafolio";

export type Vocab = {
  modo: CompanyMode;
  lever: string; levers: string; leverLow: string; leversLow: string; leversAll: string;   // Palanca · Prioridad estratégica
  group: string; groups: string; groupLow: string; groupsLow: string; groupsAll: string;   // Tribu · Sponsor
  leader: string;          // quien registra por el grupo: «el líder de tribu» · «el sponsor»
  manager: string;         // quien abre y cierra la calificación: «el líder» · «el advisor»
  members: string;         // quienes califican: «los miembros de la tribu» · «los miembros del comité»
  tabs: Record<EstrategiaTab, string>;
  kicker: string; title: (company: string) => string; desc: string;
};

const CONVENCION: Vocab = {
  modo: "convencion",
  lever: "Palanca", levers: "Palancas", leverLow: "palanca", leversLow: "palancas", leversAll: "Todas las palancas",
  group: "Tribu", groups: "Tribus", groupLow: "tribu", groupsLow: "tribus", groupsAll: "Todas las tribus",
  leader: "el líder de tribu", manager: "el líder", members: "los miembros de la tribu",
  tabs: { prioridades: "Palancas", direccion: "Dirección 3x3", okr: "OKR", iniciativas: "Iniciativas → KR", priorizacion: "Priorización en vivo", portafolio: "Portafolio" },
  kicker: "Convención de planeación", title: (c) => `Convención · ${c}`,
  desc: "De los diagnósticos de las tribus a la dirección compartida, de los objetivos a OKR y prioridades ejecutables. Lo que se decide en sala queda registrado aquí, en vivo.",
};

const ACOMPANAMIENTO: Vocab = {
  modo: "acompanamiento",
  lever: "Prioridad estratégica", levers: "Prioridades estratégicas", leverLow: "prioridad estratégica", leversLow: "prioridades estratégicas", leversAll: "Todas las prioridades",
  group: "Sponsor", groups: "Sponsors", groupLow: "sponsor", groupsLow: "sponsors", groupsAll: "Todos los sponsors",
  leader: "el sponsor", manager: "el advisor", members: "los miembros del comité",
  tabs: { prioridades: "Prioridades estratégicas", direccion: "Objetivos directivos", okr: "Resultados clave", iniciativas: "Iniciativas", priorizacion: "Priorización", portafolio: "Portafolio" },
  kicker: "Acompañamiento estratégico", title: (c) => `Estrategia · ${c}`,
  desc: "De las prioridades estratégicas a los objetivos directivos, de los resultados clave a las iniciativas priorizadas. Lo que se decide en cada sesión de trabajo queda registrado aquí.",
};

/** Vocabulario de la empresa: por su modo (el modo completo usa el de la convención). */
export const vocabOf = (c: { mode?: CompanyMode } | null | undefined): Vocab => (c?.mode === "acompanamiento" ? ACOMPANAMIENTO : CONVENCION);

/** Segmento de URL de cada sección en las rutas semánticas /panel/estrategia/<slug> (modo acompañamiento). */
export const ESTRATEGIA_SLUG: Record<EstrategiaTab, string> = { prioridades: "prioridades", direccion: "objetivos", okr: "resultados-clave", iniciativas: "iniciativas", priorizacion: "priorizacion", portafolio: "portafolio" };
export const estrategiaTabOfSlug = (slug: string | undefined): EstrategiaTab | null => (Object.entries(ESTRATEGIA_SLUG).find(([, s]) => s === slug)?.[0] as EstrategiaTab | undefined) ?? null;
/** Enlace a una sección de estrategia: ruta semántica en acompañamiento; en los demás modos, la página de la convención con ?t= (los QR de Cresio siguen valiendo). */
export const estrategiaHref = (c: { mode?: CompanyMode } | null | undefined, tab: EstrategiaTab, base = ""): string =>
  c?.mode === "acompanamiento" ? `${base}/panel/estrategia/${ESTRATEGIA_SLUG[tab]}` : `${base}/panel/convencion?t=${tab}`;

/** Pestañas de estrategia que ve cada modo, en orden de menú. */
export const ESTRATEGIA_TABS_ACOMPANAMIENTO: EstrategiaTab[] = ["prioridades", "direccion", "okr", "iniciativas", "priorizacion", "portafolio"];

/** Año del primer horizonte («H1 · 2026» → 2026) para los trimestres de inicio; sin año en la etiqueta, el siguiente al actual. */
export const yearOfFirstHorizon = (horizons: { label: string }[] | undefined): number => {
  const m = /20\d\d/.exec(horizons?.[0]?.label ?? "");
  return m ? Number(m[0]) : new Date().getFullYear() + 1;
};
export const startQuarters = (year: number): [string, string][] => [[`${year}-T1`, "T1"], [`${year}-T2`, "T2"], [`${year}-T3`, "T3"], [`${year}-T4`, "T4"], [`${year + 1}-T1`, "Después"]];
