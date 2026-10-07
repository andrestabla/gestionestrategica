// Almacenamiento de archivos (evidencias y recursos de marca).
// Local: var/<carpeta>/<clave>. Producción: Cloudflare R2 (API S3) cuando
// están definidas R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y
// R2_BUCKET. Misma interfaz en ambos casos: cambia el destino, no el contrato.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type Folder = "uploads" | "branding";

const r2Config = () => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return { accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET };
};

export const storageKind = (): "r2" | "local" => (r2Config() ? "r2" : "local");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyS3 = any;
async function s3(): Promise<AnyS3> {
  const g = globalThis as unknown as { __4shineS3?: AnyS3 };
  if (!g.__4shineS3) {
    const cfg = r2Config()!;
    const { S3Client } = await import("@aws-sdk/client-s3");
    g.__4shineS3 = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }
  return g.__4shineS3;
}

/** Guarda un objeto y devuelve la clave con la que se recupera. */
export async function putObject(folder: Folder, key: string, body: Buffer, mime: string): Promise<void> {
  const cfg = r2Config();
  if (cfg) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new PutObjectCommand({ Bucket: cfg.bucket, Key: `${folder}/${key}`, Body: body, ContentType: mime }));
    return;
  }
  const dir = path.join(process.cwd(), "var", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), body);
}

/** Lee un objeto; null si no existe. */
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
