// Sesión firmada con HMAC en cookie HttpOnly.
// En producción la clave viene de AUTH_SECRET; el prototipo trae un valor de desarrollo.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET ?? "pgtd-dev-secret-cambiar-en-produccion";
const COOKIE = "pgtd_session";
const MAX_AGE = 60 * 60 * 8; // 8 horas; el cierre por inactividad se renueva por request

export type SessionCompany = { slug: string; name: string; shortName: string };

export type SessionUser = {
  email: string;
  name: string;
  role: "ADMIN" | "CONSULTOR" | "LIDER" | "RESPONSABLE" | "DIRECTIVO";
  line?: number;
  /** Empresa del usuario. El admin de plataforma no tiene empresa propia: aquí
      va la que eligió como contexto activo (puede cambiarla). */
  company?: SessionCompany;
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
    return { email: data.email, name: data.name, role: data.role, line: data.line, company };
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

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
