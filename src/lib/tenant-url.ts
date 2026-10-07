// Rutas únicas por empresa: cada empresa vive bajo su identificador en la URL
// (/cresio/login, /cresio/panel/...). El admin de la plataforma entra por
// /login y elige empresa en /empresas. Reglas puras, válidas en el edge
// (proxy) y en el servidor.

export const RESERVED = new Set([
  "api", "login", "panel", "empresas", "p", "e", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
  "img", "fonts", "uploads", "static", "admin", "www", "4shine", "algoritmot",
]);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Secciones de la aplicación que admiten prefijo de empresa. */
const SECTIONS = new Set(["login", "panel", "api", "p", "e"]);

/** Separa el identificador de empresa del resto de la ruta. Sin prefijo
    reconocible devuelve tenant null y la ruta intacta. «/cresio» equivale a
    «/cresio/panel». */
export function splitTenantPath(pathname: string): { tenant: string | null; path: string } {
  const parts = pathname.split("/");
  const first = parts[1] ?? "";
  if (!first || RESERVED.has(first) || !SLUG_RE.test(first)) return { tenant: null, path: pathname };
  const rest = parts.slice(2);
  if (rest.length === 0 || rest[0] === "") return { tenant: first, path: "/panel" };
  if (!SECTIONS.has(rest[0])) return { tenant: null, path: pathname };
  return { tenant: first, path: "/" + rest.join("/") };
}

/** Prefijo de rutas de una empresa («/cresio») o vacío sin empresa. */
export const tenantBase = (slug?: string | null): string => (slug && SLUG_RE.test(slug) ? `/${slug}` : "");

/** Lee rol y empresa del cuerpo de la cookie de sesión SIN verificar la
    firma: solo sirve para decidir redirecciones en el proxy; la autenticación
    real la hacen las rutas con la firma. */
export function parseSessionCookie(value: string | undefined): { role?: string; company?: string } | null {
  if (!value) return null;
  const body = value.split(".")[0];
  if (!body) return null;
  try {
    const b64 = body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof data?.exp === "number" && data.exp < Date.now()) return null;
    return { role: typeof data?.role === "string" ? data.role : undefined, company: typeof data?.company?.slug === "string" ? data.company.slug : undefined };
  } catch {
    return null;
  }
}
