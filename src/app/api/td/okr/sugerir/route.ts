import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { leversOf } from "@/data/catalogo";
import { armarEncargo, parseSugerencias } from "@/lib/okr-sugerencias";

// GET /api/td/okr/sugerir — si hay modelo configurado. POST { lever, tribe? } —
// dos OKR sugeridos (objetivo + 3 KR) para una palanca y su tribu, derivados de
// los objetivos directivos y de la biblioteca de plantillas. Solo quien edita OKR.
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
  const { system, user: prompt } = armarEncargo(cat, lever, tribeName, templates);
  try {
    const propuestas = parseSugerencias(await chatJson(system, prompt));
    if (!propuestas.length) return NextResponse.json({ error: "El modelo no devolvió propuestas utilizables; inténtalo de nuevo." }, { status: 502 });
    return NextResponse.json({ propuestas, lever: lever.id, tribe: tribeId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
});
