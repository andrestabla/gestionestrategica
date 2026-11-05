// Validación de alineación (asistida por IA): cada objetivo directivo del horizonte frente a la prioridad estratégica
// a la que pertenece y al conjunto de prioridades validadas por la dirección. Semáforo por objetivo con justificación y,
// si procede, recomendaciones técnicas de formulación o de forma. Reglas puras: encargo al modelo y lectura de su respuesta.
import { contextoMetodo } from "@/lib/informe-ia";

export type Semaforo = "verde" | "amarillo" | "rojo";
export type Naturaleza = "objetivo" | "resultado_clave" | "iniciativa" | "ambiguo";
export type AlineacionItem = { id: string; color: Semaforo; justificacion: string; recomendaciones: string[]; naturaleza: Naturaleza; duplicaDe: string[]; reformulacion: string; indicadorPropuesto: string; faltan: string[] };
/** Elementos de la estructura metodológica que el modelo marca como ausentes. */
export const ELEMENTOS: Record<string, string> = { verbo: "verbo de logro", resultado: "resultado concreto", indicador: "indicador impulsor", plazo: "para cuándo", prioridad: "aporte claro a la prioridad" };
export const NATURALEZA: Record<Naturaleza, string> = { objetivo: "objetivo", resultado_clave: "parece un resultado clave", iniciativa: "parece una iniciativa", ambiguo: "enunciado ambiguo" };
export type AlineacionIA = { horizon: string; items: AlineacionItem[]; resumen: string };

export const SEMAFORO: Record<Semaforo, { label: string; chip: string; color: string }> = {
  verde: { label: "Alineado", chip: "chip chip-ok", color: "var(--ok)" },
  amarillo: { label: "Parcialmente alineado", chip: "chip chip-gold", color: "var(--warn)" },
  rojo: { label: "No alineado", chip: "chip chip-bad", color: "var(--bad)" },
};

export function encargoAlineacion(args: {
  empresa: { name: string; sector?: string; size?: string };
  horizonte: string;
  prioridades: { id: string; order: number; name: string; indicator?: string; desc?: string; sponsor?: string }[];
  objetivos: { id: string; lever?: string; name: string; desc?: string; indicator?: string; pillar?: string; perspective?: string; krs: number; krNombres?: string[]; iniciativas?: string[] }[];
  lineaBase?: string;
  contexto?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    "TAREA: validar la ALINEACIÓN de cada objetivo directivo del horizonte con la prioridad estratégica a la que pertenece, con el conjunto de prioridades y con el resto de objetivos. Las prioridades ya fueron validadas por la dirección: no se cuestionan ni se reformulan; se evalúan los objetivos frente a ellas. Lee el CONJUNTO completo antes de juzgar cada uno: detecta duplicidades o solapamientos entre objetivos (de la misma o de distinta prioridad), prioridades sin objetivo o sobrecargadas y enunciados que no son objetivos.",
    "DEFINICIÓN (marco 4Shine Empresas): un objetivo directivo es el resultado concreto que la dirección se compromete a lograr en el horizonte para hacer avanzar una prioridad. Estructura: VERBO DE LOGRO + RESULTADO + INDICADOR IMPULSOR + PARA CUÁNDO. Declara el indicador impulsor pero NO fija cifras de base y meta: eso corresponde a los resultados clave, que se formulan después. NATURALEZA: si el enunciado ya trae base y meta numérica como su contenido central, es un «resultado_clave»; si describe algo que se hace o se implementa (un proyecto, un sistema, un comité, una campaña), es una «iniciativa»; si no se puede decidir, «ambiguo».",
    "CRITERIOS (en este orden): 1) contribución directa del objetivo a su prioridad y al indicador de la prioridad; 2) naturaleza: que sea un objetivo y no un resultado clave ni una iniciativa; 3) no duplicidad ni solapamiento con otros objetivos del conjunto; 4) pertinencia frente al sector, el negocio y los datos de la empresa (contexto adjunto); 5) formulación técnica: verbo de logro, resultado observable, indicador impulsor declarado, plazo, un solo logro por enunciado; 6) forma: longitud, claridad, coherencia entre nombre, aspiración e indicador impulsor.",
    "EXIGENCIA: sé estricto y exigente, como un advisor senior que revisa antes de un comité. Un objetivo solo es «verde» si cumple TODO a la vez: a) aporta de forma directa e inequívoca al indicador de su prioridad; b) tiene los cuatro elementos de la estructura (verbo de logro, resultado concreto, indicador impulsor declarado, para cuándo); c) es un objetivo (no un resultado clave ni una iniciativa); d) no duplica ni se solapa con otro; e) es coherente con el sector, el mercado y la posición de la empresa (usa el contexto: participación, crecimiento, canales, clases terapéuticas, regulación). Si falta cualquiera de esos elementos o hay dudas razonables, es «amarillo». Es «rojo» si no aporta a su prioridad, pertenece claramente a otra, contradice el contexto, duplica a otro objetivo o no es un objetivo (resultado clave, iniciativa, deseo vago o lista). La ortografía, las mayúsculas sostenidas y los errores de redacción cuentan como problemas de forma.",
    "FALTAN: para cada objetivo lista los elementos ausentes con estos códigos: verbo, resultado, indicador, plazo, prioridad (vacío si no falta ninguno).",
    "RECOMENDACIONES: SIEMPRE, para todo objetivo que no sea verde, de 1 a 4 recomendaciones puntuales de QUÉ HACER, cada una empezando con un verbo en imperativo y con el detalle concreto, por ejemplo: «Integrar OE-03 y OE-11 en un solo objetivo: …», «Eliminar el verbo \"implementar\" y formular el logro: …», «Cambiar la redacción a: \"…\"», «Mover a la prioridad Disciplina Operacional, porque …», «Convertir en resultado clave de OE-02», «Declarar el indicador impulsor: …», «Fijar el plazo: cierre de 2027». Nada de generalidades: nombra siempre el objetivo, la prioridad, el verbo o el indicador concretos. En verde, incluye igualmente una recomendación de mejora si existe (puede ir vacía solo si no hay nada que mejorar).",
    "REFORMULACIÓN: para todo objetivo amarillo o rojo escribe en «reformulacion» la redacción propuesta completa, en una sola frase con la estructura verbo de logro + resultado + indicador impulsor + para cuándo, en español de Colombia, sin cifras de meta (esas van en los resultados clave) y coherente con los datos de la empresa; si el enunciado es en realidad un resultado clave o una iniciativa, propón el objetivo del que debería colgar. En verde puede ir vacía. En «indicadorPropuesto» escribe el indicador impulsor que recomiendas (vacío si el declarado está bien).",
    "Responde solo JSON con esta forma exacta: {\"items\":[{\"id\":\"OE-01\",\"color\":\"verde|amarillo|rojo\",\"naturaleza\":\"objetivo|resultado_clave|iniciativa|ambiguo\",\"duplicaDe\":[\"OE-05\"],\"faltan\":[\"indicador\",\"plazo\"],\"justificacion\":\"2 a 4 frases\",\"recomendaciones\":[\"…\"],\"reformulacion\":\"…\",\"indicadorPropuesto\":\"…\"}],\"resumen\":\"3 a 5 frases sobre la alineación del conjunto: prioridades sin objetivo o sobrecargadas, patrones de formulación y qué conviene resolver primero. No escribas conteos ni cifras de objetivos por color: la plataforma los calcula y los muestra aparte\"}. Un item por objetivo recibido, con su id exacto.",
  ].filter(Boolean).join("\n\n");
  const prios = args.prioridades.map((p) => `- ${p.id} (${p.order}) «${p.name}»${p.indicator ? ` · indicador: ${p.indicator}` : ""}${p.desc ? ` · ${p.desc}` : ""}${p.sponsor ? ` · sponsor: ${p.sponsor}` : ""}`).join("\n");
  const objs = args.objetivos.map((o) => `- ${o.id} [prioridad ${o.lever ?? "sin prioridad"}${o.perspective ? ` · perspectiva ${o.perspective}` : ""}${o.pillar ? ` · pilar «${o.pillar}»` : ""}] «${o.name}»${o.desc ? `\n  aspiración: ${o.desc}` : ""}${o.indicator ? `\n  indicador impulsor: ${o.indicator}` : ""}\n  resultados clave vinculados: ${o.krs}${o.krNombres?.length ? ` (${o.krNombres.join("; ")})` : ""}${o.iniciativas?.length ? `\n  iniciativas ya ligadas: ${o.iniciativas.join("; ")}` : ""}`).join("\n");
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}${args.empresa.size ? ` · ${args.empresa.size}` : ""}. Fecha: ${args.fecha}. Horizonte evaluado: ${args.horizonte}.`,
    args.contexto ? `CONTEXTO DE LA EMPRESA (sector, actividad, posición y datos abiertos):\n${args.contexto}` : "",
    `PRIORIDADES ESTRATÉGICAS (validadas por la dirección):\n${prios}`,
    args.lineaBase ? `LÍNEA BASE (resultados ya cerrados, para juzgar ambición y pertinencia):\n${args.lineaBase}` : "",
    `OBJETIVOS DIRECTIVOS DEL HORIZONTE ${args.horizonte}:\n${objs}`,
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Lee la respuesta del modelo: un item por objetivo esperado; lo que falte queda en amarillo con nota. */
export function parseAlineacion(raw: unknown, horizon: string, ids: string[]): AlineacionIA {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : [];
  const items: AlineacionItem[] = ids.map((id) => {
    const it = arr.find((x) => str(x?.id, 20).toUpperCase() === id.toUpperCase());
    if (!it) return { id, color: "amarillo", justificacion: "El modelo no devolvió lectura para este objetivo; conviene volver a validar.", recomendaciones: ["Volver a validar la alineación."], naturaleza: "objetivo", duplicaDe: [], reformulacion: "", indicadorPropuesto: "", faltan: [] };
    const c = str(it.color, 10).toLowerCase();
    const color: Semaforo = c === "verde" || c === "rojo" ? c : "amarillo";
    const recs = (Array.isArray(it.recomendaciones) ? it.recomendaciones : []).map((r) => str(r, 600)).filter(Boolean).slice(0, 6);
    const n = str(it.naturaleza, 20).toLowerCase();
    const naturaleza: Naturaleza = n === "resultado_clave" || n === "iniciativa" || n === "ambiguo" ? n : "objetivo";
    const duplicaDe = (Array.isArray(it.duplicaDe) ? it.duplicaDe : []).map((d) => str(d, 20).toUpperCase()).filter((d) => d && d !== id.toUpperCase() && ids.some((x) => x.toUpperCase() === d)).slice(0, 5);
    const faltan = (Array.isArray(it.faltan) ? it.faltan : []).map((f) => str(f, 20).toLowerCase()).filter((f) => f in ELEMENTOS);
    const reformulacion = str(it.reformulacion, 400);
    // exigencia: sin reformulación ni recomendación, un amarillo o rojo no es accionable; se anota para que el advisor lo complete
    if (color !== "verde" && !recs.length && !reformulacion) recs.push("Reformular el objetivo con la estructura verbo de logro + resultado + indicador impulsor + para cuándo.");
    const colorFinal: Semaforo = color === "verde" && (faltan.length || naturaleza !== "objetivo" || duplicaDe.length) ? "amarillo" : color;
    return { id, color: colorFinal, justificacion: str(it.justificacion, 1200) || "Sin justificación.", recomendaciones: recs, naturaleza, duplicaDe, reformulacion, indicadorPropuesto: str(it.indicadorPropuesto, 200), faltan };
  });
  return { horizon, items, resumen: str(o.resumen, 1500) };
}


/* ═══ Asistente de creación de objetivos ═══
   Con la prioridad elegida (y un borrador opcional), el modelo propone tres objetivos directivos bien formulados,
   coherentes con el contexto de la empresa y sin duplicar los que ya existen. Nada se guarda sin que la persona elija. */

export type PropuestaObjetivo = { name: string; desc: string; indicator: string; porque: string };

export function encargoPropuestaObjetivo(args: {
  empresa: { name: string; sector?: string; size?: string };
  horizonte: string;
  prioridad: { id: string; order: number; name: string; indicator?: string; desc?: string; sponsor?: string };
  otrasPrioridades: { id: string; name: string }[];
  existentes: { id: string; lever?: string; name: string; indicator?: string }[];
  borrador?: string; contexto?: string; lineaBase?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    "TAREA: proponer TRES objetivos directivos alternativos para la prioridad estratégica indicada, en el horizonte indicado. Cada propuesta debe ser distinta en enfoque (p. ej. una centrada en resultado de mercado, otra en capacidad o proceso, otra en cliente o acceso), ambiciosa pero posible con la capacidad y la posición de la empresa (usa el contexto: participación, crecimiento, canales, clases terapéuticas, regulación, resultados 2026) y NO duplicar ni solapar los objetivos ya existentes de esa prioridad ni de otras.",
    "DEFINICIÓN: un objetivo directivo es el resultado concreto que la dirección se compromete a lograr en el horizonte para hacer avanzar su prioridad. Estructura obligatoria de «name»: VERBO DE LOGRO + RESULTADO + INDICADOR IMPULSOR + PARA CUÁNDO, en una sola frase, sin cifras de base ni meta (eso va en los resultados clave, que se formulan después). Verbos de logro: alcanzar, consolidar, obtener, reducir, posicionar, asegurar; nunca «implementar», «gestionar», «trabajar en», «desarrollar un proyecto».",
    "Si hay un BORRADOR, úsalo como intención: la primera propuesta debe ser su versión corregida (misma intención, bien formulada); las otras dos, alternativas. Si el borrador es en realidad un resultado clave o una iniciativa, propón el objetivo del que debería colgar y dilo en «porque».",
    "Responde solo JSON: {\"propuestas\":[{\"name\":\"objetivo en una frase con la estructura\",\"desc\":\"aspiración: 1 o 2 frases sobre qué cambia en el negocio\",\"indicator\":\"indicador impulsor (nombre de la medida, sin meta)\",\"porque\":\"2 frases: por qué aporta a la prioridad y en qué dato del contexto se apoya\"}]}. Exactamente tres propuestas.",
  ].join("\n\n");
  const p = args.prioridad;
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}${args.empresa.size ? ` · ${args.empresa.size}` : ""}. Fecha: ${args.fecha}. Horizonte: ${args.horizonte}.`,
    args.contexto ? `CONTEXTO DE LA EMPRESA:\n${args.contexto}` : "",
    `PRIORIDAD ELEGIDA: ${p.id} (${p.order}) «${p.name}»${p.indicator ? ` · indicador: ${p.indicator}` : ""}${p.desc ? ` · ${p.desc}` : ""}${p.sponsor ? ` · sponsor: ${p.sponsor}` : ""}.`,
    args.otrasPrioridades.length ? `OTRAS PRIORIDADES (para no invadirlas): ${args.otrasPrioridades.map((o) => `${o.id} «${o.name}»`).join("; ")}.` : "",
    args.lineaBase ? `LÍNEA BASE (resultados 2026):\n${args.lineaBase}` : "",
    args.existentes.length ? `OBJETIVOS YA EXISTENTES (no los dupliques):\n${args.existentes.map((o) => `- ${o.id} [${o.lever ?? "sin prioridad"}] «${o.name}»${o.indicator ? ` · indicador: ${o.indicator}` : ""}`).join("\n")}` : "OBJETIVOS YA EXISTENTES: ninguno.",
    args.borrador ? `BORRADOR DE LA PERSONA: «${args.borrador}»` : "BORRADOR: ninguno; propone desde la prioridad.",
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

export function parsePropuestasObjetivo(raw: unknown): PropuestaObjetivo[] {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.propuestas) ? (o.propuestas as Record<string, unknown>[]) : [];
  return arr.map((p) => ({ name: str(p?.name, 300), desc: str(p?.desc, 600), indicator: str(p?.indicator, 200), porque: str(p?.porque, 600) })).filter((p) => p.name.length >= 10).slice(0, 3);
}
