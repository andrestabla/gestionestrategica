import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { setUserPassword, hydrateFromDb } from "@/server/store";

// POST /api/td/users/password — { email, password } fija la contraseña real
// de un usuario (manage_users). Necesaria en producción con DEMO_LOGIN=off.
export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ error: "Falta email" }, { status: 400 });
  const r = await setUserPassword(user, String(body.email), body.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
