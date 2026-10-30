// ─────────────────────────────────────────────────────────────────────────────
// Módulos de la plataforma que el administrador enciende o apaga por empresa.
// Todos existen siempre; la empresa decide cuáles ve su gente (p. ej. en un
// acompañamiento que arranca solo con Diagnóstico y Prioridades). Sin
// configuración, todos están encendidos. Se guarda la lista de los APAGADOS,
// así un módulo nuevo nace encendido. El menú oculta lo apagado y la ruta
// se bloquea para los usuarios de la empresa; el admin y el advisor siguen
// viendo el módulo con un aviso, para preparar datos antes de encenderlo.
// Panel y Administración no se apagan.
// ─────────────────────────────────────────────────────────────────────────────

import type { CompanyMode } from "@/lib/acceso";
import { estrategiaTabOfSlug, vocabOf } from "@/lib/vocabulario";

export const MODULES = [
  { id: "diagnostico", label: "Diagnóstico", desc: "Capacidad organizacional: autoevaluación, fuentes, brechas e informe.", modes: ["completa", "acompanamiento"] },
  { id: "benchmark", label: "Benchmark", desc: "Posición sectorial frente a pares y presencia territorial.", modes: ["completa"] },
  { id: "estrategia", label: "Estrategia", desc: "Cuadro de mando y OKR: objetivos, resultados clave e iniciativas.", modes: ["completa"] },
  { id: "kpi", label: "Indicadores", desc: "Batería de KPI con dueño, fuente y serie.", modes: ["completa"] },
  { id: "ruta", label: "Ruta", desc: "Roadmap de la transformación por horizonte.", modes: ["completa"] },
  { id: "seguimiento", label: "Iniciativas (seguimiento)", desc: "Avance, presupuesto y factores críticos de éxito.", modes: ["completa"] },
  { id: "convencion", label: "Convención", desc: "Dirección, OKR, iniciativas, priorización y portafolio con QR por sección.", modes: ["completa"] },
  { id: "proyectos", label: "Proyectos", desc: "Tablero de proyectos y tareas.", modes: ["completa"] },
  { id: "itinerario", label: "Itinerario", desc: "Agenda de los dos días de la convención.", modes: ["convencion"] },
  { id: "guia", label: "Guía del día 2", desc: "Guía de trabajo del segundo día.", modes: ["convencion"] },
  { id: "prioridades", label: "Prioridades estratégicas", desc: "Las prioridades a 3 a 5 años con sponsor e indicador.", modes: ["acompanamiento"] },
  { id: "direccion", label: "Objetivos directivos", desc: "Objetivos del cuadro de mando por prioridad y horizonte.", modes: ["acompanamiento", "convencion"] },
  { id: "okr", label: "Resultados clave", desc: "Cada objetivo con sus resultados clave: base, meta, dueño y plazo.", modes: ["acompanamiento", "convencion"] },
  { id: "iniciativas", label: "Iniciativas", desc: "Qué iniciativa mueve cada resultado clave.", modes: ["acompanamiento", "convencion"] },
  { id: "priorizacion", label: "Priorización", desc: "Calificación con la matriz y ranking.", modes: ["acompanamiento", "convencion"] },
  { id: "portafolio", label: "Portafolio", desc: "Portafolio por prioridad y decisión de tiempo.", modes: ["acompanamiento", "convencion"] },
  { id: "inteligencia", label: "Inteligencia", desc: "Benchmark sectorial, indicadores y análisis.", modes: ["completa", "acompanamiento"] },
  { id: "informe", label: "Informe", desc: "Informe ejecutivo de la plataforma.", modes: ["completa"] },
  { id: "metodologia", label: "Metodología", desc: "Marco conceptual, metodologías y frameworks.", modes: ["completa"] },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
export const ALL_MODULES: ModuleId[] = MODULES.map((m) => m.id);
export const isModule = (x: unknown): x is ModuleId => ALL_MODULES.includes(x as ModuleId);
/** Módulos que aplican a un modo de empresa, en el orden del menú. */
export const modulesForMode = (mode: CompanyMode) => MODULES.filter((m) => (m.modes as readonly string[]).includes(mode));

/** Valida la lista de apagados: nula o vacía = todos encendidos; solo ids conocidos. */
export function parseModulesOff(input: unknown): { ok: true; modulesOff?: ModuleId[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, modulesOff: undefined };
  if (!Array.isArray(input)) return { ok: false, error: "Los módulos apagados deben ser una lista." };
  const desconocidos = input.filter((x) => !isModule(x));
  if (desconocidos.length) return { ok: false, error: `Módulo desconocido: ${desconocidos.map(String).join(", ")}. Opciones: ${ALL_MODULES.join(", ")}.` };
  const out = ALL_MODULES.filter((m) => input.includes(m));
  return { ok: true, modulesOff: out.length ? out : undefined };
}

export const modulesOffOf = (c: { modulesOff?: ModuleId[] } | null | undefined): ModuleId[] => c?.modulesOff ?? [];
export const moduleEnabled = (c: { modulesOff?: ModuleId[] } | null | undefined, id: ModuleId): boolean => !modulesOffOf(c).includes(id);

/** Nombre del módulo con el vocabulario del modo (las secciones de estrategia cambian de nombre). */
export function moduleLabel(id: ModuleId, mode: CompanyMode): string {
  const tabs = vocabOf({ mode }).tabs as Record<string, string>;
  return tabs[id] ?? MODULES.find((m) => m.id === id)?.label ?? id;
}

/** Módulo al que pertenece una ruta interna (sin el prefijo de empresa), con la pestaña ?t= de la
    convención. Nulo para el panel, Administración y lo que no es un módulo. */
export function moduleOfRoute(path: string, t: string | null, mode: CompanyMode): ModuleId | null {
  const p = path.replace(/\/+$/, "") || "/";
  const under = (pre: string) => p === pre || p.startsWith(pre + "/");
  if (under("/panel/diagnostico")) return "diagnostico";
  if (under("/panel/benchmark")) return "benchmark";
  if (under("/panel/estrategia")) {
    if (mode === "completa") return "estrategia";
    const tab = estrategiaTabOfSlug(p.split("/")[3]);
    return tab ?? null;
  }
  if (under("/panel/convencion")) {
    if (mode !== "convencion") return "convencion";
    const tab = t ?? "direccion";
    return isModule(tab) ? tab : null;
  }
  if (under("/panel/kpi")) return "kpi";
  if (under("/panel/ruta")) return "ruta";
  if (under("/panel/iniciativas")) return "seguimiento";
  if (under("/panel/proyectos")) return "proyectos";
  if (under("/panel/bi")) return "inteligencia";
  if (under("/panel/informe")) return "informe";
  if (under("/panel/metodologia")) return "metodologia";
  return null;
}
