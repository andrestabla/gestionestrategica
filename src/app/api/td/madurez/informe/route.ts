import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { withTenant } from "../../_helpers";
import { catalog, getMadurez, getInforme, saveMadInforme, effectiveIntegration, flushOrError } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { instrumentOf } from "@/data/madurez";
import { encargoMadInforme, encargoMadLectura, parseMadInforme, parseMadLectura, citasDe, minimoInforme, minimoLectura, conDato, respuestasValidas, type MadInformeIA } from "@/lib/madurez-ia";
import { hechosSector, prioridadesEstrategicas, sectorCruce } from "@/server/madurez-sector";
import { contextoEmpresa } from "@/server/contexto-empresa";
import { sectorKeyDe, sectorOf } from "@/data/sector";
import type { SessionUser } from "@/lib/session";

// Análisis con IA de Madurez digital.
// GET  /api/td/madurez/informe?tipo=persona            — la lectura de la percepción de quien tiene la sesión.
// GET  /api/td/madurez/informe?tipo=empresa[&fuente=]  — el informe de resultados de una medición: un corte
//      publicado (lo lee cualquier persona de la empresa) o la captura en curso («curso», solo el advisor).
//      Devuelve el análisis guardado (si lo hay), si el modelo está disponible, si los datos cambiaron desde
//      entonces y si quien pregunta puede generarlo.
// POST (mismos parámetros) — genera el análisis con el modelo, lo guarda y lo devuelve. La lectura personal
//      la genera cada quien; el informe de resultados, el advisor. El informe se pide al modelo en dos
//      partes a la vez (diagnóstico interno; cruce con el sector, la estrategia y el plan) y se guarda
//      con los hechos del sector que cita. La respuesta del informe de empresa trae además las cifras
//      del sector para las gráficas.
export const maxDuration = 300;

const VERSION = 2;   // al cambiar el encargo, los análisis guardados se marcan desactualizados
const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);
const dia = (iso?: string | null) => (iso ? new Date(iso) : new Date()).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
const ROL: Record<string, string> = { DIRECTIVO: "directivo", LIDER: "líder", RESPONSABLE: "responsable de área", ADMIN: "administrador", CONSULTOR: "advisor" };

function entrada(user: SessionUser, url: URL) {
  const tipo = url.searchParams.get("tipo");
  if (tipo !== "persona" && tipo !== "empresa") return { error: "Indica tipo=persona o tipo=empresa.", status: 400 } as const;
  const m = getMadurez(user), ins = instrumentOf(m.kind), c = catalog().company;
  const empresa = { name: c.name, sector: c.sector?.trim() || sectorOf(sectorKeyDe(c))?.label || "" };
  if (tipo === "persona") {
    const validas = respuestasValidas(ins, m.mia.answers), min = minimoLectura(ins);
    return {
      kind: "madurez-persona" as const, subject: user.email.trim().toLowerCase(), puedeGenerar: !m.puede.calificar && validas >= min,
      falta: m.puede.calificar ? "La lectura personal es de quien responde el diagnóstico de percepción." : validas < min ? `La lectura se genera cuando hayas valorado al menos ${min} afirmaciones; llevas ${validas}.` : null,
      inputHash: hash({ a: m.mia.answers, k: m.kind, v: 1 }),
      encargo: () => encargoMadLectura({ empresa, ins, answers: m.mia.answers, persona: { nombre: user.name, rol: ROL[user.role] ?? "persona de la empresa" }, fecha: dia(m.mia.at) }),
    };
  }
  const ultimo = m.cuts[m.cuts.length - 1];
  const fuente = url.searchParams.get("fuente") || (ultimo ? ultimo.id : "curso");
  const corte = m.cuts.find((x) => x.id === fuente);
  if (!corte && fuente !== "curso") return { error: "Esa medición no existe.", status: 404 } as const;
  if (!corte && !m.puede.calificar) return { error: "Aún no hay una medición publicada. El informe aparece cuando el advisor publique el corte.", status: 404 } as const;
  const caps = corte ? corte.vars : m.vars, sg = corte ? corte.safeguards : m.safeguards;
  const previo = corte ? m.cuts[m.cuts.indexOf(corte) - 1] : ultimo;
  const n = conDato(ins, caps), min = minimoInforme(ins);
  return {
    kind: "madurez" as const, subject: fuente, puedeGenerar: m.puede.calificar && n >= min,
    falta: !m.puede.calificar ? "El informe lo genera el advisor." : n < min ? `El informe se genera cuando al menos ${min} variables tengan percepción o nivel; hay ${n}.` : null,
    inputHash: hash({ caps, sg, k: m.kind, p: previo?.id ?? null, v: VERSION }),
    encargo: () => { const hechos = hechosSector(); return { hechos, ...encargoMadInforme({ empresa, contexto: contextoEmpresa(), ins, caps, sg, participacion: m.participacion, previo: previo ? { etiqueta: previo.label, caps: previo.vars } : null,
      hechos: hechos.map((h) => ({ n: h.n, hecho: h.hecho, editor: h.editor, fecha: h.fecha, nota: h.nota })), prioridades: prioridadesEstrategicas(),
      medicion: { etiqueta: corte ? corte.label : "Captura en curso", fecha: dia(corte?.at), publicada: !!corte } }) }; },
  };
}

function respuesta(e: Exclude<ReturnType<typeof entrada>, { error: string }>) {
  const g = getInforme(e.kind, e.subject);
  return { disponible: iaDisponible(), informe: g?.informe ?? null, at: g?.at ?? null, model: g?.model ?? null, desactualizado: !!g && g.inputHash !== e.inputHash, fuente: e.subject, puedeGenerar: e.puedeGenerar, falta: e.falta,
    ...(e.kind === "madurez" ? { sector: sectorCruce() } : {}) };
}

export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const e = entrada(user, new URL(req.url));
  if ("error" in e) return NextResponse.json({ error: e.error }, { status: e.status });
  return NextResponse.json(respuesta(e));
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const e = entrada(user, new URL(req.url));
  if ("error" in e) return NextResponse.json({ error: e.error }, { status: e.status });
  if (!e.puedeGenerar) return NextResponse.json({ error: e.falta ?? "No es posible generar el análisis." }, { status: e.kind === "madurez" && e.falta === "El informe lo genera el advisor." ? 403 : 422 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  let contenido;
  try {
    if (e.kind === "madurez") {
      // dos partes en paralelo sobre los mismos datos; se guardan juntas, con los hechos del sector que citan
      const { system, diagnostico, cruce, hechos } = e.encargo();
      const [a, b] = await Promise.all([
        chatJson(system, diagnostico, { maxTokens: 7000, timeoutMs: 170_000 }),
        chatJson(system, cruce, { maxTokens: 7000, timeoutMs: 170_000 }),
      ]);
      const informe: MadInformeIA = parseMadInforme({ ...(a as object), ...(b as object) });
      const citados = new Set(citasDe(informe));
      informe.fuentes = hechos.filter((h) => citados.has(h.n));
      contenido = informe;
    } else {
      const { system, user: prompt } = e.encargo();
      contenido = parseMadLectura(await chatJson(system, prompt, { maxTokens: 2600, timeoutMs: 55_000 }));
    }
  } catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 502 }); }
  const r = saveMadInforme(user, e.kind, e.subject, e.inputHash, contenido, effectiveIntegration("openai")?.fields.model?.trim() || "gpt-4o-mini");
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const bad = await flushOrError(); if (bad) return NextResponse.json({ error: bad }, { status: 500 });
  return NextResponse.json(respuesta(e));
});
