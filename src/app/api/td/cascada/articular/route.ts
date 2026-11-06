import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog, getRevisionesCap, getChecklistsCap, saveArticulacion, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf } from "@/data/catalogo";
import { contextoEmpresa } from "@/server/contexto-empresa";
import { encargoArticulacion, parseArticulacion } from "@/lib/cascada-ia";
import { lecturaCapacidades, FRENTES } from "@/lib/capacidades";

// POST /api/td/cascada/articular { iniId } — el advisor (o el líder) pide al modelo la articulación de una iniciativa
// entre áreas (quién lidera, quién contribuye, qué hace cada una) y se guarda; después se edita a mano.
export const maxDuration = 90;
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "La articulación con IA la pide el advisor o el líder." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const c = catalog();
  const i = c.initiatives.find((x) => x.id === String(body?.iniId ?? ""));
  if (!i) return NextResponse.json({ error: "La iniciativa no existe." }, { status: 404 });
  const kr = c.kpis.find((k) => k.code === i.kpi); const objetivo = c.objectives.find((o) => o.id === i.cmi); const lever = leversOf(c.company).find((l) => l.id === objetivo?.lever);
  const rev = getRevisionesCap()[i.id];
  const lect = rev ? lecturaCapacidades(rev, getChecklistsCap()[i.id]?.frentes ?? FRENTES) : null;
  const capacidades = lect ? `${lect.semaforo ?? ""}; ${lect.brechas.map((b) => `${b.name} nivel ${b.nivel}${b.falta ? ` (falta: ${b.falta})` : ""}`).join("; ")}${rev?.notas ? `; notas: ${rev.notas}` : ""}` : undefined;
  const { system, user: u } = encargoArticulacion({
    empresa: { name: c.company.name, sector: c.company.sector, size: c.company.size },
    ini: { id: i.id, name: i.name, objetivo: i.objetivo, metaResultado: i.metaResultado, start: i.start, end: i.end, owner: c.responsibles.find((r) => r.id === i.ownerId)?.dependencia, ownerId: i.ownerId, observaciones: i.observaciones },
    kr: kr ? { code: kr.code, name: kr.name } : undefined, objetivo: objetivo ? { id: objetivo.id, name: objetivo.name } : undefined, prioridad: lever ? { name: lever.name } : undefined,
    areas: c.responsibles.map((r) => ({ id: r.id, nombre: r.dependencia, cargo: r.cargo, personas: c.people.filter((p) => p.responsibleId === r.id).map((p) => `${p.name} (${p.cargo})`).slice(0, 6) })),
    capacidades, contexto: contextoEmpresa(), fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
  });
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 2500, timeoutMs: 85_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const art = parseArticulacion(raw, i.id, user.email, c.responsibles.map((r) => r.id));
  if (!art) return NextResponse.json({ error: "El modelo no devolvió una articulación utilizable; inténtalo de nuevo." }, { status: 502 });
  const r = saveArticulacion(user, i.id, { areas: art.areas });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true, articulacion: r.articulacion });
});
