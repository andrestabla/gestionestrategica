// ─────────────────────────────────────────────────────────────────────────────
// Base de conocimiento del sector y del país que fundamenta las sugerencias del
// asistente de OKR: hechos con cifra, fecha y fuente verificable. Cada hecho
// lleva temas; cada palanca de la empresa se asocia a temas, y el asistente
// recibe solo los hechos pertinentes, numerados, para citarlos por número.
// Hoy cubre el retail farmacéutico en Ecuador (Cresio); otras empresas quedan
// sin base hasta que se cargue la suya. Revisión de fuentes: 18 de octubre de 2026.
// ─────────────────────────────────────────────────────────────────────────────
import type { CompanyInfo, Lever } from "@/data/catalogo";

export type TipoFuente = "oficial" | "empresa" | "prensa" | "consultora" | "academico";
export type Fuente = { id: string; titulo: string; editor: string; fecha: string; url: string; tipo: TipoFuente };
export type Tema = "mercado" | "expansion" | "cliente" | "digital" | "salud" | "talento" | "liderazgo" | "margen" | "regulacion" | "macro" | "demanda";
export type Hecho = { id: string; temas: Tema[]; hecho: string; fuente: string; nota?: string };
export type BaseConocimiento = { id: string; nombre: string; sectorKeys: string[]; paises: string[]; fuentes: Fuente[]; hechos: Hecho[] };

/** Hecho numerado tal como lo recibe el modelo y lo muestra la plataforma. */
export type Evidencia = { n: number; id: string; hecho: string; nota?: string; fuente: Fuente };

const F: Fuente[] = [
  { id: "primicias-boom-2026", titulo: "El boom farmacéutico en Ecuador, entre el crecimiento acelerado y un mercado concentrado (Liz Ortiz, con datos del REEM-INEC y de la Superintendencia de Compañías, ejercicio 2025)", editor: "Primicias · Revista Gestión", fecha: "6 de mayo de 2026", url: "https://www.primicias.ec/revistagestion/analisis/boom-farmaceutico-ecuador-crecimiento-mercado-concentracion-121982/", tipo: "prensa" },
  { id: "inec-css-2024", titulo: "Cuentas Satélite de Salud 2024 · boletín técnico (serie 2007-2024)", editor: "INEC", fecha: "noviembre de 2025", url: "https://www.ecuadorencifras.gob.ec/documentos/web-inec/Estadisticas_Economicas/Cuentas_Satelite/Salud/2024/3_Boletin_Tecnico_CSS_2024.pdf", tipo: "oficial" },
  { id: "inec-enighur-medicinas", titulo: "Gastar en salud empuja a dificultades económicas: ¿qué pasa en Ecuador? (con la ENIGHUR 2024-2025 del INEC)", editor: "Teleamazonas", fecha: "2025", url: "https://www.teleamazonas.com/actualidad/noticias/sociedad/gastar-salud-empuja-pobreza-ecuador-127470/", tipo: "prensa" },
  { id: "primicias-femsa-250", titulo: "Cadena de farmacias planea abrir 250 locales en Ecuador en un año; tendrá nuevos formatos (Luis Fernando Apolo, FEMSA Ecuador)", editor: "Primicias", fecha: "2 de agosto de 2025", url: "https://www.primicias.ec/economia/empresas/cadena-farmacias-planea-abrir-250-locales-ecuador-ano-tendra-nuevos-formatos-102123/", tipo: "prensa" },
  { id: "ccq-femsa-1000", titulo: "FEMSA Salud inaugura su farmacia 1.000 en Ecuador", editor: "Cámara de Comercio de Quito", fecha: "agosto de 2025", url: "https://ccq.ec/femsa-salud-ecuador-femsa-salud-inaugura-su-farmacia-1-000-en-ecuador/", tipo: "empresa" },
  { id: "direvoz-ranking-2025", titulo: "Las empresas más grandes del Ecuador por ingresos: qué dice el ejercicio 2025 (datos abiertos de la Superintendencia de Compañías)", editor: "Direvoz", fecha: "2026", url: "https://direvoz.com/rankings/empresas-mas-grandes-del-ecuador/", tipo: "prensa" },
  { id: "bce-prevision-2026", titulo: "El BCE eleva a 2,7 % la previsión de crecimiento económico de Ecuador para 2026 (Programación Macroeconómica)", editor: "Banco Central del Ecuador", fecha: "15 de septiembre de 2026", url: "https://www.bce.fin.ec/el-bce-eleva-a-27-la-prevision-de-crecimiento-economico-de-ecuador-para-2026/", tipo: "oficial" },
  { id: "inec-censo-2022", titulo: "Censo de Población y Vivienda 2022 · resultados definitivos (segunda entrega)", editor: "INEC", fecha: "mayo de 2024", url: "https://www.censoecuador.gob.ec/wp-content/uploads/2024/05/Presentacion_Nacional_2da_entrega.pdf", tipo: "oficial" },
  { id: "inec-defunciones-2024", titulo: "Registro Estadístico de Defunciones Generales 2024 · principales resultados", editor: "INEC", fecha: "2025", url: "https://www.ecuadorencifras.gob.ec/documentos/web-inec/Poblacion_y_Demografia/Defunciones_Generales/2024/Principales_resultados_EDG_2024.pdf", tipo: "oficial" },
  { id: "cece-ecommerce-2024", titulo: "E-commerce en Ecuador: con USD 2.857 millones en ventas, portales nacionales superaron a los internacionales en 2024 (estudio CECE-UEES)", editor: "El Universo", fecha: "2025", url: "https://www.eluniverso.com/noticias/economia/comercio-electronico-ventas-5500-millones-balance-uees-cece-ecuador-2024-nota/", tipo: "prensa" },
  { id: "arcsa-venta-libre-2026", titulo: "Estos son los medicamentos que puede comprar sin receta y los que están prohibidos en Ecuador, según el nuevo listado de la Arcsa", editor: "Primicias", fecha: "2026", url: "https://www.primicias.ec/sociedad/medicamentos-venta-libre-receta-ecuador-prohibicion-farmacos-listado-arcsa-121525/", tipo: "prensa" },
  { id: "cc-precios-2025", titulo: "Corte Constitucional de Ecuador valida normativa que fija precios de medicamentos", editor: "Diario Constitucional", fecha: "3 de octubre de 2025", url: "https://www.diarioconstitucional.cl/2025/10/03/corte-constitucional-de-ecuador-valida-normativa-que-fija-precios-de-medicamentos/", tipo: "prensa" },
  { id: "paho-genericos", titulo: "Acceso a medicamentos y situación del mercado farmacéutico en Ecuador (Ortiz-Prado y otros)", editor: "Revista Panamericana de Salud Pública (OPS)", fecha: "2014", url: "https://journal.paho.org/sites/default/files/14--OPIN--Ortiz-Prado--57-62.pdf", tipo: "academico" },
  { id: "chameleon-ec-2025", titulo: "Claves del mercado de consumer health y pharma en Ecuador: tendencias y oportunidades", editor: "Chameleon Pharma Consulting", fecha: "2025", url: "https://www.chameleon-pharma.com/es/claves-del-mercado-de-consumer-health-y-pharma-en-ecuador-tendencias-y-oportunidades/", tipo: "consultora" },
  { id: "euromonitor-ec-2025", titulo: "Consumer Health in Ecuador (resumen público)", editor: "Euromonitor International", fecha: "2025", url: "https://www.euromonitor.com/consumer-health-in-ecuador/report", tipo: "consultora" },
  { id: "rd-saude-2025", titulo: "RD Saúde cresce dois dígitos e fecha 2025 com R$ 47,6 bi em receita (resultados 4T25)", editor: "Panorama Farmacêutico", fecha: "5 de marzo de 2026", url: "https://panoramafarmaceutico.com.br/rd-saude-cresce-dois-digitos-e-fecha-2025-com-r-476-bi-em-receita/", tipo: "prensa" },
  { id: "safra-rd-4t25", titulo: "RD Saúde encerra 4T25 com crescimento acima do esperado (análisis de resultados)", editor: "Safra · O Especialista", fecha: "2026", url: "https://oespecialista.safra.com.br/analise/rd-saude-resultados-4t25/", tipo: "consultora" },
  { id: "cruz-verde-perfil", titulo: "Perfil corporativo · Quiénes somos", editor: "Cruz Verde Colombia", fecha: "2025", url: "https://www.cruzverde.com.co/nosotros/perfil-corporativo/", tipo: "empresa" },
  { id: "sumedico-caf-2025", titulo: "¿Dónde se atienden primero los mexicanos? (consultorios adyacentes a farmacias, datos de Anafarmex y NielsenIQ)", editor: "SuMédico", fecha: "18 de noviembre de 2025", url: "https://www.sumedico.com/especialidades/2025/11/18/donde-se-atienden-primero-los-mexicanos-50865.html", tipo: "prensa" },
  { id: "resonate-nps", titulo: "NPS benchmarks by industry (farmacia, con datos de NPS Prism)", editor: "Resonate CX", fecha: "2025", url: "https://www.resonate.cx/blog/nps-benchmarks-by-industry/", tipo: "consultora" },
  { id: "jdpower-pharmacy-2025", titulo: "2025 U.S. Pharmacy Study", editor: "J.D. Power", fecha: "2025", url: "https://www.jdpower.com/business/press-releases/2025-us-pharmacy-study/", tipo: "consultora" },
  { id: "bain-pharmacy-2025", titulo: "A New Prescription for US Pharmacy", editor: "Bain & Company", fecha: "abril de 2025", url: "https://www.bain.com/insights/a-new-prescription-for-us-pharmacy/", tipo: "consultora" },
  { id: "clutch-loyalty-kpi", titulo: "Loyalty program KPIs and benchmarks by vertical and program maturity", editor: "Clutch", fecha: "2025", url: "https://www.clutch.com/blog/learn-loyalty-kpi-benchmarks", tipo: "consultora" },
  { id: "evaluar-rotacion-2025", titulo: "Reporte de rotación de personal en Latinoamérica 2025", editor: "Evaluar", fecha: "2025", url: "https://blogs.evaluar.com/hubfs/Reporte%20Rotaci%C3%B3n%20Personal%20LATAM%202025%20-%20Evaluar.pdf", tipo: "consultora" },
  { id: "deloitte-rotacion-ec", titulo: "Cinco razones explican la rotación de trabajadores en las empresas de Ecuador", editor: "Deloitte Ecuador", fecha: "estudio con 167 empresas", url: "https://www.deloitte.com/latam/es/services/consulting/analysis/5razones-que-explica-la-rotacion-de-trabajadores.html", tipo: "consultora" },
  { id: "ddi-glf-2025", titulo: "Global Leadership Forecast 2025 · HR Insights Report (2.185 profesionales de RR. HH. y 10.796 líderes)", editor: "DDI", fecha: "2025", url: "https://www.ddi.com/about/media/hr-insights-report-2025", tipo: "consultora" },
  { id: "questionpro-enps-2025", titulo: "What is a good employee NPS? eNPS benchmarks (estudio con unos 5.000 empleados)", editor: "QuestionPro", fecha: "2025", url: "https://www.questionpro.com/blog/what-is-a-good-employee-nps/", tipo: "consultora" },
  { id: "perceptyx-enps", titulo: "Employee Net Promoter Score: benchmarks and drivers", editor: "Perceptyx", fecha: "2025", url: "https://blog.perceptyx.com/3-key-drivers-of-employee-net-promoter-score-how-listening-can-help", tipo: "consultora" },
];

const H: Hecho[] = [
  // ── mercado y expansión en Ecuador
  { id: "ec-establecimientos", temas: ["mercado", "expansion"], hecho: "Ecuador pasó de 10.500 establecimientos minoristas farmacéuticos en 2020 a 22.238 en 2025 (CIIU G4772, REEM-INEC); +6,4 % en 2025 y la cifra más alta de la serie.", fuente: "primicias-boom-2026" },
  { id: "ec-densidad", temas: ["mercado", "expansion"], hecho: "Hay cerca de una farmacia por cada 832 habitantes (22.238 locales sobre unos 18,5 millones de personas, cálculo del artículo); FEMSA cita una por cada 1.400 frente a una media global de 2.500.", fuente: "primicias-boom-2026", nota: "La densidad es un cálculo periodístico; la cifra de FEMSA es una declaración de la empresa." },
  { id: "ec-provincias", temas: ["mercado", "expansion", "demanda"], hecho: "Guayas (6.034) y Pichincha (4.649) concentran el 47,9 % de los locales en 2025 (42,3 % en 2019); entre 2019 y 2025 crecieron más rápido Manabí (+78 %), Azuay (+94 %) y Santa Elena (+143 %).", fuente: "primicias-boom-2026" },
  { id: "ec-ingresos-minorista", temas: ["mercado", "margen"], hecho: "El comercio minorista farmacéutico (G4772.01) facturó USD 1.082 millones en el ejercicio 2025; las diez mayores empresas suman USD 969 millones (89,6 %). Con la distribución mayorista, el sector llega a USD 5.474 millones.", fuente: "primicias-boom-2026" },
  { id: "ec-lideres", temas: ["mercado"], hecho: "Difare lideró el ranking combinado con USD 912,3 millones en 2025 y Farcomed-Fybeca el minorista con USD 566,8 millones (Superintendencia de Compañías, ejercicio 2025).", fuente: "primicias-boom-2026" },
  { id: "ec-farmaenlace", temas: ["mercado"], hecho: "Farmaenlace registró ingresos de USD 653 millones en 2025 (puesto 20 del ranking nacional por ingresos) y Farcomed USD 556,5 millones (puesto 27), según los datos abiertos de la Superintendencia de Compañías.", fuente: "direvoz-ranking-2025", nota: "Difiere en USD 10 millones de la cifra de Farcomed publicada por Primicias; ambas salen del mismo ejercicio." },
  { id: "femsa-1000", temas: ["mercado", "expansion"], hecho: "FEMSA Salud abrió su farmacia 1.000 en Ecuador el 30 de julio de 2025: Fybeca 341 locales y SanaSana 403 (256 en franquicia); 56 aperturas en 2025 hasta esa fecha.", fuente: "ccq-femsa-1000" },
  { id: "femsa-250", temas: ["mercado", "expansion"], hecho: "FEMSA prevé 40 aperturas más en 2025 y 250 locales en el año siguiente, con formatos más pequeños y cercanos al barrio, 12 innovaciones de surtido (veterinaria, cuidado capilar, productos coreanos, comida rápida) y la integración con OkiDoki; Fybeca pasó de 100 a 350 locales en dos años.", fuente: "primicias-femsa-250" },
  // ── demanda, salud y gasto de los hogares
  { id: "ec-bolsillo", temas: ["demanda", "salud", "margen"], hecho: "El gasto de bolsillo de los hogares fue el 33,4 % del gasto en salud en 2024 (32,3 % en 2022, 33,1 % en 2023); el gasto nacional en salud equivale al 6,8 % del PIB y el sector privado aporta el 38,2 %.", fuente: "inec-css-2024" },
  { id: "ec-medicinas-hogar", temas: ["demanda", "cliente", "margen"], hecho: "El 57 % del gasto de los hogares en salud se destina a medicinas (ENIGHUR 2024-2025 del INEC).", fuente: "inec-enighur-medicinas" },
  { id: "ec-mayores", temas: ["demanda", "salud", "cliente"], hecho: "Ecuador tiene 16,94 millones de habitantes y 1.520.590 personas de 65 años o más (9 %), 53,6 % mujeres; unos 1,1 millones de hogares incluyen a una persona mayor y 276.084 viven solas (censo 2022).", fuente: "inec-censo-2022" },
  { id: "ec-cronicos", temas: ["demanda", "salud", "cliente"], hecho: "Las enfermedades isquémicas del corazón fueron la primera causa de muerte en 2024 (14.471 defunciones), seguidas de homicidios (6.547), cerebrovasculares (4.836), diabetes (4.680) e hipertensivas (3.689): la carga crónica sostiene la demanda recurrente de medicamentos y control.", fuente: "inec-defunciones-2024" },
  { id: "ec-mercado-otc-rx", temas: ["mercado", "demanda"], hecho: "Las ventas de automedicación y prescripción en Ecuador se estiman en unos USD 2.950 millones en 2025, con un crecimiento anual compuesto del 5,5 % proyectado hasta 2035 (estimación de consultora, no cifra oficial).", fuente: "chameleon-ec-2025", nota: "Estimación privada; no coincide con el alcance de las cifras de la Superintendencia." },
  { id: "ec-euromonitor", temas: ["mercado", "margen", "cliente"], hecho: "La farmacia sigue siendo el canal principal de consumer health en Ecuador en 2025 y amplía su presencia con la expansión de cadenas; el comercio electrónico gana terreno; los dermatológicos crecen con la demanda de tratamientos capilares y la dermocosmética compite con ellos.", fuente: "euromonitor-ec-2025" },
  // ── regulación
  { id: "ec-precios", temas: ["regulacion", "margen"], hecho: "La Corte Constitucional desestimó en 2025 la acción contra el reglamento de fijación de precios de medicamentos, que mantiene tres regímenes: regulado, de fijación directa y liberado; con precio regulado, un alza de costo no se puede trasladar al precio.", fuente: "cc-precios-2025" },
  { id: "ec-venta-libre", temas: ["regulacion", "cliente"], hecho: "La ARCSA redujo en 2026 el listado de medicamentos de venta libre de 464 a 381: menos surtido sin receta y más peso del consejo farmacéutico y la prescripción.", fuente: "arcsa-venta-libre-2026" },
  { id: "ec-genericos", temas: ["regulacion", "margen"], hecho: "El mercado ecuatoriano ha sido históricamente de marca: hacia 2014 el 93 % de las ventas correspondía a medicamentos de marca y menos del 7 % a genéricos; los precios de marca subían más rápido que los de genéricos.", fuente: "paho-genericos", nota: "Dato antiguo (2014); sirve como referencia estructural, no como cifra vigente." },
  // ── macro
  { id: "ec-pib-2026", temas: ["macro", "mercado", "margen"], hecho: "El Banco Central prevé un crecimiento del PIB de 2,7 % en 2026, consumo de los hogares +3,3 %, inflación promedio 2,1 % y un crecimiento promedio de 2,5 % en 2027-2030 (septiembre de 2026).", fuente: "bce-prevision-2026" },
  { id: "ec-ecommerce", temas: ["digital", "cliente", "mercado"], hecho: "El comercio electrónico en Ecuador movió USD 4.618 millones en 2024 (+22 %, 81,1 millones de transacciones) y la CECE proyecta USD 6.500 millones en 2025 y que en 2030 al menos la mitad de las compras sean digitales.", fuente: "cece-ecommerce-2024" },
  // ── referencias regionales de cadenas
  { id: "rd-saude", temas: ["expansion", "digital", "cliente", "margen"], hecho: "RD Saúde (Brasil) cerró 2025 con 3.547 farmacias en 663 ciudades tras abrir 330, receta bruta de R$ 47,6 mil millones (+13,9 %), 51,7 millones de clientes con 8,4 visitas al año en promedio y ventas digitales del 29,3 % en el 4T25 (82 % de ellas por app).", fuente: "rd-saude-2025" },
  { id: "rd-margen", temas: ["margen"], hecho: "El margen bruto de RD Saúde fue 27,3 % en el 4T25 (−27 puntos básicos interanuales), presionado por el mayor peso de los medicamentos GLP-1; EBITDA ajustado 7,1 % en el año.", fuente: "safra-rd-4t25" },
  { id: "cruz-verde", temas: ["expansion"], hecho: "Cruz Verde abrió su punto de venta 1.000 en Colombia y proyectó cerrar 2025 con 1.050 locales y 120 clínicas intrahospitalarias.", fuente: "cruz-verde-perfil" },
  { id: "mx-consultorios", temas: ["salud", "cliente", "expansion"], hecho: "En México funcionan entre 18.000 y 20.000 consultorios adyacentes a farmacias, con unos 10 millones de consultas al mes (Anafarmex y NielsenIQ): la farmacia como primera puerta de la atención primaria.", fuente: "sumedico-caf-2025" },
  // ── cliente y fidelización (referencias de medición)
  { id: "nps-farmacia", temas: ["cliente"], hecho: "Referencia de NPS en farmacia: promedio de 35 a 45 puntos, excelente desde 50 y clase mundial desde 60 (benchmark de proveedor con datos de NPS Prism; no es una medición ecuatoriana).", fuente: "resonate-nps", nota: "Benchmark de proveedor; usar como orden de magnitud." },
  { id: "jdpower", temas: ["cliente"], hecho: "En EE. UU., las cadenas de farmacia obtienen 643 puntos de satisfacción sobre 1.000 frente a 715 de los supermercados y 706 de los grandes comerciantes; la rapidez en despachar la receta es una de las brechas (J.D. Power 2025).", fuente: "jdpower-pharmacy-2025" },
  { id: "bain-independientes", temas: ["cliente"], hecho: "Los clientes están más satisfechos con farmacias independientes, supermercados y grandes superficies que con las cadenas de farmacia (Bain con NPS Prism, 2T24): la cercanía y la atención pesan más que la escala.", fuente: "bain-pharmacy-2025" },
  { id: "loyalty-kpi", temas: ["cliente", "digital"], hecho: "Para programas de fidelización conviene medir la tasa de miembros que redimen (miembros con al menos un beneficio redimido sobre miembros elegibles), distinta de la tasa de recompensas redimidas; en farmacia y supermercado la ventana de «miembro activo» recomendada es de 30 a 60 días.", fuente: "clutch-loyalty-kpi" },
  // ── talento y liderazgo
  { id: "rotacion-latam", temas: ["talento"], hecho: "La rotación promedio de personal en Latinoamérica ronda el 16 % anual; Ecuador está entre los países altos (17–18 %) y las empresas ecuatorianas estiman un costo anual cercano a USD 19.000 por rotación (encuesta de proveedor, 2025).", fuente: "evaluar-rotacion-2025", nota: "Encuesta de un proveedor de software de RR. HH.; no desglosa retail." },
  { id: "rotacion-ec-deloitte", temas: ["talento"], hecho: "Un estudio de Deloitte con 167 empresas ecuatorianas (incluido comercio) reportó una rotación anual de 14,5 %.", fuente: "deloitte-rotacion-ec" },
  { id: "ddi-bench", temas: ["talento", "liderazgo"], hecho: "Solo el 49 % de los cargos críticos de liderazgo podría cubrirse de inmediato con candidatos internos y solo el 20 % de los líderes de RR. HH. dice tener sucesores listos para sus cargos más críticos (DDI, 2025).", fuente: "ddi-glf-2025" },
  { id: "enps-retail", temas: ["talento"], hecho: "El eNPS promedio del retail fue 18 en 2025 frente a 32 del conjunto de industrias (QuestionPro); otras bases sitúan al comercio minorista en valores de cero o negativos.", fuente: "questionpro-enps-2025" },
  { id: "enps-perceptyx", temas: ["talento"], hecho: "El benchmark global de eNPS está en torno a 14-15 puntos y el comercio minorista suele reportar valores negativos (Perceptyx).", fuente: "perceptyx-enps" },
];

export const BASES: BaseConocimiento[] = [
  { id: "farmacias-ecuador", nombre: "Retail farmacéutico · Ecuador", sectorKeys: ["farmacias-ecuador"], paises: ["EC"], fuentes: F, hechos: H },
];

/** Base aplicable a la empresa: por sector de referencia o, si el sector menciona farmacias, por país. */
export function baseDe(c: Pick<CompanyInfo, "sectorKey" | "sector" | "country"> | null | undefined): BaseConocimiento | null {
  if (!c) return null;
  const farma = /farmac|drogu|retail de salud/i.test(c.sector ?? "");
  return BASES.find((b) => b.sectorKeys.includes(c.sectorKey ?? "") || (farma && c.country && b.paises.includes(c.country))) ?? null;
}

/** Temas que fundamentan cada palanca; se infieren del nombre (vale para cualquier empresa). */
export function temasDePalanca(l: Pick<Lever, "id" | "name"> | null | undefined): Tema[] {
  const s = `${l?.id ?? ""} ${l?.name ?? ""}`.toLowerCase();
  if (/market|share|tienda|pdv|cercan|expansi|cobertura|ms\b/.test(s)) return ["mercado", "expansion", "demanda", "macro", "digital"];
  if (/fidel|cliente|experien|servicio|lealtad|fid\b/.test(s)) return ["cliente", "digital", "salud", "demanda", "regulacion"];
  if (/madur|cultura|talento|product|organiz|persona|lider|mad\b/.test(s)) return ["talento", "liderazgo", "macro", "expansion"];
  if (/margen|gmroi|rentab|portafolio|oferta|precio|mar\b/.test(s)) return ["margen", "mercado", "regulacion", "macro"];
  return ["mercado", "cliente", "talento", "margen", "macro"];
}

/** Hechos pertinentes a la palanca, numerados desde 1, con su fuente completa (como máximo `max`). */
export function evidenciaPara(c: Pick<CompanyInfo, "sectorKey" | "sector" | "country"> | null | undefined, lever: Pick<Lever, "id" | "name"> | null | undefined, max = 18): Evidencia[] {
  const base = baseDe(c); if (!base) return [];
  const temas = temasDePalanca(lever);
  const rank = (h: Hecho) => temas.findIndex((t) => h.temas.includes(t));   // primero los temas más propios de la palanca
  const elegidos = base.hechos.filter((h) => rank(h) >= 0).sort((a, b) => rank(a) - rank(b)).slice(0, max);
  return elegidos.map((h, i) => ({ n: i + 1, id: h.id, hecho: h.hecho, ...(h.nota ? { nota: h.nota } : {}), fuente: base.fuentes.find((f) => f.id === h.fuente)! }));
}

/** Texto numerado para el encargo al modelo. */
export const evidenciaTexto = (ev: Evidencia[]): string =>
  ev.map((e) => `[${e.n}] ${e.hecho} (${e.fuente.editor}, ${e.fuente.fecha}${e.nota ? `; ${e.nota}` : ""})`).join("\n");
