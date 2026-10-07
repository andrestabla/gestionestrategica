import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { captureVariable, captureProgress, hydrateFromDb } from "@/server/store";

// POST /api/td/captura — registra la captura de una práctica del corte A3:
// autoevaluación (responsable de la capacidad o advisor), evidencia y nivel
// (solo advisor). El store exige permisos (403) y rangos (422) con explicación.
export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.varId) return NextResponse.json({ error: "Cuerpo inválido: falta varId" }, { status: 400 });

  const { varId, perception, evidence, level, note } = body;
  const result = captureVariable(user, varId, { perception, evidence, level, note });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ capture: result.capture, progress: captureProgress() });
}
