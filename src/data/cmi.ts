// ─────────────────────────────────────────────────────────────────────────────
// 4Shine Empresas · Modelo de gestión de Andina Suministros (empresa
// ilustrativa): directorio de responsables, cuadro de mando con objetivos
// y resultados clave (OKR) por perspectiva, catálogo de KPI con serie,
// evidencias del mapa, iniciativas con acciones y bitácora, y la serie de
// mediciones del diagnóstico 4Shine-OD.
// Valores ilustrativos: la información real se produce con el diagnóstico
// y la instalación de los frameworks en cada empresa.
// ─────────────────────────────────────────────────────────────────────────────

import { DIMS, PRACTICES, frameworkOfPractice } from "@/data/mapa";
import { consolidate } from "@/lib/od";
import { OD_RESPONSES } from "@/data/od-demo";

/* ═══ Directorio de responsables (cargos, no personas) ═══ */

export type Responsible = {
  id: string;
  cargo: string;
  dependencia: string;
  rolPlataforma: "LIDER" | "RESPONSABLE" | "APORTA" | "CONSULTA";
};

export const RESPONSIBLES: Responsible[] = [
  { id: "R01", cargo: "Gerente general", dependencia: "Gerencia general", rolPlataforma: "LIDER" },
  { id: "R02", cargo: "Gerente comercial", dependencia: "Gerencia comercial", rolPlataforma: "RESPONSABLE" },
  { id: "R03", cargo: "Jefe de operaciones y logística", dependencia: "Operaciones", rolPlataforma: "RESPONSABLE" },
  { id: "R04", cargo: "Jefe administrativa y financiera", dependencia: "Administración y finanzas", rolPlataforma: "RESPONSABLE" },
  { id: "R05", cargo: "Jefe de servicio al cliente", dependencia: "Servicio y posventa", rolPlataforma: "RESPONSABLE" },
  { id: "R06", cargo: "Coordinador de talento humano", dependencia: "Talento humano", rolPlataforma: "APORTA" },
  { id: "R07", cargo: "Analista de sistemas", dependencia: "Administración y finanzas", rolPlataforma: "APORTA" },
  { id: "R08", cargo: "Junta de socios", dependencia: "Junta de socios", rolPlataforma: "CONSULTA" },
];

export const responsible = (id: string) => RESPONSIBLES.find((r) => r.id === id)!;

/* ═══ Cuadro de mando · 4 perspectivas ═══ */

export const PERSPECTIVES = [
  { id: "financiera", name: "Financiera", sub: "Crecimiento rentable", color: "#1a2d5a", desc: "El resultado económico que el crecimiento debe producir: ventas, margen y caja." },
  { id: "clientes", name: "Clientes", sub: "Propuesta de valor", color: "#8a6d1f", desc: "Lo que los clientes prioritarios reciben y repiten: promesa cumplida, recompra y recomendación." },
  { id: "procesos", name: "Procesos", sub: "Operación que cumple", color: "#0b6f88", desc: "Las prácticas que convierten las prioridades en resultados consistentes." },
  { id: "aprendizaje", name: "Aprendizaje y crecimiento", sub: "Capacidad instalada", color: "#3f9d8c", desc: "Personas, sistemas y conocimiento que permiten multiplicar sin depender de pocos." },
] as const;

export type CmiObjective = {
  id: string;          // OE-01…
  perspective: string; // id de perspectiva
  name: string;
  kpis: string[];      // códigos de KPI (resultados clave)
  line?: number;       // capacidad dominante 1..4
};

export const CMI_OBJECTIVES: CmiObjective[] = [
  { id: "OE-01", perspective: "financiera", name: "Crecer 25 % en ventas abriendo Barranquilla sin deteriorar el margen", kpis: ["DIR-01", "MUL-03"], line: 1 },
  { id: "OE-02", perspective: "financiera", name: "Sostener el margen de contribución por línea de producto", kpis: ["DIR-02"], line: 1 },
  { id: "OE-03", perspective: "financiera", name: "Anticipar la caja con proyección a ocho semanas", kpis: ["EJE-04"], line: 3 },
  { id: "OE-04", perspective: "clientes", name: "Cumplir la promesa de entrega en los clientes prioritarios", kpis: ["EJE-01", "EJE-02"], line: 3 },
  { id: "OE-05", perspective: "clientes", name: "Elevar la recompra del segmento industrial", kpis: ["DIR-03"], line: 1 },
  { id: "OE-06", perspective: "procesos", name: "Ejecutar las prioridades trimestrales con responsable único y seguimiento", kpis: ["EJE-03"], line: 3 },
  { id: "OE-07", perspective: "procesos", name: "Estandarizar los procesos críticos de venta, compra y entrega", kpis: ["MUL-01"], line: 4 },
  { id: "OE-08", perspective: "aprendizaje", name: "Delegar decisiones y liberar la agenda estratégica del gerente", kpis: ["LID-01", "LID-02"], line: 2 },
  { id: "OE-09", perspective: "aprendizaje", name: "Preparar reemplazos para los cargos críticos", kpis: ["LID-03"], line: 2 },
  { id: "OE-10", perspective: "aprendizaje", name: "Operar con datos confiables y sin recaptura manual", kpis: ["MUL-02"], line: 4 },
];

/* ═══ Catálogo de KPI con ficha completa ═══ */

export type KpiFull = {
  code: string;
  line: number;
  cmi: string;               // objetivo OE-xx
  name: string;
  definition: string;        // definición operativa
  formula: string;
  unit: string;
  frequency: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  source: string;            // sistema o área que produce el dato
  ownerId: string;           // responsable del dato (directorio)
  baseline: number;
  target: number;
  goodDirection: "up" | "down";
  series: { period: string; value: number; note?: string }[];
};

const S = (vals: (number | [number, string])[], from = 2026, q = 1) =>
  vals.map((v, i) => {
    const idx = (q - 1) + i, year = from + Math.floor(idx / 4), t = (idx % 4) + 1;
    const period = `${year}-T${t}`;
    return Array.isArray(v) ? { period, value: v[0], note: v[1] } : { period, value: v };
  });

export const KPI_CATALOG: KpiFull[] = [
  {
    code: "DIR-01", line: 1, cmi: "OE-01", name: "Crecimiento de ventas frente al año anterior",
    definition: "Variación porcentual de las ventas netas del trimestre frente al mismo trimestre del año anterior.",
    formula: "(ventas del trimestre / ventas del mismo trimestre del año anterior − 1) × 100",
    unit: "%", frequency: "Trimestral", source: "Sistema contable", ownerId: "R04",
    baseline: 9, target: 25, goodDirection: "up",
    series: S([7, 9, [9, "Línea base del diagnóstico"], 12, [14, "Primer trimestre con plan trimestral"]], 2026, 1),
  },
  {
    code: "DIR-02", line: 1, cmi: "OE-02", name: "Margen de contribución por línea",
    definition: "Margen de contribución promedio ponderado de las líneas de producto, con costos variables de compra, flete y comisión.",
    formula: "(ingresos − costos variables) / ingresos × 100, ponderado por línea",
    unit: "%", frequency: "Trimestral", source: "Sistema contable · costeo por línea", ownerId: "R04",
    baseline: 23, target: 27, goodDirection: "up",
    series: S([22, 23, [23, "Línea base"], 23, 24, 24], 2026, 1),
  },
  {
    code: "DIR-03", line: 1, cmi: "OE-05", name: "Recompra del segmento industrial",
    definition: "Proporción de clientes industriales activos que compraron en el trimestre y también en el anterior.",
    formula: "(clientes con compra en dos trimestres consecutivos / clientes activos) × 100",
    unit: "%", frequency: "Trimestral", source: "CRM comercial", ownerId: "R02",
    baseline: 54, target: 70, goodDirection: "up",
    series: S([51, 53, [54, "Línea base"], 56, 58, 61], 2026, 1),
  },
  {
    code: "LID-01", line: 2, cmi: "OE-08", name: "Tiempo estratégico en la agenda del gerente",
    definition: "Porcentaje de la agenda semanal del gerente general dedicado a trabajo estratégico y de alto impacto, según el análisis trimestral de agenda.",
    formula: "horas estratégicas / horas totales de agenda × 100",
    unit: "%", frequency: "Trimestral", source: "Análisis de agenda (F08)", ownerId: "R01",
    baseline: 20, target: 45, goodDirection: "up",
    series: S([[20, "Línea base"], 22, 28, [31, "Delegación de cinco decisiones recurrentes"]], 2026, 3),
  },
  {
    code: "LID-02", line: 2, cmi: "OE-08", name: "Decisiones que vuelven a la gerencia",
    definition: "Número de decisiones delegadas por escrito que el gerente retomó o revirtió en el trimestre.",
    formula: "conteo trimestral sobre el inventario de delegaciones",
    unit: "decisiones", frequency: "Trimestral", source: "Inventario de delegaciones (F08)", ownerId: "R01",
    baseline: 11, target: 3, goodDirection: "down",
    series: S([[11, "Línea base"], 9, 7, 6], 2026, 3),
  },
  {
    code: "LID-03", line: 2, cmi: "OE-09", name: "Cargos críticos con reemplazo preparado",
    definition: "Proporción de los cargos críticos del mapa de talento que tienen un reemplazo identificado y en preparación con plan.",
    formula: "(cargos críticos con reemplazo en plan / cargos críticos) × 100",
    unit: "%", frequency: "Semestral", source: "Mapa de talento (F11)", ownerId: "R06",
    baseline: 17, target: 80, goodDirection: "up",
    series: [{ period: "2026-S2", value: 17, note: "Línea base: 1 de 6 cargos" }, { period: "2027-S1", value: 33 }],
  },
  {
    code: "EJE-01", line: 3, cmi: "OE-04", name: "Entregas a tiempo y completas",
    definition: "Proporción de pedidos entregados en la fecha prometida y con todas las referencias, sobre los pedidos del mes.",
    formula: "(pedidos a tiempo y completos / pedidos entregados) × 100",
    unit: "%", frequency: "Mensual", source: "Sistema de pedidos", ownerId: "R03",
    baseline: 81, target: 95, goodDirection: "up",
    series: S([79, 80, [81, "Línea base"], 82, 84, 86, 86, 88], 2025, 3),
  },
  {
    code: "EJE-02", line: 3, cmi: "OE-04", name: "Reclamos por cada cien pedidos",
    definition: "Reclamos formales de clientes registrados en servicio, por cada cien pedidos entregados en el mes.",
    formula: "reclamos / pedidos entregados × 100",
    unit: "por 100", frequency: "Mensual", source: "Registro de servicio", ownerId: "R05",
    baseline: 6.1, target: 2.5, goodDirection: "down",
    series: S([6.8, 6.4, [6.1, "Línea base"], 5.9, 5.2, 4.8, 4.9, 4.3], 2025, 3),
  },
  {
    code: "EJE-03", line: 3, cmi: "OE-06", name: "Compromisos semanales cumplidos",
    definition: "Proporción de los compromisos registrados en la reunión semanal que se cerraron en la fecha acordada.",
    formula: "(compromisos cerrados a tiempo / compromisos con fecha en la semana) × 100",
    unit: "%", frequency: "Mensual", source: "Registro de compromisos (F05)", ownerId: "R03",
    baseline: 41, target: 80, goodDirection: "up",
    series: S([[41, "Línea base: registro recién instalado"], 48, 55, 58, 63, 67], 2026, 3),
  },
  {
    code: "EJE-04", line: 3, cmi: "OE-03", name: "Precisión de la proyección de caja",
    definition: "Desviación absoluta entre la caja proyectada a ocho semanas y la caja real al cierre, como porcentaje de la proyección.",
    formula: "|caja real − caja proyectada| / caja proyectada × 100",
    unit: "%", frequency: "Mensual", source: "Proyección de caja · tesorería", ownerId: "R04",
    baseline: 28, target: 8, goodDirection: "down",
    series: S([[28, "Línea base"], 24, 19, 17, 14, 12], 2026, 3),
  },
  {
    code: "MUL-01", line: 4, cmi: "OE-07", name: "Procesos críticos documentados y en uso",
    definition: "Proporción de los procesos críticos del inventario con ficha vigente, dueño y cumplimiento del estándar verificado en el trimestre.",
    formula: "(procesos críticos con ficha y cumplimiento verificado / procesos críticos) × 100",
    unit: "%", frequency: "Trimestral", source: "Inventario de procesos (F13)", ownerId: "R03",
    baseline: 20, target: 100, goodDirection: "up",
    series: S([[20, "Línea base: 3 de 15"], 27, 40, 47], 2026, 3),
  },
  {
    code: "MUL-02", line: 4, cmi: "OE-10", name: "Horas semanales de recaptura manual de datos",
    definition: "Horas por semana que el equipo administrativo y comercial dedica a pasar datos entre el sistema de pedidos, el contable y las hojas de cálculo.",
    formula: "suma de horas reportadas en la semana de medición",
    unit: "horas", frequency: "Trimestral", source: "Medición de carga (F14)", ownerId: "R07",
    baseline: 34, target: 8, goodDirection: "down",
    series: S([[34, "Línea base"], 31, 26, 22], 2026, 3),
  },
  {
    code: "MUL-03", line: 4, cmi: "OE-01", name: "Margen de la réplica de Barranquilla",
    definition: "Margen de contribución de la nueva sede frente al margen promedio de la empresa, una vez abierta.",
    formula: "margen de contribución de la sede / margen promedio de la empresa × 100",
    unit: "% del promedio", frequency: "Trimestral", source: "Sistema contable · centro de costos", ownerId: "R02",
    baseline: 0, target: 90, goodDirection: "up",
    series: [{ period: "2027-T1", value: 0, note: "Sede aún no abierta: el indicador inicia con la apertura" }],
  },
];

/* ═══ Evidencias: una por práctica del mapa, con el estado de la verificación ═══ */

export type EvidenceFull = {
  id: string;
  line: number;
  dimension: string;         // código de dimensión (DIR-1…)
  practice: string;          // código de práctica (DIR-1.1…)
  title: string;
  kind: "Documento" | "Acta" | "Registro" | "Informe" | "Sistema" | "Encuesta";
  date: string;              // ISO
  status: "VERIFICADA" | "PENDIENTE";
  sourceId: string;          // responsable que la aporta
  note?: string;
};

const F3 = OD_RESPONSES.find((r) => r.tipo === "f3")!;
const OWNER_BY_CAP: Record<number, string> = { 1: "R01", 2: "R01", 3: "R03", 4: "R04" };
const kindOf = (text: string): EvidenceFull["kind"] => {
  const t = text.toLowerCase();
  if (/acta|memo/.test(t)) return "Acta";
  if (/tablero|sistema|crm|reporte autom/.test(t)) return "Sistema";
  if (/encuesta|medici[oó]n de clima/.test(t)) return "Encuesta";
  if (/registro|inventario|calendario|matriz|mapa|lista/.test(t)) return "Registro";
  if (/informe|an[aá]lisis|proyecci[oó]n/.test(t)) return "Informe";
  return "Documento";
};
const firstSentence = (t: string) => { const m = t.match(/^[^.]+\./); return (m ? m[0] : t).replace(/\.$/, ""); };

export const EVIDENCE_CATALOG: EvidenceFull[] = PRACTICES.map((p, i) => {
  const mark = F3.r[p.code];
  const d = new Date(2026, 7, 4 + (i % 9)); // sesiones de verificación de agosto de 2026
  return {
    id: `EV-${String(i + 1).padStart(2, "0")}`,
    line: p.line, dimension: p.dim, practice: p.code,
    title: firstSentence(p.ev), kind: kindOf(p.ev),
    date: d.toISOString().slice(0, 10),
    status: mark === "V" ? "VERIFICADA" : "PENDIENTE",
    sourceId: OWNER_BY_CAP[p.line],
    note: mark === "P" ? "Verificación parcial: existe, pero incompleta, desactualizada o sin rastro de uso." : mark === "N" ? "No se mostró en la sesión de verificación." : undefined,
  };
});
export const evidenceOfPractice = (code: string) => EVIDENCE_CATALOG.find((e) => e.practice === code)!;

/* ═══ Iniciativas: cada una instala una dimensión con un framework ═══ */

export type ActionStatus = "HECHA" | "EN_CURSO" | "PENDIENTE";

export type InitiativeFull = {
  id: string;
  line: number;
  subsistema: "Dirección" | "Comercial" | "Operación" | "Administración" | "Talento";
  cmi: string;                 // objetivo OE-xx
  name: string;
  objetivo: string;            // objetivo de la iniciativa
  horizon: "CORTO" | "MEDIANO";
  impact: number; feasibility: number;
  urgency: number;     // 1–5: presión temporal
  dependency: number;  // 1–5: cuántas otras iniciativas habilita
  status: "PLANEADA" | "EN_CURSO" | "EN_RIESGO" | "COMPLETADA";
  start: string; end: string;
  ownerId: string;
  metaResultado: string;       // meta de resultado global
  budgetPlanned: number; budgetCommitted: number; budgetExecuted: number;
  progress: number;
  capability: string;          // dimensión que instala (DIR-4…)
  framework: string;           // framework que trabaja la empresa (F04…)
  kpi: string;
  actions: { name: string; meta: string; status: ActionStatus; quarter: string }[];
  log: { date: string; type: "HITO" | "ALERTA" | "NOTA"; text: string }[];
  nextMilestone: { date: string; text: string };
  factors: { name: string; state: "VERDE" | "AMBAR" | "ROJO"; history: string[]; note?: string }[];
};

export const INITIATIVES_FULL: InitiativeFull[] = [
  {
    id: "i1", line: 3, subsistema: "Operación", cmi: "OE-06",
    name: "Plan trimestral con responsables únicos y registro de compromisos",
    objetivo: "Convertir las prioridades del trimestre en entregables con meta, fecha y un solo responsable, y sostenerlas con la reunión semanal y el registro de compromisos.",
    horizon: "CORTO", impact: 5, feasibility: 4, urgency: 5, dependency: 5, status: "EN_CURSO",
    start: "2026-T4", end: "2027-T2", ownerId: "R03",
    metaResultado: "El 80 % de los compromisos semanales se cierra en la fecha acordada y las tres prioridades del trimestre tienen responsable único.",
    budgetPlanned: 18_000_000, budgetCommitted: 4_000_000, budgetExecuted: 9_500_000,
    progress: 55, capability: "EJE-2", framework: "F05", kpi: "EJE-03",
    actions: [
      { name: "Definir las tres prioridades del trimestre con la cascada", meta: "Plan trimestral aprobado por el comité", status: "HECHA", quarter: "2026-T4" },
      { name: "Asignar responsable único por prioridad y entregable", meta: "0 prioridades con dos responsables", status: "HECHA", quarter: "2026-T4" },
      { name: "Instalar la reunión semanal de 45 minutos con registro", meta: "12 reuniones consecutivas con acta", status: "EN_CURSO", quarter: "2027-T1" },
      { name: "Acordar el protocolo de consecuencias por incumplimiento", meta: "Protocolo firmado por el comité", status: "PENDIENTE", quarter: "2027-T2" },
    ],
    log: [
      { date: "2026-10-14", type: "HITO", text: "Primer plan trimestral con tres prioridades y responsables únicos." },
      { date: "2027-01-20", type: "NOTA", text: "La reunión semanal se sostiene; el registro de compromisos ya lleva ocho semanas." },
      { date: "2027-02-26", type: "ALERTA", text: "Dos semanas seguidas con cumplimiento bajo 60 %: operaciones concentró urgencias de entrega." },
    ],
    nextMilestone: { date: "2027-03-24", text: "Cierre del primer trimestre completo con registro: meta 65 % de compromisos a tiempo." },
    factors: [
      { name: "Patrocinio del gerente general", state: "VERDE", history: ["VERDE", "VERDE", "VERDE"] },
      { name: "Disciplina de la reunión semanal", state: "AMBAR", history: ["VERDE", "VERDE", "AMBAR"], note: "Se canceló una reunión por una urgencia de despacho." },
      { name: "Capacidad de operaciones para ejecutar", state: "AMBAR", history: ["AMBAR", "AMBAR", "AMBAR"], note: "El jefe de operaciones lleva dos prioridades a la vez." },
    ],
  },
  {
    id: "i2", line: 2, subsistema: "Dirección", cmi: "OE-08",
    name: "Delegación por escrito y agenda estratégica del gerente",
    objetivo: "Sacar al gerente general del día a día: análisis trimestral de agenda, cinco decisiones recurrentes delegadas por escrito con marco de autoridad y rituales de perspectiva.",
    horizon: "CORTO", impact: 5, feasibility: 3, urgency: 4, dependency: 5, status: "EN_CURSO",
    start: "2026-T4", end: "2027-T3", ownerId: "R01",
    metaResultado: "El 45 % de la agenda del gerente es estratégica y menos de tres decisiones delegadas vuelven a gerencia por trimestre.",
    budgetPlanned: 12_000_000, budgetCommitted: 2_000_000, budgetExecuted: 5_000_000,
    progress: 40, capability: "LID-1", framework: "F08", kpi: "LID-01",
    actions: [
      { name: "Análisis de la agenda por tipo de tiempo (línea base)", meta: "Reparto estratégico, relacional y operativo documentado", status: "HECHA", quarter: "2026-T4" },
      { name: "Delegar por escrito cinco decisiones recurrentes", meta: "5 marcos de autoridad firmados", status: "HECHA", quarter: "2027-T1" },
      { name: "Instalar el bloque semanal de pensamiento estratégico", meta: "12 bloques consecutivos cumplidos", status: "EN_CURSO", quarter: "2027-T1" },
      { name: "Conformar el consejo externo trimestral", meta: "Primera sesión realizada", status: "PENDIENTE", quarter: "2027-T3" },
    ],
    log: [
      { date: "2026-11-05", type: "HITO", text: "Análisis de agenda: 20 % estratégico, 25 % relacional, 55 % operativo." },
      { date: "2027-01-28", type: "HITO", text: "Cinco decisiones delegadas por escrito: descuentos, compras hasta 20 millones, horarios, devoluciones y contratación operativa." },
      { date: "2027-02-18", type: "ALERTA", text: "El gerente retomó dos decisiones de descuentos en febrero; se revisa el marco con comercial." },
    ],
    nextMilestone: { date: "2027-04-02", text: "Segundo análisis de agenda: meta 35 % estratégico." },
    factors: [
      { name: "Disposición del gerente a soltar", state: "AMBAR", history: ["AMBAR", "VERDE", "AMBAR"], note: "Retomó decisiones comerciales bajo presión de un cliente grande." },
      { name: "Criterio de los líderes receptores", state: "AMBAR", history: ["ROJO", "AMBAR", "AMBAR"] },
      { name: "Marcos de autoridad escritos", state: "VERDE", history: ["ROJO", "AMBAR", "VERDE"] },
    ],
  },
  {
    id: "i3", line: 4, subsistema: "Operación", cmi: "OE-07",
    name: "Estándar de los quince procesos críticos",
    objetivo: "Inventariar los procesos críticos de venta, compra, recepción, despacho y facturación, asignar dueño y documentar el estándar mínimo no negociable de cada uno.",
    horizon: "MEDIANO", impact: 4, feasibility: 4, urgency: 3, dependency: 4, status: "EN_CURSO",
    start: "2027-T1", end: "2027-T4", ownerId: "R03",
    metaResultado: "Los quince procesos críticos tienen ficha vigente, dueño y cumplimiento del estándar verificado.",
    budgetPlanned: 24_000_000, budgetCommitted: 6_000_000, budgetExecuted: 3_500_000,
    progress: 20, capability: "MUL-2", framework: "F13", kpi: "MUL-01",
    actions: [
      { name: "Inventario de procesos críticos con dueño", meta: "15 procesos con dueño nombrado", status: "HECHA", quarter: "2027-T1" },
      { name: "Documentar el estándar de los cinco procesos de despacho", meta: "5 fichas en uso", status: "EN_CURSO", quarter: "2027-T2" },
      { name: "Documentar los procesos comerciales y de compra", meta: "10 fichas en uso", status: "PENDIENTE", quarter: "2027-T3" },
      { name: "Rutina mensual de captura de excepciones", meta: "Registro con revisión mensual", status: "PENDIENTE", quarter: "2027-T4" },
    ],
    log: [
      { date: "2027-01-19", type: "HITO", text: "Inventario aprobado: 15 procesos críticos, 11 sin documentación." },
      { date: "2027-03-02", type: "NOTA", text: "El estándar de recepción de mercancía ya opera en Bogotá; Medellín lo adopta en marzo." },
    ],
    nextMilestone: { date: "2027-04-15", text: "Cinco fichas de despacho verificadas en las tres sedes." },
    factors: [
      { name: "Tiempo de los dueños de proceso", state: "AMBAR", history: ["AMBAR", "AMBAR", "AMBAR"], note: "Documentan fuera del horario; sin descarga de carga operativa." },
      { name: "Adopción en Medellín y Cali", state: "VERDE", history: ["AMBAR", "VERDE", "VERDE"] },
    ],
  },
  {
    id: "i4", line: 4, subsistema: "Administración", cmi: "OE-10",
    name: "Integración de pedidos, inventario y contabilidad",
    objetivo: "Eliminar la recaptura manual entre el sistema de pedidos, el inventario y el contable con integraciones priorizadas por impacto y esfuerzo.",
    horizon: "MEDIANO", impact: 4, feasibility: 3, urgency: 3, dependency: 3, status: "PLANEADA",
    start: "2027-T2", end: "2028-T1", ownerId: "R07",
    metaResultado: "Menos de ocho horas semanales de recaptura y un catálogo de productos con fuente única.",
    budgetPlanned: 85_000_000, budgetCommitted: 0, budgetExecuted: 0,
    progress: 5, capability: "MUL-3", framework: "F14", kpi: "MUL-02",
    actions: [
      { name: "Mapa de sistemas e integraciones actuales", meta: "1 mapa con fuentes maestras", status: "EN_CURSO", quarter: "2027-T2" },
      { name: "Backlog de automatización priorizado", meta: "Matriz impacto × esfuerzo con 12 ítems", status: "PENDIENTE", quarter: "2027-T2" },
      { name: "Integración pedidos → contabilidad", meta: "Facturas sin digitación doble", status: "PENDIENTE", quarter: "2027-T4" },
      { name: "Catálogo único de productos", meta: "1 fuente maestra en los tres sistemas", status: "PENDIENTE", quarter: "2028-T1" },
    ],
    log: [
      { date: "2027-02-10", type: "NOTA", text: "Medición de carga: 34 horas semanales de recaptura entre administración y comercial." },
    ],
    nextMilestone: { date: "2027-05-10", text: "Backlog priorizado aprobado por el comité." },
    factors: [
      { name: "Presupuesto aprobado por la junta", state: "ROJO", history: ["AMBAR", "ROJO", "ROJO"], note: "La junta lo aplazó dos veces; sin partida no arranca la integración." },
      { name: "Proveedor del sistema contable", state: "VERDE", history: ["VERDE", "VERDE"] },
    ],
  },
  {
    id: "i5", line: 1, subsistema: "Dirección", cmi: "OE-01",
    name: "Estrategia en una página y criterios de decisión",
    objetivo: "Fijar en una página la ambición, el cliente prioritario, las promesas y las renuncias, y convertirla en criterios explícitos para decidir qué negocios aceptar.",
    horizon: "CORTO", impact: 5, feasibility: 5, urgency: 4, dependency: 5, status: "COMPLETADA",
    start: "2026-T3", end: "2026-T4", ownerId: "R01",
    metaResultado: "El comité decide con los criterios escritos y registra las oportunidades declinadas.",
    budgetPlanned: 9_000_000, budgetCommitted: 0, budgetExecuted: 9_000_000,
    progress: 100, capability: "DIR-2", framework: "F02", kpi: "DIR-03",
    actions: [
      { name: "Taller de estrategia en una página", meta: "Documento aprobado por la junta", status: "HECHA", quarter: "2026-T3" },
      { name: "Criterios de calificación comercial", meta: "Matriz de criterios en uso", status: "HECHA", quarter: "2026-T4" },
      { name: "Registro de oportunidades declinadas", meta: "Registro con motivo por caso", status: "HECHA", quarter: "2026-T4" },
    ],
    log: [
      { date: "2026-09-18", type: "HITO", text: "Estrategia en una página aprobada por la junta de socios." },
      { date: "2026-12-02", type: "HITO", text: "Primeras seis oportunidades declinadas con motivo registrado." },
    ],
    nextMilestone: { date: "2027-06-30", text: "Revisión semestral de la estrategia en una página." },
    factors: [
      { name: "Acuerdo de la junta sobre las renuncias", state: "VERDE", history: ["AMBAR", "VERDE", "VERDE"] },
      { name: "Uso de los criterios por el equipo comercial", state: "VERDE", history: ["AMBAR", "AMBAR", "VERDE"] },
    ],
  },
  {
    id: "i6", line: 3, subsistema: "Administración", cmi: "OE-03",
    name: "Proyección de caja a ocho semanas",
    objetivo: "Mantener una proyección de caja actualizada semanalmente, comparada con la caja real, y actuar sobre cobros, pagos e inventarios cuando se desvía.",
    horizon: "CORTO", impact: 4, feasibility: 5, urgency: 5, dependency: 2, status: "EN_CURSO",
    start: "2026-T4", end: "2027-T2", ownerId: "R04",
    metaResultado: "Desviación de la proyección menor al 8 % y decisiones de cobro y compra tomadas con ella.",
    budgetPlanned: 6_000_000, budgetCommitted: 1_000_000, budgetExecuted: 3_000_000,
    progress: 65, capability: "EJE-3", framework: "F06", kpi: "EJE-04",
    actions: [
      { name: "Modelo de proyección semanal a ocho semanas", meta: "Proyección publicada cada lunes", status: "HECHA", quarter: "2026-T4" },
      { name: "Comparación proyectado contra real", meta: "Desviación medida cada mes", status: "HECHA", quarter: "2027-T1" },
      { name: "Política de cobro y compras ligada a la proyección", meta: "Política aprobada y aplicada", status: "EN_CURSO", quarter: "2027-T2" },
    ],
    log: [
      { date: "2026-11-24", type: "HITO", text: "Primera proyección a ocho semanas; desviación inicial del 28 %." },
      { date: "2027-02-27", type: "HITO", text: "Desviación de febrero: 12 %." },
    ],
    nextMilestone: { date: "2027-04-30", text: "Política de cobro aprobada por el comité." },
    factors: [
      { name: "Calidad de los datos de cartera", state: "AMBAR", history: ["ROJO", "AMBAR", "AMBAR"] },
      { name: "Disciplina semanal de tesorería", state: "VERDE", history: ["VERDE", "VERDE", "VERDE"] },
    ],
  },
  {
    id: "i7", line: 2, subsistema: "Talento", cmi: "OE-09",
    name: "Mapa de talento y reemplazos de cargos críticos",
    objetivo: "Identificar los seis cargos críticos, nombrar y preparar un reemplazo para cada uno con delegaciones progresivas.",
    horizon: "MEDIANO", impact: 4, feasibility: 3, urgency: 3, dependency: 3, status: "EN_RIESGO",
    start: "2027-T1", end: "2027-T4", ownerId: "R06",
    metaResultado: "Cinco de los seis cargos críticos con reemplazo en preparación y una delegación real asumida.",
    budgetPlanned: 15_000_000, budgetCommitted: 3_000_000, budgetExecuted: 2_000_000,
    progress: 15, capability: "LID-4", framework: "F11", kpi: "LID-03",
    actions: [
      { name: "Mapa de talento de los cargos críticos", meta: "6 cargos con reemplazo identificado", status: "HECHA", quarter: "2027-T1" },
      { name: "Plan de preparación por reemplazo", meta: "6 planes con delegaciones progresivas", status: "EN_CURSO", quarter: "2027-T2" },
      { name: "Primera delegación real por cargo", meta: "6 delegaciones asumidas", status: "PENDIENTE", quarter: "2027-T4" },
    ],
    log: [
      { date: "2027-01-30", type: "HITO", text: "Mapa de talento: seis cargos críticos, solo uno con reemplazo." },
      { date: "2027-03-05", type: "ALERTA", text: "Renunció la persona identificada como reemplazo del jefe de operaciones." },
    ],
    nextMilestone: { date: "2027-04-20", text: "Seis planes de preparación aprobados." },
    factors: [
      { name: "Retención de los reemplazos identificados", state: "ROJO", history: ["AMBAR", "ROJO", "ROJO"], note: "Una renuncia y otra en riesgo; sin ruta de carrera visible." },
      { name: "Tiempo de los jefes para preparar", state: "AMBAR", history: ["AMBAR", "AMBAR", "AMBAR"] },
    ],
  },
  {
    id: "i8", line: 4, subsistema: "Comercial", cmi: "OE-01",
    name: "Réplica controlada: apertura de Barranquilla",
    objetivo: "Reproducir el modelo de venta y entrega en una nueva sede con la ficha de unidad replicable, el método comercial y el checklist de apertura.",
    horizon: "MEDIANO", impact: 5, feasibility: 2, urgency: 3, dependency: 1, status: "PLANEADA",
    start: "2027-T3", end: "2028-T2", ownerId: "R02",
    metaResultado: "La sede alcanza el 90 % del margen promedio de la empresa a los nueve meses de abierta.",
    budgetPlanned: 320_000_000, budgetCommitted: 0, budgetExecuted: 0,
    progress: 0, capability: "MUL-4", framework: "F15", kpi: "MUL-03",
    actions: [
      { name: "Ficha de la unidad replicable con economía unitaria", meta: "Ficha aprobada por la junta", status: "PENDIENTE", quarter: "2027-T3" },
      { name: "Playbook comercial y checklist de apertura", meta: "Documentos en uso en Medellín como prueba", status: "PENDIENTE", quarter: "2027-T4" },
      { name: "Apertura y estabilización", meta: "Sede operando con margen medido", status: "PENDIENTE", quarter: "2028-T2" },
    ],
    log: [
      { date: "2027-02-12", type: "NOTA", text: "La junta condiciona la apertura a que los procesos críticos estén documentados (i3)." },
    ],
    nextMilestone: { date: "2027-08-15", text: "Ficha de unidad replicable presentada a la junta." },
    factors: [
      { name: "Procesos críticos documentados (i3)", state: "AMBAR", history: ["AMBAR", "AMBAR"] },
      { name: "Financiación de la apertura", state: "AMBAR", history: ["AMBAR", "AMBAR"] },
    ],
  },
];

/* ═══ Serie de mediciones del diagnóstico ═══ */

export type CellScore = { value: number; target: number };
export type AssessmentRecord = {
  id: string; label: string; period: string;
  status: "PUBLICADA" | "EN_CAPTURA";
  note: string;
  scores: Record<number, Record<string, CellScore>> | null; // null = en captura parcial
};

// La medición vigente (A2) ES la consolidación de las respuestas demo del
// 4Shine-OD; la línea base (A1) queda ligeramente por debajo en las
// dimensiones que las iniciativas ya movieron. Meta a 24 meses: cruzar el
// umbral con margen y llegar a gestionada donde ya está instalada.
export const CONSOLIDATED = consolidate(OD_RESPONSES);
const MOVED: Record<string, number> = { "EJE-2": 0.4, "LID-1": 0.3, "DIR-2": 0.5, "EJE-3": 0.3, "MUL-2": 0.2, "DIR-4": 0.2 };
const targetFor = (m: number) => Math.min(5, Math.round((m + 1.3) * 2) / 2);
const scoresOf = (shift: (code: string) => number) => {
  const s: Record<number, Record<string, CellScore>> = { 1: {}, 2: {}, 3: {}, 4: {} };
  for (const d of CONSOLIDATED.dims) {
    const value = Math.max(1, Math.round(((d.m ?? 1) - shift(d.code)) * 10) / 10);
    s[d.line][d.code] = { value, target: targetFor(d.m ?? 1) };
  }
  return s;
};

export const SCORES_HISTORY: AssessmentRecord[] = [
  {
    id: "A1", label: "Línea base · Diagnóstico 4Shine-OD", period: "2026-08", status: "PUBLICADA",
    note: "Primera aplicación completa: 5 autoevaluaciones, 9 respuestas de equipos y 68 evidencias verificadas por el advisor.",
    scores: scoresOf((c) => MOVED[c] ?? 0.1),
  },
  {
    id: "A2", label: "Corte de seguimiento 1", period: "2027-02", status: "PUBLICADA",
    note: "Re-medición semestral: suben accountability y el liderazgo del CEO por el plan trimestral y la delegación por escrito.",
    scores: scoresOf(() => 0),
  },
  {
    id: "A3", label: "Corte de seguimiento 2", period: "2027-08", status: "EN_CAPTURA",
    note: "En captura: los responsables actualizan la autoevaluación de sus capacidades.",
    scores: null,
  },
];

export const ASSESSMENTS = SCORES_HISTORY.map(({ id, label, period, status, note }) => ({
  id, label, period, status, note,
}));

/** Medición publicada vigente (la más reciente con scores). */
export const currentAssessment = () =>
  [...SCORES_HISTORY].reverse().find((a) => a.status === "PUBLICADA" && a.scores)!;
export const previousAssessment = () => {
  const pubs = SCORES_HISTORY.filter((a) => a.status === "PUBLICADA" && a.scores);
  return pubs.length > 1 ? pubs[pubs.length - 2] : null;
};

/** Framework que instala cada iniciativa, resuelto por el mapa. */
export const frameworkOfInitiative = (i: InitiativeFull) =>
  frameworkOfPractice(DIMS.find((d) => d.code === i.capability)!.prac[0].code);
