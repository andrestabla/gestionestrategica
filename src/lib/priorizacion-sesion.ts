// ─────────────────────────────────────────────────────────────────────────────
// Sesión de calificación por tribu en la priorización en vivo (modo convención).
// El líder de tribu abre la calificación (antes nadie de la tribu califica),
// la cierra para revisar, ajusta el orden a mano si hace falta y guarda; cada
// miembro califica una sola vez. Se guarda en la empresa, por tribu
// (responsable del catálogo). Reglas puras; el store las aplica y persiste.
// ─────────────────────────────────────────────────────────────────────────────

export type PrioSessionStatus = "cerrada" | "abierta" | "revision" | "guardada";
export type PrioSession = {
  status: PrioSessionStatus;
  openedAt?: string; openedBy?: string;
  closedAt?: string;
  savedAt?: string; savedBy?: string;
  order?: string[];   // orden definitivo de las iniciativas de la tribu (ids), fijado por el líder
};
export type PrioSessions = Record<string, PrioSession>;   // por tribu (id del responsable)
export type PrioSessionAction = "abrir" | "cerrar" | "guardar" | "reabrir";

export const PRIO_STATUS_LABEL: Record<PrioSessionStatus, string> = {
  cerrada: "Calificación sin abrir", abierta: "Calificación abierta", revision: "Calificación cerrada · en revisión del líder", guardada: "Priorización guardada",
};
export const sessionOf = (sessions: PrioSessions | undefined, tribeId: string | undefined): PrioSession => sessions?.[tribeId ?? ""] ?? { status: "cerrada" };

const ISO = /^\d{4}-\d{2}-\d{2}T/;
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Valida lo guardado: solo tribus con estado conocido; el orden, ids cortos y sin repetir. */
export function parsePrioSessions(input: unknown): { ok: true; sessions?: PrioSessions } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, sessions: undefined };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Las sesiones de calificación deben ser un objeto por tribu." };
  const out: PrioSessions = {};
  for (const [tribe, raw] of Object.entries(input as Record<string, unknown>)) {
    const r = raw as Record<string, unknown> | null;
    const status = r?.status;
    if (status !== "cerrada" && status !== "abierta" && status !== "revision" && status !== "guardada") continue;
    const e: PrioSession = { status };
    for (const k of ["openedAt", "closedAt", "savedAt"] as const) { const v = s(r?.[k], 40); if (ISO.test(v)) e[k] = v; }
    for (const k of ["openedBy", "savedBy"] as const) { const v = s(r?.[k], 160); if (v) e[k] = v; }
    if (Array.isArray(r?.order)) { const ids = [...new Set((r!.order as unknown[]).map((x) => s(x, 20)).filter(Boolean))].slice(0, 200); if (ids.length) e.order = ids; }
    out[s(tribe, 20) || tribe] = e;
  }
  return { ok: true, sessions: Object.keys(out).length ? out : undefined };
}

/** Transición de estado por acción; null si la acción no procede desde el estado actual. */
export function nextStatus(current: PrioSessionStatus, action: PrioSessionAction): PrioSessionStatus | null {
  switch (action) {
    case "abrir": return current === "cerrada" || current === "guardada" ? "abierta" : null;
    case "cerrar": return current === "abierta" ? "revision" : null;
    case "guardar": return current === "revision" || current === "abierta" ? "guardada" : null;
    case "reabrir": return current === "guardada" || current === "revision" ? "abierta" : null;
  }
}
