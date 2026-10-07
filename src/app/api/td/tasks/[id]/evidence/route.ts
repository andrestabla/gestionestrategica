import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";
import { getSession } from "@/lib/session";
import { attachEvidence, hydrateFromDb } from "@/server/store";

// POST /api/td/tasks/:id/evidence — multipart: adjunta el archivo del
// entregable. Almacenamiento local en var/uploads (en producción, la misma
// interfaz escribe a Cloudflare R2: cambia el destino, no el contrato).
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED = /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|zip|csv)$/i;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Se esperaba multipart/form-data." }, { status: 400 });
  const file = form.get("file");
  const title = String(form.get("title") ?? "");
  const kind = String(form.get("kind") ?? "Documento");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 422 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El archivo supera los 15 MB." }, { status: 422 });
  }
  if (!ALLOWED.test(file.name)) {
    return NextResponse.json({ error: "Formato no permitido (pdf, office, imagen, zip, csv)." }, { status: 422 });
  }

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${randomBytes(8).toString("hex")}-${safeName}`;
  const dir = path.join(process.cwd(), "var", "uploads");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, key);

  // el permiso se valida ANTES de escribir el archivo
  const result = attachEvidence(user, id,
    { fileName: file.name, filePath: key, size: file.size, mime: file.type || "application/octet-stream" },
    { title, kind });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ evidence: result.evidence });
}
