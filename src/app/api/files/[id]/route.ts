import { NextResponse } from "next/server";
import { withTenant } from "../../td/_helpers";
import { getUploadById } from "@/server/store";
import { getObject } from "@/server/storage";

// GET /api/files/:id — descarga autenticada de una evidencia subida.
export const GET = withTenant(async (_req: Request,
  { params }: { params: Promise<{ id: string }> }, _user) => {
  const { id } = await params;
  const ev = getUploadById(id);
  if (!ev) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const buf = await getObject("uploads", ev.filePath);
  if (!buf) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      // el tipo y el nombre los dio quien subió el archivo: el tipo se sirve como descarga genérica y el nombre se
      // codifica (con comillas, tildes o emojis la cabecera fallaba y el archivo no se podía descargar)
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ev.fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "archivo"}"; filename*=UTF-8''${encodeURIComponent(ev.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});
