import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { verifyEvidence, verifyUploadedEvidence, getUploadById } from "@/server/store";

// PATCH /api/td/evidence/:id — verificación (solo CONSULTOR).
export const PATCH = withTenant(async (_req: Request,
  { params }: { params: Promise<{ id: string }> }, user) => {
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
});
