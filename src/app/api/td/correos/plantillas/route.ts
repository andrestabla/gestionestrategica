import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { saveMailTemplate, getMailTemplateStored } from "@/server/store";
import { can } from "@/lib/permissions";
import { MAIL_TEMPLATES, defaultTemplate } from "@/lib/plantillas-correo";

// GET /api/td/correos/plantillas — las plantillas efectivas (guardada o predeterminada) con su definición.
// PUT { key, subject, title, body } guarda; PUT { key, restaurar: true } vuelve a la predeterminada. Solo manage_platform.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  return NextResponse.json({
    plantillas: MAIL_TEMPLATES.map((t) => {
      const s = getMailTemplateStored(t.key);
      return { key: t.key, nombre: t.nombre, descripcion: t.descripcion, variables: t.variables, predeterminada: defaultTemplate(t.key), actual: s ? { subject: s.subject, title: s.title, body: s.body } : defaultTemplate(t.key), editada: !!s, updatedBy: s?.updatedBy ?? null, at: s?.at ?? null };
    }),
    puedeEditar: can(user, "manage_platform"),
  });
});

export const PUT = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.key) return NextResponse.json({ error: "Cuerpo inválido: falta key" }, { status: 400 });
  const r = await saveMailTemplate(user, body.key, body.restaurar ? null : { subject: String(body.subject ?? ""), title: String(body.title ?? ""), body: String(body.body ?? "") });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, template: r.template });
});
