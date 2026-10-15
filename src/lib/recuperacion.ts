// Recuperación de contraseña: un enlace de un solo uso, con vencimiento, que
// llega por correo. Reglas puras; el store emite y consume los tokens.
import { mailLayout, mailButton, mailText } from "@/lib/correo-plantilla";
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const RESET_MINUTES = 60;
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,96}$/;
export const PASSWORD_MIN = 10;

/** Enlace de restablecimiento: con empresa va bajo su prefijo; el administrador, sin prefijo. */
export const resetLink = (origin: string, slug: string | null, token: string) => `${origin.replace(/\/$/, "")}${slug ? `/${slug}` : ""}/restablecer/${token}`;
export const isExpired = (expires: string | Date | null | undefined, now = Date.now()) => !expires || new Date(expires).getTime() < now;
export const passwordOk = (p: unknown): p is string => typeof p === "string" && p.length >= PASSWORD_MIN && p.length <= 200;

/** Texto del correo (plano y HTML), con la cabecera y el pie comunes. */
export function resetMail(name: string, link: string, minutes = RESET_MINUTES, company?: string): { subject: string; text: string; html: string } {
  const subject = "Restablecer tu contraseña · 4Shine Empresas";
  const text = mailText({ company, body: `Hola ${name},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en la plataforma de gestión estratégica 4Shine Empresas.\n\nAbre este enlace (vale ${minutes} minutos y una sola vez):\n${link}\n\nSi no pediste el cambio, ignora este correo: tu contraseña sigue igual.` });
  const html = mailLayout({ title: "Restablecer tu contraseña", company, preheader: `Enlace para crear una contraseña nueva (vale ${minutes} minutos).`, body:
    `<p style="margin:0 0 10px">Hola ${esc(name)},</p><p style="margin:0 0 10px">Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace vale <b>${minutes} minutos</b> y una sola vez.</p>${mailButton(link, "Crear una contraseña nueva")}<p style="font-size:12.5px;color:#5B6775;word-break:break-all;margin:0 0 8px">Si el botón no abre, copia este enlace: ${esc(link)}</p><p style="font-size:12.5px;color:#5B6775;margin:0">Si no pediste el cambio, ignora este correo: tu contraseña sigue igual.</p>` });
  return { subject, text, html };
}
