// Generador de instancias de demostración con todo el recorrido del método hecho. Recibe un paquete de contenido
// (PaqueteDemo) y lo pasa por las mismas funciones del store que usa la plataforma, así el resultado es exactamente
// lo que vería un advisor: catálogo (prioridades, objetivos, resultados clave, iniciativas), autoevaluaciones
// directivas, validaciones con IA, priorización, decisiones de tiempo, capacidades para ejecutar, articulación,
// cascada trimestral y, después, la capa de ejecución a la fecha fija de la demo: personas, plan de trabajo con su
// historia, riesgos, presupuesto, mediciones, avance de iniciativas, cierre del trimestre y madurez digital.
//
// Hoy hay dos paquetes: «DEMO SIEGFRIED» (src/server/demo-siegfried.ts, con el contexto real de un cliente: solo
// para uso interno) y «Andina Suministros» (src/server/demo-andina.ts, empresa ficticia: se puede mostrar a
// cualquier cliente potencial). El calendario del recorrido es el mismo para ambos: el método se trabaja en las
// sesiones de noviembre de 2026 y la empresa vive detenida a mitad del segundo trimestre de 2027.

import { createCompany, deleteCompany, listCompanies, upsertResponsible, upsertObjective, upsertKpi, upsertInitiative, saveF1Response, saveAlineacion, setPrioSession, evaluateInitiative, decideInitiative, saveChecklistCap, saveRevisionCap, saveArticulacion, upsertMeta, catalog, flushOrError, leerMembresias, restaurarMembresias, reiniciarEmpresaDemo, type MembresiaGuardada } from "@/server/store";
import { saveTestResponse, saveF2Response, captureVariable, publishCapture, setTour } from "@/server/store";
import { upsertPerson, createTask, updateTask, attachEvidence, verifyUploadedEvidence, upsertRisk, addGasto, reportKpi, updateInitiative, getMetas, cerrarMeta, respondMadurezLote, captureMadurez, setMadSafeguard, publishMadurez } from "@/server/store";
import { runWithTenant, fijarReloj, DEFAULT_TENANT } from "@/server/tenant";
import { putObject } from "@/server/storage";
import { huellaAlineacion, huellaIniciativas } from "@/server/huellas";
import { sumarDias } from "@/lib/ruta-critica";
import { instrumentOf } from "@/data/madurez";
import { PRACTICES, DIMS, F2_GENERAL } from "@/data/mapa";
import { leversOf, type Catalog } from "@/data/catalogo";
import type { TaskStatus } from "@/data/proyectos";
import type { IniCategoria } from "@/data/cmi";
import type { RiskCategory, RiskStatus } from "@/lib/riesgos";
import type { GastoTipo } from "@/lib/presupuesto";
import type { NivelCap, FrenteKey, Frente } from "@/lib/capacidades";
import type { Decision } from "@/lib/priorizacion";
import type { AreaArticulada } from "@/lib/cascada";
import type { SessionUser } from "@/lib/session";
import type { AlineacionIA } from "@/lib/alineacion";
import type { ValidacionIni } from "@/lib/iniciativas-ia";

/* ═══ Contenido de un paquete ═══ */

export type ObjDemo = { id: string; perspective: string; lever: string; horizon: "H1"; line: number; name: string; indicator: string; desc: string; descartado?: boolean; motivoDescarte?: string };
export type KrDemo = { code: string; cmi: string; name: string; baseline: number; target: number; unit: string; goodDirection: "up" | "down" | "keep"; ownerId: string; due: string; definition: string; formula: string; frequency: string; source: string };
export type IniDemo = { id: string; name: string; objetivo: string; metaResultado: string; cmi: string; kpi: string; krExtra?: string[]; ownerId: string; capability: string; subsistema: string; start: string; end: string; budgetPlanned: number; status?: string; observaciones?: string };
export type IniMapeada = { id: string; categoria: IniCategoria; name: string; objetivo: string; metaResultado: string; ownerId: string; capability: string; subsistema: string; start: string; end: string; budgetPlanned: number };
export type EvalDemo = [number, number, number, number];
export type CapDemo = { r: Record<string, NivelCap>; falta?: Partial<Record<FrenteKey, string>>; notas?: string };
export type MetaDemo = { quarter: string; areaId: string; lever: string; objective: string; kpi: string; initiative: string; persona?: string; meta: string; criterio: string; hitos: { name: string; responsable?: string; fecha?: string; estado: "PENDIENTE" | "EN_CURSO" | "HECHO" }[]; depende?: { areaId: string; que: string }[]; estado?: "PLANEADA" | "EN_CURSO" };
export type Evaluador = { email: string; name: string; role: SessionUser["role"] };

/** Tarea del plan: estado a la fecha de la demo. H hecha · R en revisión · C en curso · B bloqueada · P por hacer. */
export type TareaDemo = {
  t: string; d: string; quien: number; con?: number[]; ini: string; fin: string; est: "H" | "R" | "C" | "B" | "P";
  ent?: true; hito?: true; dep?: number[];      // dependencias: posición (desde 1) de otras tareas del mismo proyecto
  corre?: number;                              // días que su compromiso se corrió frente a la línea base
  nota?: string;                               // motivo del bloqueo o nota de seguimiento
  soporte?: string;                            // título de la evidencia con la que se cerró
};
export const ESTADO_TAREA: Record<TareaDemo["est"], TaskStatus> = { H: "HECHA", R: "EN_REVISION", C: "EN_CURSO", B: "BLOQUEADA", P: "POR_HACER" };
export type RiesgoDemo = { ini: string; alta: string; cambio?: string; title: string; desc?: string; cat: RiskCategory; p: number; i: number; st: RiskStatus; quien?: number; resp?: string; fecha?: string };
export type GastoDemo = { ini: string; tipo: GastoTipo; concepto: string; millones: number; fecha: string; soporte?: string };

export type PaqueteDemo = {
  slug: string; name: string; shortName: string;
  /** Dominio de los correos ficticios de la instancia (directivos, evaluadores y personas). */
  dominio: string;
  company: { city: string; department: string; sector: string; size: string; sectorKey: string; ciiu: string; horizons: unknown; country?: "CO" | "EC"; currency?: "COP" | "USD" };
  typeRule: string; mode: string; instruments: string[];
  /** Contexto de partida: responsables, objetivos de la línea base (horizonte LB) y sus indicadores. */
  base: { responsibles: unknown[]; objectives: { id: string; horizon?: string; kpis?: string[] }[]; kpis: unknown[] };
  /** Lo que la empresa trae de antes y no pasa por el método (solo para reiniciar la empresa de demostración por defecto). */
  previo?: Pick<Catalog, "assessments" | "evidences" | "financials" | "territories">;
  levers: unknown[];
  objetivos: ObjDemo[]; krs: KrDemo[]; iniciativas: IniDemo[]; iniciativasMapeadas: IniMapeada[];
  objetivoSinPrioridad?: string; iniciativaSinKr?: string;
  textos: {
    justificacionObjetivo: (lever: string) => string;
    justificacionIni: (kr: string) => string;
    resumenAlineacion: string;
    sinPrioridad: { justificacion: string; recomendaciones: string[] };
    resumenValidacionIni: string;
    sinKr: { justificacion: string; recomendaciones: string[] };
    /** Notas de las salvaguardas de madurez digital, en el orden del instrumento. */
    notasSalvaguardas: string[];
  };
  evaluadores: [Evaluador, Evaluador, Evaluador];
  calificaciones: Record<string, [EvalDemo, EvalDemo, EvalDemo]>;
  decisiones: Record<string, { decision: Decision; rationale: string }>;
  capacidades: Record<string, CapDemo>;
  checklists: Record<string, { resumen: string; frentes: Frente[] }>;
  articulacion: Record<string, AreaArticulada[]>;
  metas: MetaDemo[];
  f1Perfil: Record<string, number>;
  /** Dimensiones en las que el comité no comparte el diagnóstico: mitad de los directivos por encima y mitad por debajo, ± este valor. */
  f1Dispersion?: Record<string, number>;
  f1Directivos: { email: string; name: string; cargo: string }[];
  /** Los otros instrumentos del diagnóstico (opcional): test de entrada, percepción de equipos y la captura A3 en curso. */
  diagnostico?: {
    test: { email: string; name: string; cargo: string; objetivo: string; perfil: number; q25: "A" | "B" | "C" | "D" | "E"; fecha: string }[];
    f2: { n: number; desde: string; areas: string[]; abiertas: string[]; sesgo: number; sesgoDim?: Record<string, number> };   // sesgoDim: los equipos ven esa dimensión más baja que la dirección
    /** Prácticas que el advisor ya verificó en la captura A3 a la fecha de la demo (en el orden del mapa). */
    captura: { practicas: number; fecha: string; publicar?: string; nivelDim?: Record<string, number>; ajuste?: number };   // ajuste: nivel verificado frente a la autoevaluación (por defecto, 0,4 por debajo)   // nivelDim: nivel verificado promedio de las prácticas de esa dimensión   // publicar: día en que el advisor publica el corte A3 (con las 68 prácticas)
  };
  /** Tour guiado de la instancia (Administración → Tour), opcional. */
  tour?: unknown;
  ejecucion: {
    hoy: string;
    personas: { name: string; cargo: string; responsibleId: string; dependencia: string }[];
    planes: Record<string, TareaDemo[]>;
    riesgos: RiesgoDemo[];
    gastos: GastoDemo[];
    avanceKrT1: Record<string, number>; avanceKrPorDefecto: number;
    notasKrT1: Record<string, string>;
    avanceIniciativas: Record<string, { status: "PLANEADA" | "EN_CURSO" | "EN_RIESGO" | "COMPLETADA"; progress: number; log?: { type: "HITO" | "ALERTA" | "NOTA"; text: string } }>;
    cierresT1: Record<string, { c: number; a: string }>;
    madurezPerfil: Record<string, Record<string, number>>;
    madurezSesgo: Record<string, number>;
    madurezSalvaguardas: ("CUMPLE" | "PARCIAL" | "FALLA")[];
    madurezCorte: string;
  };
};

type R = { ok: true } | { ok: false; status: number; error: string };
type Resultado = { ok: true; slug: string; resumen: Record<string, number>; avisos: string[] } | { ok: false; status: number; error: string };

/** Generador determinista (mulberry32) para que las autoevaluaciones y la madurez sean estables entre ejecuciones. */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const min = (a: string, b: string) => (a < b ? a : b);

/** PDF mínimo de una página (Helvetica, texto en Latin-1) para las evidencias de ejemplo. */
export function pdfSimple(titulo: string, lineas: string[]): Buffer {
  const esc = (s: string) => s.replace(/[^\x20-\xff]/g, "-").replace(/([\\()])/g, "\\$1");
  const partir = (s: string, n = 88) => { const out: string[] = []; let l = ""; for (const w of s.split(/\s+/)) { if ((l + " " + w).trim().length > n) { out.push(l); l = w; } else l = (l + " " + w).trim(); } if (l) out.push(l); return out; };
  const cuerpo = lineas.flatMap((l) => (l ? partir(l) : [""]));
  const texto = ["BT", "/F2 16 Tf", "56 730 Td", ...partir(titulo, 60).flatMap((l, i) => [i ? "0 -20 Td" : "", `(${esc(l)}) Tj`]), "/F1 10.5 Tf", "0 -30 Td", ...cuerpo.flatMap((l) => [`(${esc(l)}) Tj`, "0 -15 Td"]), "ET"].filter(Boolean).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`,
  ];
  let out = "%PDF-1.4\n"; const off: number[] = [];
  objs.forEach((o, i) => { off.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Crea (o recrea) la instancia del paquete con todo el recorrido del método y la capa de ejecución. */
export async function construirDemo(actor: SessionUser, P: PaqueteDemo, opts: { recrear?: boolean; archivos?: boolean } = {}): Promise<Resultado> {
  const demoUser = (u: { email: string; name: string; role: SessionUser["role"] }): SessionUser => ({ ...u, company: { slug: P.slug, name: P.name } } as SessionUser);
  const co = P.company;
  const datos = {
    name: P.name, slug: P.slug, shortName: P.shortName, city: co.city, department: co.department, sector: co.sector, size: co.size,
    sectorKey: co.sectorKey, ciiu: co.ciiu, country: co.country ?? "CO", currency: co.currency ?? "COP", template: "vacia" as const,
    horizons: co.horizons, levers: P.levers, typeRule: P.typeRule, mode: P.mode, instruments: P.instruments,
  };
  let membresias: MembresiaGuardada[] = [];
  if (P.slug === DEFAULT_TENANT) {
    // la empresa de demostración por defecto no se elimina: se vacía y se reconstruye conservando sus cuentas y accesos
    if (!opts.recrear && listCompanies().find((c) => c.slug === P.slug)?.template === "vacia") return { ok: false, status: 409, error: `La instancia «${P.name}» ya está construida (/${P.slug}). Pide recrearla.` };
    const r = await reiniciarEmpresaDemo(actor, P.slug, datos as Parameters<typeof createCompany>[1], P.previo);
    if (!r.ok) return r;
  } else {
    if (listCompanies().some((c) => c.slug === P.slug)) {
      if (!opts.recrear) return { ok: false, status: 409, error: `La instancia «${P.name}» ya existe (/${P.slug}). Elimínala o pide recrearla.` };
      // los accesos ya concedidos a la demo (advisors y directivos de otras empresas) se conservan al recrearla
      membresias = await leerMembresias(P.slug);
      const d = await deleteCompany(actor, P.slug);
      if (!d.ok) return d;
    }
    const created = await createCompany(actor, datos as Parameters<typeof createCompany>[1]);
    if (!created.ok) return created;
  }

  const avisos: string[] = [];
  const check = (what: string, r: R | { ok: boolean; error?: string }) => { if (!r.ok) avisos.push(`${what}: ${"error" in r ? r.error : "falló"}`); };
  const advisor = demoUser(P.evaluadores[2]);
  const resumen = runWithTenant(P.slug, () => {
    fijarReloj("2026-11-09T15:00:00.000Z");   // el método se recorre en las sesiones de noviembre de 2026
    // 1. catálogo: responsables, objetivos (línea base y horizonte 1), resultados clave e iniciativas completas
    for (const r of P.base.responsibles) check(`responsable ${(r as { id: string }).id}`, upsertResponsible(advisor, r as never));
    const objetivos = [...P.base.objectives.filter((o) => o.horizon === "LB"), ...P.objetivos];
    for (const o of objetivos) check(`objetivo ${o.id}`, upsertObjective(advisor, { ...(o as object), kpis: [] } as never));
    for (const k of P.base.kpis) check(`KPI ${(k as { code: string }).code}`, upsertKpi(advisor, k as never));
    for (const k of P.krs) check(`KR ${k.code}`, upsertKpi(advisor, { ...k, line: 3, series: [{ period: "2026-T4", value: k.baseline, note: "Línea base 2026" }] } as never));
    for (const o of objetivos) {
      const kpis = o.horizon === "H1" ? P.krs.filter((k) => k.cmi === o.id).map((k) => k.code) : ((o as { kpis?: string[] }).kpis ?? []);
      check(`objetivo ${o.id} (KR)`, upsertObjective(advisor, { ...(o as object), kpis } as never));
    }
    for (const i of P.iniciativas) check(`iniciativa ${i.id}`, upsertInitiative(advisor, { ...i, horizon: "H1", status: i.status ?? "PLANEADA", impact: 3, feasibility: 3, urgency: 3, dependency: 3, progress: 0 } as never));
    // regla de paso · mapeadas sin objetivo ni resultado clave: un proyecto especial y una iniciativa disruptiva (no pasan a Priorización)
    for (const i of P.iniciativasMapeadas) check(`iniciativa ${i.id}`, upsertInitiative(advisor, { ...i, cmi: "", kpi: "", horizon: "H1", status: "PLANEADA", impact: 3, feasibility: 3, urgency: 3, dependency: 3, progress: 0 } as never));

    // 2. autoevaluación directiva: los directivos con el perfil por dimensión
    const rand = rng(20261105);
    for (const [n, d] of P.f1Directivos.entries()) {
      const r: Record<string, number> = {};
      for (const p of PRACTICES) { const m = P.f1Perfil[p.dim] ?? 3.3, dsp = P.f1Dispersion?.[p.dim] ?? 0; const v = Math.round(m + (rand() - 0.5) * 2.2 + ((n % 3) - 1) * 0.3 + (dsp ? (n % 2 ? dsp : -dsp) : 0)); r[p.code] = Math.max(1, Math.min(5, v)); }
      check(`F1 ${d.email}`, saveF1Response(demoUser({ email: d.email, name: d.name, role: "DIRECTIVO" }), { r, cargo: d.cargo }));
    }

    // 2b. los otros instrumentos del diagnóstico: test de entrada del gerente y dos directivos, y la encuesta anónima de equipos
    if (P.diagnostico) {
      const D = P.diagnostico, az = rng(20261020);
      for (const t of D.test) {
        fijarReloj(`${t.fecha}T15:00:00.000Z`);
        const r: Record<string, number | string> = {};
        for (let q = 1; q <= 24; q++) r[String(q)] = clamp(Math.round(t.perfil + (az() - 0.5) * 2.2), 1, 5);
        r["25"] = t.q25;
        check(`test ${t.email}`, saveTestResponse(demoUser({ email: t.email, name: t.name, role: "DIRECTIVO" }), { r, cargo: t.cargo, objetivo: t.objetivo }));
      }
      const dimDe = new Map<string, string>(DIMS.flatMap((d) => d.f2.map((q) => [q.code, d.code] as [string, string])));
      const codigos = [...DIMS.flatMap((d) => d.f2.map((q) => q.code)), ...F2_GENERAL.map((q) => q.code)];
      for (let n = 0; n < D.f2.n; n++) {
        fijarReloj(`${sumarDias(D.f2.desde, n % 12)}T${String(13 + (n % 8)).padStart(2, "0")}:15:00.000Z`);
        const r: Record<string, number> = {};
        for (const code of codigos) {
          if (az() < 0.04) continue;   // alguna afirmación sin responder
          const dim = dimDe.get(code) ?? "";
          const base = (P.f1Perfil[dim] ?? 3) - D.f2.sesgo - (D.f2.sesgoDim?.[dim] ?? 0);
          r[code] = clamp(Math.round(base + (az() - 0.5) * 2.4), 1, 5);
        }
        check(`F2 ${n + 1}`, saveF2Response({ r, area: D.f2.areas[n % D.f2.areas.length], abierta: D.f2.abiertas[n] ?? "" }));
      }
      fijarReloj("2026-11-09T15:00:00.000Z");
    }

    // 3. validaciones con IA en verde (objetivos e iniciativas del horizonte 1)
    const c = catalog();
    const leverName = (id?: string) => leversOf(c.company).find((l) => l.id === id)?.name ?? "";
    // los descartados no se validan; el objetivo sin prioridad queda en amarillo con la recomendación de ubicarlo
    const alineacion: AlineacionIA = { horizon: "H1", resumen: P.textos.resumenAlineacion,
      items: c.objectives.filter((o) => o.horizon === "H1" && !o.descartado).map((o) => o.id === P.objetivoSinPrioridad
        ? { id: o.id, color: "amarillo" as const, justificacion: P.textos.sinPrioridad.justificacion, recomendaciones: P.textos.sinPrioridad.recomendaciones, naturaleza: "objetivo" as const, duplicaDe: [], reformulacion: "", indicadorPropuesto: "", faltan: ["prioridad"] }
        : { id: o.id, color: "verde" as const, justificacion: P.textos.justificacionObjetivo(leverName(o.lever)), recomendaciones: [], naturaleza: "objetivo" as const, duplicaDe: [], reformulacion: "", indicadorPropuesto: "", faltan: [] }) };
    check("validación de objetivos", saveAlineacion(advisor, "H1", huellaAlineacion("H1"), alineacion, "demo", "alineacion"));
    const validacionIni: ValidacionIni = { horizon: "H1", resumen: P.textos.resumenValidacionIni,
      items: c.initiatives.map((i) => i.id === P.iniciativaSinKr
        ? { id: i.id, color: "amarillo" as const, justificacion: P.textos.sinKr.justificacion, recomendaciones: P.textos.sinKr.recomendaciones, naturaleza: "iniciativa" as const, duplicaDe: [], faltan: ["kr"], reformulacion: "", logroPropuesto: "" }
        : i.categoria
        ? { id: i.id, color: "amarillo" as const, justificacion: `Está mapeada como ${i.categoria === "especial" ? "proyecto especial" : "iniciativa disruptiva"}: tiene nombre, qué logra, responsable, plazo y presupuesto, pero aún no cuelga de un objetivo ni mueve un resultado clave.`, recomendaciones: ["Mantenerla mapeada para considerarla; cuando se le asocie un resultado clave pasa a Priorización."], naturaleza: "iniciativa" as const, duplicaDe: [], faltan: ["kr"], reformulacion: "", logroPropuesto: "" }
        : { id: i.id, color: "verde" as const, justificacion: P.textos.justificacionIni(i.kpi), recomendaciones: [], naturaleza: "iniciativa" as const, duplicaDe: [], faltan: [], reformulacion: "", logroPropuesto: "" }) };
    check("validación de iniciativas", saveAlineacion(advisor, "H1", huellaIniciativas("H1"), validacionIni as unknown as AlineacionIA, "demo", "alineacion-ini"));

    // 4. priorización: el advisor abre la calificación de todas las áreas con iniciativas, tres evaluadores califican, se cierra y se guarda el orden
    const sponsors = [...new Set(c.initiatives.filter((i) => !!i.kpi).map((i) => i.ownerId).filter((x): x is string => !!x))];   // solo las áreas con iniciativas que pasan a priorización
    for (const s of sponsors) check(`abrir ${s}`, setPrioSession(advisor, s, "abrir"));
    let evaluaciones = 0;
    for (const [id, filas] of Object.entries(P.calificaciones)) {
      for (const [n, f] of filas.entries()) {
        const r = evaluateInitiative(demoUser(P.evaluadores[n]), id, { scores: { D: f[0], E: f[1], M: f[2], L: f[3] }, type: {}, notes: {} });
        check(`calificación ${id} · ${P.evaluadores[n].name}`, r); if (r.ok) evaluaciones++;
      }
    }
    for (const s of sponsors) {
      check(`cerrar ${s}`, setPrioSession(advisor, s, "cerrar"));
      const orden = c.initiatives.filter((i) => i.ownerId === s && !!i.kpi).map((i) => i.id);   // solo las que pasan a priorización (vinculadas a un KR)
      check(`guardar ${s}`, setPrioSession(advisor, s, "guardar", orden));
    }
    let decisiones = 0;
    for (const [id, d] of Object.entries(P.decisiones)) { const r = decideInitiative(advisor, id, d); check(`decisión ${id}`, r); if (r.ok) decisiones++; }

    // 5. capacidades para ejecutar: checklist personalizado en una iniciativa y revisión de todas las decididas
    for (const [id, ch] of Object.entries(P.checklists)) check(`checklist ${id}`, saveChecklistCap(advisor, id, ch.frentes, ch.resumen, "demo"));
    let revisiones = 0;
    for (const [id, cp] of Object.entries(P.capacidades)) { const r = saveRevisionCap(advisor, id, { respuestas: cp.r, falta: cp.falta ?? {}, notas: cp.notas }); check(`capacidades ${id}`, r); if (r.ok) revisiones++; }

    // 6. articulación entre áreas de cada iniciativa y cascada trimestral
    let articulaciones = 0;
    for (const [id, areas] of Object.entries(P.articulacion)) { const r = saveArticulacion(advisor, id, { areas }); check(`articulación ${id}`, r); if (r.ok) articulaciones++; }
    let metas = 0;
    for (const m of P.metas) { const r = upsertMeta(advisor, { ...m, estado: m.estado ?? "PLANEADA" } as never); check(`meta ${m.initiative} ${m.quarter}`, r); if (r.ok) metas++; }

    if (P.tour) check("tour guiado", setTour(advisor, P.tour));
    const cc = catalog();
    return { responsables: cc.responsibles.length, objetivos: cc.objectives.length, resultadosClave: cc.kpis.length, iniciativas: cc.initiatives.length, autoevaluaciones: P.f1Directivos.length, calificaciones: evaluaciones, decisiones, revisionesCapacidades: revisiones, articulaciones, metasTrimestrales: metas };
  });
  const bad = await flushOrError(); if (bad) avisos.push(`escritura en la base: ${bad}`);
  // la capa de ejecución: la empresa a la fecha fija de la demo, con el plan andando
  const ejecucion = await runWithTenant(P.slug, () => sembrarEjecucion(P, avisos, { archivos: opts.archivos }));
  Object.assign(resumen as Record<string, number>, ejecucion);
  if (membresias.length) {
    const n = await restaurarMembresias(P.slug, membresias);
    if (n < membresias.length) avisos.push(`membresías: se conservaron ${n} de ${membresias.length}`);
    (resumen as Record<string, number>).membresias = n;
  }
  return { ok: true, slug: P.slug, resumen, avisos };
}

/** Siembra la capa de ejecución. Se llama dentro del contexto de la empresa demo. `archivos`: escribe el PDF de cada evidencia.
    Todo pasa por las funciones del store, con el reloj fijado en la fecha que cada registro representa: así la auditoría
    —de donde el tablero de impacto lee los movimientos— cuenta la historia en su orden. Las escrituras sobre un mismo
    registro se hacen por rondas, vaciando la cola entre una y otra, para que lleguen a la base en orden. */
export async function sembrarEjecucion(P: PaqueteDemo, avisos: string[], opts: { archivos?: boolean } = {}): Promise<Record<string, number>> {
  const X = P.ejecucion, HOY = X.hoy;
  const demoUser = (u: { email: string; name: string; role: SessionUser["role"] }): SessionUser => ({ ...u, company: { slug: P.slug, name: P.name } } as SessionUser);
  const pid = (n: number) => `P${String(n).padStart(2, "0")}`;
  const correo = (name: string) => `${name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${P.dominio}`;
  const persona = (n: number): SessionUser => demoUser({ email: correo(X.personas[n - 1].name), name: X.personas[n - 1].name, role: "LIDER" });
  const check = (what: string, r: { ok: boolean; error?: string }) => { if (!r.ok) avisos.push(`${what}: ${r.error ?? "falló"}`); return r.ok; };
  const vaciar = async () => { const e = await flushOrError(); if (e && !avisos.includes(`escritura en la base: ${e}`)) avisos.push(`escritura en la base: ${e}`); };
  const usados = new Map<string, number>();
  /** Fija el reloj en el día dado, a una hora hábil de Bogotá, avanzando un par de minutos por cada registro de ese día. */
  const reloj = (dia: string) => { const n = usados.get(dia) ?? 0; usados.set(dia, n + 1); const m = n * 3; fijarReloj(`${dia}T${String(14 + Math.floor(m / 60) % 9).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00.000Z`); };
  const advisor = demoUser(P.evaluadores[2]);
  const c = catalog();
  const nombreIni = (id: string) => c.initiatives.find((i) => i.id === id)?.name ?? id;

  // 1. directorio de personas
  reloj("2026-12-07");
  for (const [n, p] of X.personas.entries()) check(`persona ${p.name}`, upsertPerson(advisor, { id: pid(n + 1), ...p, email: correo(p.name) }));

  // 2. plan de trabajo: cada proyecto carga su plan unos días antes de empezar; después, la historia de cada tarea
  type Op = { dia: string; run: () => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>; what: string };
  const historias: Op[][] = [];
  const idTarea: Record<string, string[]> = {};
  const evidencia: Record<string, string> = {};
  const archivos: Promise<void>[] = [];
  let tareas = 0, evidencias = 0;
  for (const [ini, plan] of Object.entries(X.planes).sort((a, b) => a[1][0].ini.localeCompare(b[1][0].ini))) {
    const lider = persona(plan[0].quien);
    reloj(sumarDias(plan.reduce((a, t) => min(a, t.ini), plan[0].ini), -5));
    idTarea[ini] = [];
    for (const [n, t] of plan.entries()) {
      const r = createTask(lider, { iniId: ini, title: t.t, desc: t.d, assigneeId: pid(t.quien), coAssigneeIds: (t.con ?? []).map(pid), start: t.ini, due: t.corre ? sumarDias(t.fin, -t.corre) : t.fin,
        dependsOn: (t.dep ?? []).map((d) => idTarea[ini][d - 1]), requiresEvidence: Boolean(t.ent), milestone: Boolean(t.hito) });
      if (!check(`tarea ${ini} ${n + 1}`, r) || !r.ok) { idTarea[ini].push(""); continue; }
      const id = r.task.id; idTarea[ini].push(id); tareas++;
      historias.push(historiaDe(ini, id, t));
    }
  }
  function historiaDe(ini: string, id: string, t: TareaDemo): Op[] {
    const quien = persona(t.quien), ops: Op[] = [];
    if (t.est === "P") return ops;
    const tope = min(t.fin, HOY);
    ops.push({ dia: t.ini, what: `${id} inicia`, run: () => updateTask(quien, id, { status: "EN_CURSO" }) });
    if (t.corre) ops.push({ dia: min(sumarDias(t.fin, -t.corre - 4), sumarDias(HOY, -5)), what: `${id} corre su fecha`, run: () => updateTask(quien, id, { due: t.fin, ...(t.nota && t.est !== "B" ? { note: t.nota } : {}) }) });
    else if (t.nota && t.est !== "B") ops.push({ dia: sumarDias(tope, -6), what: `${id} nota`, run: () => updateTask(quien, id, { note: t.nota }) });
    if (t.est === "H" || t.est === "R") {
      const cierre = t.est === "H" ? t.fin : min(t.fin, sumarDias(HOY, -4));
      const titulo = t.soporte ?? `Entregable para revisión: ${t.t}`;
      ops.push({ dia: sumarDias(cierre, -1), what: `${id} evidencia`, run: () => {
        const clave = `${P.slug}/${id}.pdf`;
        const pdf = pdfSimple(titulo, [`Proyecto: ${nombreIni(ini)}`, `Actividad ${id}: ${t.t}`, `Responsable: ${X.personas[t.quien - 1].name} · ${X.personas[t.quien - 1].cargo}`, `Fecha: ${sumarDias(cierre, -1)}`, "", t.d, "", "Documento de ejemplo de la instancia de demostración. Su contenido es ficticio."]);
        const r = attachEvidence(quien, id, { fileName: `${titulo.replace(/[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60)}.pdf`, filePath: clave, size: pdf.length, mime: "application/pdf" }, { title: titulo, kind: t.ent ? "Entregable" : "Documento" });
        if (r.ok) { evidencia[id] = r.evidence.id; evidencias++; if (opts.archivos) archivos.push(putObject("uploads", clave, pdf, "application/pdf")); }
        return r;
      } });
      ops.push({ dia: cierre, what: `${id} ${t.est === "H" ? "se cierra" : "a revisión"}`, run: () => updateTask(quien, id, { status: ESTADO_TAREA[t.est] }) });
      if (t.est === "H" && t.fin <= sumarDias(HOY, -25))   // las más recientes siguen por verificar
        ops.push({ dia: sumarDias(t.fin, 3), what: `${id} verificación`, run: () => (evidencia[id] ? verifyUploadedEvidence(advisor, evidencia[id]) : { ok: true }) });
    }
    if (t.est === "B") ops.push({ dia: sumarDias(tope, -12), what: `${id} se bloquea`, run: () => updateTask(quien, id, { status: "BLOQUEADA", blockNote: t.nota ?? "Bloqueada por una dependencia externa." }) });
    return ops;
  }
  await vaciar();
  for (let ronda = 0; historias.some((h) => h.length > ronda); ronda++) {
    for (const op of historias.map((h) => h[ronda]).filter(Boolean).sort((a, b) => a.dia.localeCompare(b.dia))) { reloj(op.dia); check(op.what, await op.run()); }
    await vaciar();
  }
  try { await Promise.all(archivos); } catch (e) { avisos.push(`archivos de evidencia: ${(e as Error).message}`); }

  // 3. riesgos: nacen abiertos y después pasan a su estado actual (en mitigación, materializado o cerrado)
  const idRiesgo: string[] = [];
  for (const r of [...X.riesgos.entries()].sort((a, b) => a[1].alta.localeCompare(b[1].alta))) {
    const [n, x] = r; reloj(x.alta);
    const res = upsertRisk(persona(x.quien ?? X.planes[x.ini][0].quien), { iniId: x.ini, title: x.title, desc: x.desc, category: x.cat, probability: x.p, impact: x.i, status: "ABIERTO", ownerId: x.quien ? pid(x.quien) : undefined, due: x.fecha });
    if (check(`riesgo ${x.ini} ${n + 1}`, res) && res.ok) idRiesgo[n] = res.risk.id;
  }
  await vaciar();
  for (const [n, x] of [...X.riesgos.entries()].filter(([, x]) => x.st !== "ABIERTO").sort((a, b) => (a[1].cambio ?? "").localeCompare(b[1].cambio ?? ""))) {
    reloj(x.cambio ?? sumarDias(HOY, -7));
    if (idRiesgo[n]) check(`riesgo ${x.ini} ${n + 1} → ${x.st}`, upsertRisk(persona(x.quien ?? X.planes[x.ini][0].quien), { id: idRiesgo[n], status: x.st, mitigation: x.resp }));
  }

  // 4. presupuesto: compromisos y ejecuciones en su fecha
  let gastos = 0;
  for (const g of [...X.gastos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    reloj(g.fecha);
    if (check(`gasto ${g.ini} · ${g.concepto}`, addGasto(persona(X.planes[g.ini]?.[0].quien ?? 1), { iniId: g.ini, tipo: g.tipo, concepto: g.concepto, monto: g.millones * 1_000_000, fecha: g.fecha, soporte: g.soporte }))) gastos++;
  }

  // 5. mediciones del primer trimestre de los resultados clave (la línea base ya está en la serie)
  let mediciones = 0;
  const dueno = (areaId: string) => { const n = X.personas.findIndex((p) => p.responsibleId === areaId); return persona(n >= 0 ? n + 1 : 1); };
  for (const [n, k] of P.krs.entries()) {
    const tramo = k.target - k.baseline, f = k.goodDirection === "keep" ? 0 : (X.avanceKrT1[k.code] ?? X.avanceKrPorDefecto);
    const dec = k.unit === "número" || (Number.isInteger(k.baseline) && Number.isInteger(k.target) && Math.abs(tramo) >= 10) ? 0 : Math.abs(tramo) < 1 ? 2 : 1;
    const valor = Math.max(0, Math.round((k.baseline + tramo * f) * 10 ** dec) / 10 ** dec);
    reloj(sumarDias("2027-04-08", n % 6));
    if (check(`medición ${k.code}`, reportKpi(dueno(k.ownerId), k.code, "2027-T1", valor, X.notasKrT1[k.code]))) mediciones++;
  }

  // 6. avance y estado de las iniciativas en ejecución, con su entrada de bitácora
  for (const [id, a] of Object.entries(X.avanceIniciativas)) {
    reloj(sumarDias(HOY, -3));
    check(`avance ${id}`, updateInitiative(persona(X.planes[id]?.[0].quien ?? 1), id, { progress: a.progress, status: a.status, ...(a.log ? { log: a.log } : {}) }));
  }

  // 7. cascada: se cierra el primer trimestre (cumplimiento y aprendizaje) y el segundo queda en curso
  await vaciar();
  let cierres = 0;
  for (const m of getMetas()) {
    if (m.quarter === "2027-T2") { reloj("2027-04-12"); check(`meta ${m.initiative} ${m.quarter} en curso`, upsertMeta(advisor, { ...m, estado: "EN_CURSO" })); continue; }
    const cierre = X.cierresT1[`${m.initiative}|${m.areaId}`]; if (m.quarter !== "2027-T1" || !cierre) continue;
    reloj("2027-04-09");
    if (check(`cierre ${m.initiative} ${m.areaId}`, cerrarMeta(dueno(m.areaId), m.id, { cumplimiento: cierre.c, aprendizaje: cierre.a }))) cierres++;
  }

  // 7b. captura A3 en curso: el advisor ya verificó evidencia y nivel de una parte de las prácticas (el corte se publica en agosto)
  if (P.diagnostico) {
    const az = rng(20270510), D = P.diagnostico;
    for (const [i, p] of PRACTICES.slice(0, D.captura.practicas).entries()) {
      reloj(sumarDias(D.captura.fecha, Math.floor(i / 8)));
      const m = P.f1Perfil[p.dim] ?? 3, fijo = D.captura.nivelDim?.[p.dim];   // con nivel fijado para la dimensión, la variación es menor
      const level = clamp(Math.round((fijo ?? m + (D.captura.ajuste ?? -0.4)) + (az() - 0.5) * (fijo !== undefined ? 0.6 : 1.6)), 1, 5);
      const evidence = level >= 4 ? "V" : level === 3 ? (az() < 0.7 ? "V" : "P") : level === 2 ? (az() < 0.6 ? "P" : "N") : "N";
      check(`captura ${p.code}`, captureVariable(advisor, p.code, { perception: clamp(Math.round(m + (az() - 0.3)), 1, 5), evidence, level,
        note: evidence === "V" ? "Evidencia revisada en la sesión de verificación." : evidence === "P" ? "La evidencia existe pero no está al día o no cubre todas las sedes." : "No se encontró evidencia de la práctica." }));
    }
    await vaciar();
    if (D.captura.publicar) { reloj(D.captura.publicar); check("publicación del corte A3", publishCapture(advisor)); await vaciar(); }
  }

  // 8. madurez digital: percepción de los directivos, evidencia y nivel del advisor, salvaguardas y corte publicado
  const ins = instrumentOf("empresa"), azar = rng(20270417);
  const linea = (id: string) => id.split("-")[0];
  const nivel: Record<string, number> = {};
  for (const v of ins.variables) nivel[v.id] = clamp((X.madurezPerfil[linea(v.id)]?.[v.dimension] ?? 2) + (azar() < 0.22 ? 1 : azar() < 0.2 ? -1 : 0), 1, 5);
  let percepciones = 0;
  for (const [n, d] of P.f1Directivos.entries()) {
    const r: Record<string, number> = {};
    for (const [i, v] of ins.variables.entries()) {
      if (n === P.f1Directivos.length - 1 && i >= 31) break;   // una persona dejó el diagnóstico a medias
      const tecnica = v.dimension === "tecnologica" || v.dimension === "datos";
      r[v.id] = azar() < (tecnica && n !== 6 ? 0.09 : 0.02) ? 0 : clamp(Math.round(nivel[v.id] + (X.madurezSesgo[linea(v.id)] ?? 0) + (azar() - 0.5) * 1.8 + ((n % 3) - 1) * 0.25), 1, 5);
    }
    reloj(sumarDias("2027-03-15", n));
    if (check(`percepción ${d.email}`, respondMadurezLote(demoUser({ email: d.email, name: d.name, role: "DIRECTIVO" }), r))) percepciones++;
  }
  const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  for (const [i, v] of ins.variables.entries()) {
    const L = nivel[v.id];
    const d = clamp(L - 1 + (azar() < 0.4 ? 1 : 0), 0, 4), ii = clamp(L - 1 - (azar() < 0.3 ? 1 : 0), 0, 4), k = clamp(L - 2 + (azar() < 0.3 ? 1 : 0), 0, 4);
    const doc = v.evidence.find((e) => e.component === "D")?.what, uso = v.evidence.find((e) => e.component === "I")?.what;
    reloj(sumarDias("2027-04-05", Math.floor(i / 6)));
    check(`madurez ${v.id}`, captureMadurez(advisor, v.id, { d, i: ii, k, level: L, target: Math.min(5, L + (L <= 2 ? 2 : 1)),
      hallazgo: `${v.rubric[L - 1]}${doc ? ` Se revisó: ${minus(doc)}${ii <= 1 && uso ? `; no se encontró ${minus(uso)}` : ""}.` : ""}`,
      recomendacion: L < 5 ? `Para subir al nivel ${L + 1}: ${minus(v.rubric[L])}` : "Sostener la práctica y revisarla cada ciclo con los datos de resultado." }));
  }
  for (const [n, s] of ins.safeguards.entries()) { reloj("2027-04-15"); check(`salvaguarda ${s.id}`, setMadSafeguard(advisor, s.id, X.madurezSalvaguardas[n] ?? "PARCIAL", P.textos.notasSalvaguardas[n] ?? "")); }
  reloj("2027-04-19");
  check("corte de madurez digital", publishMadurez(advisor, X.madurezCorte));

  fijarReloj(null);
  await vaciar();
  return { personas: X.personas.length, tareas, evidencias, riesgos: idRiesgo.filter(Boolean).length, movimientosPresupuesto: gastos, mediciones, cierresTrimestre: cierres, percepcionesMadurez: percepciones, variablesMadurez: ins.variables.length };
}
