// Sesión firmada con HMAC en cookie HttpOnly.
// En producción la clave viene de AUTH_SECRET; el prototipo trae un valor de desarrollo.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET ?? "pgtd-dev-secret-cambiar-en-produccion";
const COOKIE = "pgtd_session";
import { INACTIVIDAD_MIN } from "@/lib/inactividad";
const MAX_AGE = 60 * INACTIVIDAD_MIN; // 30 minutos de inactividad: cada petición a la API renueva la cookie (renewSession)

export type SessionCompany = { slug: string; name: string; shortName: string };

export type SessionUser = {
  email: string;
  name: string;
  role: "ADMIN" | "CONSULTOR" | "LIDER" | "RESPONSABLE" | "DIRECTIVO";
  line?: number;
  /** Responsable del catálogo (tribu, área) que delimita el ámbito de un RESPONSABLE. */
  responsibleId?: string;
  /** Entró por el QR de la convención: ve la agenda de participantes, no el itinerario del equipo organizador. */
  qr?: true;
  /** Empresa del usuario. El admin de plataforma no tiene empresa propia: aquí
      va la que eligió como contexto activo (puede cambiarla). */
  company?: SessionCompany;
  /** Empresas en las que la cuenta opera (principal y membresías) cuando son más de una: el selector de empresa. */
  empresas?: { slug: string; shortName: string; role: SessionUser["role"] }[];
};

const sign = (payload: string) =>
  createHmac("sha256", SECRET).update(payload).digest("base64url");

export function encodeSession(user: SessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    const company = data.company && typeof data.company.slug === "string"
      ? { slug: String(data.company.slug), name: String(data.company.name ?? ""), shortName: String(data.company.shortName ?? "") }
      : undefined;
    const empresas = Array.isArray(data.empresas)
      ? (data.empresas as unknown[]).flatMap((e) => (e && typeof e === "object" && typeof (e as { slug?: unknown }).slug === "string" ? [{ slug: String((e as { slug: string }).slug), shortName: String((e as { shortName?: unknown }).shortName ?? ""), role: (e as { role?: SessionUser["role"] }).role ?? "DIRECTIVO" }] : []))
      : [];
    return { email: data.email, name: data.name, role: data.role, line: data.line, responsibleId: typeof data.responsibleId === "string" ? data.responsibleId : undefined, company, ...(empresas.length > 1 ? { empresas } : {}) };
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

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
