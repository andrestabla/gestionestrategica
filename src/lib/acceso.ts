// ─────────────────────────────────────────────────────────────────────────────
// Acceso por sección de la convención con código QR.
// Cada sección (Dirección 3x3, OKR, Iniciativas → KR, Priorización en vivo y
// Portafolio) tiene un enlace único «/<empresa>/acceso/<token>»: quien lo
// abre se identifica con nombre y correo y entra directo a esa sección. El
// usuario se crea una sola vez en la base (el correo es la clave: volver a
// entrar reutiliza la misma cuenta) con el rol que la sección define.
// Reglas puras; el store las aplica y las persiste.
// ─────────────────────────────────────────────────────────────────────────────
import type { Role } from "@/lib/permissions";

export type AccessSection = "convencion";
/** Pestañas de la convención (el menú) a las que lleva el acceso. */
export type AccessTab = "direccion" | "okr" | "iniciativas" | "priorizacion" | "portafolio";
export type AccessRole = Extract<Role, "LIDER" | "DIRECTIVO">;
export type AccessEntry = { token: string; role: AccessRole; at: string };
export type AccessConfig = Partial<Record<AccessSection, AccessEntry>>;
/** Rol que elige quien entra por el QR: miembro de tribu, líder de tribu o directivo (sin tribu). */
export type EntryRole = "miembro" | "lider" | "directivo";
export const ENTRY_ROLES: { id: EntryRole; label: string; what: string }[] = [
  { id: "miembro", label: "Miembro de tribu", what: "Ve toda la convención y califica las iniciativas de su tribu en Priorización en vivo." },
  { id: "lider", label: "Líder de tribu", what: "Además registra los OKR de su tribu y vincula sus iniciativas a los resultados clave (así quedan habilitadas para calificar)." },
  { id: "directivo", label: "Directivo", what: "Sin tribu: ve toda la convención (Dirección 3x3, OKR, iniciativas, ranking y Portafolio en tiempo real), pregunta y ratifica en plenaria." },
];
/** Miembros y líderes pertenecen a una tribu; el directivo no. */
export const entryRoleNeedsTribe = (r: EntryRole) => r !== "directivo";
export const isEntryRole = (r: unknown): r is EntryRole => ENTRY_ROLES.some((x) => x.id === r);

/** Un solo acceso para toda la convención: quien lo escanea elige su tribu y su rol y se mueve por las cinco secciones. */
export const ACCESS_SECTIONS: { id: AccessSection; tab: AccessTab; landing?: AccessTab | "itinerario"; label: string; short: string; role: AccessRole; what: string; askTribe?: boolean }[] = [
  // landing: lo primero que ve quien entra por el QR (la agenda de los dos días); tab: la sección de trabajo de referencia
  { id: "convencion", tab: "direccion", landing: "itinerario", label: "Convención", short: "Convención", role: "DIRECTIVO", askTribe: true, what: "Un solo QR para los dos días. Al entrar eliges tu rol (miembro de tribu, líder de tribu o directivo) y, si eres de una tribu, cuál; te mueves por Dirección 3x3, OKR, Iniciativas → KR, Priorización en vivo y Portafolio según lo que tu rol permite." },
];
/** Pestañas de la convención en orden (el menú). */
export const ACCESS_TABS: { id: AccessTab; label: string }[] = [
  { id: "direccion", label: "Dirección 3x3" }, { id: "okr", label: "OKR" }, { id: "iniciativas", label: "Iniciativas → KR" }, { id: "priorizacion", label: "Priorización en vivo" }, { id: "portafolio", label: "Portafolio" },
];
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
/** Adónde llega quien entra por el QR: la pestaña de llegada de la sección (el itinerario) o, si no la define, su pestaña de trabajo. */
export const sectionPath = (slug: string, section: AccessSection) => { const s = accessSection(section); return `/${slug}/panel/convencion?t=${s.landing ?? s.tab}`; };

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
