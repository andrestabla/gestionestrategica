// ─────────────────────────────────────────────────────────────────────────────
// Mercado farmacéutico colombiano · lectura interna de Siegfried «Tendencias mercado colombiano 2026»
// (Constanza Beltrán, Dirección de Mercadeo, octubre de 2026) a partir de IQVIA (MAT junio, julio y agosto de 2026)
// y Close-Up (MAT agosto de 2026). Transcripción de las nueve láminas del PDF «MERCADO FARMACEUTICO COLOMBIANO».
// Alimenta el módulo de Inteligencia (sección «Mercado farmacéutico colombiano») y el contexto del asistente con IA.
// Cifras tal como aparecen en las láminas; cada bloque indica fuente y corte.
// ─────────────────────────────────────────────────────────────────────────────

export const MERCADO_FARMA_CO = {
  id: "mercado-farma-co-2026",
  titulo: "Tendencias del mercado farmacéutico colombiano 2026",
  autor: "Dirección de Mercadeo · Laboratorios Siegfried (Constanza Beltrán)",
  fecha: "octubre de 2026",
  fuentes: ["IQVIA (MAT junio, julio y agosto de 2026)", "Close-Up (MAT agosto de 2026)"],
  sectorKey: "farmaceutico-colombia",

  /** Evolución por segmento, MAT junio (IQVIA). Valores en miles de millones de COP; volumen en miles de millones de unidades. */
  segmentos: {
    corte: "MAT junio 2026", fuente: "IQVIA",
    valores: [
      { mat: "2022", total: 21413, comercial: 34, institucional: 66, crec: null },
      { mat: "2023", total: 24830, comercial: 33, institucional: 67, crec: 16.0 },
      { mat: "2024", total: 27637, comercial: 31, institucional: 69, crec: 11.0 },
      { mat: "2025", total: 30577, comercial: 31, institucional: 69, crec: 10.6 },
      { mat: "2026", total: 34007, comercial: 33, institucional: 67, crec: 11.2 },
    ],
    volumen: [
      { mat: "2022", total: 1096, comercial: 44, institucional: 56, crec: null },
      { mat: "2023", total: 1116, comercial: 43, institucional: 57, crec: 1.9 },
      { mat: "2024", total: 1067, comercial: 43, institucional: 57, crec: -4.0 },
      { mat: "2025", total: 1101, comercial: 43, institucional: 57, crec: 3.2 },
      { mat: "2026", total: 1170, comercial: 43, institucional: 57, crec: 6.3 },
    ],
    lectura: "El segmento institucional pierde puntos de participación en valores (69 % → 67 %) mientras el comercial recupera (31 % → 33 %); en volumen la mezcla se mantiene 57/43.",
  },

  /** Top 11 clases terapéuticas: participación retail / institucional (valores COP) y crecimiento, MAT marzo 2026 (IQVIA). */
  top11: {
    corte: "MAT marzo 2026", fuente: "IQVIA",
    filas: [
      { clase: "Oncológicos", retail26: 0.3, inst26: 99.7, retail25: 0.3, inst25: 99.7, crecRetail: 16.2, crecInst: 8.2, crecTotal: 8.2 },
      { clase: "Cardiovasculares crónicos", retail26: 22.9, inst26: 77.1, retail25: 19.1, inst25: 80.9, crecRetail: 36.8, crecInst: 9.0, crecTotal: 14.3 },
      { clase: "Diabetes", retail26: 7.8, inst26: 92.2, retail25: 5.8, inst25: 94.2, crecRetail: 49.2, crecInst: 8.4, crecTotal: 10.8 },
      { clase: "Dermatológicos", retail26: 80.9, inst26: 19.1, retail25: 81.1, inst25: 18.9, crecRetail: 10.8, crecInst: 11.8, crecTotal: 11.0 },
      { clase: "Antiinfectivos y antivirales", retail26: 30.4, inst26: 69.6, retail25: 30.0, inst25: 70.0, crecRetail: 9.6, crecInst: 7.4, crecTotal: 8.1 },
      { clase: "SNC", retail26: 35.9, inst26: 64.1, retail25: 32.6, inst25: 67.4, crecRetail: 22.9, crecInst: 6.0, crecTotal: 11.5 },
      { clase: "Enfermedades autoinmunes", retail26: 0.8, inst26: 99.2, retail25: 0.7, inst25: 99.3, crecRetail: 16.8, crecInst: 11.7, crecTotal: 11.8 },
      { clase: "Analgésicos", retail26: 67.8, inst26: 32.2, retail25: 67.3, inst25: 32.7, crecRetail: 9.9, crecInst: 7.5, crecTotal: 9.1 },
      { clase: "Gastrointestinales", retail26: 53.6, inst26: 46.4, retail25: 49.3, inst25: 50.7, crecRetail: 14.5, crecInst: -3.3, crecTotal: 5.5 },
      { clase: "Vitaminas y suplementos", retail26: 72.0, inst26: 28.0, retail25: 75.3, inst25: 24.7, crecRetail: 12.4, crecInst: 3.2, crecTotal: 17.5 },
      { clase: "Productos antiobesidad", retail26: 41.8, inst26: 58.2, retail25: 29.5, inst25: 70.5, crecRetail: 95.3, crecInst: 13.5, crecTotal: 37.6 },
    ],
    lectura: "Obesidad, bienestar y autocuidado ganan protagonismo en retail; oncológicos y autoinmunes siguen casi por completo en el institucional (alto costo e innovación).",
  },

  /** Crecimiento proyectado retail vs institucional (precios ex-manufacturer), IQVIA. */
  proyeccion: {
    fuente: "IQVIA", unidad: "% de crecimiento anual, precios ex-man",
    filas: [
      { anio: "2025", retail: 15.1, institucional: 9.0, total: 6.4 },
      { anio: "2026", retail: 15.9, institucional: 9.0, total: 5.8 },
      { anio: "2027", retail: 9.9, institucional: 8.5, total: 7.8 },
      { anio: "2028", retail: 8.9, institucional: 7.7, total: 7.1 },
      { anio: "2029", retail: 8.7, institucional: 7.3, total: 6.6 },
      { anio: "2030", retail: 8.3, institucional: 6.9, total: 6.1 },
    ],
    cagr: { periodo: "2025-2030", retail: 10.3, institucional: 7.9, total: 6.7 },
    lectura: "Retail mantendrá una ventaja estructural de crecimiento frente al institucional durante todo el periodo 2025-2030.",
  },

  /** Rutas de acceso que activa el paciente (IQVIA). */
  rutas: [
    { n: "01", t: "Mercado privado", d: "Crece: menos espera y no necesariamente más cobertura. Afiliados a medicina prepagada crecieron 37 % entre 2022 y 2025." },
    { n: "02", t: "Retail", d: "Crece: la farmacia como plataforma de gestión de pacientes, no solo como canal. IQVIA proyecta 11,1 % de crecimiento retail frente a 5,8 % institucional en 2026." },
    { n: "03", t: "Autocuidado", d: "Población más longeva, más digital, más informada y más exigente. Entre 2021 y 2024 el gasto directo de los hogares en medicamentos pasó de USD 7,6 a más de USD 9,5 billones." },
    { n: "04", t: "Corresponsabilidad", d: "Participación del paciente en aumento como mecanismo de corresponsabilidad. Oportunidad en PSP, continuidad terapéutica y modelos de acceso, no únicamente en producto." },
  ],

  /** Retail: categorías y canales, valores COP, MAT julio 2026 (IQVIA). Ventas en billones de COP. */
  retail: {
    corte: "MAT julio 2026", fuente: "IQVIA",
    matriz: [
      { cat: "Ético", crecValor: 20.0, crecVolumen: 8.0 }, { cat: "Belleza", crecValor: 7.5, crecVolumen: 8.0 }, { cat: "Cuidado del bebé", crecValor: 13.0, crecVolumen: 4.0 },
      { cat: "Cuidado del paciente", crecValor: 14.0, crecVolumen: 3.0 }, { cat: "Cuidado personal", crecValor: 5.0, crecVolumen: 3.0 }, { cat: "OTC", crecValor: 9.0, crecVolumen: 1.5 },
      { cat: "Equipos médicos", crecValor: 12.0, crecVolumen: 0.5 }, { cat: "Hogar, mascotas y otros", crecValor: -0.5, crecVolumen: -1.5 }, { cat: "Alimentos y bebidas", crecValor: 10.0, crecVolumen: -9.0 }, { cat: "Nutricionales", crecValor: 19.0, crecVolumen: -8.0 },
    ],
    participacionCanales: { cadenas: 59, independientes: 41, crecTotal: 14.0 },
    cadenas: [
      { mat: "2024", ventas: 7.5, etico: 33.8, otc: 22.6, cuidadoPersonal: 13.6, belleza: 10.7, bebe: 8.0, paciente: 5.6, crec: null },
      { mat: "2025", ventas: 8.6, etico: 35.2, otc: 22.6, cuidadoPersonal: 13.1, belleza: 10.7, bebe: 7.9, paciente: 5.0, crec: 14.0 },
      { mat: "2026", ventas: 9.8, etico: 37.3, otc: 22.1, cuidadoPersonal: 12.1, belleza: 10.1, bebe: 7.9, paciente: 4.8, crec: 14.0 },
    ],
    independientes: [
      { mat: "2024", ventas: 5.4, etico: 37.8, otc: 35.4, cuidadoPersonal: 10.8, belleza: 5.4, bebe: 4.5, paciente: null, crec: null },
      { mat: "2025", ventas: 6.0, etico: 39.1, otc: 35.5, cuidadoPersonal: 10.3, belleza: 5.0, bebe: 4.4, paciente: null, crec: 9.8 },
      { mat: "2026", ventas: 6.8, etico: 41.3, otc: 34.0, cuidadoPersonal: 9.7, belleza: 4.9, bebe: 4.4, paciente: null, crec: 14.1 },
    ],
    lectura: "El mercado ético mantiene el liderazgo y acelera en independientes (41,3 % de sus ventas); belleza y cuidado del paciente consolidan su relevancia en retail. Cadenas 59 % y independientes 41 % de las ventas; el canal crece 14 % frente al año anterior.",
  },

  /** Especialidades: ventas MAT agosto 2025 y 2026 en COP (valores), participación y crecimiento (IQVIA). */
  especialidades: {
    corte: "MAT agosto 2026", fuente: "IQVIA",
    totalMat25: 12027218470622, totalMat26: 13913207493860, crecTotal: 15.68,
    filas: [
      { esp: "Cardiometabolismo", mat25: 1546086809081, mat26: 2226307128859, share: 16.00, crec: 44.00 },
      { esp: "Dermatología", mat25: 1697176778775, mat26: 1852810562991, share: 13.32, crec: 9.17 },
      { esp: "Gastroenterología", mat25: 1641097836559, mat26: 1823756089288, share: 13.11, crec: 11.13 },
      { esp: "Osteo-muscular", mat25: 1533894882988, mat26: 1724323134766, share: 12.39, crec: 12.41 },
      { esp: "Respiratorio", mat25: 1276357499773, mat26: 1384932990552, share: 9.95, crec: 8.51 },
      { esp: "Micronutrientes", mat25: 685232819411, mat26: 764355303193, share: 5.49, crec: 11.55 },
      { esp: "Otros", mat25: 626907369361, mat26: 727899854408, share: 5.23, crec: 16.11 },
      { esp: "Ginecología", mat25: 612671525018, mat26: 706921735081, share: 5.08, crec: 15.38 },
      { esp: "Anti-infeccioso", mat25: 559570061408, mat26: 597299194925, share: 4.29, crec: 6.74 },
      { esp: "Nutrición", mat25: 508347824790, mat26: 590646680985, share: 4.25, crec: 16.19 },
      { esp: "Neuropsiquiatría", mat25: 494377661436, mat26: 583629398786, share: 4.19, crec: 18.05 },
      { esp: "Oftalmología", mat25: 412221939360, mat26: 455878627592, share: 3.28, crec: 10.59 },
      { esp: "Urología", mat25: 261278963169, mat26: 293041736808, share: 2.11, crec: 12.16 },
      { esp: "Odontología", mat25: 127785578794, mat26: 132899715251, share: 0.96, crec: 4.00 },
      { esp: "Oncología", mat25: 30581421061, mat26: 34470281779, share: 0.25, crec: 12.72 },
      { esp: "Vacunas", mat25: 13629499638, mat26: 14035058596, share: 0.10, crec: 2.98 },
    ],
    lectura: "Cardiometabolismo, dermatología y gastroenterología lideran el mercado medido por IQVIA; cardiometabolismo crece 44 % en el año.",
  },

  /** Ranking de corporaciones (IQVIA, MAT agosto 2026, dólares). MAT en miles de USD; crecimientos MAT por año. */
  corporaciones: {
    corte: "MAT agosto 2026", fuente: "IQVIA", unidad: "miles de USD",
    mercado: { mat: 3844389, crec2023: -4.16, crec2024: 19.30, crec2025: 7.75, crec2026: 34.28 },
    siegfried: { rank: 7, mat: 88131, ms: 2.29, crec: 35.46, ie: 101, msDelta: 1.01 },
    filas: [
      { rank: 1, corp: "Tecnoquímicas", mat: 344226, c23: -4.82, c24: 13.68, c25: 9.11, c26: 37.57 },
      { rank: 2, corp: "Abbott", mat: 312199, c23: -17.16, c24: 10.80, c25: -3.41, c26: 28.17 },
      { rank: 3, corp: "Eurofarma", mat: 175301, c23: -2.49, c24: 15.64, c25: 8.73, c26: 40.04 },
      { rank: 4, corp: "Haleon", mat: 150706, c23: -10.98, c24: 21.62, c25: 3.72, c26: 22.64 },
      { rank: 5, corp: "Procaps", mat: 143088, c23: -7.60, c24: 15.97, c25: -5.45, c26: 36.37 },
      { rank: 6, corp: "Novamed", mat: 89545, c23: 9.32, c24: 13.99, c25: 8.95, c26: 38.71 },
      { rank: 7, corp: "Siegfried", mat: 88131, c23: 1.01, c24: 20.78, c25: 19.62, c26: 35.46 },
      { rank: 8, corp: "Bayer", mat: 88035, c23: -12.92, c24: 19.28, c25: 0.64, c26: 24.96 },
      { rank: 9, corp: "Novo Nordisk", mat: 84312, c23: 6.21, c24: 26.18, c25: 122.32, c26: 45.93 },
      { rank: 10, corp: "Nestlé", mat: 81739, c23: -4.58, c24: 14.06, c25: 12.34, c26: 42.93 },
      { rank: 11, corp: "Opella", mat: 80593, c23: -10.36, c24: 29.91, c25: 1.19, c26: 19.26 },
      { rank: 12, corp: "Coaspharma", mat: 79325, c23: -9.79, c24: 8.39, c25: -1.74, c26: 42.88 },
      { rank: 13, corp: "Megalabs", mat: 78339, c23: -3.33, c24: 12.76, c25: 5.76, c26: 31.16 },
      { rank: 14, corp: "Laproff", mat: 68935, c23: 0.11, c24: 14.74, c25: 13.00, c26: 57.65 },
      { rank: 15, corp: "Procter & Gamble", mat: 66906, c23: -11.69, c24: 10.83, c25: 5.26, c26: 33.18 },
      { rank: 16, corp: "ICOM", mat: 64676, c23: -6.14, c24: 20.24, c25: 5.02, c26: 24.99 },
      { rank: 17, corp: "Pisa", mat: 61448, c23: 112.32, c24: 87.79, c25: -5.54, c26: 1.65 },
      { rank: 18, corp: "Genomma", mat: 58411, c23: -5.25, c24: 20.00, c25: -1.13, c26: 34.99 },
      { rank: 19, corp: "Sanfer", mat: 49104, c23: -11.00, c24: 22.06, c25: 1.96, c26: 29.27 },
      { rank: 20, corp: "La Santé", mat: 41192, c23: -25.01, c24: 9.28, c25: 6.89, c26: 4.64 },
    ],
    lectura: "Siegfried Corp. ocupa el 7.º lugar del ranking de corporaciones con 2,29 % de participación (+1,01 pp frente a 2025) y crece 35,46 % en MAT, por encima del mercado (34,28 %); índice de evolución 101.",
  },

  /** Mercado de prescripción (Close-Up, MAT agosto 2026). MAT en prescripciones. */
  closeUp: {
    corte: "MAT agosto 2026", fuente: "Close-Up", unidad: "prescripciones",
    mercadoCrec: -0.17,
    siegfried: { rank: 7, rankIdentificadas: 6, mat: 284400, ms: 3.04, crec: 3.30, ie: 103 },
    filas: [
      { rank: 1, corp: "Lab. no indicado", mat: 1673014, ms: 17.91, crec: -9.54, ie: 91 },
      { rank: 2, corp: "Tecnoquímicas", mat: 1259806, ms: 13.48, crec: 9.22, ie: 109 },
      { rank: 3, corp: "Abbott", mat: 477803, ms: 5.11, crec: -1.48, ie: 99 },
      { rank: 4, corp: "Procaps", mat: 417636, ms: 4.47, crec: 3.42, ie: 104 },
      { rank: 5, corp: "Novamed", mat: 412648, ms: 4.42, crec: 0.91, ie: 101 },
      { rank: 6, corp: "Megalabs", mat: 325833, ms: 3.49, crec: 7.23, ie: 107 },
      { rank: 7, corp: "Siegfried", mat: 284400, ms: 3.04, crec: 3.30, ie: 103 },
      { rank: 8, corp: "Haleon", mat: 248073, ms: 2.66, crec: -4.52, ie: 96 },
      { rank: 9, corp: "Heel", mat: 188627, ms: 2.02, crec: -6.54, ie: 94 },
      { rank: 10, corp: "Eurofarma", mat: 184293, ms: 1.97, crec: 8.62, ie: 109 },
      { rank: 11, corp: "Bayer", mat: 168779, ms: 1.81, crec: -4.38, ie: 96 },
      { rank: 12, corp: "Adium", mat: 154357, ms: 1.65, crec: 1.46, ie: 102 },
      { rank: 13, corp: "Nutrabiotics", mat: 147662, ms: 1.58, crec: 0.36, ie: 101 },
      { rank: 14, corp: "Sophia", mat: 142172, ms: 1.52, crec: 0.43, ie: 101 },
      { rank: 15, corp: "Opella", mat: 125201, ms: 1.34, crec: -7.71, ie: 92 },
    ],
    lectura: "En un mercado de prescripción prácticamente estable (-0,17 %), Siegfried crece 3,30 %, alcanza 3,04 % de participación y un índice de evolución de 103: 7.º del ranking y 6.º entre las corporaciones identificadas.",
  },

  /** Cambios simultáneos que redefinen el mercado (cambio → implicación). */
  cambios: [
    { cat: "Crecimiento", cambio: "El crecimiento proviene de múltiples fuentes: innovación, retail, seguros privados y autocuidado.", implicacion: "Las compañías que dependan solo del acceso institucional quedan más expuestas; ganan las que construyan estrategias multicanal." },
    { cat: "Paciente", cambio: "Protagonismo creciente del paciente en las decisiones de acceso (seguro privado, gasto de bolsillo).", implicacion: "La ventaja competitiva ya no es solo el mejor medicamento: acompañar mejor al paciente con soporte, adherencia, educación y continuidad terapéutica." },
    { cat: "Farmacias", cambio: "Retail crece más rápido que institucional y la farmacia gana relevancia como punto de acceso, información y seguimiento.", implicacion: "Ejecución en punto de venta, disponibilidad, rol del regente y segmentación de farmacias serán cada vez más estratégicos." },
    { cat: "Innovación", cambio: "Se sigue incorporando innovación de alto valor terapéutico; la presión financiera exige más evidencia clínica, económica y de resultados en salud.", implicacion: "De vender productos a demostrar valor: ventaja para quien evidencie impacto en resultados y sostenibilidad." },
  ],

  /** Agenda 2026-2030: qué proteger, dónde crecer, qué capacidades construir. */
  agenda: {
    proteger: ["Acceso institucional", "Sostenibilidad de precios", "Gestión del riesgo de cartera"],
    crecer: ["Mercado privado y retail", "Programas de soporte a pacientes y continuidad terapéutica con foco en resultados en salud", "Soluciones público-privadas"],
    capacidades: ["Evidencia local", "Anticipación regulatoria", "Soporte al paciente", "Relacionamiento flexible con pagadores", "Organizaciones alrededor del ciclo de atención a pacientes", "Inteligencia artificial"],
    lectura: "La ventaja competitiva dependerá de gestionar el ecosistema de acceso, no solo el producto.",
  },
} as const;

export type MercadoFarmaCo = typeof MERCADO_FARMA_CO;

/** Resumen compacto para el contexto del asistente con IA. */
export function resumenMercadoFarma(): string {
  const m = MERCADO_FARMA_CO;
  const s = m.segmentos.valores; const u = s[s.length - 1]; const p = m.proyeccion;
  const e = m.especialidades; const top = e.filas.slice(0, 5).map((f) => `${f.esp} ${f.share} % (+${f.crec} %)`).join(", ");
  const t11 = m.top11.filas.filter((f) => f.crecTotal >= 14).map((f) => `${f.clase} +${f.crecTotal} % (retail +${f.crecRetail} %)`).join(", ");
  const c = m.corporaciones; const cu = m.closeUp;
  return [
    `MERCADO FARMACÉUTICO COLOMBIANO (lectura interna de Siegfried con IQVIA y Close-Up, ${m.fecha}):`,
    `- Mercado total IQVIA ${e.corte}: ${(e.totalMat26 / 1e12).toFixed(2).replace(".", ",")} billones de COP (+${e.crecTotal} % frente a ${(e.totalMat25 / 1e12).toFixed(2).replace(".", ",")}). Especialidades líderes: ${top}.`,
    `- Mezcla por segmento (${m.segmentos.corte}): ${u.total.toLocaleString("es-CO")} miles de millones de COP, ${u.institucional} % institucional y ${u.comercial} % comercial (el institucional pierde puntos desde 69 %); en volumen 57/43.`,
    `- Clases con mayor dinamismo (${m.top11.corte}): ${t11}. Oncológicos y autoinmunes siguen >99 % en institucional.`,
    `- Proyección IQVIA ${p.cagr.periodo}: retail CAGR ${p.cagr.retail} % frente a institucional ${p.cagr.institucional} % (total ${p.cagr.total} %); en 2026 retail +${p.filas[1].retail} %, institucional +${p.filas[1].institucional} %. Medicina prepagada +37 % de afiliados 2022-2025; gasto de bolsillo en medicamentos de USD 7,6 a más de 9,5 billones (2021-2024).`,
    `- Retail (${m.retail.corte}): cadenas ${m.retail.participacionCanales.cadenas} % e independientes ${m.retail.participacionCanales.independientes} % de las ventas, canal +${m.retail.participacionCanales.crecTotal} %; el ético lidera (37,3 % en cadenas, 41,3 % en independientes) y crece ~20 % en valor; belleza y cuidado del paciente consolidan.`,
    `- Posición de Siegfried (IQVIA, ${c.corte}, USD): ${c.siegfried.rank}.º entre corporaciones, MS ${c.siegfried.ms} % (+${c.siegfried.msDelta} pp), crecimiento ${c.siegfried.crec} % frente a mercado ${c.mercado.crec2026} %, IE ${c.siegfried.ie}. Líderes: Tecnoquímicas, Abbott, Eurofarma, Haleon, Procaps, Novamed.`,
    `- Prescripción (Close-Up, ${cu.corte}): mercado ${cu.mercadoCrec} %, Siegfried +${cu.siegfried.crec} %, MS ${cu.siegfried.ms} %, IE ${cu.siegfried.ie}, ${cu.siegfried.rank}.º (${cu.siegfried.rankIdentificadas}.º entre identificadas). Líderes: Tecnoquímicas, Abbott, Procaps, Novamed, Megalabs.`,
    `- Cambios estructurales: crecimiento multicanal (innovación, retail, seguros privados, autocuidado); paciente protagonista; farmacia como plataforma de gestión de pacientes; de vender producto a demostrar valor con evidencia.`,
    `- Agenda 2026-2030 de la empresa: proteger ${m.agenda.proteger.join(", ").toLowerCase()}; crecer en ${m.agenda.crecer.map((x) => x.toLowerCase()).join("; ")}; construir ${m.agenda.capacidades.map((x) => x.toLowerCase()).join(", ")}.`,
  ].join("\n");
}
