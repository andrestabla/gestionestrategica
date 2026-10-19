import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { leversOf } from "@/data/catalogo";
import { keyResultsOf, okrChecks, initiativesOfKr } from "@/lib/convencion";
import { armarValidacion, parseValidacion, type KrDatos, type ValidacionOkr } from "@/lib/okr-sugerencias";
import { evidenciaPara, type Evidencia } from "@/data/conocimiento-sector";

// POST /api/td/okr/validar { objective } — el asistente revisa los resultados
// clave de un objetivo de tribu (resultado y no actividad, medible, base y meta,
// cobertura del objetivo) y propone correcciones y faltantes. Lo puede pedir
// cualquier miembro (la tribu valida en su celular); la respuesta se guarda unos
// minutos por objetivo y contenido, así 120 personas no repiten la misma llamada.
export const maxDuration = 60;

const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; value: ValidacionOkr & { fuentes: Evidencia[] } }>();
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

export const POST = withTenant(async (req: Request) => {
  if (!iaDisponible()) return NextResponse.json({ error: "OpenAI no está configurado en Administración → Integraciones." }, { status: 503 });
  const body = await req.json().catch(() => null);
  const cat = catalog();
  const o = cat.objectives.find((x) => x.id === String(body?.objective ?? "") && x.okr);
  if (!o) return NextResponse.json({ error: "Indica un objetivo de tribu registrado." }, { status: 422 });
  const lever = leversOf(cat.company).find((l) => l.id === o.lever);
  if (!lever) return NextResponse.json({ error: "El objetivo no tiene palanca." }, { status: 422 });
  const tribeName = cat.responsibles.find((r) => r.id === lever.ownerId)?.dependencia ?? "la tribu de la palanca";
  const owner = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "";
  const krs: KrDatos[] = keyResultsOf(cat, o).map((k) => ({ code: k.code, name: k.name, unit: k.unit, goodDirection: k.goodDirection, frequency: k.frequency, baseline: k.baseline, target: k.target, owner: owner(k.ownerId), due: k.due ?? "", definition: k.definition, formula: k.formula, initiatives: initiativesOfKr(cat, k.code).length }));
  if (!krs.length) return NextResponse.json({ error: "Este objetivo aún no tiene resultados clave que validar; créalos con «+ Resultado clave» o «Sugerir KR»." }, { status: 422 });
  const alertas = okrChecks(cat, o.horizon ?? "").filter((i) => i.ref === o.id || krs.some((k) => k.code === i.ref)).map((i) => i.text);
  const key = `${cat.company.slug}|${o.id}|${hash(JSON.stringify([o.name, o.desc, o.indicator, krs, alertas]))}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ ...hit.value, cached: true });
  const fuentes = evidenciaPara(cat.company, lever);   // base de conocimiento del sector y del país, numerada
  const { system, user: prompt } = armarValidacion(cat, lever, tribeName, { name: o.name, desc: o.desc, indicator: o.indicator }, krs, alertas, fuentes);
  try {
    const v = parseValidacion(await chatJson(system, prompt, { maxTokens: 2600 }), krs.map((k) => k.code), fuentes.length);
    if (!v) return NextResponse.json({ error: "El asistente no devolvió una revisión utilizable; inténtalo de nuevo." }, { status: 502 });
    if (cache.size > 300) for (const [k, x] of cache) if (Date.now() - x.at > TTL) cache.delete(k);
    const value = { ...v, fuentes };
    cache.set(key, { at: Date.now(), value });
    return NextResponse.json(value);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
});
