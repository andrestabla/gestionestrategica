// Solicitudes de código de acceso a los diagnósticos. Quien no tiene código lo pide desde el sitio público con un
// formulario; la solicitud llega por correo a proyectos@algoritmot.com y queda pendiente en Administración →
// Códigos de acceso, donde el administrador o el advisor la aprueba (la plataforma genera el código y lo envía)
// o la rechaza. Reglas puras; el servidor las guarda y las decide (src/server/store.ts).

import { alcanceDe, alcanceTexto, type AlcanceCodigo } from "@/lib/codigos";
import { renderPlantilla, type MailTemplate } from "@/lib/plantillas-correo";

/** Buzón que recibe el aviso de cada solicitud. */
export const DESTINO_SOLICITUDES = "proyectos@algoritmot.com";

export const INDUSTRIAS = [
  "Agroindustria y alimentos", "Comercio y consumo masivo", "Construcción e inmobiliario", "Educación", "Energía, minería e hidrocarburos",
  "Farmacéutica y ciencias de la vida", "Financiera y seguros", "Gobierno y sector público", "Manufactura e industria", "Organizaciones sin ánimo de lucro",
  "Salud", "Servicios profesionales y consultoría", "Tecnología y telecomunicaciones", "Transporte y logística", "Turismo, hotelería y entretenimiento", "Otra",
] as const;
export const PAISES = [
  "Colombia", "Ecuador", "Argentina", "Bolivia", "Brasil", "Chile", "Costa Rica", "El Salvador", "España", "Estados Unidos", "Guatemala", "Honduras",
  "México", "Nicaragua", "Panamá", "Paraguay", "Perú", "República Dominicana", "Uruguay", "Venezuela", "Otro país",
] as const;
export const FUENTES = ["Google", "Redes sociales", "Evento", "Referido", "Otro"] as const;

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";
export const ESTADO_SOLICITUD: Record<EstadoSolicitud, { label: string; chip: string }> = {
  pendiente: { label: "Pendiente", chip: "chip-warn" }, aprobada: { label: "Aprobada", chip: "chip-ok" }, rechazada: { label: "Rechazada", chip: "chip-bad" },
};
export const esEstadoSolicitud = (x: unknown): x is EstadoSolicitud => x === "pendiente" || x === "aprobada" || x === "rechazada";

export type DatosSolicitud = { name: string; company: string; industry: string; country: string; email: string; phone?: string; source: string; scope: AlcanceCodigo[] };
export type SolicitudCodigo = DatosSolicitud & {
  id: string; status: EstadoSolicitud; createdAt: string;
  decidedAt?: string; decidedBy?: string; decidedByName?: string;
  codeId?: string;   // el código que se generó al aprobarla
  note?: string;     // motivo del rechazo, para uso interno
};

const limpio = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
/** Lo que escribe la persona en el formulario público → datos listos para guardar, o el campo que falta. */
export function validarSolicitud(input: Record<string, unknown>): { ok: true; datos: DatosSolicitud } | { ok: false; campo: string; error: string } {
  const mal = (campo: string, error: string) => ({ ok: false as const, campo, error });
  const name = limpio(input.name, 120), company = limpio(input.company, 120), industry = limpio(input.industry, 80), country = limpio(input.country, 60);
  const email = limpio(input.email, 160).toLowerCase(), phone = limpio(input.phone, 30), source = limpio(input.source, 40), scope = alcanceDe(input.scope);
  if (name.length < 5) return mal("name", "Escribe tu nombre completo.");
  if (company.length < 2) return mal("company", "Escribe el nombre de tu empresa.");
  if (!(INDUSTRIAS as readonly string[]).includes(industry)) return mal("industry", "Elige la industria de tu empresa.");
  if (!(PAISES as readonly string[]).includes(country)) return mal("country", "Elige el país de tu empresa.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return mal("email", "Escribe un correo válido: ahí llega el código.");
  if (phone && !/^\+?[\d\s().-]{7,24}$/.test(phone)) return mal("phone", "Revisa el teléfono: solo números, espacios y el signo +.");
  if (!(FUENTES as readonly string[]).includes(source)) return mal("source", "Cuéntanos cómo te enteraste de nosotros.");
  if (!scope.length) return mal("scope", "Elige el diagnóstico que te interesa.");
  if (input.consent !== true) return mal("consent", "Para enviar la solicitud debes autorizar el tratamiento de tus datos.");
  return { ok: true, datos: { name, company, industry, country, email, ...(phone ? { phone } : {}), source, scope } };
}

const PLANTILLA: MailTemplate = {
  subject: "Solicitud de código: {{empresa}}",
  title: "Nueva solicitud de código",
  body: `{{nombre}} solicita un código para realizar {{alcance}}.

> Empresa: {{empresa}}
> Industria: {{industria}}
> País: {{pais}}
> Correo: {{correo}}
> Teléfono: {{telefono}}
> Cómo se enteró: {{fuente}}

[[Revisar la solicitud]]

La solicitud queda pendiente en Administración → Códigos de acceso. Al aprobarla, la plataforma genera el código y lo envía a {{correo}}.`,
};

/** Aviso de una solicitud nueva para el buzón del equipo. `enlace`: la bandeja de solicitudes. */
export function correoSolicitudNueva(s: DatosSolicitud, enlace: string): { subject: string; text: string; html: string } {
  return renderPlantilla(PLANTILLA, { nombre: s.name, alcance: alcanceTexto(s.scope), empresa: s.company, industria: s.industry, pais: s.country, correo: s.email, telefono: s.phone ?? "No lo indicó", fuente: s.source, enlace });
}
