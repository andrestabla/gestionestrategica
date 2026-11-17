// Instancia «DEMO SIEGFRIED» con todo el recorrido del método hecho: catálogo real de Siegfried (prioridades,
// responsables, resultados 2026) más la capa demo (objetivos 2027, resultados clave, iniciativas completas,
// validaciones en verde, calificaciones de tres evaluadores, decisiones de tiempo, capacidades para ejecutar y
// cascada trimestral), diez autoevaluaciones directivas y la capa de ejecución a mitad de 2027. Lleva el contexto real
// de un cliente: es para uso interno del equipo consultor. El generador es común (src/server/demo-builder.ts).

import base from "@/data/demo-siegfried/base.json";
import { DEMO_SLUG, DEMO_NAME, DEMO_SHORT, LEVERS, OBJETIVOS, KRS, INICIATIVAS, OBJETIVO_SIN_PRIORIDAD, INICIATIVA_SIN_KR, JUSTIFICACION_OBJETIVO, JUSTIFICACION_INI, EVALUADORES, CALIFICACIONES, DECISIONES, CAPACIDADES, CHECKLISTS_PERSONALIZADOS, ARTICULACION, METAS, F1_PERFIL, F1_DIRECTIVOS } from "@/data/demo-siegfried/contenido";
import { DEMO_HOY, PERSONAS, PLANES, RIESGOS, GASTOS, AVANCE_KR_T1, AVANCE_KR_POR_DEFECTO, NOTAS_KR_T1, AVANCE_INICIATIVAS, CIERRES_T1, MADUREZ_PERFIL, MADUREZ_SESGO, MADUREZ_SALVAGUARDAS, MADUREZ_CORTE, INICIATIVAS_MAPEADAS } from "@/data/demo-siegfried/ejecucion";
import { construirDemo, type PaqueteDemo } from "@/server/demo-builder";
import type { SessionUser } from "@/lib/session";

const co = base.company as Record<string, unknown>;

export const PAQUETE_SIEGFRIED: PaqueteDemo = {
  slug: DEMO_SLUG, name: DEMO_NAME, shortName: DEMO_SHORT, dominio: "demo-siegfried.demo",
  company: { city: String(co.city ?? ""), department: String(co.department ?? ""), sector: String(co.sector ?? ""), size: String(co.size ?? ""), sectorKey: String(co.sectorKey ?? ""), ciiu: String(co.ciiu ?? ""), horizons: co.horizons },
  typeRule: "cresio", mode: "acompanamiento", instruments: ["f1"],
  base: { responsibles: base.responsibles, objectives: base.objectives, kpis: base.kpis },
  levers: LEVERS, objetivos: OBJETIVOS, krs: KRS, iniciativas: INICIATIVAS, iniciativasMapeadas: INICIATIVAS_MAPEADAS,
  objetivoSinPrioridad: OBJETIVO_SIN_PRIORIDAD, iniciativaSinKr: INICIATIVA_SIN_KR,
  textos: {
    justificacionObjetivo: JUSTIFICACION_OBJETIVO, justificacionIni: JUSTIFICACION_INI,
    resumenAlineacion: "Dieciséis objetivos directivos 2027 están alineados con las siete prioridades (de dos a tres por prioridad): cada uno tiene verbo de logro, resultado, indicador impulsor declarado y el plazo del horizonte, sin cifras de meta, sin duplicidades y sin enunciados que sean resultados clave o iniciativas. Un objetivo (OE-18) está bien formulado pero no cuelga de ninguna prioridad: no pasa a Resultados clave hasta que el comité lo ubique. El objetivo descartado (OE-17) queda en el registro y no se valida.",
    sinPrioridad: { justificacion: "Tiene verbo de logro, resultado e indicador impulsor, pero no está vinculado a ninguna prioridad estratégica: no se puede juzgar a qué apuesta aporta ni pasa a Resultados clave.", recomendaciones: ["Vincularlo a la prioridad a la que aporta (por ejemplo, Disciplina Operacional) o descartarlo con su motivo."] },
    resumenValidacionIni: "Veintidós iniciativas cumplen los ocho elementos: nombre como entrega, qué logran, responsable, inicio y fin, capacidad que instalan, presupuesto, resultado clave que mueven y alcance acotado. Una (in23) no está vinculada a ningún resultado clave: no pasa a Priorización hasta que se vincule. Dos más (in24 e in25) están mapeadas como proyecto especial e iniciativa disruptiva, aún sin objetivo ni resultado clave: se consideran en el portafolio y no se priorizan hasta asociarles uno.",
    sinKr: { justificacion: "Está bien formulada como entrega, con responsable, plazo, capacidad y presupuesto, pero no mueve ningún resultado clave: así no es estratégica ni pasa a Priorización.", recomendaciones: ["Vincularla al resultado clave de su objetivo que realmente mueve (por ejemplo, contactos efectivos por médico) o dejarla fuera del portafolio."] },
    notasSalvaguardas: ["Hay inventario de los sistemas en uso, pero dos no tienen responsable designado.", "", "No se hace evaluación de privacidad antes de iniciar tratamientos de datos de pacientes y médicos.", "Un incidente menor de 2026 se gestionó sin registro formal.", ""],
  },
  evaluadores: EVALUADORES as PaqueteDemo["evaluadores"],
  calificaciones: CALIFICACIONES, decisiones: DECISIONES, capacidades: CAPACIDADES, checklists: CHECKLISTS_PERSONALIZADOS,
  articulacion: ARTICULACION, metas: METAS, f1Perfil: F1_PERFIL, f1Directivos: F1_DIRECTIVOS,
  ejecucion: {
    hoy: DEMO_HOY, personas: PERSONAS, planes: PLANES, riesgos: RIESGOS, gastos: GASTOS,
    avanceKrT1: AVANCE_KR_T1, avanceKrPorDefecto: AVANCE_KR_POR_DEFECTO, notasKrT1: NOTAS_KR_T1, avanceIniciativas: AVANCE_INICIATIVAS, cierresT1: CIERRES_T1,
    madurezPerfil: MADUREZ_PERFIL, madurezSesgo: MADUREZ_SESGO, madurezSalvaguardas: MADUREZ_SALVAGUARDAS, madurezCorte: MADUREZ_CORTE,
  },
};

export const crearDemoSiegfried = (actor: SessionUser, opts: { recrear?: boolean; archivos?: boolean } = {}) => construirDemo(actor, PAQUETE_SIEGFRIED, opts);
