import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { publishCapture } from "@/server/store";

// POST /api/td/captura/publicar — publica el corte A3 (solo consultor;
// exige las 52 variables calificadas). Al publicar, la medición vigente
// de todo el motor pasa a ser A3.
export const POST = withTenant(async (_req: Request, _ctx: unknown, user) => {

  const result = publishCapture(user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ assessment: result.assessment });
});
