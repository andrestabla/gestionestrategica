import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { changeOwnPassword } from "@/server/store";
import { refrescarSesion } from "@/lib/session";

// POST /api/td/perfil/contrasena { actual, nueva } — la persona cambia su contraseña.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const r = await changeOwnPassword(user, body?.actual, body?.nueva);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  // el cambio cierra las sesiones anteriores de la cuenta; la de quien acaba de cambiarla se renueva y sigue abierta
  await refrescarSesion();
  return NextResponse.json({ ok: true });
});
