// Asistente de línea base y meta de un resultado clave: a partir de los resultados cerrados del año anterior (la línea
// base cargada en la plataforma) el modelo identifica el indicador equivalente, toma su último valor como línea base
// y propone una meta para el horizonte, coherente con el contexto de la empresa. Reglas puras.
import { contextoMetodo } from "@/lib/informe-ia";
import { AYUDA_RESULTADOS_CLAVE } from "@/lib/metodologia-ayuda";

export const SIN_LINEA_BASE = "No se dispone de línea base en la información cargada a la plataforma";

export type IndicadorBase = { code: string; name: string; unit?: string; ultimo?: number; periodo?: string; meta?: number; definition?: string; lever?: string };
export type PropuestaLineaBase = { encontrado: boolean; indicador: string; baseline: number | null; meta: number | null; unidad: string; periodo: string; justificacion: string };

export function encargoLineaBase(args: {
  empresa: { name: string; sector?: string }; horizonte: string;
  kr: { code: string; name: string; unit?: string; definition?: string; goodDirection?: string };
  objetivo: { id: string; name: string; lever?: string }; prioridad?: { id: string; name: string; indicator?: string };
  base: IndicadorBase[]; contexto?: string; fecha: string;
}): { system: string; user: string } {
  const system = [
    "Eres el advisor de 4Shine Empresas que acompaña al comité directivo de una empresa en Colombia. Escribes en español de Colombia, registro formal.",
    contextoMetodo(),
    AYUDA_RESULTADOS_CLAVE,
    "TAREA: para el resultado clave indicado, buscar entre los INDICADORES DE LÍNEA BASE (resultados cerrados del año anterior cargados en la plataforma) el indicador equivalente o más cercano. Si existe, «baseline» es su último valor medido (no la meta del año anterior) y «periodo» el periodo de ese valor; propón «meta» para el horizonte: ambiciosa pero plausible según la brecha frente a la meta anterior, el crecimiento del mercado y la posición de la empresa (contexto). Respeta la unidad del indicador base. Si ningún indicador corresponde de verdad al resultado clave (misma magnitud y alcance), responde encontrado=false y no inventes cifras.",
    "Responde solo JSON: {\"encontrado\":true|false,\"indicador\":\"código del indicador base o vacío\",\"baseline\":número o null,\"meta\":número o null,\"unidad\":\"…\",\"periodo\":\"p. ej. 2026-T3\",\"justificacion\":\"2 a 3 frases: por qué ese indicador equivale, de dónde sale la base y cómo se sustenta la meta\"}.",
  ].join("\n\n");
  const user = [
    `EMPRESA: ${args.empresa.name}${args.empresa.sector ? ` · ${args.empresa.sector}` : ""}. Fecha: ${args.fecha}. Horizonte del resultado clave: ${args.horizonte}.`,
    args.contexto ? `CONTEXTO DE LA EMPRESA:\n${args.contexto}` : "",
    args.prioridad ? `PRIORIDAD: ${args.prioridad.id} «${args.prioridad.name}»${args.prioridad.indicator ? ` · indicadores ${args.prioridad.indicator}` : ""}.` : "",
    `OBJETIVO: ${args.objetivo.id} «${args.objetivo.name}».`,
    `RESULTADO CLAVE: ${args.kr.code} «${args.kr.name}»${args.kr.unit ? ` · unidad ${args.kr.unit}` : ""}${args.kr.goodDirection ? ` · mejor si ${args.kr.goodDirection === "down" ? "baja" : "sube"}` : ""}${args.kr.definition ? `\n  definición: ${args.kr.definition}` : ""}`,
    `INDICADORES DE LÍNEA BASE (resultados cerrados):\n${args.base.map((b) => `- ${b.code}${b.lever ? ` [${b.lever}]` : ""} «${b.name}» · unidad ${b.unit ?? "—"} · último valor ${b.ultimo ?? "—"}${b.periodo ? ` (${b.periodo})` : ""} · meta anterior ${b.meta ?? "—"}${b.definition ? ` · ${b.definition.slice(0, 160)}` : ""}`).join("\n")}`,
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numOrNull = (v: unknown) => { const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN; return Number.isFinite(n) ? n : null; };

export function parseLineaBase(raw: unknown, codigosBase: string[]): PropuestaLineaBase {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const indicador = str(o.indicador, 20).toUpperCase();
  const baseline = numOrNull(o.baseline); const meta = numOrNull(o.meta);
  const encontrado = o.encontrado === true && codigosBase.some((c) => c.toUpperCase() === indicador) && baseline != null;
  return { encontrado, indicador: encontrado ? indicador : "", baseline: encontrado ? baseline : null, meta: encontrado ? meta : null, unidad: str(o.unidad, 30), periodo: str(o.periodo, 20), justificacion: str(o.justificacion, 600) };
}
