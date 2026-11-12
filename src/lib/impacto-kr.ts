// Gestión de proyectos · cómo mueve la ejecución cada resultado clave.
//
// Un proyecto es una iniciativa con su plan de trabajo (tareas, entregables, riesgos). Cada proyecto
// mueve de uno a tres resultados clave. Este motor lee el estado de la ejecución y lo convierte en
// dos lecturas por proyecto, que luego se llevan a cada resultado clave según el peso del proyecto:
//
//   · Avance ejecutado frente al esperado a la fecha (ritmo, en puntos porcentuales).
//   · Confianza de entrega (0 a 100): parte de 100 y cada señal de la ejecución suma o resta puntos.
//
// Y clasifica cada movimiento registrado (cierre de tarea, bloqueo, fecha corrida, riesgo nuevo…) con
// el efecto que tuvo, a favor o en contra. Es una lectura de la ejecución, no una medición del
// resultado: el valor medido del resultado clave sigue viniendo de sus reportes. Reglas puras, con
// todos los pesos a la vista en REGLAS; la interfaz las explica tal cual.

import type { TenantView } from "@/lib/vista";
import type { InitiativeFull, KpiFull } from "@/data/cmi";
import { krsDeIniciativa } from "@/data/cmi";
import { diasEntre, vencida, type Task, type TaskStatus } from "@/data/proyectos";
import { severidad, riesgoVivo, type ProjectRisk, type RiskStatus } from "@/lib/riesgos";
import { rutaCritica } from "@/lib/ruta-critica";
import { presupuestoDe, dinero, type Gasto, type PresupuestoProyecto, type Moneda } from "@/lib/presupuesto";

/* ═══ Reglas (pesos a la vista) ═══ */

export const REGLAS = {
  /** Cuánto del trabajo de una tarea se da por hecho según su estado. */
  credito: { HECHA: 1, EN_REVISION: 0.8, EN_CURSO: 0.4, BLOQUEADA: 0.2, POR_HACER: 0 } as Record<TaskStatus, number>,
  /** Peso de un proyecto en un resultado clave: principal 1, adicional 0,5. */
  pesoPrincipal: 1, pesoAdicional: 0.5,
  ritmo: { tolerancia: 3, porPuntoAtraso: 0.7, topeAtraso: 35, porPuntoAdelanto: 0.3, topeAdelanto: 8 },
  vencidas: { porTarea: 4, porDia: 0.15, tope: 25 },
  bloqueadas: { porTarea: 5, tope: 15 },
  entregablesAtrasados: { porEntregable: 4, tope: 12 },
  entregablesCumplidos: { porEntregable: 1.5, tope: 6 },
  riesgos: { ABIERTO: 8, EN_MITIGACION: 4, MATERIALIZADO: 14, CERRADO: 0, tope: 30 } as Record<RiskStatus, number> & { tope: number },
  cronograma: { minimoDias: 3, diasPorPunto: 6, tope: 10 },
  finPrevisto: { minimoDias: 5, diasPorPunto: 5, tope: 12 },
  presupuesto: { porPuntoBrecha: 0.3, topeBrecha: 12, porPuntoSobrecompromiso: 0.4, topeSobrecompromiso: 8 },   // la brecha cuenta desde REGLAS_PRESUPUESTO.brechaMinima
  niveles: { aFavor: 80, enObservacion: 60 },
} as const;

export type Nivel = "A_FAVOR" | "EN_OBSERVACION" | "EN_CONTRA" | "SIN_SENAL";
export const NIVEL: Record<Nivel, { label: string; color: string; chip: string; desc: string }> = {
  A_FAVOR: { label: "A favor", color: "var(--ok)", chip: "chip-ok", desc: "La ejecución empuja el resultado: va al ritmo previsto y sin señales que lo frenen." },
  EN_OBSERVACION: { label: "En observación", color: "var(--warn)", chip: "chip-warn", desc: "Hay señales que frenan el resultado; todavía se corrigen dentro del plan." },
  EN_CONTRA: { label: "En contra", color: "var(--bad)", chip: "chip-bad", desc: "La ejecución, como va, no entrega lo que el resultado necesita." },
  SIN_SENAL: { label: "Sin señal", color: "var(--faint)", chip: "", desc: "Los proyectos que lo mueven no tienen plan de trabajo ni riesgos registrados." },
};
export const nivelDe = (confianza: number | null): Nivel => (confianza === null ? "SIN_SENAL" : confianza >= REGLAS.niveles.aFavor ? "A_FAVOR" : confianza >= REGLAS.niveles.enObservacion ? "EN_OBSERVACION" : "EN_CONTRA");

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const BRECHA_MINIMA = 10;   // la misma de REGLAS_PRESUPUESTO.brechaMinima: puntos entre % ejecutado y % de avance
const r1 = (x: number) => Math.round(x * 10) / 10;
const pl = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/* ═══ Pulso de un proyecto ═══ */

export type FactorClave = "RITMO" | "VENCIDAS" | "BLOQUEADAS" | "ENTREGABLES_ATRASADOS" | "ENTREGABLES_CUMPLIDOS" | "RIESGOS" | "CRONOGRAMA" | "FIN_PREVISTO" | "PRESUPUESTO" | "SOBRECOMPROMISO";
export type Factor = { clave: FactorClave; puntos: number; titulo: string; detalle: string };

export type PulsoProyecto = {
  iniId: string; name: string; status: InitiativeFull["status"]; ownerId: string; categoria?: InitiativeFull["categoria"];
  krs: string[];
  tareas: { total: number; hechas: number; enCurso: number; bloqueadas: number; vencidas: number; diasAtraso: number };
  entregables: { total: number; cumplidos: number; atrasados: number };
  riesgos: { vivos: number; altos: number; materializados: number; exposicion: number };
  avance: number | null;      // 0–100 · trabajo ejecutado
  esperado: number | null;    // 0–100 · trabajo que debería ir a la fecha
  ritmo: number | null;       // puntos porcentuales: avance − esperado
  diasCorridos: number;       // días que el cronograma se corrió frente a su línea base
  fin: { planeado: string; previsto: string; desvio: number; criticas: number; criticasPendientes: number; hitos: number; hitosCumplidos: number } | null;   // ruta crítica: fin del plan, fin previsto a la fecha y días de diferencia
  presupuesto: PresupuestoProyecto;   // ejecutado contra avance: valor ganado, índice de costo y proyección al cierre
  proximo: { id: string; title: string; due: string; entregable: boolean; hito: boolean } | null;
  confianza: number | null;   // 0–100
  nivel: Nivel;
  factores: Factor[];         // ordenados por peso (de mayor a menor efecto)
};

const esperadoTarea = (t: Task, hoy: string) => {
  if (hoy >= t.due) return 1;
  if (hoy <= t.start) return 0;
  const total = diasEntre(t.start, t.due);
  return total <= 0 ? 1 : clamp(diasEntre(t.start, hoy) / total, 0, 1);
};

/** Lectura de la ejecución de un proyecto a la fecha `hoy`. `desvios`: días que cada tarea se corrió frente a su línea base. */
export function pulsoProyecto(ini: InitiativeFull, tasks: Task[], risks: ProjectRisk[], hoy: string, desvios: Record<string, number> = {}, gastos: Gasto[] = [], monedaEmpresa: Moneda = "COP"): PulsoProyecto {
  const mias = tasks.filter((t) => t.iniId === ini.id), vivos = risks.filter((r) => r.iniId === ini.id && riesgoVivo(r));
  const venc = mias.filter((t) => vencida(t, hoy)), bloq = mias.filter((t) => t.status === "BLOQUEADA");
  const entregables = mias.filter((t) => t.requiresEvidence || t.milestone);   // compromisos formales: entregables e hitos
  const ruta = rutaCritica(mias, hoy);
  const diasAtraso = venc.reduce((a, t) => a + diasEntre(t.due, hoy), 0);
  const entAtrasados = entregables.filter((t) => vencida(t, hoy)).length, entCumplidos = entregables.filter((t) => t.status === "HECHA").length;
  const avance = mias.length ? (mias.reduce((a, t) => a + REGLAS.credito[t.status], 0) / mias.length) * 100 : null;
  const esperado = mias.length ? (mias.reduce((a, t) => a + esperadoTarea(t, hoy), 0) / mias.length) * 100 : null;
  const ritmo = avance !== null && esperado !== null ? avance - esperado : null;
  const diasCorridos = mias.reduce((a, t) => a + Math.max(0, desvios[t.id] ?? 0), 0);
  const exposicion = vivos.reduce((a, r) => a + (severidad(r) / 25) * REGLAS.riesgos[r.status], 0);

  const factores: Factor[] = [];
  const R = REGLAS;
  if (ritmo !== null && ritmo <= -R.ritmo.tolerancia) factores.push({ clave: "RITMO", puntos: -Math.min(R.ritmo.topeAtraso, Math.abs(ritmo) * R.ritmo.porPuntoAtraso), titulo: "Ritmo por debajo del plan", detalle: `Va en ${Math.round(avance!)} % y a la fecha debería ir en ${Math.round(esperado!)} %.` });
  if (ritmo !== null && ritmo >= R.ritmo.tolerancia) factores.push({ clave: "RITMO", puntos: Math.min(R.ritmo.topeAdelanto, ritmo * R.ritmo.porPuntoAdelanto), titulo: "Ritmo por encima del plan", detalle: `Va en ${Math.round(avance!)} % frente a ${Math.round(esperado!)} % esperado a la fecha.` });
  if (venc.length) factores.push({ clave: "VENCIDAS", puntos: -Math.min(R.vencidas.tope, R.vencidas.porTarea * venc.length + R.vencidas.porDia * diasAtraso), titulo: pl(venc.length, "tarea vencida", "tareas vencidas"), detalle: `Suman ${pl(diasAtraso, "día", "días")} de atraso.` });
  if (bloq.length) factores.push({ clave: "BLOQUEADAS", puntos: -Math.min(R.bloqueadas.tope, R.bloqueadas.porTarea * bloq.length), titulo: pl(bloq.length, "tarea bloqueada", "tareas bloqueadas"), detalle: bloq.slice(0, 2).map((t) => t.title).join(" · ") });
  if (entAtrasados) factores.push({ clave: "ENTREGABLES_ATRASADOS", puntos: -Math.min(R.entregablesAtrasados.tope, R.entregablesAtrasados.porEntregable * entAtrasados), titulo: pl(entAtrasados, "entregable o hito atrasado", "entregables o hitos atrasados"), detalle: "Compromisos formales que ya debían estar cumplidos." });
  if (entCumplidos) factores.push({ clave: "ENTREGABLES_CUMPLIDOS", puntos: Math.min(R.entregablesCumplidos.tope, R.entregablesCumplidos.porEntregable * entCumplidos), titulo: pl(entCumplidos, "entregable o hito cumplido", "entregables o hitos cumplidos"), detalle: `De ${entregables.length} comprometidos, con su evidencia.` });
  if (exposicion > 0) { const altos = vivos.filter((r) => severidad(r) >= 15).length, mat = vivos.filter((r) => r.status === "MATERIALIZADO").length;
    factores.push({ clave: "RIESGOS", puntos: -Math.min(R.riesgos.tope, exposicion), titulo: pl(vivos.length, "riesgo abierto", "riesgos abiertos"), detalle: [altos ? pl(altos, "de nivel alto", "de nivel alto") : "", mat ? pl(mat, "materializado", "materializados") : ""].filter(Boolean).join(" · ") || "Ninguno de nivel alto." }); }
  if (ruta.desvio >= R.finPrevisto.minimoDias) factores.push({ clave: "FIN_PREVISTO", puntos: -Math.min(R.finPrevisto.tope, ruta.desvio / R.finPrevisto.diasPorPunto), titulo: "El fin del proyecto se corre", detalle: `Con lo pendiente como va, terminaría ${pl(ruta.desvio, "día", "días")} después de lo planeado.` });
  const pres = presupuestoDe(ini, gastos, avance, monedaEmpresa);
  if (pres.brecha !== null && pres.brecha >= BRECHA_MINIMA) factores.push({ clave: "PRESUPUESTO", puntos: -Math.min(R.presupuesto.topeBrecha, pres.brecha * R.presupuesto.porPuntoBrecha), titulo: "Gasta más rápido de lo que avanza", detalle: `Ha ejecutado el ${Math.round(pres.pctEjecutado!)} % del presupuesto con ${Math.round(avance!)} % de avance.` });
  if (pres.planeado > 0 && pres.comprometido > pres.planeado) { const exceso = ((pres.comprometido - pres.planeado) / pres.planeado) * 100;
    factores.push({ clave: "SOBRECOMPROMISO", puntos: -Math.min(R.presupuesto.topeSobrecompromiso, exceso * R.presupuesto.porPuntoSobrecompromiso), titulo: "Lo comprometido supera lo planeado", detalle: `Hay ${dinero(pres.comprometido, pres.moneda)} comprometidos sobre ${dinero(pres.planeado, pres.moneda)} planeados.` }); }
  if (diasCorridos >= R.cronograma.minimoDias) factores.push({ clave: "CRONOGRAMA", puntos: -Math.min(R.cronograma.tope, diasCorridos / R.cronograma.diasPorPunto), titulo: "Cronograma corrido", detalle: `Las fechas compromiso se han corrido ${pl(diasCorridos, "día", "días")} frente a la línea base.` });
  for (const f of factores) f.puntos = r1(f.puntos);
  factores.sort((a, b) => Math.abs(b.puntos) - Math.abs(a.puntos));

  const conSenal = mias.length > 0 || vivos.length > 0 || factores.length > 0;
  const confianza = conSenal ? Math.round(clamp(100 + factores.reduce((a, f) => a + f.puntos, 0), 0, 100)) : null;
  const prox = mias.filter((t) => t.status !== "HECHA" && !vencida(t, hoy)).sort((a, b) => a.due.localeCompare(b.due))[0];
  return {
    iniId: ini.id, name: ini.name, status: ini.status, ownerId: ini.ownerId, ...(ini.categoria ? { categoria: ini.categoria } : {}), krs: krsDeIniciativa(ini),
    tareas: { total: mias.length, hechas: mias.filter((t) => t.status === "HECHA").length, enCurso: mias.filter((t) => t.status === "EN_CURSO" || t.status === "EN_REVISION").length, bloqueadas: bloq.length, vencidas: venc.length, diasAtraso },
    entregables: { total: entregables.length, cumplidos: entCumplidos, atrasados: entAtrasados },
    riesgos: { vivos: vivos.length, altos: vivos.filter((r) => severidad(r) >= 15).length, materializados: vivos.filter((r) => r.status === "MATERIALIZADO").length, exposicion: r1(exposicion) },
    avance: avance === null ? null : r1(avance), esperado: esperado === null ? null : r1(esperado), ritmo: ritmo === null ? null : r1(ritmo),
    diasCorridos,
    fin: ruta.fin && ruta.finPrevisto ? { planeado: ruta.fin, previsto: ruta.finPrevisto, desvio: ruta.desvio, criticas: ruta.criticas.length, criticasPendientes: ruta.criticas.filter((id) => mias.find((t) => t.id === id)?.status !== "HECHA").length,
      hitos: mias.filter((t) => t.milestone).length, hitosCumplidos: mias.filter((t) => t.milestone && t.status === "HECHA").length } : null,
    presupuesto: pres,
    proximo: prox ? { id: prox.id, title: prox.title, due: prox.due, entregable: !!prox.requiresEvidence, hito: !!prox.milestone } : null,
    confianza, nivel: nivelDe(confianza), factores,
  };
}

/* ═══ Del proyecto al resultado clave ═══ */

export type KrMedido = { valor: number | null; periodo: string | null; base: number; meta: number; avance: number | null; tendencia: "MEJORA" | "EMPEORA" | "IGUAL" | null };
export type KrProyecto = { iniId: string; name: string; principal: boolean; peso: number; confianza: number | null; avance: number | null; esperado: number | null; nivel: Nivel };
export type KrFactor = Factor & { iniId: string; iniName: string; puntosKr: number };
export type KrImpacto = {
  code: string; name: string; unit: string; objetivo: string; due?: string;
  medido: KrMedido;
  proyectos: KrProyecto[];
  cobertura: number;          // 0–1 · peso de los proyectos que sí tienen señal de ejecución
  avance: number | null; esperado: number | null; ritmo: number | null;
  confianza: number | null; nivel: Nivel;
  factores: KrFactor[];       // efecto de cada señal sobre este resultado clave (puntos ya ponderados)
};

/** Avance medido del resultado clave, de su línea base a su meta (0–100), y hacia dónde se movió el último dato. */
export function krMedido(k: KpiFull): KrMedido {
  const s = [...(k.series ?? [])].sort((a, b) => a.period.localeCompare(b.period));
  const last = s[s.length - 1], prev = s[s.length - 2];
  if (!last) return { valor: null, periodo: null, base: k.baseline, meta: k.target, avance: null, tendencia: null };
  const tramo = k.target - k.baseline;
  const avance = k.goodDirection === "keep" ? (Math.abs(last.value - k.target) <= Math.abs(k.target) * 0.05 ? 100 : clamp(100 - (Math.abs(last.value - k.target) / (Math.abs(k.target) || 1)) * 100, 0, 100))
    : tramo === 0 ? (last.value === k.target ? 100 : 0) : clamp(((last.value - k.baseline) / tramo) * 100, 0, 100);
  const d = prev ? last.value - prev.value : 0;
  const mejor = k.goodDirection === "keep" ? (prev ? Math.abs(last.value - k.target) < Math.abs(prev.value - k.target) : false) : k.goodDirection === "up" ? d > 0 : d < 0;
  return { valor: last.value, periodo: last.period, base: k.baseline, meta: k.target, avance: r1(avance), tendencia: !prev || d === 0 ? (prev ? "IGUAL" : null) : mejor ? "MEJORA" : "EMPEORA" };
}

export type Impacto = { hoy: string; proyectos: PulsoProyecto[]; krs: KrImpacto[]; sinKr: string[]; pesos: Record<string, { code: string; peso: number }[]> };

/** Lectura completa: pulso de cada proyecto y efecto de la ejecución sobre cada resultado clave que alguno mueve. */
export function impactoKr(v: TenantView, risks: ProjectRisk[], hoy: string, desvios: Record<string, number> = {}, gastos: Gasto[] = []): Impacto {
  const monedaEmpresa: Moneda = v.catalog?.company?.currency === "USD" ? "USD" : "COP";
  const proyectos = v.initiatives.map((i) => pulsoProyecto(i, v.tasks, risks, hoy, desvios, gastos, monedaEmpresa));
  const porId = new Map(proyectos.map((p) => [p.iniId, p]));
  const pesos: Impacto["pesos"] = {};
  const krs: KrImpacto[] = [];
  for (const k of v.kpis) {
    const mueven = v.initiatives.filter((i) => krsDeIniciativa(i).includes(k.code));
    if (!mueven.length) continue;
    const bruto = mueven.map((i) => ({ i, principal: i.kpi === k.code, w: i.kpi === k.code ? REGLAS.pesoPrincipal : REGLAS.pesoAdicional }));
    const total = bruto.reduce((a, x) => a + x.w, 0);
    const filas: KrProyecto[] = bruto.map(({ i, principal, w }) => { const p = porId.get(i.id)!; return { iniId: i.id, name: i.name, principal, peso: w / total, confianza: p.confianza, avance: p.avance, esperado: p.esperado, nivel: p.nivel }; });
    for (const f of filas) (pesos[f.iniId] ??= []).push({ code: k.code, peso: f.peso });
    const conSenal = filas.filter((f) => f.confianza !== null), wSenal = conSenal.reduce((a, f) => a + f.peso, 0);
    const conPlan = filas.filter((f) => f.avance !== null), wPlan = conPlan.reduce((a, f) => a + f.peso, 0);
    const confianza = wSenal ? Math.round(conSenal.reduce((a, f) => a + f.peso * f.confianza!, 0) / wSenal) : null;
    const avance = wPlan ? r1(conPlan.reduce((a, f) => a + f.peso * f.avance!, 0) / wPlan) : null;
    const esperado = wPlan ? r1(conPlan.reduce((a, f) => a + f.peso * f.esperado!, 0) / wPlan) : null;
    const factores: KrFactor[] = filas.flatMap((f) => porId.get(f.iniId)!.factores.map((x) => ({ ...x, iniId: f.iniId, iniName: f.name, puntosKr: r1(x.puntos * (wSenal ? f.peso / wSenal : f.peso)) })))
      .filter((x) => x.puntosKr !== 0).sort((a, b) => Math.abs(b.puntosKr) - Math.abs(a.puntosKr));
    krs.push({ code: k.code, name: k.name, unit: k.unit, objetivo: k.cmi, ...(k.due ? { due: k.due } : {}), medido: krMedido(k), proyectos: filas.sort((a, b) => b.peso - a.peso), cobertura: r1(wSenal),
      avance, esperado, ritmo: avance !== null && esperado !== null ? r1(avance - esperado) : null, confianza, nivel: nivelDe(confianza), factores });
  }
  // primero lo que más preocupa: en contra, en observación, a favor, sin señal
  const orden: Record<Nivel, number> = { EN_CONTRA: 0, EN_OBSERVACION: 1, A_FAVOR: 2, SIN_SENAL: 3 };
  krs.sort((a, b) => orden[a.nivel] - orden[b.nivel] || (a.confianza ?? 101) - (b.confianza ?? 101) || a.code.localeCompare(b.code));
  return { hoy, proyectos, krs, sinKr: proyectos.filter((p) => !p.krs.length).map((p) => p.iniId), pesos };
}

/* ═══ Movimientos: cada cambio registrado y su efecto ═══ */

export type TipoMovimiento = "GASTO" | "TAREA_CERRADA" | "ENTREGABLE_CUMPLIDO" | "TAREA_REABIERTA" | "TAREA_BLOQUEADA" | "TAREA_DESBLOQUEADA" | "TAREA_AVANZA" | "FECHA_CORRIDA" | "FECHA_ADELANTADA"
  | "EVIDENCIA" | "TAREA_NUEVA" | "TAREA_ARCHIVADA" | "RIESGO_NUEVO" | "RIESGO_CERRADO" | "RIESGO_MATERIALIZADO" | "RIESGO_EN_MITIGACION" | "RIESGO_REABIERTO" | "RIESGO_CAMBIA" | "OTRO";
export type Movimiento = {
  id: string; at: string; actor: string; iniId: string; iniName: string; refId: string; refTitulo: string;
  tipo: TipoMovimiento; texto: string; puntos: number;                // efecto sobre la confianza del proyecto (con signo)
  krs: { code: string; puntos: number }[];                             // el mismo efecto llevado a cada resultado clave, según el peso del proyecto
};
export const EFECTO = {
  tareaCerrada: 2, entregableCumplido: 5, tareaReabierta: -3, bloqueo: -5, desbloqueo: 5, avanza: 1,
  fechaCorrida: { diasPorPunto: 5, tope: 8 }, fechaAdelantada: { diasPorPunto: 7, tope: 4 }, evidencia: 1,
} as const;

type Evento = { id: string | number; at: string; actor: string; entityId: string; change: string };
const REF = /^(T|RG|GS)-(.+)-\d+$/;   // tarea, riesgo o gasto de un proyecto: «T-i3-02», «RG-in06-01»

/** Clasifica los eventos de la auditoría que son de tareas o de riesgos de un proyecto y les asigna su efecto. */
export function movimientos(eventos: Evento[], v: TenantView, risks: ProjectRisk[], pesos: Impacto["pesos"]): Movimiento[] {
  const out: Movimiento[] = [];
  for (const e of eventos) {
    const m = REF.exec(e.entityId); if (!m) continue;
    const esRiesgo = m[1] === "RG", iniId = m[2];
    const ini = v.initiatives.find((i) => i.id === iniId); if (!ini) continue;
    const tarea = esRiesgo ? null : v.tasks.find((t) => t.id === e.entityId), riesgo = esRiesgo ? risks.find((r) => r.id === e.entityId) : null;
    const titulo = tarea?.title ?? riesgo?.title ?? /«([^»]+)»/.exec(e.change)?.[1] ?? e.entityId;
    const partes: { tipo: TipoMovimiento; texto: string; puntos: number }[] = [];
    const sevActual = Number(/severidad (\d+)\s*$/.exec(e.change)?.[1] ?? (riesgo ? severidad(riesgo) : 0));
    const porSev = (factor: number) => r1((sevActual / 25) * factor);
    for (const seg of e.change.split(" · ").map((x) => x.trim())) {
      let x: RegExpExecArray | null;
      if ((x = /^estado (\w+) → (\w+)$/.exec(seg))) {
        const [, de, a] = x;
        if (esRiesgo) {
          if (a === "CERRADO") partes.push({ tipo: "RIESGO_CERRADO", texto: "Riesgo cerrado", puntos: porSev(REGLAS.riesgos[de as RiskStatus] ?? REGLAS.riesgos.ABIERTO) });
          else if (a === "MATERIALIZADO") partes.push({ tipo: "RIESGO_MATERIALIZADO", texto: "El riesgo se materializó", puntos: -porSev(REGLAS.riesgos.MATERIALIZADO - (REGLAS.riesgos[de as RiskStatus] ?? 0)) });
          else if (a === "EN_MITIGACION") partes.push({ tipo: "RIESGO_EN_MITIGACION", texto: "Riesgo en mitigación", puntos: porSev((REGLAS.riesgos[de as RiskStatus] ?? REGLAS.riesgos.ABIERTO) - REGLAS.riesgos.EN_MITIGACION) });
          else if (a === "ABIERTO") partes.push({ tipo: "RIESGO_REABIERTO", texto: "Riesgo reabierto", puntos: -porSev(REGLAS.riesgos.ABIERTO - (REGLAS.riesgos[de as RiskStatus] ?? 0)) });
        } else if (a === "HECHA") partes.push(tarea?.requiresEvidence ? { tipo: "ENTREGABLE_CUMPLIDO", texto: "Entregable cumplido", puntos: EFECTO.entregableCumplido } : { tipo: "TAREA_CERRADA", texto: "Tarea cerrada", puntos: EFECTO.tareaCerrada });
        else if (a === "BLOQUEADA") partes.push({ tipo: "TAREA_BLOQUEADA", texto: "Tarea bloqueada", puntos: EFECTO.bloqueo });
        else if (de === "BLOQUEADA") partes.push({ tipo: "TAREA_DESBLOQUEADA", texto: "Tarea desbloqueada", puntos: EFECTO.desbloqueo });
        else if (de === "HECHA") partes.push({ tipo: "TAREA_REABIERTA", texto: "Tarea reabierta", puntos: EFECTO.tareaReabierta });
        else if (a === "EN_REVISION" || (de === "POR_HACER" && a === "EN_CURSO")) partes.push({ tipo: "TAREA_AVANZA", texto: a === "EN_REVISION" ? "Tarea a revisión" : "Tarea iniciada", puntos: EFECTO.avanza });
        else partes.push({ tipo: "OTRO", texto: "Tarea devuelta", puntos: -EFECTO.avanza });
      } else if ((x = /^compromiso (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2})$/.exec(seg))) {
        const d = diasEntre(x[1], x[2]);
        if (d > 0) partes.push({ tipo: "FECHA_CORRIDA", texto: `Fecha compromiso corrida ${pl(d, "día", "días")}`, puntos: -r1(clamp(d / EFECTO.fechaCorrida.diasPorPunto, 1, EFECTO.fechaCorrida.tope)) });
        else if (d < 0) partes.push({ tipo: "FECHA_ADELANTADA", texto: `Fecha compromiso adelantada ${pl(-d, "día", "días")}`, puntos: r1(clamp(-d / EFECTO.fechaAdelantada.diasPorPunto, 0.5, EFECTO.fechaAdelantada.tope)) });
      } else if ((x = /^reprogramación en cadena: ([+-]?\d+) días$/.exec(seg))) {
        const d = Number(x[1]);
        partes.push(d > 0 ? { tipo: "FECHA_CORRIDA", texto: `Reprogramación en cadena: ${pl(d, "día", "días")} más`, puntos: -r1(clamp(d / EFECTO.fechaCorrida.diasPorPunto, 1, EFECTO.fechaCorrida.tope)) }
          : { tipo: "FECHA_ADELANTADA", texto: `Reprogramación en cadena: ${pl(-d, "día", "días")} menos`, puntos: r1(clamp(-d / EFECTO.fechaAdelantada.diasPorPunto, 0.5, EFECTO.fechaAdelantada.tope)) });
      } else if (/^evidencia adjuntada/.test(seg)) partes.push({ tipo: "EVIDENCIA", texto: "Evidencia adjuntada", puntos: EFECTO.evidencia });
      else if (/^tarea creada/.test(seg)) partes.push({ tipo: "TAREA_NUEVA", texto: "Tarea nueva en el plan", puntos: 0 });
      else if (/^tarea archivada/.test(seg)) partes.push({ tipo: "TAREA_ARCHIVADA", texto: "Tarea archivada", puntos: 0 });
      else if ((x = /^(ejecución|compromiso) registrad[ao] por (.+)$/.exec(seg))) partes.push({ tipo: "GASTO", texto: `${x[1] === "ejecución" ? "Ejecución" : "Compromiso"} de presupuesto: ${x[2]}`, puntos: 0 });
      else if (/^movimiento de presupuesto eliminado/.test(seg)) partes.push({ tipo: "GASTO", texto: "Movimiento de presupuesto eliminado", puntos: 0 });
      else if (/^riesgo registrado/.test(seg)) partes.push({ tipo: "RIESGO_NUEVO", texto: "Riesgo nuevo", puntos: -porSev(REGLAS.riesgos.ABIERTO) });
      else if ((x = /^nivel (\d+) → (\d+)$/.exec(seg))) { const d = Number(x[1]) - Number(x[2]); if (d) partes.push({ tipo: "RIESGO_CAMBIA", texto: d > 0 ? `El riesgo baja de ${x[1]} a ${x[2]}` : `El riesgo sube de ${x[1]} a ${x[2]}`, puntos: r1((d / 25) * REGLAS.riesgos.ABIERTO) }); }
    }
    if (!partes.length) continue;
    const puntos = r1(partes.reduce((a, p) => a + p.puntos, 0));
    const principal = [...partes].sort((a, b) => Math.abs(b.puntos) - Math.abs(a.puntos))[0];
    const afectados = (riesgo?.krs?.length ? (pesos[iniId] ?? []).filter((k) => riesgo.krs!.includes(k.code)) : pesos[iniId]) ?? [];
    out.push({ id: String(e.id), at: e.at, actor: e.actor, iniId, iniName: ini.name, refId: e.entityId, refTitulo: titulo, tipo: principal.tipo, texto: partes.map((p) => p.texto).join(" · "), puntos,
      krs: afectados.map((k) => ({ code: k.code, puntos: r1(puntos * k.peso) })) });
  }
  return out;
}
