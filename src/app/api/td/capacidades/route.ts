import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { elegiblesCapacidades, getChecklistsCap, getRevisionesCap, saveRevisionCap, flushOrError } from "@/server/store";

// GET  /api/td/capacidades — iniciativas elegibles (implementar o preparar), checklists personalizados y revisiones.
// POST /api/td/capacidades — { iniId, revision: { respuestas, falta } } registra la revisión de una iniciativa.
export const GET = withTenant(async () => NextResponse.json({ elegibles: elegiblesCapacidades(), checklists: getChecklistsCap(), revisiones: getRevisionesCap() }));

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const iniId = String(body?.iniId ?? "").trim();
  if (!iniId) return NextResponse.json({ error: "Falta la iniciativa." }, { status: 400 });
  const r = saveRevisionCap(user, iniId, body?.revision);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true, revision: r.revision, revisiones: getRevisionesCap() });
});
