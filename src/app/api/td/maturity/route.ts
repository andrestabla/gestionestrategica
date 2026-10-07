import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import {
  effectiveCurrent, effectivePrevious, effectiveAssessments,
  publishedAssessment, getCapture, captureProgress,
} from "@/server/store";

// GET /api/td/maturity — la medición vigente EFECTIVA (el corte publicado
// desde la plataforma manda sobre el seed) + estado de la captura A3.
export const GET = withTenant(async (_req: Request, _ctx: unknown, _user) => {

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
});
