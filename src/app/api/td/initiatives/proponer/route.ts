import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonsOf, horizonLabel } from "@/data/catalogo";
import { yearOfFirstHorizon } from "@/lib/vocabulario";
import { DIMS } from "@/data/mapa";
import { encargoPropuestaIniciativa, parsePropuestasIniciativa } from "@/lib/iniciativas-ia";
import { contextoEmpresa } from "@/server/contexto-empresa";

// POST /api/td/initiatives/proponer { kpi, horizon?, borrador? } — asistente de creación: tres iniciativas que mueven el
// resultado clave, con el contexto completo de la empresa. No guarda nada.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog") && !can(user, "create_initiatives")) return NextResponse.json({ error: "El asistente lo usa quien puede crear iniciativas." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const kr = c.kpis.find((k) => k.code === String(body?.kpi ?? "").toUpperCase());
  if (!kr) return NextResponse.json({ error: "Elige primero el resultado clave que la iniciativa debe mover." }, { status: 422 });
  const objetivo = c.objectives.find((o) => o.id === kr.cmi || o.kpis.includes(kr.code));
  if (!objetivo) return NextResponse.json({ error: "El resultado clave no pertenece a ningún objetivo." }, { status: 422 });
  const horizon = String(body?.horizon ?? objetivo.horizon ?? horizonsOf(c.company)[0]?.id ?? "");
  const hz = horizonsOf(c.company); const anio = Number(hz.find((h) => h.id === horizon)?.label.match(/\d{4}/)?.[0] ?? yearOfFirstHorizon(hz));
  const lever = leversOf(c.company).find((l) => l.id === objetivo.lever);
  const { system, user: u } = encargoPropuestaIniciativa({
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size }, horizonte: horizonLabel(c.company, horizon), anio,
    kr: { code: kr.code, name: kr.name, baseline: kr.baseline != null ? String(kr.baseline) : undefined, target: kr.target != null ? String(kr.target) : undefined, unit: kr.unit, due: kr.due, definition: kr.definition },
    objetivo: { id: objetivo.id, name: objetivo.name },
    prioridad: lever ? { id: lever.id, name: lever.name, indicator: lever.indicator, sponsor: c.responsibles.find((r) => r.id === lever.ownerId)?.dependencia } : undefined,
    existentes: c.initiatives.filter((i) => i.kpi === kr.code || i.cmi === objetivo.id).map((i) => ({ id: i.id, name: i.name, kpi: i.kpi, objetivo: i.objetivo })),
    dimensiones: DIMS.map((d) => ({ code: d.code, name: d.name })),
    borrador: String(body?.borrador ?? "").trim().slice(0, 300) || undefined,
    contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 3000, timeoutMs: 90_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const propuestas = parsePropuestasIniciativa(raw, DIMS.map((d) => d.code), anio);
  if (!propuestas.length) return NextResponse.json({ error: "El modelo no devolvió propuestas utilizables; inténtalo de nuevo." }, { status: 502 });
  return NextResponse.json({ propuestas });
});
