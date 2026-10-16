// ─────────────────────────────────────────────────────────────────────────────
// Plantillas de resultados clave por objetivo: una biblioteca de KR técnicos y
// depurados (código, nombre, unidad, sentido, frecuencia, definición y fórmula)
// que el líder de tribu puede preseleccionar al crear un resultado clave en el
// laboratorio de OKR. No son KR del catálogo: solo prellenan el formulario; la
// tribu fija línea base, meta, dueño y plazo. Se guardan en la empresa.
// ─────────────────────────────────────────────────────────────────────────────

export type KrTemplate = {
  oe: string;            // objetivo al que aplica (id del catálogo, p. ej. OE-01)
  code: string;          // código sugerido (se usa si está libre)
  name: string;
  unit: string;
  goodDirection?: "up" | "down";
  frequency?: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  definition?: string;   // pregunta que responde o cómo se interpreta
  formula?: string;      // cómo se calcula
  source?: string;       // de dónde sale el dato
  baseline?: number;     // línea base conocida (si existe)
  target?: number;       // meta sugerida (si existe)
};

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const FREQ = ["Mensual", "Trimestral", "Semestral", "Anual"] as const;

/** Valida la lista de plantillas (hasta 200). Devuelve undefined si no hay ninguna. */
export function parseKrTemplates(input: unknown): { ok: true; templates?: KrTemplate[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, templates: undefined };
  if (!Array.isArray(input)) return { ok: false, error: "Las plantillas de KR deben ser una lista." };
  if (input.length > 200) return { ok: false, error: "Máximo 200 plantillas de KR." };
  const out: KrTemplate[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const oe = s(raw?.oe, 10), code = s(raw?.code, 20).toUpperCase(), name = s(raw?.name, 200), unit = s(raw?.unit, 20);
    if (!oe || !/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(code) || name.length < 5 || !unit) return { ok: false, error: `Plantilla incompleta (${code || name || "?"}): objetivo, código, nombre y unidad son obligatorios.` };
    if (out.some((t) => t.code === code)) return { ok: false, error: `Código de plantilla repetido: ${code}.` };
    const t: KrTemplate = { oe, code, name, unit };
    if (raw?.goodDirection === "down" || raw?.goodDirection === "up") t.goodDirection = raw.goodDirection;
    const f = FREQ.find((x) => x === raw?.frequency); if (f) t.frequency = f;
    if (s(raw?.definition, 600)) t.definition = s(raw?.definition, 600);
    if (s(raw?.formula, 300)) t.formula = s(raw?.formula, 300);
    if (s(raw?.source, 160)) t.source = s(raw?.source, 160);
    for (const k of ["baseline", "target"] as const) { const n = Number(raw?.[k]); if (raw?.[k] !== undefined && raw?.[k] !== null && raw?.[k] !== "" && Number.isFinite(n)) t[k] = n; }
    out.push(t);
  }
  return { ok: true, templates: out.length ? out : undefined };
}

/** Plantillas aplicables a un objetivo. */
export const templatesFor = (templates: KrTemplate[] | undefined, oe: string) => (templates ?? []).filter((t) => t.oe === oe);
