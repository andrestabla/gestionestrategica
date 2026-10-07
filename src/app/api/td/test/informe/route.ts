import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { getTestNotes, setTestNotes } from "@/server/store";

// GET  /api/td/test/informe — notas del consultor por participante
// POST /api/td/test/informe — { id, restriccion?, evidencias?, accion?, noNecesita? }
export const GET = withTenant(async (_req: Request, _ctx: unknown, _user) => {
  return NextResponse.json({ notes: getTestNotes() });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Falta el participante" }, { status: 400 });
  const { id, ...patch } = body;
  const result = setTestNotes(user, String(id), patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ notes: result.notes });
});
