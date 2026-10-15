import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset, companyBySlug } from "@/server/store";
import { resetLink, resetMail } from "@/lib/recuperacion";
import { sendMail } from "@/server/mail";
import { originOf } from "@/app/api/td/convencion/acceso/route";

const Body = z.object({ email: z.string().email(), tenant: z.string().max(40).optional() });

// POST /api/auth/recuperar — emite un enlace de restablecimiento y lo envía
// por correo. Responde igual exista o no la cuenta (no revela correos).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  const r = await requestPasswordReset(parsed.data.email, parsed.data.tenant ?? null);
  if (r) {
    const link = resetLink(originOf(req), r.slug, r.token);
    const m = resetMail(r.name, link, undefined, r.slug ? companyBySlug(r.slug)?.name : undefined);
    const sent = await sendMail({ to: r.email, subject: m.subject, text: m.text, html: m.html });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, message: "Si el correo tiene una cuenta, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam." });
}
