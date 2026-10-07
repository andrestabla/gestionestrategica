import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { INITIATIVES_FULL } from "@/data/cmi";
import { rank } from "@/lib/priorizacion";
import { getEvaluations, getDecisions, consolidatedOf, evaluateInitiative, decideInitiative } from "@/server/store";

// GET /api/td/priorizacion[?id=] — evaluaciones de la matriz 4Shine, el
// consolidado por iniciativa, la decisión de tiempo y el orden del portafolio.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const id = new URL(req.url).searchParams.get("id");
  const ranking = rank(INITIATIVES_FULL.map((i) => ({ id: i.id, horizon: i.horizon, line: i.line, name: i.name })), consolidatedOf);
  return NextResponse.json({
    me: user?.email.toLowerCase(),
    evaluations: getEvaluations(id ?? undefined),
    decisions: getDecisions(),
    ranking,
  });
});

// POST /api/td/priorizacion — { id, evaluation: { scores, type, notes } } para
// calificar, o { id, decision, rationale } para decidir el tiempo. El store
// exige permisos (403) y las reglas de la matriz (422) con explicación.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Cuerpo inválido: falta id" }, { status: 400 });
  const id = String(body.id).toLowerCase();
  if (body.evaluation) {
    const r = evaluateInitiative(user, id, body.evaluation);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ evaluation: r.evaluation, consolidated: r.consolidated });
  }
  if (body.decision) {
    const r = decideInitiative(user, id, { decision: body.decision, rationale: body.rationale });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ decision: r.decision, consolidated: consolidatedOf(id) });
  }
  return NextResponse.json({ error: "Nada que registrar: envía evaluation o decision." }, { status: 400 });
});
