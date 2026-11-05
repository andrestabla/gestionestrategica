import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { withTenant } from "../_helpers";
import { catalog, getAlineacion, saveAlineacion, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonsOf, horizonLabel } from "@/data/catalogo";
import { keyResultsOf } from "@/lib/convencion";
import { encargoAlineacion, parseAlineacion } from "@/lib/alineacion";
import { contextoEmpresa } from "@/server/contexto-empresa";

// GET  /api/td/alineacion?horizon=H1 — validación de alineación guardada para el horizonte, y si está desactualizada.
// POST /api/td/alineacion { horizon } — la genera con el modelo (quien administra el catálogo) y la guarda.
const huella = (horizon: string) => {
  const c = catalog();
  const levers = leversOf(c.company).map((l) => [l.id, l.name, l.indicator ?? "", l.desc ?? ""]);
  const objs = c.objectives.filter((o) => o.horizon === horizon && !o.okr).map((o) => [o.id, o.lever ?? "", o.name, o.desc ?? "", o.indicator ?? "", o.pillar ?? ""]);
  return createHash("sha256").update(JSON.stringify({ v: 2, levers, objs })).digest("hex").slice(0, 24);
};

export const GET = withTenant(async (req: Request) => {
  const horizon = new URL(req.url).searchParams.get("horizon") ?? horizonsOf(catalog().company)[0]?.id ?? "";
  const g = getAlineacion(horizon);
  return NextResponse.json({ horizon, alineacion: g?.informe ?? null, at: g?.at ?? null, by: g?.by ?? null, desactualizado: !!g && g.inputHash !== huella(horizon), disponible: iaDisponible() });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "La validación la lanza quien administra la estrategia (advisor o líder)." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const horizon = String(body?.horizon ?? horizonsOf(c.company)[0]?.id ?? "");
  const objetivos = c.objectives.filter((o) => o.horizon === horizon && !o.okr);
  if (!objetivos.length) return NextResponse.json({ error: `No hay objetivos directivos en ${horizonLabel(c.company, horizon)}.` }, { status: 422 });
  const levers = leversOf(c.company);
  const sponsor = (id?: string) => c.responsibles.find((r) => r.id === id)?.dependencia;
  const { system, user: u } = encargoAlineacion({
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size },
    horizonte: horizonLabel(c.company, horizon),
    prioridades: levers.map((l) => ({ id: l.id, order: l.order, name: l.name, indicator: l.indicator, desc: l.desc, sponsor: sponsor(l.ownerId) })),
    objetivos: objetivos.map((o) => ({ id: o.id, lever: o.lever, name: o.name, desc: o.desc, indicator: o.indicator, pillar: o.pillar, perspective: o.perspective, krs: keyResultsOf(c, o).length, iniciativas: c.initiatives.filter((i) => i.cmi === o.id).map((i) => i.name) })),
    contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 6000, timeoutMs: 120_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const informe = parseAlineacion(raw, horizon, objetivos.map((o) => o.id));
  const r = saveAlineacion(user, horizon, huella(horizon), informe);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ horizon, alineacion: informe, at: r.saved.at, by: r.saved.by, desactualizado: false, disponible: true });
});
