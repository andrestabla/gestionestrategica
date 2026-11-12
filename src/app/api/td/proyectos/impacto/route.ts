import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { tenantView, catalog, getRisks, getTasks, deviationDays, activityFeed } from "@/server/store";
import { impactoKr, movimientos } from "@/lib/impacto-kr";
import { hoyDe } from "@/data/proyectos";
import { can } from "@/lib/permissions";

// GET /api/td/proyectos/impacto — tablero de impacto de la ejecución en los resultados clave: pulso de cada
// proyecto (avance frente a lo esperado, confianza de entrega y sus factores), efecto sobre cada resultado
// clave que algún proyecto mueve, los riesgos registrados y los movimientos recientes con su efecto. La
// lectura se calcula a la fecha real (fija en la empresa de demostración).
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const v = tenantView(), c = catalog(), hoy = hoyDe(c.company), risks = getRisks();
  const desvios = Object.fromEntries(getTasks().map((t) => [t.id, deviationDays(t)]));
  const impacto = impactoKr(v, risks, hoy, desvios);
  const { events } = await activityFeed({ limit: 400 });
  const editable = Object.fromEntries(c.initiatives.map((i) => [i.id, can(user, "edit_tasks", i)]));
  return NextResponse.json({ ...impacto, movimientos: movimientos(events, v, risks, impacto.pesos).slice(0, 80), riesgos: risks, editable,
    personas: c.people.map((p) => ({ id: p.id, name: p.name, cargo: p.cargo })), responsables: Object.fromEntries(c.responsibles.map((r) => [r.id, r.dependencia || r.cargo])) });
});
