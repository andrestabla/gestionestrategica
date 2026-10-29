// Enlace público de solo lectura: token HMAC derivado del secreto del
// servidor. No expira por diseño (se comparte con Consejo Directivo y entes
// de control); rotar AUTH_SECRET lo invalida.

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "pgtd-dev-secret-cambiar-en-produccion";
const TOKEN_LEN = 24;

/** Separa un enlace firmado «<slug>-<token>». El slug puede llevar guiones (empresa-vacia), así que el token
    es siempre el tramo final de longitud fija y el slug, todo lo anterior al guion que lo precede. */
export function splitSignedLink(link: string): { slug: string; token: string } | null {
  if (link.length < TOKEN_LEN + 2 || link[link.length - TOKEN_LEN - 1] !== "-") return null;
  return { slug: link.slice(0, -TOKEN_LEN - 1), token: link.slice(-TOKEN_LEN) };
}

export function publicToken(slug: string): string {
  return createHmac("sha256", SECRET).update(`public:${slug}`).digest("base64url").slice(0, 24);
}

export function verifyPublicToken(slug: string, token: string): boolean {
  const expected = publicToken(slug);
  const a = Buffer.from(token), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Enlace anónimo de la Fuente 2 (percepción de equipos): token distinto del de la vista pública. */
export function surveyToken(slug: string): string {
  return createHmac("sha256", SECRET).update(`f2:${slug}`).digest("base64url").slice(0, 24);
}
export function verifySurveyToken(slug: string, token: string): boolean {
  const expected = surveyToken(slug);
  const a = Buffer.from(token), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Enlace de solo lectura del informe consolidado del diagnóstico (sin nombres): lo comparten el administrador o el advisor. */
export function informeToken(slug: string): string {
  return createHmac("sha256", SECRET).update(`informe:${slug}`).digest("base64url").slice(0, 24);
}
export function verifyInformeToken(slug: string, token: string): boolean {
  const expected = informeToken(slug);
  const a = Buffer.from(token), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
