import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { changeOwnPassword } from "@/server/store";

// POST /api/td/perfil/contrasena { actual, nueva } — la persona cambia su contraseña.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const r = await changeOwnPassword(user, body?.actual, body?.nueva);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
});
