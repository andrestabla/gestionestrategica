import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/server/store";
import { setSession } from "@/lib/session";
import { PASSWORD_MIN } from "@/lib/recuperacion";

const Body = z.object({ token: z.string().min(32).max(96), password: z.string().min(PASSWORD_MIN).max(200) });

// POST /api/auth/restablecer — consume el enlace, fija la contraseña nueva y
// abre la sesión.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` }, { status: 400 });
  const r = await resetPassword(parsed.data.token, parsed.data.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  // el enlace de restablecimiento llegó al correo de la cuenta: la sesión ya cumple el segundo paso
  const user = { ...r.user, mfa: true as const };
  await setSession(user);
  return NextResponse.json({ ok: true, user, next: r.user.company ? `/${r.user.company.slug}/panel` : "/empresas" });
}
