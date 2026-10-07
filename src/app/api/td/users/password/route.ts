import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { setUserPassword } from "@/server/store";

// POST /api/td/users/password — { email, password } fija la contraseña real
// de un usuario (manage_users). Necesaria en producción con DEMO_LOGIN=off.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ error: "Falta email" }, { status: 400 });
  const r = await setUserPassword(user, String(body.email), body.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
});
