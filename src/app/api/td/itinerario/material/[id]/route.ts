import { NextResponse } from "next/server";
import { withTenant } from "../../../_helpers";
import { itineraryFileOf } from "@/server/store";
import { getObject, pdfDisposition } from "@/server/storage";

// GET /api/td/itinerario/material/:id — el PDF del material, en línea (con sesión).
export const GET = withTenant(async (_req: Request, { params }: { params: Promise<{ id: string }> }, user) => {
  const { id } = await params;
  const f = itineraryFileOf(id);
  if (!f) return NextResponse.json({ error: "El material no existe." }, { status: 404 });
  const buf = await getObject("materiales", `${user.company!.slug}/${id}.pdf`);
  if (!buf) return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": pdfDisposition(f.name), "Cache-Control": "private, max-age=300" } });
});
