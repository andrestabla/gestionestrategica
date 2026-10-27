// Correo transaccional por Amazon SES. Configuración por entorno:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (us-east-1) y SES_FROM
// («Gestión estratégica <plataforma@algoritmot.com>», remitente de un dominio
// verificado en SES). Sin configuración no envía y lo deja en el registro.
import { effectiveSes } from "@/server/store";

export const mailConfigured = () => effectiveSes() !== null;

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const cfg = effectiveSes();
  if (!cfg) { console.warn("[4shine] correo no configurado; no se envía:", input.subject, "→", input.to); return { ok: false, error: "El envío de correo no está configurado: completa la integración AWS SES en Administración → Integraciones." }; }
  const display = (process.env.SES_FROM ?? "").includes("<") && cfg.fields.sender === (process.env.SES_FROM ?? "").match(/<([^>]+)>/)?.[1] ? process.env.SES_FROM! : `Gestión estratégica <${cfg.fields.sender}>`;
  try {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
    const ses = new SESClient({ region: cfg.fields.region || "us-east-1", credentials: { accessKeyId: cfg.fields.accessKeyId, secretAccessKey: cfg.fields.secretAccessKey } });
    const r = await ses.send(new SendEmailCommand({
      Source: display,
      Destination: { ToAddresses: [input.to] },
      Message: { Subject: { Data: input.subject, Charset: "UTF-8" }, Body: { Text: { Data: input.text, Charset: "UTF-8" }, ...(input.html ? { Html: { Data: input.html, Charset: "UTF-8" } } : {}) } },
    }));
    return { ok: true, id: r.MessageId };
  } catch (e) {
    console.error("[4shine] SES:", (e as Error).message);
    return { ok: false, error: `No se pudo enviar el correo: ${(e as Error).message}` };
  }
}
