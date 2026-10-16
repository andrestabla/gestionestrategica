// Almacenamiento de archivos (evidencias y recursos de marca).
// Local: var/<carpeta>/<clave>. Producción: Cloudflare R2 (API S3) cuando
// están definidas R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y
// R2_BUCKET. Misma interfaz en ambos casos: cambia el destino, no el contrato.

import { unlink, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { effectiveR2 } from "@/server/store";

export type Folder = "uploads" | "branding" | "materiales";

const r2Config = () => {
  // rige la integración guardada en la plataforma (Administración → Integraciones) si está activa y completa; si no, el entorno
  const cfg = effectiveR2();
  if (!cfg) return null;
  const { accountId, accessKeyId, secretAccessKey, bucket } = cfg.fields;
  return { accountId, accessKeyId, secretAccessKey, bucket };
};

export const storageKind = (): "r2" | "local" => (r2Config() ? "r2" : "local");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyS3 = any;
async function s3(): Promise<AnyS3> {
  // el cliente se rehace si cambia la configuración (p. ej. al guardar otra clave desde la plataforma)
  const g = globalThis as unknown as { __4shineS3?: AnyS3; __4shineS3Sig?: string };
  const cfg = r2Config()!;
  const sig = `${cfg.accountId}|${cfg.accessKeyId}|${cfg.bucket}`;
  if (!g.__4shineS3 || g.__4shineS3Sig !== sig) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    g.__4shineS3 = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
    g.__4shineS3Sig = sig;
  }
  return g.__4shineS3;
}

/** Prueba de acceso al bucket: escribe, lee y borra un objeto mínimo. */
export async function testStorage(): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  const cfg = r2Config();
  if (!cfg) return { ok: false, error: "Cloudflare R2 no está configurado: completa la integración o las variables de entorno." };
  try {
    const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3(); const key = `_prueba/${Date.now()}.txt`;
    await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: Buffer.from("prueba de acceso 4Shine Empresas"), ContentType: "text/plain" }));
    const got = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
    const text = await got.Body?.transformToString?.();
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    if (!text?.includes("4Shine")) return { ok: false, error: "El objeto de prueba no se pudo leer de vuelta." };
    return { ok: true, detail: `Bucket «${cfg.bucket}» en la cuenta …${cfg.accountId.slice(-6)}: escritura, lectura y borrado correctos.` };
  } catch (e) {
    return { ok: false, error: `No se pudo acceder al bucket: ${(e as Error).message}` };
  }
}

/** Guarda un objeto y devuelve la clave con la que se recupera. */
export async function putObject(folder: Folder, key: string, body: Buffer, mime: string): Promise<void> {
  const cfg = r2Config();
  if (cfg) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new PutObjectCommand({ Bucket: cfg.bucket, Key: `${folder}/${key}`, Body: body, ContentType: mime }));
    return;
  }
  const file = path.join(process.cwd(), "var", folder, key);   // la clave puede llevar subcarpeta (p. ej. materiales/<empresa>/…)
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

/** Lee un objeto; null si no existe. */
/** Borra un objeto (sin error si no existe). */
export async function deleteObject(folder: Folder, key: string): Promise<void> {
  const cfg = r2Config();
  try {
    if (cfg) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await (await s3()).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: `${folder}/${key}` }));
      return;
    }
    await unlink(path.join(process.cwd(), "var", folder, key));
  } catch { /* ya no existe */ }
}

export async function getObject(folder: Folder, key: string): Promise<Buffer | null> {
  const cfg = r2Config();
  try {
    if (cfg) {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const res = await (await s3()).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: `${folder}/${key}` }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    }
    return await readFile(path.join(process.cwd(), "var", folder, key));
  } catch {
    return null;
  }
}

/** Content-Disposition con nombre ASCII de respaldo y nombre UTF-8 (RFC 5987). El PDF se abre en línea; el PowerPoint se descarga. */
export function materialDisposition(name: string, ext: "pdf" | "pptx" = "pdf"): string {
  const base = name.replace(/\.(pdf|pptx)$/i, "");
  const ascii = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "").trim() || "material";
  return `${ext === "pdf" ? "inline" : "attachment"}; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(base + "." + ext)}`;
}
export const pdfDisposition = (name: string) => materialDisposition(name, "pdf");
