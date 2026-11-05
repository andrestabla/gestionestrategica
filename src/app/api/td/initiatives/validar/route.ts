import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { withTenant } from "../../_helpers";
import { catalog, getAlineacion, saveAlineacion, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonsOf, horizonLabel } from "@/data/catalogo";
import { keyResultsOf } from "@/lib/convencion";
import { DIMS } from "@/data/mapa";
import { encargoValidacionIniciativas, parseValidacionIniciativas } from "@/lib/iniciativas-ia";
import { contextoEmpresa } from "@/server/contexto-empresa";

// GET  /api/td/initiatives/validar?horizon=H1 — validación guardada de las iniciativas del horizonte.
// POST /api/td/initiatives/validar { horizon } — la genera con el modelo (quien administra el catálogo) y la guarda.
const KIND = "alineacion-ini";
const huella = (horizon: string) => {
  const c = catalog();
  const inis = c.initiatives.filter((i) => i.horizon === horizon).map((i) => [i.id, i.name, i.objetivo ?? "", i.metaResultado ?? "", i.cmi, i.kpi ?? "", i.ownerId, i.start ?? "", i.end ?? "", i.capability ?? "", i.budgetPlanned ?? 0, i.observaciones ?? ""]);
  return createHash("sha256").update(JSON.stringify({ v: 2, inis })).digest("hex").slice(0, 24);
};

export const GET = withTenant(async (req: Request) => {
  const horizon = new URL(req.url).searchParams.get("horizon") ?? horizonsOf(catalog().company)[0]?.id ?? "";
  const g = getAlineacion(horizon, KIND);
  return NextResponse.json({ horizon, validacion: g?.informe ?? null, at: g?.at ?? null, by: g?.by ?? null, desactualizado: !!g && g.inputHash !== huella(horizon), disponible: iaDisponible() });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "La validación la lanza quien administra la estrategia (advisor o líder)." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const horizon = String(body?.horizon ?? horizonsOf(c.company)[0]?.id ?? "");
  const inis = c.initiatives.filter((i) => i.horizon === horizon);
  if (!inis.length) return NextResponse.json({ error: `No hay iniciativas en ${horizonLabel(c.company, horizon)}.` }, { status: 422 });
  const objetivos = c.objectives.filter((o) => o.horizon === horizon && !o.okr);
  const owner = (id?: string) => c.responsibles.find((r) => r.id === id)?.dependencia;
  const { system, user: u } = encargoValidacionIniciativas({
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size }, horizonte: horizonLabel(c.company, horizon),
    prioridades: leversOf(c.company).map((l) => ({ id: l.id, name: l.name, indicator: l.indicator })),
    objetivos: objetivos.map((o) => ({ id: o.id, lever: o.lever, name: o.name })),
    krs: objetivos.flatMap((o) => keyResultsOf(c, o).map((k) => ({ code: k.code, name: k.name, objective: o.id, baseline: k.baseline != null ? String(k.baseline) : undefined, target: k.target != null ? String(k.target) : undefined, unit: k.unit, due: k.due }))),
    iniciativas: inis.map((i) => ({ id: i.id, name: i.name, objetivo: i.objetivo, metaResultado: i.metaResultado, cmi: i.cmi, kpi: i.kpi, owner: owner(i.ownerId), start: i.start, end: i.end, capability: i.capability, capabilityName: DIMS.find((d) => d.code === i.capability)?.name, status: i.status, budget: i.budgetPlanned, observaciones: i.observaciones })),
    contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 9000, timeoutMs: 150_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const informe = parseValidacionIniciativas(raw, horizon, inis.map((i) => i.id));
  const r = saveAlineacion(user, horizon, huella(horizon), informe as unknown as Parameters<typeof saveAlineacion>[3], "openai", KIND);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ horizon, validacion: informe, at: r.saved.at, by: r.saved.by, desactualizado: false, disponible: true });
});
