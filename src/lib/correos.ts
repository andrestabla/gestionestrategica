// Correos transaccionales de cuentas: bienvenida con el acceso. Texto puro;
// el envío lo hace el servidor con SES.
import { renderPlantilla, defaultTemplate, type MailTemplate } from "@/lib/plantillas-correo";

/** Variables de la plantilla de bienvenida a partir de los datos de la cuenta. */
export function welcomeVars(input: { name: string; company: string; loginLink: string; email: string; password: string; by?: string }): Record<string, string> {
  return { nombre: input.name, empresa: input.company, quien: input.by?.trim() || "El equipo de 4Shine Empresas", enlace: input.loginLink, correo: input.email, contrasena: input.password };
}

/** Correo de bienvenida con la plantilla predeterminada (el servidor aplica la guardada si existe). */
export function welcomeMail(input: { name: string; company: string; loginLink: string; email: string; password: string; by?: string }, template: MailTemplate = defaultTemplate("bienvenida")): { subject: string; text: string; html: string } {
  return renderPlantilla(template, welcomeVars(input), { company: input.company });
}

/** Contraseña inicial legible: 12 caracteres sin ambigüedades (sin 0/O, 1/l/I). */
export function passwordFromBytes(bytes: Uint8Array, length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length && i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
