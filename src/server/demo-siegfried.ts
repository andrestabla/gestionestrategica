// Construye la instancia demo «TEST SIEGFRIED» con todo el recorrido del método hecho: catálogo real de
// Siegfried (prioridades, responsables, resultados 2026) más la capa demo (objetivos 2027, resultados clave,
// iniciativas completas, validaciones en verde, calificaciones de tres evaluadores, decisiones de tiempo,
// capacidades para ejecutar y cascada trimestral) y diez autoevaluaciones directivas. Pasa por las mismas
// funciones del store que usa la plataforma, así el resultado es exactamente lo que vería un advisor.

import base from "@/data/demo-siegfried/base.json";
import { DEMO_SLUG, DEMO_NAME, OBJETIVOS_EXTRA, INDICADORES_FALTANTES, KRS, INICIATIVAS, JUSTIFICACION_OBJETIVO, JUSTIFICACION_INI, EVALUADORES, CALIFICACIONES, DECISIONES, CAPACIDADES, CHECKLISTS_PERSONALIZADOS, ARTICULACION, METAS, F1_PERFIL, F1_DIRECTIVOS } from "@/data/demo-siegfried/contenido";
import { createCompany, deleteCompany, listCompanies, upsertResponsible, upsertObjective, upsertKpi, upsertInitiative, saveF1Response, saveAlineacion, setPrioSession, evaluateInitiative, decideInitiative, saveChecklistCap, saveRevisionCap, saveArticulacion, upsertMeta, catalog, flushOrError } from "@/server/store";
import { runWithTenant } from "@/server/tenant";
import { huellaAlineacion, huellaIniciativas } from "@/server/huellas";
import { PRACTICES } from "@/data/mapa";
import { leversOf } from "@/data/catalogo";
import type { SessionUser } from "@/lib/session";
import type { AlineacionIA } from "@/lib/alineacion";
import type { ValidacionIni } from "@/lib/iniciativas-ia";

type R = { ok: true } | { ok: false; status: number; error: string };
const demoUser = (u: { email: string; name: string; role: SessionUser["role"] }): SessionUser => ({ ...u, company: { slug: DEMO_SLUG, name: DEMO_NAME } } as SessionUser);

/** Generador determinista (mulberry32) para que las autoevaluaciones sean estables entre ejecuciones. */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export async function crearDemoSiegfried(actor: SessionUser, opts: { recrear?: boolean } = {}): Promise<{ ok: true; slug: string; resumen: Record<string, number>; avisos: string[] } | { ok: false; status: number; error: string }> {
  if (listCompanies().some((c) => c.slug === DEMO_SLUG)) {
    if (!opts.recrear) return { ok: false, status: 409, error: `La instancia «${DEMO_NAME}» ya existe (/${DEMO_SLUG}). Elimínala o pide recrearla.` };
    const d = await deleteCompany(actor, DEMO_SLUG);
    if (!d.ok) return d;
  }
  const co = base.company as Record<string, unknown>;
  const created = await createCompany(actor, {
    name: DEMO_NAME, slug: DEMO_SLUG, shortName: "Test Siegfried", city: String(co.city ?? ""), department: String(co.department ?? ""), sector: String(co.sector ?? ""), size: String(co.size ?? ""),
    sectorKey: String(co.sectorKey ?? ""), ciiu: String(co.ciiu ?? ""), country: "CO", currency: "COP", template: "vacia",
    horizons: co.horizons, levers: co.levers, typeRule: "cresio", mode: "acompanamiento", instruments: ["f1"],
  } as Parameters<typeof createCompany>[1]);
  if (!created.ok) return created;

  const avisos: string[] = [];
  const check = (what: string, r: R | { ok: boolean; error?: string }) => { if (!r.ok) avisos.push(`${what}: ${"error" in r ? r.error : "falló"}`); };
  const advisor = demoUser(EVALUADORES[2]);
  const resumen = runWithTenant(DEMO_SLUG, () => {
    // 1. catálogo: responsables, objetivos (línea base 2026 y 2027), resultados clave e iniciativas completas
    for (const r of base.responsibles) check(`responsable ${r.id}`, upsertResponsible(advisor, r as never));
    const objetivos = [...base.objectives.map((o) => ({ ...o, indicator: (o as { indicator?: string }).indicator || INDICADORES_FALTANTES[o.id] || "" })), ...OBJETIVOS_EXTRA];
    for (const o of objetivos) check(`objetivo ${o.id}`, upsertObjective(advisor, { ...(o as object), kpis: [] } as never));
    for (const k of base.kpis) check(`KPI ${k.code}`, upsertKpi(advisor, k as never));
    for (const k of KRS) check(`KR ${k.code}`, upsertKpi(advisor, { ...k, line: 3, series: [] } as never));
    for (const o of objetivos) {
      const kpis = o.horizon === "H1" ? KRS.filter((k) => k.cmi === o.id).map((k) => k.code) : ((o as { kpis?: string[] }).kpis ?? []);
      check(`objetivo ${o.id} (KR)`, upsertObjective(advisor, { ...(o as object), kpis } as never));
    }
    for (const i of INICIATIVAS) check(`iniciativa ${i.id}`, upsertInitiative(advisor, { ...i, horizon: "H1", status: i.status ?? "PLANEADA", impact: 3, feasibility: 3, urgency: 3, dependency: 3, progress: 0 } as never));

    // 2. autoevaluación directiva: diez directivos con el perfil por dimensión
    const rand = rng(20261105);
    for (const [n, d] of F1_DIRECTIVOS.entries()) {
      const r: Record<string, number> = {};
      for (const p of PRACTICES) { const m = F1_PERFIL[p.dim] ?? 3.3; const v = Math.round(m + (rand() - 0.5) * 2.2 + ((n % 3) - 1) * 0.3); r[p.code] = Math.max(1, Math.min(5, v)); }
      check(`F1 ${d.email}`, saveF1Response(demoUser({ email: d.email, name: d.name, role: "DIRECTIVO" }), { r, cargo: d.cargo }));
    }

    // 3. validaciones con IA en verde (objetivos e iniciativas del horizonte 2027)
    const c = catalog();
    const leverName = (id?: string) => leversOf(c.company).find((l) => l.id === id)?.name ?? "";
    const alineacion: AlineacionIA = { horizon: "H1", resumen: "Los veinte objetivos directivos 2027 están alineados con las siete prioridades: cada uno tiene verbo de logro, resultado, indicador impulsor y plazo, sin duplicidades ni enunciados que sean resultados clave o iniciativas.",
      items: c.objectives.filter((o) => o.horizon === "H1").map((o) => ({ id: o.id, color: "verde" as const, justificacion: JUSTIFICACION_OBJETIVO(leverName(o.lever)), recomendaciones: [], naturaleza: "objetivo" as const, duplicaDe: [], reformulacion: "", indicadorPropuesto: "", faltan: [] })) };
    check("validación de objetivos", saveAlineacion(advisor, "H1", huellaAlineacion("H1"), alineacion, "demo", "alineacion"));
    const validacionIni: ValidacionIni = { horizon: "H1", resumen: "Las veintidós iniciativas cumplen los ocho elementos: nombre como entrega, qué logran, responsable, inicio y fin, capacidad que instalan, presupuesto, resultado clave que mueven y alcance acotado.",
      items: c.initiatives.map((i) => ({ id: i.id, color: "verde" as const, justificacion: JUSTIFICACION_INI(i.kpi), recomendaciones: [], naturaleza: "iniciativa" as const, duplicaDe: [], faltan: [], reformulacion: "", logroPropuesto: "" })) };
    check("validación de iniciativas", saveAlineacion(advisor, "H1", huellaIniciativas("H1"), validacionIni as unknown as AlineacionIA, "demo", "alineacion-ini"));

    // 4. priorización: el advisor abre la calificación de todas las áreas con iniciativas, tres evaluadores califican, se cierra y se guarda el orden
    const sponsors = [...new Set(c.initiatives.map((i) => i.ownerId).filter((x): x is string => !!x))];
    for (const s of sponsors) check(`abrir ${s}`, setPrioSession(advisor, s, "abrir"));
    let evaluaciones = 0;
    for (const [id, filas] of Object.entries(CALIFICACIONES)) {
      for (const [n, f] of filas.entries()) {
        const r = evaluateInitiative(demoUser(EVALUADORES[n]), id, { scores: { D: f[0], E: f[1], M: f[2], L: f[3] }, type: {}, notes: {} });
        check(`calificación ${id} · ${EVALUADORES[n].name}`, r); if (r.ok) evaluaciones++;
      }
    }
    for (const s of sponsors) {
      check(`cerrar ${s}`, setPrioSession(advisor, s, "cerrar"));
      const orden = c.initiatives.filter((i) => i.ownerId === s).map((i) => i.id);
      check(`guardar ${s}`, setPrioSession(advisor, s, "guardar", orden));
    }
    let decisiones = 0;
    for (const [id, d] of Object.entries(DECISIONES)) { const r = decideInitiative(advisor, id, d); check(`decisión ${id}`, r); if (r.ok) decisiones++; }

    // 5. capacidades para ejecutar: checklist personalizado en una iniciativa y revisión de todas las decididas
    for (const [id, ch] of Object.entries(CHECKLISTS_PERSONALIZADOS)) check(`checklist ${id}`, saveChecklistCap(advisor, id, ch.frentes, ch.resumen, "demo"));
    const notas: Record<string, string> = {
      i13: "Falta incorporar en el CRM el registro del contacto digital por médico: hoy el consumo de contenido se carga a mano cada mes. Mientras no esté la integración, el KR de contactos efectivos se mide con dato parcial.",
      i9: "La transferencia tecnológica depende del proveedor del equipo para el entrenamiento; conviene fijar en el contrato las fechas de capacitación antes del arranque.",
      i12: "Recomiendo no contratar el equipo completo hasta tener el proceso de televenta probado en el piloto de 300 droguerías.",
    };
    let revisiones = 0;
    for (const [id, cp] of Object.entries(CAPACIDADES)) { const r = saveRevisionCap(advisor, id, { respuestas: cp.r, falta: cp.falta ?? {}, notas: notas[id] }); check(`capacidades ${id}`, r); if (r.ok) revisiones++; }

    // 6. articulación entre áreas de cada iniciativa y cascada trimestral 2027
    let articulaciones = 0;
    for (const [id, areas] of Object.entries(ARTICULACION)) { const r = saveArticulacion(advisor, id, { areas }); check(`articulación ${id}`, r); if (r.ok) articulaciones++; }
    let metas = 0;
    for (const m of METAS) { const r = upsertMeta(advisor, { ...m, estado: m.estado ?? "PLANEADA" } as never); check(`meta ${m.initiative} ${m.quarter}`, r); if (r.ok) metas++; }

    const cc = catalog();
    return { responsables: cc.responsibles.length, objetivos: cc.objectives.length, resultadosClave: cc.kpis.length, iniciativas: cc.initiatives.length, autoevaluaciones: F1_DIRECTIVOS.length, calificaciones: evaluaciones, decisiones, revisionesCapacidades: revisiones, articulaciones, metasTrimestrales: metas };
  });
  const bad = await flushOrError(); if (bad) avisos.push(`escritura en la base: ${bad}`);
  return { ok: true, slug: DEMO_SLUG, resumen, avisos };
}
