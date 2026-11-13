import { NextResponse } from "next/server";
import { withTenant } from "../td/_helpers";
import { hydrateFromDb } from "@/server/store";
import { can } from "@/lib/permissions";
import { putObject } from "@/server/storage";

// POST /api/branding-asset — sube un recurso de marca (logo, favicon,
// imagen de login, loader): var/branding en local, el bucket con R2
// configurado (src/server/storage.ts). Devuelve la URL servible.
const MAX = 8 * 1024 * 1024;
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif", "image/x-icon"];

const FIRMAS: Record<string, (b: Buffer) => boolean> = {
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  "image/gif": (b) => /^GIF8[79]a/.test(b.subarray(0, 6).toString("latin1")),
  "image/x-icon": (b) => b[0] === 0 && b[1] === 0 && (b[2] === 1 || b[2] === 2) && b[3] === 0,
  "image/svg+xml": (b) => { const t = b.toString("utf8"); return /<svg[\s>]/i.test(t) && !/<script|<foreignObject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object/i.test(t); },
};
const contenidoCoincide = (tipo: string, b: Buffer) => FIRMAS[tipo]?.(b) ?? false;

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_platform")) {
    return NextResponse.json({ error: "Solo el administrador de la plataforma sube recursos de marca." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Máximo 8 MB" }, { status: 422 });
  if (!OK_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato no soportado (png, jpg, webp, svg, gif, ico)" }, { status: 422 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // el tipo lo declara el navegador: se comprueba contra el contenido, y un SVG no puede traer scripts ni manejadores
  if (!contenidoCoincide(file.type, bytes)) return NextResponse.json({ error: "El archivo no corresponde al formato que declara." }, { status: 422 });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const name = `${Date.now().toString(36)}-${safe}`;
  await putObject("branding", name, bytes, file.type);
  return NextResponse.json({ url: `/api/branding-asset/${name}` }, { status: 201 });
});
