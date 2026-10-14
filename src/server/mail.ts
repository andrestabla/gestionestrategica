// Correo transaccional por Amazon SES. Configuración por entorno:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (us-east-1) y SES_FROM
// («4Shine Empresas <plataforma@algoritmot.com>», remitente de un dominio
// verificado en SES). Sin configuración no envía y lo deja en el registro.
export const mailConfigured = () => !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.SES_FROM);

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  if (!mailConfigured()) { console.warn("[4shine] correo no configurado; no se envía:", input.subject, "→", input.to); return { ok: false, error: "El envío de correo no está configurado en este entorno." }; }
  try {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
    const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });
    const r = await ses.send(new SendEmailCommand({
      Source: process.env.SES_FROM!,
      Destination: { ToAddresses: [input.to] },
      Message: { Subject: { Data: input.subject, Charset: "UTF-8" }, Body: { Text: { Data: input.text, Charset: "UTF-8" }, ...(input.html ? { Html: { Data: input.html, Charset: "UTF-8" } } : {}) } },
    }));
    return { ok: true, id: r.MessageId };
  } catch (e) {
    console.error("[4shine] SES:", (e as Error).message);
    return { ok: false, error: `No se pudo enviar el correo: ${(e as Error).message}` };
  }
}
