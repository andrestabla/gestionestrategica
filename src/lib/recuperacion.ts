// Recuperación de contraseña: un enlace de un solo uso, con vencimiento, que
// llega por correo. Reglas puras; el store emite y consume los tokens.
export const RESET_MINUTES = 60;
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,96}$/;
export const PASSWORD_MIN = 10;

/** Enlace de restablecimiento: con empresa va bajo su prefijo; el administrador, sin prefijo. */
export const resetLink = (origin: string, slug: string | null, token: string) => `${origin.replace(/\/$/, "")}${slug ? `/${slug}` : ""}/restablecer/${token}`;
export const isExpired = (expires: string | Date | null | undefined, now = Date.now()) => !expires || new Date(expires).getTime() < now;
export const passwordOk = (p: unknown): p is string => typeof p === "string" && p.length >= PASSWORD_MIN && p.length <= 200;

/** Texto del correo (plano y HTML). */
export function resetMail(name: string, link: string, minutes = RESET_MINUTES): { subject: string; text: string; html: string } {
  const subject = "Restablecer tu contraseña · 4Shine Empresas";
  const text = `Hola ${name},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en la plataforma de gestión estratégica 4Shine Empresas.\n\nAbre este enlace (vale ${minutes} minutos y una sola vez):\n${link}\n\nSi no pediste el cambio, ignora este correo: tu contraseña sigue igual.\n\n4Shine Empresas · Algoritmo T`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0D1B2A"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8A6D1F;font-weight:700">4Shine Empresas · Plataforma de gestión estratégica</div><h1 style="font-size:22px;margin:12px 0 8px">Restablecer tu contraseña</h1><p style="font-size:15px;line-height:1.5">Hola ${name},</p><p style="font-size:15px;line-height:1.5">Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace vale <b>${minutes} minutos</b> y una sola vez.</p><p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#0D1B2A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Crear una contraseña nueva</a></p><p style="font-size:12.5px;color:#5B6775;word-break:break-all">Si el botón no abre, copia este enlace: ${link}</p><p style="font-size:12.5px;color:#5B6775">Si no pediste el cambio, ignora este correo: tu contraseña sigue igual.</p></div>`;
  return { subject, text, html };
}
