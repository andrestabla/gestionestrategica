import { NextResponse } from "next/server";
import { getSession, renewSession } from "@/lib/session";

// GET /api/auth/ping — el vigilante de inactividad del panel lo llama mientras la persona está activa:
// renueva la cookie de sesión (30 min desde la última actividad). Sin sesión responde 401.
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await renewSession(user).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
