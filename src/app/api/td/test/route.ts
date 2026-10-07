import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { getTestResponses, saveTestResponse } from "@/server/store";

// GET  /api/td/test — respuestas del test (todas para advisor y líder; la propia para los demás)
// POST /api/td/test — guarda la respuesta del usuario con sesión
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  return NextResponse.json({ responses: getTestResponses(user), mine: getTestResponses(user).find((t) => t.email === user.email) ?? null });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.r) return NextResponse.json({ error: "Cuerpo inválido: faltan las respuestas" }, { status: 400 });
  const result = saveTestResponse(user, { r: body.r, cargo: body.cargo, objetivo: body.objetivo });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ response: result.response });
});
