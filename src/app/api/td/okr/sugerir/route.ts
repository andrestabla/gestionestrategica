import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf } from "@/data/catalogo";
import { armarEncargo, parseSugerencias } from "@/lib/okr-sugerencias";

// GET /api/td/okr/sugerir — si hay modelo configurado. POST { lever, tribe?, objective? }:
// con `objective` (el que escribió la tribu) devuelve una propuesta con sus 3
// resultados clave; sin él, dos OKR completos para la palanca y su tribu.
// Se apoya en los objetivos directivos y en la biblioteca de plantillas. Solo quien edita OKR.
// el modelo puede tardar más de los 10 s por defecto de la función
export const maxDuration = 60;

export const GET = withTenant(async () => NextResponse.json({ disponible: iaDisponible() }));

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_catalog")) return NextResponse.json({ error: "Solo el líder de tribu (o el advisor) pide sugerencias de OKR." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "OpenAI no está configurado en Administración → Integraciones." }, { status: 503 });
  const body = await req.json().catch(() => null);
  const cat = catalog();
  const lever = leversOf(cat.company).find((l) => l.id === String(body?.lever ?? ""));
  if (!lever) return NextResponse.json({ error: "Indica la palanca." }, { status: 422 });
  const tribeId = String(body?.tribe ?? lever.ownerId ?? "");
  const tribeName = cat.responsibles.find((r) => r.id === tribeId)?.dependencia ?? "la tribu de la palanca";
  const leverOf = (oe: string) => cat.objectives.find((o) => o.id === oe)?.lever;
  const templates = (cat.company.krTemplates ?? []).filter((t) => leverOf(t.oe) === lever.id);
  const o = body?.objective && typeof body.objective === "object" ? body.objective as Record<string, unknown> : null;
  const objective = o && typeof o.name === "string" && o.name.trim().length >= 5
    ? { name: o.name.trim().slice(0, 200), desc: typeof o.desc === "string" ? o.desc.trim().slice(0, 600) : "", indicator: typeof o.indicator === "string" ? o.indicator.trim().slice(0, 200) : "" }
    : undefined;
  const { system, user: prompt } = armarEncargo(cat, lever, tribeName, templates, objective);
  try {
    const propuestas = parseSugerencias(await chatJson(system, prompt));
    if (!propuestas.length) return NextResponse.json({ error: "El modelo no devolvió propuestas utilizables; inténtalo de nuevo." }, { status: 502 });
    return NextResponse.json({ propuestas, lever: lever.id, tribe: tribeId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
});
