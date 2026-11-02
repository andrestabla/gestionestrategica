import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { getTestResponses, saveTestResponse, removeTestResponse, flushOrError } from "@/server/store";

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

// DELETE /api/td/test?email= — el administrador borra el test de una persona.
export const DELETE = withTenant(async (req: Request, _ctx: unknown, user) => {
  const r = removeTestResponse(user, new URL(req.url).searchParams.get("email"));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError();
  if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true });
});
