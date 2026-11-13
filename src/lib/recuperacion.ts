// Recuperación de contraseña: un enlace de un solo uso, con vencimiento, que
// llega por correo. Reglas puras; el store emite y consume los tokens.
import { renderPlantilla, defaultTemplate, type MailTemplate } from "@/lib/plantillas-correo";
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export const RESET_MINUTES = 60;
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,96}$/;
export const PASSWORD_MIN = 10;

/** Enlace de restablecimiento: con empresa va bajo su prefijo; el administrador, sin prefijo. */
export const resetLink = (origin: string, slug: string | null, token: string) => `${origin.replace(/\/$/, "")}${slug ? `/${slug}` : ""}/restablecer/${token}`;
export const isExpired = (expires: string | Date | null | undefined, now = Date.now()) => !expires || new Date(expires).getTime() < now;
export const passwordOk = (p: unknown): p is string => typeof p === "string" && p.length >= PASSWORD_MIN && p.length <= 200;

/** Texto del correo (plano y HTML), con la cabecera y el pie comunes. */
export function resetVars(name: string, link: string, minutes = RESET_MINUTES, company?: string): Record<string, string> {
  return { nombre: name, empresa: company?.trim() || "4Shine Empresas", enlace: link, minutos: String(minutes) };
}

/** Correo de restablecimiento con la plantilla predeterminada (el servidor aplica la guardada si existe). */
export function resetMail(name: string, link: string, minutes = RESET_MINUTES, company?: string, template: MailTemplate = defaultTemplate("restablecer")): { subject: string; text: string; html: string } {
  return renderPlantilla(template, resetVars(name, link, minutes, company), { company });
}
