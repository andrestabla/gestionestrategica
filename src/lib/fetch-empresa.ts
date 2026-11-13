// La empresa de la página viaja en cada llamada a la API.
//
// La sesión es una cookie compartida por todas las pestañas del navegador. Quien opera en varias empresas (el
// administrador de la plataforma, un consultor con membresías) puede tener una pestaña en la empresa A y otra en
// la B: la última que se abrió fija la empresa activa de la sesión, y las llamadas de la otra pestaña —que van a
// /api/td/… sin prefijo de empresa— se resolvían contra esa, no contra la que la página muestra. Para que una
// petición nunca opere sobre una empresa distinta de la que tiene delante quien la lanza, el navegador declara la
// empresa de la página (primer segmento de la ruta) en la cabecera x-tenant-pagina; el servidor la valida contra
// los accesos de la cuenta (src/server/empresa-peticion.ts).

import { splitTenantPath, PAGE_TENANT_HEADER } from "@/lib/tenant-url";

/** Rutas de la API que operan sobre la empresa de la petición (las envueltas en withTenant). */
const RUTAS = ["/api/td/", "/api/branding-asset"];
const esDeEmpresa = (ruta: string) => RUTAS.some((r) => ruta === r || ruta.startsWith(r.endsWith("/") ? r : `${r}/`));

/** Ruta de la petición si va a este mismo sitio; nulo si va a otro (nunca se le envía la cabecera). */
function rutaLocal(input: RequestInfo | URL, origin: string): string | null {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try { const u = new URL(raw, origin); return u.origin === origin ? u.pathname : null; } catch { return null; }
}

/** Opciones de fetch con la empresa de la página añadida, cuando la llamada es a la API de empresa y la página
    pertenece a una (/empresa/panel/…). En cualquier otro caso devuelve las opciones tal cual. */
export function initConEmpresa(input: RequestInfo | URL, init: RequestInit | undefined, pagina: { origin: string; pathname: string }): RequestInit | undefined {
  const ruta = rutaLocal(input, pagina.origin);
  if (!ruta || !esDeEmpresa(ruta)) return init;
  const { tenant } = splitTenantPath(pagina.pathname);
  if (!tenant) return init;
  // las cabeceras de init sustituyen a las del Request (así lo hace fetch): se parte de las que vayan a regir
  const headers = new Headers(init?.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined));
  if (headers.has(PAGE_TENANT_HEADER)) return init;
  headers.set(PAGE_TENANT_HEADER, tenant);
  return { ...init, headers };
}

/** Envuelve window.fetch una sola vez. Se llama al cargar el módulo del proveedor del panel —antes de que ningún
    componente lance su primera lectura—, no en un efecto: los efectos de los hijos corren antes que los del padre. */
export function instalarFetchEmpresa(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __4shineFetchEmpresa?: true };
  if (w.__4shineFetchEmpresa) return;
  w.__4shineFetchEmpresa = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => original(input, initConEmpresa(input, init, window.location));
}
