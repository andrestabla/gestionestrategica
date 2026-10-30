// Plantilla común de los correos salientes: cabecera con la marca y la empresa,
// cuerpo en tarjeta y pie con el remitente y el contacto. HTML apto para
// clientes de correo (tablas e inline styles) y versión en texto plano.
export const MAIL_ORIGIN = "https://gestionestrategica.io";
export const MAIL_CONTACT = "plataforma@algoritmot.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Envuelve el cuerpo HTML (párrafos, botones, tablas) con cabecera y pie. */
export function mailLayout(input: { title: string; body: string; company?: string; preheader?: string; origin?: string }): string {
  const origin = (input.origin ?? MAIL_ORIGIN).replace(/\/$/, "");
  const company = input.company?.trim();
  const year = new Date().getFullYear();
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(input.title)}</title></head>
<body style="margin:0;padding:0;background:#F3F5F8;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0D1B2A">
${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F3F5F8">${esc(input.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5F8"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#0D1B2A;border-radius:16px 16px 0 0;padding:22px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;padding-right:10px"><img src="${origin}/ge-isotipo.png" alt="" width="34" style="display:block;width:34px;height:auto;border:0"></td><td style="vertical-align:middle;color:#FFFFFF;font-weight:800;font-size:16px;line-height:1.1">Gestión estratégica<div style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:600;margin-top:3px">4Shine Empresas</div></td></tr></table></td>
      <td align="right" style="vertical-align:middle;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#D4AF37;font-weight:700">${company ? esc(company) : "Plataforma de gestión estratégica"}</td>
    </tr></table>
  </td></tr>
  <tr><td style="height:4px;background:#D4AF37"></td></tr>
  <tr><td style="background:#FFFFFF;padding:28px 28px 24px;font-size:15px;line-height:1.55">
    <h1 style="margin:0 0 14px;font-size:21px;line-height:1.25;color:#0D1B2A">${esc(input.title)}</h1>
    ${input.body}
  </td></tr>
  <tr><td style="background:#FAF4E3;border-radius:0 0 16px 16px;padding:16px 28px;font-size:11.5px;line-height:1.5;color:#5B6775">
    <div style="font-weight:700;color:#0D1B2A">Gestión estratégica · plataforma de 4Shine Empresas</div>
    <div>${company ? `Mensaje para el equipo de ${esc(company)}. ` : ""}Mensaje automático de la plataforma; si necesitas ayuda escribe a <a href="mailto:${MAIL_CONTACT}" style="color:#0D1B2A;font-weight:700">${MAIL_CONTACT}</a>.</div>
    <div style="margin-top:6px;color:#8A93A0">4Shine Empresas · <a href="${origin}" style="color:#8A93A0">${origin.replace(/^https?:\/\//, "")}</a> · ${year}</div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

/** Botón principal, listo para insertar en el cuerpo. */
export const mailButton = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#0D1B2A;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px">${esc(label)}</a></p>`;

/** Versión en texto plano con la misma cabecera y pie. */
export function mailText(input: { body: string; company?: string; origin?: string }): string {
  const origin = (input.origin ?? MAIL_ORIGIN).replace(/\/$/, "");
  const head = `GESTIÓN ESTRATÉGICA · ${input.company?.trim() ? input.company.trim().toUpperCase() : "PLATAFORMA DE GESTIÓN ESTRATÉGICA"}\n${"─".repeat(44)}\n\n`;
  const foot = `\n\n${"─".repeat(44)}\nGestión estratégica · plataforma de 4Shine Empresas\nMensaje automático; si necesitas ayuda escribe a ${MAIL_CONTACT}.\n${origin}`;
  return head + input.body.trim() + foot;
}
