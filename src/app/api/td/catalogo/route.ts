import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { tenantView } from "@/server/store";

// GET /api/td/catalogo — la vista completa de la empresa activa: catálogo
// (objetivos, KPI, iniciativas, personas, tareas, mediciones, evidencias,
// finanzas, territorio) más lo efectivo. La UI la carga una vez por sesión y
// la refresca tras cada mutación relevante.
export const GET = withTenant(async (_req: Request, _ctx: unknown, _user) => {
  return NextResponse.json(tenantView());
});
