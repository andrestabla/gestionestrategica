// ─────────────────────────────────────────────────────────────────────────────
// Gestor de proyectos: el plan de trabajo operativo de las iniciativas.
// Cada iniciativa se traduce en tareas con fechas, responsables con nombre
// propio (principal y corresponsables), alcance verificable, dependencias y
// evidencia por entregable. Regla: ninguna tarea que exige evidencia se
// cierra sin un soporte adjunto. Personas y tareas son ficticias.
// «Hoy» del demo: 2027-03-10 (coherente con DEMO_NOW_INDEX del motor).
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_TODAY = "2027-03-10";

/* ═══ Directorio de personas (ficticias) ═══ */

export type Person = {
  id: string;
  name: string;
  cargo: string;
  dependencia: string;
  email: string;
  responsibleId: string;   // enlaza con el directorio de cargos (R01…)
};

export const PEOPLE: Person[] = [
  { id: "P01", name: "Laura Restrepo", cargo: "Gerente general", dependencia: "Gerencia general", email: "laura.restrepo@andina.example", responsibleId: "R01" },
  { id: "P02", name: "Mauricio Peña", cargo: "Gerente comercial", dependencia: "Gerencia comercial", email: "mauricio.pena@andina.example", responsibleId: "R02" },
  { id: "P03", name: "Carolina Vélez", cargo: "Jefe de operaciones y logística", dependencia: "Operaciones", email: "carolina.velez@andina.example", responsibleId: "R03" },
  { id: "P04", name: "Patricia Londoño", cargo: "Jefe administrativa y financiera", dependencia: "Administración y finanzas", email: "patricia.londono@andina.example", responsibleId: "R04" },
  { id: "P05", name: "Jorge Salazar", cargo: "Jefe de servicio al cliente", dependencia: "Servicio y posventa", email: "jorge.salazar@andina.example", responsibleId: "R05" },
  { id: "P06", name: "Diana Cárdenas", cargo: "Coordinadora de talento humano", dependencia: "Talento humano", email: "diana.cardenas@andina.example", responsibleId: "R06" },
  { id: "P07", name: "Andrés Mejía", cargo: "Analista de sistemas", dependencia: "Administración y finanzas", email: "andres.mejia@andina.example", responsibleId: "R07" },
  { id: "P08", name: "Sofía Arango", cargo: "Coordinadora de sede Medellín", dependencia: "Operaciones", email: "sofia.arango@andina.example", responsibleId: "R03" },
  { id: "P09", name: "Felipe Rojas", cargo: "Jefe de compras", dependencia: "Operaciones", email: "felipe.rojas@andina.example", responsibleId: "R03" },
  { id: "P10", name: "Natalia Ruiz", cargo: "Analista de tesorería", dependencia: "Administración y finanzas", email: "natalia.ruiz@andina.example", responsibleId: "R04" },
];

export const person = (id: string) => PEOPLE.find((p) => p.id === id)!;
export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/* ═══ Tareas ═══ */

export type TaskStatus = "POR_HACER" | "EN_CURSO" | "EN_REVISION" | "HECHA" | "BLOQUEADA";

export type Task = {
  id: string;
  iniId: string;            // iniciativa a la que pertenece
  title: string;
  desc: string;             // qué se hace y qué produce (alcance verificable)
  assigneeId: string;       // responsable principal (nombre propio)
  coAssigneeIds?: string[]; // corresponsables (opcional, sin duplicar al principal)
  start: string;            // YYYY-MM-DD
  due: string;              // YYYY-MM-DD
  status: TaskStatus;
  requiresEvidence?: boolean;   // entregable formal
  evidenceIds?: string[];       // EV-xx del catálogo
  dependsOn?: string[];         // ids de tareas prerrequisito
  note?: string;
};

/** Responsables de la tarea: principal primero, luego corresponsables. */
export const assigneesOf = (t: Task): string[] =>
  [t.assigneeId, ...(t.coAssigneeIds ?? []).filter((x) => x !== t.assigneeId)];

export const TASKS: Task[] = [
  /* ── i1 · Plan trimestral con responsables únicos ── */
  { id: "T-i1-01", iniId: "i1", title: "Taller de cascada: de la estrategia a las tres prioridades del trimestre", desc: "Sesión del comité para derivar las tres prioridades del cuarto trimestre de la estrategia en una página; produce el plan trimestral con entregable, meta y fecha por prioridad.", assigneeId: "P01", coAssigneeIds: ["P03"], start: "2026-10-05", due: "2026-10-14", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-33"] },
  { id: "T-i1-02", iniId: "i1", title: "Asignar responsable único por prioridad y entregable", desc: "Revisión de cada prioridad para dejar un solo nombre responsable y retirar los encargos compartidos; produce la matriz de responsables del trimestre.", assigneeId: "P03", start: "2026-10-15", due: "2026-10-23", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-37"], dependsOn: ["T-i1-01"] },
  { id: "T-i1-03", iniId: "i1", title: "Instalar la reunión semanal de 45 minutos con registro de compromisos", desc: "Definir agenda fija, convocar a los responsables y abrir el registro quién, qué y cuándo; produce doce actas consecutivas.", assigneeId: "P03", coAssigneeIds: ["P01"], start: "2026-11-03", due: "2027-03-19", status: "EN_CURSO", requiresEvidence: true, dependsOn: ["T-i1-02"], note: "Ocho semanas con registro; una reunión cancelada en febrero." },
  { id: "T-i1-04", iniId: "i1", title: "Redactar el protocolo de consecuencias por incumplimiento", desc: "Acordar qué pasa cuando un compromiso se incumple dos veces: conversación, reasignación o escalamiento; produce el protocolo firmado por el comité.", assigneeId: "P01", start: "2027-03-16", due: "2027-04-10", status: "POR_HACER", requiresEvidence: true, dependsOn: ["T-i1-03"] },
  { id: "T-i1-05", iniId: "i1", title: "Cierre del primer trimestre con registro completo", desc: "Consolidar el porcentaje de compromisos cumplidos a tiempo del trimestre y presentar los ajustes al plan del siguiente; produce el informe de cierre.", assigneeId: "P03", start: "2027-03-22", due: "2027-03-24", status: "POR_HACER", requiresEvidence: true, dependsOn: ["T-i1-03"] },

  /* ── i2 · Delegación por escrito y agenda del gerente ── */
  { id: "T-i2-01", iniId: "i2", title: "Análisis de la agenda del gerente por tipo de tiempo", desc: "Clasificar cuatro semanas de agenda en estratégico, relacional y operativo; produce el reparto porcentual de línea base.", assigneeId: "P01", coAssigneeIds: ["P06"], start: "2026-10-19", due: "2026-11-05", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-17"] },
  { id: "T-i2-02", iniId: "i2", title: "Delegar por escrito cinco decisiones recurrentes", desc: "Redactar el marco de autoridad de descuentos, compras hasta 20 millones, horarios, devoluciones y contratación operativa, con receptor y límites; produce los cinco marcos firmados.", assigneeId: "P01", coAssigneeIds: ["P02", "P03"], start: "2026-12-01", due: "2027-01-28", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-19"], dependsOn: ["T-i2-01"] },
  { id: "T-i2-03", iniId: "i2", title: "Bloque semanal de pensamiento estratégico en la agenda", desc: "Reservar y proteger un bloque de tres horas semanales sin operación; produce el registro de cumplimiento de doce semanas.", assigneeId: "P01", start: "2027-01-11", due: "2027-04-02", status: "EN_CURSO", dependsOn: ["T-i2-01"], note: "Nueve de doce bloques cumplidos." },
  { id: "T-i2-04", iniId: "i2", title: "Revisar con comercial el marco de descuentos retomado", desc: "Conversación con el gerente comercial sobre las dos decisiones de descuento que volvieron a gerencia; produce el marco ajustado.", assigneeId: "P02", coAssigneeIds: ["P01"], start: "2027-02-20", due: "2027-03-06", status: "EN_REVISION", requiresEvidence: true, dependsOn: ["T-i2-02"], note: "Marco ajustado en revisión del gerente." },
  { id: "T-i2-05", iniId: "i2", title: "Conformar el consejo externo trimestral", desc: "Invitar a dos empresarios y un asesor financiero al consejo externo y realizar la primera sesión; produce el acta de la sesión.", assigneeId: "P01", start: "2027-05-03", due: "2027-07-30", status: "POR_HACER", requiresEvidence: true },

  /* ── i3 · Estándar de los quince procesos críticos ── */
  { id: "T-i3-01", iniId: "i3", title: "Inventario de procesos críticos con dueño", desc: "Listar los procesos de venta, compra, recepción, despacho y facturación que afectan la promesa al cliente, y nombrar un dueño por proceso; produce el inventario aprobado.", assigneeId: "P03", coAssigneeIds: ["P09"], start: "2027-01-12", due: "2027-01-19", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-53"] },
  { id: "T-i3-02", iniId: "i3", title: "Documentar el estándar de recepción de mercancía", desc: "Ficha del proceso con estándar mínimo no negociable, responsable y criterio de calidad; produce la ficha en uso en Bogotá.", assigneeId: "P09", start: "2027-01-20", due: "2027-02-27", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-54"], dependsOn: ["T-i3-01"] },
  { id: "T-i3-03", iniId: "i3", title: "Adoptar el estándar de recepción en Medellín y Cali", desc: "Entrenar a los equipos de sede y verificar el cumplimiento durante dos semanas; produce el registro de verificación por sede.", assigneeId: "P08", coAssigneeIds: ["P09"], start: "2027-03-02", due: "2027-03-27", status: "EN_CURSO", dependsOn: ["T-i3-02"] },
  { id: "T-i3-04", iniId: "i3", title: "Documentar los cuatro procesos de despacho restantes", desc: "Fichas de alistamiento, empaque, ruta y entrega con sus estándares; produce cuatro fichas en uso.", assigneeId: "P03", start: "2027-03-09", due: "2027-04-15", status: "POR_HACER", requiresEvidence: true, dependsOn: ["T-i3-02"] },
  { id: "T-i3-05", iniId: "i3", title: "Rutina mensual de captura de excepciones", desc: "Definir el registro de excepciones por proceso y la revisión mensual con los dueños; produce el registro con la primera revisión.", assigneeId: "P03", coAssigneeIds: ["P05"], start: "2027-05-04", due: "2027-06-30", status: "POR_HACER" },

  /* ── i4 · Integración de sistemas ── */
  { id: "T-i4-01", iniId: "i4", title: "Mapa de sistemas, integraciones y fuentes maestras", desc: "Diagrama de los sistemas de pedidos, inventario y contabilidad, sus integraciones actuales y qué sistema es fuente de cada dato; produce el mapa aprobado.", assigneeId: "P07", start: "2027-02-15", due: "2027-03-31", status: "EN_CURSO", requiresEvidence: true },
  { id: "T-i4-02", iniId: "i4", title: "Medir la carga de recaptura manual por área", desc: "Registro de una semana de horas dedicadas a pasar datos entre sistemas en administración y comercial; produce la medición de línea base.", assigneeId: "P07", coAssigneeIds: ["P04"], start: "2027-02-02", due: "2027-02-10", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-58"] },
  { id: "T-i4-03", iniId: "i4", title: "Backlog de automatización priorizado por impacto y esfuerzo", desc: "Lista de doce automatizaciones candidatas ubicadas en la matriz de impacto y esfuerzo; produce el backlog aprobado por el comité.", assigneeId: "P07", start: "2027-04-05", due: "2027-05-10", status: "POR_HACER", requiresEvidence: true, dependsOn: ["T-i4-01"] },
  { id: "T-i4-04", iniId: "i4", title: "Presentar el presupuesto de integración a la junta", desc: "Caso de negocio con el ahorro de horas y el costo de la integración pedidos a contabilidad; produce el acta de la junta de abril.", assigneeId: "P04", coAssigneeIds: ["P07"], start: "2027-03-25", due: "2027-04-28", status: "POR_HACER", requiresEvidence: true, dependsOn: ["T-i4-02"] },

  /* ── i5 · Estrategia en una página (completada) ── */
  { id: "T-i5-01", iniId: "i5", title: "Taller de estrategia en una página con la junta", desc: "Sesión de un día para fijar ambición, cliente prioritario, promesas y renuncias; produce el documento aprobado.", assigneeId: "P01", coAssigneeIds: ["P02"], start: "2026-09-07", due: "2026-09-18", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-01"] },
  { id: "T-i5-02", iniId: "i5", title: "Matriz de criterios de calificación comercial", desc: "Criterios derivados del posicionamiento para aceptar o declinar negocios; produce la matriz en uso por el equipo comercial.", assigneeId: "P02", start: "2026-10-01", due: "2026-10-30", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-08"], dependsOn: ["T-i5-01"] },
  { id: "T-i5-03", iniId: "i5", title: "Registro de oportunidades declinadas con motivo", desc: "Abrir el registro en el CRM y capacitar a los vendedores; produce el registro con los primeros seis casos.", assigneeId: "P02", start: "2026-11-02", due: "2026-12-02", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-08"], dependsOn: ["T-i5-02"] },

  /* ── i6 · Proyección de caja ── */
  { id: "T-i6-01", iniId: "i6", title: "Modelo de proyección de caja a ocho semanas", desc: "Hoja de proyección con cobros, pagos e inventario por semana, publicada cada lunes; produce la primera proyección.", assigneeId: "P10", coAssigneeIds: ["P04"], start: "2026-11-03", due: "2026-11-24", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-43"] },
  { id: "T-i6-02", iniId: "i6", title: "Comparación mensual de proyectado contra real", desc: "Medir la desviación de la proyección al cierre de cada mes y registrar la causa; produce la serie de desviación.", assigneeId: "P10", start: "2026-12-01", due: "2027-02-27", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-43"], dependsOn: ["T-i6-01"] },
  { id: "T-i6-03", iniId: "i6", title: "Política de cobro y compras ligada a la proyección", desc: "Reglas de cobro anticipado y de compras condicionadas por la caja proyectada; produce la política aprobada por el comité.", assigneeId: "P04", coAssigneeIds: ["P02", "P09"], start: "2027-02-01", due: "2027-03-05", status: "EN_CURSO", requiresEvidence: true, dependsOn: ["T-i6-02"], note: "Vencida: la junta pidió incluir la política de compras antes de aprobarla." },

  /* ── i7 · Mapa de talento y reemplazos ── */
  { id: "T-i7-01", iniId: "i7", title: "Mapa de talento de los seis cargos críticos", desc: "Identificar los cargos críticos, su titular, el reemplazo posible y su brecha; produce el mapa aprobado por gerencia.", assigneeId: "P06", coAssigneeIds: ["P01"], start: "2027-01-12", due: "2027-01-30", status: "HECHA", requiresEvidence: true, evidenceIds: ["EV-29"] },
  { id: "T-i7-02", iniId: "i7", title: "Plan de preparación por reemplazo con delegaciones progresivas", desc: "Para cada reemplazo, tres delegaciones progresivas con fecha y criterio de éxito; produce seis planes.", assigneeId: "P06", start: "2027-02-02", due: "2027-03-05", status: "BLOQUEADA", requiresEvidence: true, dependsOn: ["T-i7-01"], note: "Bloqueada y vencida: renunció el reemplazo identificado para operaciones; se debe reidentificar." },
  { id: "T-i7-03", iniId: "i7", title: "Reidentificar el reemplazo del jefe de operaciones", desc: "Evaluar dos candidatos internos de sede y acordar con operaciones; produce el nombre y el plan actualizado.", assigneeId: "P06", coAssigneeIds: ["P03"], start: "2027-03-08", due: "2027-03-26", status: "EN_CURSO" },
  { id: "T-i7-04", iniId: "i7", title: "Ruta de carrera visible para los reemplazos", desc: "Definir qué gana cada reemplazo al asumir: alcance, reconocimiento y formación; produce la ruta comunicada a los seis.", assigneeId: "P06", start: "2027-04-05", due: "2027-05-15", status: "POR_HACER", dependsOn: ["T-i7-02"] },

  /* ── i8 · Réplica controlada ── */
  { id: "T-i8-01", iniId: "i8", title: "Ficha de la unidad replicable con economía unitaria", desc: "Describir la unidad mínima que se replica: equipo, inventario, clientes objetivo, ingresos y costos esperados; produce la ficha para la junta.", assigneeId: "P02", coAssigneeIds: ["P04"], start: "2027-07-05", due: "2027-08-15", status: "POR_HACER", requiresEvidence: true },
  { id: "T-i8-02", iniId: "i8", title: "Playbook comercial probado en Medellín", desc: "Método de venta paso a paso aplicado por la sede de Medellín durante un trimestre; produce el playbook con resultados.", assigneeId: "P02", coAssigneeIds: ["P08"], start: "2027-08-16", due: "2027-11-30", status: "POR_HACER", requiresEvidence: true, dependsOn: ["T-i8-01"] },
  { id: "T-i8-03", iniId: "i8", title: "Checklist de apertura de sede", desc: "Lista de condiciones para abrir: local, inventario inicial, equipo formado, sistemas conectados y clientes ancla; produce el checklist aprobado.", assigneeId: "P03", start: "2027-10-01", due: "2027-12-15", status: "POR_HACER", dependsOn: ["T-i8-01"] },
];

export const tasksOf = (iniId: string) => TASKS.filter((t) => t.iniId === iniId);

export const isOverdue = (t: Task) =>
  t.status !== "HECHA" && t.due < DEMO_TODAY;

export const dueSoon = (t: Task, days = 14) => {
  if (t.status === "HECHA" || isOverdue(t)) return false;
  const due = new Date(t.due).getTime();
  const today = new Date(DEMO_TODAY).getTime();
  return due - today <= days * 86_400_000;
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  POR_HACER: { label: "Por hacer", color: "var(--faint)" },
  EN_CURSO: { label: "En curso", color: "var(--cyan)" },
  EN_REVISION: { label: "En revisión", color: "var(--gold)" },
  BLOQUEADA: { label: "Bloqueada", color: "var(--bad)" },
  HECHA: { label: "Hecha", color: "var(--ok)" },
};
