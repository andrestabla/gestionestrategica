import { NextResponse } from "next/server";
import { z } from "zod";
import { findActiveUser } from "@/server/store";
import { setSession, type SessionUser } from "@/lib/session";

const DEMO_PASSWORD = "4shine-demo-2026";

// Prototipo: valida contra los usuarios demo. Con la base de datos conectada,
// esta ruta pasa a consultar el modelo User (bcrypt + control de intentos).

const Body = z.object({ email: z.string().email(), password: z.string().min(4) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = findActiveUser(email);
  if (!user || password !== DEMO_PASSWORD) {
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
