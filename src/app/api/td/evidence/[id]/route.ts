import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyEvidence, verifyUploadedEvidence, getUploadById, hydrateFromDb } from "@/server/store";

// PATCH /api/td/evidence/:id — verificación (solo CONSULTOR).
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (getUploadById(id)) {
    const r = verifyUploadedEvidence(user, id);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ status: "VERIFICADA" });
  }
  const result = await verifyEvidence(user, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ status: result.status });
}
