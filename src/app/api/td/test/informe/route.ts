import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTestNotes, setTestNotes } from "@/server/store";

// GET  /api/td/test/informe — notas del consultor por participante
// POST /api/td/test/informe — { id, restriccion?, evidencias?, accion?, noNecesita? }
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ notes: getTestNotes() });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Falta el participante" }, { status: 400 });
  const { id, ...patch } = body;
  const result = setTestNotes(user, String(id), patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ notes: result.notes });
}
