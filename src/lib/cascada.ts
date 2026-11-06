// ─────────────────────────────────────────────────────────────────────────────
// F04 · Cascada y plan trimestral (marco 4Shine Empresas, capacidad de Ejecución): bajar las prioridades
// de la empresa a metas trimestrales de cada área, con criterio de éxito, plan de acción (hitos con
// responsable, recursos y fecha), interdependencias entre áreas y cierre del trimestre con evaluación.
// Reglas puras: tipos, validación, propuesta desde el portafolio y lecturas del ciclo.
// ─────────────────────────────────────────────────────────────────────────────
import type { InitiativeFull } from "@/data/cmi";

export type HitoEstado = "PENDIENTE" | "EN_CURSO" | "HECHO";
export type MetaEstado = "PLANEADA" | "EN_CURSO" | "CUMPLIDA" | "PARCIAL" | "NO_CUMPLIDA";
export type Hito = { name: string; responsable?: string; fecha?: string; recursos?: string; estado: HitoEstado };
export type Dependencia = { areaId: string; que: string };
export type MetaTrimestral = {
  id: string;
  quarter: string;          // AAAA-Tn
  areaId: string;           // responsable del catálogo (área)
  lever: string;            // prioridad estratégica
  objective?: string;       // objetivo directivo
  kpi?: string;             // resultado clave
  initiative?: string;      // iniciativa del portafolio
  persona?: string;         // persona o equipo responsable dentro del área (del catálogo de personas o texto libre)
  meta: string;             // qué logra el área este trimestre
  criterio: string;         // criterio de éxito (cómo sabremos que se cumplió)
  hitos: Hito[];
  depende: Dependencia[];   // qué necesita de otras áreas
  estado: MetaEstado;
  cierre?: { cumplimiento: number; aprendizaje: string; at: string; by: string };
  by: string; at: string;
};

export const QUARTER = /^\d{4}-T[1-4]$/;
export const METAS_ESTADOS: { id: MetaEstado; label: string }[] = [
  { id: "PLANEADA", label: "Planeada" }, { id: "EN_CURSO", label: "En curso" }, { id: "CUMPLIDA", label: "Cumplida" }, { id: "PARCIAL", label: "Parcial" }, { id: "NO_CUMPLIDA", label: "No cumplida" },
];
export const HITO_ESTADOS: { id: HitoEstado; label: string }[] = [{ id: "PENDIENTE", label: "Pendiente" }, { id: "EN_CURSO", label: "En curso" }, { id: "HECHO", label: "Hecho" }];
export const trimestresDe = (year: number) => [1, 2, 3, 4].map((n) => `${year}-T${n}`);
export const trimestreLabel = (q: string) => { const m = q.match(QUARTER) ? q.split("-T") : null; return m ? `T${m[1]} ${m[0]}` : q; };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Valida y normaliza una meta trimestral enviada por la interfaz o por un importador. */
export function normalizarMeta(input: Partial<MetaTrimestral> & Record<string, unknown>, ctx: { areas: string[]; levers: string[]; objectives: string[]; kpis: string[]; initiatives: string[] }): { ok: true; meta: Omit<MetaTrimestral, "id" | "by" | "at"> } | { ok: false; error: string } {
  const quarter = str(input.quarter, 8).toUpperCase();
  if (!QUARTER.test(quarter)) return { ok: false, error: "El trimestre va como AAAA-Tn (p. ej. 2027-T1)." };
  const areaId = str(input.areaId, 10);
  if (!ctx.areas.includes(areaId)) return { ok: false, error: "El área (responsable del catálogo) no existe." };
  const lever = str(input.lever, 12).toUpperCase();
  if (!ctx.levers.includes(lever)) return { ok: false, error: "La prioridad estratégica no existe en esta empresa." };
  const objective = str(input.objective, 10).toUpperCase() || undefined;
  if (objective && !ctx.objectives.includes(objective)) return { ok: false, error: "El objetivo directivo no existe." };
  const kpi = str(input.kpi, 20).toUpperCase() || undefined;
  if (kpi && !ctx.kpis.includes(kpi)) return { ok: false, error: "El resultado clave no existe." };
  const initiative = str(input.initiative, 10) || undefined;
  if (initiative && !ctx.initiatives.includes(initiative)) return { ok: false, error: "La iniciativa no existe." };
  const persona = str(input.persona, 120) || undefined;
  const meta = str(input.meta, 300);
  if (meta.length < 5) return { ok: false, error: "La meta del trimestre necesita al menos 5 caracteres." };
  const criterio = str(input.criterio, 300);
  const hitos: Hito[] = (Array.isArray(input.hitos) ? input.hitos : []).map((h: Partial<Hito>) => ({
    name: str(h?.name, 160), responsable: str(h?.responsable, 80) || undefined, fecha: str(h?.fecha, 10) || undefined, recursos: str(h?.recursos, 160) || undefined,
    estado: HITO_ESTADOS.some((e) => e.id === h?.estado) ? (h!.estado as HitoEstado) : "PENDIENTE",
  })).filter((h) => h.name).slice(0, 20);
  const depende: Dependencia[] = (Array.isArray(input.depende) ? input.depende : []).map((d: Partial<Dependencia>) => ({ areaId: str(d?.areaId, 10), que: str(d?.que, 200) }))
    .filter((d) => d.areaId && ctx.areas.includes(d.areaId) && d.areaId !== areaId && d.que).slice(0, 10);
  const estado = METAS_ESTADOS.some((e) => e.id === input.estado) ? (input.estado as MetaEstado) : "PLANEADA";
  return { ok: true, meta: { quarter, areaId, lever, objective, kpi, initiative, persona, meta, criterio, hitos, depende, estado, ...(input.cierre && typeof input.cierre === "object" ? { cierre: input.cierre as MetaTrimestral["cierre"] } : {}) } };
}

/** Propuesta de cascada desde el portafolio: una meta por iniciativa del año en el trimestre en que empieza
    (o el primero del año si empieza antes), en el área de su sponsor, con su prioridad y objetivo. */
export function proponerDesdePortafolio(initiatives: InitiativeFull[], objectives: { id: string; lever?: string }[], year: number, existentes: MetaTrimestral[], articulaciones?: Record<string, Articulacion>): Omit<MetaTrimestral, "id" | "by" | "at">[] {
  const out: Omit<MetaTrimestral, "id" | "by" | "at">[] = [];
  for (const i of initiatives) {
    const o = objectives.find((x) => x.id === i.cmi);
    const lever = o?.lever; if (!lever) continue;
    const s = i.start?.match(/^(\d{4})-T([1-4])$/), e = i.end?.match(/^(\d{4})-T([1-4])$/);
    const startYear = s ? Number(s[1]) : year, endYear = e ? Number(e[1]) : startYear;
    if (startYear > year || endYear < year) continue;
    const q = startYear === year && s ? `${year}-T${s[2]}` : `${year}-T1`;
    // con articulación: una meta por área que contribuye (su contribución es la meta); sin ella, el área dueña
    const art = articulaciones?.[i.id];
    if (articulaciones && !art) continue;
    const areas = art ? [...art.areas].sort((x, y) => x.prioridad - y.prioridad) : (i.ownerId ? [{ areaId: i.ownerId, rol: "LIDERA" as RolArea, prioridad: 1, contribucion: "" }] : []);
    for (const a of areas) {
      if (existentes.some((m) => m.initiative === i.id && m.quarter === q && m.areaId === a.areaId)) continue;
      const texto = a.contribucion?.trim() ? `${i.name}: ${a.contribucion.trim()}` : i.metaResultado?.trim() ? `${i.name}: ${i.metaResultado.trim()}` : i.name;
      out.push({ quarter: q, areaId: a.areaId, lever, objective: i.cmi, kpi: i.kpi || undefined, initiative: i.id, persona: a.persona || undefined, meta: texto.slice(0, 300), criterio: a.entrega?.trim() ? a.entrega.trim().slice(0, 300) : (i.metaResultado?.trim() ?? "").slice(0, 300), hitos: [], depende: [], estado: i.status === "EN_CURSO" ? "EN_CURSO" : "PLANEADA" });
    }
  }
  return out;
}

/** Lectura del ciclo de un trimestre: planear, ejecutar, cerrar y aprender. */
export function cicloTrimestre(metas: MetaTrimestral[], quarter: string) {
  const del = metas.filter((m) => m.quarter === quarter);
  const hitos = del.flatMap((m) => m.hitos);
  const cerradas = del.filter((m) => m.cierre);
  const cumpl = cerradas.map((m) => m.cierre!.cumplimiento);
  return {
    metas: del.length, areas: new Set(del.map((m) => m.areaId)).size, sinCriterio: del.filter((m) => !m.criterio).length,
    hitos: hitos.length, hitosHechos: hitos.filter((h) => h.estado === "HECHO").length, dependencias: del.reduce((a, m) => a + m.depende.length, 0),
    cerradas: cerradas.length, cumplimiento: cumpl.length ? Math.round(cumpl.reduce((a, b) => a + b, 0) / cumpl.length) : null,
    aprendizajes: cerradas.map((m) => m.cierre!.aprendizaje).filter(Boolean),
  };
}

/** Interdependencias del trimestre como pares área → área con lo que se necesita. */
export function interdependencias(metas: MetaTrimestral[], quarter: string): { de: string; a: string; que: string; meta: string }[] {
  return metas.filter((m) => m.quarter === quarter).flatMap((m) => m.depende.map((d) => ({ de: m.areaId, a: d.areaId, que: d.que, meta: m.meta })));
}

/* ═══ Articulación entre áreas ═══
   Cada iniciativa es trabajo articulado: varias unidades contribuyen y una lidera. La articulación declara, por
   iniciativa, qué áreas participan, con qué rol y prioridad, quién (persona o equipo) y qué debe hacer cada una. */

export type RolArea = "LIDERA" | "CONTRIBUYE";
export type AreaArticulada = { areaId: string; rol: RolArea; prioridad: number; persona?: string; contribucion: string; entrega?: string };
export type Articulacion = { iniId: string; areas: AreaArticulada[]; by: string; at: string };
export const ROL_AREA: Record<RolArea, string> = { LIDERA: "Lidera", CONTRIBUYE: "Contribuye" };

/** Valida la articulación: de 1 a 8 áreas del catálogo sin repetir, una sola que lidera (si no se marca, la de prioridad 1),
    cada una con qué debe hacer (al menos 10 caracteres); la prioridad se renumera 1..n por el orden dado. */
export function normalizarArticulacion(input: unknown, iniId: string, by: string, ctx: { areas: string[] }): { ok: true; articulacion: Articulacion } | { ok: false; error: string } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const raw = Array.isArray(o.areas) ? (o.areas as Record<string, unknown>[]) : [];
  const vistas = new Set<string>();
  const areas: AreaArticulada[] = [];
  for (const a of raw) {
    const areaId = str(a?.areaId, 10);
    if (!areaId || !ctx.areas.includes(areaId)) return { ok: false, error: `El área «${areaId || "?"}» no existe en el catálogo.` };
    if (vistas.has(areaId)) return { ok: false, error: "Un área no puede aparecer dos veces en la misma iniciativa." };
    vistas.add(areaId);
    const contribucion = str(a?.contribucion, 400);
    if (contribucion.length < 10) return { ok: false, error: `Describe qué debe hacer el área ${areaId} (al menos 10 caracteres).` };
    const prioridad = Number(a?.prioridad);
    areas.push({ areaId, rol: a?.rol === "LIDERA" ? "LIDERA" : "CONTRIBUYE", prioridad: Number.isFinite(prioridad) && prioridad > 0 ? prioridad : 99, persona: str(a?.persona, 120) || undefined, contribucion, entrega: str(a?.entrega, 300) || undefined });
  }
  if (!areas.length) return { ok: false, error: "Declara al menos un área que participa en la iniciativa." };
  if (areas.length > 8) return { ok: false, error: "Máximo ocho áreas por iniciativa." };
  areas.sort((x, y) => x.prioridad - y.prioridad);
  areas.forEach((a, i) => { a.prioridad = i + 1; });
  const lideres = areas.filter((a) => a.rol === "LIDERA");
  if (lideres.length === 0) areas[0].rol = "LIDERA";
  else if (lideres.length > 1) return { ok: false, error: "Solo un área lidera la iniciativa; las demás contribuyen." };
  return { ok: true, articulacion: { iniId, areas, by, at: new Date().toISOString() } };
}

/** Interdependencias implícitas en la articulación: cada área que contribuye entrega al área que lidera. */
export const dependenciasDeArticulacion = (a: Articulacion): { de: string; a: string; que: string }[] => {
  const lider = a.areas.find((x) => x.rol === "LIDERA"); if (!lider) return [];
  return a.areas.filter((x) => x.rol !== "LIDERA").map((x) => ({ de: lider.areaId, a: x.areaId, que: x.entrega || x.contribucion }));
};

/* ═══ Árbol de la cascada ═══
   Prioridad → objetivo → resultado clave → iniciativa → área (rol, prioridad, persona) → metas por trimestre. */
export type NodoArea = AreaArticulada & { metas: Record<string, MetaTrimestral[]> };   // por trimestre AAAA-Tn
export type NodoIniciativa = { id: string; name: string; ownerId: string; kpi: string; decision?: string | null; articulada: boolean; areas: NodoArea[]; sueltas: MetaTrimestral[] };
export type NodoKr = { code: string; name: string; iniciativas: NodoIniciativa[] };
export type NodoObjetivo = { id: string; name: string; krs: NodoKr[] };
export type NodoPrioridad = { id: string; name: string; order: number; objetivos: NodoObjetivo[] };

export function arbolCascada(args: {
  levers: { id: string; name: string; order: number }[];
  objectives: { id: string; name: string; lever?: string; horizon?: string; kpis: string[] }[];
  kpis: { code: string; name: string; cmi: string }[];
  initiatives: { id: string; name: string; ownerId: string; kpi: string; cmi: string }[];
  metas: MetaTrimestral[]; articulaciones: Record<string, Articulacion>; decisions?: Record<string, { decision?: string | null }>;
  year: number; soloPortafolio?: boolean;   // soloPortafolio: iniciativas con decisión implementar o preparar, o con articulación o metas
}): NodoPrioridad[] {
  const delAnio = args.metas.filter((m) => m.quarter.startsWith(`${args.year}-`));
  const entra = (i: { id: string }) => {
    if (!args.soloPortafolio) return true;
    const d = args.decisions?.[i.id]?.decision;
    return d === "IMPLEMENTAR" || d === "PREPARAR" || !!args.articulaciones[i.id] || delAnio.some((m) => m.initiative === i.id);
  };
  const nodoIni = (i: { id: string; name: string; ownerId: string; kpi: string }): NodoIniciativa => {
    const art = args.articulaciones[i.id];
    const mias = delAnio.filter((m) => m.initiative === i.id);
    const areas: NodoArea[] = (art ? [...art.areas].sort((x, y) => x.prioridad - y.prioridad) : []).map((a) => ({ ...a, metas: {} }));
    const sueltas: MetaTrimestral[] = [];
    for (const m of mias) { const n = areas.find((a) => a.areaId === m.areaId); if (n) (n.metas[m.quarter] ??= []).push(m); else sueltas.push(m); }
    return { id: i.id, name: i.name, ownerId: i.ownerId, kpi: i.kpi, decision: args.decisions?.[i.id]?.decision ?? null, articulada: !!art, areas, sueltas };
  };
  return [...args.levers].sort((a, b) => a.order - b.order).map((l) => {
    const objetivos: NodoObjetivo[] = args.objectives.filter((o) => o.lever === l.id && (o.horizon ?? "").toUpperCase() !== "LB" && !/l[ií]nea base/i.test(o.name)).map((o) => {
      const codes = new Set([...o.kpis, ...args.kpis.filter((k) => k.cmi === o.id).map((k) => k.code)]);
      const krs: NodoKr[] = [...codes].map((code) => {
        const k = args.kpis.find((x) => x.code === code);
        const inis = args.initiatives.filter((i) => i.kpi === code && entra(i)).map(nodoIni);
        return { code, name: k?.name ?? code, iniciativas: inis };
      }).filter((k) => k.iniciativas.length);
      // iniciativas del objetivo sin resultado clave vinculado: bajo un nodo «sin KR»
      const sinKr = args.initiatives.filter((i) => i.cmi === o.id && !codes.has(i.kpi) && entra(i)).map(nodoIni);
      if (sinKr.length) krs.push({ code: "", name: "Sin resultado clave vinculado", iniciativas: sinKr });
      return { id: o.id, name: o.name, krs };
    }).filter((o) => o.krs.length);
    return { id: l.id, name: l.name, order: l.order, objetivos };
  }).filter((p) => p.objetivos.length);
}
