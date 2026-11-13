import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset, companyBySlug } from "@/server/store";
import { resetLink } from "@/lib/recuperacion";
import { correoRestablecer } from "@/server/correos";
import { sendMail } from "@/server/mail";
import { originOf } from "@/app/api/td/convencion/acceso/route";
import { frenado, ipDe } from "@/server/freno";

const Body = z.object({ email: z.string().max(160).email(), tenant: z.string().max(40).optional() });
const LISTO = () => NextResponse.json({ ok: true, message: "Si el correo tiene una cuenta, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam." });

// POST /api/auth/recuperar — emite un enlace de restablecimiento y lo envía
// por correo. Responde igual exista o no la cuenta (no revela correos).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  // sin freno, esta ruta serviría para llenar de correos el buzón de cualquiera y para anular sus enlaces vigentes
  // (cada solicitud reemplaza el enlace anterior). Por dirección responde 429; por cuenta calla y no envía más.
  if (frenado(`recuperar-ip:${ipDe(req)}`, 10, 3_600_000)) return NextResponse.json({ error: "Demasiadas solicitudes. Inténtalo de nuevo en una hora." }, { status: 429 });
  if (frenado(`recuperar:${parsed.data.email.trim().toLowerCase()}`, 3, 3_600_000)) return LISTO();
  const r = await requestPasswordReset(parsed.data.email, parsed.data.tenant ?? null);
  if (r) {
    const link = resetLink(originOf(req), r.slug, r.token);
    const m = correoRestablecer(r.name, link, r.slug ? companyBySlug(r.slug)?.name : undefined);
    const sent = await sendMail({ to: r.email, subject: m.subject, text: m.text, html: m.html }, { kind: "restablecer", by: "sistema", companySlug: r.slug });
    // si el correo falla se registra, pero la respuesta no cambia: un error aquí diría que la cuenta existe
    if (!sent.ok) console.error("[4shine] el correo de restablecimiento no salió:", sent.error);
  }
  return LISTO();
}
