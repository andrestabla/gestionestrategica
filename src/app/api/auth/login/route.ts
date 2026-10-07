import { NextResponse } from "next/server";
import { z } from "zod";
import { findActiveUser, verifyPassword, hydrateFromDb } from "@/server/store";
import { setSession, type SessionUser } from "@/lib/session";

const DEMO_PASSWORD = "4shine-demo-2026";
// En producción: DEMO_LOGIN=off desactiva la contraseña demo; entonces solo
// entra quien tiene contraseña fijada en la base (bcrypt).
const demoAllowed = () => process.env.DEMO_LOGIN !== "off";

const Body = z.object({ email: z.string().email(), password: z.string().min(4) });

export async function POST(req: Request) {
  await hydrateFromDb();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = findActiveUser(email);
  const real = user ? await verifyPassword(user.email, password) : false;
  const ok = real === true || (real === null && demoAllowed() && password === DEMO_PASSWORD);
  if (!user || !ok) {
    return NextResponse.json(
      { error: "Credenciales incorrectas. Verifica el correo y la contraseña." },
      { status: 401 },
    );
  }
  const session: SessionUser = {
    email: user.email,
    name: user.name,
    role: user.role,
    line: user.line,
  };
  await setSession(session);
  return NextResponse.json({ ok: true, user: session });
}
