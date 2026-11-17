// ─────────────────────────────────────────────────────────────────────────────
// Portafolio del canal de suministros industriales en Colombia: las líneas que vende una distribuidora B2B, quién
// las compra, qué mueve su demanda y cómo se compran. Es la lectura de «Portafolio y regulación» del módulo de
// Inteligencia (M7) para este sector (la farmacéutica tiene la suya con INVIMA y precios regulados). Las cifras y
// las normas no van aquí: cada línea apunta a los hechos con fuente de la base del sector (conocimiento-sector.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type LineaCanal = {
  id: string;
  linea: string;
  incluye: string;
  clientes: string;
  motor: string;        // qué mueve la demanda
  compra: string;       // cómo se compra: recurrente, por proyecto, por parada…
  hechos: string[];     // hechos de la base del sector que la sustentan (ids)
};

export const LINEAS_SUMINISTROS: LineaCanal[] = [
  { id: "epp", linea: "Protección personal y seguridad industrial", incluye: "Cascos, guantes, protección visual, auditiva y respiratoria, calzado de seguridad y equipos contra caídas.", clientes: "Manufactura, construcción, minería y servicios con personal en campo.", motor: "La obligación legal del empleador de suministrar y reponer los elementos de protección, los estándares del sistema de seguridad y salud en el trabajo y las exigencias del trabajo en alturas.", compra: "Recurrente: se repone por desgaste y por cada persona que entra; los clientes grandes compran por contrato marco.", hechos: ["si-sst-epp", "si-sst-estandares", "si-alturas"] },
  { id: "herramientas", linea: "Herramientas manuales y eléctricas", incluye: "Herramienta manual, eléctrica e inalámbrica, medición y accesorios.", clientes: "Mantenimiento de planta, contratistas de obra y montaje.", motor: "El ciclo de la construcción y de los proyectos de mantenimiento; las marcas fijan precio y empujan su canal propio.", compra: "Por proyecto y por reposición; sensible a precio frente a los mayoristas ferreteros.", hechos: ["si-construccion", "si-par-ranger"] },
  { id: "abrasivos", linea: "Abrasivos y soldadura", incluye: "Discos de corte y desbaste, lijas, electrodos y consumibles de soldadura.", clientes: "Metalmecánica, fabricación de estructuras y talleres de mantenimiento.", motor: "La producción manufacturera, sobre todo la metalmecánica: se consume al ritmo de la planta.", compra: "Recurrente y de alto volumen; se gana con disponibilidad y entrega el mismo día.", hechos: ["si-industria"] },
  { id: "rodamientos", linea: "Rodamientos y transmisión de potencia", incluye: "Rodamientos, chumaceras, correas, cadenas, acoples y retenedores.", clientes: "Plantas de manufactura, minería y agroindustria.", motor: "El mantenimiento de equipos y las paradas programadas de planta; un repuesto que falta detiene una línea.", compra: "Urgente o programada por parada; el cliente paga por tenerlo hoy.", hechos: ["si-mineria", "si-industria"] },
  { id: "tornilleria", linea: "Tornillería y fijaciones", incluye: "Tornillos, tuercas, arandelas, anclajes y varilla roscada.", clientes: "Construcción, montaje metalmecánico y fabricantes.", motor: "La construcción y el montaje; producto de alta rotación con fuerte competencia importada.", compra: "Por volumen y por obra; el precio y el surtido deciden.", hechos: ["si-arancel-acero", "si-antidumping"] },
  { id: "quimicos", linea: "Químicos de mantenimiento y lubricantes", incluye: "Lubricantes, desengrasantes, adhesivos, selladores y anticorrosivos.", clientes: "Mantenimiento de planta y flotas.", motor: "El mantenimiento preventivo; cada producto exige etiqueta y ficha de datos de seguridad bajo el sistema globalmente armonizado.", compra: "Recurrente; la ficha de seguridad y la trazabilidad son requisito para venderle a la gran industria.", hechos: ["si-sga", "si-sga-plazos"] },
];

/** Lo que mueve el costo del portafolio de una distribuidora: dólar, importaciones, aranceles, inflación, crédito y nómina. */
export const COSTOS_SUMINISTROS = ["si-trm", "si-importaciones", "si-arancel-acero", "si-antidumping", "si-inflacion", "si-tasa", "si-salario", "si-jornada"];
