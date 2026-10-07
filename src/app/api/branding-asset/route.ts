import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { putObject } from "@/server/storage";

// POST /api/branding-asset — sube un recurso de marca (logo, favicon,
// imagen de login, loader): var/branding en local, el bucket con R2
// configurado (src/server/storage.ts). Devuelve la URL servible.
const MAX = 8 * 1024 * 1024;
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif", "image/x-icon"];

export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const name = `${Date.now().toString(36)}-${safe}`;
  await putObject("branding", name, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ url: `/api/branding-asset/${name}` }, { status: 201 });
}
