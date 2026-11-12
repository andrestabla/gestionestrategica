// Madurez digital con IA: la lectura personal de quien responde la percepción y el informe de
// resultados de la medición (corte publicado o captura en curso). Aquí viven el encargo al modelo
// (instrumento + reglas + datos de la medición) y la validación de su respuesta. Reglas puras: el
// servidor llama al modelo (src/server/ia.ts) y guarda el resultado con la huella de los datos.

import {
  MAD_LEVELS, INDEX_LEVELS, PERCEPTION_SCALE, PRACTICE_STATES, D7_KEYS, SAFEGUARD_LABEL,
  P, E, gapPE, madLevelName, indexLevel, lineLevel, lineIndex, dimLevel, overallLevel, generalIndex, d7Index, practiceCounts, evidenceCoverage, aiqOf, progressOf,
  type MadInstrument, type MadVariable, type Captures, type SafeguardState,
} from "@/lib/madurez";

/** Informe de resultados de la medición de la empresa. Desde la versión 2 trae, además del diagnóstico
    interno, el cruce con el sector y con la estrategia, y un plan con plazos, esfuerzo e impacto. Los
    campos nuevos son opcionales: un informe guardado con la versión anterior se sigue leyendo. */
export type Exigencia = "alta" | "media" | "baja";
export type Posicion = "rezago" | "en_linea" | "ventaja";
export type Grado = "bajo" | "medio" | "alto";
/** Hecho del sector citado en el informe, con su fuente (se guarda con el informe para que la cita no dependa de la base vigente). */
export type FuenteCitada = { n: number; hecho: string; titulo: string; editor: string; fecha: string; url: string; nota?: string };
export type CruceItem = { titulo: string; lectura: string; variables: string[] };
export type MadInformeIA = {
  version?: number;
  titulo: string;
  hipotesis_central?: string;
  resumen: string[];
  contexto_empresa?: string;
  patrones?: CruceItem[];
  lineas: { linea: string; lectura: string; causa?: string; riesgo?: string; variables_clave?: string[] }[];
  dimensiones: { dimension: string; lectura: string }[];
  fortalezas: { variable: string; por_que: string }[];
  brechas: { variable: string; que_revela: string; causa_raiz?: string; efecto_en?: string[]; evidencia_a_verificar: string; referente: string }[];
  percepcion_evidencia: string;
  preparacion_ia: string;
  ia_condiciones?: string[];
  sector?: {
    lectura: string;
    industria?: string;
    comparacion?: { practica: string; industria: string; organizacion: string; posicion: Posicion; variables: string[] }[];
    lineas: { linea: string; exigencia: Exigencia; posicion: Posicion; que_exige: string; lectura: string }[];
    oportunidades: CruceItem[];
    riesgos: CruceItem[];
    regulatorio?: string;
  };
  estrategia?: { prioridad: string; dependencia: Exigencia; variables: string[]; lectura: string }[];
  prioridades: { orden: number; variable: string; por_que_ahora?: string; primer_paso: string; resultado_esperado: string; plazo?: string; esfuerzo?: Grado; impacto?: Grado }[];
  ruta: { horizonte: string; foco: string; hitos?: string[] }[];
  escenarios?: { si_no_se_actua: string; si_se_ejecuta: string };
  indicadores?: { indicador: string; linea_base: string; meta: string; fuente: string }[];
  preguntas: string[];
  nota_metodologica: string;
  fuentes?: FuenteCitada[];
};

/** Lectura personal de la percepción de una persona. */
export type MadLecturaIA = {
  titulo: string;
  resumen: string[];
  lineas: { linea: string; lectura: string }[];
  confianza: { afirmacion: string; lectura: string }[];
  alertas: { afirmacion: string; lectura: string }[];
  puntos_ciegos?: string;
  preguntas: string[];
  nota: string;
};

/** Mínimos para pedir el análisis: una cuarta parte de las variables con dato; la mitad de las afirmaciones respondidas. */
export const minimoInforme = (ins: MadInstrument) => Math.ceil(ins.variables.length / 4);
export const minimoLectura = (ins: MadInstrument) => Math.ceil(ins.variables.length / 2);
export const conDato = (ins: MadInstrument, caps: Captures) => ins.variables.filter((v) => typeof caps[v.id]?.perception === "number" || typeof caps[v.id]?.level === "number").length;
export const respuestasValidas = (ins: MadInstrument, answers: Record<string, number>) => ins.variables.filter((v) => (answers[v.id] ?? 0) >= 1).length;

const f = (x: number | null | undefined, d = 1) => (x == null ? "—" : x.toFixed(d).replace(".", ","));
const f0 = (x: number | null | undefined) => (x == null ? "—" : String(Math.round(x)));
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sujeto = (ins: MadInstrument) => (ins.kind === "educativa" ? "la institución" : "la empresa");
const lineaDe = (ins: MadInstrument, v: MadVariable) => ins.lines.find((l) => l.n === v.line)!;
const dimDe = (ins: MadInstrument, v: MadVariable) => ins.dimensions.find((d) => d.key === v.dimension)?.name ?? v.dimension;

/** El instrumento y sus reglas, en compacto: lo que el modelo necesita para leer con criterio. */
function contextoInstrumento(ins: MadInstrument): string {
  return [
    `INSTRUMENTO: ${ins.name}. ${ins.intro}`,
    `Líneas (peso en el índice general): ${ins.lines.map((l) => `${l.code} ${l.name} (${Math.round(l.weight * 100)} %)`).join("; ")}.`,
    `Dimensiones: ${ins.dimensions.map((d) => d.name).join(", ")}. Cada celda línea × dimensión tiene tres o más variables.`,
    `Dimensiones transversales: ${D7_KEYS.map((k) => `${k} ${ins.d7[k].name}`).join("; ")}.`,
    `Escala de nivel de madurez de 1 a 5, asignada por el advisor contra la rúbrica de cada variable: ${MAD_LEVELS.map((l) => `${l.n} ${l.name} (${l.desc})`).join(" ")}`,
    `Índice de 0 a 100: ${INDEX_LEVELS.map((l) => `${l.name} ${l.min}–${l.max}`).join(", ")}.`,
    "Reglas de cálculo: la percepción P es el promedio de lo que responden las personas (escala 1 a 5 llevada a 0–100). La evidencia E = 0,25·documentación + 0,35·implementación + 0,40·indicadores (cada una calificada de 0 a 4 y llevada a 0–100): pesa más el resultado, porque una política sin uso ni medición no crea valor. La puntuación verificada S = 0,40·P + 0,60·E y alimenta los índices. Brecha P − E mayor a 20 puntos: sobreestimación (se cree más de lo que se demuestra); menor a −20: práctica invisible (se hace más de lo que la gente percibe). Evidencia suficiente: documentada e implementada al menos parcialmente y medida alguna vez.",
    `Estado de una práctica según su evidencia: ${PRACTICE_STATES.map((s) => s.label).join(" → ")}.`,
  ].join("\n");
}

/** Variables en foco: las de menor nivel y las de mayor distancia a la meta, con la rúbrica de su nivel y del siguiente. */
function enFoco(ins: MadInstrument, caps: Captures, n = 8): MadVariable[] {
  return ins.variables
    .filter((v) => typeof caps[v.id]?.level === "number")
    .map((v) => { const c = caps[v.id]; return { v, falta: (c.target ?? 5) - c.level!, nivel: c.level! }; })
    .sort((a, b) => b.falta - a.falta || a.nivel - b.nivel)
    .slice(0, n).map((x) => x.v);
}

export type EntradaInforme = {
  empresa: { name: string; sector?: string };
  contexto?: string;
  ins: MadInstrument;
  caps: Captures;
  sg: SafeguardState;
  medicion: { etiqueta: string; fecha: string; publicada: boolean };
  participacion: { personas: number; completas: number };
  previo?: { etiqueta: string; caps: Captures } | null;
  /** Hechos del sector, numerados: el modelo los cita por número entre corchetes. */
  hechos?: { n: number; hecho: string; editor: string; fecha: string; nota?: string }[];
  /** Prioridades estratégicas de la empresa (nombre y resultado esperado), para cruzarlas con la madurez. */
  prioridades?: { nombre: string; desc?: string }[];
};

const SISTEMA_INFORME = (ins: MadInstrument) => `Eres el advisor senior de transformación digital de la plataforma Gestión estratégica. Escribes informes de resultados del diagnóstico de madurez digital para ${ins.kind === "educativa" ? "los órganos de dirección de instituciones de educación superior" : "comités directivos de empresas medianas"} en Colombia y Ecuador: profundos, concretos, en español neutro de Colombia, con tono profesional y directo, sin halagos vacíos ni jerga de moda. Analizas a la organización, nunca a las personas que respondieron. Cada afirmación se apoya en las cifras y los hallazgos recibidos: no inventes cifras, sistemas, proveedores, nombres ni hechos que no estén en la entrada. Distingue siempre la percepción (lo que la gente cree) de la evidencia (lo que se demuestra con documentos, uso real e indicadores). Donde falte evidencia o nivel, dilo y enuncia la lectura como hipótesis a verificar («la lectura sugiere», «habría que verificar»). Un promedio aceptable no borra una variable débil. No repitas la entrada: interprétala, explica por qué ocurre y qué consecuencia tiene para el negocio. Nombra las variables por su identificador y su nombre, y usa las cifras exactas recibidas (nivel, índice, percepción, evidencia). Cuando te apoyes en un hecho del sector, cítalo con su número entre corchetes, por ejemplo [4]; solo existen los números que recibes. Para comparar a la organización con las empresas de su misma industria usa únicamente las cifras de adopción digital y las iniciativas de otras empresas que aparecen en los hechos; no existe un promedio de madurez digital del sector, así que no lo afirmes: compara práctica por práctica, y si para una línea no hay hechos de la industria, dilo en vez de suponer. Respondes solo con un objeto JSON válido, sin texto adicional.`;

const FORMATO_DIAGNOSTICO = `Devuelve un objeto JSON con exactamente estas claves:
{
 "titulo": string (máximo 12 palabras; la idea principal del informe, sin el nombre de la organización),
 "hipotesis_central": string (una frase de 30-45 palabras: la lectura que ordena todo lo demás, con la cifra que más la sostiene),
 "resumen": string[] (cuatro párrafos de 80-130 palabras: 1. dónde está hoy la organización, con sus cifras; 2. qué lo explica, la causa común detrás de las variables débiles; 3. cómo se relaciona con lo que el sector y la estrategia le exigen; 4. qué está en juego si no se actúa y qué cambia si se actúa),
 "contexto_empresa": string (80-130 palabras: cómo dialoga esta medición con las prioridades, objetivos, iniciativas y cifras recibidas; si el contexto es escaso, dilo y señala qué dato cambiaría la lectura),
 "patrones": [{"titulo": string (máximo 8 palabras), "lectura": string (60-100 palabras: un patrón que atraviesa varias líneas, por ejemplo prácticas documentadas que no se miden, o tecnología disponible sin adopción; qué lo causa y qué efecto tiene), "variables": string[] (de tres a seis identificadores de variable que lo evidencian)}] (tres o cuatro patrones),
 "lineas": [{"linea": "código · nombre", "lectura": string (90-140 palabras: qué muestran su nivel, su índice, su percepción y su evidencia; cuáles variables la sostienen y cuáles la frenan, con sus cifras), "causa": string (30-50 palabras: la causa más probable de su nivel actual), "riesgo": string (25-45 palabras: qué pasa en el negocio si esta línea no avanza), "variables_clave": string[] (de dos a cuatro identificadores: las que más mueven la línea)}] (todas las líneas, en el orden recibido),
 "dimensiones": [{"dimension": "nombre", "lectura": string (40-70 palabras)}] (todas las dimensiones),
 "fortalezas": [{"variable": "ID · nombre", "por_que": string (40-70 palabras: qué la sostiene según la evidencia y cómo aprovecharla)}] (tres a cinco; lista vacía si ninguna variable tiene evidencia que la respalde),
 "brechas": [{"variable": "ID · nombre", "que_revela": string (50-90 palabras), "causa_raiz": string (25-45 palabras), "efecto_en": string[] (identificadores de otras variables que dependen de esta; de una a cuatro), "evidencia_a_verificar": string (qué documento, uso o indicador comprobaría la práctica), "referente": string (el referente contra el que se evalúa la variable)}] (cinco a siete, de mayor a menor efecto sobre las demás),
 "percepcion_evidencia": string (120-180 palabras: qué dice la distancia entre lo que la gente percibe y lo que se demuestra; nombra las variables con sobreestimación o con práctica invisible y qué conversación abre cada grupo; si no hay evidencia calificada, dilo y explica qué no se puede concluir todavía),
 "preparacion_ia": string (100-160 palabras: lectura del índice de preparación para inteligencia artificial, sus componentes y sus salvaguardas; qué casos de uso son razonables hoy y cuáles no; si no hay datos suficientes, dilo),
 "ia_condiciones": string[] (tres o cuatro condiciones concretas que deben cumplirse antes de escalar inteligencia artificial, cada una en 15-30 palabras),
 "nota_metodologica": string (50-90 palabras: cobertura de la medición, qué falta por capturar y cómo cambiaría la lectura al completarla)
}`;

const FORMATO_CRUCE = `Devuelve un objeto JSON con exactamente estas claves:
{
 "sector": {
   "lectura": string (150-220 palabras: qué le exige hoy el sector a una organización como esta en lo digital, según los hechos numerados y la inteligencia del sector, y cómo queda la medición frente a esa exigencia; cita los hechos entre corchetes),
   "industria": string (160-240 palabras: cómo están las empresas de la misma industria en transformación digital, según las cifras de adopción y las iniciativas de otras empresas recibidas en los hechos: qué prácticas ya son comunes, cuáles apenas empiezan, qué han hecho los competidores nombrados y qué tan lejos o cerca queda la organización; cita los hechos entre corchetes; si los hechos no traen cifras de adopción ni iniciativas de otras empresas, dilo y explica qué dato haría falta),
   "comparacion": [{"practica": string (la práctica digital de la industria, en máximo 12 palabras), "industria": string (20-40 palabras: qué muestran los hechos sobre esa práctica en la industria, con su cifra y su cita entre corchetes), "organizacion": string (20-40 palabras: qué muestra la medición sobre la misma práctica: variable, nivel y evidencia), "posicion": "rezago" | "en_linea" | "ventaja", "variables": string[] (uno a tres identificadores de las variables comparadas)}] (cinco a ocho comparaciones, solo sobre prácticas con un hecho citado; lista vacía si no hay hechos de la industria),
   "lineas": [{"linea": "código · nombre", "exigencia": "alta" | "media" | "baja" (qué tanto presiona el sector sobre esta línea, según los hechos), "posicion": "rezago" | "en_linea" | "ventaja" (el nivel de la línea frente a esa exigencia), "que_exige": string (40-70 palabras: la exigencia concreta del sector sobre esta línea, con los hechos citados entre corchetes), "lectura": string (40-70 palabras: qué significa el nivel medido frente a esa exigencia y qué variable es el cuello de botella)}] (todas las líneas, en el orden recibido; lista vacía si no recibes hechos ni inteligencia del sector),
   "oportunidades": [{"titulo": string (máximo 9 palabras), "lectura": string (45-75 palabras: la oportunidad de mercado o de eficiencia que señalan los hechos y qué capacidad digital la habilita; cita los hechos), "variables": string[] (de dos a cuatro identificadores de las variables que habría que subir para capturarla)}] (tres o cuatro),
   "riesgos": [{"titulo": string (máximo 9 palabras), "lectura": string (45-75 palabras: el riesgo competitivo, regulatorio u operativo que señalan los hechos y por qué el nivel actual expone a la organización; cita los hechos), "variables": string[] (de dos a cuatro identificadores)}] (tres o cuatro),
   "regulatorio": string (80-120 palabras: qué exigen la regulación y los referentes del sector en datos, trazabilidad, calidad y seguridad de la información, y qué variables de la medición lo sostienen o lo ponen en riesgo; cadena vacía si no recibes información regulatoria)
 },
 "estrategia": [{"prioridad": string (el nombre exacto de la prioridad estratégica recibida), "dependencia": "alta" | "media" | "baja" (qué tanto depende esa prioridad de capacidades digitales), "variables": string[] (de tres a seis identificadores de las variables de las que depende), "lectura": string (40-70 palabras: si el nivel de esas variables sostiene el resultado que la prioridad promete o lo pone en riesgo, y por qué)}] (una por cada prioridad estratégica recibida; lista vacía si no recibes prioridades),
 "prioridades": [{"orden": 1, "variable": "ID · nombre", "por_que_ahora": string (30-50 palabras: por qué esta va antes que las demás; cita el hecho del sector o la prioridad estratégica que la vuelve urgente), "primer_paso": string (una actividad concreta para los próximos 90 días que lleve la variable al nivel siguiente de su rúbrica; solo la actividad, sin nombres de personas), "resultado_esperado": string (qué evidencia verificable quedaría al terminar), "plazo": "0 a 90 días" | "3 a 6 meses" | "6 a 12 meses", "esfuerzo": "bajo" | "medio" | "alto", "impacto": "bajo" | "medio" | "alto"}] (seis a ocho, ordenadas por impacto sobre esfuerzo),
 "ruta": [{"horizonte": "0 a 90 días" | "3 a 6 meses" | "6 a 12 meses", "foco": string (40-70 palabras: qué se instala en ese tramo y por qué en ese orden), "hitos": string[] (tres o cuatro hitos verificables, cada uno en 8-18 palabras)}] (los tres horizontes),
 "escenarios": {"si_no_se_actua": string (60-90 palabras: qué pasa en doce meses con el nivel actual, frente a lo que exigen el sector y la estrategia), "si_se_ejecuta": string (60-90 palabras: qué cambia si se ejecutan las prioridades, en términos de nivel de madurez y de resultado de negocio, sin prometer cifras que no estén en la entrada)},
 "indicadores": [{"indicador": string, "linea_base": string (la cifra de hoy tomada de la medición; si no existe, «sin medir»), "meta": string (la cifra o el estado a doce meses), "fuente": string (de dónde saldría el dato)}] (cinco o seis indicadores para seguir el avance),
 "preguntas": string[] (seis a ocho preguntas incómodas y útiles para la sesión de devolución con la dirección; al menos dos sobre el sector)
}`;

/** Encargo del informe de resultados de la medición. */
export function encargoMadInforme(a: EntradaInforme): { system: string; diagnostico: string; cruce: string } {
  const { ins, caps, sg, medicion, participacion, previo } = a;
  const pr = progressOf(ins, caps), general = overallLevel(ins, caps), idx = generalIndex(ins, caps), pc = practiceCounts(ins, caps), aiq = aiqOf(ins, caps, sg);
  const mediaDe = (pick: (v: MadVariable) => boolean, fn: typeof P) => media(ins.variables.filter(pick).map((v) => fn(caps[v.id])).filter((x): x is number => x !== null));
  const lineas = ins.lines.map((l) => {
    const n = lineLevel(ins, caps, l.n), i = lineIndex(ins, caps, l.n);
    const ant = previo ? lineLevel(ins, previo.caps, l.n) : null;
    return `${l.code} ${l.name}: nivel ${f(n)}${n !== null ? ` (${madLevelName(n)})` : ""} · índice ${f0(i)} · percepción media ${f0(mediaDe((v) => v.line === l.n, P))} · evidencia media ${f0(mediaDe((v) => v.line === l.n, E))}${ant !== null && n !== null ? ` · corte anterior ${f(ant)}` : ""}`;
  });
  const dims = ins.dimensions.map((d) => `${d.name}: nivel ${f(dimLevel(ins, caps, d.key))} · percepción media ${f0(mediaDe((v) => v.dimension === d.key, P))} · evidencia media ${f0(mediaDe((v) => v.dimension === d.key, E))}`);
  const d7 = D7_KEYS.map((k) => `${k} ${ins.d7[k].short}: ${f0(d7Index(ins, caps, k))}`).join("; ");
  const vars = ins.variables.map((v) => {
    const c = caps[v.id], g = gapPE(c);
    return `${v.id} · ${v.name} [${lineaDe(ins, v).code} · ${dimDe(ins, v)} · ${v.frame}]: percepción ${typeof c?.perception === "number" ? `${f(c.perception)} de 5${c.perceptionN ? ` (${c.perceptionN} resp.)` : ""}` : "—"} · D ${c?.d ?? "—"} I ${c?.i ?? "—"} K ${c?.k ?? "—"} · E ${f0(E(c))} · nivel ${c?.level ?? "—"} · meta ${c?.target ?? "—"}${g !== null && Math.abs(g) > 20 ? ` · brecha P−E ${g > 0 ? "+" : "−"}${f0(Math.abs(g))}` : ""}`;
  });
  const notas = ins.variables.filter((v) => caps[v.id]?.hallazgo || caps[v.id]?.recomendacion).map((v) => `${v.id}: ${caps[v.id].hallazgo ? `hallazgo «${caps[v.id].hallazgo}»` : ""}${caps[v.id].hallazgo && caps[v.id].recomendacion ? "; " : ""}${caps[v.id].recomendacion ? `recomendación «${caps[v.id].recomendacion}»` : ""}`);
  const foco = enFoco(ins, caps).map((v) => { const n = caps[v.id].level!; return `${v.id} (nivel ${n}, meta ${caps[v.id].target ?? "sin definir"}): hoy «${v.rubric[n - 1]}»${n < 5 ? `; nivel siguiente «${v.rubric[n]}»` : ""}`; });
  const sgTxt = ins.safeguards.map((s) => `${s.id} ${s.rule}: ${sg[s.id] ? SAFEGUARD_LABEL[sg[s.id].status] : "sin evaluar"}${s.cap !== null ? ` (si falla, techo ${s.cap})` : ""}`);
  const datos = [
    contextoInstrumento(ins),
    "",
    `ORGANIZACIÓN: ${a.empresa.name}${a.empresa.sector ? ` · ${a.empresa.sector}` : ""}.`,
    a.contexto ?? "",
    "",
    `MEDICIÓN: ${medicion.etiqueta} · ${medicion.fecha} · ${medicion.publicada ? "corte publicado" : "captura en curso: cifras provisionales"}.`,
    `Cobertura: percepción en ${pr.perception} de ${pr.total} variables; evidencia calificada en ${pr.dik}; nivel asignado en ${pr.level}. Respondieron la percepción ${participacion.personas} personas (${participacion.completas} con el cuestionario completo).`,
    `Madurez general: ${f(general)}${general !== null ? ` (${madLevelName(general)})` : ""}. Índice general: ${f0(idx)}${idx !== null ? ` (${indexLevel(idx).name})` : ""}. Cobertura de evidencia suficiente: ${f0(evidenceCoverage(ins, caps))} % de las variables.`,
    previo ? `Corte anterior «${previo.etiqueta}»: madurez general ${f(overallLevel(ins, previo.caps))}, índice general ${f0(generalIndex(ins, previo.caps))}.` : "No hay corte anterior con el cual comparar.",
    "Por línea:", ...lineas,
    "Por dimensión:", ...dims,
    `Índice por dimensión transversal: ${d7}.`,
    pc.n ? `Estado de las prácticas (${pc.n} variables con evidencia): ${PRACTICE_STATES.map((s) => `${s.label} ${pc.counts[s.key]}`).join(", ")}.` : "Estado de las prácticas: sin evidencia calificada todavía.",
    `Preparación para inteligencia artificial: índice ${f0(aiq.capped)}${aiq.capApplied ? ` (techo ${aiq.cap} por salvaguarda en falla; sin techo ${f0(aiq.raw)})` : ""}; preparación ${f0(aiq.preparacion)}, adopción e impacto ${f0(aiq.adopcion)}. Componentes: ${aiq.components.map((c) => `${c.name} ${f0(c.score)}`).join("; ")}.`,
    "Salvaguardas:", ...sgTxt,
    "",
    "VARIABLES (ID · nombre [línea · dimensión · referente]: percepción · evidencia D, I, K de 0 a 4 · E de 0 a 100 · nivel · meta):", ...vars,
    notas.length ? "\nHALLAZGOS Y RECOMENDACIONES REGISTRADOS POR EL ADVISOR (son hechos verificados: úsalos como base):" : "", ...notas,
    foco.length ? "\nVARIABLES EN FOCO, con su rúbrica (menor nivel o mayor distancia a la meta):" : "", ...foco,
    "",
    pr.level < pr.total || pr.dik < pr.total ? `MEDICIÓN PARCIAL: faltan ${pr.total - pr.level} variables por nivel y ${pr.total - pr.dik} por evidencia. Las variables con «—» no se interpretan como debilidad: son dato pendiente. Deja explícito en el resumen y en la nota metodológica qué tan provisional es la lectura.` : "",
    a.hechos?.length ? "\nHECHOS DEL SECTOR (numerados; cítalos por número entre corchetes cuando te apoyes en ellos):" : "\nHECHOS DEL SECTOR: no hay una base de hechos cargada para este sector; apóyate solo en la inteligencia del sector del contexto y no cites números entre corchetes.",
    ...(a.hechos ?? []).map((h) => `[${h.n}] ${h.hecho} (${h.editor}, ${h.fecha}${h.nota ? `; ${h.nota}` : ""})`),
    a.prioridades?.length ? "\nPRIORIDADES ESTRATÉGICAS DE LA ORGANIZACIÓN (usa estos nombres exactos):" : "",
    ...(a.prioridades ?? []).map((p, i) => `${i + 1}. ${p.nombre}${p.desc ? ` — ${p.desc}` : ""}`),
  ].filter((x) => x !== "").join("\n");
  const cierre = `Las prioridades salen de las variables en foco y de los hallazgos registrados; el primer paso lleva la variable al nivel siguiente de su rúbrica.`;
  return {
    system: SISTEMA_INFORME(ins),
    diagnostico: `${datos}\n\nEscribe la primera parte del informe de resultados del diagnóstico de transformación digital de ${sujeto(ins)}: el diagnóstico interno. Otra parte del informe cruza la medición con el sector y la estrategia y propone el plan; aquí concéntrate en explicar dónde está la organización y por qué.\n${FORMATO_DIAGNOSTICO}`,
    cruce: `${datos}\n\nEscribe la segunda parte del informe de resultados del diagnóstico de transformación digital de ${sujeto(ins)}: el cruce de la medición con el sector y con la estrategia de la organización, y el plan que se deriva. ${cierre}\n${FORMATO_CRUCE}`,
  };
}

const SISTEMA_LECTURA = (ins: MadInstrument) => `Eres el advisor senior de transformación digital de la plataforma Gestión estratégica. Le devuelves a una persona de ${sujeto(ins)} la lectura de su diagnóstico de percepción: cómo ve ella hoy las prácticas digitales de la organización. Escribes en español neutro de Colombia, en segunda persona (tú), con tono cercano, profesional y directo, sin halagos vacíos. Es su mirada sobre la organización: no es una evaluación de la persona ni el nivel de madurez de ${sujeto(ins)}, que solo se conoce cuando el advisor contraste la percepción con la evidencia. Todo se enuncia como percepción o hipótesis («ves», «tu lectura sugiere», «valdría la pena contrastar»). No inventes hechos, sistemas ni cifras que no estén en la entrada. Respondes solo con un objeto JSON válido, sin texto adicional.`;

const FORMATO_LECTURA = `Devuelve un objeto JSON con exactamente estas claves:
{
 "titulo": string (máximo 10 palabras: la idea principal de su mirada),
 "resumen": string[] (dos párrafos de 50-90 palabras: qué patrón muestran sus respuestas y qué conversación abre),
 "lineas": [{"linea": "código · nombre", "lectura": string (35-60 palabras: cómo ve esa línea y qué contrastaría)}] (todas las líneas, en el orden recibido),
 "confianza": [{"afirmacion": string (el nombre de la práctica, sin el identificador), "lectura": string (20-35 palabras: qué sugiere que la vea así y qué evidencia lo confirmaría)}] (dos a cuatro de las que valoró más alto; lista vacía si no valoró ninguna con 4 o 5),
 "alertas": [{"afirmacion": string (el nombre de la práctica, sin el identificador), "lectura": string (20-35 palabras: qué podría estar pasando y qué preguntaría)}] (tres a cinco de las que valoró más bajo; lista vacía si no valoró ninguna con 1 o 2),
 "puntos_ciegos": string (30-60 palabras sobre las afirmaciones que marcó «No lo sé»: qué dice eso sobre cómo circula la información; cadena vacía si no marcó ninguna),
 "preguntas": string[] (tres o cuatro preguntas para llevar a la conversación con su equipo o con la dirección),
 "nota": string (30-50 palabras: recuerda que es su percepción, que se promedia con la de las demás personas y que el nivel de madurez sale de contrastarla con la evidencia)
}`;

/** Encargo de la lectura personal de la percepción. */
export function encargoMadLectura(a: { empresa: { name: string; sector?: string }; ins: MadInstrument; answers: Record<string, number>; persona: { nombre: string; rol: string }; fecha: string }): { system: string; user: string } {
  const { ins, answers } = a;
  const val = (v: MadVariable) => answers[v.id];
  const lineas = ins.lines.map((l) => {
    const vs = ins.variables.filter((v) => v.line === l.n), xs = vs.map(val).filter((x) => typeof x === "number" && x >= 1);
    return `${l.code} ${l.name}: promedio ${f(media(xs))} de 5 (${xs.length} de ${vs.length} afirmaciones valoradas; ${vs.filter((v) => val(v) === 0).length} «No lo sé»)`;
  });
  const dims = ins.dimensions.map((d) => `${d.name}: ${f(media(ins.variables.filter((v) => v.dimension === d.key).map(val).filter((x) => typeof x === "number" && x >= 1)))} de 5`).join("; ");
  const resp = ins.variables.map((v) => {
    const x = val(v), t = v.items.find((i) => i.type === "likert")?.text ?? v.name;
    return `${v.id} · ${v.name} [${lineaDe(ins, v).code} · ${dimDe(ins, v)}]: «${t}» → ${x === undefined ? "sin responder" : x === 0 ? "No lo sé" : `${x} (${PERCEPTION_SCALE[x - 1]})`}`;
  });
  const user = [
    `INSTRUMENTO: ${ins.name}. Líneas: ${ins.lines.map((l) => `${l.code} ${l.name}`).join("; ")}. Dimensiones: ${ins.dimensions.map((d) => d.name).join(", ")}.`,
    `Cada afirmación describe una práctica instalada; la persona indica qué tan de acuerdo está, de 1 (${PERCEPTION_SCALE[0]}) a 5 (${PERCEPTION_SCALE[4]}), o «No lo sé».`,
    "",
    `ORGANIZACIÓN: ${a.empresa.name}${a.empresa.sector ? ` · ${a.empresa.sector}` : ""}.`,
    `PERSONA: ${a.persona.nombre} (${a.persona.rol}). Respuestas guardadas el ${a.fecha}: ${respuestasValidas(ins, answers)} valoradas, ${ins.variables.filter((v) => val(v) === 0).length} «No lo sé», ${ins.variables.filter((v) => val(v) === undefined).length} sin responder, de ${ins.variables.length}.`,
    "Promedio por línea:", ...lineas,
    `Promedio por dimensión: ${dims}.`,
    "",
    "RESPUESTAS:", ...resp,
    "",
    "Escribe la lectura personal de este diagnóstico de percepción.",
    FORMATO_LECTURA,
  ].join("\n");
  return { system: SISTEMA_LECTURA(ins), user };
}

/* ═══ Validación de lo que responde el modelo ═══ */

const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const arr = <T,>(v: unknown, fn: (x: Record<string, unknown>) => T | null): T[] => (Array.isArray(v) ? v.map((x) => fn((x ?? {}) as Record<string, unknown>)).filter((x): x is T => x !== null) : []);
const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : typeof v === "string" && v.trim() ? v.split(/\n\n+/).map((x) => x.trim()).filter(Boolean) : []);

const ids = (v: unknown, max = 8) => (Array.isArray(v) ? [...new Set(v.map((x) => s(x, 120).split("·")[0].trim()).filter(Boolean))].slice(0, max) : []);
const enumDe = <T extends string>(v: unknown, vals: readonly T[]): T | undefined => { const t = s(v, 40).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_"); return vals.find((x) => x === t); };
const GRADOS = ["bajo", "medio", "alto"] as const;
const cruce = (v: unknown): CruceItem[] => arr(v, (x) => (s(x.titulo) ? { titulo: s(x.titulo, 160), lectura: s(x.lectura, 1200), variables: ids(x.variables) } : null));

/** Números de hecho citados entre corchetes en cualquier texto del informe: [3], [3][7] o [3, 7]. */
export function citasDe(informe: unknown): number[] {
  const out = new Set<number>();
  for (const m of JSON.stringify(informe ?? "").matchAll(/\[(\d{1,3}(?:\s*[,;y]\s*\d{1,3})*)\]/g)) for (const n of m[1].split(/[^\d]+/)) if (n) out.add(Number(n));
  return [...out].sort((a, b) => a - b);
}

/** Valida y normaliza el informe. Recibe la respuesta del modelo: las dos partes (diagnóstico y cruce) ya unidas en un objeto. */
export function parseMadInforme(raw: unknown): MadInformeIA {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sec = (o.sector ?? null) as Record<string, unknown> | null;
  const esc = (o.escenarios ?? null) as Record<string, unknown> | null;
  const sector: MadInformeIA["sector"] = sec && s(sec.lectura) ? {
    lectura: s(sec.lectura, 2600),
    industria: s(sec.industria, 2800) || undefined,
    comparacion: arr(sec.comparacion, (x) => { const posicion = enumDe(x.posicion, ["rezago", "en_linea", "ventaja"] as const); return s(x.practica) && posicion ? { practica: s(x.practica, 200), industria: s(x.industria, 700), organizacion: s(x.organizacion, 700), posicion, variables: ids(x.variables, 4) } : null; }),
    lineas: arr(sec.lineas, (x) => { const exigencia = enumDe(x.exigencia, ["alta", "media", "baja"] as const), posicion = enumDe(x.posicion, ["rezago", "en_linea", "ventaja"] as const); return s(x.linea) && exigencia && posicion ? { linea: s(x.linea, 160), exigencia, posicion, que_exige: s(x.que_exige, 1000), lectura: s(x.lectura, 1000) } : null; }),
    oportunidades: cruce(sec.oportunidades), riesgos: cruce(sec.riesgos),
    regulatorio: s(sec.regulatorio, 1800) || undefined,
  } : undefined;
  const informe: MadInformeIA = {
    version: 2,
    titulo: s(o.titulo, 160) || "Informe de resultados",
    hipotesis_central: s(o.hipotesis_central, 600) || undefined,
    resumen: strs(o.resumen),
    contexto_empresa: s(o.contexto_empresa, 1800) || undefined,
    patrones: cruce(o.patrones),
    lineas: arr(o.lineas, (x) => (s(x.linea) ? { linea: s(x.linea, 160), lectura: s(x.lectura, 1800), causa: s(x.causa, 700) || undefined, riesgo: s(x.riesgo, 700) || undefined, variables_clave: ids(x.variables_clave, 6) } : null)),
    dimensiones: arr(o.dimensiones, (x) => (s(x.dimension) ? { dimension: s(x.dimension, 120), lectura: s(x.lectura, 1000) } : null)),
    fortalezas: arr(o.fortalezas, (x) => (s(x.variable) ? { variable: s(x.variable, 200), por_que: s(x.por_que, 1000) } : null)),
    brechas: arr(o.brechas, (x) => (s(x.variable) ? { variable: s(x.variable, 200), que_revela: s(x.que_revela, 1200), causa_raiz: s(x.causa_raiz, 700) || undefined, efecto_en: ids(x.efecto_en, 6), evidencia_a_verificar: s(x.evidencia_a_verificar, 600), referente: s(x.referente, 200) } : null)),
    percepcion_evidencia: s(o.percepcion_evidencia, 2400),
    preparacion_ia: s(o.preparacion_ia, 2400),
    ia_condiciones: strs(o.ia_condiciones).slice(0, 6),
    sector,
    estrategia: arr(o.estrategia, (x) => (s(x.prioridad) ? { prioridad: s(x.prioridad, 200), dependencia: enumDe(x.dependencia, ["alta", "media", "baja"] as const) ?? "media", variables: ids(x.variables), lectura: s(x.lectura, 1000) } : null)),
    prioridades: arr(o.prioridades, (x) => (s(x.variable) ? { orden: num(x.orden) ?? 0, variable: s(x.variable, 200), por_que_ahora: s(x.por_que_ahora, 800) || undefined, primer_paso: s(x.primer_paso, 800), resultado_esperado: s(x.resultado_esperado, 600), plazo: s(x.plazo, 40) || undefined, esfuerzo: enumDe(x.esfuerzo, GRADOS), impacto: enumDe(x.impacto, GRADOS) } : null)).sort((a, b) => a.orden - b.orden),
    ruta: arr(o.ruta, (x) => (s(x.horizonte) ? { horizonte: s(x.horizonte, 60), foco: s(x.foco, 1000), hitos: strs(x.hitos).slice(0, 6) } : null)),
    escenarios: esc && (s(esc.si_no_se_actua) || s(esc.si_se_ejecuta)) ? { si_no_se_actua: s(esc.si_no_se_actua, 1200), si_se_ejecuta: s(esc.si_se_ejecuta, 1200) } : undefined,
    indicadores: arr(o.indicadores, (x) => (s(x.indicador) ? { indicador: s(x.indicador, 200), linea_base: s(x.linea_base, 200), meta: s(x.meta, 200), fuente: s(x.fuente, 200) } : null)),
    preguntas: strs(o.preguntas),
    nota_metodologica: s(o.nota_metodologica, 1500),
  };
  if (!informe.resumen.length || !informe.lineas.length) throw new Error("El modelo devolvió un informe incompleto; inténtalo de nuevo.");
  return informe;
}

export function parseMadLectura(raw: unknown): MadLecturaIA {
  const o = (raw ?? {}) as Record<string, unknown>;
  const par = (v: unknown) => arr(v, (x) => (s(x.afirmacion) ? { afirmacion: s(x.afirmacion, 200), lectura: s(x.lectura, 700) } : null));
  const lectura: MadLecturaIA = {
    titulo: s(o.titulo, 160) || "Tu lectura",
    resumen: strs(o.resumen),
    lineas: arr(o.lineas, (x) => (s(x.linea) ? { linea: s(x.linea, 160), lectura: s(x.lectura, 900) } : null)),
    confianza: par(o.confianza),
    alertas: par(o.alertas),
    puntos_ciegos: s(o.puntos_ciegos, 900) || undefined,
    preguntas: strs(o.preguntas),
    nota: s(o.nota, 900),
  };
  if (!lectura.resumen.length || !lectura.lineas.length) throw new Error("El modelo devolvió una lectura incompleta; inténtalo de nuevo.");
  return lectura;
}
