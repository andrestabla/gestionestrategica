// Códigos de acceso a los diagnósticos. El administrador o el advisor genera un código para una persona
// (nombre y correo) que aún no tiene espacio en la plataforma y se lo envía por correo. Con el código, la
// persona registra su organización y la plataforma le crea un espacio limitado a los diagnósticos que el
// código incluye: el de madurez en transformación digital, el test de capacidades o los dos. Reglas puras;
// el servidor los guarda y los canjea (src/server/store.ts).

import { renderPlantilla, type MailTemplate } from "@/lib/plantillas-correo";

export type AlcanceCodigo = "madurez" | "test";
export const ALCANCES: { id: AlcanceCodigo; label: string; corto: string }[] = [
  { id: "madurez", label: "Diagnóstico de madurez en transformación digital", corto: "Madurez digital" },
  { id: "test", label: "Test de capacidades", corto: "Test de capacidades" },
];
export const esAlcance = (x: unknown): x is AlcanceCodigo => x === "madurez" || x === "test";
export const alcanceDe = (v: unknown): AlcanceCodigo[] => ALCANCES.map((a) => a.id).filter((id) => (Array.isArray(v) ? v : String(v ?? "").split(",")).map((x) => String(x).trim()).includes(id));
export const alcanceTexto = (a: AlcanceCodigo[]) => (a.length === 2 ? "el diagnóstico de madurez en transformación digital y el test de capacidades" : a[0] === "test" ? "el test de capacidades" : "el diagnóstico de madurez en transformación digital");

export const CODIGO_DIAS = 30;                       // vigencia del código
export const CODIGO_ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // sin I, L, O, 0 ni 1: no se confunden al copiarlos
export const CODIGO_LARGO = 8;

/** «ABCD2345» → «GE-ABCD-2345»: como se muestra y se envía. */
export const formatoCodigo = (code: string) => `GE-${code.slice(0, 4)}-${code.slice(4)}`;
/** Lo que la persona escribe (con o sin prefijo, guiones o espacios) → los ocho caracteres del código; nulo si no tiene esa forma. */
export function normalizarCodigo(v: unknown): string | null {
  const s = (typeof v === "string" ? v : "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const c = s.length === CODIGO_LARGO + 2 && s.startsWith("GE") ? s.slice(2) : s;
  return c.length === CODIGO_LARGO && [...c].every((ch) => CODIGO_ALFABETO.includes(ch)) ? c : null;
}

export type CodigoAcceso = {
  id: string; code: string; name: string; email: string; organization?: string; scope: AlcanceCodigo[];
  createdBy: string; createdByName: string; createdByRole: "ADMIN" | "CONSULTOR"; createdAt: string; expiresAt: string;
  sentAt?: string; usedAt?: string; companySlug?: string; revokedAt?: string;
};
export type EstadoCodigo = "anulado" | "usado" | "vencido" | "enviado" | "sin_enviar";
export const ESTADO_CODIGO: Record<EstadoCodigo, { label: string; chip: string }> = {
  anulado: { label: "Anulado", chip: "chip-bad" }, usado: { label: "Usado", chip: "chip-ok" }, vencido: { label: "Vencido", chip: "chip-warn" },
  enviado: { label: "Enviado", chip: "chip-cyan" }, sin_enviar: { label: "Sin enviar", chip: "" },
};
export const estadoCodigo = (c: Pick<CodigoAcceso, "revokedAt" | "usedAt" | "expiresAt" | "sentAt">, ahora = Date.now()): EstadoCodigo =>
  c.revokedAt ? "anulado" : c.usedAt ? "usado" : new Date(c.expiresAt).getTime() < ahora ? "vencido" : c.sentAt ? "enviado" : "sin_enviar";

/** Datos con los que se genera un código. */
export function validarCodigoNuevo(input: { name?: unknown; email?: unknown; scope?: unknown }): string | null {
  const name = String(input.name ?? "").trim(), email = String(input.email ?? "").trim();
  if (name.length < 5) return "Escribe el nombre completo de la persona.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Escribe un correo válido: ahí llega el código.";
  if (!alcanceDe(input.scope).length) return "Elige al menos un diagnóstico: el de madurez, el test de capacidades o los dos.";
  return null;
}

/** Datos de la organización que escribe la persona al usar su código. */
export type OrganizacionCodigo = { organizacion: string; sector: string; pais: "CO" | "EC"; ciudad: string; tamano?: string; consent: boolean };
export function validarOrganizacion(input: Record<string, unknown>): { ok: true; org: OrganizacionCodigo } | { ok: false; error: string } {
  const t = (k: string, max = 120) => String(input[k] ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  const organizacion = t("organizacion"), sector = t("sector"), ciudad = t("ciudad"), tamano = t("tamano", 80);
  if (organizacion.length < 3) return { ok: false, error: "Escribe el nombre de tu organización." };
  if (sector.length < 3) return { ok: false, error: "Escribe a qué se dedica tu organización: su sector o industria." };
  if (ciudad.length < 2) return { ok: false, error: "Escribe la ciudad de tu organización." };
  if (input.consent !== true) return { ok: false, error: "Para continuar debes aceptar el tratamiento de tus datos personales." };
  return { ok: true, org: { organizacion, sector, pais: input.pais === "EC" ? "EC" : "CO", ciudad, ...(tamano ? { tamano } : {}), consent: true } };
}

const PLANTILLA: MailTemplate = {
  subject: "Tu código de acceso a Gestión estratégica",
  title: "Tu código de acceso",
  body: `Hola {{nombre}},

{{quien}} te invita a realizar {{alcance}} en Gestión estratégica, la plataforma de 4Shine Empresas.

> Código: {{codigo}}

[[Usar mi código]]

Con el código registras tu organización y entras directo. Vale hasta el {{vence}} y es personal: está ligado a este correo.

Si el botón no abre, entra a {{enlace}}

Si no esperabas este mensaje, ignóralo.`,
};

/** Correo con el código de acceso. `enlace`: la página donde se usa, con el código ya puesto. */
export function correoCodigoAcceso(c: Pick<CodigoAcceso, "name" | "code" | "scope" | "createdByName" | "expiresAt">, enlace: string): { subject: string; text: string; html: string } {
  const vence = new Date(c.expiresAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  return renderPlantilla(PLANTILLA, { nombre: c.name.split(" ")[0] || c.name, quien: c.createdByName, alcance: alcanceTexto(c.scope), codigo: formatoCodigo(c.code), vence, enlace });
}
