import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { rank } from "@/lib/priorizacion";
import { horizonsOf } from "@/data/catalogo";
import { getEvaluations, getDecisions, consolidatedOf, evaluateInitiative, decideInitiative, setInitiativeHorizon, setPrioSession, catalog, flushOrError } from "@/server/store";

// GET /api/td/priorizacion[?id=] — evaluaciones de la matriz 4Shine, el
// consolidado por iniciativa, la decisión de tiempo y el orden del portafolio.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const id = new URL(req.url).searchParams.get("id");
  const ranking = rank(catalog().initiatives.map((i) => ({ id: i.id, horizon: i.horizon, line: i.line, name: i.name })), consolidatedOf, horizonsOf(catalog().company).map((h) => h.id));
  return NextResponse.json({
    me: user?.email.toLowerCase(),
    evaluations: getEvaluations(id ?? undefined),
    decisions: getDecisions(),
    ranking,
    sessions: catalog().company.prioSessions ?? {},
  });
});

// POST /api/td/priorizacion — { id, evaluation: { scores, type, notes } } para
// calificar, { id, decision, rationale } para decidir el tiempo, o
// { id, horizon } para mover la iniciativa al horizonte (p. ej. el sugerido), o
// { tribe, session: "abrir" | "cerrar" | "guardar" | "reabrir", order? } para que el
// líder maneje la calificación de su tribu en la convención.
// El store exige permisos (403) y las reglas de la matriz (422) con explicación.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  // cada registro se confirma cuando la base ya lo tiene: así lo ven las demás instancias en su siguiente petición
  const guardar = async () => { const e = await flushOrError(); return e ? NextResponse.json({ error: e }, { status: 500 }) : null; };
  if (body?.session) {
    const r = setPrioSession(user, body.tribe, body.session, body.order);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const bad = await guardar(); if (bad) return bad;
    return NextResponse.json({ session: r.session, sessions: catalog().company.prioSessions ?? {} });
  }
  if (!body?.id) return NextResponse.json({ error: "Cuerpo inválido: falta id" }, { status: 400 });
  const id = String(body.id).toLowerCase();
  if (body.evaluation) {
    const r = evaluateInitiative(user, id, body.evaluation);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const bad = await guardar(); if (bad) return bad;
    return NextResponse.json({ evaluation: r.evaluation, consolidated: r.consolidated });
  }
  if (body.decision) {
    const r = decideInitiative(user, id, { decision: body.decision, rationale: body.rationale });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const bad = await guardar(); if (bad) return bad;
    return NextResponse.json({ decision: r.decision, consolidated: consolidatedOf(id) });
  }
  if (body.horizon) {
    const r = setInitiativeHorizon(user, id, String(body.horizon));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const bad = await guardar(); if (bad) return bad;
    return NextResponse.json({ horizon: r.horizon });
  }
  return NextResponse.json({ error: "Nada que registrar: envía evaluation, decision u horizon." }, { status: 400 });
});
