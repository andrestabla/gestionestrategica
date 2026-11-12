import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { addGasto, removeGasto, getGastos, flushOrError } from "@/server/store";

// POST /api/td/proyectos/presupuesto — { op: "registrar", movimiento } anota un compromiso o una ejecución
// de presupuesto en un proyecto; { op: "eliminar", id } lo borra. Lo registra quien puede editar las tareas
// de ese proyecto (403); las reglas se validan con explicación (422). Devuelve el registro completo.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const r = body?.op === "registrar" ? addGasto(user, body.movimiento ?? {}) : body?.op === "eliminar" ? removeGasto(user, body.id) : { ok: false as const, status: 400, error: "Operación no reconocida." };
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const bad = await flushOrError(); if (bad) return NextResponse.json({ error: bad }, { status: 500 });
  return NextResponse.json({ ok: true, ...("gasto" in r ? { movimiento: r.gasto } : {}), gastos: getGastos() });
});
