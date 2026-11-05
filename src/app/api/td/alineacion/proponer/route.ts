import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf, horizonsOf, horizonLabel, horizonesBase } from "@/data/catalogo";
import { kpisOf } from "@/lib/convencion";
import { encargoPropuestaObjetivo, parsePropuestasObjetivo, sinCifrasDeMeta, tieneCifrasDeMeta } from "@/lib/alineacion";
import { contextoEmpresa } from "@/server/contexto-empresa";

// POST /api/td/alineacion/proponer { lever, horizon?, borrador? } — asistente de creación: tres objetivos directivos
// propuestos para la prioridad, con el contexto completo de la empresa. No guarda nada.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "El asistente de creación lo usa quien administra la estrategia (advisor o líder)." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const levers = leversOf(c.company);
  const p = levers.find((l) => l.id === String(body?.lever ?? "").toUpperCase());
  if (!p) return NextResponse.json({ error: "Elige primero la prioridad estratégica a la que se vincula el objetivo." }, { status: 422 });
  const horizon = String(body?.horizon ?? horizonsOf(c.company)[0]?.id ?? "");
  const sponsor = c.responsibles.find((r) => r.id === p.ownerId)?.dependencia;
  const baseIds = horizonesBase(c.company).map((h) => h.id);
  const { system, user: u } = encargoPropuestaObjetivo({
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size },
    horizonte: horizonLabel(c.company, horizon),
    prioridad: { id: p.id, order: p.order, name: p.name, indicator: p.indicator, desc: p.desc, sponsor },
    otrasPrioridades: levers.filter((l) => l.id !== p.id).map((l) => ({ id: l.id, name: l.name })),
    existentes: c.objectives.filter((o) => !o.okr && !baseIds.includes(o.horizon ?? "")).map((o) => ({ id: o.id, lever: o.lever, name: o.name, indicator: o.indicator })),
    borrador: String(body?.borrador ?? "").trim().slice(0, 400) || undefined,
    contexto: contextoEmpresa(),
    lineaBase: c.objectives.filter((o) => baseIds.includes(o.horizon ?? "") && o.lever === p.id).map((o) => `- ${o.name}: ${kpisOf(c, o).map((k) => { const last = k.series?.length ? k.series[k.series.length - 1] : null; return `${k.name}${last ? ` = ${last.value} ${k.unit}` : ""}${k.target ? ` (meta ${k.target})` : ""}`; }).join("; ") || "sin indicadores"}`).join("\n") || undefined,
    fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 3000, timeoutMs: 90_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  let propuestas = parsePropuestasObjetivo(raw);
  if (!propuestas.length) return NextResponse.json({ error: "El modelo no devolvió propuestas utilizables; inténtalo de nuevo." }, { status: 502 });
  // segunda pasada: si algún enunciado conserva cifras de meta, el modelo reescribe solo los enunciados sin cifras
  if (propuestas.some((p) => tieneCifrasDeMeta(p.name))) {
    try {
      const fix = await chatJson("Reescribe enunciados de objetivos directivos en español de Colombia. Conserva la intención, el verbo de logro, el indicador impulsor y el plazo; ELIMINA toda cifra de meta (porcentajes, cantidades, «al menos N»): el cuánto va en los resultados clave. Máximo 30 palabras por enunciado. Responde solo JSON {\"names\":[\"…\",\"…\",\"…\"]} en el mismo orden.", JSON.stringify({ names: propuestas.map((p) => p.name) }), { maxTokens: 800, timeoutMs: 40_000 }) as { names?: unknown };
      const names = Array.isArray(fix?.names) ? fix.names.map((x) => (typeof x === "string" ? sinCifrasDeMeta(x.trim().slice(0, 300)) : "")) : [];
      propuestas = propuestas.map((p, i) => (names[i] && names[i].length >= 10 ? { ...p, name: names[i] } : p));
    } catch { /* se entregan las propuestas saneadas por regla */ }
  }
  return NextResponse.json({ propuestas });
});
