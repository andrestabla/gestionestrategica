import { NextResponse } from "next/server";
import { huellaIniciativas } from "@/server/huellas";
import { withTenant } from "../../_helpers";
import { catalog, getAlineacion, saveAlineacion, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonsOf, horizonLabel } from "@/data/catalogo";
import { keyResultsOf } from "@/lib/convencion";
import { DIMS } from "@/data/mapa";
import { encargoValidacionIniciativas, parseValidacionIniciativas, type HechosIni, type ValidacionIni } from "@/lib/iniciativas-ia";
import { contextoEmpresa } from "@/server/contexto-empresa";
import { krsDeIniciativa, categoriaLabel } from "@/data/cmi";

// GET  /api/td/initiatives/validar?horizon=H1 — validación guardada de las iniciativas del horizonte.
// POST /api/td/initiatives/validar { horizon } — la genera con el modelo (quien administra el catálogo) y la guarda.
const KIND = "alineacion-ini";
const huella = huellaIniciativas;

export const GET = withTenant(async (req: Request) => {
  const horizon = new URL(req.url).searchParams.get("horizon") ?? horizonsOf(catalog().company)[0]?.id ?? "";
  const g = getAlineacion(horizon, KIND);
  return NextResponse.json({ horizon, validacion: g?.informe ?? null, at: g?.at ?? null, by: g?.by ?? null, desactualizado: !!g && g.inputHash !== huella(horizon), disponible: iaDisponible() });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog") || user.role === "DIRECTIVO") return NextResponse.json({ error: "La validación con IA la lanza el advisor o el líder de la empresa; el comité revisa el resultado." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const horizon = String(body?.horizon ?? horizonsOf(c.company)[0]?.id ?? "");
  const descartados = new Set(c.objectives.filter((o) => o.descartado).map((o) => o.id));
  const inis = c.initiatives.filter((i) => i.horizon === horizon && !descartados.has(i.cmi));
  if (!inis.length) return NextResponse.json({ error: `No hay iniciativas en ${horizonLabel(c.company, horizon)}.` }, { status: 422 });
  // revalidación de una sola iniciativa (tras guardarla): el modelo evalúa solo esa y el item se funde en la lectura guardada
  const soloId = typeof body?.id === "string" && inis.some((i) => i.id === body.id) ? String(body.id) : undefined;
  const Q = /^\d{4}-T[1-4]$/;
  const hechos: Record<string, HechosIni> = Object.fromEntries(inis.map((i) => [i.id, { plazo: Q.test(i.start ?? "") && Q.test(i.end ?? ""), kr: !!i.kpi || !!i.categoria, responsable: !!i.ownerId, capacidad: !!i.capability, recursos: (i.budgetPlanned ?? 0) > 0, logro: (i.objetivo ?? "").trim().length >= 15 }]));
  const objetivos = c.objectives.filter((o) => o.horizon === horizon && !o.okr && !o.descartado);
  const owner = (id?: string) => c.responsibles.find((r) => r.id === id)?.dependencia;
  const { system, user: u } = encargoValidacionIniciativas({
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size }, horizonte: horizonLabel(c.company, horizon),
    prioridades: leversOf(c.company).map((l) => ({ id: l.id, name: l.name, indicator: l.indicator })),
    objetivos: objetivos.map((o) => ({ id: o.id, lever: o.lever, name: o.name })),
    krs: objetivos.flatMap((o) => keyResultsOf(c, o).map((k) => ({ code: k.code, name: k.name, objective: o.id, baseline: k.baseline != null ? String(k.baseline) : undefined, target: k.target != null ? String(k.target) : undefined, unit: k.unit, due: k.due }))),
    iniciativas: inis.map((i) => ({ id: i.id, categoria: categoriaLabel(i.categoria), name: i.name, objetivo: i.objetivo, metaResultado: i.metaResultado, cmi: i.cmi, kpi: krsDeIniciativa(i).join(" + "), owner: owner(i.ownerId), start: i.start, end: i.end, capability: i.capability, capabilityName: DIMS.find((d) => d.code === i.capability)?.name, status: i.status, budget: i.budgetPlanned, moneda: i.budgetCurrency ?? c.company.currency ?? "COP", observaciones: i.observaciones })),
    contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }), soloId,
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: soloId ? 1500 : 9000, timeoutMs: soloId ? 60_000 : 150_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  let informe = parseValidacionIniciativas(raw, horizon, soloId ? [soloId] : inis.map((i) => i.id), hechos);
  if (soloId) {
    const previa = getAlineacion(horizon, KIND)?.informe as unknown as ValidacionIni | undefined;
    const items = (previa?.items ?? []).filter((x) => inis.some((i) => i.id === x.id) && x.id !== soloId);
    informe = { horizon, items: [...items, informe.items[0]].sort((a, b) => inis.findIndex((i) => i.id === a.id) - inis.findIndex((i) => i.id === b.id)), resumen: previa?.resumen ?? "" };
  }
  const r = saveAlineacion(user, horizon, huella(horizon), informe as unknown as Parameters<typeof saveAlineacion>[3], "openai", KIND);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ horizon, validacion: informe, at: r.saved.at, by: r.saved.by, desactualizado: false, disponible: true });
});
