// ─────────────────────────────────────────────────────────────────────────────
// Instrumento de madurez digital para empresas: 48 variables en cuatro líneas
// (clientes, operación, innovación y arquitectura) × cuatro dimensiones, tres
// por celda. Cada variable declara qué mide, contra qué referente se evalúa,
// qué se pregunta (ítems por grupo de actores), qué evidencia se solicita
// (D/I/K con su criterio) y la rúbrica de cinco niveles. Aplica a empresas de
// cualquier sector. La medición no vive aquí: es de cada empresa.
// ─────────────────────────────────────────────────────────────────────────────
import type { MadInstrument, MadItem, MadEvidenceReq, MadVariable } from "@/lib/madurez";

/* ═══ Helpers de autoría (mantienen el banco legible) ═══ */

type Aud = "direccion" | "lideres" | "equipos" | "tecnologia" | "clientes";

const L = (text: string, audiences: Aud[]): MadItem => ({ text, type: "likert", audiences });
const V = (text: string, audiences: Aud[]): MadItem => ({ text, type: "verificacion", audiences });
const N = (text: string, audiences: Aud[]): MadItem => ({ text, type: "dato", audiences });
const A = (text: string, audiences: Aud[]): MadItem => ({ text, type: "abierta", audiences });

const D = (what: string, criterio: string): MadEvidenceReq => ({ component: "D", what, criterio });
const I = (what: string, criterio: string): MadEvidenceReq => ({ component: "I", what, criterio });
const K = (what: string, criterio: string): MadEvidenceReq => ({ component: "K", what, criterio });

/* ═══ Banco de variables ═══ */

const VARIABLES: MadVariable[] = [

  /* ════════ L1 · CLIENTES, CANALES Y EXPERIENCIA ════════ */

  // ── organizacional ──
  {
    id: "CL-ORG-1", line: 1, dimension: "organizacional", d7: "D1",
    name: "Estrategia de clientes y canales digitales",
    desc: "Existencia de una estrategia aprobada de relación con clientes y canales digitales, con metas, responsable y presupuesto, derivada del plan estratégico.",
    frame: "CMI",
    items: [
      L("La empresa cuenta con una estrategia de clientes y canales digitales vigente, conocida por las áreas y aplicada en sus decisiones.", ["direccion", "lideres", "equipos"]),
      V("La estrategia fue aprobada por el comité directivo o la junta y tiene metas, responsable y presupuesto asignados.", ["direccion"]),
      A("Mencione una decisión reciente sobre canales o experiencia del cliente y el objetivo de la estrategia que la sustentó.", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Documento de estrategia de clientes y canales digitales, con fecha y acta de aprobación", "Aprobado por el comité directivo o la junta, vigente y con metas, responsable y presupuesto"),
      I("Planes de acción, proyectos o decisiones del último año que desarrollan la estrategia", "Al menos tres iniciativas en ejecución que citan sus objetivos y cuentan con recursos"),
      K("Indicadores de la estrategia (ventas por canales digitales, satisfacción, retención) con su seguimiento", "Medición periódica con metas y revisión en el comité directivo"),
    ],
    rubric: [
      "No existe estrategia de clientes ni de canales digitales; cada área decide por su cuenta cómo atender y vender.",
      "Hay intenciones o un borrador sin aprobar; los canales digitales se abren por iniciativas aisladas.",
      "Estrategia aprobada y difundida, con metas, responsable y presupuesto.",
      "Estrategia en ejecución con indicadores y metas que el comité directivo revisa periódicamente.",
      "Estrategia que se ajusta por ciclos con datos de clientes y de mercado; los canales digitales son una fuente demostrada de crecimiento.",
    ],
  },
  {
    id: "CL-ORG-2", line: 1, dimension: "organizacional", d7: "D6",
    name: "Responsabilidad sobre la experiencia del cliente",
    desc: "Asignación de un responsable con autoridad transversal sobre la experiencia del cliente y de una instancia que coordina a las áreas que intervienen en ella.",
    frame: "ISO 9001",
    items: [
      L("Está claro quién responde por la experiencia del cliente de principio a fin y esa persona tiene autoridad para coordinar a las áreas.", ["direccion", "lideres", "equipos"]),
      V("Existe una instancia formal (comité o mesa de trabajo) que reúne a las áreas comercial, de servicio, de operación y de tecnología para tratar la experiencia del cliente.", ["lideres"]),
      A("Cuando un problema del cliente involucra a varias áreas, ¿quién lo resuelve y cuánto tarda?", ["equipos", "lideres"]),
    ],
    evidence: [
      D("Descripción del cargo o del rol responsable de la experiencia del cliente y reglamento de la instancia de coordinación", "Rol formalizado, con alcance transversal y línea de reporte a la alta dirección"),
      I("Actas de la instancia de coordinación de los últimos doce meses, con decisiones y responsables", "Sesiona con regularidad y sus decisiones se ejecutan en varias áreas"),
      K("Indicadores de experiencia asignados al responsable (satisfacción, tiempos de respuesta, casos resueltos en el primer contacto)", "Metas por indicador y seguimiento periódico que alimenta la evaluación de las áreas"),
    ],
    rubric: [
      "Nadie responde por la experiencia del cliente; cada área atiende su tramo sin coordinación.",
      "Un área asume el tema de manera informal, sin autoridad sobre las demás.",
      "Responsable designado formalmente e instancia de coordinación entre áreas en funcionamiento.",
      "El responsable gestiona indicadores de experiencia con metas compartidas por las áreas.",
      "La experiencia del cliente hace parte de los objetivos de todas las áreas y de la evaluación de sus líderes.",
    ],
  },
  {
    id: "CL-ORG-3", line: 1, dimension: "organizacional", d7: "D2",
    name: "Competencias digitales de los equipos comerciales y de servicio",
    desc: "Nivel de dominio de las herramientas y los canales digitales por parte de los equipos que venden y atienden, y existencia de un plan para desarrollarlo.",
    frame: "CMI",
    items: [
      L("Los equipos comerciales y de servicio dominan las herramientas digitales que necesitan para vender y atender.", ["lideres", "equipos"]),
      N("Porcentaje de colaboradores comerciales y de servicio que completó formación en herramientas y canales digitales en los últimos doce meses.", ["lideres"]),
      A("¿Qué tarea de su trabajo con clientes haría mejor si dominara más alguna herramienta digital?", ["equipos"]),
    ],
    evidence: [
      D("Plan de formación en competencias digitales para los equipos comerciales y de servicio, con perfiles y contenidos", "Aprobado, con competencias definidas por cargo y recursos asignados"),
      I("Registros de asistencia y aprobación de la formación, y evidencia de uso de las herramientas en el trabajo diario", "Cubre la mayor parte de los equipos y el uso se verifica en los sistemas"),
      K("Medición de competencias digitales y de adopción de herramientas por equipo", "Evaluación periódica con metas y uso de los resultados para ajustar la formación"),
    ],
    rubric: [
      "Los equipos aprenden las herramientas por su cuenta; el uso es bajo y desigual.",
      "Capacitaciones ocasionales al implantar una herramienta, sin plan ni seguimiento.",
      "Plan de formación por cargo en ejecución, con competencias digitales definidas.",
      "Competencias y adopción medidas por equipo; la formación se ajusta según los resultados.",
      "Los equipos proponen y lideran mejoras digitales en la venta y el servicio; el desarrollo de competencias es permanente.",
    ],
  },

  // ── negocio y procesos ──
  {
    id: "CL-NEG-1", line: 1, dimension: "misional", d7: "D6",
    name: "Recorrido del cliente y continuidad entre canales",
    desc: "Diseño documentado de los recorridos del cliente y continuidad de la atención entre canales presenciales y digitales, sin pérdida de información.",
    frame: "ISO 9001",
    items: [
      L("El cliente puede iniciar una gestión en un canal y continuarla en otro sin repetir información.", ["clientes", "equipos", "lideres"]),
      V("Los recorridos de los principales tipos de cliente están documentados, con sus puntos de contacto y momentos críticos.", ["lideres"]),
      A("Describa la última vez que tuvo que repetir información o empezar de nuevo al cambiar de canal.", ["clientes", "equipos"]),
    ],
    evidence: [
      D("Mapas de recorrido del cliente por segmento, con puntos de contacto, responsables y momentos críticos", "Vigentes, validados con clientes y aprobados por el responsable de la experiencia"),
      I("Evidencia de continuidad entre canales: casos que conservan su historial al pasar de un canal a otro", "La mayoría de los canales comparte el historial del cliente y el estado de sus gestiones"),
      K("Indicadores por recorrido: tiempo total, abandono, repetición de contactos y satisfacción", "Medición regular con metas y acciones de mejora derivadas"),
    ],
    rubric: [
      "Cada canal opera por separado; el cliente repite su información en cada contacto.",
      "Algunos recorridos identificados de manera informal; la continuidad depende de la buena voluntad de las personas.",
      "Recorridos documentados y canales principales con historial compartido.",
      "Recorridos medidos con indicadores y metas; los puntos de fricción se corrigen de forma sistemática.",
      "Recorridos rediseñados continuamente con datos y con participación de los clientes; la experiencia es consistente en todos los canales.",
    ],
  },
  {
    id: "CL-NEG-2", line: 1, dimension: "misional", d7: "D3",
    name: "Venta y autogestión en canales digitales",
    desc: "Proporción de las transacciones y solicitudes del cliente (cotización, pedido, pago, consulta, reclamo) que se pueden completar por canales digitales sin intervención manual.",
    frame: "CMI",
    items: [
      L("Los clientes pueden cotizar, comprar, pagar y hacer seguimiento a sus solicitudes por canales digitales.", ["clientes", "lideres", "equipos"]),
      N("Porcentaje de las ventas y de las solicitudes de servicio que se tramitan por canales digitales.", ["lideres"]),
      V("Los pedidos y las solicitudes recibidos por canales digitales llegan a los sistemas internos sin que alguien los vuelva a digitar.", ["tecnologia", "equipos"]),
    ],
    evidence: [
      D("Catálogo de transacciones y servicios disponibles en canales digitales, con su procedimiento de operación", "Cubre las transacciones de mayor volumen y define responsables y tiempos de respuesta"),
      I("Registros de transacciones completadas por canales digitales en los últimos doce meses", "Las transacciones principales se completan en línea de principio a fin, sin pasos manuales"),
      K("Participación de los canales digitales en ventas y solicitudes, tasa de conversión y de abandono", "Indicadores con metas, seguimiento mensual y decisiones documentadas"),
    ],
    rubric: [
      "Los canales digitales solo informan; toda transacción exige contacto presencial o telefónico.",
      "Algunas solicitudes se reciben en línea, pero se tramitan manualmente dentro de la empresa.",
      "Las transacciones de mayor volumen se completan en línea y quedan registradas en los sistemas internos.",
      "La venta y la autogestión digitales se miden con metas de participación, conversión y abandono.",
      "Los canales digitales son la vía preferida por los clientes y se optimizan de forma continua con pruebas y datos.",
    ],
  },
  {
    id: "CL-NEG-3", line: 1, dimension: "misional", d7: "D6",
    name: "Voz del cliente y medición de la experiencia",
    desc: "Captura sistemática de la satisfacción, las quejas y las sugerencias de los clientes, y su uso para corregir y mejorar productos, servicios y procesos.",
    frame: "ISO 9001",
    items: [
      L("La empresa escucha a sus clientes de manera sistemática y actúa a partir de lo que ellos expresan.", ["clientes", "lideres", "equipos"]),
      N("Número de quejas y reclamos recibidos en los últimos doce meses, tiempo promedio de respuesta y porcentaje resuelto en el plazo establecido.", ["lideres"]),
      A("Mencione una mejora reciente que haya nacido de una queja, una sugerencia o una encuesta de clientes.", ["lideres", "direccion"]),
    ],
    evidence: [
      D("Procedimiento de gestión de la voz del cliente: encuestas, quejas, reclamos y sugerencias, con plazos y responsables", "Aprobado, vigente y aplicable a todos los canales"),
      I("Registro único de quejas, reclamos y sugerencias, y resultados de las mediciones de satisfacción", "Todos los casos quedan registrados, con respuesta al cliente y análisis de causas"),
      K("Indicadores de satisfacción, recomendación y oportunidad de respuesta, con su evolución", "Metas definidas, revisión periódica y mejoras atribuibles a los resultados"),
    ],
    rubric: [
      "Las quejas se atienden caso a caso y no se registran; no se mide la satisfacción.",
      "Encuestas o buzones aislados; los resultados no se analizan ni llegan a quienes deciden.",
      "Procedimiento formal con registro único de casos y medición periódica de la satisfacción.",
      "Indicadores con metas y análisis de causas; las áreas responden por planes de mejora.",
      "La voz del cliente orienta el rediseño de productos, servicios y procesos; se informa al cliente lo que cambió gracias a sus aportes.",
    ],
  },

  // ── tecnológica ──
  {
    id: "CL-TEC-1", line: 1, dimension: "tecnologica", d7: "D5",
    name: "Plataforma de gestión de clientes",
    desc: "Existencia de un sistema único de gestión de la relación con clientes (CRM), adoptado por las áreas comercial, de mercadeo y de servicio e integrado con los sistemas de operación.",
    frame: "TOGAF 10",
    items: [
      L("Las áreas que tratan con clientes trabajan sobre un mismo sistema, donde consta el historial de cada cliente.", ["equipos", "lideres", "tecnologia"]),
      N("Porcentaje de usuarios comerciales y de servicio que registra su gestión en el sistema de clientes cada semana.", ["tecnologia", "lideres"]),
      V("El sistema de gestión de clientes intercambia información de forma automática con facturación, inventarios o prestación del servicio.", ["tecnologia"]),
    ],
    evidence: [
      D("Documento de arquitectura o ficha técnica del sistema de gestión de clientes: alcance, módulos, integraciones y responsable", "Define un único sistema de referencia y sus integraciones con los sistemas de operación"),
      I("Registros de uso del sistema por área y evidencia de las integraciones en funcionamiento", "Usado por la mayor parte de los equipos; las hojas de cálculo paralelas son la excepción"),
      K("Indicadores de adopción y de calidad del registro (oportunidades, casos y contactos actualizados)", "Medición periódica con metas por área y acciones correctivas"),
    ],
    rubric: [
      "La información de clientes está en hojas de cálculo, correos y agendas personales.",
      "Existe un sistema, pero lo usa una sola área o convive con registros paralelos.",
      "Sistema único adoptado por las áreas comercial, de mercadeo y de servicio.",
      "Sistema integrado con los sistemas de operación; la adopción y la calidad del registro se miden.",
      "Plataforma que orquesta la relación con el cliente en todos los canales y evoluciona según una hoja de ruta.",
    ],
  },
  {
    id: "CL-TEC-2", line: 1, dimension: "tecnologica", d7: "D6",
    name: "Canales digitales y comercio electrónico",
    desc: "Disponibilidad, facilidad de uso y desempeño de los canales digitales de la empresa (sitio web, aplicación, portal de autogestión, tienda en línea y mensajería).",
    frame: "ITIL 4",
    items: [
      L("Los canales digitales de la empresa son fáciles de usar, funcionan bien y están disponibles cuando el cliente los necesita.", ["clientes", "equipos", "tecnologia"]),
      N("Disponibilidad mensual de los canales digitales y número de incidentes que afectaron a clientes en los últimos doce meses.", ["tecnologia"]),
      V("Los canales digitales se prueban con clientes reales antes de publicar cambios importantes.", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Inventario de canales digitales con su responsable, niveles de servicio acordados y lineamientos de diseño y accesibilidad", "Cada canal tiene responsable, niveles de servicio definidos y criterios de facilidad de uso"),
      I("Informes de monitoreo, registro de incidentes y resultados de pruebas con usuarios", "Monitoreo permanente, incidentes gestionados y pruebas de uso realizadas en el último año"),
      K("Indicadores de disponibilidad, tiempos de carga, tareas completadas y satisfacción con el canal", "Metas por canal, seguimiento mensual y mejoras priorizadas con esos datos"),
    ],
    rubric: [
      "Presencia digital mínima o desactualizada; las fallas se conocen por las quejas de los clientes.",
      "Canales en funcionamiento sin responsable claro ni monitoreo; la experiencia varía de un canal a otro.",
      "Canales con responsable, niveles de servicio y lineamientos comunes de diseño.",
      "Disponibilidad, desempeño y facilidad de uso medidos con metas; los cambios se prueban con usuarios.",
      "Canales que se optimizan de forma continua mediante pruebas y datos de uso; son referencia en su sector.",
    ],
  },
  {
    id: "CL-TEC-3", line: 1, dimension: "tecnologica", d7: "D6", ai: true,
    name: "Asistentes virtuales y automatización de la atención",
    desc: "Uso de asistentes virtuales y de inteligencia artificial para atender, orientar y responder a los clientes, con supervisión humana, control de calidad y transparencia.",
    frame: "NIST AI RMF",
    items: [
      L("La empresa usa asistentes virtuales o inteligencia artificial en la atención de manera útil para el cliente y con supervisión.", ["lideres", "equipos", "tecnologia", "clientes"]),
      V("El cliente es informado cuando lo atiende un sistema automatizado y puede pedir que lo atienda una persona.", ["lideres", "clientes"]),
      N("Porcentaje de las consultas resueltas por medios automatizados sin escalar a una persona y satisfacción de los clientes con esa atención.", ["lideres", "tecnologia"]),
    ],
    evidence: [
      D("Lineamiento de uso de asistentes virtuales e inteligencia artificial en la atención: alcance, temas excluidos, supervisión y paso a una persona", "Aprobado, con casos permitidos, responsables y criterios de transparencia hacia el cliente"),
      I("Asistentes o automatizaciones en producción, con registro de conversaciones y de revisiones de calidad", "Operan sobre información oficial de la empresa y sus respuestas se revisan por muestreo"),
      K("Indicadores de resolución, de traslado a personas, de errores detectados y de satisfacción", "Medición continua con metas y correcciones documentadas"),
    ],
    rubric: [
      "Toda la atención es manual; no se ha explorado la automatización.",
      "Pruebas aisladas de asistentes virtuales, sin lineamientos ni control de la calidad de las respuestas.",
      "Asistente en producción para consultas frecuentes, con lineamiento aprobado y paso a una persona cuando el cliente lo pide.",
      "Atención automatizada medida y supervisada; los errores se registran y se corrigen de forma sistemática.",
      "La automatización resuelve la mayoría de las consultas simples con alta satisfacción y libera a los equipos para los casos complejos; se audita periódicamente.",
    ],
  },

  // ── datos e información ──
  {
    id: "CL-DAT-1", line: 1, dimension: "datos", d7: "D4",
    name: "Vista única del cliente",
    desc: "Integración de los datos de cada cliente (identificación, compras, contactos, casos y preferencias) en un registro único, confiable y accesible para las áreas que lo atienden.",
    frame: "DAMA-DMBOK",
    items: [
      L("Quien atiende a un cliente puede consultar en un solo lugar su información completa y actualizada.", ["equipos", "lideres", "tecnologia"]),
      N("Porcentaje estimado de registros de clientes duplicados o incompletos en la base principal.", ["tecnologia"]),
      V("Existe un responsable designado del dato maestro de clientes y reglas para crearlo y actualizarlo.", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Definición del dato maestro de clientes: atributos, fuentes, reglas de calidad y responsable", "Aprobada, con un responsable del dato y reglas de creación, actualización y depuración"),
      I("Base o repositorio que consolida los datos de clientes de las distintas fuentes", "Integra las fuentes principales y las áreas la consultan en su trabajo diario"),
      K("Indicadores de calidad del dato de clientes: duplicados, completitud y actualización", "Medición periódica con metas y rutinas de depuración"),
    ],
    rubric: [
      "Cada área tiene su propia lista de clientes; los datos no coinciden entre sí.",
      "Hay una base principal, con duplicados y vacíos; se cruza manualmente con otras fuentes.",
      "Dato maestro de clientes definido, con responsable y fuentes principales integradas.",
      "Calidad del dato medida y depurada de forma rutinaria; la vista del cliente incluye compras, contactos y casos.",
      "Vista completa y actualizada al instante, disponible en todos los canales y base de la personalización.",
    ],
  },
  {
    id: "CL-DAT-2", line: 1, dimension: "datos", d7: "D1",
    name: "Datos personales y consentimiento de los clientes",
    desc: "Cumplimiento verificable de la protección de datos personales de los clientes: autorizaciones, finalidades, atención de derechos y control del acceso.",
    frame: "ISO 27001",
    items: [
      L("La empresa trata los datos personales de sus clientes con autorización, para fines claros y con acceso restringido.", ["direccion", "lideres", "tecnologia", "clientes"]),
      V("Existe una política de tratamiento de datos personales publicada y un responsable designado para atender consultas y reclamos de los titulares.", ["direccion", "tecnologia"]),
      N("Número de solicitudes de titulares (consulta, corrección, supresión) recibidas en los últimos doce meses y porcentaje atendido en el plazo.", ["lideres", "tecnologia"]),
    ],
    evidence: [
      D("Política de tratamiento de datos personales, formatos de autorización y registro de las bases de datos con sus finalidades", "Vigentes, publicados y coherentes con la normativa de protección de datos aplicable"),
      I("Registros de autorizaciones, de atención de solicitudes de titulares y de control de accesos a los datos de clientes", "Toda base de clientes tiene autorización trazable y accesos limitados por función"),
      K("Indicadores de cumplimiento: bases con autorización, solicitudes atendidas en plazo e incidentes", "Seguimiento periódico con informe a la alta dirección"),
    ],
    rubric: [
      "Se recogen datos de clientes sin autorización ni finalidades definidas.",
      "Política publicada, pero las autorizaciones son incompletas y no hay control de quién accede a los datos.",
      "Autorizaciones trazables, finalidades definidas y responsable de atender a los titulares.",
      "Cumplimiento medido y auditado; los accesos se revisan y los incidentes se gestionan con procedimiento.",
      "La privacidad se incorpora desde el diseño de cada nuevo canal, campaña o sistema; el cliente gestiona sus preferencias por sí mismo.",
    ],
  },
  {
    id: "CL-DAT-3", line: 1, dimension: "datos", d7: "D4", ai: true,
    name: "Analítica de clientes y personalización",
    desc: "Uso de analítica y de modelos predictivos para segmentar, anticipar comportamientos (compra, abandono, riesgo) y personalizar ofertas y comunicaciones.",
    frame: "NIST AI RMF",
    items: [
      L("La empresa usa los datos de sus clientes para segmentarlos, anticipar su comportamiento y personalizar lo que les ofrece.", ["lideres", "equipos", "tecnologia"]),
      V("Existe al menos un modelo de segmentación o de predicción sobre clientes en uso, con responsable y revisión periódica de sus resultados.", ["tecnologia", "lideres"]),
      A("Mencione una decisión comercial o de servicio reciente que se haya tomado a partir de un análisis de datos de clientes.", ["lideres", "direccion"]),
    ],
    evidence: [
      D("Fichas de los modelos y análisis de clientes en uso: propósito, datos empleados, responsable y limitaciones", "Cada modelo tiene ficha, responsable y revisión de sesgos y de uso de datos personales"),
      I("Segmentaciones, predicciones o recomendaciones aplicadas en campañas, ofertas o gestión de cartera", "Se usan de manera regular en decisiones comerciales o de servicio, no solo en pruebas"),
      K("Medición del efecto de la personalización (conversión, retención, valor del cliente) frente a un grupo de comparación", "Resultados medidos con método y usados para mantener, ajustar o retirar los modelos"),
    ],
    rubric: [
      "Los datos de clientes solo se usan para informes de ventas pasadas.",
      "Segmentaciones básicas hechas a mano y de manera ocasional.",
      "Segmentación formal y análisis recurrentes que orientan campañas y ofertas.",
      "Modelos predictivos en uso, documentados y con medición de su efecto en los resultados.",
      "Personalización en todos los canales, apoyada en modelos supervisados que se reentrenan y auditan de forma periódica.",
    ],
  },

  /* ════════ L2 · OPERACIÓN Y PROCESOS ════════ */

  // ── organizacional ──
  {
    id: "OP-ORG-1", line: 2, dimension: "organizacional", d7: "D3",
    name: "Gestión por procesos y dueños de proceso",
    desc: "Existencia de un mapa de procesos vigente y de dueños de proceso con autoridad para mejorarlos de extremo a extremo, por encima de la división por áreas.",
    frame: "ISO 9001",
    items: [
      L("Los procesos críticos de la empresa tienen un dueño que responde por su resultado de principio a fin.", ["direccion", "lideres", "equipos"]),
      V("El mapa de procesos está aprobado, vigente y asigna un dueño a cada proceso crítico.", ["lideres"]),
      A("Cuando un proceso que cruza varias áreas falla, ¿quién decide cómo corregirlo?", ["lideres", "equipos"]),
    ],
    evidence: [
      D("Mapa de procesos y acto de designación de los dueños de proceso, con sus responsabilidades", "Aprobado por la alta dirección, vigente y con dueños para todos los procesos críticos"),
      I("Actas o informes de revisión de procesos liderados por sus dueños en el último año", "Los dueños revisan su proceso con regularidad y coordinan a las áreas que participan"),
      K("Indicadores de desempeño por proceso asignados a cada dueño", "Metas por proceso y revisión periódica en el comité directivo"),
    ],
    rubric: [
      "La empresa se gestiona por áreas; nadie responde por los procesos de extremo a extremo.",
      "Mapa de procesos elaborado, pero desactualizado o sin dueños reales.",
      "Mapa vigente y dueños designados que revisan sus procesos.",
      "Dueños que gestionan indicadores con metas y resuelven los conflictos entre áreas.",
      "La gestión por procesos guía la estructura, el presupuesto y la priorización de las mejoras digitales.",
    ],
  },
  {
    id: "OP-ORG-2", line: 2, dimension: "organizacional", d7: "D2",
    name: "Gestión del cambio organizacional",
    desc: "Aplicación de un método de gestión del cambio (actores, comunicación, formación y acompañamiento) en la adopción de nuevos procesos y sistemas.",
    frame: "COBIT 2019",
    items: [
      L("Los cambios de procesos y sistemas se preparan con método: se identifica a los afectados, se les forma y se les acompaña.", ["lideres", "equipos"]),
      V("Los proyectos de transformación del portafolio incluyen un plan de gestión del cambio con responsable y presupuesto.", ["lideres", "tecnologia"]),
      A("¿Cómo se enteró y cómo se preparó para el último sistema o proceso nuevo que cambió su trabajo?", ["equipos"]),
    ],
    evidence: [
      D("Método de gestión del cambio adoptado por la empresa: mapa de actores, plan de comunicación, formación y acompañamiento", "Adoptado como componente obligatorio de los proyectos de transformación"),
      I("Planes de cambio ejecutados en las implantaciones recientes", "Incluyen formación y acompañamiento verificables, no solo comunicados"),
      K("Indicadores de adopción después de cada implantación: uso, satisfacción y resistencia", "Medidos y usados para ajustar el acompañamiento"),
    ],
    rubric: [
      "Los cambios se anuncian por correo el día de la puesta en marcha; la resistencia se descubre tarde.",
      "Hay conciencia del problema y capacitaciones puntuales, sin método.",
      "Método de gestión del cambio aplicado en los proyectos principales.",
      "Adopción medida después de cada implantación; el acompañamiento se ajusta con esos datos.",
      "Los equipos piden y lideran sus propias transformaciones; el cambio es una capacidad permanente de la organización.",
    ],
  },
  {
    id: "OP-ORG-3", line: 2, dimension: "organizacional", d7: "D2", ai: true,
    name: "Competencias digitales y de inteligencia artificial",
    desc: "Nivel de competencias digitales, de datos y de uso responsable de la inteligencia artificial de los colaboradores, y existencia de una ruta de formación por cargo.",
    frame: "CMI",
    items: [
      L("Los colaboradores tienen las competencias digitales y de uso de inteligencia artificial que su trabajo exige.", ["direccion", "lideres", "equipos"]),
      N("Porcentaje de colaboradores que completó formación en competencias digitales, de datos o de inteligencia artificial en los últimos doce meses.", ["lideres"]),
      V("Existen lineamientos conocidos por los colaboradores sobre qué herramientas de inteligencia artificial pueden usar y con qué información.", ["lideres", "equipos", "tecnologia"]),
    ],
    evidence: [
      D("Ruta de formación en competencias digitales, de datos y de inteligencia artificial, por cargo o familia de cargos", "Aprobada, con niveles esperados por cargo, presupuesto y lineamientos de uso responsable"),
      I("Registros de formación y evidencia de aplicación de lo aprendido en el trabajo", "Cubre a la mayor parte de los colaboradores, incluidos los líderes"),
      K("Medición de competencias por cargo y brechas frente al nivel esperado", "Evaluación periódica con metas de cierre de brechas"),
    ],
    rubric: [
      "No se conocen las competencias digitales de los colaboradores; cada quien aprende por su cuenta.",
      "Cursos sueltos por iniciativa de algunas áreas; el uso de la inteligencia artificial no está orientado.",
      "Ruta de formación por cargo en ejecución y lineamientos de uso de la inteligencia artificial difundidos.",
      "Competencias medidas por cargo; las brechas se cierran con metas y seguimiento.",
      "Los colaboradores aplican y comparten nuevos usos digitales y de inteligencia artificial; la formación se anticipa a las necesidades del negocio.",
    ],
  },

  // ── negocio y procesos ──
  {
    id: "OP-NEG-1", line: 2, dimension: "misional", d7: "D3",
    name: "Documentación y estandarización de procesos críticos",
    desc: "Proporción de los procesos críticos que cuentan con documentación vigente y que operan de la misma manera en todas las sedes, turnos o equipos.",
    frame: "ISO 9001",
    items: [
      L("Los procesos críticos están documentados y se ejecutan de la misma manera sin importar quién los realice.", ["lideres", "equipos"]),
      N("Porcentaje de procesos críticos con documentación vigente, revisada en los últimos veinticuatro meses.", ["lideres"]),
      A("¿Qué proceso crítico opera hoy de manera distinta de como está documentado, o no está documentado?", ["equipos", "lideres"]),
    ],
    evidence: [
      D("Caracterizaciones, procedimientos e instructivos vigentes de los procesos críticos", "Cubren la gran mayoría de los procesos críticos y están aprobados y al alcance de quienes los ejecutan"),
      I("Resultados de auditorías internas o de verificaciones en sitio sobre el cumplimiento de los procedimientos", "Sin diferencias mayores entre lo documentado y lo que se hace"),
      K("Indicador de cobertura y vigencia de la documentación y de hallazgos de auditoría por proceso", "Seguimiento periódico con metas y cierre de hallazgos"),
    ],
    rubric: [
      "Los procesos dependen de la memoria de las personas; cada sede o equipo trabaja a su manera.",
      "Una minoría de los procesos críticos está documentada, y parte de esa documentación está desactualizada.",
      "La mayoría de los procesos críticos está documentada, aprobada y disponible.",
      "Cobertura casi total, con auditorías que verifican que se opera según lo documentado.",
      "Procesos estandarizados que se revisan por ciclos con datos de desempeño; las mejores prácticas se replican entre sedes y equipos.",
    ],
  },
  {
    id: "OP-NEG-2", line: 2, dimension: "misional", d7: "D3",
    name: "Digitalización de procesos de extremo a extremo",
    desc: "Grado en que los procesos críticos se ejecutan en sistemas de principio a fin, sin papel, sin hojas de cálculo paralelas y sin volver a digitar información.",
    frame: "COBIT 2019",
    items: [
      L("Los procesos críticos se ejecutan en los sistemas de principio a fin, sin papel ni registros paralelos.", ["lideres", "equipos", "tecnologia"]),
      N("Número de procesos críticos y cuántos de ellos se ejecutan completamente en sistemas.", ["lideres", "tecnologia"]),
      A("¿Qué información digitó dos veces su equipo esta semana, o llevó en una hoja de cálculo, porque el sistema no la cubre?", ["equipos"]),
    ],
    evidence: [
      D("Inventario de procesos críticos con su nivel de digitalización y plan de digitalización priorizado", "Identifica los pasos manuales de cada proceso y prioriza su digitalización por valor"),
      I("Procesos en operación sobre sistemas, con flujos de aprobación y registros electrónicos", "La mayoría de los procesos críticos opera sin papel ni redigitación"),
      K("Indicadores de digitalización: procesos sin pasos manuales, tiempos de ciclo y errores por redigitación", "Medición periódica con metas y seguimiento del plan"),
    ],
    rubric: [
      "Los procesos se soportan en papel, correo y hojas de cálculo.",
      "Algunos pasos están en sistemas, pero el proceso se completa con registros manuales.",
      "Los procesos críticos principales operan en sistemas y existe un plan para los restantes.",
      "La mayoría de los procesos críticos opera de extremo a extremo en sistemas; los tiempos y los errores se miden.",
      "Operación sin papel; cada proceso nuevo nace digital y se rediseña antes de sistematizarlo.",
    ],
  },
  {
    id: "OP-NEG-3", line: 2, dimension: "misional", d7: "D7",
    name: "Integración digital con proveedores y aliados",
    desc: "Grado de conexión digital con proveedores, distribuidores y aliados para intercambiar pedidos, inventarios, documentos y pagos con trazabilidad.",
    frame: "ISO 9001",
    items: [
      L("La empresa intercambia información con sus proveedores y aliados clave por medios digitales, con trazabilidad.", ["lideres", "equipos", "clientes"]),
      N("Porcentaje de las órdenes de compra, entregas y facturas que se intercambian electrónicamente con proveedores y aliados.", ["lideres", "tecnologia"]),
      V("Los proveedores críticos se evalúan periódicamente con datos de cumplimiento registrados en los sistemas.", ["lideres"]),
    ],
    evidence: [
      D("Procedimiento de gestión de proveedores y aliados que define los intercambios electrónicos y los criterios de evaluación", "Aprobado, con criterios de evaluación basados en datos y acuerdos de intercambio de información"),
      I("Portal, conexiones o intercambios electrónicos en funcionamiento con proveedores y aliados clave", "Los principales proveedores y aliados operan por medios digitales; el correo y el papel son la excepción"),
      K("Indicadores de cumplimiento de proveedores, tiempos de abastecimiento y cobertura del intercambio electrónico", "Metas definidas y revisión periódica con los propios proveedores y aliados"),
    ],
    rubric: [
      "La relación con proveedores y aliados se lleva por teléfono, correo y documentos en papel.",
      "Intercambios electrónicos con unos pocos proveedores; la información se vuelve a digitar internamente.",
      "Intercambio electrónico establecido con los proveedores y aliados clave, y evaluación periódica.",
      "Cadena conectada, con indicadores compartidos de cumplimiento, inventarios y tiempos.",
      "Planeación conjunta con proveedores y aliados sobre datos compartidos al instante; la cadena reacciona antes de que ocurran los faltantes.",
    ],
  },

  // ── tecnológica ──
  {
    id: "OP-TEC-1", line: 2, dimension: "tecnologica", d7: "D5",
    name: "Sistemas centrales de gestión",
    desc: "Cobertura, vigencia e integración de los sistemas que soportan las finanzas, las compras, los inventarios, la producción o prestación del servicio y la gestión del talento (ERP y sistemas de operación).",
    frame: "TOGAF 10",
    items: [
      L("Los sistemas centrales de la empresa cubren sus procesos principales y entregan información confiable.", ["lideres", "equipos", "tecnologia"]),
      V("Las finanzas, las compras, los inventarios y la operación comparten información en un mismo sistema o en sistemas integrados.", ["tecnologia", "lideres"]),
      A("¿Qué proceso importante se sigue manejando por fuera de los sistemas centrales y por qué?", ["lideres", "equipos"]),
    ],
    evidence: [
      D("Mapa de los sistemas centrales con los procesos que cubre cada uno, su versión, su soporte y su responsable", "Completo, actualizado y con hoja de ruta de evolución aprobada"),
      I("Evidencia de uso de los sistemas en los procesos principales y de cierres contables y operativos realizados en ellos", "Los procesos principales se ejecutan en los sistemas y los cierres no dependen de ajustes manuales"),
      K("Indicadores de cobertura funcional, disponibilidad y satisfacción de los usuarios", "Medición periódica con metas y plan de mejora"),
    ],
    rubric: [
      "Programas aislados y hojas de cálculo; la información se consolida a mano.",
      "Un sistema contable o administrativo básico; la operación se controla por fuera.",
      "Sistemas centrales que cubren los procesos principales, con soporte vigente.",
      "Sistemas integrados entre sí, con cobertura y desempeño medidos; los cierres son oportunos.",
      "Plataforma central actualizada y flexible, que incorpora nuevos procesos y negocios sin desarrollos a la medida costosos.",
    ],
  },
  {
    id: "OP-TEC-2", line: 2, dimension: "tecnologica", d7: "D6",
    name: "Puesto de trabajo digital y soporte al colaborador",
    desc: "Calidad de las herramientas digitales de trabajo y colaboración de los colaboradores, y del soporte tecnológico que reciben (mesa de servicio, tiempos de respuesta y satisfacción).",
    frame: "ITIL 4",
    items: [
      L("Los colaboradores cuentan con herramientas digitales adecuadas para trabajar y colaborar, y reciben soporte oportuno cuando fallan.", ["equipos", "lideres"]),
      N("Número de solicitudes de soporte de los últimos doce meses, tiempo promedio de solución y satisfacción de los usuarios.", ["tecnologia"]),
      V("Existe un punto único para solicitar soporte tecnológico, con tiempos de respuesta acordados.", ["tecnologia", "equipos"]),
    ],
    evidence: [
      D("Catálogo de servicios de tecnología para los colaboradores y acuerdos de niveles de servicio", "Publicado, con tiempos de respuesta y de solución por tipo de solicitud"),
      I("Registros de la mesa de servicio y evidencia de uso de las herramientas de colaboración", "Todas las solicitudes se registran y las herramientas de colaboración se usan en todas las áreas"),
      K("Indicadores de cumplimiento de los niveles de servicio y de satisfacción de los colaboradores con la tecnología", "Metas definidas, seguimiento mensual y acciones de mejora"),
    ],
    rubric: [
      "Cada colaborador resuelve sus problemas tecnológicos como puede; las herramientas son insuficientes o dispares.",
      "Soporte informal por llamadas o mensajes; las herramientas de colaboración se usan de manera desigual.",
      "Mesa de servicio con registro de solicitudes y herramientas comunes de trabajo y colaboración.",
      "Niveles de servicio y satisfacción medidos; los problemas recurrentes se eliminan desde su causa.",
      "Experiencia digital del colaborador diseñada y medida; el trabajo en sede, remoto o en campo es fluido y seguro.",
    ],
  },
  {
    id: "OP-TEC-3", line: 2, dimension: "tecnologica", d7: "D3", ai: true,
    name: "Automatización e inteligencia artificial en los procesos",
    desc: "Uso de flujos automatizados, robots de software e inteligencia artificial para ejecutar tareas repetitivas o apoyar decisiones operativas, con control y medición de beneficios.",
    frame: "NIST AI RMF",
    items: [
      L("La empresa automatiza las tareas repetitivas de sus procesos y usa inteligencia artificial donde aporta valor, con control.", ["lideres", "equipos", "tecnologia"]),
      N("Número de automatizaciones en producción y horas de trabajo manual que ahorran al mes.", ["tecnologia", "lideres"]),
      V("Cada automatización tiene un responsable de negocio, documentación y un procedimiento para cuando falla.", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Inventario de automatizaciones y de usos de inteligencia artificial en los procesos, con criterios de selección y de control", "Completo, con responsable por automatización y criterios de priorización por valor y riesgo"),
      I("Automatizaciones en producción, con registros de ejecución y de excepciones", "Operan de forma estable en varios procesos y sus excepciones se gestionan"),
      K("Medición de beneficios: horas liberadas, reducción de errores y de tiempos de ciclo", "Beneficios medidos frente a la situación anterior y reportados periódicamente"),
    ],
    rubric: [
      "Las tareas repetitivas se hacen a mano; no hay iniciativas de automatización.",
      "Automatizaciones aisladas, creadas por personas o áreas sin documentación ni respaldo.",
      "Automatizaciones en producción en varios procesos, inventariadas y con responsable.",
      "Portafolio de automatización priorizado por valor; los beneficios y las excepciones se miden.",
      "Automatización e inteligencia artificial integradas en la operación diaria, con supervisión humana de las decisiones sensibles y mejora continua.",
    ],
  },

  // ── datos e información ──
  {
    id: "OP-DAT-1", line: 2, dimension: "datos", d7: "D4",
    name: "Indicadores operativos y tableros de gestión",
    desc: "Disponibilidad de indicadores operativos confiables y oportunos (productividad, calidad, tiempos, costos), presentados en tableros que los líderes usan para decidir.",
    frame: "CMI",
    items: [
      L("Los líderes cuentan con indicadores operativos confiables y actualizados para tomar decisiones.", ["direccion", "lideres", "equipos"]),
      V("Los indicadores operativos se calculan automáticamente a partir de los sistemas, sin consolidación manual.", ["tecnologia", "lideres"]),
      A("Mencione una decisión operativa reciente que se haya tomado al revisar un indicador o un tablero.", ["lideres"]),
    ],
    evidence: [
      D("Catálogo de indicadores operativos con su ficha técnica: definición, fórmula, fuente, frecuencia y responsable", "Cada indicador tiene ficha aprobada y una única definición para toda la empresa"),
      I("Tableros en uso en las reuniones de seguimiento de las áreas y del comité directivo", "Se consultan con regularidad y reemplazan los informes armados a mano"),
      K("Evidencia del uso de los indicadores: metas, desviaciones y acciones derivadas", "Metas por indicador y decisiones documentadas a partir de las desviaciones"),
    ],
    rubric: [
      "No hay indicadores operativos; se decide con base en la experiencia y la urgencia.",
      "Indicadores armados a mano en hojas de cálculo, con retraso y cifras que difieren entre áreas.",
      "Catálogo de indicadores con fichas técnicas y tableros actualizados periódicamente.",
      "Indicadores automáticos con metas; las desviaciones generan acciones con seguimiento.",
      "Tableros al día en todos los niveles; los indicadores anticipan problemas y se revisan cuando cambia la estrategia.",
    ],
  },
  {
    id: "OP-DAT-2", line: 2, dimension: "datos", d7: "D4",
    name: "Trazabilidad digital de la operación",
    desc: "Captura de los datos de la operación en el momento y el lugar en que ocurren, de modo que cada pedido, orden, lote o caso pueda rastrearse de principio a fin.",
    frame: "ISO 9001",
    items: [
      L("Es posible conocer en cualquier momento el estado y el historial de un pedido, una orden o un caso.", ["lideres", "equipos", "clientes"]),
      V("Los datos de la operación se registran en el sistema en el momento en que ocurren, no después en planillas.", ["equipos", "tecnologia"]),
      N("Tiempo que toma reconstruir el historial completo de un pedido, lote o caso ante un reclamo o una auditoría.", ["lideres"]),
    ],
    evidence: [
      D("Procedimiento de registro y trazabilidad: qué se registra, en qué punto del proceso, quién lo hace y con qué medio", "Define los puntos de control y los datos obligatorios para rastrear de extremo a extremo"),
      I("Ejercicio de trazabilidad sobre una muestra de pedidos, lotes o casos recientes", "El historial completo se reconstruye desde los sistemas, sin recurrir a papeles ni a la memoria de las personas"),
      K("Indicadores de oportunidad y completitud del registro, y resultados de los ejercicios de trazabilidad", "Medición periódica con metas y corrección de los puntos sin registro"),
    ],
    rubric: [
      "La operación se registra en papel o no se registra; rastrear un caso exige preguntar a las personas.",
      "Registros digitales parciales y tardíos; la trazabilidad se interrumpe entre áreas.",
      "Registro en sistemas en los puntos de control definidos; la trazabilidad es completa en los procesos principales.",
      "Captura en el origen, con oportunidad y completitud medidas; el cliente puede consultar el estado de su pedido o caso.",
      "Trazabilidad al instante de extremo a extremo, incluidos proveedores y aliados; los datos alimentan la mejora y la prevención.",
    ],
  },
  {
    id: "OP-DAT-3", line: 2, dimension: "datos", d7: "D4", ai: true,
    name: "Analítica predictiva de la operación",
    desc: "Uso de modelos analíticos para pronosticar la demanda, planear la capacidad y los inventarios, y anticipar fallas, retrasos o desviaciones de calidad.",
    frame: "DAMA-DMBOK",
    items: [
      L("La empresa usa sus datos para pronosticar la demanda y anticipar problemas de la operación.", ["lideres", "equipos", "tecnologia"]),
      V("Existe al menos un pronóstico o modelo predictivo que alimenta la planeación de la operación, con medición de su acierto.", ["tecnologia", "lideres"]),
      A("¿Qué problema operativo reciente pudo haberse anticipado con los datos que la empresa ya tiene?", ["lideres", "equipos"]),
    ],
    evidence: [
      D("Fichas de los modelos de pronóstico y analítica operativa: propósito, datos, método, responsable y limitaciones", "Cada modelo está documentado y tiene un responsable de negocio y uno técnico"),
      I("Pronósticos y alertas incorporados en la planeación de la demanda, la capacidad, los inventarios o el mantenimiento", "La planeación usa los modelos de manera regular y no solo el criterio de las personas"),
      K("Medición del acierto de los pronósticos y de su efecto en faltantes, excedentes, paradas o retrasos", "Acierto medido con metas; los modelos se ajustan cuando se degradan"),
    ],
    rubric: [
      "La planeación se basa en la experiencia y en lo ocurrido el año anterior.",
      "Análisis descriptivos ocasionales; los pronósticos se hacen en hojas de cálculo sin medir su acierto.",
      "Pronósticos formales con método definido, usados en la planeación.",
      "Modelos predictivos en uso, con acierto medido y efecto demostrado en la operación.",
      "Planeación apoyada en modelos que se actualizan de forma automática y recomiendan acciones; las personas supervisan las excepciones.",
    ],
  },

  /* ════════ L3 · PRODUCTOS, SERVICIOS E INNOVACIÓN ════════ */

  // ── organizacional ──
  {
    id: "IN-ORG-1", line: 3, dimension: "organizacional", d7: "D1",
    name: "Estrategia y portafolio de innovación",
    desc: "Existencia de una estrategia de innovación aprobada, con focos, presupuesto y un portafolio de iniciativas priorizado y gobernado por la alta dirección.",
    frame: "ISO 56002",
    items: [
      L("La empresa tiene una estrategia de innovación con focos claros, recursos asignados y seguimiento de la alta dirección.", ["direccion", "lideres"]),
      N("Presupuesto destinado a innovación en el último año, como porcentaje de los ingresos, y número de iniciativas activas en el portafolio.", ["direccion"]),
      V("Existe una instancia directiva que prioriza, financia y detiene iniciativas de innovación con criterios definidos.", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Estrategia de innovación y reglamento de la instancia que gobierna el portafolio", "Aprobada, con focos, presupuesto y criterios para priorizar, financiar y detener iniciativas"),
      I("Portafolio de iniciativas de innovación con su estado, recursos y decisiones de las últimas revisiones", "El portafolio se revisa con regularidad y hay decisiones documentadas de continuar o detener"),
      K("Indicadores de innovación: ingresos por productos y servicios nuevos, tiempo de lanzamiento y tasa de éxito", "Metas definidas y revisión periódica en el comité directivo o la junta"),
    ],
    rubric: [
      "La innovación ocurre por iniciativas individuales, sin dirección ni recursos.",
      "Se declara la innovación como prioridad, pero sin focos, presupuesto ni portafolio.",
      "Estrategia aprobada con focos y presupuesto, y portafolio de iniciativas priorizado.",
      "Portafolio gobernado con criterios e indicadores; se detienen las iniciativas que no demuestran valor.",
      "La innovación aporta de manera sostenida y medible a los ingresos; la estrategia se revisa con lo aprendido del portafolio y del mercado.",
    ],
  },
  {
    id: "IN-ORG-2", line: 3, dimension: "organizacional", d7: "D2",
    name: "Equipos multidisciplinarios y métodos ágiles",
    desc: "Conformación de equipos que integran a las áreas de negocio, tecnología y operación, con dedicación asignada y métodos de trabajo iterativos para desarrollar productos y servicios.",
    frame: "ISO 56002",
    items: [
      L("Los nuevos productos y servicios se desarrollan en equipos que integran a varias áreas y trabajan por ciclos cortos con entregas frecuentes.", ["lideres", "equipos", "tecnologia"]),
      V("Las personas asignadas a iniciativas de innovación tienen tiempo de dedicación formalmente reconocido.", ["lideres"]),
      A("Describa cómo se organizó el equipo de la última iniciativa de innovación y cada cuánto mostró avances.", ["equipos", "lideres"]),
    ],
    evidence: [
      D("Lineamiento de conformación de equipos y método de trabajo para las iniciativas de innovación", "Define roles, dedicación, ciclos de trabajo y forma de decidir"),
      I("Equipos conformados en las iniciativas activas y registros de sus ciclos de trabajo y entregas", "La mayoría de las iniciativas trabaja con equipos de varias áreas y entregas periódicas"),
      K("Indicadores de los equipos: frecuencia de entregas, cumplimiento de compromisos y satisfacción de sus integrantes", "Medición regular usada para mejorar la forma de trabajo"),
    ],
    rubric: [
      "Cada área desarrolla su parte por separado y la entrega a la siguiente; nadie tiene tiempo asignado.",
      "Equipos conformados para algunos proyectos, con dedicación marginal y entregas solo al final.",
      "Equipos de varias áreas con dedicación reconocida y método de trabajo por ciclos.",
      "El desempeño de los equipos se mide; el método se aplica de manera consistente en el portafolio.",
      "Equipos estables y autónomos organizados alrededor de productos o servicios; la forma de trabajo se extiende al resto de la organización.",
    ],
  },
  {
    id: "IN-ORG-3", line: 3, dimension: "organizacional", d7: "D2",
    name: "Cultura de experimentación y aprendizaje",
    desc: "Disposición de la organización a proponer ideas, probarlas a pequeña escala y aprender de los resultados, incluidos los fracasos, con respaldo de los líderes.",
    frame: "ISO 56002",
    items: [
      L("En la empresa se puede proponer una idea, probarla a pequeña escala y aprender del resultado, aunque no funcione.", ["direccion", "lideres", "equipos"]),
      N("Número de ideas recibidas de los colaboradores en el último año y cuántas llegaron a probarse.", ["lideres"]),
      A("Cuente qué pasó con la última idea que usted o su equipo propusieron.", ["equipos"]),
    ],
    evidence: [
      D("Mecanismo formal de recepción, evaluación y prueba de ideas, y esquema de reconocimiento", "Aprobado, con criterios de evaluación, plazos de respuesta y reconocimiento a quienes participan"),
      I("Registros de ideas recibidas, evaluadas y probadas, y de las lecciones de los experimentos", "Participan varias áreas y toda idea recibe respuesta"),
      K("Indicadores de participación, de ideas probadas y de experimentos concluidos con aprendizaje documentado", "Medición periódica con metas y difusión de resultados"),
    ],
    rubric: [
      "Las ideas no tienen a dónde llegar y el error se castiga.",
      "Convocatorias o buzones ocasionales; las ideas rara vez reciben respuesta.",
      "Mecanismo permanente de ideas, con evaluación, respuesta y pruebas a pequeña escala.",
      "Participación y experimentos medidos; los líderes respaldan las pruebas y se reconocen los aprendizajes.",
      "Experimentar es parte del trabajo diario en todas las áreas; los fracasos se analizan abiertamente y alimentan nuevas iniciativas.",
    ],
  },

  // ── negocio y procesos ──
  {
    id: "IN-NEG-1", line: 3, dimension: "misional", d7: "D3",
    name: "Proceso de desarrollo de productos y servicios",
    desc: "Existencia de un proceso definido para llevar una idea hasta el lanzamiento, con etapas, criterios de decisión, validación con clientes y control de cambios.",
    frame: "ISO 9001",
    items: [
      L("La empresa sigue un proceso claro para convertir una idea en un producto o servicio lanzado al mercado.", ["lideres", "equipos"]),
      N("Tiempo promedio entre la aprobación de una idea y su lanzamiento, y número de lanzamientos del último año.", ["lideres"]),
      V("Los nuevos productos y servicios se validan con clientes antes del lanzamiento.", ["lideres", "clientes"]),
    ],
    evidence: [
      D("Procedimiento de diseño y desarrollo de productos y servicios, con etapas, entregables y criterios de aprobación", "Aprobado, con validación con clientes y revisión de requisitos legales y técnicos"),
      I("Expedientes de los desarrollos recientes con sus revisiones, validaciones y decisiones por etapa", "Los desarrollos del último año siguieron el proceso y conservan sus registros"),
      K("Indicadores del proceso: tiempo de lanzamiento, cumplimiento de plazos y costos, y desempeño de los lanzamientos", "Metas definidas y revisión posterior a cada lanzamiento"),
    ],
    rubric: [
      "Los productos y servicios nuevos se lanzan sin proceso; cada caso se resuelve sobre la marcha.",
      "Pasos conocidos por costumbre, sin criterios de decisión ni validación con clientes.",
      "Proceso documentado con etapas, criterios de aprobación y validación con clientes.",
      "Proceso medido: los tiempos, los costos y los resultados de cada lanzamiento se comparan con lo previsto.",
      "Proceso ágil que acorta los ciclos de lanzamiento de forma sostenida y aprende de cada lanzamiento.",
    ],
  },
  {
    id: "IN-NEG-2", line: 3, dimension: "misional", d7: "D7",
    name: "Innovación abierta y ecosistema",
    desc: "Colaboración estructurada con clientes, proveedores, emprendimientos, centros de investigación y otros aliados para desarrollar productos, servicios o capacidades.",
    frame: "ISO 56002",
    items: [
      L("La empresa desarrolla innovaciones junto con clientes, proveedores, emprendimientos u otros aliados.", ["direccion", "lideres", "clientes"]),
      N("Número de alianzas o proyectos de innovación con terceros activos en el último año y resultados obtenidos.", ["lideres"]),
      A("Mencione una innovación reciente que no habría sido posible sin un aliado externo.", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Lineamiento de innovación abierta: tipos de alianza, criterios de selección, manejo de la confidencialidad y de la propiedad intelectual", "Aprobado y aplicado en los acuerdos vigentes"),
      I("Acuerdos y proyectos conjuntos en ejecución con aliados externos", "Varias alianzas activas con objetivos, recursos y responsables definidos"),
      K("Indicadores de las alianzas: proyectos concluidos, productos o capacidades resultantes e inversión conjunta", "Evaluación periódica de cada alianza frente a sus objetivos"),
    ],
    rubric: [
      "La empresa innova solo con recursos propios; no mira hacia afuera.",
      "Contactos ocasionales con aliados, sin acuerdos ni objetivos.",
      "Alianzas formalizadas, con objetivos y reglas de confidencialidad y propiedad intelectual.",
      "Portafolio de alianzas evaluado por resultados; los clientes y los proveedores participan en el diseño.",
      "La empresa articula un ecosistema de aliados que genera nuevos negocios de manera recurrente.",
    ],
  },
  {
    id: "IN-NEG-3", line: 3, dimension: "misional", d7: "D7", ai: true,
    name: "Casos de uso de inteligencia artificial con valor de negocio",
    desc: "Identificación, priorización, prueba y escalamiento de casos de uso de inteligencia artificial, con caso de negocio, evaluación de riesgos y medición de beneficios.",
    frame: "NIST AI RMF",
    items: [
      L("La empresa identifica y prioriza los usos de la inteligencia artificial según el valor que aportan al negocio y los riesgos que implican.", ["direccion", "lideres", "tecnologia"]),
      N("Número de casos de uso de inteligencia artificial identificados, en prueba y en producción.", ["tecnologia", "lideres"]),
      V("Cada caso de uso en prueba o en producción tiene caso de negocio, responsable y evaluación de riesgos.", ["lideres", "tecnologia"]),
    ],
    evidence: [
      D("Portafolio de casos de uso de inteligencia artificial con criterios de priorización por valor, viabilidad y riesgo", "Aprobado por la alta dirección, con responsable y caso de negocio por cada caso de uso"),
      I("Pilotos concluidos y casos de uso llevados a producción", "Al menos un caso pasó de piloto a producción con evaluación documentada"),
      K("Medición de beneficios de los casos de uso frente a su caso de negocio", "Beneficios medidos y usados para decidir si se escala, se ajusta o se detiene"),
    ],
    rubric: [
      "No se han identificado usos de la inteligencia artificial para el negocio.",
      "Pruebas dispersas por curiosidad de personas o áreas, sin caso de negocio.",
      "Portafolio de casos de uso priorizado y pilotos en ejecución con responsable.",
      "Casos en producción con beneficios medidos; los pilotos sin valor se detienen.",
      "La inteligencia artificial es una fuente demostrada de ventaja; el portafolio se renueva con lo aprendido y con evaluación sistemática de riesgos.",
    ],
  },

  // ── tecnológica ──
  {
    id: "IN-TEC-1", line: 3, dimension: "tecnologica", d7: "D7",
    name: "Componente digital de la oferta",
    desc: "Grado en que los productos y servicios incorporan componentes digitales (servicios en línea, información para el cliente, conectividad, autoservicio) que agregan valor o generan ingresos.",
    frame: "ISO 56002",
    items: [
      L("Los productos y servicios de la empresa incorporan componentes digitales que el cliente valora.", ["direccion", "lideres", "clientes"]),
      N("Porcentaje de los ingresos que proviene de productos o servicios digitales o con un componente digital relevante.", ["direccion", "lideres"]),
      A("¿Qué componente digital de la oferta valoran más los clientes y cuál echan de menos?", ["lideres", "clientes"]),
    ],
    evidence: [
      D("Hoja de ruta de la oferta que identifica los componentes digitales actuales y los previstos", "Aprobada, con prioridades, responsables y estimación de valor"),
      I("Productos o servicios con componentes digitales en el mercado", "Varias líneas de la oferta incorporan componentes digitales en uso por los clientes"),
      K("Indicadores de adopción y de ingresos de los componentes digitales de la oferta", "Medición periódica con metas y decisiones de inversión basadas en ella"),
    ],
    rubric: [
      "La oferta es la misma de siempre; lo digital se limita a la promoción.",
      "Algún complemento digital aislado, sin plan ni medición.",
      "Hoja de ruta de la oferta con componentes digitales en el mercado.",
      "Adopción e ingresos de los componentes digitales medidos; orientan las decisiones de inversión.",
      "Lo digital redefine la propuesta de valor y abre nuevos modelos de ingreso.",
    ],
  },
  {
    id: "IN-TEC-2", line: 3, dimension: "tecnologica", d7: "D5",
    name: "Entorno de prototipado y entrega continua",
    desc: "Disponibilidad de herramientas y prácticas para prototipar, probar y publicar cambios en productos y servicios digitales con rapidez y control (entornos de prueba, pruebas automatizadas y despliegue controlado).",
    frame: "ITIL 4",
    items: [
      L("Los equipos pueden prototipar, probar y publicar cambios en los productos y servicios digitales con rapidez y sin poner en riesgo la operación.", ["tecnologia", "equipos", "lideres"]),
      N("Frecuencia con que se publican cambios en los productos y servicios digitales y porcentaje de cambios que generó fallas.", ["tecnologia"]),
      V("Existen entornos de prueba separados del de producción y todo cambio se prueba antes de publicarse.", ["tecnologia"]),
    ],
    evidence: [
      D("Procedimiento de gestión de cambios y de publicación de versiones, y descripción de los entornos de prueba", "Define pruebas obligatorias, aprobaciones y reversa de los cambios"),
      I("Registros de cambios publicados, de pruebas ejecutadas y de reversas en los últimos doce meses", "Los cambios siguen el procedimiento y las pruebas están automatizadas en buena parte"),
      K("Indicadores de entrega: frecuencia de publicación, tiempo desde la solicitud hasta la puesta en producción y cambios fallidos", "Metas definidas y seguimiento periódico"),
    ],
    rubric: [
      "Los cambios se hacen directamente en producción y las fallas las descubre el cliente.",
      "Pruebas manuales e informales; publicar un cambio toma semanas y genera incidentes.",
      "Entornos de prueba separados y procedimiento de cambios aplicado.",
      "Pruebas y despliegues automatizados en buena parte; la frecuencia y las fallas se miden.",
      "Publicación frecuente y segura de cambios pequeños; se experimenta con grupos reducidos de clientes antes de generalizar.",
    ],
  },
  {
    id: "IN-TEC-3", line: 3, dimension: "tecnologica", d7: "D7", ai: true,
    name: "Inteligencia artificial incorporada en productos y servicios",
    desc: "Incorporación de funciones de inteligencia artificial en los productos y servicios que recibe el cliente, con pruebas, seguimiento de su desempeño y transparencia sobre su uso.",
    frame: "NIST AI RMF",
    items: [
      L("Los productos y servicios de la empresa incorporan funciones de inteligencia artificial probadas y supervisadas.", ["lideres", "tecnologia", "clientes"]),
      V("Las funciones de inteligencia artificial de la oferta se prueban antes del lanzamiento y se informa al cliente sobre su uso.", ["tecnologia", "lideres"]),
      N("Número de productos o servicios con funciones de inteligencia artificial y proporción de clientes que las usa.", ["lideres", "tecnologia"]),
    ],
    evidence: [
      D("Fichas de las funciones de inteligencia artificial de la oferta: propósito, datos, pruebas realizadas, limitaciones y responsable", "Cada función tiene ficha, pruebas documentadas y criterios de transparencia hacia el cliente"),
      I("Productos o servicios en el mercado con funciones de inteligencia artificial y registros de su seguimiento", "En uso por clientes, con seguimiento del desempeño y canal para reportar errores"),
      K("Indicadores de uso, desempeño, errores y valor percibido de las funciones de inteligencia artificial", "Medición continua con umbrales que activan la revisión o el retiro"),
    ],
    rubric: [
      "La oferta no incorpora inteligencia artificial ni se ha evaluado hacerlo.",
      "Prototipos o demostraciones sin pruebas formales ni plan de lanzamiento.",
      "Al menos un producto o servicio con una función de inteligencia artificial probada y documentada.",
      "Funciones en uso, con desempeño y errores medidos; el cliente sabe cuándo interviene la inteligencia artificial.",
      "La inteligencia artificial diferencia la oferta; sus funciones se vigilan, se auditan y se mejoran de forma continua.",
    ],
  },

  // ── datos e información ──
  {
    id: "IN-DAT-1", line: 3, dimension: "datos", d7: "D4",
    name: "Inteligencia de mercado y de clientes para innovar",
    desc: "Recolección y análisis sistemático de información sobre clientes, competidores, tecnología y regulación para identificar oportunidades de innovación.",
    frame: "ISO 56002",
    items: [
      L("La empresa analiza de manera sistemática su mercado, sus clientes y las tendencias para identificar oportunidades.", ["direccion", "lideres"]),
      V("Existe un responsable y una rutina periódica de vigilancia del mercado, la competencia, la tecnología y la regulación.", ["lideres"]),
      A("Mencione una oportunidad o una amenaza que la empresa haya identificado a tiempo gracias a su análisis del entorno.", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Procedimiento de vigilancia e inteligencia del entorno: fuentes, frecuencia, responsables y destinatarios", "Aprobado, con fuentes definidas y entrega periódica a quienes deciden"),
      I("Informes de vigilancia e inteligencia del último año y evidencia de su discusión en instancias directivas", "Se producen con regularidad y se discuten en el comité directivo o en la instancia de innovación"),
      K("Indicadores de uso: oportunidades identificadas que pasaron al portafolio de innovación", "Seguimiento periódico de las oportunidades y de su resultado"),
    ],
    rubric: [
      "La empresa se entera de los cambios del mercado cuando ya la afectan.",
      "Búsquedas ocasionales por iniciativa de algunas personas; la información no circula.",
      "Vigilancia periódica con responsable, fuentes definidas e informes a la dirección.",
      "La inteligencia del entorno alimenta el portafolio de innovación y su uso se mide.",
      "Anticipación sistemática: los datos propios y externos se combinan para detectar oportunidades antes que los competidores.",
    ],
  },
  {
    id: "IN-DAT-2", line: 3, dimension: "datos", d7: "D4",
    name: "Gestión del conocimiento y propiedad intelectual",
    desc: "Captura, protección y reutilización del conocimiento generado en proyectos e iniciativas (lecciones aprendidas, documentación técnica y activos de propiedad intelectual).",
    frame: "ISO 56002",
    items: [
      L("El conocimiento que generan los proyectos queda documentado, se protege y se reutiliza en proyectos posteriores.", ["lideres", "equipos"]),
      V("Existe un repositorio único, organizado y consultado, con la documentación y las lecciones aprendidas de los proyectos.", ["equipos", "tecnologia"]),
      N("Número de activos de propiedad intelectual registrados o protegidos (marcas, diseños, patentes, secretos empresariales, programas informáticos).", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Lineamiento de gestión del conocimiento y de la propiedad intelectual: qué se documenta, dónde, quién lo hace y cómo se protege", "Aprobado, con responsables y con cláusulas de confidencialidad y titularidad en los contratos"),
      I("Repositorio de conocimiento con contenidos recientes y registros de lecciones aprendidas al cierre de los proyectos", "Los proyectos del último año documentaron sus lecciones y el repositorio se consulta"),
      K("Indicadores de aporte y consulta del repositorio y de activos de propiedad intelectual protegidos", "Medición periódica con metas y revisión del inventario de activos"),
    ],
    rubric: [
      "El conocimiento se va con las personas; no hay registro de lo aprendido ni protección de las creaciones.",
      "Documentos dispersos en carpetas personales; la propiedad intelectual se atiende solo ante un conflicto.",
      "Repositorio organizado, lecciones aprendidas al cierre de los proyectos e inventario de activos de propiedad intelectual.",
      "Aporte y reutilización del conocimiento medidos; los activos se protegen según una estrategia.",
      "El conocimiento se reutiliza de manera habitual y acelera los nuevos proyectos; la propiedad intelectual genera valor para el negocio.",
    ],
  },
  {
    id: "IN-DAT-3", line: 3, dimension: "datos", d7: "D4",
    name: "Datos de uso y desempeño de la oferta",
    desc: "Captura y análisis de los datos sobre cómo los clientes usan los productos y servicios y cómo se desempeñan (uso, devoluciones, fallas, reclamos, rentabilidad) para decidir mejoras.",
    frame: "DAMA-DMBOK",
    items: [
      L("La empresa analiza cómo usan los clientes sus productos y servicios y con esos datos decide qué mejorar, mantener o retirar.", ["lideres", "equipos", "tecnologia"]),
      V("Existen datos estructurados de uso, devoluciones, fallas o reclamos por producto o servicio, disponibles para los equipos de desarrollo.", ["tecnologia", "lideres"]),
      A("Mencione un cambio reciente en un producto o servicio que se haya decidido a partir de datos de uso o desempeño.", ["lideres"]),
    ],
    evidence: [
      D("Definición de los datos de uso y desempeño que se capturan por producto o servicio, con su fuente y responsable", "Cubre las principales líneas de la oferta y respeta la normativa de protección de datos"),
      I("Informes o tableros de uso y desempeño por producto o servicio, consultados por los equipos de desarrollo", "Disponibles de forma regular y usados en las revisiones de la oferta"),
      K("Indicadores por producto o servicio: uso, satisfacción, fallas, devoluciones y rentabilidad", "Con metas y con decisiones documentadas de mejora o retiro"),
    ],
    rubric: [
      "Solo se conocen las ventas; no se sabe cómo se usa ni cómo se desempeña la oferta.",
      "Datos parciales de reclamos o devoluciones, revisados solo cuando hay un problema.",
      "Datos de uso y desempeño capturados de forma estructurada para las principales líneas.",
      "Indicadores por producto o servicio con metas; las mejoras y los retiros se deciden con esos datos.",
      "Los datos de uso alimentan de manera continua el diseño; se prueban variantes y se mide su efecto antes de generalizar.",
    ],
  },

  /* ════════ L4 · ARQUITECTURA EMPRESARIAL Y GOBIERNO DIGITAL ════════ */

  // ── organizacional ──
  {
    id: "AR-ORG-1", line: 4, dimension: "organizacional", d7: "D1",
    name: "Gobierno de tecnología y transformación digital",
    desc: "Existencia de una instancia directiva con mandato sobre la estrategia digital, las inversiones, la arquitectura y los riesgos de tecnología, cuyas decisiones quedan documentadas.",
    frame: "COBIT 2019",
    items: [
      L("La alta dirección gobierna la tecnología y la transformación digital: fija prioridades, aprueba inversiones y hace seguimiento.", ["direccion", "lideres", "tecnologia"]),
      N("Sesiones de la instancia de gobierno de tecnología en los últimos doce meses y decisiones documentadas en actas.", ["tecnologia", "direccion"]),
      V("Toda adquisición o desarrollo de tecnología relevante pasa por una revisión previa de arquitectura y seguridad.", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Reglamento de la instancia de gobierno de tecnología y documento de estrategia digital alineado con el plan estratégico", "Aprobados, con composición, atribuciones, calendario y revisión previa de las adquisiciones"),
      I("Actas de sesiones regulares con decisiones sobre prioridades, inversiones, arquitectura y riesgos", "Sesiona según el calendario, con participación de la alta dirección y decisiones trazables"),
      K("Indicadores de gobierno: inversiones revisadas, decisiones ejecutadas y avance de la estrategia digital", "Informe periódico al comité directivo o a la junta"),
    ],
    rubric: [
      "No hay instancia de gobierno; cada área compra y contrata tecnología por su cuenta.",
      "Comité que sesiona de manera irregular, sin actas ni atribuciones claras.",
      "Instancia reglamentada, con calendario, decisiones documentadas y estrategia digital aprobada.",
      "Toda inversión relevante pasa por revisión; el cumplimiento de las decisiones y de la estrategia se mide.",
      "La tecnología se gobierna desde la junta y el comité directivo como parte de la estrategia; las inversiones se deciden por valor y riesgo.",
    ],
  },
  {
    id: "AR-ORG-2", line: 4, dimension: "organizacional", d7: "D2",
    name: "Talento y estructura de tecnología y datos",
    desc: "Suficiencia de los perfiles, los roles y la estructura del equipo de tecnología y datos (propio y contratado) frente a las necesidades de la estrategia digital.",
    frame: "CMI",
    items: [
      L("La empresa cuenta con el equipo de tecnología y datos, propio o contratado, que su estrategia digital necesita.", ["direccion", "lideres", "tecnologia"]),
      N("Número de personas en roles de tecnología y datos, rotación del último año y vacantes críticas sin cubrir.", ["tecnologia", "direccion"]),
      A("¿Qué capacidad de tecnología o de datos le hace falta hoy a la empresa y cómo la está supliendo?", ["direccion", "tecnologia"]),
    ],
    evidence: [
      D("Estructura del área de tecnología y datos, perfiles de los cargos y plan de desarrollo y sucesión de los roles críticos", "Aprobada, con roles de arquitectura, seguridad, datos y gestión de proveedores definidos"),
      I("Planta cubierta frente a la estructura aprobada y planes de desarrollo en ejecución", "Roles críticos cubiertos, con respaldo y con formación en curso"),
      K("Indicadores de talento: rotación, vacantes críticas, dependencia de personas clave y brechas de competencias", "Seguimiento periódico con metas y acciones de retención"),
    ],
    rubric: [
      "Una o dos personas sostienen toda la tecnología; si faltan, la operación se detiene.",
      "Equipo dedicado al soporte diario, sin roles de arquitectura, seguridad ni datos.",
      "Estructura y perfiles definidos, con los roles críticos cubiertos por personal propio o contratado.",
      "Brechas de competencias, rotación y dependencia de personas clave medidas y gestionadas.",
      "Equipo reconocido como socio del negocio, que atrae y retiene talento y anticipa las capacidades futuras.",
    ],
  },
  {
    id: "AR-ORG-3", line: 4, dimension: "organizacional", d7: "D1", ai: true,
    name: "Gobierno y gestión de riesgos de la inteligencia artificial",
    desc: "Existencia de una política de uso de la inteligencia artificial, de un inventario de sistemas con responsable y de un proceso para evaluar y tratar sus riesgos.",
    frame: "NIST AI RMF",
    items: [
      L("La empresa tiene reglas claras sobre el uso de la inteligencia artificial y conoce y gestiona sus riesgos.", ["direccion", "lideres", "tecnologia"]),
      V("Existe un inventario actualizado de los sistemas y herramientas de inteligencia artificial en uso, cada uno con un responsable.", ["tecnologia", "direccion"]),
      A("¿Quién decide en la empresa si un nuevo uso de la inteligencia artificial es aceptable y con qué criterios?", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Política de uso de la inteligencia artificial, con roles, usos permitidos y prohibidos, y criterios de evaluación de riesgos", "Aprobada por la alta dirección y difundida a todos los colaboradores"),
      I("Inventario de sistemas de inteligencia artificial y evaluaciones de riesgo realizadas", "Inventario completo y evaluación documentada de los sistemas de mayor impacto"),
      K("Indicadores de gobierno: sistemas inventariados y evaluados, incidentes y cumplimiento de la política", "Informe periódico a la alta dirección con acciones de tratamiento"),
    ],
    rubric: [
      "La inteligencia artificial se usa sin reglas; nadie sabe qué herramientas hay ni quién responde por ellas.",
      "Recomendaciones informales de uso; se conocen algunas herramientas, sin inventario ni evaluación.",
      "Política aprobada, inventario con responsables y evaluación de riesgos de los usos principales.",
      "Riesgos tratados y vigilados con indicadores; los usos de alto impacto requieren aprobación y revisión humana.",
      "Gobierno de la inteligencia artificial integrado a la gestión de riesgos de la empresa, con auditorías periódicas y ajuste según la regulación y las buenas prácticas.",
    ],
  },

  // ── negocio y procesos ──
  {
    id: "AR-NEG-1", line: 4, dimension: "misional", d7: "D5",
    name: "Arquitectura empresarial documentada",
    desc: "Existencia de una arquitectura empresarial (negocio, datos, aplicaciones y tecnología) documentada en su estado actual y objetivo, que orienta las decisiones de inversión.",
    frame: "TOGAF 10",
    items: [
      L("La empresa cuenta con una arquitectura documentada que orienta sus decisiones sobre procesos, sistemas y datos.", ["direccion", "tecnologia", "lideres"]),
      V("Existen las vistas de negocio, datos, aplicaciones y tecnología del estado actual y del estado objetivo.", ["tecnologia"]),
      A("Ante un sistema nuevo, ¿contra qué mapa se decide dónde encaja y qué reemplaza?", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Documentos de arquitectura empresarial: principios, vistas actuales y objetivo, y hoja de ruta de transición", "Elaborados con un método formal y aprobados por la instancia de gobierno de tecnología"),
      I("Decisiones de adquisición, proyectos e integraciones que se sustentaron en la arquitectura", "La arquitectura objetivo orienta el portafolio de proyectos y las compras"),
      K("Indicadores de avance de la hoja de ruta de arquitectura y de excepciones aprobadas", "Seguimiento periódico del plan de transición"),
    ],
    rubric: [
      "No hay arquitectura documentada; cada sistema se adquirió sin visión de conjunto.",
      "Diagramas parciales, elaborados para proyectos puntuales y sin actualizar.",
      "Arquitectura actual y objetivo documentadas en las cuatro capas, con principios aprobados.",
      "Hoja de ruta de transición en ejecución y medida; las decisiones de inversión citan la arquitectura.",
      "Arquitectura que se actualiza por ciclos y permite evaluar el impacto de un cambio antes de decidirlo.",
    ],
  },
  {
    id: "AR-NEG-2", line: 4, dimension: "misional", d7: "D1",
    name: "Portafolio de proyectos digitales y realización de beneficios",
    desc: "Priorización, seguimiento y cierre de los proyectos digitales con criterios de valor, y verificación de los beneficios obtenidos después del cierre.",
    frame: "COBIT 2019",
    items: [
      L("Los proyectos digitales se priorizan, se siguen y se cierran con criterios de valor para el negocio.", ["direccion", "lideres", "tecnologia"]),
      N("Proyectos digitales del último año: presupuesto, porcentaje dentro del cronograma y cuántos verificaron sus beneficios después del cierre.", ["tecnologia", "lideres"]),
      A("Del último proyecto digital cerrado, ¿qué beneficio prometido se verificó después?", ["direccion", "lideres"]),
    ],
    evidence: [
      D("Metodología de gestión del portafolio de proyectos digitales: priorización, seguimiento y cierre", "Incluye caso de negocio, responsable del beneficio y revisión posterior al cierre"),
      I("Portafolio vigente con estado, presupuesto y seguimiento periódico", "Todos los proyectos relevantes están en el portafolio, con su estado al día"),
      K("Indicadores del portafolio: cumplimiento de plazos y presupuesto, y beneficios realizados", "Revisión de beneficios en un plazo definido después del cierre de cada proyecto"),
    ],
    rubric: [
      "Los proyectos surgen por demanda, sin priorización ni seguimiento.",
      "Lista anual de proyectos con presupuesto y seguimiento informal.",
      "Portafolio priorizado con criterios de valor y seguimiento regular.",
      "Desempeño del portafolio medido, incluida la verificación de beneficios después del cierre.",
      "El portafolio se orienta por la estrategia y la arquitectura; los beneficios realizados retroalimentan la priorización.",
    ],
  },
  {
    id: "AR-NEG-3", line: 4, dimension: "misional", d7: "D1",
    name: "Continuidad del negocio y riesgo tecnológico",
    desc: "Identificación de los riesgos tecnológicos y existencia de planes probados para mantener o recuperar los procesos críticos ante una falla, un desastre o un ataque.",
    frame: "COBIT 2019",
    items: [
      L("La empresa sabe cómo seguiría operando y en cuánto tiempo se recuperaría si fallaran sus sistemas críticos.", ["direccion", "lideres", "tecnologia"]),
      V("El plan de continuidad y de recuperación de los sistemas críticos se probó en los últimos doce meses.", ["tecnologia"]),
      N("Tiempo máximo de interrupción aceptado para los procesos críticos y tiempo real de recuperación en la última prueba o incidente.", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Análisis de impacto en el negocio, matriz de riesgos tecnológicos y planes de continuidad y recuperación", "Aprobados por la alta dirección, con tiempos de recuperación definidos por proceso crítico"),
      I("Informes de pruebas de continuidad y de restauración de respaldos, y registro de incidentes mayores", "Pruebas periódicas con resultados documentados y correcciones aplicadas"),
      K("Indicadores de continuidad: tiempos de recuperación obtenidos frente a los objetivos, respaldos verificados y riesgos tratados", "Seguimiento periódico con informe al comité directivo"),
    ],
    rubric: [
      "No hay planes; una falla grave detendría la operación por tiempo indefinido.",
      "Se hacen respaldos, pero nunca se ha probado restaurarlos ni existe un plan escrito.",
      "Riesgos identificados y planes de continuidad y recuperación aprobados para los procesos críticos.",
      "Planes probados periódicamente; los tiempos de recuperación se miden frente a los objetivos.",
      "Continuidad incorporada al diseño de cada proceso y sistema; las pruebas incluyen a proveedores y escenarios de ataque.",
    ],
  },

  // ── tecnológica ──
  {
    id: "AR-TEC-1", line: 4, dimension: "tecnologica", d7: "D5",
    name: "Portafolio de aplicaciones e infraestructura",
    desc: "Existencia de un catálogo actualizado de aplicaciones e infraestructura (propia y en la nube), con su estado, soporte, costo, criticidad y riesgo de obsolescencia.",
    frame: "TOGAF 10",
    items: [
      L("La empresa conoce sus aplicaciones y su infraestructura: estado, soporte, costo y riesgo de obsolescencia.", ["tecnologia", "lideres"]),
      N("Número de aplicaciones en el catálogo, cuántas no tienen soporte del fabricante y cuáles tienen plan de reemplazo.", ["tecnologia"]),
      V("El catálogo de aplicaciones e infraestructura se actualizó en los últimos seis meses.", ["tecnologia"]),
    ],
    evidence: [
      D("Catálogo de aplicaciones e infraestructura con estado, versión, soporte, criticidad, costo y responsable", "Completo y actualizado al menos cada seis meses"),
      I("Planes de renovación, de migración o de retiro de los componentes en riesgo", "Todo componente crítico en riesgo de obsolescencia tiene una decisión documentada y presupuesto"),
      K("Indicadores de exposición: aplicaciones críticas con soporte vigente, disponibilidad y costo total", "Informe periódico a la instancia de gobierno de tecnología"),
    ],
    rubric: [
      "Nadie sabe con certeza cuántas aplicaciones y equipos hay ni en qué estado están.",
      "Inventario parcial o desactualizado; la obsolescencia se descubre cuando algo falla.",
      "Catálogo completo y actualizado, con criticidad y riesgo por componente.",
      "Obsolescencia y capacidad gestionadas con planes presupuestados y vigilados.",
      "Portafolio optimizado por valor y costo total; se racionaliza de forma continua y la infraestructura se ajusta a la demanda.",
    ],
  },
  {
    id: "AR-TEC-2", line: 4, dimension: "tecnologica", d7: "D5",
    name: "Integración e interoperabilidad entre sistemas",
    desc: "Intercambio de datos entre los sistemas críticos mediante servicios e interfaces estándar (API), sin archivos manuales ni redigitación.",
    frame: "TOGAF 10",
    items: [
      L("Los sistemas críticos de la empresa intercambian datos de forma automática, sin archivos manuales ni redigitación.", ["tecnologia", "equipos", "lideres"]),
      N("Número de sistemas críticos integrados mediante servicios frente al total y flujos de información que siguen siendo manuales.", ["tecnologia"]),
      A("¿Qué información traslada hoy su equipo a mano de un sistema a otro?", ["equipos"]),
    ],
    evidence: [
      D("Mapa de integraciones y lineamientos de integración (estándares, seguridad y documentación de interfaces)", "Aprobados, con todas las integraciones críticas identificadas y documentadas"),
      I("Integraciones en producción con vigilancia de su funcionamiento", "La mayoría de los sistemas críticos intercambia datos mediante servicios vigilados"),
      K("Indicadores de integración: cobertura, fallas de intercambio y flujos manuales pendientes", "Seguimiento periódico con metas de reducción de flujos manuales"),
    ],
    rubric: [
      "Los sistemas no se comunican; la información se traslada a mano.",
      "Intercambios mediante archivos que alguien genera y carga; pocas integraciones automáticas.",
      "Integraciones automáticas y documentadas entre los sistemas críticos principales.",
      "Plataforma o lineamientos comunes de integración; la cobertura y las fallas se miden.",
      "Sistemas interoperables por diseño; conectar un sistema nuevo o a un aliado es rápido y seguro.",
    ],
  },
  {
    id: "AR-TEC-3", line: 4, dimension: "tecnologica", d7: "D5", ai: true,
    name: "Seguridad de la información y ciberseguridad",
    desc: "Aplicación de controles de seguridad sobre la información y los sistemas: gestión de accesos, protección frente a ataques, respaldo, respuesta a incidentes y formación de los colaboradores.",
    frame: "ISO 27001",
    items: [
      L("La información y los sistemas de la empresa están protegidos y los colaboradores saben cómo actuar ante un riesgo de seguridad.", ["direccion", "lideres", "equipos", "tecnologia"]),
      V("Existe un análisis de riesgos de seguridad vigente y un procedimiento probado de respuesta a incidentes.", ["tecnologia"]),
      N("Incidentes de seguridad de los últimos doce meses, tiempo promedio de contención y porcentaje de colaboradores formados en seguridad.", ["tecnologia"]),
    ],
    evidence: [
      D("Política de seguridad de la información, análisis de riesgos y declaración de los controles aplicados", "Aprobados por la alta dirección, vigentes y con alcance sobre los sistemas críticos"),
      I("Evidencia de los controles en operación: accesos revisados, respaldos, actualizaciones, vigilancia y simulacros", "Controles aplicados en los sistemas críticos y verificados por una revisión independiente"),
      K("Indicadores de seguridad: incidentes, vulnerabilidades corregidas en plazo y resultados de las pruebas a los colaboradores", "Metas definidas e informe periódico al comité directivo o a la junta"),
    ],
    rubric: [
      "Sin controles formales; las contraseñas se comparten y no se sabe si ha habido incidentes.",
      "Controles básicos (antivirus, respaldos), sin política, análisis de riesgos ni responsable.",
      "Política aprobada, responsable designado, análisis de riesgos vigente y controles principales en operación.",
      "Sistema de gestión de seguridad en funcionamiento, con indicadores, auditorías y respuesta a incidentes probada.",
      "Seguridad incorporada al diseño de todo proyecto; vigilancia permanente y mejora continua verificada por terceros.",
    ],
  },

  // ── datos e información ──
  {
    id: "AR-DAT-1", line: 4, dimension: "datos", d7: "D4", ai: true,
    name: "Gobierno de datos",
    desc: "Existencia de una instancia de gobierno de datos, de un catálogo de datos maestros, de responsables designados por dominio y de reglas de calidad y de acceso.",
    frame: "DAMA-DMBOK",
    items: [
      L("Los datos clave de la empresa tienen responsables, definiciones comunes y reglas de calidad y de acceso.", ["direccion", "lideres", "tecnologia"]),
      N("Número de dominios de datos identificados y porcentaje que tiene un responsable designado.", ["tecnologia"]),
      V("Existe una instancia de gobierno de datos que sesiona con regularidad y un catálogo o glosario de datos disponible para las áreas.", ["tecnologia", "lideres"]),
    ],
    evidence: [
      D("Política de gobierno de datos, catálogo o glosario de datos y designación de los responsables por dominio", "Aprobados, con roles, definiciones comunes y reglas de calidad y de acceso"),
      I("Actas de la instancia de gobierno de datos y evidencia de aplicación de las reglas en los sistemas", "Los responsables ejercen su rol y las definiciones comunes se usan en informes y sistemas"),
      K("Indicadores de gobierno: dominios con responsable, reglas de calidad aplicadas e incidentes de datos resueltos", "Seguimiento periódico con metas"),
    ],
    rubric: [
      "Los datos no tienen dueño; cada área define y calcula las cifras a su manera.",
      "Se reconoce el problema; hay definiciones acordadas para algunos datos, sin roles formales.",
      "Política aprobada, responsables designados y catálogo de los datos maestros.",
      "Reglas de calidad y de acceso aplicadas y medidas; la instancia de gobierno resuelve los conflictos sobre los datos.",
      "Los datos se gestionan como un activo de la empresa; el gobierno cubre todos los dominios y se revisa por ciclos.",
    ],
  },
  {
    id: "AR-DAT-2", line: 4, dimension: "datos", d7: "D4",
    name: "Analítica para las decisiones de la dirección",
    desc: "Disponibilidad de tableros con datos integrados de las áreas (ventas, operación, finanzas, talento y clientes) que el comité directivo y la junta usan para decidir.",
    frame: "CMI",
    items: [
      L("El comité directivo y la junta deciden con tableros que integran datos confiables de todas las áreas.", ["direccion", "lideres"]),
      V("Los informes para la dirección se generan desde una fuente integrada, sin consolidación manual de cifras.", ["tecnologia", "direccion"]),
      A("¿Cuánto tiempo toma preparar el informe mensual para la dirección y cuántas cifras se discuten porque no coinciden?", ["lideres", "tecnologia"]),
    ],
    evidence: [
      D("Definición del tablero directivo: indicadores estratégicos, fichas técnicas, fuentes y responsables", "Aprobado por el comité directivo y alineado con los objetivos estratégicos"),
      I("Tableros en uso en las sesiones del comité directivo y de la junta", "Se consultan en cada sesión y reemplazan las presentaciones armadas a mano"),
      K("Evidencia de decisiones tomadas a partir de los tableros y de la oportunidad de la información", "Decisiones documentadas en actas e información disponible pocos días después del cierre"),
    ],
    rubric: [
      "Cada informe para la dirección se arma a mano combinando fuentes; las cifras no coinciden.",
      "Informes periódicos por área, sin visión integrada y con retraso.",
      "Tablero directivo definido, con indicadores estratégicos y fuentes identificadas.",
      "Tablero alimentado de forma automática desde datos integrados; las decisiones lo citan.",
      "La dirección explora los datos por sí misma, simula escenarios y revisa los indicadores cuando cambia la estrategia.",
    ],
  },
  {
    id: "AR-DAT-3", line: 4, dimension: "datos", d7: "D4", ai: true,
    name: "Plataforma y calidad de datos para analítica e inteligencia artificial",
    desc: "Disponibilidad de un repositorio integrado de datos, con calidad medida, acceso controlado y documentación suficiente para alimentar la analítica y los modelos de inteligencia artificial.",
    frame: "DAMA-DMBOK",
    items: [
      L("La empresa dispone de datos integrados, confiables y accesibles para hacer analítica y usar inteligencia artificial.", ["tecnologia", "lideres"]),
      N("Porcentaje de las fuentes de datos críticas integradas en el repositorio central y resultado de la última medición de calidad.", ["tecnologia"]),
      V("La calidad de los datos críticos se mide con reglas definidas y los errores se corrigen en la fuente.", ["tecnologia"]),
    ],
    evidence: [
      D("Arquitectura de la plataforma de datos y reglas de calidad de los datos críticos", "Aprobadas, con fuentes, responsables, controles de acceso y criterios de calidad por dato"),
      I("Repositorio integrado en operación, con procesos automáticos de carga y controles de calidad", "Integra las fuentes críticas y es la base de los tableros y los modelos"),
      K("Indicadores de calidad de los datos (completitud, exactitud, oportunidad) y de uso de la plataforma", "Medición periódica con metas y corrección de las causas de los errores"),
    ],
    rubric: [
      "Los datos están dispersos en sistemas y archivos; su calidad se desconoce.",
      "Extracciones manuales para cada análisis; los errores se corrigen en el informe, no en la fuente.",
      "Repositorio que integra las fuentes principales y reglas de calidad definidas para los datos críticos.",
      "Calidad medida y corregida en la fuente; acceso controlado y datos documentados para su uso en analítica.",
      "Plataforma que entrega datos confiables y oportunos a tableros y modelos; los nuevos casos de analítica o de inteligencia artificial se habilitan en poco tiempo.",
    ],
  },
];

/* ═══ Instrumento ═══ */

export const EMPRESA: MadInstrument = {
  kind: "empresa",
  name: "Madurez digital · empresa",
  intro: "Mide la madurez de la transformación digital de la empresa en cuatro líneas: clientes, operación, innovación y arquitectura. Cada variable combina la percepción de los actores, la evidencia de documentación, implementación e indicadores, y el nivel de 1 a 5 asignado contra una rúbrica.",
  lines: [
    { n: 1, code: "L1", name: "Clientes, canales y experiencia", short: "Clientes", color: "#0e93b4", weight: 0.3 },
    { n: 2, code: "L2", name: "Operación y procesos", short: "Operación", color: "#7c5cd6", weight: 0.25 },
    { n: 3, code: "L3", name: "Productos, servicios e innovación", short: "Innovación", color: "#e0913f", weight: 0.2 },
    { n: 4, code: "L4", name: "Arquitectura empresarial y gobierno digital", short: "Arquitectura", color: "#3f9d8c", weight: 0.25 },
  ],
  dimensions: [
    { key: "organizacional", name: "Organizacional", short: "Org." },
    { key: "misional", name: "Negocio y procesos", short: "Neg." },
    { key: "tecnologica", name: "Tecnológica", short: "Tec." },
    { key: "datos", name: "Datos e información", short: "Dat." },
  ],
  frames: {
    "TOGAF 10": { name: "TOGAF 10 · arquitectura empresarial", color: "var(--n4)" },
    "DAMA-DMBOK": { name: "DAMA-DMBOK · gestión y gobierno de datos", color: "#7c5cd6" },
    "ISO 27001": { name: "ISO/IEC 27001 · seguridad de la información", color: "var(--bad)" },
    "COBIT 2019": { name: "COBIT 2019 · gobierno y gestión de la tecnología", color: "var(--navy)" },
    "ITIL 4": { name: "ITIL 4 · gestión de servicios de tecnología", color: "#0e93b4" },
    "ISO 9001": { name: "ISO 9001 · gestión de la calidad", color: "var(--n2)" },
    "ISO 56002": { name: "ISO 56002 · gestión de la innovación", color: "var(--gold)" },
    "NIST AI RMF": { name: "NIST AI RMF · gestión de riesgos de la inteligencia artificial", color: "var(--cyan-deep)" },
    CMI: { name: "Cuadro de mando integral", color: "var(--muted)" },
  },
  audiences: {
    direccion: "Alta dirección y junta",
    lideres: "Líderes de área",
    equipos: "Equipos y colaboradores",
    tecnologia: "Tecnología y datos",
    clientes: "Clientes y aliados",
  },
  d7: {
    D1: { name: "Estrategia, gobierno y gestión del riesgo", short: "Estrategia y gobierno" },
    D2: { name: "Cultura, talento y competencias", short: "Talento" },
    D3: { name: "Diseño y gestión de procesos de negocio", short: "Procesos" },
    D4: { name: "Datos, analítica y gestión del conocimiento", short: "Datos" },
    D5: { name: "Infraestructura, arquitectura y seguridad", short: "Infraestructura" },
    D6: { name: "Experiencia de clientes y colaboradores", short: "Experiencia" },
    D7: { name: "Innovación, ecosistemas e impacto", short: "Innovación" },
  },
  variables: VARIABLES,
  domains: [
    {
      id: "clientes",
      name: "Experiencia del cliente y canales digitales",
      desc: "La relación con el cliente de principio a fin: estrategia, responsables, recorridos, venta y atención por canales digitales, y las plataformas que las soportan.",
      variableIds: ["CL-ORG-1", "CL-ORG-2", "CL-NEG-1", "CL-NEG-2", "CL-NEG-3", "CL-TEC-1", "CL-TEC-2", "CL-TEC-3"],
    },
    {
      id: "operacion",
      name: "Operación y automatización",
      desc: "La eficiencia de la operación: procesos con dueño, documentados, digitalizados y automatizados, conectados con proveedores y medidos con indicadores y trazabilidad.",
      variableIds: ["OP-ORG-1", "OP-NEG-1", "OP-NEG-2", "OP-NEG-3", "OP-TEC-1", "OP-TEC-3", "OP-DAT-1", "OP-DAT-2"],
    },
    {
      id: "datos",
      name: "Datos y analítica",
      desc: "Los datos como activo: gobierno, calidad, plataforma, vista única del cliente y analítica para decidir en la dirección, en la operación y en la oferta.",
      variableIds: ["CL-DAT-1", "CL-DAT-3", "OP-DAT-3", "IN-DAT-1", "IN-DAT-3", "AR-DAT-1", "AR-DAT-2", "AR-DAT-3"],
    },
    {
      id: "arquitectura",
      name: "Arquitectura, plataformas y ciberseguridad",
      desc: "La base que sostiene todo lo demás: gobierno de tecnología, arquitectura documentada, portafolio de proyectos y aplicaciones, integración, continuidad, seguridad y protección de datos personales.",
      variableIds: ["AR-ORG-1", "AR-NEG-1", "AR-NEG-2", "AR-NEG-3", "AR-TEC-1", "AR-TEC-2", "AR-TEC-3", "CL-DAT-2"],
    },
    {
      id: "talento",
      name: "Talento y cultura digital",
      desc: "Las personas como condición de la transformación: competencias digitales y de inteligencia artificial, gestión del cambio, formas de trabajo, cultura de aprendizaje y gestión del conocimiento.",
      variableIds: ["CL-ORG-3", "OP-ORG-2", "OP-ORG-3", "OP-TEC-2", "IN-ORG-2", "IN-ORG-3", "IN-DAT-2", "AR-ORG-2"],
    },
    {
      id: "innovacion",
      name: "Innovación e inteligencia artificial",
      desc: "La capacidad de renovar la oferta: estrategia y proceso de innovación, ecosistema de aliados, componente digital de los productos y uso gobernado de la inteligencia artificial.",
      variableIds: ["IN-ORG-1", "IN-NEG-1", "IN-NEG-2", "IN-NEG-3", "IN-TEC-1", "IN-TEC-2", "IN-TEC-3", "AR-ORG-3"],
    },
  ],
  aiq: [
    { key: "A_G", name: "Gobierno, ética y gestión de riesgos", weight: 0.2, prep: true, variableIds: ["AR-ORG-3", "AR-DAT-1"] },
    { key: "A_T", name: "Datos, infraestructura, privacidad y seguridad", weight: 0.2, prep: true, variableIds: ["AR-TEC-3", "AR-DAT-3"] },
    { key: "A_C", name: "Talento y competencias de inteligencia artificial", weight: 0.15, prep: true, variableIds: ["OP-ORG-3"] },
    { key: "A_X", name: "Clientes y experiencia", weight: 0.15, prep: false, variableIds: ["CL-TEC-3", "CL-DAT-3"] },
    { key: "A_O", name: "Operación y procesos", weight: 0.15, prep: false, variableIds: ["OP-TEC-3", "OP-DAT-3"] },
    { key: "A_P", name: "Productos, servicios e innovación", weight: 0.15, prep: false, variableIds: ["IN-NEG-3", "IN-TEC-3"] },
  ],
  safeguards: [
    { id: "SG-1", rule: "Inventario de los sistemas de inteligencia artificial en uso, cada uno con un responsable designado", cap: 59 },
    { id: "SG-2", rule: "Revisión humana en las decisiones de alto impacto sobre clientes o colaboradores apoyadas en inteligencia artificial", cap: 59 },
    { id: "SG-3", rule: "Evaluación de privacidad y de riesgos antes de iniciar tratamientos de datos de alto riesgo", cap: 59 },
    { id: "SG-4", rule: "Sin tratamiento irregular conocido de datos personales ni incidentes graves de datos sin gestionar", cap: 39 },
    { id: "SG-5", rule: "Proveedores de inteligencia artificial contratados con condiciones de seguridad, confidencialidad y uso de los datos", cap: null },
  ],
};
