import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { platformResponses, publishedAssessment, captureProgress, getF2Responses } from "@/server/store";

// GET /api/td/od — las fuentes capturadas en la plataforma (corte en curso),
// para que el diagnóstico las consolide con el mismo motor que la demo.
// Las respuestas individuales llevan nombre solo para el advisor, el líder y el administrador. Los demás roles
// reciben lo que hace falta para consolidar y nada que identifique a otra persona: las autoevaluaciones sin nombre
// ni cargo, la percepción de equipos sin sus respuestas abiertas y, del test, únicamente el propio.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const canNames = ["CONSULTOR", "LIDER", "ADMIN"].includes(user.role);
  const yo = user.email.toLowerCase();
  const responses = canNames ? platformResponses() : platformResponses({ conCorreo: true }).flatMap((r, i) => {
    const { email, ...resto } = r as typeof r & { email?: string };
    if (r.tipo === "f1") return [{ ...resto, meta: { nombre: `Directivo ${i + 1}` } }];
    if (r.tipo === "f2") return [{ ...resto, n: {} }];
    if (r.tipo === "test") return email?.toLowerCase() === yo ? [resto] : [];
    return [resto];
  });
  return NextResponse.json({
    responses,
    published: Boolean(publishedAssessment()),
    progress: captureProgress(),
    f2: getF2Responses().length,
  });
});
