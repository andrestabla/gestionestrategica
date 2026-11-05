// Validación de alineación (asistida por IA): cada objetivo directivo del horizonte frente a la prioridad estratégica
// a la que pertenece y al conjunto de prioridades validadas por la dirección. Semáforo por objetivo con justificación y,
// si procede, recomendaciones técnicas de formulación o de forma. Reglas puras: encargo al modelo y lectura de su respuesta.
import { contextoMetodo } from "@/lib/informe-ia";

export type Semaforo = "verde" | "amarillo" | "rojo";
export type AlineacionItem = { id: string; color: Semaforo; justificacion: string; recomendaciones: string[] };
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
  objetivos: { id: string; lever?: string; name: string; desc?: string; indicator?: string; pillar?: string; perspective?: string; krs: number }[];
  contexto?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    "TAREA: validar la ALINEACIÓN de cada objetivo directivo del horizonte con la prioridad estratégica a la que pertenece y con el conjunto de prioridades. Las prioridades ya fueron validadas por la dirección: no se cuestionan ni se reformulan; se evalúan los objetivos frente a ellas.",
    "CRITERIOS (en este orden): 1) contribución directa del objetivo a su prioridad y al indicador de la prioridad; 2) pertinencia frente al sector, el negocio y los datos de la empresa (contexto adjunto); 3) formulación técnica: verbo de logro, resultado observable y verificable, alcance claro, un solo logro por enunciado, sin actividades disfrazadas de objetivo; 4) forma: longitud, claridad, redundancia con otros objetivos, coherencia entre nombre, aspiración e indicador impulsor.",
    "SEMÁFORO: «verde» = contribuye de forma directa e inequívoca a su prioridad y está bien formulado; «amarillo» = contribuye pero de forma parcial o indirecta, o contribuye y tiene problemas de formulación o de forma que conviene corregir; «rojo» = no contribuye a su prioridad, pertenece claramente a otra, contradice el contexto de la empresa o no es un objetivo (es una actividad, un deseo vago o una lista).",
    "RECOMENDACIONES: solo si proceden. Técnicas (de fondo: qué cambiar en el logro, el alcance, la prioridad a la que pertenece, el indicador impulsor) o de forma (redacción). Concretas y accionables; si una recomendación es reformular, incluye la propuesta de redacción entre comillas. En verde sin observaciones, la lista va vacía.",
    "Responde solo JSON con esta forma exacta: {\"items\":[{\"id\":\"OE-01\",\"color\":\"verde|amarillo|rojo\",\"justificacion\":\"2 a 4 frases\",\"recomendaciones\":[\"…\"]}],\"resumen\":\"3 a 5 frases sobre la alineación del conjunto: cuántos en cada color, prioridades sin objetivo o sobrecargadas y qué conviene resolver primero\"}. Un item por objetivo recibido, con su id exacto.",
  ].filter(Boolean).join("\n\n");
  const prios = args.prioridades.map((p) => `- ${p.id} (${p.order}) «${p.name}»${p.indicator ? ` · indicador: ${p.indicator}` : ""}${p.desc ? ` · ${p.desc}` : ""}${p.sponsor ? ` · sponsor: ${p.sponsor}` : ""}`).join("\n");
  const objs = args.objetivos.map((o) => `- ${o.id} [prioridad ${o.lever ?? "sin prioridad"}${o.perspective ? ` · perspectiva ${o.perspective}` : ""}${o.pillar ? ` · pilar «${o.pillar}»` : ""}] «${o.name}»${o.desc ? `\n  aspiración: ${o.desc}` : ""}${o.indicator ? `\n  indicador impulsor: ${o.indicator}` : ""}\n  resultados clave vinculados: ${o.krs}`).join("\n");
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
    if (!it) return { id, color: "amarillo", justificacion: "El modelo no devolvió lectura para este objetivo; conviene volver a validar.", recomendaciones: [] };
    const c = str(it.color, 10).toLowerCase();
    const color: Semaforo = c === "verde" || c === "rojo" ? c : "amarillo";
    const recs = (Array.isArray(it.recomendaciones) ? it.recomendaciones : []).map((r) => str(r, 600)).filter(Boolean).slice(0, 6);
    return { id, color, justificacion: str(it.justificacion, 1200) || "Sin justificación.", recomendaciones: recs };
  });
  return { horizon, items, resumen: str(o.resumen, 1500) };
}
