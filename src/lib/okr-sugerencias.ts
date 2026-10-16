// ─────────────────────────────────────────────────────────────────────────────
// Sugerencias de OKR por palanca y tribu (con el modelo de OpenAI) y el ejemplo
// de un OKR completo por palanca. Reglas puras: armar el encargo, validar la
// respuesta y ofrecer el ejemplo; la ruta del API hace la llamada.
// ─────────────────────────────────────────────────────────────────────────────
import type { Catalog, Lever } from "@/data/catalogo";
import type { KrTemplate } from "@/lib/okr-plantillas";

export type KrSugerido = { name: string; unit: string; goodDirection: "up" | "down"; frequency: "Mensual" | "Trimestral" | "Semestral" | "Anual"; definition?: string; formula?: string; target?: number | null; why?: string };
export type OkrSugerido = { objective: { name: string; desc?: string; indicator?: string }; krs: KrSugerido[]; why?: string };

/** Ejemplo de OKR completo (un objetivo con tres resultados clave) por palanca; valores ilustrativos. */
export const OKR_EJEMPLOS: Record<string, OkrSugerido> & { default: OkrSugerido } = {
  MS: { objective: { name: "Cercanía optimizada: alcanzar 1.000 PDV en funcionamiento con punto de equilibrio en menos de 12 meses", desc: "Crecer por formato y por ciudad intermedia sin sacrificar la economía de cada punto de venta.", indicator: "PDV en funcionamiento" },
    krs: [ { name: "PDV en funcionamiento", unit: "PDV", goodDirection: "up", frequency: "Trimestral", formula: "PDV antiguos + PDV de nuevas aperturas", target: 1000, why: "Base 860 (sep-2026) → 1.000 a 2027-T4 · dueño: líder del escuadrón Cercanía optimizada" },
      { name: "Días promedio al punto de equilibrio de los nuevos PDV", unit: "días", goodDirection: "down", frequency: "Trimestral", formula: "Σ días desde la apertura hasta el punto de equilibrio / PDV nuevos", target: 330, why: "Base 14 meses (cohorte 2025) → 11 meses a 2027-T4" },
      { name: "Market Share de la marca en nuevos mercados (%)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "Ventas netas de la marca en los nuevos mercados / ventas del mercado de farmacia allí × 100", target: 6, why: "Base 3,1 % (sep-2026) → 6,0 % a 2027-T4" } ] },
  FID: { objective: { name: "Experiencia de servicio: elevar el NPS de servicio a 60 puntos en las dos marcas", desc: "Que el cliente recomiende la farmacia por cómo lo atendieron, no solo por el precio.", indicator: "NPS de servicio" },
    krs: [ { name: "NPS de servicio (puntos)", unit: "puntos", goodDirection: "up", frequency: "Mensual", formula: "% promotores (9–10) − % detractores (0–6)", target: 60, why: "Base por medir en oct-2026 → 60 a 2027-T4" },
      { name: "Tiempo promedio de espera para ser atendido (minutos)", unit: "minutos", goodDirection: "down", frequency: "Mensual", formula: "Σ tiempos de espera / clientes atendidos", target: 4, why: "Base 7 min (muestra piloto) → 4 min a 2027-T4" },
      { name: "Clientes en planes de fidelización que redimen al menos un beneficio (%)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "Clientes en planes que redimieron ≥ 1 beneficio / clientes inscritos × 100", target: 45, why: "Base 28 % → 45 % a 2027-T4" } ] },
  MAD: { objective: { name: "Cultura impulsora: retener y desarrollar el talento crítico que sostiene la expansión", desc: "Que la gente clave se quede, crezca y cubra los cargos críticos de una red que se duplica.", indicator: "Retención del talento" },
    krs: [ { name: "Rotación de personal (%)", unit: "%", goodDirection: "down", frequency: "Mensual", formula: "Salidas del periodo / dotación promedio × 100", target: 15, why: "Base 20 % (2026) → 15 % a 2027-T4" },
      { name: "Cobertura efectiva de talento crítico (%)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "Cargos críticos con sucesor y plan en ejecución / cargos críticos definidos × 100", target: 70, why: "Base 17 sucesores identificados, 0 planes en ejecución → 70 % a 2027-T4" },
      { name: "eNPS · recomendación del colaborador (%)", unit: "%", goodDirection: "up", frequency: "Semestral", formula: "% promotores − % detractores entre colaboradores", target: 60, why: "Base por medir en nov-2026 → 60 a 2027-T4" } ] },
  MAR: { objective: { name: "Portafolio óptimo: elevar el margen bruto del portafolio con categorías estrella y marcas propias", desc: "Ganar margen por mezcla, no por precio: donde la marca propia y la dermocosmética compensan la guerra del genérico.", indicator: "Margen bruto del portafolio (%)" },
    krs: [ { name: "Margen bruto del portafolio (%)", unit: "%", goodDirection: "up", frequency: "Mensual", formula: "Margen bruto del portafolio / ventas netas del portafolio × 100", target: 30, why: "Base 27,5 % (2026) → 30 % a 2027-T4" },
      { name: "Participación de marcas propias en categorías estrella (%)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "Ventas netas de marcas propias en categorías estrella / ventas de esas categorías × 100", target: 5, why: "Base 3,0 % → 5,0 % a 2027-T4" },
      { name: "Índice de precio frente a la competencia en la canasta estratégica", unit: "índice", goodDirection: "down", frequency: "Mensual", formula: "Precio promedio propio de la canasta / precio promedio de la competencia × 100", target: 100, why: "Base 103 → 100 a 2027-T4 (paridad)" } ] },
  default: { objective: { name: "Objetivo 2027 de la tribu: qué cambia y para quién", desc: "Escribe el logro en una frase; el «cuánto» va en los resultados clave.", indicator: "Indicador impulsor de la palanca" },
    krs: [ { name: "Resultado de negocio (tipo 1)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "Cómo se calcula", why: "Línea base real con fecha → meta a 2027-T4" },
      { name: "Resultado de desempeño que la tribu controla (tipo 2)", unit: "número", goodDirection: "up", frequency: "Mensual", formula: "Cómo se calcula", why: "Línea base → meta" },
      { name: "Hito verificable si el resultado no se mide en 2027 (tipo 3)", unit: "%", goodDirection: "up", frequency: "Trimestral", formula: "Hitos completados / planificados × 100", why: "0 → 100 % a 2027-T4" } ] },
};
export const ejemploPara = (leverId: string): OkrSugerido => OKR_EJEMPLOS[leverId] ?? OKR_EJEMPLOS.default;

/** Encargo al modelo: contexto de la empresa, la palanca, la tribu, los objetivos directivos y la biblioteca de plantillas. */
export type ObjetivoEscrito = { name: string; desc?: string; indicator?: string };

/** Con `objective` (el que escribió la tribu) el modelo propone sus resultados clave; sin él, propone OKR completos. */
export function armarEncargo(cat: Catalog, lever: Lever, tribeName: string, templates: KrTemplate[], objective?: ObjetivoEscrito): { system: string; user: string } {
  const directivos = cat.objectives.filter((o) => !o.okr && o.lever === lever.id).map((o) => `- ${o.id} (${o.horizon ?? "?"}): ${o.name}${o.indicator ? ` · indicador: ${o.indicator}` : ""}${o.desc ? ` · ${o.desc}` : ""}`).join("\n");
  const propios = cat.objectives.filter((o) => o.okr && o.lever === lever.id).map((o) => `- ${o.name}`).join("\n");
  const plantillas = templates.map((t) => `- ${t.name} (${t.unit}${t.goodDirection === "down" ? ", mejor si baja" : ""})${t.formula ? ` · fórmula: ${t.formula}` : ""}`).join("\n");
  const system = `Eres un consultor de planeación estratégica que ayuda a una tribu a escribir sus OKR 2027 con el método 4Shine Empresas: un objetivo cualitativo y de 2 a 4 resultados clave (máximo 5) medibles, con unidad, sentido, frecuencia, definición y fórmula. Regla: al menos dos resultados clave de resultado de negocio (lo que cambia para el cliente, el colaborador o el margen), como máximo uno de hito. Nunca propongas actividades como resultados clave. Escribe en español de Ecuador, concreto y breve. Responde solo JSON con esta forma exacta:
{"propuestas":[{"objective":{"name":"…","desc":"…","indicator":"…"},"why":"…","krs":[{"name":"…","unit":"…","goodDirection":"up|down","frequency":"Mensual|Trimestral|Semestral|Anual","definition":"…","formula":"…","target":null,"why":"…"}]}]}
${objective
    ? `Devuelve exactamente 1 propuesta: en "objective" conserva el objetivo que escribió la tribu (puedes afinar la redacción solo si gana claridad, sin cambiar su intención) y propón 3 resultados clave que lo midan (nunca actividades). En "why" de cada resultado clave explica en una frase qué mide y por qué importa.`
    : `Devuelve exactamente 2 propuestas, cada una con 3 resultados clave. En "why" explica en una frase por qué es pertinente para esta palanca y tribu.`} En "target" deja null salvo que el contexto dé una meta explícita.`;
  const user = `Empresa: ${cat.company.name} (${cat.company.sector || "retail farmacéutico"}, ${cat.company.country === "EC" ? "Ecuador" : cat.company.department || ""}).
Palanca: ${lever.name}${lever.indicator ? ` · indicador principal: ${lever.indicator}` : ""}${lever.desc ? ` · ${lever.desc}` : ""}.
Tribu: ${tribeName}.
Objetivos directivos de esta palanca (lineamientos del Directorio, por horizonte):
${directivos || "- (sin objetivos directivos cargados)"}
${propios ? `Objetivos que la tribu ya escribió hoy (no los repitas):\n${propios}\n` : ""}Biblioteca de indicadores disponibles para esta palanca (puedes usarlos o proponer otros mejores):
${plantillas || "- (sin biblioteca)"}
${objective
    ? `Objetivo 2027 que escribió la tribu: «${objective.name}»${objective.desc ? ` · aspiración: ${objective.desc}` : ""}${objective.indicator ? ` · indicador impulsor: ${objective.indicator}` : ""}.
Propón los 3 resultados clave técnicos más pertinentes para medir ese objetivo (al menos dos de resultado de negocio, como máximo uno de hito).`
    : `Propón los 2 OKR 2027 más pertinentes para esta tribu, derivados de los objetivos directivos de su palanca, cada uno con 3 resultados clave técnicos.`}`;
  return { system, user };
}

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const FREQ = ["Mensual", "Trimestral", "Semestral", "Anual"] as const;
/** Valida la respuesta del modelo; descarta propuestas incompletas. */
export function parseSugerencias(input: unknown): OkrSugerido[] {
  const raw = (input as { propuestas?: unknown })?.propuestas;
  if (!Array.isArray(raw)) return [];
  const out: OkrSugerido[] = [];
  for (const p of raw as Record<string, unknown>[]) {
    const o = p?.objective as Record<string, unknown> | undefined;
    const name = s(o?.name, 200); if (name.length < 10) continue;
    const krs: KrSugerido[] = [];
    for (const k of (Array.isArray(p?.krs) ? (p.krs as Record<string, unknown>[]) : []).slice(0, 5)) {
      const kn = s(k?.name, 200), unit = s(k?.unit, 20) || "%"; if (kn.length < 5) continue;
      const t = Number(k?.target);
      krs.push({ name: kn, unit, goodDirection: k?.goodDirection === "down" ? "down" : "up", frequency: FREQ.find((f) => f === k?.frequency) ?? "Trimestral",
        ...(s(k?.definition, 600) ? { definition: s(k?.definition, 600) } : {}), ...(s(k?.formula, 300) ? { formula: s(k?.formula, 300) } : {}),
        target: k?.target === null || k?.target === undefined || !Number.isFinite(t) ? null : t, ...(s(k?.why, 300) ? { why: s(k?.why, 300) } : {}) });
    }
    if (krs.length < 2) continue;
    out.push({ objective: { name, ...(s(o?.desc, 600) ? { desc: s(o?.desc, 600) } : {}), ...(s(o?.indicator, 200) ? { indicator: s(o?.indicator, 200) } : {}) }, krs, ...(s(p?.why, 300) ? { why: s(p?.why, 300) } : {}) });
  }
  return out.slice(0, 3);
}

/* ═══ ¿A qué OKR se vincula una iniciativa? ═══ */

export type CandidatoOkr = { id: string; name: string; krs: { code: string; name: string }[] };
export const SIN_VINCULO = "No hay evidentemente un OKR con el que se pueda vincular esta iniciativa. Analiza muy bien esta situación. ¿Vale la pena?";
export type VinculoSugerido = { objective: string; kpi: string; why: string; none?: true };

/** Encargo: dada la iniciativa (nombre y qué logra) y los OKR de las tribus, el modelo elige el objetivo y, si existe, el resultado clave que más mueve. */
export function armarVinculo(cat: Catalog, initiative: { name: string; objetivo?: string }, candidatos: CandidatoOkr[]): { system: string; user: string } {
  const system = `Eres un consultor de planeación estratégica (método 4Shine Empresas). Una iniciativa es lo que se hace para mover un resultado clave. Dada una iniciativa y la lista de OKR de las tribus, elige el objetivo al que la iniciativa contribuye de forma evidente y, si ese objetivo tiene resultados clave, el que más mueve. Sé estricto: vincula solo cuando la relación sea clara por el contenido (qué logra la iniciativa y qué mide el objetivo); no fuerces un vínculo por descarte ni elijas objetivos cuyo nombre no sea un objetivo comprensible (texto de prueba, abreviaturas sin sentido). Si ningún objetivo está evidentemente relacionado, devuelve "objective" y "kpi" vacíos. Responde solo JSON con esta forma exacta: {"objective":"<id del objetivo o cadena vacía>","kpi":"<código del resultado clave o cadena vacía>","why":"<una frase en español: por qué ese vínculo, o por qué ninguno>"}. Usa únicamente ids y códigos de la lista.`;
  const lista = candidatos.map((o) => `- ${o.id}: ${o.name}${o.krs.length ? `\n${o.krs.map((k) => `    · ${k.code}: ${k.name}`).join("\n")}` : "\n    (sin resultados clave todavía)"}`).join("\n");
  const user = `Empresa: ${cat.company.name}.
Iniciativa: «${initiative.name}»${initiative.objetivo ? ` · qué logra y cómo: ${initiative.objetivo}` : ""}.
OKR de las tribus (objetivo y sus resultados clave):
${lista}
¿A qué objetivo y resultado clave se vincula esta iniciativa?`;
  return { system, user };
}

/** Valida la respuesta: el objetivo debe existir entre los candidatos y el KR, si viene, pertenecer a ese objetivo.
    Objetivo vacío o desconocido = no hay OKR evidente (`none`); respuesta no interpretable = null. */
export function parseVinculo(input: unknown, candidatos: CandidatoOkr[]): VinculoSugerido | null {
  const r = input && typeof input === "object" ? input as Record<string, unknown> : null;
  if (!r) return null;
  const objective = typeof r.objective === "string" ? r.objective.trim() : "";
  const o = candidatos.find((c) => c.id === objective);
  if (!o) return { objective: "", kpi: "", why: SIN_VINCULO, none: true };
  const kpiRaw = typeof r?.kpi === "string" ? r.kpi.trim().toUpperCase() : "";
  const kpi = o.krs.some((k) => k.code === kpiRaw) ? kpiRaw : "";
  return { objective: o.id, kpi, why: typeof r?.why === "string" ? r.why.trim().slice(0, 300) : "" };
}
