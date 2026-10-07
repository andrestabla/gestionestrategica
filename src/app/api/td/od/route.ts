import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { platformResponses, publishedAssessment, captureProgress, getF2Responses } from "@/server/store";

// GET /api/td/od — las fuentes capturadas en la plataforma (corte en curso),
// para que el diagnóstico las consolide con el mismo motor que la demo.
// Las autoevaluaciones llevan el nombre de quien capturó solo para el advisor
// y el líder; los demás las reciben anonimizadas.
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const canNames = ["CONSULTOR", "LIDER", "ADMIN"].includes(user.role);
  const responses = platformResponses().map((r, i) =>
    r.tipo === "f1" && !canNames ? { ...r, meta: { nombre: `Directivo ${i + 1}` } } : r);
  return NextResponse.json({
    responses,
    published: Boolean(publishedAssessment()),
    progress: captureProgress(),
    f2: getF2Responses().length,
  });
}
