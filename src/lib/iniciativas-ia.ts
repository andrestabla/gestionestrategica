// Iniciativas con IA (marco 4Shine Empresas): validación de la formulación de las iniciativas del horizonte
// (semáforo, qué falta, qué hacer, redacción propuesta) y asistente de creación a partir del resultado clave que
// la iniciativa debe mover. Reglas puras: encargos al modelo y lectura de sus respuestas.
import { contextoMetodo } from "@/lib/informe-ia";
import { sinCifrasDeMeta, type Semaforo } from "@/lib/alineacion";

export type IniNaturaleza = "iniciativa" | "operacion" | "objetivo" | "resultado_clave" | "paraguas" | "ambiguo";
export const NATURALEZA_INI: Record<IniNaturaleza, string> = { iniciativa: "iniciativa", operacion: "parece operación continua", objetivo: "parece un objetivo", resultado_clave: "parece un resultado clave", paraguas: "iniciativa paraguas", ambiguo: "enunciado ambiguo" };
export const ELEMENTOS_INI: Record<string, string> = { nombre: "nombre como entrega", logro: "qué logra", kr: "resultado clave", responsable: "responsable", plazo: "inicio y fin", capacidad: "capacidad que instala", alcance: "alcance acotado" };
export type IniItem = { id: string; color: Semaforo; justificacion: string; recomendaciones: string[]; naturaleza: IniNaturaleza; duplicaDe: string[]; faltan: string[]; reformulacion: string; logroPropuesto: string };
export type ValidacionIni = { horizon: string; items: IniItem[]; resumen: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function encargoValidacionIniciativas(args: {
  empresa: { name: string; sector?: string; size?: string }; horizonte: string;
  prioridades: { id: string; name: string; indicator?: string }[];
  objetivos: { id: string; lever?: string; name: string }[];
  krs: { code: string; name: string; objective: string; baseline?: string; target?: string; unit?: string; due?: string }[];
  iniciativas: { id: string; name: string; objetivo?: string; cmi?: string; kpi?: string; owner?: string; start?: string; end?: string; capability?: string; status?: string; budget?: number }[];
  contexto?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    "TAREA: validar la FORMULACIÓN de cada iniciativa del horizonte y su encaje en la cadena prioridad → objetivo → resultado clave → iniciativa. Lee el CONJUNTO antes de juzgar cada una: duplicidades o solapamientos entre iniciativas, iniciativas paraguas, resultados clave con más de dos iniciativas y objetivos con iniciativas que no les corresponden.",
    "DEFINICIÓN: una iniciativa es un conjunto acotado de trabajo (proyecto, programa, cambio de proceso, lanzamiento) con inicio y fin, un responsable y recursos, que existe para mover un resultado clave. Estructura: NOMBRE como entrega (sustantivo, no verbo: «Call center para droguerías», no «Implementar call center») + QUÉ LOGRA (cambio verificable y cómo mueve el KR) + RESULTADO CLAVE que mueve + RESPONSABLE + INICIO Y FIN + CAPACIDAD que instala (dimensión del mapa 4Shine) + ALCANCE acotado. NATURALEZA: «operacion» si no tiene fin ni entrega (actividad continua); «objetivo» si describe un logro de negocio sin entrega; «resultado_clave» si es una cifra meta; «paraguas» si agrupa varios proyectos que deberían separarse; «ambiguo» si no se puede decidir.",
    "EXIGENCIA: sé estricto, como un advisor senior antes de un comité de portafolio. «verde» solo si cumple TODO: nombre como entrega, qué logra claro y verificable, vinculada a un resultado clave coherente con su objetivo y prioridad, responsable, inicio y fin, capacidad que instala declarada con sentido, alcance acotado, sin duplicar ni solapar otra, y pertinente frente al mercado y la posición de la empresa (usa el contexto). Si falta cualquier elemento o hay dudas razonables, «amarillo». «rojo» si no es una iniciativa (operación, objetivo, resultado clave), si no mueve el KR al que está ligada o si duplica a otra.",
    "FALTAN: lista los elementos ausentes con estos códigos: nombre, logro, kr, responsable, plazo, capacidad, alcance (vacío si no falta ninguno).",
    "RECOMENDACIONES: SIEMPRE, para toda iniciativa que no sea verde, de 1 a 4 acciones puntuales en imperativo con el detalle concreto, por ejemplo: «Cambiar el nombre a: \"…\"», «Reescribir qué logra: …», «Vincular al resultado clave OPE-01 en lugar de …», «Integrar i3 e i8 en una sola iniciativa: …», «Dividir en dos iniciativas: … y …», «Fijar inicio T1 2027 y fin T3 2027», «Declarar la capacidad que instala: EJE-4 Cadencia», «Acotar el alcance a …». Nombra siempre la iniciativa, el KR, el trimestre o la dimensión concretos.",
    "REFORMULACIÓN: para toda iniciativa amarilla o roja, «reformulacion» = nombre propuesto como entrega (máximo 14 palabras, sin verbo inicial, sin cifras de meta) y «logroPropuesto» = qué logra en una o dos frases (cambio verificable, cómo mueve el KR, alcance). En verde pueden ir vacías.",
    "Responde solo JSON con esta forma exacta: {\"items\":[{\"id\":\"i1\",\"color\":\"verde|amarillo|rojo\",\"naturaleza\":\"iniciativa|operacion|objetivo|resultado_clave|paraguas|ambiguo\",\"duplicaDe\":[\"i5\"],\"faltan\":[\"plazo\"],\"justificacion\":\"2 a 4 frases\",\"recomendaciones\":[\"…\"],\"reformulacion\":\"…\",\"logroPropuesto\":\"…\"}],\"resumen\":\"3 a 5 frases sobre el conjunto: KR sin iniciativa o con más de dos, objetivos sobrecargados, patrones de formulación y qué resolver primero; sin conteos por color\"}. Un item por iniciativa recibida, con su id exacto.",
  ].join("\n\n");
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}${args.empresa.size ? ` · ${args.empresa.size}` : ""}. Fecha: ${args.fecha}. Horizonte: ${args.horizonte}.`,
    args.contexto ? `CONTEXTO DE LA EMPRESA:\n${args.contexto}` : "",
    `PRIORIDADES: ${args.prioridades.map((p) => `${p.id} «${p.name}»${p.indicator ? ` [${p.indicator}]` : ""}`).join("; ")}.`,
    `OBJETIVOS DEL HORIZONTE:\n${args.objetivos.map((o) => `- ${o.id} [${o.lever ?? "sin prioridad"}] «${o.name}»`).join("\n")}`,
    `RESULTADOS CLAVE:\n${args.krs.map((k) => `- ${k.code} (objetivo ${k.objective}) «${k.name}»${k.baseline || k.target ? ` · base ${k.baseline ?? "—"} → meta ${k.target ?? "—"} ${k.unit ?? ""}` : ""}${k.due ? ` · plazo ${k.due}` : ""}`).join("\n") || "- ninguno"}`,
    `INICIATIVAS A VALIDAR:\n${args.iniciativas.map((i) => `- ${i.id} «${i.name}»\n  qué logra: ${i.objetivo || "(vacío)"}\n  objetivo: ${i.cmi ?? "—"} · KR: ${i.kpi || "(sin resultado clave)"} · responsable: ${i.owner ?? "—"} · inicio ${i.start || "—"} · fin ${i.end || "—"} · capacidad ${i.capability ?? "—"} · estado ${i.status ?? "—"}${i.budget ? ` · presupuesto ${i.budget}` : ""}`).join("\n")}`,
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

export function parseValidacionIniciativas(raw: unknown, horizon: string, ids: string[]): ValidacionIni {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : [];
  const items: IniItem[] = ids.map((id) => {
    const it = arr.find((x) => str(x?.id, 20).toLowerCase() === id.toLowerCase());
    if (!it) return { id, color: "amarillo", justificacion: "El modelo no devolvió lectura para esta iniciativa; conviene volver a validar.", recomendaciones: ["Volver a validar las iniciativas."], naturaleza: "iniciativa", duplicaDe: [], faltan: [], reformulacion: "", logroPropuesto: "" };
    const c = str(it.color, 10).toLowerCase();
    const color: Semaforo = c === "verde" || c === "rojo" ? c : "amarillo";
    const n = str(it.naturaleza, 20).toLowerCase();
    const naturaleza: IniNaturaleza = (["operacion", "objetivo", "resultado_clave", "paraguas", "ambiguo"] as const).includes(n as never) ? (n as IniNaturaleza) : "iniciativa";
    const duplicaDe = (Array.isArray(it.duplicaDe) ? it.duplicaDe : []).map((d) => str(d, 20)).filter((d) => d && d.toLowerCase() !== id.toLowerCase() && ids.some((x) => x.toLowerCase() === d.toLowerCase())).slice(0, 5);
    const faltan = (Array.isArray(it.faltan) ? it.faltan : []).map((f) => str(f, 20).toLowerCase()).filter((f) => f in ELEMENTOS_INI);
    const recs = (Array.isArray(it.recomendaciones) ? it.recomendaciones : []).map((r) => str(r, 600)).filter(Boolean).slice(0, 6);
    const reformulacion = sinCifrasDeMeta(str(it.reformulacion, 200)).replace(/^(implementar|gestionar|desarrollar|realizar|ejecutar)\s+/i, "");
    const logroPropuesto = str(it.logroPropuesto, 600);
    if (color !== "verde" && !recs.length && !reformulacion) recs.push("Reformular la iniciativa: nombre como entrega, qué logra, resultado clave que mueve, responsable, inicio y fin, capacidad que instala.");
    if (reformulacion && !recs.some((r) => r.includes(reformulacion.slice(0, 30)))) recs.unshift(`Cambiar el nombre a: «${reformulacion}»`);
    const colorFinal: Semaforo = color === "verde" && (faltan.length || naturaleza !== "iniciativa" || duplicaDe.length) ? "amarillo" : color;
    return { id, color: colorFinal, justificacion: str(it.justificacion, 1200) || "Sin justificación.", recomendaciones: recs, naturaleza, duplicaDe, faltan, reformulacion, logroPropuesto };
  });
  return { horizon, items, resumen: str(o.resumen, 1500) };
}

/* ═══ Asistente de creación de iniciativas ═══ */

export type PropuestaIniciativa = { name: string; objetivo: string; capability: string; start: string; end: string; porque: string };

export function encargoPropuestaIniciativa(args: {
  empresa: { name: string; sector?: string; size?: string }; horizonte: string; anio: number;
  kr: { code: string; name: string; baseline?: string; target?: string; unit?: string; due?: string; definition?: string };
  objetivo: { id: string; name: string }; prioridad?: { id: string; name: string; indicator?: string; sponsor?: string };
  existentes: { id: string; name: string; kpi?: string; objetivo?: string }[];
  dimensiones: { code: string; name: string }[];
  borrador?: string; contexto?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal, sin nombres de personas.",
    contextoMetodo(),
    "TAREA: proponer TRES iniciativas alternativas que muevan el resultado clave indicado, distintas en enfoque (p. ej. una de proceso o capacidad, una de cliente o canal, una de dato o tecnología), realistas para la capacidad y la posición de la empresa (usa el contexto), que no dupliquen las iniciativas existentes y que quepan en el horizonte.",
    "DEFINICIÓN: una iniciativa es un conjunto acotado de trabajo con entrega, inicio y fin, que existe para mover un resultado clave. «name»: nombre como entrega, sustantivo, sin verbo inicial, máximo 14 palabras, sin cifras de meta. «objetivo»: qué logra y cómo mueve el KR, con alcance y primera evidencia a 90 días (2 o 3 frases). «capability»: código de la dimensión del mapa 4Shine que instala, elegido de la lista. «start» y «end»: trimestres AAAA-Tn dentro del año del horizonte, coherentes con el plazo del KR. «porque»: 2 frases con el dato del contexto que la sustenta.",
    "Si hay un BORRADOR, la primera propuesta es su versión corregida (misma intención, bien formulada) y las otras dos son alternativas.",
    "Responde solo JSON: {\"propuestas\":[{\"name\":\"…\",\"objetivo\":\"…\",\"capability\":\"EJE-4\",\"start\":\"2027-T1\",\"end\":\"2027-T3\",\"porque\":\"…\"}]}. Exactamente tres.",
  ].join("\n\n");
  const k = args.kr;
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}${args.empresa.size ? ` · ${args.empresa.size}` : ""}. Fecha: ${args.fecha}. Horizonte: ${args.horizonte} (año ${args.anio}).`,
    args.contexto ? `CONTEXTO DE LA EMPRESA:\n${args.contexto}` : "",
    args.prioridad ? `PRIORIDAD: ${args.prioridad.id} «${args.prioridad.name}»${args.prioridad.indicator ? ` · indicador ${args.prioridad.indicator}` : ""}${args.prioridad.sponsor ? ` · sponsor ${args.prioridad.sponsor}` : ""}.` : "",
    `OBJETIVO: ${args.objetivo.id} «${args.objetivo.name}».`,
    `RESULTADO CLAVE QUE DEBE MOVER: ${k.code} «${k.name}»${k.baseline || k.target ? ` · base ${k.baseline ?? "—"} → meta ${k.target ?? "—"} ${k.unit ?? ""}` : ""}${k.due ? ` · plazo ${k.due}` : ""}${k.definition ? `\n  definición: ${k.definition}` : ""}`,
    `DIMENSIONES DEL MAPA (capacidad que instala; usa el código): ${args.dimensiones.map((d) => `${d.code} ${d.name}`).join("; ")}.`,
    args.existentes.length ? `INICIATIVAS YA EXISTENTES (no las dupliques):\n${args.existentes.map((i) => `- ${i.id} «${i.name}»${i.kpi ? ` (KR ${i.kpi})` : ""}${i.objetivo ? `: ${i.objetivo.slice(0, 160)}` : ""}`).join("\n")}` : "INICIATIVAS YA EXISTENTES: ninguna.",
    args.borrador ? `BORRADOR DE LA PERSONA: «${args.borrador}»` : "BORRADOR: ninguno; propone desde el resultado clave.",
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

export function parsePropuestasIniciativa(raw: unknown, dimCodes: string[], anio: number): PropuestaIniciativa[] {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.propuestas) ? (o.propuestas as Record<string, unknown>[]) : [];
  const q = (v: unknown, def: string) => { const t = str(v, 8).toUpperCase(); return /^\d{4}-T[1-4]$/.test(t) ? t : def; };
  return arr.map((p) => {
    const cap = str(p?.capability, 10).toUpperCase();
    const start = q(p?.start, `${anio}-T1`); const end = q(p?.end, `${anio}-T4`);
    return { name: sinCifrasDeMeta(str(p?.name, 200)).replace(/^(implementar|gestionar|desarrollar|realizar|ejecutar)\s+/i, ""), objetivo: str(p?.objetivo, 600), capability: dimCodes.includes(cap) ? cap : "", start, end: end >= start ? end : start, porque: str(p?.porque, 600) };
  }).filter((p) => p.name.length >= 5).slice(0, 3);
}
