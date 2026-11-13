import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { getTestNotes, setTestNotes } from "@/server/store";

// GET  /api/td/test/informe — notas del consultor por participante
// POST /api/td/test/informe — { id, restriccion?, evidencias?, accion?, noNecesita? }
// Las notas de todos los participantes las ven quienes pueden escribirlas (advisor, líder) y el administrador; cada
// persona ve solo las de su propio test.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const todas = getTestNotes();
  if (["CONSULTOR", "LIDER", "ADMIN"].includes(user.role)) return NextResponse.json({ notes: todas });
  const yo = user.email.toLowerCase();
  return NextResponse.json({ notes: Object.fromEntries(Object.entries(todas).filter(([id]) => id.toLowerCase() === yo)) });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Falta el participante" }, { status: 400 });
  const { id, ...patch } = body;
  const result = setTestNotes(user, String(id), patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ notes: result.notes });
});
