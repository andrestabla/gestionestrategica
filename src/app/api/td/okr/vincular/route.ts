import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { okrObjectivesOf, keyResultsOf } from "@/lib/convencion";
import { armarVinculo, parseVinculo, type CandidatoOkr } from "@/lib/okr-sugerencias";

// POST /api/td/okr/vincular { horizon, initiative: { name, objetivo? } } — el
// modelo sugiere a qué OKR de las tribus (objetivo y, si existe, resultado
// clave) se vincula la iniciativa. Para quien crea iniciativas.
export const maxDuration = 60;

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "create_initiatives") && !can(user, "manage_catalog")) return NextResponse.json({ error: "Solo quien crea iniciativas pide sugerencias de vínculo." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "OpenAI no está configurado en Administración → Integraciones." }, { status: 503 });
  const body = await req.json().catch(() => null);
  const cat = catalog();
  const horizon = String(body?.horizon ?? "");
  const ini = body?.initiative && typeof body.initiative === "object" ? body.initiative as Record<string, unknown> : null;
  const name = typeof ini?.name === "string" ? ini.name.trim().slice(0, 200) : "";
  if (name.length < 5) return NextResponse.json({ error: "Escribe primero el nombre de la iniciativa." }, { status: 422 });
  const candidatos: CandidatoOkr[] = okrObjectivesOf(cat, horizon).map((o) => ({ id: o.id, name: o.name, krs: keyResultsOf(cat, o).map((k) => ({ code: k.code, name: k.name })) }));
  if (!candidatos.length) return NextResponse.json({ error: "Aún no hay OKR de las tribus en este horizonte; créalos en la pestaña OKR." }, { status: 422 });
  const { system, user: prompt } = armarVinculo(cat, { name, objetivo: typeof ini?.objetivo === "string" ? ini.objetivo.trim().slice(0, 600) : "" }, candidatos);
  try {
    const v = parseVinculo(await chatJson(system, prompt, { maxTokens: 300 }), candidatos);
    if (!v) return NextResponse.json({ error: "El modelo no devolvió un vínculo utilizable; inténtalo de nuevo." }, { status: 502 });
    return NextResponse.json(v);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
});
