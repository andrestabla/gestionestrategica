// ─────────────────────────────────────────────────────────────────────────────
// Instancia «DEMO SIEGFRIED» · capa de ejecución. La demo vive detenida en una fecha fija (DEMO_HOY,
// mitad del segundo trimestre de 2027): el plan 2027 ya se está ejecutando. Aquí están las personas
// del directorio, el plan de trabajo de los proyectos decididos (tareas con dependencias, entregables
// e hitos), los riesgos, los movimientos de presupuesto, las mediciones del primer trimestre de los
// resultados clave, el avance de cada iniciativa y el perfil de madurez digital. Todo es ficticio y
// plausible; los nombres de personas son inventados.
// ─────────────────────────────────────────────────────────────────────────────

import type { TaskStatus } from "@/data/proyectos";
import type { RiskCategory, RiskStatus } from "@/lib/riesgos";
import type { GastoTipo } from "@/lib/presupuesto";
import type { IniCategoria } from "@/data/cmi";
import { HOY_DEMO } from "@/data/demo-fechas";

export const DEMO_HOY = HOY_DEMO["demo-siegfried"];

/** Directorio de personas (ficticias), una o dos por área responsable. */
export const PERSONAS: { name: string; cargo: string; responsibleId: string; dependencia: string }[] = [   // posición = código: P01, P02…
  { name: "Laura Méndez", cargo: "Gerente general", responsibleId: "R01", dependencia: "Gerencia general" },              // P01
  { name: "Camilo Restrepo", cargo: "Director de marketing", responsibleId: "R02", dependencia: "Marketing" },           // P02
  { name: "Julián Herrera", cargo: "Director comercial", responsibleId: "R03", dependencia: "Comercial" },               // P03
  { name: "Paola Quintero", cargo: "Directora de promoción médica", responsibleId: "R04", dependencia: "Promoción Médica" }, // P04
  { name: "Ricardo Vargas", cargo: "Director de operaciones", responsibleId: "R05", dependencia: "Operaciones" },         // P05
  { name: "Marcela Ospina", cargo: "Directora financiera", responsibleId: "R06", dependencia: "Finanzas" },              // P06
  { name: "Sergio Patiño", cargo: "Jefe de tesorería", responsibleId: "R07", dependencia: "Tesorería" },                  // P07
  { name: "Diana Rincón", cargo: "Jefa de compras", responsibleId: "R08", dependencia: "Compras" },                       // P08
  { name: "Felipe Cárdenas", cargo: "Gerente de TIC", responsibleId: "R09", dependencia: "TIC" },                         // P09
  { name: "Natalia Gómez", cargo: "Directora de gestión humana", responsibleId: "R10", dependencia: "Gestión Humana" },   // P10
  { name: "Claudia Bermúdez", cargo: "Directora técnica", responsibleId: "R11", dependencia: "Dirección Técnica" },       // P11
  { name: "Adriana Lozano", cargo: "Directora legal y compliance", responsibleId: "R12", dependencia: "Legal y Compliance" }, // P12
  { name: "Mateo Giraldo", cargo: "Jefe de planeación de la demanda", responsibleId: "R05", dependencia: "Operaciones" }, // P13
  { name: "Valentina Ruiz", cargo: "Jefa de aseguramiento de calidad", responsibleId: "R11", dependencia: "Dirección Técnica" }, // P14
  { name: "Santiago Molina", cargo: "Líder de analítica y datos", responsibleId: "R09", dependencia: "TIC" },             // P15
  { name: "Carolina Peña", cargo: "Jefa de desarrollo organizacional", responsibleId: "R10", dependencia: "Gestión Humana" }, // P16
];

/** Tarea del plan: estado a la fecha de la demo. H hecha · R en revisión · C en curso · B bloqueada · P por hacer. */
export type TareaDemo = {
  t: string; d: string; quien: number; con?: number[]; ini: string; fin: string; est: "H" | "R" | "C" | "B" | "P";
  ent?: true; hito?: true; dep?: number[];      // dependencias: posición (desde 1) de otras tareas del mismo proyecto
  corre?: number;                              // días que su compromiso se corrió frente a la línea base
  nota?: string;                               // motivo del bloqueo o nota de seguimiento
  soporte?: string;                            // título de la evidencia con la que se cerró
};
export const ESTADO_TAREA: Record<TareaDemo["est"], TaskStatus> = { H: "HECHA", R: "EN_REVISION", C: "EN_CURSO", B: "BLOQUEADA", P: "POR_HACER" };
const T = (t: string, d: string, quien: number, ini: string, fin: string, est: TareaDemo["est"], x: Partial<TareaDemo> = {}): TareaDemo => ({ t, d, quien, ini, fin, est, ...x });

/** Plan de trabajo por proyecto. Diez en implementación y seis en preparación (piloto antes de escalar). */
export const PLANES: Record<string, TareaDemo[]> = {
  // ── EXC · modelo omnicanal: en observación (la integración del CRM está bloqueada y se gasta rápido) ──
  in01: [
    T("Segmentación del panel médico AAA y AA aprobada", "Clasificar el panel por potencial y especialidad y aprobarla en comité comercial; produce la base segmentada en el CRM.", 4, "2027-01-11", "2027-02-05", "H", { ent: true, soporte: "Base de segmentación del panel aprobada" }),
    T("Maestro de médicos depurado en el CRM", "Depurar duplicados y completar especialidad y canal del 95 % del panel; produce el maestro validado por promoción médica.", 9, "2027-02-08", "2027-03-05", "H", { con: [4], dep: [1], soporte: "Reporte de calidad del maestro de médicos" }),
    T("Integración del CRM con la plataforma de contenido", "Conectar el consumo de contenido digital con la ficha del médico en el CRM, sin carga manual; produce la integración en producción.", 9, "2027-03-08", "2027-04-30", "B", { con: [15], dep: [2], ent: true, nota: "El proveedor de la plataforma de contenido no ha entregado la API de consumo; escalado a compras." }),
    T("Doce piezas de contenido científico por especialidad", "Producir y aprobar con regulatorio doce piezas segmentadas; produce el contenido publicado en la plataforma.", 2, "2027-02-08", "2027-04-09", "H", { ent: true, soporte: "Actas de aprobación regulatoria de las doce piezas" }),
    T("Piloto omnicanal con el 40 % del panel", "Operar el modelo con visita presencial, visita virtual y contenido en el 40 % del panel; produce el informe de cobertura del piloto.", 4, "2027-04-12", "2027-06-11", "C", { dep: [1, 4], corre: 14 }),
    T("Cobertura omnicanal del 100 % del panel", "Extender el modelo a todo el panel AAA y AA con seguimiento mensual en comité; hito de cierre del proyecto.", 4, "2027-06-14", "2027-11-26", "P", { dep: [3, 5], hito: true }),
  ],
  // ── EXC · marcas core: a favor ──
  in05: [
    T("Planes de marca de las cinco marcas core aprobados", "Definir inversión, panel y mensaje por marca y aprobarlos en comité; produce los cinco planes firmados.", 2, "2027-01-11", "2027-02-12", "H", { ent: true, hito: true, soporte: "Planes de marca 2027 aprobados" }),
    T("Evidencia clínica por marca lista para la visita", "Compilar los estudios y las ayudas visuales de cada marca; produce el material aprobado por regulatorio.", 2, "2027-02-15", "2027-03-12", "H", { dep: [1], soporte: "Material promocional aprobado por regulatorio" }),
    T("Ejecución promocional de los ciclos 2 y 3", "Desplegar el plan de médico y canal de las cinco marcas en dos ciclos; produce el informe de ejecución por ciclo.", 4, "2027-03-15", "2027-06-25", "C", { con: [2], dep: [1, 2] }),
    T("Revisión trimestral con datos de IQVIA", "Contrastar la participación por marca con el plan y ajustar la inversión; produce el acta de ajuste del segundo semestre.", 2, "2027-07-05", "2027-07-23", "P", { dep: [3], ent: true }),
  ],
  // ── OPE · certificación BPM: en contra (hallazgos sin cerrar, riesgo materializado, el fin se corre) ──
  in06: [
    T("Plan de cierre de hallazgos con responsables", "Asignar dueño y fecha a cada hallazgo abierto de BPM; produce el plan aprobado por la dirección técnica.", 14, "2027-01-11", "2027-01-29", "H", { ent: true, soporte: "Plan de cierre de hallazgos BPM" }),
    T("Cierre de los hallazgos mayores abiertos", "Ejecutar las acciones correctivas de los hallazgos mayores y documentar su eficacia; produce los informes de cierre.", 14, "2027-02-01", "2027-04-16", "C", { con: [5], dep: [1], ent: true, corre: 21, nota: "Dos hallazgos mayores siguen abiertos: dependen de la calificación de los equipos nuevos." }),
    T("Validaciones y calificaciones pendientes", "Completar las validaciones de proceso y la calificación de equipos de las líneas nuevas; produce los informes aprobados.", 11, "2027-02-15", "2027-05-07", "B", { con: [14], dep: [1], nota: "El proveedor reprogramó la calificación de dos equipos de la ampliación." }),
    T("Contratación del auditor externo del simulacro", "Seleccionar y contratar al auditor con experiencia en inspecciones del INVIMA; produce el contrato firmado.", 8, "2027-03-15", "2027-04-15", "H", { soporte: "Contrato del auditor externo" }),
    T("Simulacro de inspección con auditor externo", "Realizar la inspección simulada completa de la planta; produce el informe del simulacro y su plan de cierre.", 14, "2027-05-24", "2027-06-18", "P", { dep: [2, 3, 4], ent: true }),
    T("Solicitud de la visita de certificación al INVIMA", "Radicar la solicitud con el expediente completo; hito que fija la fecha de la inspección.", 11, "2027-06-21", "2027-07-09", "P", { dep: [5], hito: true }),
  ],
  // ── OPE · comité de la ampliación Farma: a favor, cerca del cierre ──
  in07: [
    T("Cronograma integrado de la ampliación", "Consolidar entregables, responsables y dependencias de obra, equipos y regulatorio; produce el cronograma aprobado.", 5, "2027-01-11", "2027-01-29", "H", { ent: true, soporte: "Cronograma integrado de la ampliación Farma" }),
    T("Recepción mecánica de las nuevas líneas", "Recibir del contratista las líneas instaladas con sus pruebas de fábrica; hito de obra.", 5, "2027-02-01", "2027-03-05", "H", { dep: [1], hito: true, soporte: "Acta de recepción mecánica" }),
    T("Puesta en marcha y lotes de prueba", "Arrancar las líneas y producir los lotes de prueba con calidad; produce los registros de los lotes.", 5, "2027-03-08", "2027-04-23", "H", { con: [14], dep: [2], soporte: "Registros de los lotes de prueba" }),
    T("Entrega de la ampliación a operación", "Transferir las líneas a producción con su documentación y el personal entrenado; hito de cierre.", 5, "2027-04-26", "2027-06-04", "R", { dep: [3], hito: true, ent: true }),
  ],
  // ── OPE · S&OP: en observación (ritmo por debajo del plan) ──
  in08: [
    T("Calendario y roles del ciclo S&OP", "Definir el calendario mensual, los foros y los roles del ciclo; produce el procedimiento aprobado.", 13, "2027-01-11", "2027-01-29", "H", { ent: true, soporte: "Procedimiento del ciclo S&OP" }),
    T("Pronóstico comercial por referencia y cliente", "Entregar el pronóstico mensual consensuado el día 5 de cada mes; produce la plantilla en operación.", 3, "2027-02-01", "2027-03-05", "H", { dep: [1], soporte: "Pronóstico consensuado de marzo" }),
    T("Plan maestro congelado a dos semanas", "Congelar el plan maestro de producción dos semanas y medir su cumplimiento; produce dos ciclos cerrados con acta.", 13, "2027-03-08", "2027-05-07", "C", { con: [5], dep: [2], ent: true, corre: 10 }),
    T("Plan de materiales alineado con las líneas nuevas", "Recalcular los parámetros del plan de materiales incluyendo las líneas de la ampliación; produce los parámetros cargados en el ERP.", 8, "2027-04-12", "2027-05-28", "C", { con: [13], dep: [2] }),
    T("Ciclo S&OP mensual en régimen", "Sostener seis ciclos consecutivos con cumplimiento del plan maestro de al menos 92 %; hito de cierre.", 13, "2027-06-01", "2027-11-26", "P", { dep: [3, 4], hito: true }),
  ],
  // ── FIN · caja y gross-to-net: a favor ──
  in11: [
    T("Modelo de proyección de caja a 13 semanas", "Construir el modelo con cobros, pagos y compromisos; produce la primera proyección validada por tesorería.", 7, "2027-01-11", "2027-02-05", "H", { ent: true, soporte: "Modelo de caja a 13 semanas" }),
    T("Topes de descuento por canal aprobados", "Proponer y aprobar en comité los topes de descuento por canal y cliente; produce la política vigente.", 6, "2027-01-25", "2027-02-26", "H", { con: [3], ent: true, soporte: "Política de descuentos por canal" }),
    T("Publicación semanal de la proyección", "Publicar cada lunes la proyección y revisar desviaciones en comité; produce doce semanas de publicación.", 7, "2027-02-08", "2027-05-21", "C", { dep: [1] }),
    T("Control mensual del gross-to-net por canal", "Medir el gross-to-net por canal frente al tope y accionar las desviaciones; produce el tablero mensual.", 6, "2027-03-01", "2027-11-26", "C", { dep: [2] }),
  ],
  // ── DIG · tablero directivo: en observación (dato sin dueño en dos áreas, comprometido por encima) ──
  in12: [
    T("Dueños de dato acordados por área", "Nombrar el responsable de cada indicador y su fuente; produce la matriz de dueños de dato firmada.", 9, "2027-01-11", "2027-02-05", "H", { ent: true, soporte: "Matriz de dueños de dato" }),
    T("Modelo de datos de las cuatro primeras prioridades", "Integrar las fuentes de comercial, operaciones, finanzas y talento; produce el modelo validado.", 15, "2027-02-08", "2027-03-19", "H", { dep: [1], soporte: "Modelo de datos validado" }),
    T("Primera versión del tablero en producción", "Publicar el tablero con cuatro prioridades y dato validado por sus dueños; hito de la primera entrega.", 15, "2027-03-22", "2027-04-23", "R", { dep: [2], hito: true, ent: true, corre: 9 }),
    T("Indicadores de innovación, digital y legal", "Incorporar las tres prioridades restantes; produce la segunda versión del tablero.", 15, "2027-04-26", "2027-06-18", "C", { dep: [3], nota: "Innovación y legal aún no validan sus fuentes." }),
    T("Retiro de los reportes manuales reemplazados", "Eliminar los reportes en hoja de cálculo que el tablero reemplaza; produce el inventario de reportes retirados.", 9, "2027-06-21", "2027-08-27", "P", { dep: [4], ent: true }),
  ],
  // ── TAL · sucesión: a favor ──
  in16: [
    T("Cargos críticos aprobados por el comité ejecutivo", "Definir los criterios de criticidad y aprobar la lista; produce el acta con los cargos críticos.", 10, "2027-01-11", "2027-02-05", "H", { ent: true, hito: true, soporte: "Acta de cargos críticos" }),
    T("Evaluación de potencial de los candidatos", "Aplicar la evaluación de potencial a los candidatos a sucesor; produce los informes individuales.", 16, "2027-02-08", "2027-03-26", "H", { dep: [1], soporte: "Informes de evaluación de potencial" }),
    T("Mapa de sucesión del 50 % de los cargos críticos", "Construir el mapa con sucesor, nivel de preparación y plan de desarrollo; produce el mapa revisado en comité de talento.", 16, "2027-03-29", "2027-06-11", "C", { con: [10], dep: [2], ent: true }),
    T("Planes de desarrollo individual firmados", "Acordar con cada sucesor y su jefe el plan de desarrollo; produce los planes firmados.", 16, "2027-05-03", "2027-07-02", "C", { dep: [2] }),
    T("Comité de talento trimestral en régimen", "Sostener el comité con seguimiento del mapa y de los planes; hito de cierre con el 80 % de los cargos cubiertos.", 10, "2027-07-05", "2027-11-26", "P", { dep: [3, 4], hito: true }),
  ],
  // ── TAL · liderazgo «Latir Siegfried»: a favor, con el gasto por delante del avance ──
  in17: [
    T("Evaluación 360 inicial de la primera cohorte", "Aplicar la evaluación 360 a los 30 líderes de la primera cohorte; produce la línea base del índice de liderazgo.", 16, "2027-01-18", "2027-02-12", "H", { ent: true, soporte: "Informe de línea base de la evaluación 360" }),
    T("Módulos 1 y 2 del programa", "Dictar los dos primeros módulos del modelo de liderazgo; produce los registros de asistencia y evaluación.", 10, "2027-02-15", "2027-04-16", "H", { dep: [1], soporte: "Registros de los módulos 1 y 2" }),
    T("Módulos 3 y 4 y acompañamiento individual", "Dictar los módulos restantes y dos sesiones de acompañamiento por líder; produce el cierre de la cohorte.", 10, "2027-04-19", "2027-07-16", "C", { con: [16], dep: [2] }),
    T("Segunda cohorte de 30 líderes", "Convocar y formar a la segunda cohorte con el programa ajustado; produce la cohorte en curso.", 16, "2027-07-19", "2027-10-29", "P", { dep: [3] }),
    T("Evaluación 360 final y medición del índice", "Repetir la evaluación 360 y medir el cambio en el índice de liderazgo; hito de cierre.", 16, "2027-11-01", "2027-11-26", "P", { dep: [4], hito: true, ent: true }),
  ],
  // ── LEG · radar de riesgos: a favor ──
  in19: [
    T("Metodología de riesgos adoptada", "Definir la escala, los criterios y el formato de la matriz; produce la metodología aprobada.", 12, "2027-01-11", "2027-01-29", "H", { ent: true, soporte: "Metodología de gestión de riesgos" }),
    T("Matriz de riesgos críticos con dueño y plan", "Identificar los riesgos legales, regulatorios y de integridad críticos; produce la matriz aprobada por el comité ejecutivo.", 12, "2027-02-01", "2027-03-26", "H", { dep: [1], ent: true, hito: true, soporte: "Matriz de riesgos críticos aprobada" }),
    T("Primera revisión trimestral en comité ejecutivo", "Presentar el estado de los planes de tratamiento y los riesgos nuevos; produce el acta de revisión.", 12, "2027-04-05", "2027-04-30", "H", { dep: [2], soporte: "Acta de la revisión trimestral de riesgos" }),
    T("Planes de tratamiento en ejecución", "Hacer seguimiento mensual a los planes con sus dueños; produce el reporte de avance por riesgo.", 12, "2027-05-03", "2027-11-26", "C", { dep: [2] }),
  ],
  // ── En preparación: piloto antes de escalar ──
  in03: [
    T("Portafolio foco negociado con los cinco clientes mayores", "Acordar por línea las referencias foco con cada cliente; produce los cinco acuerdos firmados.", 3, "2027-02-01", "2027-04-09", "H", { ent: true, soporte: "Acuerdos de portafolio foco" }),
    T("Seguimiento mensual de referencias activas", "Medir la codificación por cliente y línea y accionar las brechas; produce el tablero de codificación.", 3, "2027-04-12", "2027-06-25", "C", { dep: [1] }),
    T("Decisión de escalar a todos los clientes estratégicos", "Presentar al comité los resultados del piloto y la propuesta de escalamiento; hito de decisión.", 3, "2027-06-28", "2027-07-09", "P", { dep: [2], hito: true }),
  ],
  in04: [
    T("Diseño del piloto de televenta con 300 droguerías", "Seleccionar las droguerías, definir el guion y los indicadores; produce el diseño aprobado del piloto.", 3, "2027-03-01", "2027-04-02", "H", { ent: true, soporte: "Diseño del piloto de televenta" }),
    T("Operación del piloto durante ocho semanas", "Atender las 300 droguerías con dos agentes y medir pedidos, frecuencia y costo por pedido; produce el informe del piloto.", 3, "2027-04-05", "2027-05-28", "C", { dep: [1], ent: true }),
    T("Caso de negocio del equipo completo", "Con los datos del piloto, dimensionar el equipo y su retorno; hito de decisión de contratar.", 6, "2027-05-31", "2027-06-18", "P", { con: [3], dep: [2], hito: true }),
  ],
  in10: [
    T("Maestro de materiales depurado", "Corregir unidades, tiempos de entrega y lotes mínimos del maestro; produce el maestro validado por compras.", 8, "2027-03-15", "2027-04-30", "C", { corre: 17, nota: "Faltan los tiempos de entrega de los proveedores importados." }),
    T("Política de inventario ABC aprobada", "Clasificar las referencias y definir los niveles de inventario por clase; produce la política aprobada.", 13, "2027-05-03", "2027-06-11", "P", { dep: [1], ent: true }),
    T("Liquidación de la obsolescencia identificada", "Ejecutar la baja o venta del inventario obsoleto con aprobación financiera; hito de cierre del piloto.", 5, "2027-06-14", "2027-08-27", "P", { dep: [2], hito: true }),
  ],
  in14: [
    T("Criterios de entrada y salida por etapa", "Definir qué debe estar listo para pasar de etapa en un lanzamiento; produce la guía del comité.", 2, "2027-01-18", "2027-02-12", "H", { ent: true, soporte: "Guía del comité de lanzamientos" }),
    T("Dos lanzamientos del primer semestre bajo el comité", "Gobernar los dos lanzamientos con comité quincenal y tablero de avance; produce las actas y el tablero.", 2, "2027-02-15", "2027-06-25", "C", { con: [11], dep: [1] }),
    T("Formalización del comité para todos los lanzamientos", "Ajustar la guía con lo aprendido y aprobar el comité como práctica permanente; hito de decisión.", 2, "2027-06-28", "2027-07-16", "P", { dep: [2], hito: true }),
  ],
  in15: [
    T("Selección de las dos formulaciones piloto", "Elegir con I+D las dos formulaciones donde la simulación aporta más; produce la ficha de cada caso.", 11, "2027-02-01", "2027-03-05", "H", { ent: true, soporte: "Fichas de los casos piloto" }),
    T("Contratación del especialista en simulación", "Vincular al especialista y licenciar el software; produce el contrato y la licencia activa.", 10, "2027-03-08", "2027-04-23", "B", { con: [11], nota: "El perfil no se ha conseguido en el mercado local; se abrió búsqueda regional." }),
    T("Simulación de las dos formulaciones", "Modelar las formulaciones y contrastarlas con los resultados experimentales; produce el informe comparado de los dos casos.", 11, "2027-04-26", "2027-08-27", "P", { dep: [1, 2], ent: true }),
  ],
  in21: [
    T("Procesos críticos priorizados para controles", "Seleccionar los cinco procesos con mayor exposición de integridad; produce la lista aprobada.", 12, "2027-02-15", "2027-03-19", "H", { ent: true, soporte: "Lista de procesos críticos priorizados" }),
    T("Diseño de los controles de los cinco procesos", "Diseñar con los dueños de proceso los controles y su evidencia; produce las fichas de control.", 12, "2027-03-22", "2027-06-04", "C", { dep: [1] }),
    T("Prueba de los controles y decisión de extender", "Probar la eficacia de los controles y decidir su extensión a los demás procesos; hito de decisión.", 12, "2027-06-07", "2027-07-30", "P", { dep: [2], hito: true }),
  ],
};

/** Riesgos de los proyectos. Severidad = probabilidad × impacto. `alta`: cuándo se registró (abierto); `cambio`: cuándo pasó a su estado actual. */
export type RiesgoDemo = { ini: string; alta: string; cambio?: string; title: string; desc?: string; cat: RiskCategory; p: number; i: number; st: RiskStatus; quien?: number; resp?: string; fecha?: string };
export const RIESGOS: RiesgoDemo[] = [
  { ini: "in06", alta: "2027-03-22", cambio: "2027-05-06", title: "La calificación de los equipos nuevos no llega antes del simulacro", desc: "El proveedor reprogramó la calificación de dos equipos de la ampliación; sin ella no cierran dos hallazgos mayores.", cat: "CRONOGRAMA", p: 5, i: 5, st: "MATERIALIZADO", quien: 11, resp: "Plan de choque con el proveedor: calificación en dos turnos y acompañamiento de aseguramiento de calidad.", fecha: "2027-06-04" },
  { ini: "in06", alta: "2027-04-19", title: "Hallazgo crítico nuevo en el simulacro de inspección", desc: "Un hallazgo crítico en el simulacro obligaría a aplazar la solicitud de la visita.", cat: "CALIDAD", p: 3, i: 5, st: "ABIERTO", quien: 14, fecha: "2027-06-18" },
  { ini: "in01", alta: "2027-03-15", cambio: "2027-04-20", title: "El proveedor de contenido no entrega la API de consumo", desc: "Sin la API, el consumo de contenido no llega a la ficha del médico y la cobertura digital no se puede medir.", cat: "EXTERNO", p: 4, i: 4, st: "EN_MITIGACION", quien: 9, resp: "Compras escaló al proveedor con cláusula de cumplimiento; TIC evalúa una carga diaria por archivo como contingencia.", fecha: "2027-05-28" },
  { ini: "in01", alta: "2027-04-14", cambio: "2027-04-28", title: "Baja adopción de la visita virtual por la fuerza de ventas", cat: "RECURSOS", p: 3, i: 3, st: "EN_MITIGACION", quien: 4, resp: "Entrenamiento por distrito y meta de contactos virtuales en el esquema de incentivos.", fecha: "2027-06-11" },
  { ini: "in08", alta: "2027-04-06", title: "Exactitud del pronóstico comercial por debajo del 75 %", desc: "Con pronóstico inexacto el plan maestro congelado pierde sentido y vuelve la reprogramación diaria.", cat: "CALIDAD", p: 4, i: 4, st: "ABIERTO", quien: 3, fecha: "2027-06-04" },
  { ini: "in12", alta: "2027-05-03", title: "Innovación y legal no validan sus fuentes de datos", cat: "ALCANCE", p: 3, i: 4, st: "ABIERTO", quien: 15, fecha: "2027-06-04" },
  { ini: "in12", alta: "2027-02-18", cambio: "2027-03-10", title: "El costo de las licencias de visualización supera lo presupuestado", cat: "PRESUPUESTO", p: 4, i: 3, st: "EN_MITIGACION", quien: 9, resp: "Renegociación del licenciamiento por usuario activo en lugar de usuario nombrado.", fecha: "2027-05-28" },
  { ini: "in15", alta: "2027-03-12", cambio: "2027-04-26", title: "No se consigue el especialista en simulación", desc: "Sin el especialista el piloto no arranca y la capacidad de I+D sigue igual.", cat: "RECURSOS", p: 4, i: 4, st: "MATERIALIZADO", quien: 10, resp: "Búsqueda regional y, mientras tanto, consultoría por horas con el fabricante del software.", fecha: "2027-06-11" },
  { ini: "in16", alta: "2027-04-02", title: "Sucesores identificados reciben ofertas externas", cat: "RECURSOS", p: 2, i: 4, st: "ABIERTO", quien: 16, fecha: "2027-07-02" },
  { ini: "in04", alta: "2027-05-10", title: "El costo por pedido del piloto no justifica el equipo completo", cat: "PRESUPUESTO", p: 3, i: 3, st: "ABIERTO", quien: 6, fecha: "2027-06-18" },
  { ini: "in10", alta: "2027-04-08", cambio: "2027-04-22", title: "Tiempos de entrega de proveedores importados sin dato confiable", cat: "CALIDAD", p: 4, i: 3, st: "EN_MITIGACION", quien: 8, resp: "Compras levanta los tiempos reales de los últimos doce meses con los agentes de aduana.", fecha: "2027-05-28" },
  { ini: "in07", alta: "2027-02-10", cambio: "2027-04-12", title: "Retraso del contratista en la entrega de documentación", cat: "EXTERNO", p: 3, i: 3, st: "CERRADO", quien: 5, resp: "Se retuvo el último pago hasta la entrega completa de los expedientes." },
  { ini: "in11", alta: "2027-02-03", cambio: "2027-03-18", title: "Los canales no adoptan los topes de descuento", cat: "ALCANCE", p: 2, i: 4, st: "CERRADO", quien: 6, resp: "Topes cargados en el sistema de pedidos: un descuento por encima exige aprobación de finanzas." },
];

/** Movimientos de presupuesto en millones de pesos (se guardan en pesos). E ejecución · C compromiso. */
export type GastoDemo = { ini: string; tipo: GastoTipo; concepto: string; millones: number; fecha: string; soporte?: string };
const G = (ini: string, tipo: "E" | "C", concepto: string, millones: number, fecha: string, soporte?: string): GastoDemo => ({ ini, tipo: tipo === "E" ? "EJECUCION" : "COMPROMISO", concepto, millones, fecha, soporte });
export const GASTOS: GastoDemo[] = [
  // in01 · 480 M: ejecuta más rápido de lo que avanza
  G("in01", "C", "Contrato de la plataforma de contenido científico", 210, "2027-01-22", "Contrato PC-2027-014"), G("in01", "E", "Licenciamiento anual de la plataforma de contenido", 140, "2027-02-10", "Factura FE-3312"),
  G("in01", "E", "Producción de doce piezas de contenido científico", 96, "2027-04-05", "Facturas de la agencia"), G("in01", "E", "Depuración del maestro de médicos", 38, "2027-03-02", "Factura FE-3398"),
  G("in01", "C", "Integración del CRM con la plataforma de contenido", 85, "2027-03-01", "Orden de compra OC-7741"),
  // in05 · 150 M: en línea
  G("in05", "E", "Material promocional de las cinco marcas core", 34, "2027-03-10", "Factura FE-3420"), G("in05", "E", "Eventos científicos del ciclo 2", 28, "2027-04-22"), G("in05", "C", "Eventos científicos del ciclo 3", 30, "2027-05-04", "Orden de compra OC-7902"),
  // in06 · 220 M: gasta por delante del avance
  G("in06", "E", "Acciones correctivas de los hallazgos mayores", 78, "2027-03-30", "Facturas de mantenimiento y adecuaciones"), G("in06", "E", "Validaciones de proceso de las líneas nuevas", 52, "2027-04-20", "Factura FE-3501"),
  G("in06", "C", "Auditor externo del simulacro de inspección", 45, "2027-04-15", "Contrato AE-2027-03"), G("in06", "C", "Calificación de equipos en doble turno", 38, "2027-05-10", "Orden de compra OC-7955"),
  // in07 · 30 M: casi todo ejecutado, con el trabajo casi terminado
  G("in07", "E", "Gerencia del proyecto y cronograma integrado", 18, "2027-01-29"), G("in07", "E", "Entrenamiento del personal de las líneas nuevas", 8, "2027-04-16", "Factura FE-3488"),
  // in08 · 80 M
  G("in08", "E", "Consultoría de instalación del ciclo S&OP", 26, "2027-02-26", "Factura FE-3377"), G("in08", "C", "Módulo de planeación de la demanda en el ERP", 30, "2027-04-08", "Orden de compra OC-7860"),
  // in11 · 40 M
  G("in11", "E", "Modelo de proyección de caja y tablero de gross-to-net", 22, "2027-02-19", "Factura FE-3355"),
  // in12 · 160 M: lo comprometido supera lo planeado
  G("in12", "C", "Licencias de visualización para 120 usuarios", 95, "2027-02-15", "Contrato LV-2027-02"), G("in12", "C", "Integración de fuentes y modelo de datos", 82, "2027-02-22", "Orden de compra OC-7705"),
  G("in12", "E", "Primer pago de licencias de visualización", 48, "2027-03-05", "Factura FE-3401"), G("in12", "E", "Modelo de datos de las cuatro primeras prioridades", 41, "2027-04-02", "Factura FE-3466"),
  // in16 · 180 M
  G("in16", "E", "Evaluación de potencial de los candidatos a sucesor", 44, "2027-03-26", "Factura FE-3440"), G("in16", "C", "Programas de desarrollo individual", 60, "2027-05-05"),
  // in17 · 260 M: gasto por delante del avance
  G("in17", "E", "Evaluación 360 de la primera cohorte", 36, "2027-02-12", "Factura FE-3340"), G("in17", "E", "Módulos 1 y 2 del programa de liderazgo", 88, "2027-04-16", "Factura FE-3492"), G("in17", "E", "Anticipo de los módulos 3 y 4", 46, "2027-04-26", "Factura FE-3510"),
  // in19 · 60 M
  G("in19", "E", "Asesoría en metodología y matriz de riesgos", 21, "2027-03-26", "Factura FE-3445"),
  // pilotos
  G("in04", "E", "Dos agentes y plataforma del piloto de televenta", 42, "2027-05-07", "Factura FE-3530"), G("in15", "C", "Licencia del software de simulación", 48, "2027-03-12", "Orden de compra OC-7790"), G("in21", "E", "Diseño de controles de integridad", 18, "2027-05-06"),
];

/** Avance del primer trimestre de 2027 de cada resultado clave, como fracción del tramo de su línea base a su meta
    (negativo: empeoró). Los que no aparecen avanzan 0,2. El de sostenimiento se mantiene. */
export const AVANCE_KR_T1: Record<string, number> = {
  "EXC-27-01": 0.25, "EXC-27-02": 0.2, "EXC-27-03": 0.35, "EXC-27-04": 0.32, "EXC-27-05": 0.3, "EXC-27-06": 0.1, "EXC-27-07": 0.3, "EXC-27-08": 0.15,
  "OPE-27-01": -0.2, "OPE-27-02": 0.3, "OPE-27-03": 0.12, "OPE-27-04": 0.15, "OPE-27-05": 0.25, "OPE-27-06": 0.08,
  "FIN-27-01": 0.3, "FIN-27-02": 0.35, "DIG-27-01": 0.28, "DIG-27-02": 0.2, "DIG-27-03": 0.05, "INN-27-01": 0.22, "INN-27-02": 0.25, "INN-27-03": 0,
  "TAL-27-01": 0.3, "TAL-27-02": 0.1, "TAL-27-04": 0.1, "TAL-27-05": 0.33, "LEG-27-01": 0.45, "LEG-27-03": 0.1, "LEG-27-04": 0.2,
};
export const AVANCE_KR_POR_DEFECTO = 0.2;

/** Estado y avance declarado de cada iniciativa a la fecha de la demo, con una entrada de bitácora. */
export const AVANCE_INICIATIVAS: Record<string, { status: "PLANEADA" | "EN_CURSO" | "EN_RIESGO" | "COMPLETADA"; progress: number; log?: { type: "HITO" | "ALERTA" | "NOTA"; text: string } }> = {
  in01: { status: "EN_RIESGO", progress: 45, log: { type: "ALERTA", text: "La integración del CRM con la plataforma de contenido está bloqueada por el proveedor; el piloto opera con carga manual." } },
  in05: { status: "EN_CURSO", progress: 55, log: { type: "HITO", text: "Cinco planes de marca aprobados y ciclo 2 ejecutado según plan." } },
  in06: { status: "EN_RIESGO", progress: 35, log: { type: "ALERTA", text: "Dos hallazgos mayores siguen abiertos por la calificación de equipos; el simulacro de junio está en riesgo." } },
  in07: { status: "EN_CURSO", progress: 90, log: { type: "HITO", text: "Lotes de prueba aprobados; la entrega a operación está en revisión." } },
  in08: { status: "EN_CURSO", progress: 40, log: { type: "NOTA", text: "Dos ciclos S&OP cerrados; el plan maestro congelado se corrió diez días por la exactitud del pronóstico." } },
  in11: { status: "EN_CURSO", progress: 60, log: { type: "HITO", text: "Proyección de caja publicada cada lunes desde febrero y topes de descuento vigentes." } },
  in12: { status: "EN_CURSO", progress: 50, log: { type: "NOTA", text: "Primera versión del tablero en revisión de los dueños de dato." } },
  in16: { status: "EN_CURSO", progress: 45, log: { type: "HITO", text: "Cargos críticos aprobados y candidatos evaluados." } },
  in17: { status: "EN_CURSO", progress: 45, log: { type: "HITO", text: "Primera cohorte con los módulos 1 y 2 completos." } },
  in19: { status: "EN_CURSO", progress: 65, log: { type: "HITO", text: "Matriz de riesgos críticos aprobada por el comité ejecutivo." } },
  in03: { status: "EN_CURSO", progress: 40 }, in04: { status: "EN_CURSO", progress: 45 }, in10: { status: "EN_CURSO", progress: 15 },
  in14: { status: "EN_CURSO", progress: 45 }, in15: { status: "EN_RIESGO", progress: 25 }, in21: { status: "EN_CURSO", progress: 40 },
};

/** Casos de la regla «se mapea sin objetivo ni resultado clave»: un proyecto especial y una iniciativa disruptiva. */
export const INICIATIVAS_MAPEADAS: { id: string; categoria: IniCategoria; name: string; objetivo: string; metaResultado: string; ownerId: string; capability: string; subsistema: string; start: string; end: string; budgetPlanned: number }[] = [
  { id: "in24", categoria: "especial", name: "Traslado del centro de distribución a la zona franca", objetivo: "Mudar la operación logística a la bodega de zona franca sin interrumpir el despacho; encargo de la junta por el vencimiento del arriendo actual.", metaResultado: "Centro de distribución operando en zona franca con el 100 % del inventario trasladado.", ownerId: "R05", capability: "EJE-2", subsistema: "Operación", start: "2027-T3", end: "2027-T4", budgetPlanned: 650_000_000 },
  { id: "in25", categoria: "disruptiva", name: "Exploración de un portafolio de acompañamiento al paciente con GLP-1", objetivo: "Evaluar la oportunidad en obesidad y metabolismo con un portafolio de acompañamiento al paciente; aún sin objetivo ni resultado clave definidos.", metaResultado: "Caso de oportunidad presentado al comité ejecutivo con la decisión de entrar o no.", ownerId: "R01", capability: "DIR-3", subsistema: "Dirección", start: "2027-T2", end: "2027-T4", budgetPlanned: 80_000_000 },
];

/* ═══ Madurez digital ═══ */

/** Nivel de partida por línea y dimensión (1 a 5) del perfil de madurez de la demo; cada variable varía ±1 alrededor. */
export const MADUREZ_PERFIL: Record<string, Record<string, number>> = {
  CL: { organizacional: 3, misional: 3, tecnologica: 3, datos: 2 },
  OP: { organizacional: 3, misional: 2, tecnologica: 2, datos: 2 },
  IN: { organizacional: 2, misional: 3, tecnologica: 2, datos: 2 },
  AR: { organizacional: 2, misional: 2, tecnologica: 3, datos: 1 },
};
/** Cuánto por encima (o por debajo) de la evidencia percibe la gente cada línea, en puntos de la escala 1–5. */
export const MADUREZ_SESGO: Record<string, number> = { CL: 0.9, OP: 0.3, IN: 0.6, AR: -0.2 };
export const MADUREZ_SALVAGUARDAS: ("CUMPLE" | "PARCIAL" | "FALLA")[] = ["PARCIAL", "CUMPLE", "FALLA", "PARCIAL", "CUMPLE"];
export const MADUREZ_CORTE = "Línea base · abril de 2027";

/** Nota de algunas mediciones del primer trimestre (las que piden explicación). */
export const NOTAS_KR_T1: Record<string, string> = {
  "OPE-27-01": "Empeora: la auditoría interna de marzo abrió un hallazgo mayor nuevo y dos mayores siguen abiertos por la calificación de equipos.",
  "OPE-27-02": "Los hitos de obra y puesta en marcha de la ampliación se cerraron a tiempo; los de calificación de equipos, no.",
  "EXC-27-04": "Piloto omnicanal en el 40 % del panel; la cobertura digital se mide con carga manual mientras llega la integración.",
  "DIG-27-03": "El programa de automatización arranca en el segundo trimestre.",
  "LEG-27-01": "Matriz de riesgos críticos aprobada en marzo con dueño y plan por riesgo.",
  "INN-27-03": "Sin avance: el especialista en simulación no se ha contratado.",
};

/** Cierre del primer trimestre de las metas de la cascada: cumplimiento y aprendizaje, por iniciativa y área. */
export const CIERRES_T1: Record<string, { c: number; a: string }> = {
  "in01|R04": { c: 85, a: "El piloto cubrió el 34 % del panel frente al 40 % previsto: la visita virtual tardó en adoptarse en dos distritos." },
  "in01|R09": { c: 50, a: "El maestro de médicos quedó depurado; la integración depende de una API del proveedor que no llegó. Aprendizaje: exigir la entrega técnica en el contrato." },
  "in01|R02": { c: 100, a: "Doce piezas aprobadas. Regulatorio necesita dos semanas de anticipación por pieza: se planea el trimestre siguiente con ese margen." },
  "in05|R02": { c: 100, a: "Cinco planes de marca aprobados en febrero; tener la evidencia clínica lista antes del ciclo aceleró la ejecución." },
  "in06|R11": { c: 45, a: "Dos hallazgos mayores siguen abiertos por la calificación de equipos: el plan dependía de un proveedor sin fecha firme. Se acuerda plan de choque en doble turno." },
  "in07|R05": { c: 100, a: "Todos los hitos del trimestre se cerraron a tiempo; el comité semanal con cronograma integrado evitó sorpresas entre obra y regulatorio." },
  "in08|R05": { c: 70, a: "El ciclo S&OP quedó instalado con dos cierres; el congelamiento a dos semanas todavía no se sostiene cuando cambia el pronóstico." },
  "in08|R03": { c: 90, a: "El pronóstico se entregó el día 5 en los tres meses; queda pendiente mejorar la exactitud por referencia." },
  "in16|R10": { c: 100, a: "Cargos críticos aprobados y candidatos evaluados; conviene comunicar a los candidatos qué significa estar en el mapa." },
  "in17|R10": { c: 100, a: "Primera cohorte lanzada con asistencia completa; los jefes directos piden un resumen de cada módulo para reforzarlo." },
  "in12|R09": { c: 75, a: "El tablero está en revisión con cuatro prioridades; dos áreas aún no validan su fuente. Sin dueño de dato no hay indicador." },
  "in11|R06": { c: 100, a: "Proyección de caja publicada cada lunes desde febrero y topes de descuento vigentes en el sistema de pedidos." },
  "in19|R12": { c: 100, a: "Matriz de riesgos críticos aprobada por el comité ejecutivo; la revisión trimestral queda en la agenda fija del comité." },
};
