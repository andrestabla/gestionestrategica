import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTestResponses, saveTestResponse, hydrateFromDb } from "@/server/store";

// GET  /api/td/test — respuestas del test (todas para advisor y líder; la propia para los demás)
// POST /api/td/test — guarda la respuesta del usuario con sesión
export async function GET() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ responses: getTestResponses(user), mine: getTestResponses(user).find((t) => t.email === user.email) ?? null });
}

export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.r) return NextResponse.json({ error: "Cuerpo inválido: faltan las respuestas" }, { status: 400 });
  const result = saveTestResponse(user, { r: body.r, cargo: body.cargo, objetivo: body.objetivo });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ response: result.response });
}
