import { NextResponse } from "next/server";
import { urlTenant, paginaTenant } from "@/server/request-tenant";
import { getSession, type SessionUser, renewSession } from "@/lib/session";
import { hydrateFromDb, hydrateCompanies, registrarSinSesion, flushOrError } from "@/server/store";
import { resolverEmpresa } from "@/server/empresa-peticion";
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

/** Resuelve la empresa de la petición: la de la página que la originó (o el prefijo de la URL) y, si la petición
    no dice ninguna, la activa de la sesión. Devuelve también la sesión tal como opera en esa empresa: cuando otra
    pestaña cambió la empresa activa, el rol y el ámbito son los de la cuenta en la empresa de la página
    (src/server/empresa-peticion.ts). */
export async function tenantOf(user: SessionUser): Promise<{ slug: string; actor: SessionUser } | NextResponse> {
  const r = await resolverEmpresa(user, { url: await urlTenant(), pagina: await paginaTenant() });
  if (r.ok) return { slug: r.slug, actor: r.actor };
  return NextResponse.json({ error: r.error, ...(r.verificar ? { verificar: r.verificar } : {}), ...(r.recargar ? { recargar: true } : {}) }, { status: r.status });
}

type Handler<C> = (req: Request, ctx: C, user: SessionUser) => Promise<Response> | Response;

/** Envuelve un handler: exige sesión, fija la empresa como contexto de la
    petición e hidrata su estado. Dentro del handler el store ya es «de la
    empresa». */
export function withTenant<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const user = await getSession();
    if (!user) {
      if (req.method !== "GET") { const ref = req.headers.get("referer") ?? ""; const m = ref.match(/^https?:\/\/[^/]+\/([a-z0-9-]+)\/panel/i); void registrarSinSesion(m ? m[1].toLowerCase() : null, `${req.method} ${new URL(req.url).pathname}`); }
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const t = await tenantOf(user);
    if (t instanceof NextResponse) return t;
    await renewSession(user).catch(() => undefined);
    // quien actúa es la sesión tal como opera en la empresa de la petición (rol y ámbito de allí); la cookie no cambia
    const actor = t.actor;
    return runWithTenant(t.slug, async () => {
      // las escrituras se sincronizan siempre con la base antes de aplicarse; las lecturas, como máximo una vez por segundo
      await hydrateFromDb({ force: req.method !== "GET" });
      const res = await handler(req, ctx, actor);
      // ninguna mutación responde «guardado» hasta que la base confirmó la escritura: si falló, el usuario lo ve y puede reintentar
      if (req.method !== "GET" && res.ok) {
        const error = await flushOrError();
        if (error) return NextResponse.json({ error }, { status: 503 });
      }
      return res;
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
