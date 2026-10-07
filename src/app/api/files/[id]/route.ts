import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUploadById, hydrateFromDb } from "@/server/store";
import { getObject } from "@/server/storage";

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
  const buf = await getObject("uploads", ev.filePath);
  if (!buf) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": ev.mime,
      "Content-Disposition": `attachment; filename="${ev.fileName}"`,
    },
  });
}
