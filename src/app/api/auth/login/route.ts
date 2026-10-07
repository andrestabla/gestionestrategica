import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserForLogin, verifyPassword, companyBySlug } from "@/server/store";
import { setSession, type SessionUser } from "@/lib/session";

const DEMO_PASSWORD = "4shine-demo-2026";
// En producción: DEMO_LOGIN=off desactiva la contraseña demo; entonces solo
// entra quien tiene contraseña fijada en la base (bcrypt).
const demoAllowed = () => process.env.DEMO_LOGIN !== "off";

const Body = z.object({ email: z.string().email(), password: z.string().min(4), tenant: z.string().max(40).optional() });

// El usuario pertenece a una empresa (su rol vale solo allí). El admin de
// plataforma no tiene empresa: entra con la primera activa como contexto y
// puede cambiarla desde el selector.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { email, password, tenant } = parsed.data;
  const found = await findUserForLogin(email);
  const real = found ? await verifyPassword(found.user.email, password) : false;
  const ok = real === true || (real === null && demoAllowed() && password === DEMO_PASSWORD);
  if (!found || !ok) {
    return NextResponse.json(
      { error: "Credenciales incorrectas. Verifica el correo y la contraseña." },
      { status: 401 },
    );
  }
  if (found.company && !found.company.active) {
    return NextResponse.json({ error: "La empresa de tu cuenta está desactivada." }, { status: 403 });
  }
  // la cuenta de una empresa solo entra por la ruta de su empresa
  if (tenant && found.user.role !== "ADMIN" && found.company?.slug !== tenant) {
    return NextResponse.json({ error: "Esta cuenta no pertenece a esta empresa. Entra por el enlace de la tuya." }, { status: 401 });
  }
  // el admin de plataforma no tiene empresa propia: la elige en /empresas tras
  // entrar, o queda activa la de la URL por la que entró
  let company = found.company ?? null;
  if (!company && tenant && found.user.role === "ADMIN") {
    const c = companyBySlug(tenant);
    if (c?.active) company = c;
  }
  const session: SessionUser = {
    email: found.user.email,
    name: found.user.name,
    role: found.user.role,
    line: found.user.line,
    responsibleId: found.user.responsibleId,
    company: company ? { slug: company.slug, name: company.name, shortName: company.shortName } : undefined,
  };
  await setSession(session);
  return NextResponse.json({ ok: true, user: session });
}
