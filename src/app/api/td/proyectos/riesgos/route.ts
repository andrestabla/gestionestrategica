import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { upsertRisk, removeRisk, getRisks, flushOrError } from "@/server/store";

// POST /api/td/proyectos/riesgos — { op: "guardar", riesgo } crea o actualiza un riesgo del proyecto;
// { op: "eliminar", id } lo borra. Lo edita quien puede editar las tareas de ese proyecto (403); las
// reglas del riesgo se validan con explicación (422). Devuelve el registro completo.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const r = body?.op === "guardar" ? upsertRisk(user, body.riesgo ?? {}) : body?.op === "eliminar" ? removeRisk(user, body.id) : { ok: false as const, status: 400, error: "Operación no reconocida." };
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const bad = await flushOrError(); if (bad) return NextResponse.json({ error: bad }, { status: 500 });
  return NextResponse.json({ ok: true, ...("risk" in r ? { riesgo: r.risk } : {}), riesgos: getRisks() });
});
