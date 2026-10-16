// ─────────────────────────────────────────────────────────────────────────────
// Acceso por sección de la convención con código QR.
// Cada sección (Dirección, OKR, Iniciativas → KR, Priorización en vivo y
// Portafolio) tiene un enlace único «/<empresa>/acceso/<token>»: quien lo
// abre se identifica con nombre y correo y entra directo a esa sección. El
// usuario se crea una sola vez en la base (el correo es la clave: volver a
// entrar reutiliza la misma cuenta) con el rol que la sección define.
// Reglas puras; el store las aplica y las persiste.
// ─────────────────────────────────────────────────────────────────────────────
import type { Role } from "@/lib/permissions";

export type AccessSection = "direccion" | "okr-ver" | "okr" | "iniciativas-ver" | "iniciativas" | "priorizacion" | "portafolio";
/** Pestaña de la convención a la que lleva cada sección (varias secciones pueden abrir la misma pestaña: ver o editar). */
export type AccessTab = "direccion" | "okr" | "iniciativas" | "priorizacion" | "portafolio";
export type AccessRole = Extract<Role, "LIDER" | "DIRECTIVO">;
export type AccessEntry = { token: string; role: AccessRole; at: string };
export type AccessConfig = Partial<Record<AccessSection, AccessEntry>>;

/** Secciones de la convención, su rol por defecto y lo que ese rol permite. */
export const ACCESS_SECTIONS: { id: AccessSection; tab: AccessTab; label: string; short: string; role: AccessRole; what: string; askTribe?: boolean }[] = [
  { id: "direccion", tab: "direccion", label: "Dirección · ver", short: "Dirección", role: "DIRECTIVO", what: "Ver la matriz de objetivos por palanca y horizonte. Durante la convención no se modifica." },
  { id: "okr-ver", tab: "okr", label: "OKR · ver", short: "OKR", role: "DIRECTIVO", what: "Ver los objetivos y resultados clave de todas las tribus; filtrar por objetivo o tribu." },
  { id: "okr", tab: "okr", label: "OKR · editar (líder de tribu)", short: "OKR", role: "LIDER", what: "Registrar los resultados clave de la tribu: línea base, meta, dueño y plazo (de 2 a 5 por objetivo)." },
  { id: "iniciativas-ver", tab: "iniciativas", label: "Iniciativas → KR · ver", short: "Iniciativas → KR", role: "DIRECTIVO", what: "Ver qué iniciativa mueve cada resultado clave." },
  { id: "iniciativas", tab: "iniciativas", label: "Iniciativas → KR · editar (líder de tribu)", short: "Iniciativas → KR", role: "LIDER", what: "Vincular cada iniciativa de la tribu al resultado clave que mueve; así queda habilitada para calificar." },
  { id: "priorizacion", tab: "priorizacion", label: "Priorización en vivo", short: "Priorización en vivo", role: "DIRECTIVO", askTribe: true, what: "Calificar las iniciativas de tu tribu con la matriz 4Shine y ver el ranking en vivo. Al entrar eliges tu tribu." },
  { id: "portafolio", tab: "portafolio", label: "Portafolio", short: "Portafolio", role: "DIRECTIVO", what: "Ver los resultados en tiempo real: el 100 % de las iniciativas por horizonte y decisión, con filtros." },
];
/** Pestañas de la convención en orden, una vez por pestaña (para el menú). */
export const ACCESS_TABS: { id: AccessTab; label: string }[] = ACCESS_SECTIONS.reduce<{ id: AccessTab; label: string }[]>((acc, s) => (acc.some((x) => x.id === s.tab) ? acc : [...acc, { id: s.tab, label: s.short }]), []);
export const isAccessTab = (t: unknown): t is AccessTab => ACCESS_TABS.some((x) => x.id === t);
export const ACCESS_ROLES: { id: AccessRole; label: string; what: string }[] = [
  { id: "DIRECTIVO", label: "Consulta y evalúa", what: "Ve todo, califica iniciativas con la matriz; no edita." },
  { id: "LIDER", label: "Edita", what: "Además edita objetivos, resultados clave e iniciativas y decide el tiempo." },
];
export const isAccessSection = (s: unknown): s is AccessSection => ACCESS_SECTIONS.some((x) => x.id === s);
export const isAccessRole = (r: unknown): r is AccessRole => ACCESS_ROLES.some((x) => x.id === r);
export const accessSection = (id: AccessSection) => ACCESS_SECTIONS.find((s) => s.id === id)!;

/** Enlace que lleva el QR. */
export const accessUrl = (origin: string, slug: string, token: string) => `${origin.replace(/\/$/, "")}/${slug}/acceso/${token}`;
/** Ruta de la sección dentro de la empresa. */
export const sectionPath = (slug: string, section: AccessSection) => `/${slug}/panel/convencion?t=${accessSection(section).tab}`;

export const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Valida la configuración guardada: secciones conocidas, token y rol válidos. */
export function parseAccess(input: unknown): { ok: true; access?: AccessConfig } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, access: undefined };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "El acceso por sección debe ser un objeto por sección." };
  const out: AccessConfig = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!isAccessSection(k)) continue;
    const e = v as Record<string, unknown> | null;
    const token = typeof e?.token === "string" ? e.token : "";
    const role = isAccessRole(e?.role) ? e!.role : accessSection(k).role;
    if (!TOKEN_RE.test(token)) return { ok: false, error: `El token de la sección ${k} no es válido.` };
    out[k] = { token, role, at: typeof e?.at === "string" ? e.at : new Date().toISOString() };
  }
  return { ok: true, access: Object.keys(out).length ? out : undefined };
}

/** Sección a la que da acceso un token, o null. */
export function sectionOfToken(access: AccessConfig | undefined, token: string): AccessSection | null {
  if (!access || !TOKEN_RE.test(token)) return null;
  for (const s of ACCESS_SECTIONS) if (access[s.id]?.token === token) return s.id;
  return null;
}

/** Modo de la empresa: completa (todos los módulos) o convención (solo las cinco secciones). */
export type CompanyMode = "completa" | "convencion";
export const isCompanyMode = (m: unknown): m is CompanyMode => m === "completa" || m === "convencion";
