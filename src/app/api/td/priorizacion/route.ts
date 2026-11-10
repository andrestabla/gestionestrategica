import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { rank } from "@/lib/priorizacion";
import { horizonsOf } from "@/data/catalogo";
import { getEvaluations, getDecisions, consolidatedOf, evaluateInitiative, decideInitiative, setInitiativeHorizon, setPrioSession, resetPrioSession, catalog, flushOrError, removeEvaluation, clearDecision, calificables } from "@/server/store";
import { pasaAPriorizacion } from "@/lib/convencion";

// GET /api/td/priorizacion[?id=] — evaluaciones de la matriz de priorización, el
// consolidado por iniciativa, la decisión de tiempo y el orden del portafolio.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const id = new URL(req.url).searchParams.get("id");
  // en el acompañamiento solo entran al ranking las iniciativas vinculadas a un resultado clave
  const ranking = rank(catalog().initiatives.filter((i) => pasaAPriorizacion(catalog(), i)).map((i) => ({ id: i.id, horizon: i.horizon, line: i.line, name: i.name })), consolidatedOf, horizonsOf(catalog().company).map((h) => h.id));
  return NextResponse.json({
    me: user?.email.toLowerCase(),
    evaluations: getEvaluations(id ?? undefined),
    decisions: getDecisions(),
    ranking,
    sessions: catalog().company.prioSessions ?? {},
    calificables: calificables(),
  });
});

// POST /api/td/priorizacion — { id, evaluation: { scores, type, notes } } para
// calificar, { id, decision, rationale } para decidir el tiempo, o
// { id, horizon } para mover la iniciativa al horizonte (p. ej. el sugerido), o
// { tribe, session: "abrir" | "cerrar" | "guardar" | "reabrir", order? } para que el
// líder maneje la calificación de su tribu en la convención, o { tribe, session: "reiniciar" }
// para que el advisor o el admin borren las calificaciones de la tribu y dejen la sesión sin abrir.
// El store exige permisos (403) y las reglas de la matriz (422) con explicación.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  // cada registro se confirma cuando la base ya lo tiene: así lo ven las demás instancias en su siguiente petición
  const guardar = async () => { const e = await flushOrError(); return e ? NextResponse.json({ error: e }, { status: 500 }) : null; };
  if (body?.session === "reiniciar") {
    const r = resetPrioSession(user, body.tribe);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const bad = await guardar(); if (bad) return bad;
    return NextResponse.json({ removed: r.removed, sessions: catalog().company.prioSessions ?? {} });
  }
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

// DELETE /api/td/priorizacion — el administrador deshace: { id, by } borra la evaluación de esa persona;
// { id, decision: true } deja la iniciativa sin decisión de tiempo.
export const DELETE = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Cuerpo inválido: falta id" }, { status: 400 });
  const r = body.decision ? clearDecision(user, body.id) : removeEvaluation(user, body.id, body.by);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true, ...("consolidated" in r ? { consolidated: r.consolidated } : {}) });
});
