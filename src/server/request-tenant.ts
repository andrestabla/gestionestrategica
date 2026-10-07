import { headers } from "next/headers";

/** Empresa indicada en la URL (prefijo /empresa/…), puesta por el proxy. */
export async function urlTenant(): Promise<string | null> {
  try { return (await headers()).get("x-tenant"); } catch { return null; }
}

/** Ruta original pedida por el navegador (con prefijo de empresa). */
export async function urlTenantPath(): Promise<string | null> {
  try { return (await headers()).get("x-tenant-path"); } catch { return null; }
}
