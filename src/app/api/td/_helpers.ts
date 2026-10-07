import { NextResponse } from "next/server";
import { urlTenant } from "@/server/request-tenant";
import { getSession, type SessionUser } from "@/lib/session";
import { hydrateFromDb, hydrateCompanies, companyBySlug } from "@/server/store";
import { runWithTenant } from "@/server/tenant";

/** Todas las rutas /api/td/* exigen sesión (compatibilidad). */
export async function guard() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return null;
}

/** Resuelve la empresa activa de la sesión: la del usuario, o la elegida por el admin. */
export async function tenantOf(user: SessionUser): Promise<{ slug: string } | NextResponse> {
  await hydrateCompanies();
  const fromUrl = await urlTenant();
  if (fromUrl && user.role !== "ADMIN" && user.company?.slug !== fromUrl) {
    return NextResponse.json({ error: "Esta ruta es de otra empresa. Entra por el enlace de la tuya." }, { status: 403 });
  }
  const slug = fromUrl ?? user.company?.slug;
  if (!slug) {
    return NextResponse.json({ error: user.role === "ADMIN" ? "Elige una empresa para operar." : "Tu cuenta no tiene empresa asignada." }, { status: 409 });
  }
  const c = companyBySlug(slug);
  if (!c) return NextResponse.json({ error: "La empresa de tu sesión ya no existe." }, { status: 409 });
  if (!c.active && user.role !== "ADMIN") return NextResponse.json({ error: "La empresa está desactivada." }, { status: 403 });
  return { slug };
}

type Handler<C> = (req: Request, ctx: C, user: SessionUser) => Promise<Response> | Response;

/** Envuelve un handler: exige sesión, fija la empresa como contexto de la
    petición e hidrata su estado. Dentro del handler el store ya es «de la
    empresa». */
export function withTenant<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const t = await tenantOf(user);
    if (t instanceof NextResponse) return t;
    return runWithTenant(t.slug, async () => {
      await hydrateFromDb();
      return handler(req, ctx, user);
    });
  };
}

/** Variante para páginas y rutas públicas que conocen el slug (enlaces firmados). */
export async function inTenant<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  await hydrateCompanies();
  return runWithTenant(slug, async () => {
    await hydrateFromDb();
    return fn();
  });
}
