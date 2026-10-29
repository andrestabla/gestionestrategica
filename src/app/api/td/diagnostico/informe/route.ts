import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { withTenant } from "../../_helpers";
import { catalog, getF1Responses, F1_CAN_SEE_ALL, platformResponses, getInforme, saveInforme, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";
import { consolidate, recommend, sdev } from "@/lib/od";
import { lecturaF1 } from "@/lib/f1";
import { encargoF1, encargoConsolidado, parseInforme, type InformeKind } from "@/lib/informe-ia";
import { leversOf } from "@/data/catalogo";
import { DIMS } from "@/data/mapa";
import { informeToken } from "@/lib/public-token";

// GET  /api/td/diagnostico/informe?kind=f1|consolidado[&email=] — el análisis guardado (si lo hay), si el
//      modelo está disponible, si hay respuestas nuevas desde entonces y, para admin y advisor, el enlace para
//      compartir el consolidado. La lectura individual es de cada quien; el consolidado, de admin y advisor.
// POST (mismos parámetros) — genera el análisis con el modelo, lo guarda y lo devuelve.
export const maxDuration = 60;

const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);
const hoy = () => new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function entrada(user: { email: string; role: string }, url: URL) {
  const kind = url.searchParams.get("kind") as InformeKind | null;
  if (kind !== "f1" && kind !== "consolidado") return { error: "Indica kind=f1 o kind=consolidado.", status: 400 } as const;
  const cat = catalog();
  const empresa = { name: cat.company.name, sector: cat.company.sector, levers: leversOf(cat.company).map((l) => ({ name: l.name, desc: l.desc })), mode: cat.company.mode };
  if (kind === "f1") {
    const pedido = url.searchParams.get("email")?.toLowerCase();
    const subject = pedido && F1_CAN_SEE_ALL(user as never) ? pedido : user.email.toLowerCase();
    if (!can(user as never, "answer_f1") && !F1_CAN_SEE_ALL(user as never)) return { error: "Tu rol no accede a la autoevaluación.", status: 403 } as const;
    const resp = getF1Responses(user as never).find((f) => f.email.toLowerCase() === subject);
    if (!resp) return { error: pedido ? "Esa persona no ha respondido la autoevaluación." : "Responde la autoevaluación antes de pedir el análisis.", status: 404 } as const;
    const lectura = lecturaF1(resp.r);
    return { kind, subject, inputHash: hash({ r: resp.r, cargo: resp.cargo }), encargo: () => encargoF1({ empresa, persona: { nombre: resp.name, cargo: resp.cargo }, lectura, fecha: new Date(resp.at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) }), share: false } as const;
  }
  if (!can(user as never, "view_f1_all")) return { error: "El consolidado lo ven el administrador y el advisor.", status: 403 } as const;
  const all = getF1Responses(user as never);
  if (!all.length) return { error: "Aún no hay autoevaluaciones para consolidar.", status: 404 } as const;
  const C = consolidate(platformResponses());
  const lecturas = all.map((f) => lecturaF1(f.r));
  const dispersion = DIMS.map((d, i) => ({ code: d.code, name: d.name, sd: sdev(lecturas.map((L) => L.dims[i].m).filter((m): m is number => m != null)) }));
  return { kind, subject: "consolidado", inputHash: hash(all.map((f) => [f.email, f.r])), encargo: () => encargoConsolidado({ empresa, C, rec: recommend(C), n: all.length, dispersion, fecha: hoy() }), share: true } as const;
}

function respuesta(e: Exclude<ReturnType<typeof entrada>, { error: string }>, origin: string) {
  const g = getInforme(e.kind, e.subject);
  return {
    disponible: iaDisponible(),
    informe: g?.informe ?? null, at: g?.at ?? null, by: g?.by ?? null, model: g?.model ?? null,
    desactualizado: !!g && g.inputHash !== e.inputHash,
    sujeto: e.subject,
    shareUrl: e.share ? `${origin}/r/${catalog().company.slug}-${informeToken(catalog().company.slug)}` : null,
  };
}

export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const e = entrada(user, new URL(req.url));
  if ("error" in e) return NextResponse.json({ error: e.error }, { status: e.status });
  return NextResponse.json(respuesta(e, new URL(req.url).origin));
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const e = entrada(user, new URL(req.url));
  if ("error" in e) return NextResponse.json({ error: e.error }, { status: e.status });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const { system, user: prompt } = e.encargo();
  let informe;
  try { informe = parseInforme(await chatJson(system, prompt, { maxTokens: 3200, timeoutMs: 55_000 })); }
  catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 502 }); }
  const r = saveInforme(user, e.kind, e.subject, e.inputHash, informe);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const bad = await flushOrError(); if (bad) return NextResponse.json({ error: bad }, { status: 500 });
  return NextResponse.json(respuesta(e, new URL(req.url).origin));
});
