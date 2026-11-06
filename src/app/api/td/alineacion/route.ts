import { NextResponse } from "next/server";
import { huellaAlineacion } from "@/server/huellas";
import { withTenant } from "../_helpers";
import { catalog, getAlineacion, saveAlineacion, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonsOf, horizonLabel, horizonesBase } from "@/data/catalogo";
import { keyResultsOf, kpisOf } from "@/lib/convencion";
import { encargoAlineacion, parseAlineacion } from "@/lib/alineacion";
import { contextoEmpresa } from "@/server/contexto-empresa";

// GET  /api/td/alineacion?horizon=H1 — validación de alineación guardada para el horizonte, y si está desactualizada.
// POST /api/td/alineacion { horizon } — la genera con el modelo (quien administra el catálogo) y la guarda.
const huella = huellaAlineacion;

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
  const soloId = typeof body?.id === "string" && objetivos.some((o) => o.id === body.id) ? String(body.id) : undefined;
  const levers = leversOf(c.company);
  const sponsor = (id?: string) => c.responsibles.find((r) => r.id === id)?.dependencia;
  const argsBase = {
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size },
    horizonte: horizonLabel(c.company, horizon),
    prioridades: levers.map((l) => ({ id: l.id, order: l.order, name: l.name, indicator: l.indicator, desc: l.desc, sponsor: sponsor(l.ownerId), propuesta: l.propuesta })),
    objetivos: objetivos.map((o) => ({ id: o.id, lever: o.lever, name: o.name, desc: o.desc, indicator: o.indicator, pillar: o.pillar, perspective: o.perspective, krs: keyResultsOf(c, o).length, krNombres: keyResultsOf(c, o).map((k) => k.name), iniciativas: c.initiatives.filter((i) => i.cmi === o.id).map((i) => i.name) })),
    lineaBase: horizonesBase(c.company).flatMap((h) => c.objectives.filter((o) => o.horizon === h.id).map((o) => `- ${o.lever ?? ""} · ${o.name}: ${kpisOf(c, o).map((k) => { const last = k.series?.length ? k.series[k.series.length - 1] : null; return `${k.name}${last ? ` = ${last.value} ${k.unit}` : ""}${k.target ? ` (meta ${k.target})` : ""}`; }).join("; ") || "sin indicadores"}`)).join("\n") || undefined,
    contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }), soloId,
  };
  const { system, user: u } = encargoAlineacion(argsBase);
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: soloId ? 1500 : 14000, timeoutMs: soloId ? 60_000 : 170_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const nombres = Object.fromEntries(objetivos.map((o) => [o.id, o.name]));
  let informe = parseAlineacion(raw, horizon, soloId ? [soloId] : objetivos.map((o) => o.id), nombres);
  // si el modelo omitió objetivos (respuesta corta o cortada), se piden en una segunda pasada solo esos ids
  if (!soloId) {
    const faltantes = informe.items.filter((x) => /no devolvió lectura/.test(x.justificacion)).map((x) => x.id);
    if (faltantes.length && faltantes.length < objetivos.length) {
      const enc2 = encargoAlineacion({ ...argsBase, soloIds: faltantes });
      try {
        const raw2 = await chatJson(enc2.system, enc2.user, { maxTokens: 9000, timeoutMs: 150_000 });
        const parcial = parseAlineacion(raw2, horizon, faltantes, nombres);
        informe = { ...informe, items: informe.items.map((x) => (faltantes.includes(x.id) ? (parcial.items.find((p) => p.id === x.id) ?? x) : x)) };
      } catch { /* se deja la anotación de volver a validar en los que faltaron */ }
    }
  }
  if (soloId) {
    const previa = getAlineacion(horizon)?.informe;
    const items = (previa?.items ?? []).filter((x) => objetivos.some((o) => o.id === x.id) && x.id !== soloId);
    informe = { horizon, items: [...items, informe.items[0]].sort((a, b) => objetivos.findIndex((o) => o.id === a.id) - objetivos.findIndex((o) => o.id === b.id)), resumen: previa?.resumen ?? "" };
  }
  const r = saveAlineacion(user, horizon, huella(horizon), informe);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ horizon, alineacion: informe, at: r.saved.at, by: r.saved.by, desactualizado: false, disponible: true });
});
