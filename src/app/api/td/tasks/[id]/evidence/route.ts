import { NextResponse } from "next/server";
import { withTenant } from "../../../_helpers";
import { randomBytes } from "crypto";
import { attachEvidence } from "@/server/store";
import { putObject } from "@/server/storage";

// POST /api/td/tasks/:id/evidence — multipart: adjunta el archivo del
// entregable. Local en var/uploads; con R2 configurado, en el bucket
// (src/server/storage.ts): cambia el destino, no el contrato.
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED = /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|zip|csv)$/i;

export const POST = withTenant(async (req: Request,
  { params }: { params: Promise<{ id: string }> }, user) => {
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

  // el permiso se valida ANTES de escribir el archivo
  const result = attachEvidence(user, id,
    { fileName: file.name, filePath: key, size: file.size, mime: file.type || "application/octet-stream" },
    { title, kind });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await putObject("uploads", key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  return NextResponse.json({ evidence: result.evidence });
});
