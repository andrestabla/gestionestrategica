// Validación de alineación (asistida por IA): cada objetivo directivo del horizonte frente a la prioridad estratégica
// a la que pertenece y al conjunto de prioridades validadas por la dirección. Semáforo por objetivo con justificación y,
// si procede, recomendaciones técnicas de formulación o de forma. Reglas puras: encargo al modelo y lectura de su respuesta.
import { contextoMetodo } from "@/lib/informe-ia";

export type Semaforo = "verde" | "amarillo" | "rojo";
export type Naturaleza = "objetivo" | "resultado_clave" | "iniciativa" | "ambiguo";
export type AlineacionItem = { id: string; color: Semaforo; justificacion: string; recomendaciones: string[]; naturaleza: Naturaleza; duplicaDe: string[] };
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
  objetivos: { id: string; lever?: string; name: string; desc?: string; indicator?: string; pillar?: string; perspective?: string; krs: number; iniciativas?: string[] }[];
  contexto?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    "TAREA: validar la ALINEACIÓN de cada objetivo directivo del horizonte con la prioridad estratégica a la que pertenece, con el conjunto de prioridades y con el resto de objetivos. Las prioridades ya fueron validadas por la dirección: no se cuestionan ni se reformulan; se evalúan los objetivos frente a ellas. Lee el CONJUNTO completo antes de juzgar cada uno: detecta duplicidades o solapamientos entre objetivos (de la misma o de distinta prioridad), prioridades sin objetivo o sobrecargadas y enunciados que no son objetivos.",
    "DEFINICIÓN (marco 4Shine Empresas): un objetivo directivo es el resultado concreto que la dirección se compromete a lograr en el horizonte para hacer avanzar una prioridad. Estructura: VERBO DE LOGRO + RESULTADO + INDICADOR IMPULSOR + PARA CUÁNDO. Declara el indicador impulsor pero NO fija cifras de base y meta: eso corresponde a los resultados clave, que se formulan después. NATURALEZA: si el enunciado ya trae base y meta numérica como su contenido central, es un «resultado_clave»; si describe algo que se hace o se implementa (un proyecto, un sistema, un comité, una campaña), es una «iniciativa»; si no se puede decidir, «ambiguo».",
    "CRITERIOS (en este orden): 1) contribución directa del objetivo a su prioridad y al indicador de la prioridad; 2) naturaleza: que sea un objetivo y no un resultado clave ni una iniciativa; 3) no duplicidad ni solapamiento con otros objetivos del conjunto; 4) pertinencia frente al sector, el negocio y los datos de la empresa (contexto adjunto); 5) formulación técnica: verbo de logro, resultado observable, indicador impulsor declarado, plazo, un solo logro por enunciado; 6) forma: longitud, claridad, coherencia entre nombre, aspiración e indicador impulsor.",
    "SEMÁFORO: «verde» = contribuye de forma directa e inequívoca a su prioridad, es un objetivo y está bien formulado; «amarillo» = contribuye pero de forma parcial o indirecta, o contribuye y tiene problemas de formulación, de forma, le falta el indicador impulsor o el plazo, o se solapa parcialmente con otro; «rojo» = no contribuye a su prioridad, pertenece claramente a otra, contradice el contexto de la empresa, duplica a otro objetivo o no es un objetivo (es un resultado clave, una iniciativa, un deseo vago o una lista).",
    "RECOMENDACIONES: solo si proceden. Técnicas (de fondo: qué cambiar en el logro, el alcance, la prioridad a la que pertenece, el indicador impulsor) o de forma (redacción). Concretas y accionables; si una recomendación es reformular, incluye la propuesta de redacción entre comillas. En verde sin observaciones, la lista va vacía.",
    "Responde solo JSON con esta forma exacta: {\"items\":[{\"id\":\"OE-01\",\"color\":\"verde|amarillo|rojo\",\"naturaleza\":\"objetivo|resultado_clave|iniciativa|ambiguo\",\"duplicaDe\":[\"OE-05\"],\"justificacion\":\"2 a 4 frases\",\"recomendaciones\":[\"…\"]}],\"resumen\":\"3 a 5 frases sobre la alineación del conjunto: prioridades sin objetivo o sobrecargadas, patrones de formulación y qué conviene resolver primero. No escribas conteos ni cifras de objetivos por color: la plataforma los calcula y los muestra aparte\"}. Un item por objetivo recibido, con su id exacto.",
  ].filter(Boolean).join("\n\n");
  const prios = args.prioridades.map((p) => `- ${p.id} (${p.order}) «${p.name}»${p.indicator ? ` · indicador: ${p.indicator}` : ""}${p.desc ? ` · ${p.desc}` : ""}${p.sponsor ? ` · sponsor: ${p.sponsor}` : ""}`).join("\n");
  const objs = args.objetivos.map((o) => `- ${o.id} [prioridad ${o.lever ?? "sin prioridad"}${o.perspective ? ` · perspectiva ${o.perspective}` : ""}${o.pillar ? ` · pilar «${o.pillar}»` : ""}] «${o.name}»${o.desc ? `\n  aspiración: ${o.desc}` : ""}${o.indicator ? `\n  indicador impulsor: ${o.indicator}` : ""}\n  resultados clave vinculados: ${o.krs}${o.iniciativas?.length ? `\n  iniciativas ya ligadas: ${o.iniciativas.join("; ")}` : ""}`).join("\n");
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}${args.empresa.size ? ` · ${args.empresa.size}` : ""}. Fecha: ${args.fecha}. Horizonte evaluado: ${args.horizonte}.`,
    args.contexto ? `CONTEXTO DE LA EMPRESA (sector, actividad, posición y datos abiertos):\n${args.contexto}` : "",
    `PRIORIDADES ESTRATÉGICAS (validadas por la dirección):\n${prios}`,
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
    if (!it) return { id, color: "amarillo", justificacion: "El modelo no devolvió lectura para este objetivo; conviene volver a validar.", recomendaciones: [], naturaleza: "objetivo", duplicaDe: [] };
    const c = str(it.color, 10).toLowerCase();
    const color: Semaforo = c === "verde" || c === "rojo" ? c : "amarillo";
    const recs = (Array.isArray(it.recomendaciones) ? it.recomendaciones : []).map((r) => str(r, 600)).filter(Boolean).slice(0, 6);
    const n = str(it.naturaleza, 20).toLowerCase();
    const naturaleza: Naturaleza = n === "resultado_clave" || n === "iniciativa" || n === "ambiguo" ? n : "objetivo";
    const duplicaDe = (Array.isArray(it.duplicaDe) ? it.duplicaDe : []).map((d) => str(d, 20).toUpperCase()).filter((d) => d && d !== id.toUpperCase() && ids.some((x) => x.toUpperCase() === d)).slice(0, 5);
    return { id, color, justificacion: str(it.justificacion, 1200) || "Sin justificación.", recomendaciones: recs, naturaleza, duplicaDe };
  });
  return { horizon, items, resumen: str(o.resumen, 1500) };
}
