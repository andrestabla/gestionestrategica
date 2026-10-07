import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  effectiveCurrent, effectivePrevious, effectiveAssessments,
  publishedAssessment, getCapture, captureProgress,
  hydrateFromDb,
} from "@/server/store";

// GET /api/td/maturity — la medición vigente EFECTIVA (el corte publicado
// desde la plataforma manda sobre el seed) + estado de la captura A3.
export async function GET() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const current = effectiveCurrent();
  const previous = effectivePrevious();
  return NextResponse.json({
    assessments: effectiveAssessments(),
    current: { id: current.id, label: current.label, period: current.period, scores: current.scores },
    previous: previous
      ? { id: previous.id, label: previous.label, period: previous.period, scores: previous.scores }
      : null,
    published: Boolean(publishedAssessment()),
    capture: { vars: getCapture(), progress: captureProgress() },
  });
}
