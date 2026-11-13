import { headers } from "next/headers";
import { pageTenant, PAGE_TENANT_HEADER } from "@/lib/tenant-url";

/** Empresa indicada en la URL (prefijo /empresa/…), puesta por el proxy. */
export async function urlTenant(): Promise<string | null> {
  try { return (await headers()).get("x-tenant"); } catch { return null; }
}

/** Ruta original pedida por el navegador (con prefijo de empresa). */
export async function urlTenantPath(): Promise<string | null> {
  try { return (await headers()).get("x-tenant-path"); } catch { return null; }
}

/** Empresa de la página que originó la petición: la que declara el navegador (x-tenant-pagina, lib/fetch-empresa) o,
    si no llega, la del Referer de este mismo sitio. Nulo si la página no es de ninguna empresa. */
export async function paginaTenant(): Promise<string | null> {
  try {
    const h = await headers();
    return pageTenant({ declarada: h.get(PAGE_TENANT_HEADER), referer: h.get("referer"), hosts: [h.get("host"), h.get("x-forwarded-host")] });
  } catch { return null; }
}
