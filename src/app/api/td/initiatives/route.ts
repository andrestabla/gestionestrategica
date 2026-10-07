import { NextResponse } from "next/server";
import { guard } from "../_helpers";
import { getSession } from "@/lib/session";
import { responsible } from "@/data/cmi";
import { initiativeRisk } from "@/lib/logic";
import { effectiveInitiatives, updateInitiative, hydrateFromDb } from "@/server/store";

// GET /api/td/initiatives — iniciativas EFECTIVAS (seed + cambios de la
// plataforma) con responsable y riesgo recalculado.
export async function GET() {
  await hydrateFromDb();
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({
    initiatives: effectiveInitiatives().map((i) => ({
      ...i,
      owner: responsible(i.ownerId),
      risk: initiativeRisk(i),
    })),
  });
}

// POST /api/td/initiatives — actualiza una iniciativa: avance, estado,
// revisión de un factor, entrada de bitácora o próximo hito. El store exige
// permisos por línea (403) y reglas (422) con explicación.
export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Cuerpo inválido: falta id" }, { status: 400 });

  const { id, progress, status, factor, log, nextMilestone } = body;
  const result = updateInitiative(user, id, { progress, status, factor, log, nextMilestone });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    initiative: { ...result.initiative, risk: initiativeRisk(result.initiative) },
  });
}
