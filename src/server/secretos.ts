// Cifrado de las credenciales de integración (claves de API de OpenAI, Amazon SES y Cloudflare R2) que se guardan en la
// base: AES-256-GCM con una clave derivada (HKDF-SHA256) de SECRETOS_CLAVE o, si no está definida, de AUTH_SECRET.
// En memoria del servidor viven en claro; en la base, como «enc:v1:<iv|etiqueta|cifrado en base64url>». Los valores
// guardados antes del cifrado se leen tal cual y quedan cifrados en el siguiente guardado.
// Ojo: si se cambia la clave de origen, las credenciales guardadas no se pueden leer y hay que volver a ingresarlas
// en Administración → Integraciones (las que vienen de variables de entorno no se ven afectadas).

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const PREFIJO = "enc:v1:";
/** Campos de una integración que son secretos y se cifran. */
export const CAMPOS_SECRETOS = new Set(["apiKey", "accessKeyId", "secretAccessKey"]);

let clave: Buffer | null | undefined;
function claveCifrado(): Buffer | null {
  if (clave !== undefined) return clave;
  const base = process.env.SECRETOS_CLAVE?.trim() || process.env.AUTH_SECRET?.trim() || (process.env.NODE_ENV !== "production" ? "desarrollo-local-sin-secreto" : "");
  clave = base ? Buffer.from(hkdfSync("sha256", base, "gestionestrategica", "integraciones-v1", 32)) : null;
  if (!clave) console.warn("[4shine] sin SECRETOS_CLAVE ni AUTH_SECRET: las credenciales de integración se guardan sin cifrar");
  return clave;
}

export const estaCifrado = (v: string) => v.startsWith(PREFIJO);

export function cifrar(v: string): string {
  const k = claveCifrado();
  if (!k || !v || estaCifrado(v)) return v;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const datos = Buffer.concat([c.update(v, "utf8"), c.final()]);
  return PREFIJO + Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64url");
}

/** Descifra; devuelve null si el valor está cifrado con otra clave o está dañado. */
export function descifrar(v: string): string | null {
  if (!estaCifrado(v)) return v;
  const k = claveCifrado(); if (!k) return null;
  try {
    const b = Buffer.from(v.slice(PREFIJO.length), "base64url");
    const d = createDecipheriv("aes-256-gcm", k, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch { return null; }
}

/** Campos de una integración listos para guardar en la base (secretos cifrados). */
export const camposParaGuardar = (f: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, CAMPOS_SECRETOS.has(k) && typeof v === "string" ? cifrar(v) : v]));

/** Campos leídos de la base, con los secretos en claro. Un secreto ilegible queda vacío (la integración se ve incompleta). */
export function camposLeidos(f: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f ?? {})) {
    if (typeof v !== "string") continue;
    if (CAMPOS_SECRETOS.has(k)) {
      const claro = descifrar(v);
      if (claro === null) console.warn(`[4shine] credencial de integración ilegible (${k}): vuelve a ingresarla en Administración → Integraciones`);
      out[k] = claro ?? "";
    } else out[k] = v;
  }
  return out;
}

/** ¿Quedan secretos guardados sin cifrar en estos campos (de antes del cifrado)? */
export const secretosSinCifrar = (f: Record<string, unknown>): boolean =>
  !!claveCifrado() && Object.entries(f ?? {}).some(([k, v]) => CAMPOS_SECRETOS.has(k) && typeof v === "string" && v !== "" && !estaCifrado(v));
