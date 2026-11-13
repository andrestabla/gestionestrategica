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

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** Sustituye {{variable}} (sin distinguir mayúsculas ni espacios). Lo desconocido queda vacío. */
const VAR = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;
export const sustituir = (s: string, vars: Record<string, string>) => s.replace(VAR, (_, k: string) => vars[k] ?? vars[k.toLowerCase()] ?? "");
// las direcciones del texto se vuelven enlaces; la dirección termina antes de cualquier comilla ya escapada
const autolink = (s: string) => esc(s).replace(/(https?:\/\/(?:[^\s<&]|&amp;)+)/g, (u) => `<a href="${u}" style="color:#0D1B2A;font-weight:700;word-break:break-all">${u}</a>`);
/** Una línea de la plantilla en HTML. El texto de la plantilla (lo escribe el administrador) puede traer enlaces;
    los valores de las variables (nombres, empresas, lo que alguien escribió en un formulario) entran solo como
    texto escapado: no se convierten en enlaces ni en marcado. La excepción es {{enlace}}, que arma el servidor. */
const lineaHtml = (l: string, vars: Record<string, string>): string => {
  let out = "", desde = 0;
  for (const m of l.matchAll(VAR)) {
    out += autolink(l.slice(desde, m.index));
    const k = m[1], valor = vars[k] ?? vars[k.toLowerCase()] ?? "";
    out += k.toLowerCase() === "enlace" ? autolink(valor) : esc(valor);
    desde = m.index + m[0].length;
  }
  return out + autolink(l.slice(desde));
};

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
export function renderPlantilla(t: MailTemplate, variables: Record<string, string>, opts: { company?: string; origin?: string } = {}): { subject: string; text: string; html: string } {
  // un valor no trae saltos de línea: así no abre párrafos, citas ni botones propios dentro del correo
  const vars = Object.fromEntries(Object.entries(variables).map(([k, x]) => [k, String(x ?? "").replace(/[\r\n]+/g, " ")]));
  const subject = sustituir(t.subject, vars).trim();
  const title = sustituir(t.title, vars).trim();
  // la estructura (párrafos, citas, botones) sale de la plantilla, antes de poner los valores
  const parrafos = t.body.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const htmlParts: string[] = [], textParts: string[] = [];
  for (const p of parrafos) {
    const boton = p.match(/^\[\[(.+?)\]\]$/);
    if (boton) {
      const rotulo = sustituir(boton[1], vars).trim();
      htmlParts.push(vars.enlace ? mailButton(vars.enlace, rotulo) : `<p style="margin:0 0 12px"><b>${esc(rotulo)}</b></p>`);
      textParts.push(vars.enlace ? `${rotulo}: ${vars.enlace}` : rotulo);
      continue;
    }
    const lineas = p.split("\n");
    const texto = lineas.map((l) => sustituir(l.replace(/^>\s?/, ""), vars)).join("\n");
    if (!texto.trim()) continue;   // un párrafo que era solo una variable vacía no deja hueco
    textParts.push(texto);
    if (lineas.every((l) => /^>\s?/.test(l))) {
      htmlParts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td style="background:#F3F5F8;border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.6">${lineas.map((l) => lineaHtml(l.replace(/^>\s?/, ""), vars)).join("<br>")}</td></tr></table>`);
    } else htmlParts.push(`<p style="margin:0 0 12px">${lineas.map((l) => lineaHtml(l, vars)).join("<br>")}</p>`);
  }
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
