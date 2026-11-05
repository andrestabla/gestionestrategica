import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonesBase, horizonLabel } from "@/data/catalogo";
import { kpisOf } from "@/lib/convencion";
import { encargoLineaBase, parseLineaBase, SIN_LINEA_BASE, type IndicadorBase } from "@/lib/kr-ia";
import { contextoEmpresa } from "@/server/contexto-empresa";

// POST /api/td/okr/linea-base { cmi, kr: { code, name, unit, definition, goodDirection } } — asistente de línea base y
// meta: busca el indicador equivalente entre los resultados cerrados cargados (horizontes de línea base) y propone
// base y meta. Sin información de base responde sinBase=true con el aviso para la persona. No guarda nada.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "El asistente lo usa quien administra la estrategia." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const obj = c.objectives.find((o) => o.id === String(body?.cmi ?? ""));
  if (!obj) return NextResponse.json({ error: "El objetivo del resultado clave no existe." }, { status: 422 });
  const kr = { code: String(body?.kr?.code ?? "").toUpperCase().slice(0, 20), name: String(body?.kr?.name ?? "").trim().slice(0, 200), unit: String(body?.kr?.unit ?? "").slice(0, 30), definition: String(body?.kr?.definition ?? "").slice(0, 600), goodDirection: String(body?.kr?.goodDirection ?? "up") };
  if (kr.name.length < 3) return NextResponse.json({ error: "Escribe primero el nombre del resultado clave." }, { status: 422 });
  const baseIds = horizonesBase(c.company).map((h) => h.id);
  const baseObjs = c.objectives.filter((o) => baseIds.includes(o.horizon ?? ""));
  const base: IndicadorBase[] = baseObjs.flatMap((o) => kpisOf(c, o).map((k) => { const last = k.series?.length ? k.series[k.series.length - 1] : null; return { code: k.code, name: k.name, unit: k.unit, ultimo: last?.value ?? (k.baseline > 0 ? k.baseline : undefined), periodo: last?.period, meta: k.target > 0 ? k.target : undefined, definition: k.definition, lever: o.lever }; }));
  if (!base.length) return NextResponse.json({ sinBase: true, mensaje: SIN_LINEA_BASE });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const lever = leversOf(c.company).find((l) => l.id === obj.lever);
  const { system, user: u } = encargoLineaBase({
    empresa: { name: c.company.name, sector: c.company.sector }, horizonte: horizonLabel(c.company, obj.horizon ?? ""),
    kr, objetivo: { id: obj.id, name: obj.name, lever: obj.lever }, prioridad: lever ? { id: lever.id, name: lever.name, indicator: lever.indicator } : undefined,
    base: [...base.filter((b) => b.lever === obj.lever), ...base.filter((b) => b.lever !== obj.lever)],
    contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 800, timeoutMs: 60_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const p = parseLineaBase(raw, base.map((b) => b.code));
  if (!p.encontrado) return NextResponse.json({ sinBase: true, mensaje: SIN_LINEA_BASE, justificacion: p.justificacion });
  const ind = base.find((b) => b.code === p.indicador);
  return NextResponse.json({ sinBase: false, propuesta: p, indicador: ind ? { code: ind.code, name: ind.name, unit: ind.unit, ultimo: ind.ultimo, periodo: ind.periodo, meta: ind.meta } : null });
});
