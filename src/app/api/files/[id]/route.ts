import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { getUploadById, hydrateFromDb } from "@/server/store";

// GET /api/files/:id — descarga autenticada de una evidencia subida.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const ev = getUploadById(id);
  if (!ev) return NextResponse.json({ error: "No existe" }, { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "var", "uploads", ev.filePath));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": ev.mime,
        "Content-Disposition": `attachment; filename="${ev.fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  }
}
