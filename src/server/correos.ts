// Plantillas efectivas de los correos de cuenta: la guardada por el administrador si existe, si no la
// predeterminada. Las rutas de creación de cuenta y de recuperación pasan por aquí.
import { defaultTemplate, type MailTemplate, type MailTemplateKey } from "@/lib/plantillas-correo";
import { getMailTemplateStored } from "@/server/store";
import { welcomeMail } from "@/lib/correos";
import { resetMail, RESET_MINUTES } from "@/lib/recuperacion";

export function plantillaEfectiva(key: MailTemplateKey): MailTemplate & { editada: boolean; updatedBy?: string; at?: string } {
  const s = getMailTemplateStored(key);
  return s ? { subject: s.subject, title: s.title, body: s.body, editada: true, updatedBy: s.updatedBy, at: s.at } : { ...defaultTemplate(key), editada: false };
}

export const correoBienvenida = (input: Parameters<typeof welcomeMail>[0]) => welcomeMail(input, plantillaEfectiva("bienvenida"));
export const correoRestablecer = (name: string, link: string, company?: string) => resetMail(name, link, RESET_MINUTES, company, plantillaEfectiva("restablecer"));
