import { NextResponse, type NextRequest } from "next/server";
import { splitTenantPath, parseSessionCookie } from "@/lib/tenant-url";

// Rutas por empresa: «/cresio/panel/kpi» se sirve con la ruta interna
// «/panel/kpi» y la cabecera x-tenant=cresio; una ruta interna sin prefijo
// («/panel/kpi») se redirige a la canónica de la empresa de la sesión. El
// admin sin empresa elegida va a /empresas; sin sesión, a /login.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const { tenant, path } = splitTenantPath(pathname);
  if (tenant) {
    if (path === "/panel" && !/^\/[^/]+\/panel/.test(pathname)) {
      return NextResponse.redirect(new URL(`/${tenant}/panel${search}`, req.url));
    }
    const url = req.nextUrl.clone();
    url.pathname = path;
    const headers = new Headers(req.headers);
    headers.set("x-tenant", tenant);
    headers.set("x-tenant-path", pathname);
    return NextResponse.rewrite(url, { request: { headers } });
  }
  if (pathname === "/panel" || pathname.startsWith("/panel/")) {
    const s = parseSessionCookie(req.cookies.get("pgtd_session")?.value);
    if (!s) return NextResponse.redirect(new URL("/login", req.url));
    if (s.company) return NextResponse.redirect(new URL(`/${s.company}${pathname}${search}`, req.url));
    if (s.role === "ADMIN") return NextResponse.redirect(new URL("/empresas", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|txt|woff2?)$).*)"],
};
