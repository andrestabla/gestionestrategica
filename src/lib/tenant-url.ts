// Rutas únicas por empresa: cada empresa vive bajo su identificador en la URL
// (/cresio/login, /cresio/panel/...). El admin de la plataforma entra por
// /login y elige empresa en /empresas. Reglas puras, válidas en el edge
// (proxy) y en el servidor.

export const RESERVED = new Set([
  "api", "login", "panel", "empresas", "acceso", "acceder", "restablecer", "p", "e", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
  "img", "fonts", "uploads", "static", "admin", "www", "4shine", "algoritmot", "codigo", "solicitar-codigo", "diagnosticos", "r",
]);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Secciones de la aplicación que admiten prefijo de empresa. */
const SECTIONS = new Set(["login", "panel", "api", "acceso", "acceder", "restablecer", "p", "e"]);

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

/** Cabecera con la que el navegador declara la empresa de la página que origina una llamada a la API. La sesión
    (cookie) es una sola para todas las pestañas: sin esto, una pestaña abierta en la empresa A operaría sobre la B
    si otra pestaña cambió la empresa activa. */
export const PAGE_TENANT_HEADER = "x-tenant-pagina";

const slugValido = (s: string | null | undefined): s is string => !!s && SLUG_RE.test(s) && !RESERVED.has(s);

/** Empresa de la página que originó la petición: la que declara el cliente (cabecera x-tenant-pagina) o, si no llega
    —enlaces de descarga, imágenes, formularios: no pueden llevar cabeceras propias—, la del Referer cuando es de este
    mismo sitio. Nulo cuando la página no es de ninguna empresa (/empresas, /login) o no se puede saber. */
export function pageTenant(o: { declarada?: string | null; referer?: string | null; hosts?: (string | null | undefined)[] }): string | null {
  const declarada = o.declarada?.trim().toLowerCase();
  if (slugValido(declarada)) return declarada;
  if (!o.referer) return null;
  try {
    const u = new URL(o.referer);
    const hosts = (o.hosts ?? []).flatMap((h) => (h ? [h.split(",")[0].trim().toLowerCase()] : []));
    if (!hosts.includes(u.host.toLowerCase())) return null;   // un Referer de otro sitio no dice nada de nuestras empresas
    return splitTenantPath(u.pathname).tenant;
  } catch { return null; }
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

/** Ruta de este mismo sitio a la que se puede redirigir, o nulo. Rechaza lo que el navegador resolvería hacia otro
    sitio: «//otro», «/\\otro» (trata la barra invertida como barra) y los caracteres de control que el analizador ignora. */
export function rutaInterna(next: unknown): string | null {
  if (typeof next !== "string" || !/^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(next)) return null;
  try { const u = new URL(next, "http://interno.invalid"); return u.origin === "http://interno.invalid" ? u.pathname + u.search + u.hash : null; } catch { return null; }
}
