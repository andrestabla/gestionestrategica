import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { captureVariable, captureProgress } from "@/server/store";

// POST /api/td/captura — registra la captura de una práctica del corte A3:
// autoevaluación (responsable de la capacidad o advisor), evidencia y nivel
// (solo advisor). El store exige permisos (403) y rangos (422) con explicación.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {

  const body = await req.json().catch(() => null);
  if (!body?.varId) return NextResponse.json({ error: "Cuerpo inválido: falta varId" }, { status: 400 });

  const { varId, perception, evidence, level, note } = body;
  const result = captureVariable(user, varId, { perception, evidence, level, note });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ capture: result.capture, progress: captureProgress() });
});
