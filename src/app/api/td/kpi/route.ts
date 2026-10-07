import { NextResponse } from "next/server";
import { guard } from "../_helpers";
import { getSession } from "@/lib/session";
import { responsible } from "@/data/cmi";
import { kpiHealth } from "@/lib/logic";
import { effectiveKpis, reportKpi, getKpiReports, hydrateFromDb } from "@/server/store";

// GET /api/td/kpi — indicadores con la serie EFECTIVA (seed + valores
// reportados desde la plataforma) y su salud recalculada.
export async function GET() {
  await hydrateFromDb();
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({
    kpis: effectiveKpis().map((k) => ({
      ...k,
      owner: responsible(k.ownerId),
      health: kpiHealth(k),
      reportedPeriods: getKpiReports(k.code).map((r) => r.period),
    })),
  });
}

// POST /api/td/kpi — reporta el valor de un periodo. El store exige el
// permiso report_kpi por línea (403) y valida periodo/valor (422).
export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.code) return NextResponse.json({ error: "Cuerpo inválido: falta code" }, { status: 400 });

  const result = reportKpi(user, body.code, body.period, body.value, body.note);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ report: result.report, series: result.series });
}
