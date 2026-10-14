// Correos transaccionales de cuentas: bienvenida con el acceso. Texto puro;
// el envío lo hace el servidor con SES.

/** Correo de bienvenida: enlace de entrada, correo y contraseña inicial. */
export function welcomeMail(input: { name: string; company: string; loginLink: string; email: string; password: string; by?: string }): { subject: string; text: string; html: string } {
  const { name, company, loginLink, email, password, by } = input;
  const subject = `Tu acceso a la plataforma de ${company} · 4Shine Empresas`;
  const text = `Hola ${name},\n\n${by ? `${by} creó` : "Se creó"} tu cuenta en la plataforma de gestión estratégica de ${company} (4Shine Empresas).\n\nEntra aquí:\n${loginLink}\n\nCorreo: ${email}\nContraseña inicial: ${password}\n\nTe recomendamos cambiarla en tu primer ingreso con «¿Olvidaste tu contraseña?» en la pantalla de entrada, que envía un enlace para fijar una nueva.\n\nSi no esperabas este mensaje, ignóralo.\n\n4Shine Empresas · plataforma de gestión estratégica`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0D1B2A"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8A6D1F;font-weight:700">${esc(company)} · 4Shine Empresas</div><h1 style="font-size:20px;margin:10px 0 14px">Tu acceso a la plataforma</h1><p style="font-size:14px;line-height:1.5">Hola ${esc(name)}, ${by ? `${esc(by)} creó` : "se creó"} tu cuenta en la plataforma de gestión estratégica de ${esc(company)}.</p><p style="margin:18px 0"><a href="${esc(loginLink)}" style="display:inline-block;background:#0D1B2A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:14px">Entrar a la plataforma</a></p><table style="font-size:14px;line-height:1.6;border-collapse:collapse"><tr><td style="color:#5B6775;padding-right:12px">Correo</td><td><b>${esc(email)}</b></td></tr><tr><td style="color:#5B6775;padding-right:12px">Contraseña inicial</td><td><code style="background:#FAF4E3;padding:2px 6px;border-radius:6px">${esc(password)}</code></td></tr></table><p style="font-size:12.5px;line-height:1.5;color:#5B6775;margin-top:16px">Te recomendamos cambiarla en tu primer ingreso con «¿Olvidaste tu contraseña?», que envía un enlace para fijar una nueva. Si el botón no abre, copia este enlace: ${esc(loginLink)}</p><p style="font-size:11px;color:#8A93A0;margin-top:22px">Si no esperabas este mensaje, ignóralo.</p></div>`;
  return { subject, text, html };
}

/** Contraseña inicial legible: 12 caracteres sin ambigüedades (sin 0/O, 1/l/I). */
export function passwordFromBytes(bytes: Uint8Array, length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length && i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
