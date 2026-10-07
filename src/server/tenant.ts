// ─────────────────────────────────────────────────────────────────────────────
// Contexto de empresa (tenant) por petición.
// La plataforma atiende varias empresas con un mismo proceso: cada petición
// corre dentro de `runWithTenant(slug, …)` y el store resuelve su estado con
// `currentTenant()`. Fuera de una petición (pruebas, bundle del navegador,
// seed) rige la empresa de demostración.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TENANT = "andina";

type Ctx = { slug: string };

// AsyncLocalStorage solo existe en Node; en el navegador el módulo también se
// importa (el store entra al bundle del cliente), así que se carga de forma
// opaca y, si no está, siempre responde la empresa demo.
type Als = { run<T>(ctx: Ctx, fn: () => T): T; getStore(): Ctx | undefined };
let als: Als | null = null;
if (typeof window === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require("node:async_hooks") as { AsyncLocalStorage: new () => Als };
    const g = globalThis as unknown as { __4shineTenantAls?: Als };
    if (!g.__4shineTenantAls) g.__4shineTenantAls = new AsyncLocalStorage();
    als = g.__4shineTenantAls;
  } catch { als = null; }
}

/** Ejecuta `fn` con la empresa `slug` como tenant activo. */
export function runWithTenant<T>(slug: string, fn: () => T): T {
  if (!als) return fn();
  return als.run({ slug }, fn);
}

/** Empresa activa de la petición; la demo cuando no hay contexto. */
export function currentTenant(): string {
  return als?.getStore()?.slug ?? DEFAULT_TENANT;
}

/** ¿Hay un contexto de empresa explícito? (en pruebas y en el navegador, no) */
export function hasTenantContext(): boolean {
  return Boolean(als?.getStore());
}
