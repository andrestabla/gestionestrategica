// Validación de alineación (asistida por IA): cada objetivo directivo del horizonte frente a la prioridad estratégica
// a la que pertenece y al conjunto de prioridades validadas por la dirección. Semáforo por objetivo con justificación y,
// si procede, recomendaciones técnicas de formulación o de forma. Reglas puras: encargo al modelo y lectura de su respuesta.
import { contextoMetodo } from "@/lib/informe-ia";
import { AYUDA_OBJETIVOS } from "@/lib/metodologia-ayuda";

export type Semaforo = "verde" | "amarillo" | "rojo";
export type Naturaleza = "objetivo" | "resultado_clave" | "iniciativa" | "ambiguo";
export type AlineacionItem = { id: string; color: Semaforo; justificacion: string; recomendaciones: string[]; naturaleza: Naturaleza; duplicaDe: string[]; reformulacion: string; indicadorPropuesto: string; faltan: string[];
  /** Aprobación del comité directivo: deja el objetivo en verde aunque la lectura del modelo fuera otra (se conserva en `colorIA`).
      `firma` es la huella del objetivo aprobado: si el objetivo cambia, la aprobación deja de valer. */
  aprobado?: { by: string; name: string; at: string; firma: string }; colorIA?: Semaforo };
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
  prioridades: { id: string; order: number; name: string; indicator?: string; desc?: string; sponsor?: string; propuesta?: boolean }[];
  objetivos: { id: string; lever?: string; name: string; desc?: string; indicator?: string; pillar?: string; perspective?: string; krs: number; krNombres?: string[]; iniciativas?: string[] }[];
  lineaBase?: string;
  contexto?: string; fecha: string; soloId?: string; soloIds?: string[];
}): { system: string; user: string } {
  const evaluar = args.soloIds?.length ? args.soloIds : args.soloId ? [args.soloId] : undefined;
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    AYUDA_OBJETIVOS,
    "ANTES DE JUZGAR, lee TODO el contexto de los módulos anteriores y del propio módulo: las prioridades (con su indicador, su resultado esperado y su sponsor), los resultados 2026 de la línea base, los resultados clave e iniciativas ya definidos para cada objetivo y el resto de objetivos del horizonte. Usa esas definiciones para recomendar con nombres concretos: eliminar, agregar, fusionar, completar, mover o convertir. No pidas lo que ya está definido en otro módulo.",
    "PLAZO: todos los objetivos listados pertenecen al horizonte indicado (su columna en la plataforma): el «para cuándo» YA ESTÁ DADO por ese horizonte. PROHIBIDO marcar «plazo» como faltante o recomendar «fijar el plazo» por el solo hecho de que el enunciado no repita el año. Solo menciona el plazo si el enunciado contradice el horizonte o si el logro necesita un hito intermedio concreto (p. ej. «antes de la visita del INVIMA»).",
    "VERBO DE LOGRO: un verbo de logro nombra un resultado que cambia (aumentar, reducir, alcanzar, lograr, elevar, consolidar, mantener, garantizar, asegurar, obtener, cubrir, bajar, subir, duplicar, llevar a). Un verbo de actividad nombra algo que se hace (implementar, desarrollar, diseñar, realizar, ejecutar, gestionar, crear, instalar, integrar, construir, definir, establecer, fortalecer, impulsar, promover). Si el enunciado empieza con un verbo de actividad, NO digas que «falta verbo de logro»: di que el verbo es de actividad y que el enunciado describe un medio, y recomienda «Eliminar el verbo de actividad \"implementar\" y formular el logro: …» con el resultado que esa actividad busca. Si empieza con un verbo de logro, el elemento «verbo» está cumplido. PROHIBIDO que la reformulación empiece con el mismo verbo que criticas o con un verbo de actividad.",
    "CONTENCIÓN Y DUPLICIDAD: sé crítico para detectar objetivos que CONTIENEN a otros: uno es un medio, una parte o un caso particular del otro (p. ej. «omnicanalidad para aumentar la cobertura del panel médico» contiene «frecuencia de visita 5 de 6 en médicos AAA», que es una de sus medidas). Márcalos en duplicaDe en ambos sentidos y recomienda la acción concreta: «Integrar OE-10 en OE-09 como resultado clave de cobertura» o «Fundir OE-10 y OE-14 en un solo objetivo de frecuencia de visita por canal». Un conjunto con objetivos contenidos unos en otros no está alineado aunque cada uno se lea bien por separado.",
    "TAREA: validar, ceñido a la ayuda metodológica anterior, la ALINEACIÓN de cada objetivo directivo del horizonte con la prioridad estratégica a la que pertenece, con el conjunto de prioridades y con el resto de objetivos. Las prioridades ya fueron validadas por la dirección: no se cuestionan ni se reformulan; se evalúan los objetivos frente a ellas. Lee el CONJUNTO completo antes de juzgar cada uno: detecta duplicidades o solapamientos entre objetivos (de la misma o de distinta prioridad), prioridades sin objetivo o sobrecargadas y enunciados que no son objetivos.",
    "DEFINICIÓN (marco 4Shine Empresas): un objetivo directivo es el resultado concreto que la dirección se compromete a lograr en el horizonte para hacer avanzar una prioridad. Estructura: VERBO DE LOGRO + RESULTADO + INDICADOR IMPULSOR + PARA CUÁNDO. Declara el indicador impulsor pero NO fija cifras de base y meta: eso corresponde a los resultados clave, que se formulan después. NATURALEZA: si el enunciado ya trae base y meta numérica como su contenido central, es un «resultado_clave»; si describe algo que se hace o se implementa (un proyecto, un sistema, un comité, una campaña), es una «iniciativa»; si no se puede decidir, «ambiguo».",
    "CRITERIOS (en este orden): 1) contribución directa del objetivo a su prioridad y al indicador de la prioridad; 2) naturaleza: que sea un objetivo y no un resultado clave ni una iniciativa; 3) no duplicidad ni solapamiento con otros objetivos del conjunto; 4) pertinencia frente al sector, el negocio y los datos de la empresa (contexto adjunto); 5) formulación técnica: verbo de logro, resultado observable, indicador impulsor declarado, plazo, un solo logro por enunciado; 6) forma: longitud, claridad, coherencia entre nombre, aspiración e indicador impulsor.",
    "EXIGENCIA: sé estricto y exigente, como un advisor senior que revisa antes de un comité. Un objetivo solo es «verde» si cumple TODO a la vez: a) aporta de forma directa e inequívoca al indicador de su prioridad; b) tiene los cuatro elementos de la estructura (verbo de logro, resultado concreto, indicador impulsor declarado, para cuándo); c) es un objetivo (no un resultado clave ni una iniciativa); d) no duplica ni se solapa con otro; e) es coherente con el sector, el mercado y la posición de la empresa (usa el contexto: participación, crecimiento, canales, clases terapéuticas, regulación). Si falta cualquiera de esos elementos o hay dudas razonables, es «amarillo». Es «rojo» si no aporta a su prioridad, pertenece claramente a otra, contradice el contexto, duplica a otro objetivo o no es un objetivo (resultado clave, iniciativa, deseo vago o lista). La ortografía, las mayúsculas sostenidas y los errores de redacción cuentan como problemas de forma.",
    "FALTAN: para cada objetivo lista los elementos ausentes con estos códigos: verbo, resultado, indicador, plazo, prioridad (vacío si no falta ninguno).",
    "RECOMENDACIONES: SIEMPRE, para todo objetivo que no sea verde, de 1 a 4 recomendaciones puntuales de QUÉ HACER, cada una empezando con un verbo en imperativo y con el detalle concreto, por ejemplo: «Integrar OE-03 y OE-11 en un solo objetivo: …», «Eliminar el verbo \"implementar\" y formular el logro: …», «Cambiar la redacción a: \"…\"», «Mover a la prioridad Disciplina Operacional, porque …», «Convertir en resultado clave de OE-02», «Declarar el indicador impulsor: …», «Fijar el plazo: cierre de 2027». Nada de generalidades: nombra siempre el objetivo, la prioridad, el verbo o el indicador concretos. En verde, incluye igualmente una recomendación de mejora si existe (puede ir vacía solo si no hay nada que mejorar).",
    "REFORMULACIÓN: para todo objetivo amarillo o rojo escribe en «reformulacion» la redacción propuesta completa, en una sola frase (máximo 30 palabras) con la estructura verbo de logro + resultado + indicador impulsor + para cuándo, en español de Colombia y coherente con los datos de la empresa. PROHIBIDO poner cifras de meta en la reformulación (nada de «30 %», «al menos 5», «3 nuevos»): el cuánto va en los resultados clave; se nombra la medida sin su valor. El plazo se escribe «al cierre de 2027», «en el primer semestre de 2027» o «antes de [hito]». Ejemplo correcto: «Reducir el backlog de producto terminado, medido por el backlog mensual de PT, al cierre de 2027». Ejemplo incorrecto: «Reducir el backlog de PT en un 30 % al cierre de 2027». Si el enunciado es en realidad un resultado clave o una iniciativa, propón el objetivo del que debería colgar. En verde puede ir vacía. En «indicadorPropuesto» escribe solo el NOMBRE de la medida (p. ej. «Backlog mensual de producto terminado»), sin verbo, sin meta ni valor; vacío si el declarado está bien.",
    "Responde solo JSON con esta forma exacta: {\"items\":[{\"id\":\"OE-01\",\"color\":\"verde|amarillo|rojo\",\"naturaleza\":\"objetivo|resultado_clave|iniciativa|ambiguo\",\"duplicaDe\":[\"OE-05\"],\"faltan\":[\"indicador\",\"plazo\"],\"justificacion\":\"2 a 4 frases\",\"recomendaciones\":[\"…\"],\"reformulacion\":\"…\",\"indicadorPropuesto\":\"…\"}],\"resumen\":\"3 a 5 frases sobre la alineación del conjunto: prioridades sin objetivo o sobrecargadas, patrones de formulación y qué conviene resolver primero. No escribas conteos ni cifras de objetivos por color: la plataforma los calcula y los muestra aparte\"}. Un item por objetivo recibido, con su id exacto.",
  ].filter(Boolean).join("\n\n");
  const prios = args.prioridades.map((p) => `- ${p.id} (${p.order}) «${p.name}»${p.propuesta ? " [PROPUESTA pendiente de aprobación por la Gerencia General: evalúa sus objetivos igual, pero señala que dependen de esa aprobación]" : ""}${p.indicator ? ` · indicador: ${p.indicator}` : ""}${p.desc ? ` · ${p.desc}` : ""}${p.sponsor ? ` · sponsor: ${p.sponsor}` : ""}`).join("\n");
  const objs = args.objetivos.map((o) => `- ${o.id}${evaluar?.includes(o.id) ? " ← evaluar" : ""} [prioridad ${o.lever ?? "sin prioridad"}${o.perspective ? ` · perspectiva ${o.perspective}` : ""}${o.pillar ? ` · pilar «${o.pillar}»` : ""}] «${o.name}»${o.desc ? `\n  aspiración: ${o.desc}` : ""}${o.indicator ? `\n  indicador impulsor: ${o.indicator}` : ""}\n  resultados clave vinculados: ${o.krs}${o.krNombres?.length ? ` (${o.krNombres.join("; ")})` : ""}${o.iniciativas?.length ? `\n  iniciativas ya ligadas: ${o.iniciativas.join("; ")}` : ""}`).join("\n");
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}${args.empresa.size ? ` · ${args.empresa.size}` : ""}. Fecha: ${args.fecha}. Horizonte evaluado: ${args.horizonte}.`,
    args.contexto ? `CONTEXTO DE LA EMPRESA (sector, actividad, posición y datos abiertos):\n${args.contexto}` : "",
    `PRIORIDADES ESTRATÉGICAS (validadas por la dirección):\n${prios}`,
    args.lineaBase ? `LÍNEA BASE (resultados ya cerrados, para juzgar ambición y pertinencia):\n${args.lineaBase}` : "",
    evaluar ? (evaluar.length === 1 ? `EVALÚA SOLO EL OBJETIVO ${evaluar[0]} (los demás son contexto para duplicidades y reparto por prioridad): devuelve un único item con su id.` : `EVALÚA SOLO LOS OBJETIVOS ${evaluar.join(", ")} (los demás son contexto para duplicidades y reparto por prioridad): devuelve un item por cada uno de esos ids, sin omitir ninguno.`) : "",
    `OBJETIVOS DIRECTIVOS DEL HORIZONTE ${args.horizonte}:\n${objs}`,
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Quita del enunciado de un objetivo las cifras de meta que el modelo cuela pese a la regla («al menos 5», «en un 30 %»,
    «de 3,1 a 3,4»): el cuánto va en los resultados clave. Los años (2027) se conservan y «H1 2027» pasa a prosa. */
export function sinCifrasDeMeta(texto: string): string {
  let t = texto;
  t = t.replace(/\b(?:en|antes de|para|hasta)\s+H([12])\s+(\d{4})\b/gi, (_m, h: string, y: string) => `en el ${h === "1" ? "primer" : "segundo"} semestre de ${y}`);
  const CAL = "(?:al menos|como mínimo|mínimo|por lo menos|más de|por encima de|por debajo de|superior(?:es)? a|inferior(?:es)? a|menos de|cerca de|alrededor de)";
  t = t.replace(new RegExp(`\\s*(?:${CAL}\\s+)?(?:(?:de|en|hasta|a|del|por)\\s+)?(?:${CAL}\\s+)?(?:(?:un|una|el|la)\\s+)?\\d+(?:[.,]\\d+)?\\s?(?:%|por ciento|pp\\b|puntos porcentuales|puntos básicos)`, "gi"), "");
  t = t.replace(/\bde\s+\d+(?:[.,]\d+)?\s+a\s+\d+(?:[.,]\d+)?\b/gi, "");
  t = t.replace(/\b(?:al menos|como mínimo|por lo menos|mínimo de|un mínimo de|más de|no menos de)\s+(?:\d+(?:[.,]\d+)?|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|quince|veinte|treinta|cincuenta|cien)\s+/gi, "");
  t = t.replace(/\b(?:un|una)\s+(?:incremento|aumento|reducción|crecimiento|mejora)\s+(?:de|del)\s+(?=\w)/gi, (m) => m);   // «un incremento de» sin cifra se deja
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").replace(/\(\s*\)/g, "").trim();
  return t.replace(/\s{2,}/g, " ");
}
/** ¿Quedan cifras de meta en el enunciado (dígitos que no sean años)? */
export const tieneCifrasDeMeta = (texto: string): boolean => /\d/.test(texto.replace(/\b(?:19|20)\d{2}\b/g, ""));

/** Lee la respuesta del modelo: un item por objetivo esperado; lo que falte queda en amarillo con nota. */
/** Verbos de actividad: nombran un medio, no un resultado; un objetivo que empieza así es una iniciativa disfrazada. */
export const VERBOS_ACTIVIDAD = ["implementar", "desarrollar", "diseñar", "realizar", "ejecutar", "gestionar", "crear", "instalar", "integrar", "construir", "definir", "establecer", "fortalecer", "impulsar", "promover", "implementación", "desarrollo", "diseño", "ejecución", "gestión", "creación", "instalación", "integración", "construcción"];
const primeraPalabra = (t: string) => (t.trim().match(/^[\p{L}]+/u)?.[0] ?? "").toLowerCase();
const esInfinitivo = (w: string) => /(ar|er|ir)$/.test(w) && w.length > 3;

/** Reglas deterministas sobre la respuesta del modelo (lo verificable lo decide la plataforma):
    el plazo lo da el horizonte (nunca «falta plazo»); un enunciado que empieza con verbo no «carece de verbo»;
    si empieza con verbo de actividad, la acción correcta es cambiarlo por uno de logro; la reformulación no puede
    repetir el verbo criticado. */
function rigor(it: { faltan: string[]; recomendaciones: string[]; reformulacion: string; justificacion: string }, nombre: string | undefined) {
  it.faltan = it.faltan.filter((f) => f !== "plazo");
  it.recomendaciones = it.recomendaciones.filter((r) => !/^(fijar|incluir|definir|establecer|agregar|añadir|indicar|precisar)\s+(el |un |una )?(plazo|fecha|para cuándo)/i.test(r.trim()));
  if (!nombre) return;
  const v = primeraPalabra(nombre);
  const vRef = primeraPalabra(it.reformulacion);
  const actividad = VERBOS_ACTIVIDAD.includes(v);
  if (esInfinitivo(v) || actividad) it.faltan = it.faltan.filter((f) => f !== "verbo");   // hay verbo; otra cosa es que sea de actividad
  if (actividad) {
    // la recomendación precisa: cambiar el verbo de actividad por uno de logro (nunca «incluir un verbo de logro: implementar»)
    it.recomendaciones = it.recomendaciones.filter((r) => !/verbo de logro/i.test(r) || !new RegExp(`[«"']${v}`, "i").test(r));
    if (!it.recomendaciones.some((r) => /verbo de actividad/i.test(r))) it.recomendaciones.unshift(`Eliminar el verbo de actividad «${v}» y formular el logro que esa actividad busca (aumentar, reducir, alcanzar, garantizar…), con su indicador impulsor.`);
  }
  if (it.reformulacion && vRef && (vRef === v && (actividad || it.recomendaciones.some((r) => /verbo/i.test(r))) || VERBOS_ACTIVIDAD.includes(vRef))) {
    // la redacción propuesta repite el verbo criticado o usa uno de actividad: no sirve como propuesta
    it.recomendaciones = it.recomendaciones.filter((r) => !r.includes(it.reformulacion.slice(0, 40)));
    it.reformulacion = "";
  }
}

export function parseAlineacion(raw: unknown, horizon: string, ids: string[], nombres: Record<string, string> = {}): AlineacionIA {
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
    const faltan0 = (Array.isArray(it.faltan) ? it.faltan : []).map((f) => str(f, 20).toLowerCase()).filter((f) => f in ELEMENTOS);
    const base = { faltan: faltan0, recomendaciones: recs, reformulacion: sinCifrasDeMeta(str(it.reformulacion, 400)), justificacion: str(it.justificacion, 1200) || "Sin justificación." };
    rigor(base, nombres[id]);
    const { faltan, reformulacion } = base; const recs2 = base.recomendaciones;
    // exigencia: sin reformulación ni recomendación, un amarillo o rojo no es accionable; se anota para que el advisor lo complete
    if (color !== "verde" && !recs2.length && !reformulacion) recs2.push("Reformular el objetivo con la estructura verbo de logro + resultado + indicador impulsor + para cuándo.");
    // la redacción propuesta se vuelve la primera acción concreta («Cambiar la redacción a: …») si el modelo no la citó
    if (reformulacion && !recs2.some((r) => r.includes(reformulacion.slice(0, 40)))) recs2.unshift(`Cambiar la redacción a: «${reformulacion}»`);
    const colorFinal: Semaforo = color === "verde" && (faltan.length || naturaleza !== "objetivo" || duplicaDe.length) ? "amarillo" : color;
    return { id, color: colorFinal, justificacion: base.justificacion, recomendaciones: recs2, naturaleza, duplicaDe, reformulacion, indicadorPropuesto: str(it.indicadorPropuesto, 200), faltan };
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
    AYUDA_OBJETIVOS,
    "TAREA: proponer TRES objetivos directivos alternativos, ceñidos a la ayuda metodológica anterior, para la prioridad estratégica indicada, en el horizonte indicado. Cada propuesta debe ser distinta en enfoque (p. ej. una centrada en resultado de mercado, otra en capacidad o proceso, otra en cliente o acceso), ambiciosa pero posible con la capacidad y la posición de la empresa (usa el contexto: participación, crecimiento, canales, clases terapéuticas, regulación, resultados 2026) y NO duplicar ni solapar los objetivos ya existentes de esa prioridad ni de otras.",
    "DEFINICIÓN: un objetivo directivo es el resultado concreto que la dirección se compromete a lograr en el horizonte para hacer avanzar su prioridad. Estructura obligatoria de «name»: VERBO DE LOGRO + RESULTADO + INDICADOR IMPULSOR + PARA CUÁNDO, en una sola frase. PROHIBIDO incluir cifras de meta en el enunciado (nada de «al menos 5», «7 %», «3 nuevos»): el cuánto va en los resultados clave, que se formulan después; el enunciado nombra la medida (indicador impulsor) sin su valor. El plazo se escribe como «al cierre de 2027», «en el primer semestre de 2027» o «antes de [hito]», nunca como «H1 2027». Verbos de logro: alcanzar, consolidar, obtener, reducir, posicionar, asegurar; nunca «implementar», «gestionar», «trabajar en», «desarrollar un proyecto». Máximo 30 palabras por enunciado.",
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
  return arr.map((p) => ({ name: sinCifrasDeMeta(str(p?.name, 300)), desc: str(p?.desc, 600), indicator: str(p?.indicator, 200), porque: str(p?.porque, 600) })).filter((p) => p.name.length >= 10).slice(0, 3);
}
