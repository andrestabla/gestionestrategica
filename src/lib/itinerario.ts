// ─────────────────────────────────────────────────────────────────────────────
// Itinerario de la convención: la ruta de los dos días, momento a momento, con
// la metodología, los materiales físicos, el uso de la plataforma y la salida
// de cada tramo. Se guarda en la empresa, puede publicarse sin sesión con un
// enlace propio, y el equipo organizador deja comentarios metodológicos o
// logísticos por momento. Reglas puras; el store las aplica y persiste.
// ─────────────────────────────────────────────────────────────────────────────

export type ItineraryKind = "conferencia" | "plenaria" | "taller" | "mesa" | "break" | "energizacion" | "logistica";
export const ITINERARY_KINDS: Record<ItineraryKind, string> = {
  conferencia: "Conferencia", plenaria: "Plenaria", taller: "Taller", mesa: "Mesa redonda", break: "Break", energizacion: "Energización", logistica: "Logística",
};
export type ItineraryDay = { id: string; title: string; sub?: string };
export type ItineraryItem = {
  id: string; day: string; time: string; minutes: number; title: string; kind: ItineraryKind; who: string;
  method: string; materials: string[]; platform: string; output: string;
  files?: string[];     // ids de archivos (PDF) vinculados a este momento
};
/** Archivo del itinerario guardado en el almacenamiento (R2 o local), siempre PDF. */
export type ItineraryFile = { id: string; name: string; size: number; at: string; by?: string; group?: string };
export type Itinerary = {
  title: string; sub?: string; days: ItineraryDay[]; items: ItineraryItem[];
  files?: ItineraryFile[];   // materiales en PDF (plantillas, presentaciones, guía)
  logo?: string;        // logo de la empresa para las vistas públicas (ruta /… o https://…)
  public: boolean;      // visible sin sesión en /<empresa>/p/itinerario/<token> (equipo organizador: metodología, materiales, plataforma y comentarios)
  token?: string;       // enlace público; se conserva al despublicar y cambia al regenerar
  publicP?: boolean;    // agenda para participantes publicada (solo horario, momento, quién y salida)
  tokenP?: string;      // enlace de la agenda para participantes
};

export type CommentKind = "metodologico" | "logistico";
export const COMMENT_KINDS: Record<CommentKind, string> = { metodologico: "Metodológico", logistico: "Logístico" };
export type ItineraryComment = {
  id: string; momentId: string; kind: CommentKind; author: string; email?: string; text: string; at: string;
  via: "sesion" | "publico"; resolvedAt?: string; resolvedBy?: string; consentAt?: string;
};

export const isKind = (k: unknown): k is ItineraryKind => typeof k === "string" && k in ITINERARY_KINDS;
export const isCommentKind = (k: unknown): k is CommentKind => k === "metodologico" || k === "logistico";
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

const s = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Valida el itinerario recibido (JSON del generador o de la interfaz). */
export const FILE_ID_RE = /^[a-z0-9][a-z0-9-]{3,60}$/;

export type ItineraryData = Omit<Itinerary, "public" | "token" | "publicP" | "tokenP">;
export function parseItinerary(input: unknown): { ok: true; itinerary: ItineraryData } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "El itinerario debe ser un objeto con días e ítems." };
  const raw = input as Record<string, unknown>;
  const title = s(raw.title, 160); if (title.length < 3) return { ok: false, error: "El itinerario necesita un título." };
  if (!Array.isArray(raw.days) || raw.days.length < 1 || raw.days.length > 6) return { ok: false, error: "El itinerario necesita entre uno y seis días." };
  const days: ItineraryDay[] = [];
  for (const d of raw.days as Record<string, unknown>[]) {
    const id = s(d?.id, 12).toLowerCase().replace(/[^a-z0-9-]/g, ""); const t = s(d?.title, 120);
    if (!id || t.length < 3) return { ok: false, error: "Cada día necesita id y título." };
    if (days.some((x) => x.id === id)) return { ok: false, error: `Día repetido: ${id}.` };
    days.push({ id, title: t, ...(s(d?.sub, 200) ? { sub: s(d?.sub, 200) } : {}) });
  }
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 150) return { ok: false, error: "El itinerario necesita entre 1 y 150 momentos." };
  const items: ItineraryItem[] = [];
  for (const it of raw.items as Record<string, unknown>[]) {
    const id = s(it?.id, 24).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const day = s(it?.day, 12).toLowerCase(); const title = s(it?.title, 200); const time = s(it?.time, 12);
    if (!id || !title || !time) return { ok: false, error: `Cada momento necesita id, hora y título (${id || title || "?"}).` };
    if (!days.some((d) => d.id === day)) return { ok: false, error: `El momento ${id} apunta a un día inexistente (${day}).` };
    if (items.some((x) => x.id === id)) return { ok: false, error: `Momento repetido: ${id}.` };
    const minutes = Math.max(0, Math.min(600, Math.round(Number(it?.minutes) || 0)));
    const kind = isKind(it?.kind) ? it.kind : "plenaria";
    const materials = Array.isArray(it?.materials) ? (it.materials as unknown[]).map((m) => s(m, 160)).filter(Boolean).slice(0, 12) : [];
    const files = Array.isArray(it?.files) ? (it.files as unknown[]).map((f) => s(f, 60)).filter((f) => FILE_ID_RE.test(f)).slice(0, 20) : [];
    items.push({ id, day, time, minutes, title, kind, who: s(it?.who, 200), method: s(it?.method, 1200), materials, platform: s(it?.platform, 400), output: s(it?.output, 300), ...(files.length ? { files } : {}) });
  }
  const files: ItineraryFile[] = [];
  if (Array.isArray(raw.files)) {
    for (const f of raw.files as Record<string, unknown>[]) {
      const id = s(f?.id, 60); const name = s(f?.name, 160);
      if (!FILE_ID_RE.test(id) || !name || files.some((x) => x.id === id)) continue;
      files.push({ id, name, size: Math.max(0, Math.round(Number(f?.size) || 0)), at: s(f?.at, 40) || new Date().toISOString(), ...(s(f?.by, 80) ? { by: s(f?.by, 80) } : {}), ...(s(f?.group, 40) ? { group: s(f?.group, 40) } : {}) });
    }
  }
  const known = new Set(files.map((f) => f.id));
  for (const it of items) if (it.files) { it.files = it.files.filter((f) => known.has(f)); if (!it.files.length) delete it.files; }
  const logo = s(raw.logo, 300); const logoOk = /^(\/[^\s]+|https:\/\/[^\s]+)$/.test(logo) ? logo : "";
  return { ok: true, itinerary: { title, ...(s(raw.sub, 200) ? { sub: s(raw.sub, 200) } : {}), days, items, ...(files.length ? { files } : {}), ...(logoOk ? { logo: logoOk } : {}) } };
}

/** Lo que ve el público: sin el token. */
export const publicItinerary = (it: Itinerary): Omit<Itinerary, "token" | "tokenP"> => { const { token: _t, tokenP: _p, ...rest } = it; void _t; void _p; return rest; };
/** Agenda para participantes: solo horario, momento, quién y salida (sin metodología, materiales, plataforma, archivos ni comentarios). */
export type ParticipantsItinerary = { title: string; sub?: string; logo?: string; days: ItineraryDay[]; items: { id: string; day: string; time: string; minutes: number; title: string; kind: ItineraryKind; who: string; output: string }[] };
export const participantsItinerary = (it: Itinerary): ParticipantsItinerary => ({
  title: it.title, ...(it.sub ? { sub: it.sub } : {}), ...(it.logo ? { logo: it.logo } : {}), days: it.days,
  items: it.items.map((x) => ({ id: x.id, day: x.day, time: x.time, minutes: x.minutes, title: x.title, kind: x.kind, who: x.who, output: x.output })),
});

export const itineraryPublicPath = (slug: string, token: string) => `/${slug}/p/itinerario/${token}`;
/** Ruta de lectura en línea de un material: con sesión o, en el enlace público, con el token. */
export const materialPath = (fileId: string, pub?: { slug: string; token: string }) => pub ? `/${pub.slug}/api/public/itinerario/material?token=${pub.token}&id=${fileId}` : `/api/td/itinerario/material/${fileId}`;
export const fileIdFrom = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\.pdf$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
