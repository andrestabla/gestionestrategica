// Madurez digital con IA: la lectura personal de quien responde la percepción y el informe de
// resultados de la medición (corte publicado o captura en curso). Aquí viven el encargo al modelo
// (instrumento + reglas + datos de la medición) y la validación de su respuesta. Reglas puras: el
// servidor llama al modelo (src/server/ia.ts) y guarda el resultado con la huella de los datos.

import {
  MAD_LEVELS, INDEX_LEVELS, PERCEPTION_SCALE, PRACTICE_STATES, D7_KEYS, SAFEGUARD_LABEL,
  P, E, gapPE, madLevelName, indexLevel, lineLevel, lineIndex, dimLevel, overallLevel, generalIndex, d7Index, practiceCounts, evidenceCoverage, aiqOf, progressOf,
  type MadInstrument, type MadVariable, type Captures, type SafeguardState,
} from "@/lib/madurez";

/** Informe de resultados de la medición de la empresa. */
export type MadInformeIA = {
  titulo: string;
  hipotesis_central?: string;
  resumen: string[];
  contexto_empresa?: string;
  lineas: { linea: string; lectura: string }[];
  dimensiones: { dimension: string; lectura: string }[];
  fortalezas: { variable: string; por_que: string }[];
  brechas: { variable: string; que_revela: string; evidencia_a_verificar: string; referente: string }[];
  percepcion_evidencia: string;
  preparacion_ia: string;
  prioridades: { orden: number; variable: string; primer_paso: string; resultado_esperado: string }[];
  ruta: { horizonte: string; foco: string }[];
  preguntas: string[];
  nota_metodologica: string;
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
};

const SISTEMA_INFORME = (ins: MadInstrument) => `Eres el advisor senior de transformación digital de la plataforma Gestión estratégica. Escribes informes de resultados del diagnóstico de madurez digital para ${ins.kind === "educativa" ? "los órganos de dirección de instituciones de educación superior" : "comités directivos de empresas medianas"} en Colombia y Ecuador: profundos, concretos, en español neutro de Colombia, con tono profesional y directo, sin halagos vacíos ni jerga de moda. Analizas a la organización, nunca a las personas que respondieron. Cada afirmación se apoya en las cifras y los hallazgos recibidos: no inventes cifras, sistemas, proveedores, nombres ni hechos que no estén en la entrada. Distingue siempre la percepción (lo que la gente cree) de la evidencia (lo que se demuestra con documentos, uso real e indicadores). Donde falte evidencia o nivel, dilo y enuncia la lectura como hipótesis a verificar («la lectura sugiere», «habría que verificar»). Un promedio aceptable no borra una variable débil. No repitas la entrada: interprétala. Respondes solo con un objeto JSON válido, sin texto adicional.`;

const FORMATO_INFORME = `Devuelve un objeto JSON con exactamente estas claves:
{
 "titulo": string (máximo 12 palabras; la idea principal del informe, sin el nombre de la organización),
 "hipotesis_central": string (una frase de 25-40 palabras: la lectura que ordena todo lo demás),
 "resumen": string[] (tres párrafos de 60-110 palabras: dónde está hoy la organización, qué lo explica, qué está en juego si no se actúa),
 "contexto_empresa": string (60-110 palabras: cómo dialoga esta medición con las prioridades, objetivos, iniciativas y cifras del sector recibidos; si el contexto es escaso, dilo y señala qué dato cambiaría la lectura),
 "lineas": [{"linea": "código · nombre", "lectura": string (50-90 palabras: qué muestran su nivel, su índice y sus variables, y qué habría que verificar)}] (todas las líneas, en el orden recibido),
 "dimensiones": [{"dimension": "nombre", "lectura": string (25-45 palabras)}] (todas las dimensiones),
 "fortalezas": [{"variable": "ID · nombre", "por_que": string (30-55 palabras: qué la sostiene según la evidencia)}] (dos a cuatro; lista vacía si ninguna variable tiene evidencia que la respalde),
 "brechas": [{"variable": "ID · nombre", "que_revela": string (40-75 palabras), "evidencia_a_verificar": string (qué documento, uso o indicador comprobaría la práctica), "referente": string (el referente contra el que se evalúa la variable)}] (cuatro a seis, de mayor a menor efecto sobre las demás),
 "percepcion_evidencia": string (80-130 palabras: qué dice la distancia entre lo que la gente percibe y lo que se demuestra; nombra las variables con sobreestimación o con práctica invisible; si no hay evidencia calificada, dilo y explica qué no se puede concluir todavía),
 "preparacion_ia": string (70-120 palabras: lectura del índice de preparación para inteligencia artificial, sus componentes y sus salvaguardas; si no hay datos suficientes, dilo),
 "prioridades": [{"orden": 1, "variable": "ID · nombre", "primer_paso": string (una actividad concreta para los próximos 90 días que lleve la variable al nivel siguiente de su rúbrica; solo la actividad, sin nombres de personas), "resultado_esperado": string (qué evidencia verificable quedaría al terminar)}] (tres a cinco),
 "ruta": [{"horizonte": "0 a 90 días" | "3 a 6 meses" | "6 a 12 meses", "foco": string (30-55 palabras: qué se instala en ese tramo y por qué en ese orden)}] (los tres horizontes),
 "preguntas": string[] (cuatro a seis preguntas incómodas y útiles para la sesión de devolución con la dirección),
 "nota_metodologica": string (40-80 palabras: cobertura de la medición, qué falta por capturar y cómo cambiaría la lectura al completarla)
}`;

/** Encargo del informe de resultados de la medición. */
export function encargoMadInforme(a: EntradaInforme): { system: string; user: string } {
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
  const user = [
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
    `Escribe el informe de resultados del diagnóstico de transformación digital de ${sujeto(ins)}. Las prioridades salen de las variables en foco y de los hallazgos registrados; el primer paso lleva la variable al nivel siguiente de su rúbrica.`,
    FORMATO_INFORME,
  ].filter((x) => x !== "").join("\n");
  return { system: SISTEMA_INFORME(ins), user };
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

export function parseMadInforme(raw: unknown): MadInformeIA {
  const o = (raw ?? {}) as Record<string, unknown>;
  const informe: MadInformeIA = {
    titulo: s(o.titulo, 160) || "Informe de resultados",
    hipotesis_central: s(o.hipotesis_central, 500) || undefined,
    resumen: strs(o.resumen),
    contexto_empresa: s(o.contexto_empresa, 1500) || undefined,
    lineas: arr(o.lineas, (x) => (s(x.linea) ? { linea: s(x.linea, 160), lectura: s(x.lectura, 1200) } : null)),
    dimensiones: arr(o.dimensiones, (x) => (s(x.dimension) ? { dimension: s(x.dimension, 120), lectura: s(x.lectura, 800) } : null)),
    fortalezas: arr(o.fortalezas, (x) => (s(x.variable) ? { variable: s(x.variable, 200), por_que: s(x.por_que, 900) } : null)),
    brechas: arr(o.brechas, (x) => (s(x.variable) ? { variable: s(x.variable, 200), que_revela: s(x.que_revela, 1000), evidencia_a_verificar: s(x.evidencia_a_verificar, 600), referente: s(x.referente, 200) } : null)),
    percepcion_evidencia: s(o.percepcion_evidencia, 2000),
    preparacion_ia: s(o.preparacion_ia, 2000),
    prioridades: arr(o.prioridades, (x) => (s(x.variable) ? { orden: num(x.orden) ?? 0, variable: s(x.variable, 200), primer_paso: s(x.primer_paso, 800), resultado_esperado: s(x.resultado_esperado, 600) } : null)).sort((a, b) => a.orden - b.orden),
    ruta: arr(o.ruta, (x) => (s(x.horizonte) ? { horizonte: s(x.horizonte, 60), foco: s(x.foco, 900) } : null)),
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
