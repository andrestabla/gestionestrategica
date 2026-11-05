import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { getMetas, upsertMeta, removeMeta, cerrarMeta, proponerCascada, flushOrError } from "@/server/store";

// GET  /api/td/cascada — metas trimestrales de la empresa (F04).
// POST /api/td/cascada — { op: "upsert", data } · { op: "delete", id } · { op: "cerrar", id, cumplimiento, aprendizaje } · { op: "proponer", year }.
export const GET = withTenant(async () => NextResponse.json({ metas: getMetas() }));

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.op) return NextResponse.json({ error: "Cuerpo inválido: falta op" }, { status: 400 });
  const r = body.op === "upsert" ? upsertMeta(user, body.data ?? {})
    : body.op === "delete" ? removeMeta(user, body.id)
    : body.op === "cerrar" ? cerrarMeta(user, body.id, { cumplimiento: body.cumplimiento, aprendizaje: body.aprendizaje })
    : body.op === "proponer" ? proponerCascada(user, body.year)
    : { ok: false as const, status: 400, error: "Operación desconocida." };
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true, ...("meta" in r ? { meta: r.meta } : {}), ...("creadas" in r ? { creadas: r.creadas } : {}), metas: getMetas() });
});
