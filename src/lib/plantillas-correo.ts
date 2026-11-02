// ─────────────────────────────────────────────────────────────────────────────
// Plantillas parametrizables de los correos de la plataforma. Cada plantilla tiene
// asunto, título y cuerpo en texto con variables {{nombre}}, {{empresa}}, {{enlace}}…
// Sintaxis del cuerpo: párrafos separados por línea en blanco; «[[Texto]]» en una línea
// propia se vuelve el botón principal hacia {{enlace}}; las líneas que empiezan por «> »
// van en un recuadro (credenciales, datos). De aquí salen la versión HTML (con la
// cabecera y el pie de correo-plantilla.ts) y la versión en texto plano. Las
// predeterminadas viven aquí; el administrador las puede sobrescribir y restaurar.
// ─────────────────────────────────────────────────────────────────────────────
import { mailLayout, mailButton, mailText } from "@/lib/correo-plantilla";

export type MailTemplateKey = "bienvenida" | "restablecer";
export type MailTemplate = { subject: string; title: string; body: string };
export type MailTemplateDef = MailTemplate & { key: MailTemplateKey; nombre: string; descripcion: string; variables: { id: string; desc: string }[] };

export const MAIL_TEMPLATES: MailTemplateDef[] = [
  {
    key: "bienvenida", nombre: "Creación de nueva cuenta",
    descripcion: "Se envía al crear una cuenta con contraseña y la casilla «enviar correo de bienvenida» marcada.",
    variables: [
      { id: "nombre", desc: "Nombre de la persona" }, { id: "empresa", desc: "Nombre de la empresa" }, { id: "quien", desc: "Quién creó la cuenta" },
      { id: "enlace", desc: "Enlace de entrada de la empresa" }, { id: "correo", desc: "Correo de la cuenta" }, { id: "contrasena", desc: "Contraseña inicial" },
    ],
    subject: "Tu acceso a la plataforma de {{empresa}} · Gestión estratégica",
    title: "Tu acceso a la plataforma",
    body: `Hola {{nombre}},

{{quien}} creó tu cuenta en la plataforma de gestión estratégica de {{empresa}} (Gestión estratégica, plataforma de 4Shine Empresas).

[[Entrar a la plataforma]]

> Enlace: {{enlace}}
> Correo: {{correo}}
> Contraseña inicial: {{contrasena}}

Cambia la contraseña al entrar. Si no esperabas este mensaje, ignóralo.`,
  },
  {
    key: "restablecer", nombre: "Olvidé mi contraseña",
    descripcion: "Se envía cuando alguien pide restablecer su contraseña desde el acceso.",
    variables: [
      { id: "nombre", desc: "Nombre de la persona" }, { id: "empresa", desc: "Nombre de la empresa (o de la plataforma)" },
      { id: "enlace", desc: "Enlace para crear la contraseña nueva" }, { id: "minutos", desc: "Minutos de validez del enlace" },
    ],
    subject: "Restablecer tu contraseña · Gestión estratégica",
    title: "Restablecer tu contraseña",
    body: `Hola {{nombre}},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en la plataforma de gestión estratégica de {{empresa}}.

[[Crear una contraseña nueva]]

El enlace vale {{minutos}} minutos: {{enlace}}

Si no pediste el cambio, ignora este mensaje: tu contraseña sigue igual.`,
  },
];

export const MAIL_TEMPLATE_KEYS: MailTemplateKey[] = MAIL_TEMPLATES.map((t) => t.key);
export const isMailTemplateKey = (x: unknown): x is MailTemplateKey => MAIL_TEMPLATE_KEYS.includes(x as MailTemplateKey);
export const defaultTemplate = (key: MailTemplateKey): MailTemplate => { const t = MAIL_TEMPLATES.find((x) => x.key === key)!; return { subject: t.subject, title: t.title, body: t.body }; };

/** Datos de muestra para la vista previa. */
export const SAMPLE_VARS: Record<MailTemplateKey, Record<string, string>> = {
  bienvenida: { nombre: "Ana Gómez", empresa: "Siegfried", quien: "Andrés Tabla", enlace: "https://gestionestrategica.io/siegfried/login", correo: "ana.gomez@ejemplo.com", contrasena: "k7Rp2mVx9Qd4" },
  restablecer: { nombre: "Ana Gómez", empresa: "Siegfried", enlace: "https://gestionestrategica.io/siegfried/restablecer/abc123", minutos: "60" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Sustituye {{variable}} (sin distinguir mayúsculas ni espacios). Lo desconocido queda vacío. */
export const sustituir = (s: string, vars: Record<string, string>) => s.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, k: string) => vars[k] ?? vars[k.toLowerCase()] ?? "");
const autolink = (s: string) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#0D1B2A;font-weight:700;word-break:break-all">${u}</a>`);

/** Validación de una plantilla editada. */
export function validarPlantilla(t: Partial<MailTemplate>): string | null {
  if (!t.subject?.trim()) return "El asunto no puede quedar vacío.";
  if (t.subject.length > 200) return "El asunto no puede pasar de 200 caracteres.";
  if (!t.title?.trim()) return "El título no puede quedar vacío.";
  if (t.title.length > 120) return "El título no puede pasar de 120 caracteres.";
  if (!t.body?.trim()) return "El cuerpo no puede quedar vacío.";
  if (t.body.length > 6000) return "El cuerpo no puede pasar de 6.000 caracteres.";
  return null;
}

/** Renderiza una plantilla con sus variables: asunto, texto plano y HTML listos para enviar. */
export function renderPlantilla(t: MailTemplate, vars: Record<string, string>, opts: { company?: string; origin?: string } = {}): { subject: string; text: string; html: string } {
  const subject = sustituir(t.subject, vars).trim();
  const title = sustituir(t.title, vars).trim();
  const body = sustituir(t.body, vars).replace(/\r\n/g, "\n").trim();
  const parrafos = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const htmlParts = parrafos.map((p) => {
    const boton = p.match(/^\[\[(.+?)\]\]$/);
    if (boton) return vars.enlace ? mailButton(vars.enlace, boton[1].trim()) : `<p style="margin:0 0 12px"><b>${esc(boton[1].trim())}</b></p>`;
    const lineas = p.split("\n");
    if (lineas.every((l) => /^>\s?/.test(l))) {
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td style="background:#F3F5F8;border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.6">${lineas.map((l) => autolink(l.replace(/^>\s?/, ""))).join("<br>")}</td></tr></table>`;
    }
    return `<p style="margin:0 0 12px">${lineas.map(autolink).join("<br>")}</p>`;
  });
  const textParts = parrafos.map((p) => {
    const boton = p.match(/^\[\[(.+?)\]\]$/);
    if (boton) return vars.enlace ? `${boton[1].trim()}: ${vars.enlace}` : boton[1].trim();
    return p.split("\n").map((l) => l.replace(/^>\s?/, "")).join("\n");
  });
  return {
    subject,
    text: mailText({ company: opts.company, origin: opts.origin, body: textParts.join("\n\n") }),
    html: mailLayout({ title, company: opts.company, origin: opts.origin, preheader: textParts[0]?.slice(0, 140), body: htmlParts.join("") }),
  };
}

/** Correo libre (directo o grupal): el cuerpo admite la misma sintaxis y las variables nombre, empresa y correo. */
export function renderLibre(input: { subject: string; body: string }, vars: Record<string, string>, opts: { company?: string; origin?: string } = {}) {
  return renderPlantilla({ subject: input.subject, title: input.subject.replace(/\s*·\s*Gestión estratégica\s*$/i, ""), body: input.body }, vars, opts);
}
