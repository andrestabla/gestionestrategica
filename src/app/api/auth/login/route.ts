import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserForLogin, verifyPassword, compararEnVacio, companyBySlug, empresasDe, exigeCodigo, empresaQueExige, bloqueoLogin, registrarFalloLogin, limpiarFallosLogin, LOGIN_MAX, LOGIN_BLOQUEO_MIN } from "@/server/store";
import { frenado, liberar, ipDe } from "@/server/freno";
import { pedirCodigo } from "@/server/dos-pasos";
import { setSession, type SessionUser } from "@/lib/session";

const DEMO_PASSWORD = "4shine-demo-2026";
// La contraseña demo solo vale en desarrollo y con DEMO_LOGIN=on. En producción no existe, aunque la variable
// esté puesta: entra únicamente quien tiene contraseña fijada en la base (bcrypt).
const demoAllowed = () => process.env.NODE_ENV !== "production" && process.env.DEMO_LOGIN === "on";

const Body = z.object({ email: z.string().max(160).email(), password: z.string().min(4).max(200), tenant: z.string().max(40).optional() });
const DEMASIADOS = () => NextResponse.json({ error: `Demasiados intentos fallidos. Espera ${LOGIN_BLOQUEO_MIN} minutos o restablece tu contraseña con «¿Olvidaste tu contraseña?».` }, { status: 429 });

// El usuario pertenece a una empresa (su rol vale solo allí). El admin de
// plataforma no tiene empresa: entra con la primera activa como contexto y
// puede cambiarla desde el selector.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { email, password, tenant } = parsed.data;
  // frenos a la adivinación de contraseñas: por dirección, por cuenta (en memoria) y el bloqueo de la cuenta en la
  // base. La respuesta es la misma exista o no la cuenta, para no revelar qué correos están registrados.
  const clave = `login:${email.trim().toLowerCase()}`;
  if (frenado(`login-ip:${ipDe(req)}`, 30, 15 * 60_000) || frenado(clave, LOGIN_MAX, LOGIN_BLOQUEO_MIN * 60_000)) return DEMASIADOS();
  if (await bloqueoLogin(email)) return DEMASIADOS();
  const found = await findUserForLogin(email);
  // sin cuenta también se gasta el tiempo de una comparación: la demora no delata si el correo existe
  const real = found ? await verifyPassword(found.user.email, password) : await compararEnVacio(password);
  const ok = real === true || (real === null && demoAllowed() && password === DEMO_PASSWORD);
  if (!found || !ok) {
    if (found) await registrarFalloLogin(found.user.email);
    return NextResponse.json(
      { error: "Credenciales incorrectas. Verifica el correo y la contraseña." },
      { status: 401 },
    );
  }
  liberar(clave);
  await limpiarFallosLogin(found.user.email);
  if (found.company && !found.company.active) {
    return NextResponse.json({ error: "La empresa de tu cuenta está desactivada." }, { status: 403 });
  }
  // la cuenta de una empresa entra por la ruta de su empresa principal o por la de cualquiera donde tenga membresía
  const membresia = tenant ? found.otras.find((o) => o.company.slug === tenant) : undefined;
  if (tenant && found.user.role !== "ADMIN" && found.company?.slug !== tenant && !membresia) {
    return NextResponse.json({ error: "Esta cuenta no pertenece a esta empresa. Entra por el enlace de la tuya." }, { status: 401 });
  }
  // el acceso genérico (/login) también admite cuentas de empresa: entran con su
  // propia empresa como contexto y el cliente las lleva a /<empresa>/panel. Lo
  // ideal es el enlace de su empresa, pero no se les cierra la puerta por aquí.
  if (!tenant && found.user.role !== "ADMIN" && !found.company) {
    return NextResponse.json({ error: "Tu cuenta no está asociada a ninguna empresa. Pide al administrador que la asigne." }, { status: 403 });
  }
  // el admin de plataforma no tiene empresa propia: la elige en /empresas tras
  // entrar, o queda activa la de la URL por la que entró
  let company = membresia ? membresia.company : found.company ?? null;
  if (!company && tenant && found.user.role === "ADMIN") {
    const c = companyBySlug(tenant);
    if (c?.active) company = c;
  }
  const empresas = empresasDe(found);
  const session: SessionUser = {
    email: found.user.email,
    name: found.user.name,
    role: membresia ? membresia.role : found.user.role,
    line: membresia ? membresia.line : found.user.line,
    responsibleId: membresia ? membresia.responsibleId : found.user.responsibleId,
    company: company ? { slug: company.slug, name: company.name, shortName: company.shortName, mode: company.mode } : undefined,
    ...(empresas.length > 1 ? { empresas: empresas.map((e) => ({ slug: e.slug, shortName: e.shortName, role: e.role })) } : {}),
  };
  // acceso en dos pasos: si lo exige la empresa (o alguna en la que la cuenta opera), la sesión queda pendiente del
  // código que se envía al correo; se abre en /api/auth/codigo
  if (exigeCodigo(found, company)) return pedirCodigo({ user: session, empresa: empresaQueExige(found, company) });
  await setSession(session);
  return NextResponse.json({ ok: true, user: session });
}
