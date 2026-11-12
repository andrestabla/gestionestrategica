// Acceso en dos pasos por empresa. Cuando la empresa lo activa (Administración → Usuarios), después de la
// contraseña se pide un código de seis dígitos enviado al correo de la cuenta. Aquí viven las reglas y el
// correo; el servidor guarda el resumen del código (src/server/store.ts) y abre la sesión.

import { renderPlantilla, type MailTemplate } from "@/lib/plantillas-correo";

export const CODIGO_MINUTOS = 10;      // vigencia del código
export const CODIGO_INTENTOS = 5;      // intentos fallidos antes de invalidarlo
export const CODIGO_REENVIO_S = 60;    // espera mínima entre dos envíos
export const CODIGO_DIGITOS = 6;

/** Lo que se le dice a la persona cuando se le pide el código. */
export const mensajeCodigo = (empresa?: string) =>
  `Por seguridad del acceso a la información de ${empresa?.trim() || "la organización"}, escribe el código que enviamos a tu correo.`;

/** «a•••••@dominio.com»: se muestra a dónde se envió sin exponer el correo completo. */
export function enmascarar(email: string): string {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  return `${u.slice(0, Math.min(2, Math.max(1, u.length - 1)))}${"•".repeat(Math.max(3, Math.min(6, u.length - 2)))}@${d}`;
}

/** Deja solo los dígitos de lo que la persona escribió (admite espacios o guiones al pegar). */
export const limpiarCodigo = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");
export const codigoValido = (v: string) => new RegExp(`^\\d{${CODIGO_DIGITOS}}$`).test(v);

const PLANTILLA: MailTemplate = {
  subject: "Tu código de acceso · Gestión estratégica",   // sin el código: el registro de correos guarda el asunto
  title: "Tu código de acceso",
  body: `Hola {{nombre}},

Por seguridad del acceso a la información de {{empresa}}, la plataforma pide un código además de tu contraseña.

> Código: {{codigo}}

Vale {{minutos}} minutos y sirve una sola vez. Escríbelo en la pantalla de acceso.

Si no estás intentando entrar, alguien conoce tu contraseña: cámbiala desde «¿Olvidaste tu contraseña?» y avisa al administrador.`,
};

/** Correo con el código de acceso. */
export function correoCodigo(name: string, code: string, empresa?: string): { subject: string; text: string; html: string } {
  const visible = `${code.slice(0, 3)} ${code.slice(3)}`;
  return renderPlantilla(PLANTILLA, { nombre: name.split(" ")[0] || name, codigo: visible, empresa: empresa?.trim() || "la organización", minutos: String(CODIGO_MINUTOS) }, { company: empresa });
}
