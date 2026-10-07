import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import {
  tenantView, upsertResponsible, removeResponsible, upsertPerson, removePerson, upsertObjective, removeObjective,
  upsertKpi, removeKpi, upsertInitiative, removeInitiative, setFinancials, setTerritories,
} from "@/server/store";

// GET /api/td/catalogo — la vista completa de la empresa activa: catálogo
// (objetivos, KPI, iniciativas, personas, tareas, mediciones, evidencias,
// finanzas, territorio) más lo efectivo. La UI la carga una vez por sesión y
// la refresca tras cada mutación relevante.
export const GET = withTenant(async (_req: Request, _ctx: unknown, _user) => {
  return NextResponse.json(tenantView());
});

// POST /api/td/catalogo — editor del catálogo (manage_catalog):
// { entity: responsible|person|objective|kpi|initiative|financials|territories,
//   op: upsert|delete, data }. Devuelve la vista actualizada.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const entity = String(body?.entity ?? ""), op = String(body?.op ?? "upsert");
  const data = body?.data ?? {};
  let r: { ok: true } | { ok: false; status: number; error: string };
  switch (`${entity}:${op}`) {
    case "responsible:upsert": r = upsertResponsible(user, data); break;
    case "responsible:delete": r = removeResponsible(user, String(data.id ?? "")); break;
    case "person:upsert": r = upsertPerson(user, data); break;
    case "person:delete": r = removePerson(user, String(data.id ?? "")); break;
    case "objective:upsert": r = upsertObjective(user, data); break;
    case "objective:delete": r = removeObjective(user, String(data.id ?? "")); break;
    case "kpi:upsert": r = upsertKpi(user, data); break;
    case "kpi:delete": r = removeKpi(user, String(data.code ?? data.id ?? "").toUpperCase()); break;
    case "initiative:upsert": r = upsertInitiative(user, data); break;
    case "initiative:delete": r = removeInitiative(user, String(data.id ?? "")); break;
    case "financials:upsert": r = setFinancials(user, data === null ? null : data); break;
    case "territories:upsert": r = setTerritories(user, data); break;
    default: return NextResponse.json({ error: "Entidad u operación desconocida." }, { status: 400 });
  }
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ...r, view: tenantView() });
});
