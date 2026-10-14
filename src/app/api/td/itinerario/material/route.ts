import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { addItineraryFile, itineraryOf } from "@/server/store";
import { putObject } from "@/server/storage";
import { fileIdFrom, FILE_ID_RE } from "@/lib/itinerario";

const MAX = 25 * 1024 * 1024;

// POST /api/td/itinerario/material — sube un PDF (multipart: file, name?,
// group?) al almacenamiento (R2) y lo registra en el itinerario de la empresa.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Adjunta un archivo PDF." }, { status: 400 });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Solo se admiten archivos PDF, para verlos en línea." }, { status: 422 });
  if (file.size > MAX) return NextResponse.json({ error: "Máximo 25 MB por archivo." }, { status: 422 });
  const name = String(form?.get("name") ?? file.name).trim().slice(0, 160) || file.name;
  const id = String(form?.get("id") ?? fileIdFrom(file.name)).trim();
  if (!FILE_ID_RE.test(id)) return NextResponse.json({ error: "El nombre del archivo no sirve como identificador." }, { status: 422 });
  if (!itineraryOf()) return NextResponse.json({ error: "Esta empresa aún no tiene itinerario." }, { status: 404 });
  await putObject("materiales", `${user.company!.slug}/${id}.pdf`, Buffer.from(await file.arrayBuffer()), "application/pdf");
  const r = addItineraryFile(user, { id, name, size: file.size, group: String(form?.get("group") ?? "") || undefined });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, file: r.itinerary.files?.find((f) => f.id === id), itinerary: r.itinerary });
});
