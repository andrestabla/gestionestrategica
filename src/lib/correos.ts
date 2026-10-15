// Correos transaccionales de cuentas: bienvenida con el acceso. Texto puro;
// el envío lo hace el servidor con SES.
import { mailLayout, mailButton, mailText } from "@/lib/correo-plantilla";

/** Correo de bienvenida: enlace de entrada, correo y contraseña inicial. */
export function welcomeMail(input: { name: string; company: string; loginLink: string; email: string; password: string; by?: string }): { subject: string; text: string; html: string } {
  const { name, company, loginLink, email, password, by } = input;
  const subject = `Tu acceso a la plataforma de ${company} · 4Shine Empresas`;
  const text = mailText({ company, body: `Hola ${name},\n\n${by ? `${by} creó` : "Se creó"} tu cuenta en la plataforma de gestión estratégica de ${company} (4Shine Empresas).\n\nEntra aquí:\n${loginLink}\n\nCorreo: ${email}\nContraseña inicial: ${password}\n\nTe recomendamos cambiarla en tu primer ingreso con «¿Olvidaste tu contraseña?» en la pantalla de entrada, que envía un enlace para fijar una nueva.\n\nSi no esperabas este mensaje, ignóralo.` });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = mailLayout({ title: "Tu acceso a la plataforma", company, preheader: `Cuenta creada en la plataforma de ${company}: enlace, correo y contraseña inicial.`, body:
    `<p style="margin:0 0 10px">Hola ${esc(name)}, ${by ? `${esc(by)} creó` : "se creó"} tu cuenta en la plataforma de gestión estratégica de ${esc(company)}.</p>${mailButton(loginLink, "Entrar a la plataforma")}<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;border-collapse:collapse"><tr><td style="color:#5B6775;padding-right:12px">Correo</td><td><b>${esc(email)}</b></td></tr><tr><td style="color:#5B6775;padding-right:12px">Contraseña inicial</td><td><code style="background:#FAF4E3;padding:2px 6px;border-radius:6px">${esc(password)}</code></td></tr></table><p style="font-size:12.5px;line-height:1.5;color:#5B6775;margin:16px 0 0">Te recomendamos cambiarla en tu primer ingreso con «¿Olvidaste tu contraseña?», que envía un enlace para fijar una nueva. Si el botón no abre, copia este enlace: ${esc(loginLink)}</p><p style="font-size:11px;color:#8A93A0;margin:14px 0 0">Si no esperabas este mensaje, ignóralo.</p>` });
  return { subject, text, html };
}

/** Contraseña inicial legible: 12 caracteres sin ambigüedades (sin 0/O, 1/l/I). */
export function passwordFromBytes(bytes: Uint8Array, length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length && i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
