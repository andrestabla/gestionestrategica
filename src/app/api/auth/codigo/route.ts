import { NextResponse } from "next/server";
import { z } from "zod";
import { hydrateCompanies, verificarCodigo } from "@/server/store";
import { getPendiente, clearPendiente, setSession } from "@/lib/session";
import { enviarCodigo } from "@/server/dos-pasos";
import { limpiarCodigo, codigoValido, CODIGO_DIGITOS } from "@/lib/dos-pasos";

const Body = z.object({ codigo: z.string().max(20).optional(), reenviar: z.boolean().optional() });

// POST /api/auth/codigo — segundo paso del acceso cuando la empresa lo exige.
//   { codigo }          comprueba el código que llegó al correo y abre la sesión que quedó pendiente.
//   { reenviar: true }  envía un código nuevo (como máximo uno por minuto).
// La sesión pendiente va firmada en una cookie de corta vida que deja el primer paso (contraseña o QR).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  await hydrateCompanies();
  const p = await getPendiente();
  if (!p) return NextResponse.json({ error: "La verificación venció. Vuelve a escribir tu correo y tu contraseña.", reiniciar: true }, { status: 401 });
  if (parsed.data.reenviar) {
    const r = await enviarCodigo(p);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, reenviado: true });
  }
  const codigo = limpiarCodigo(parsed.data.codigo);
  if (!codigoValido(codigo)) return NextResponse.json({ error: `El código tiene ${CODIGO_DIGITOS} dígitos.` }, { status: 400 });
  const v = await verificarCodigo(p.user.email, codigo);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
  const user = { ...p.user, mfa: true as const };
  await setSession(user);
  await clearPendiente();
  return NextResponse.json({ ok: true, user, ...(p.next ? { next: p.next } : {}), ...(p.created ? { created: true } : {}) });
}
