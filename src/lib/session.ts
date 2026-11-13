// Sesión firmada con HMAC en cookie HttpOnly.
// En producción la clave viene de AUTH_SECRET; el prototipo trae un valor de desarrollo.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { authSecret, hayClave } from "@/lib/clave";

const COOKIE = "pgtd_session";
import { INACTIVIDAD_MIN } from "@/lib/inactividad";
const MAX_AGE = 60 * INACTIVIDAD_MIN; // 30 minutos de inactividad: cada petición a la API renueva la cookie (renewSession)

import type { CompanyMode } from "@/lib/acceso";
/** Empresa activa de la sesión; `mode` permite que los permisos distingan el acompañamiento (el directivo define la estrategia). */
export type SessionCompany = { slug: string; name: string; shortName: string; mode?: CompanyMode };

export type SessionUser = {
  email: string;
  name: string;
  role: "ADMIN" | "CONSULTOR" | "LIDER" | "RESPONSABLE" | "DIRECTIVO";
  line?: number;
  /** Responsable del catálogo (tribu, área) que delimita el ámbito de un RESPONSABLE. */
  responsibleId?: string;
  /** Entró por el QR de la convención: ve la agenda de participantes, no el itinerario del equipo organizador. */
  qr?: true;
  /** La sesión pasó la verificación en dos pasos (código al correo, o enlace de restablecimiento): las empresas que la exigen solo admiten sesiones así. */
  mfa?: true;
  /** Empresa del usuario. El admin de plataforma no tiene empresa propia: aquí
      va la que eligió como contexto activo (puede cambiarla). */
  company?: SessionCompany;
  /** Empresas en las que la cuenta opera (principal y membresías) cuando son más de una: el selector de empresa. */
  empresas?: { slug: string; shortName: string; role: SessionUser["role"] }[];
  /** Momento en que la persona se identificó (ms). Se conserva al renovar la cookie o cambiar de empresa: las
      sesiones abiertas antes de un cambio de contraseña dejan de valer (sesionVigente, en el store). */
  iat?: number;
};

const sign = (payload: string) =>
  createHmac("sha256", authSecret()).update(payload).digest("base64url");

export function encodeSession(user: SessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...user, iat: typeof user.iat === "number" ? user.iat : Date.now(), exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !hayClave()) return null;
  const expected = sign(body);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (typeof data.email !== "string" || typeof data.role !== "string") return null;
    const company = data.company && typeof data.company.slug === "string"
      ? { slug: String(data.company.slug), name: String(data.company.name ?? ""), shortName: String(data.company.shortName ?? ""), ...(typeof data.company.mode === "string" ? { mode: data.company.mode as CompanyMode } : {}) }
      : undefined;
    const empresas = Array.isArray(data.empresas)
      ? (data.empresas as unknown[]).flatMap((e) => (e && typeof e === "object" && typeof (e as { slug?: unknown }).slug === "string" ? [{ slug: String((e as { slug: string }).slug), shortName: String((e as { shortName?: unknown }).shortName ?? ""), role: (e as { role?: SessionUser["role"] }).role ?? "DIRECTIVO" }] : []))
      : [];
    return { email: data.email, name: data.name, role: data.role, line: data.line, responsibleId: typeof data.responsibleId === "string" ? data.responsibleId : undefined, ...(data.qr === true ? { qr: true as const } : {}), ...(data.mfa === true ? { mfa: true as const } : {}), company, ...(empresas.length > 1 ? { empresas } : {}), ...(typeof data.iat === "number" ? { iat: data.iat } : {}) };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE)?.value);
}

export async function setSession(user: SessionUser) {
  const store = await cookies();
  store.set(COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Renueva la cookie si la sesión sigue válida y lleva más de 5 minutos emitida: así el cierre es por
    inactividad (30 min sin peticiones) y no por tiempo fijo desde el login. Solo desde rutas de API. */
export async function renewSession(user: SessionUser) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value; if (!token) return;
  try {
    const data = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    if (typeof data.exp === "number" && data.exp - Date.now() < (MAX_AGE - 5 * 60) * 1000) await setSession(user);
  } catch { /* token ilegible: no se renueva */ }
}

/** Cambia datos de la cuenta en la sesión vigente (nombre, verificación en dos pasos) sin tocar su empresa activa.
    Las rutas de la API reciben la sesión tal como opera en la empresa de la PÁGINA, que puede no ser la activa de la
    cookie (otra pestaña la cambió): reescribir la cookie con esa copia cambiaría de empresa a las demás pestañas. */
export async function patchSession(cambios: Partial<Pick<SessionUser, "name" | "mfa">>) {
  const actual = await getSession();
  if (actual) await setSession({ ...actual, ...cambios });
}

/** Vuelve a emitir la cookie de la sesión vigente como recién abierta: la persona acaba de probar que es ella
    (cambió su contraseña), así que su sesión sigue valiendo aunque las anteriores a ese cambio se cierren. */
export async function refrescarSesion() {
  const actual = await getSession();
  if (actual) await setSession({ ...actual, iat: Date.now() });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;

/* ═══ Acceso en dos pasos: sesión pendiente del código ═══ */
// Con la contraseña correcta, si la empresa exige el código, la sesión no se abre todavía: queda firmada en una
// cookie aparte, de corta vida, hasta que la persona escriba el código que llegó a su correo.

const COOKIE_PEND = "pgtd_2fa";
export type SesionPendiente = { user: SessionUser; next?: string; created?: boolean; empresa?: string };

export async function setPendiente(p: SesionPendiente, minutos: number) {
  const body = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + minutos * 60_000 })).toString("base64url");
  (await cookies()).set(COOKIE_PEND, `${body}.${sign(`2fa:${body}`)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: minutos * 60, path: "/" });
}
export async function getPendiente(): Promise<SesionPendiente | null> {
  const token = (await cookies()).get(COOKIE_PEND)?.value; if (!token) return null;
  const [body, sig] = token.split("."); if (!body || !sig || !hayClave()) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(`2fa:${body}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now() || typeof data.user?.email !== "string") return null;
    return { user: data.user as SessionUser, next: typeof data.next === "string" ? data.next : undefined, created: data.created === true, empresa: typeof data.empresa === "string" ? data.empresa : undefined };
  } catch { return null; }
}
export async function clearPendiente() { (await cookies()).delete(COOKIE_PEND); }
