// ─────────────────────────────────────────────────────────────────────────────
// Tour guiado por empresa: una secuencia de pasos que lleva a la persona por los módulos de la plataforma, con un
// título y un texto por paso. Se administra en Administración → Tour de cada empresa (activo o no, para quién, pasos)
// y se muestra al entrar al panel; quien lo termina o lo salta no lo vuelve a ver hasta que cambie la versión, pero
// puede abrirlo cuando quiera desde la barra superior. Reglas puras; el servidor lo guarda en la empresa.
// ─────────────────────────────────────────────────────────────────────────────

import { modulesForMode, type ModuleId } from "@/lib/modulos";
import type { CompanyMode } from "@/lib/acceso";

/** Para quién se muestra solo: las cuentas de solo lectura (demostración) o todas las cuentas de la empresa. */
export type TourAudiencia = "lectura" | "todos";
export type PasoTour = {
  id: string;
  titulo: string;
  texto: string;
  ruta: string;      // ruta del panel a la que lleva el paso («/panel», «/panel/diagnostico»…)
  ancla?: string;    // opcional: selector CSS del elemento a resaltar en esa página
};
export type Tour = { activo: boolean; audiencia: TourAudiencia; version: number; pasos: PasoTour[]; at?: string; by?: string };

export const TOUR_MAX_PASOS = 30;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Valida el tour enviado por la administración: hasta 30 pasos, cada uno con título (3+), texto (10+) y una ruta del panel. */
export function parseTour(input: unknown): { ok: true; tour: Tour | undefined } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, tour: undefined };
  if (typeof input !== "object") return { ok: false, error: "El tour debe ser un objeto." };
  const t = input as Record<string, unknown>;
  if (!Array.isArray(t.pasos)) return { ok: false, error: "El tour necesita una lista de pasos." };
  if (t.pasos.length > TOUR_MAX_PASOS) return { ok: false, error: `El tour admite hasta ${TOUR_MAX_PASOS} pasos.` };
  const pasos: PasoTour[] = [];
  const ids = new Set<string>();
  for (const [i, raw] of t.pasos.entries()) {
    const p = (raw ?? {}) as Record<string, unknown>;
    const titulo = str(p.titulo, 80), texto = typeof p.texto === "string" ? p.texto.trim().slice(0, 700) : "", ruta = str(p.ruta, 120), ancla = str(p.ancla, 120);
    if (titulo.length < 3) return { ok: false, error: `Paso ${i + 1}: escribe un título.` };
    if (texto.length < 10) return { ok: false, error: `Paso ${i + 1}: el texto explica qué mirar en esa pantalla (al menos 10 caracteres).` };
    if (!/^\/panel(\/[a-z0-9\-/?=&]*)?$/i.test(ruta)) return { ok: false, error: `Paso ${i + 1}: la ruta debe ser una pantalla del panel (por ejemplo, /panel/diagnostico).` };
    let id = str(p.id, 40).replace(/[^a-z0-9-]/gi, "") || `p${i + 1}`;
    while (ids.has(id)) id = `${id}-${i + 1}`;
    ids.add(id);
    pasos.push({ id, titulo, texto, ruta, ...(ancla ? { ancla } : {}) });
  }
  const audiencia: TourAudiencia = t.audiencia === "todos" ? "todos" : "lectura";
  const version = Number.isInteger(t.version) && (t.version as number) > 0 ? (t.version as number) : 1;
  return { ok: true, tour: { activo: t.activo === true && pasos.length > 0, audiencia, version, pasos } };
}

/** ¿El tour se le muestra solo a esta sesión al entrar? (Siempre se puede abrir a mano si está activo.) */
export const tourAplica = (t: Tour | undefined | null, u: { lectura?: boolean }): boolean => !!t?.activo && t.pasos.length > 0 && (t.audiencia === "todos" || !!u.lectura);

/** Clave del navegador con la que se recuerda que la persona ya vio esta versión del tour. */
export const claveTourVisto = (slug: string, email: string, version: number) => `tour:${slug}:${email.toLowerCase()}:v${version}`;

/* ═══ Tour sugerido ═══ */

const SUGERIDO: Partial<Record<ModuleId | "panel", { titulo: string; texto: string; ruta: string }>> = {
  panel: { titulo: "El panel: la empresa en una pantalla", texto: "Aquí empieza cada lectura: la confianza de entrega del plan, el avance de los proyectos, los resultados clave que la ejecución mueve o frena y las alertas que requieren decisión.", ruta: "/panel" },
  diagnostico: { titulo: "Diagnóstico de capacidades", texto: "La capacidad de la empresa para ejecutar su estrategia, medida con tres fuentes: la autoevaluación del comité, la percepción de los equipos y la evidencia que verifica el consultor. Las alertas muestran dónde la dirección se ve distinto de lo que muestran sus equipos o su evidencia.", ruta: "/panel/diagnostico" },
  madurez: { titulo: "Madurez digital", texto: "Qué tan avanzada está la transformación digital en clientes, operación, innovación y arquitectura, con la percepción de los directivos, la evidencia y el nivel de cada variable, y un informe que la cruza con la industria.", ruta: "/panel/madurez" },
  prioridades: { titulo: "Prioridades estratégicas", texto: "Las apuestas de tres a cinco años: cada una con su resultado esperado, sus indicadores con fuente, un sponsor y la renuncia que la hace creíble.", ruta: "/panel/estrategia/prioridades" },
  direccion: { titulo: "Objetivos directivos", texto: "Lo que la empresa se compromete a lograr este año en cada prioridad, validado con IA: verbo de logro, resultado, indicador impulsor y plazo.", ruta: "/panel/estrategia/objetivos" },
  okr: { titulo: "Resultados clave", texto: "Cada objetivo con sus resultados clave: línea base, meta, dueño y fórmula. Son los números con los que se lee el avance del año.", ruta: "/panel/estrategia/resultados-clave" },
  iniciativas: { titulo: "Iniciativas", texto: "Qué se va a hacer para mover cada resultado clave: entregas con responsable, plazo, presupuesto y la capacidad que instalan.", ruta: "/panel/estrategia/iniciativas" },
  priorizacion: { titulo: "Priorización", texto: "El comité califica cada iniciativa con la matriz (impacto, transversalidad, madurez y urgencia) y la plataforma ordena el portafolio.", ruta: "/panel/estrategia/priorizacion" },
  portafolio: { titulo: "Portafolio", texto: "La decisión de tiempo de cada iniciativa: implementar ahora, preparar con un piloto, dejar en espera o renunciar, con su sustento.", ruta: "/panel/estrategia/portafolio" },
  capacidades: { titulo: "Capacidades para ejecutar", texto: "Antes de arrancar, cada iniciativa se revisa en cinco frentes (unidad, proceso, procedimiento, conocimiento y tecnología) para saber si la empresa puede ejecutarla.", ruta: "/panel/capacidades" },
  cascada: { titulo: "Cascada trimestral", texto: "Las prioridades bajan a metas trimestrales por área, con criterio de éxito, hitos y lo que cada área necesita de las demás; cada trimestre se cierra con su aprendizaje.", ruta: "/panel/cascada" },
  proyectos: { titulo: "Proyectos", texto: "El plan de trabajo de cada iniciativa: tareas con dependencias, entregables con evidencia, riesgos y presupuesto, y cómo cada avance o atraso mueve los resultados clave.", ruta: "/panel/proyectos" },
  inteligencia: { titulo: "Inteligencia del sector", texto: "El contexto con datos abiertos: la posición frente a los competidores directos, el portafolio y las normas del sector, el territorio y las señales del entorno, cada cifra con su fuente.", ruta: "/panel/bi" },
  estrategia: { titulo: "Estrategia", texto: "El cuadro de mando: objetivos por perspectiva con sus indicadores e iniciativas, y la trazabilidad completa.", ruta: "/panel/estrategia" },
  kpi: { titulo: "Indicadores", texto: "Cada indicador con dueño, fuente, periodicidad, serie y semáforo frente a la meta.", ruta: "/panel/kpi" },
  informe: { titulo: "Informe", texto: "El informe ejecutivo para la junta y el comité, listo para imprimir.", ruta: "/panel/informe" },
};

/** Tour sugerido para una empresa: un paso por módulo de su menú, en orden, más la bienvenida y el cierre. */
export function tourSugerido(c: { name: string; mode?: CompanyMode; modulesOff?: ModuleId[] }): Tour {
  const mods: ModuleId[] = modulesForMode(c.mode ?? "completa").map((m) => m.id).filter((m) => !c.modulesOff?.includes(m));
  const pasos: PasoTour[] = [
    { id: "bienvenida", titulo: `Bienvenido a ${c.name}`, texto: "Este recorrido muestra, módulo por módulo, cómo una empresa define su estrategia, decide qué ejecutar y hace seguimiento con el acompañamiento de los consultores. Puedes salir cuando quieras y volver a abrirlo desde el botón «Tour» de la barra superior.", ruta: "/panel" },
    ...(["panel", ...mods] as (ModuleId | "panel")[]).flatMap((m) => { const s = SUGERIDO[m]; return s ? [{ id: m, ...s }] : []; }),
    { id: "cierre", titulo: "Eso es todo", texto: "Puedes seguir recorriendo los módulos por tu cuenta desde el menú de la izquierda. Si quieres ver cómo se haría con tu empresa, agenda una sesión con el equipo de consultores.", ruta: "/panel" },
  ];
  return { activo: true, audiencia: "lectura", version: 1, pasos };
}
