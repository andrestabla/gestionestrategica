import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { can } from "@/lib/permissions";
import { getUsers, requestPasswordReset } from "@/server/store";
import { resetLink, resetMail } from "@/lib/recuperacion";
import { sendMail } from "@/server/mail";
import { originOf } from "@/app/api/td/convencion/acceso/route";

// POST /api/td/users/reset — { email } envía al usuario de la empresa un
// enlace de restablecimiento de contraseña (un solo uso, 60 minutos).
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Solo el equipo consultor administra usuarios." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const target = getUsers().find((u) => u.email.toLowerCase() === email);
  if (!target) return NextResponse.json({ error: "El usuario no existe en esta empresa." }, { status: 404 });
  if (!target.active) return NextResponse.json({ error: "La cuenta está desactivada; reactívala antes de enviar el enlace." }, { status: 422 });
  const r = await requestPasswordReset(email, user.company?.slug ?? null);
  if (!r) return NextResponse.json({ error: "No se pudo emitir el enlace (sin base de datos o cuenta no encontrada)." }, { status: 503 });
  const m = resetMail(r.name, resetLink(originOf(req), r.slug, r.token));
  const sent = await sendMail({ to: r.email, subject: m.subject, text: m.text, html: m.html });
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
  return NextResponse.json({ ok: true, message: `Enlace de restablecimiento enviado a ${r.email} (vale 60 minutos).` });
});
