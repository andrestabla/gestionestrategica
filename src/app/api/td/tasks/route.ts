import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import {
  getTasks, getAudit, getEvidenceStatus,
  getComments, getUploads, deviationDays, portfolioSlippage, getBaseline, tenantView, catalog } from "@/server/store";
import { taskAlerts, workload, portfolioTaskStats } from "@/lib/proyectos";
import { can } from "@/lib/permissions";

export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  // por tarea, si ESTE usuario puede editarla (la UI refleja lo que el servidor exige)
  const editable = Object.fromEntries(
    getTasks().map((t) => {
      const ini = catalog().initiatives.find((i) => i.id === t.iniId);
      return [t.id, can(user, "edit_tasks", ini ?? undefined)];
    }),
  );
  return NextResponse.json({
    tasks: getTasks(),
    people: catalog().people,
    alerts: taskAlerts(tenantView()),
    workload: workload(tenantView()),
    stats: portfolioTaskStats(tenantView()),
    audit: getAudit().slice(0, 20),
    editable,
    canVerifyEvidence: can(user, "verify_evidence"),
    evidenceStatus: Object.fromEntries(catalog().evidences.map((e) => [e.id, getEvidenceStatus(e.id)])),
    comments: getComments(),
    uploads: getUploads(),
    slippage: portfolioSlippage(),
    deviations: Object.fromEntries(getTasks().map((t) => [t.id, deviationDays(t)])),
    baselines: Object.fromEntries(getTasks().map((t) => [t.id, getBaseline(t.id)])),
  });
});

// POST /api/td/tasks — crea una tarea en una iniciativa. El store exige el
// permiso edit_tasks por línea (403) y valida título, descripción,
// responsable, fechas y dependencias (422 con explicación).
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { createTask } = await import("@/server/store");
  const result = createTask(user, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ task: result.task }, { status: 201 });
});
