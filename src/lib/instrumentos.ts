// ─────────────────────────────────────────────────────────────────────────────
// Instrumentos del diagnóstico de capacidades que cada empresa habilita.
// Todos viven en la plataforma; la empresa decide cuáles usa en su diagnóstico
// (p. ej. solo la autoevaluación directiva en un acompañamiento sin test ni
// encuesta de equipos). Sin configuración, todos están habilitados. El store
// exige la habilitación al guardar (403) y la UI oculta lo no habilitado.
// ─────────────────────────────────────────────────────────────────────────────

export const INSTRUMENTS = [
  { id: "test", label: "Test de capacidad empresarial", desc: "24 preguntas más el desafío dominante; puerta de entrada (gerente general y dos directivos)." },
  { id: "f1", label: "Autoevaluación directiva (Fuente 1)", desc: "68 ítems del mapa, uno por práctica, respondidos por cada cuenta de la empresa." },
  { id: "f2", label: "Percepción de equipos (Fuente 2)", desc: "Encuesta anónima por enlace a mandos medios y colaboradores." },
  { id: "captura", label: "Captura A3 · evidencia y nivel (Fuente 3)", desc: "Verificación de evidencia y nivel por práctica por parte del advisor; publica el corte." },
] as const;

export type Instrument = (typeof INSTRUMENTS)[number]["id"];
export const ALL_INSTRUMENTS: Instrument[] = INSTRUMENTS.map((i) => i.id);
export const isInstrument = (x: unknown): x is Instrument => ALL_INSTRUMENTS.includes(x as Instrument);

/** Valida la lista guardada: nula o vacía = todos; una lista, solo ids conocidos y al menos uno. */
export function parseInstruments(input: unknown): { ok: true; instruments?: Instrument[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, instruments: undefined };
  if (!Array.isArray(input)) return { ok: false, error: "Los instrumentos del diagnóstico deben ser una lista." };
  const out = [...new Set(input.filter(isInstrument))];
  const desconocidos = input.filter((x) => !isInstrument(x));
  if (desconocidos.length) return { ok: false, error: `Instrumento desconocido: ${desconocidos.map(String).join(", ")}. Opciones: ${ALL_INSTRUMENTS.join(", ")}.` };
  if (out.length === 0) return { ok: false, error: "Habilita al menos un instrumento del diagnóstico." };
  // con todos habilitados no hace falta guardar nada
  return { ok: true, instruments: out.length === ALL_INSTRUMENTS.length ? undefined : ALL_INSTRUMENTS.filter((i) => out.includes(i)) };
}

export const instrumentsOf = (c: { instruments?: Instrument[] } | null | undefined): Instrument[] => c?.instruments?.length ? c.instruments : ALL_INSTRUMENTS;
export const hasInstrument = (c: { instruments?: Instrument[] } | null | undefined, id: Instrument): boolean => instrumentsOf(c).includes(id);
export const instrumentLabel = (id: Instrument): string => INSTRUMENTS.find((i) => i.id === id)?.label ?? id;
