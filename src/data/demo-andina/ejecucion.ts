// ─────────────────────────────────────────────────────────────────────────────
// Andina Suministros · capa de ejecución del caso demo. La empresa vive detenida en una fecha fija (HOY, mitad del
// segundo trimestre de 2027): la sede Barranquilla abrió en marzo, la integración del ERP va hacia su salida en vivo
// de junio y el plan 2027 se ejecuta con sus tropiezos. Aquí están las personas, el plan de trabajo de los doce
// proyectos decididos (tareas con dependencias, entregables e hitos), los riesgos, los movimientos de presupuesto, las
// mediciones del primer trimestre, el avance de cada iniciativa, el cierre del trimestre y el perfil de madurez
// digital. Todo es ficticio y plausible; los nombres de personas son inventados.
// ─────────────────────────────────────────────────────────────────────────────

import { HOY_DEMO } from "@/data/demo-fechas";
import type { TareaDemo, RiesgoDemo, GastoDemo } from "@/server/demo-builder";

export const HOY = HOY_DEMO["andina"];

/** Directorio de personas (ficticias); posición = código: P01, P02… */
export const PERSONAS: { name: string; cargo: string; responsibleId: string; dependencia: string }[] = [
  { name: "Laura Restrepo", cargo: "Gerente general", responsibleId: "R01", dependencia: "Gerencia general" },                       // P01
  { name: "Mauricio Peña", cargo: "Gerente comercial", responsibleId: "R02", dependencia: "Gerencia comercial" },                     // P02
  { name: "Carolina Vélez", cargo: "Jefe de operaciones y logística", responsibleId: "R03", dependencia: "Operaciones" },             // P03
  { name: "Patricia Londoño", cargo: "Jefe administrativa y financiera", responsibleId: "R04", dependencia: "Administración y finanzas" }, // P04
  { name: "Jorge Salazar", cargo: "Jefe de servicio al cliente", responsibleId: "R05", dependencia: "Servicio y posventa" },           // P05
  { name: "Diana Cárdenas", cargo: "Coordinadora de talento humano", responsibleId: "R06", dependencia: "Talento humano" },            // P06
  { name: "Andrés Mejía", cargo: "Analista de sistemas", responsibleId: "R07", dependencia: "Tecnología" },                           // P07
  { name: "Felipe Rojas", cargo: "Jefe de compras y abastecimiento", responsibleId: "R09", dependencia: "Compras" },                  // P08
  { name: "Esteban Charris", cargo: "Coordinador de la sede Barranquilla", responsibleId: "R10", dependencia: "Sede Barranquilla" },   // P09
  { name: "Juliana Ortiz", cargo: "Ejecutiva de cuentas clave", responsibleId: "R02", dependencia: "Gerencia comercial" },             // P10
  { name: "Sofía Arango", cargo: "Coordinadora de la sede Medellín", responsibleId: "R03", dependencia: "Operaciones" },               // P11
  { name: "Ricardo Gómez", cargo: "Coordinador de bodega Bogotá", responsibleId: "R03", dependencia: "Operaciones" },                 // P12
  { name: "Natalia Ruiz", cargo: "Analista de tesorería y costos", responsibleId: "R04", dependencia: "Administración y finanzas" },   // P13
  { name: "Valeria Suárez", cargo: "Analista de precios y comercio electrónico", responsibleId: "R02", dependencia: "Gerencia comercial" }, // P14
];

const T = (t: string, d: string, quien: number, ini: string, fin: string, est: TareaDemo["est"], x: Partial<TareaDemo> = {}): TareaDemo => ({ t, d, quien, ini, fin, est, ...x });

/** Plan de trabajo por proyecto: ocho en implementación y cuatro en preparación (piloto antes de escalar). */
export const PLANES: Record<string, TareaDemo[]> = {
  // ── CRE · sede Barranquilla: abrió a tiempo; la venta va por debajo de lo previsto y un asesor renunció ──
  in01: [
    T("Contrato con el operador logístico de Barranquilla", "Seleccionar entre tres operadores y firmar el contrato de almacenamiento y despacho; produce el contrato firmado con niveles de servicio.", 3, "2027-01-11", "2027-01-29", "H", { ent: true, soporte: "Contrato de operación logística firmado" }),
    T("Portafolio de 600 referencias para la sede", "Definir con ventas de la costa las referencias de mayor rotación y su stock inicial; produce el portafolio aprobado.", 8, "2027-01-11", "2027-01-22", "H", { con: [9], soporte: "Portafolio de la sede aprobado" }),
    T("Selección y entrenamiento del equipo de la costa", "Contratar al segundo asesor y entrenar al equipo tres semanas en Medellín; produce el equipo certificado en portafolio y ERP.", 6, "2027-01-18", "2027-02-19", "H", { con: [11], ent: true, soporte: "Registro del entrenamiento del equipo de la costa" }),
    T("Sede creada en el ERP como bodega y centro de costo", "Crear la bodega, el centro de costo y la integración diaria con el operador; produce la primera factura de prueba.", 7, "2027-02-01", "2027-02-26", "H", { dep: [1], soporte: "Factura de prueba emitida desde la sede" }),
    T("Apertura de la sede al público", "Inaugurar la sede con los clientes de la costa que hoy se atienden desde Bogotá; hito de apertura.", 9, "2027-02-22", "2027-03-01", "H", { dep: [2, 3, 4], hito: true, soporte: "Acta de apertura de la sede" }),
    T("Visita a los 60 prospectos industriales de Barranquilla y Cartagena", "Recorrer la lista de prospectos con propuesta de portafolio y condiciones; produce el embudo de oportunidades en el CRM.", 9, "2027-03-08", "2027-05-31", "C", { con: [2], nota: "Uno de los dos asesores renunció en abril; el coordinador cubre su cartera mientras se contrata el reemplazo." }),
    T("Reemplazo del asesor comercial que renunció", "Seleccionar y entrenar al reemplazo; produce el asesor contratado con cartera asignada.", 6, "2027-04-19", "2027-06-04", "C", { corre: 10 }),
    T("Cierre de margen del primer semestre de la sede", "Medir el margen de contribución de la sede con fletes y operador; produce el informe para el comité.", 4, "2027-06-14", "2027-07-09", "P", { dep: [6] }),
    T("Ventas de $ 5.200 millones y 110 clientes activos en la costa", "Hito de cierre del año de la sede.", 9, "2027-07-12", "2027-12-17", "P", { dep: [6, 7], hito: true }),
  ],
  // ── OPE · integración del ERP: el corazón del plan; el administrador único es el cuello de botella ──
  in11: [
    T("Depuración del maestro de clientes", "Eliminar duplicados y completar NIT, segmento y condiciones de pago; produce el maestro validado por comercial y cartera.", 7, "2027-01-11", "2027-02-12", "H", { con: [13], ent: true, soporte: "Reporte de calidad del maestro de clientes" }),
    T("Depuración del maestro de referencias", "Unificar códigos, unidades y proveedores de las 4.800 referencias; produce el maestro validado por compras.", 8, "2027-01-18", "2027-02-26", "H", { con: [7], soporte: "Maestro de referencias validado" }),
    T("Diseño del flujo pedido–despacho–factura–asiento", "Acordar con comercial, operaciones y contabilidad el flujo integrado; produce el diseño aprobado por las tres áreas.", 4, "2027-02-15", "2027-03-19", "H", { con: [2, 3], dep: [1], ent: true, soporte: "Diseño del flujo integrado aprobado" }),
    T("Configuración de pedidos e inventario en el ERP", "Configurar el módulo de pedidos, las tres bodegas y la sede nueva con el implementador; produce el ambiente de pruebas.", 7, "2027-03-22", "2027-05-07", "R", { dep: [2, 3] }),
    T("Formación de un segundo administrador funcional", "Formar a la analista de tesorería como segunda administradora del ERP; produce la persona certificada por el implementador.", 7, "2027-04-05", "2027-05-28", "B", { con: [13], nota: "El curso del implementador se aplazó: la única fecha disponible cruza con el cierre de mayo." }),
    T("Pruebas integrales en las tres bodegas", "Probar pedidos reales en Bogotá, Medellín y Cali con usuarios clave; produce el acta de pruebas aprobada.", 3, "2027-05-10", "2027-06-04", "C", { con: [11, 12], dep: [4], corre: 7 }),
    T("Salida en vivo de pedidos e inventario", "Operar en producción sin recaptura en las tres sedes; hito de la primera fase.", 4, "2027-06-07", "2027-06-28", "P", { dep: [5, 6], hito: true }),
    T("Integración de la contabilidad", "Asientos automáticos desde la factura y conciliación diaria; segunda fase.", 4, "2027-07-05", "2027-10-29", "P", { dep: [7] }),
  ],
  // ── CLI · promesa de entrega: a favor ──
  in05: [
    T("Promesa de entrega por segmento aprobada", "Fijar mismo día, 24 y 48 horas según segmento y zona; produce la promesa aprobada por comercial y operaciones.", 3, "2027-01-11", "2027-01-20", "H", { con: [2], ent: true, soporte: "Promesa por segmento aprobada" }),
    T("Ventanas de despacho en la bodega de Bogotá", "Organizar el alistamiento en tres ventanas diarias; produce el nuevo turno de alistamiento operando.", 12, "2027-01-25", "2027-02-15", "H", { dep: [1], soporte: "Programación de ventanas de despacho" }),
    T("Reunión diaria de pedidos en riesgo", "Instalar la reunión de 15 minutos con comercial y servicio a las 8:00; produce el registro diario de pedidos en riesgo.", 3, "2027-02-08", "2027-02-26", "H", { con: [5] }),
    T("Fecha prometida registrada en cada pedido", "Hacer obligatoria la fecha prometida en el ERP; produce el campo obligatorio y el reporte de OTIF por segmento.", 7, "2027-02-15", "2027-03-12", "H", { soporte: "Reporte de OTIF por segmento" }),
    T("Extensión de la promesa a Medellín y Cali", "Llevar las ventanas y la reunión diaria a las otras dos sedes; produce las dos sedes operando con el método.", 11, "2027-04-05", "2027-06-18", "C", { dep: [2, 3] }),
    T("OTIF del 94 % en los clientes prioritarios", "Hito de cierre del proyecto.", 3, "2027-07-01", "2027-09-24", "P", { hito: true, dep: [5] }),
  ],
  // ── CLI · cuentas clave: a favor, con la mitad de los planes aprobados ──
  in07: [
    T("Selección de las cuarenta cuentas clave", "Elegir con datos de venta y margen las cuarenta cuentas que concentran el 55 % de la venta industrial; produce la lista aprobada.", 2, "2027-01-11", "2027-01-25", "H", { con: [10], ent: true, soporte: "Lista de cuentas clave aprobada" }),
    T("Plantilla única de plan de cuenta", "Diseñar la plantilla con consumo, oportunidades, contactos y compromisos; produce la plantilla aprobada.", 10, "2027-01-18", "2027-02-05", "H", { soporte: "Plantilla de plan de cuenta" }),
    T("Veinte primeros planes de cuenta aprobados", "Elaborar y aprobar los planes de las veinte cuentas más grandes; produce los planes en el CRM.", 10, "2027-02-08", "2027-03-26", "H", { con: [2], dep: [1, 2], ent: true, soporte: "Veinte planes de cuenta aprobados" }),
    T("Visitas trimestrales de las veinte cuentas", "Visitar cada cuenta con su plan y registrar compromisos; produce las visitas registradas en el CRM.", 10, "2027-04-05", "2027-06-25", "C", { dep: [3] }),
    T("Planes de las veinte cuentas restantes", "Completar los cuarenta planes; produce los planes aprobados.", 10, "2027-05-03", "2027-06-30", "C", { dep: [2] }),
    T("Cuarenta cuentas con plan vigente", "Hito de cierre del primer año del programa.", 2, "2027-07-01", "2027-12-10", "P", { hito: true, dep: [4, 5] }),
  ],
  // ── CRE · política de precios: completada en lo esencial ──
  in03: [
    T("Análisis del descuento cedido en 2026", "Medir el descuento por segmento, asesor y cliente; produce el informe de descuento cedido.", 14, "2027-01-11", "2027-01-29", "H", { ent: true, soporte: "Informe de descuento cedido 2026" }),
    T("Listas y bandas de descuento por segmento", "Definir la lista y la banda de cada segmento; produce la política aprobada por la gerencia.", 2, "2027-01-25", "2027-02-12", "H", { con: [14], dep: [1], ent: true, soporte: "Política de precios y descuentos aprobada" }),
    T("Bloqueo de descuentos fuera de banda en el ERP", "Configurar la aprobación del gerente comercial para cualquier descuento fuera de banda; produce la regla activa.", 7, "2027-02-15", "2027-03-05", "H", { dep: [2], soporte: "Regla de aprobación activa en el ERP" }),
    T("Socialización con asesores y clientes", "Explicar la política a los asesores y avisar a los clientes del cambio de condiciones; produce las sesiones realizadas.", 2, "2027-03-01", "2027-03-19", "H", { dep: [2] }),
    T("Revisión trimestral de la política", "Ajustar bandas con los datos del primer trimestre; produce el acta de revisión.", 14, "2027-04-12", "2027-05-21", "R", { dep: [3] }),
  ],
  // ── OPE · inventario ABC: a favor ──
  in09: [
    T("Clasificación ABC del portafolio", "Clasificar las 4.800 referencias por rotación y margen; produce la clasificación aprobada.", 8, "2027-01-18", "2027-02-19", "H", { ent: true, soporte: "Clasificación ABC aprobada" }),
    T("Parámetros de reposición de las referencias A y B", "Recalcular punto de pedido y stock de seguridad; produce los parámetros cargados en el ERP.", 8, "2027-02-22", "2027-04-09", "H", { dep: [1], corre: 9, soporte: "Parámetros de reposición cargados" }),
    T("Reubicación de la bodega por rotación", "Ubicar las referencias A cerca del despacho; produce el nuevo mapa de bodega.", 12, "2027-04-12", "2027-05-28", "C", { dep: [1] }),
    T("Parámetros de las referencias C", "Definir política de compra bajo pedido para las C; produce la política aprobada.", 8, "2027-05-17", "2027-06-30", "P", { dep: [2] }),
    T("Días de inventario de 70", "Hito de cierre del proyecto.", 8, "2027-07-01", "2027-09-24", "P", { hito: true, dep: [2, 3, 4] }),
  ],
  // ── ORG · delegación: completada; ya se ven sus efectos ──
  in13: [
    T("Matriz de decisiones por cargo y monto", "Escribir qué decide cada cargo y hasta qué monto; produce la matriz aprobada por la junta.", 1, "2027-01-11", "2027-02-05", "H", { ent: true, soporte: "Matriz de decisiones aprobada" }),
    T("Registro de decisiones devueltas", "Llevar cada semana el registro de las decisiones que los jefes devuelven a la gerencia; produce el registro en marcha.", 6, "2027-02-08", "2027-02-12", "H", { dep: [1] }),
    T("Agenda estratégica bloqueada", "Bloquear tres medios días por semana en la agenda de la gerencia; produce la agenda del trimestre.", 1, "2027-02-08", "2027-02-19", "H", { dep: [1] }),
    T("Revisión de la matriz con los jefes", "Ajustar la matriz con lo aprendido en el primer trimestre; produce la versión 2.", 1, "2027-04-12", "2027-05-07", "H", { dep: [2], soporte: "Matriz de decisiones versión 2" }),
    T("Treinta por ciento de tiempo estratégico sostenido", "Hito de cierre: tres meses seguidos con 30 % de agenda estratégica.", 1, "2027-05-10", "2027-06-30", "C", { hito: true, dep: [3, 4] }),
  ],
  // ── ORG · reemplazos: en riesgo por la renuncia del candidato de operaciones ──
  in15: [
    T("Seis cargos críticos aprobados", "Definir con la gerencia los seis cargos críticos; produce la lista aprobada.", 6, "2027-01-11", "2027-01-29", "H", { con: [1], ent: true, soporte: "Cargos críticos aprobados" }),
    T("Evaluación de los candidatos a reemplazo", "Evaluar desempeño y potencial de los candidatos; produce el mapa de talento.", 6, "2027-02-01", "2027-03-19", "H", { dep: [1], soporte: "Mapa de talento de los cargos críticos" }),
    T("Planes de preparación con delegaciones progresivas", "Firmar con cada candidato su plan de preparación; produce los planes firmados.", 6, "2027-03-22", "2027-05-07", "B", { dep: [2], nota: "Renunció el candidato a reemplazo de operaciones; se debe reidentificar antes de cerrar los planes." }),
    T("Reidentificación del reemplazo de operaciones", "Evaluar dos candidatos internos y uno externo; produce el nuevo candidato aprobado.", 6, "2027-05-03", "2027-05-28", "C", { con: [3] }),
    T("Comité de talento del segundo trimestre", "Revisar el avance de los planes; produce el acta del comité.", 1, "2027-06-14", "2027-06-18", "P", { dep: [3, 4] }),
    T("Cinco reemplazos preparados", "Hito de cierre del año.", 6, "2027-07-01", "2027-12-10", "P", { hito: true, dep: [5] }),
  ],
  // ── pilotos (preparar) ──
  in02: [
    T("Diseño del tablero de margen por sede y línea", "Definir cómo se asignan fletes y gastos directos; produce el diseño aprobado.", 13, "2027-03-01", "2027-03-26", "H", { soporte: "Diseño del tablero de margen" }),
    T("Primera versión con Bogotá y Medellín", "Construir el tablero con datos de marzo; produce la primera versión en revisión.", 13, "2027-04-05", "2027-05-14", "R", { dep: [1] }),
    T("Inclusión de Barranquilla y Cali", "Sumar las dos sedes con el cierre del primer semestre.", 13, "2027-06-14", "2027-07-16", "P", { dep: [2] }),
  ],
  in04: [
    T("Selección de la plataforma del portal", "Comparar tres plataformas B2B; produce la recomendación al comité.", 14, "2027-04-05", "2027-05-07", "H", { soporte: "Comparativo de plataformas B2B" }),
    T("Contratación de la plataforma", "Negociar y firmar; produce el contrato.", 7, "2027-05-10", "2027-06-11", "C", { dep: [1] }),
    T("Selección de los 30 clientes del piloto", "Elegir clientes recurrentes con buen historial de pago; produce la lista del piloto.", 14, "2027-05-10", "2027-05-28", "C", { con: [10] }),
    T("Piloto con 30 clientes", "Operar el portal con inventario en línea; depende de la salida en vivo del ERP.", 14, "2027-07-12", "2027-09-30", "P", { dep: [2, 3] }),
  ],
  in06: [
    T("Formulario único de reclamos", "Unificar en un solo formulario los reclamos que llegan por correo, teléfono y asesor; produce el formulario en uso.", 5, "2027-02-01", "2027-03-05", "H", { con: [7], soporte: "Formulario único de reclamos" }),
    T("Ruta de 48 horas en Bogotá", "Operar la ruta con responsables por tipo de reclamo; produce el informe del primer mes.", 5, "2027-03-08", "2027-04-30", "H", { dep: [1], ent: true, soporte: "Informe del primer mes de la ruta de reclamos" }),
    T("Análisis de causa raíz de abril", "Analizar las tres causas más repetidas; produce el plan de acción.", 5, "2027-05-03", "2027-05-21", "C", { dep: [2] }),
  ],
  in12: [
    T("Plantilla de proceso aprobada", "Acordar dueño, entradas, salidas e indicador; produce la plantilla.", 3, "2027-01-18", "2027-01-29", "H", { soporte: "Plantilla de proceso" }),
    T("Cinco procesos que toca el ERP documentados", "Documentar venta, despacho, facturación, recibo y cobro; produce los cinco procesos aprobados.", 12, "2027-02-01", "2027-04-16", "H", { con: [4], dep: [1], ent: true, soporte: "Cinco procesos críticos documentados" }),
    T("Formación de los equipos en sus procesos", "Formar a cada equipo en el suyo; produce los registros de formación.", 3, "2027-04-19", "2027-06-11", "C", { dep: [2] }),
    T("Diez procesos restantes", "Documentar el resto en el segundo semestre.", 12, "2027-07-05", "2027-09-24", "P", { dep: [2] }),
  ],
};

/** Riesgos de los proyectos. Severidad = probabilidad × impacto. `alta`: cuándo se registró; `cambio`: cuándo pasó a su estado actual. */
export const RIESGOS: RiesgoDemo[] = [
  { ini: "in01", alta: "2027-04-12", cambio: "2027-04-19", title: "Renuncia de un asesor comercial de la costa", desc: "Sin el segundo asesor, la mitad de la cartera de la costa queda sin visita y la meta de clientes activos se aleja.", cat: "RECURSOS", p: 4, i: 4, st: "MATERIALIZADO", quien: 9, resp: "El coordinador cubre la cartera; selección del reemplazo en curso con talento humano." },
  { ini: "in01", alta: "2027-03-15", title: "Flete Bogotá–Barranquilla por encima de lo presupuestado", desc: "Los traslados semanales cuestan un 22 % más de lo previsto y presionan el margen de la sede.", cat: "PRESUPUESTO", p: 3, i: 3, st: "ABIERTO", quien: 8, fecha: "2027-06-30" },
  { ini: "in11", alta: "2027-02-22", cambio: "2027-04-26", title: "El ERP depende de un solo administrador", desc: "Si el analista de sistemas se ausenta, la configuración y las pruebas se detienen.", cat: "RECURSOS", p: 4, i: 5, st: "EN_MITIGACION", quien: 7, resp: "Formación de una segunda administradora; el implementador cubre las pruebas mientras tanto." },
  { ini: "in11", alta: "2027-05-03", title: "La salida en vivo cruza con el cierre del semestre", desc: "Salir en vivo en junio obliga a cerrar el semestre con dos sistemas en paralelo.", cat: "CRONOGRAMA", p: 3, i: 4, st: "ABIERTO", quien: 4, fecha: "2027-06-07" },
  { ini: "in05", alta: "2027-03-01", cambio: "2027-04-05", title: "Los asesores no registran la fecha prometida", cat: "ALCANCE", p: 3, i: 3, st: "CERRADO", quien: 3, resp: "La fecha prometida se volvió campo obligatorio en el ERP." },
  { ini: "in07", alta: "2027-03-29", title: "Dos cuentas clave en licitación con la competencia", desc: "Dos clientes mineros abrieron licitación anual; perderlas bajaría la recompra industrial dos puntos.", cat: "EXTERNO", p: 3, i: 4, st: "ABIERTO", quien: 10, fecha: "2027-06-15" },
  { ini: "in09", alta: "2027-03-08", cambio: "2027-04-02", title: "Tiempos de entrega de proveedores importados sin dato confiable", cat: "CALIDAD", p: 4, i: 3, st: "EN_MITIGACION", quien: 8, resp: "Compras levanta los tiempos reales de los últimos doce meses para los veinte proveedores A." },
  { ini: "in15", alta: "2027-04-06", cambio: "2027-04-21", title: "Renuncia del candidato a reemplazo de operaciones", cat: "RECURSOS", p: 3, i: 4, st: "MATERIALIZADO", quien: 6, resp: "Reidentificación con dos candidatos internos y uno externo." },
  { ini: "in04", alta: "2027-05-10", title: "El piloto del portal no puede arrancar sin inventario en línea", cat: "CRONOGRAMA", p: 4, i: 3, st: "ABIERTO", quien: 14, fecha: "2027-07-12" },
  { ini: "in03", alta: "2027-02-15", cambio: "2027-03-26", title: "Clientes grandes rechazan el cambio de condiciones", cat: "EXTERNO", p: 2, i: 4, st: "CERRADO", quien: 2, resp: "Las cuentas clave conservan su banda negociada dentro del plan de cuenta." },
];

/** Movimientos de presupuesto en millones de pesos (se guardan en pesos). E ejecución · C compromiso. */
const G = (ini: string, tipo: "E" | "C", concepto: string, millones: number, fecha: string, soporte?: string): GastoDemo => ({ ini, tipo: tipo === "E" ? "EJECUCION" : "COMPROMISO", concepto, millones, fecha, soporte });
export const GASTOS: GastoDemo[] = [
  // in01 · 420 M: la apertura se ejecutó; el flete corre por encima
  G("in01", "C", "Contrato anual con el operador logístico de Barranquilla", 96, "2027-01-29", "Contrato OL-2027-01"), G("in01", "E", "Inventario inicial trasladado a la sede", 118, "2027-02-22", "Traslados TR-0412 a TR-0418"),
  G("in01", "E", "Selección y entrenamiento del equipo de la costa", 26, "2027-02-19", "Facturas de viaje y selección"), G("in01", "E", "Apertura y lanzamiento con clientes de la costa", 18, "2027-03-01", "Factura FE-2211"),
  G("in01", "E", "Fletes Bogotá–Barranquilla de marzo y abril", 41, "2027-04-30", "Facturas de transporte"),
  // in11 · 380 M: por fases
  G("in11", "C", "Contrato del implementador del ERP (fases 1 y 2)", 210, "2027-01-15", "Contrato IM-2027-02"), G("in11", "E", "Primer pago del implementador", 84, "2027-02-26", "Factura FE-9031"),
  G("in11", "E", "Licencias adicionales del ERP para la sede nueva", 22, "2027-02-26", "Factura FE-9032"), G("in11", "E", "Segundo pago del implementador", 63, "2027-05-07", "Factura FE-9188"),
  // in05 · 90 M
  G("in05", "E", "Turno adicional de alistamiento en Bogotá", 24, "2027-03-31", "Nómina de marzo"), G("in05", "E", "Ajustes al ERP para la fecha prometida", 9, "2027-03-12", "Factura FE-9077"),
  // in07 · 110 M
  G("in07", "E", "Visitas a cuentas clave fuera de Bogotá", 17, "2027-04-30"), G("in07", "C", "Licencias del CRM para la ejecutiva de cuentas clave", 12, "2027-02-05", "Orden de compra OC-1120"),
  // in03 · 60 M
  G("in03", "E", "Análisis de precios y configuración de bandas", 21, "2027-03-05", "Factura FE-9065"),
  // in09 · 70 M
  G("in09", "E", "Consultoría de parámetros de reposición", 28, "2027-04-09", "Factura FE-9120"), G("in09", "C", "Estanterías para la reubicación de la bodega", 25, "2027-04-20", "Orden de compra OC-1188"),
  // in13 · 25 M
  G("in13", "E", "Acompañamiento en la matriz de decisiones", 12, "2027-02-05"),
  // in15 · 85 M
  G("in15", "E", "Evaluación de potencial de los candidatos", 19, "2027-03-19", "Factura FE-9101"), G("in15", "C", "Programa de preparación de los reemplazos", 38, "2027-04-02"),
  // pilotos
  G("in02", "E", "Diseño del tablero de margen", 9, "2027-03-26"), G("in06", "E", "Formulario y flujo de reclamos", 7, "2027-03-05"), G("in12", "E", "Diagramación de los cinco procesos críticos", 11, "2027-04-16"),
  G("in04", "C", "Licencia anual de la plataforma B2B (en negociación)", 96, "2027-05-14"),
];

/** Avance del primer trimestre de cada resultado clave, como fracción del tramo de su línea base a su meta (negativo: empeoró). */
export const AVANCE_KR_T1: Record<string, number> = {
  "CRE-27-01": 0.12, "CRE-27-02": -0.15, "CRE-27-03": 0.2, "CRE-27-04": 0.35, "CRE-27-05": 0.45, "CRE-27-06": 0, "CRE-27-07": 0,
  "CLI-27-01": 0.38, "CLI-27-02": 0.3, "CLI-27-03": 0.42, "CLI-27-04": 0.2, "CLI-27-05": 0.5, "CLI-27-06": 0.1,
  "OPE-27-01": 0.18, "OPE-27-02": 0.25, "OPE-27-03": 0.3, "OPE-27-04": 0.05, "OPE-27-05": 0.1,
  "ORG-27-01": 0.55, "ORG-27-02": 0.6, "ORG-27-03": 0.25, "ORG-27-04": -0.1,
};
export const AVANCE_KR_POR_DEFECTO = 0.2;
export const NOTAS_KR_T1: Record<string, string> = {
  "CRE-27-01": "La sede abrió el 1 de marzo: el primer trimestre solo tiene un mes de venta.",
  "CRE-27-02": "El margen bajó por el flete Bogotá–Barranquilla, un 22 % por encima de lo presupuestado.",
  "CRE-27-05": "La política de descuentos entró en vigencia el 5 de marzo; el efecto se ve completo en abril.",
  "CRE-27-06": "El portal está en preparación: el piloto arranca cuando el ERP publique el inventario en línea.",
  "CLI-27-01": "Ventanas de despacho y reunión diaria operando en Bogotá desde febrero.",
  "OPE-27-04": "La recaptura baja cuando salgan en vivo pedidos e inventario (junio).",
  "ORG-27-02": "La matriz de decisiones redujo a la mitad las decisiones devueltas en dos meses.",
  "ORG-27-04": "Una renuncia en la costa y otra en Bogotá en el trimestre.",
};

/** Estado y avance declarado de cada iniciativa a la fecha de la demo, con una entrada de bitácora. */
export const AVANCE_INICIATIVAS: Record<string, { status: "PLANEADA" | "EN_CURSO" | "EN_RIESGO" | "COMPLETADA"; progress: number; log?: { type: "HITO" | "ALERTA" | "NOTA"; text: string } }> = {
  in01: { status: "EN_RIESGO", progress: 50, log: { type: "ALERTA", text: "La sede abrió a tiempo, pero renunció un asesor y el flete supera lo presupuestado: la meta de clientes activos está en riesgo." } },
  in11: { status: "EN_CURSO", progress: 45, log: { type: "NOTA", text: "Configuración en revisión y pruebas integrales en curso; la formación del segundo administrador está bloqueada." } },
  in05: { status: "EN_CURSO", progress: 65, log: { type: "HITO", text: "OTIF de clientes prioritarios del 86,6 % en marzo; la promesa se extiende a Medellín y Cali." } },
  in07: { status: "EN_CURSO", progress: 45, log: { type: "HITO", text: "Veinte planes de cuenta aprobados y visitas del trimestre en curso." } },
  in03: { status: "EN_CURSO", progress: 85, log: { type: "HITO", text: "Política vigente desde marzo; descuento promedio del 10 % en el trimestre." } },
  in09: { status: "EN_CURSO", progress: 55, log: { type: "NOTA", text: "Parámetros de A y B cargados con nueve días de retraso; reubicación de bodega en curso." } },
  in13: { status: "EN_CURSO", progress: 85, log: { type: "HITO", text: "Matriz versión 2 publicada; el gerente sostiene el 22 % de agenda estratégica." } },
  in15: { status: "EN_RIESGO", progress: 35, log: { type: "ALERTA", text: "Renunció el candidato a reemplazo de operaciones; los planes de preparación están detenidos hasta reidentificarlo." } },
  in02: { status: "EN_CURSO", progress: 40 }, in04: { status: "EN_CURSO", progress: 15 }, in06: { status: "EN_CURSO", progress: 70 }, in12: { status: "EN_CURSO", progress: 45 },
};

/** Cierre del primer trimestre de cada meta (iniciativa|área): cumplimiento (%) y aprendizaje. */
export const CIERRES_T1: Record<string, { c: number; a: string }> = {
  "in01|R10": { c: 90, a: "La sede abrió el 1 de marzo como estaba previsto; quedó en 38 clientes activos y no en 45 porque la cartera de Cartagena se demoró en trasladarse." },
  "in01|R09": { c: 100, a: "El portafolio llegó completo al operador; conviene una reposición dos veces por semana en las referencias A." },
  "in11|R04": { c: 100, a: "Maestros depurados y flujo aprobado a tiempo; la dependencia de un solo administrador apareció como el riesgo mayor." },
  "in05|R03": { c: 85, a: "Ventanas y reunión diaria funcionando en Bogotá, con OTIF del 86,6 % en marzo; Medellín y Cali todavía no aplican el método." },
  "in07|R02": { c: 100, a: "Veinte planes aprobados; la plantilla funcionó mejor con un responsable por cuenta y no por asesor." },
  "in03|R02": { c: 95, a: "Bandas activas desde el 5 de marzo; las cuentas clave necesitaron una banda negociada dentro de su plan." },
  "in09|R09": { c: 70, a: "La clasificación salió a tiempo, pero los parámetros de A y B se cargaron con nueve días de retraso por la falta de tiempos de entrega confiables." },
  "in13|R01": { c: 100, a: "La matriz se publicó y el registro muestra que las decisiones devueltas bajaron de 26 a 15 por semana." },
  "in15|R06": { c: 100, a: "Cargos críticos aprobados y candidatos evaluados; el mapa de talento mostró que dos cargos no tienen candidato interno." },
};

/* ═══ Madurez digital ═══ */

/** Nivel de partida por línea y dimensión (1 a 5) del perfil de madurez de la demo; cada variable varía ±1 alrededor. */
export const MADUREZ_PERFIL: Record<string, Record<string, number>> = {
  CL: { organizacional: 3, misional: 2, tecnologica: 2, datos: 2 },
  OP: { organizacional: 2, misional: 3, tecnologica: 2, datos: 2 },
  IN: { organizacional: 2, misional: 2, tecnologica: 2, datos: 1 },
  AR: { organizacional: 2, misional: 2, tecnologica: 2, datos: 2 },
};
/** Sesgo de la percepción de los directivos frente al nivel verificado (positivo: se ven mejor de lo que están). */
export const MADUREZ_SESGO: Record<string, number> = { CL: 0.8, OP: 0.4, IN: 0.5, AR: 0 };
export const MADUREZ_SALVAGUARDAS: ("CUMPLE" | "PARCIAL" | "FALLA")[] = ["PARCIAL", "CUMPLE", "FALLA", "PARCIAL", "CUMPLE"];
export const MADUREZ_CORTE = "Línea base · abril de 2027";
