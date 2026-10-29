import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { getF1Responses, saveF1Response, f1Closed, F1_CAN_SEE_ALL, flushOrError } from "@/server/store";
import { PRACTICES } from "@/data/mapa";

// GET  /api/td/f1 — autoevaluación directiva (Fuente 1): todas las respuestas
//      para el advisor y el administrador; la propia para los demás. `mine` es
//      la del usuario con sesión; `closed` indica que el corte A3 ya se publicó.
// POST /api/td/f1 — guarda el avance o la respuesta completa del usuario:
//      { r: { "DIR-1.1": 3, … }, cargo? }. El store exige permisos (403) y
//      rangos (422) con explicación.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const responses = getF1Responses(user);
  return NextResponse.json({
    responses,
    mine: responses.find((f) => f.email.toLowerCase() === user.email.toLowerCase()) ?? null,
    all: F1_CAN_SEE_ALL(user),
    total: PRACTICES.length,
    closed: f1Closed(),
  });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.r || typeof body.r !== "object") return NextResponse.json({ error: "Cuerpo inválido: faltan las respuestas" }, { status: 400 });
  const result = saveF1Response(user, { r: body.r, cargo: body.cargo });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const e = await flushOrError();
  if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ response: result.response, answered: result.answered, total: PRACTICES.length });
});
