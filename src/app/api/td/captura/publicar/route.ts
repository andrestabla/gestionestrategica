import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { publishCapture, hydrateFromDb } from "@/server/store";

// POST /api/td/captura/publicar — publica el corte A3 (solo consultor;
// exige las 52 variables calificadas). Al publicar, la medición vigente
// de todo el motor pasa a ser A3.
export async function POST() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const result = publishCapture(user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ assessment: result.assessment });
}
