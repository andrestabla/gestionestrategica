"use client";

// Gestión de proyectos · tablero de impacto en resultados clave. Muestra cómo la ejecución de los
// proyectos (avance, entregables, atrasos, bloqueos, riesgos, fechas corridas) empuja o frena cada
// resultado clave: avance ejecutado frente al esperado, confianza de entrega con los factores que la
// suben o la bajan, y los movimientos recientes con su efecto. La lectura la calcula el servidor
// (src/lib/impacto-kr.ts); aquí solo se dibuja. Con un proyecto elegido, se centra en él.

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardHeader, EmptyNote, Skeleton } from "@/components/ui";
import { NIVEL, REGLAS, EFECTO, type Impacto, type KrImpacto, type PulsoProyecto, type Movimiento, type Factor, type Nivel } from "@/lib/impacto-kr";
import { NIVEL_RIESGO, nivelRiesgo, severidad, riskStatusLabel, riesgoVivo, type ProjectRisk } from "@/lib/riesgos";
import { ESTADO_PRESUPUESTO, REGLAS_PRESUPUESTO, dinero, type Gasto } from "@/lib/presupuesto";
import { Wallet, Flag, ArrowDownRight, ArrowUpRight, Minus, Target, ChevronRight, CalendarClock, ShieldAlert, Activity, Info, TrendingUp, TrendingDown } from "lucide-react";

export type ImpactoData = Impacto & {
  movimientos: Movimiento[]; riesgos: ProjectRisk[]; gastos: Gasto[]; editable: Record<string, boolean>;
  personas: { id: string; name: string; cargo: string }[]; responsables: Record<string, string>;
};

/** Lee el tablero de impacto; se vuelve a leer cuando cambia `rev` (algo se guardó en el plan). */
export function useImpacto(rev: number) {
  const [data, setData] = useState<ImpactoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/td/proyectos/impacto", { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => null); if (!vivo) return; if (r.ok) { setData(j); setError(null); } else setError(j?.error ?? `Error ${r.status}`); })
      .catch(() => { if (vivo) setError("No se pudo conectar con el servidor."); });
    return () => { vivo = false; };
  }, [rev]);
  return { data, error };
}

const f0 = (n: number) => Math.round(n).toLocaleString("es-CO");
const f1 = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
const signo = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f1(Math.abs(n))}`;
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${Number(d)} ${MES[Number(m) - 1]} ${y.slice(2)}`; };
const hace = (iso: string) => { const min = Math.round((Date.now() - Date.parse(iso)) / 60_000); return min < 1 ? "ahora" : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.round(min / 60)} h` : min < 43_200 ? `hace ${Math.round(min / 1440)} d` : dia(iso); };
const tinte = (c: string, p = 12) => `color-mix(in srgb, ${c} ${p}%, var(--surface))`;

function ChipNivel({ nivel, valor }: { nivel: Nivel; valor?: number | null }) {
  const n = NIVEL[nivel];
  return <span className={`chip ${n.chip}`} title={n.desc}><i className="h-2 w-2 rounded-full" style={{ background: n.color }} />{n.label}{valor != null ? <b className="num ml-1">{valor}</b> : null}</span>;
}
/** Efecto con signo: verde a favor, rojo en contra. */
function Efecto({ puntos, sufijo = "" }: { puntos: number; sufijo?: string }) {
  const c = puntos > 0 ? "var(--ok)" : puntos < 0 ? "var(--bad)" : "var(--faint)";
  const Icon = puntos > 0 ? ArrowUpRight : puntos < 0 ? ArrowDownRight : Minus;
  return <span className="num inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-extrabold" style={{ background: tinte(c, 14), color: c }} title={puntos > 0 ? "A favor" : puntos < 0 ? "En contra" : "Sin efecto"}><Icon size={12} />{signo(puntos)}{sufijo}</span>;
}
/** Avance ejecutado (barra) con la marca de lo esperado a la fecha. */
function BarraAvance({ avance, esperado, color = "var(--navy)", alto = 10 }: { avance: number | null; esperado: number | null; color?: string; alto?: number }) {
  return (
    <div className="relative w-full rounded-full bg-surface-3" style={{ height: alto }} role="img" aria-label={avance === null ? "Sin plan de trabajo" : `Avance ${f0(avance)} % de ${f0(esperado ?? 0)} % esperado`}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, avance ?? 0))}%`, background: color }} />
      {esperado !== null && <span className="absolute top-[-3px] h-[calc(100%+6px)] w-[2px] rounded bg-ink" style={{ left: `calc(${Math.max(0, Math.min(100, esperado))}% - 1px)` }} title={`Esperado a la fecha: ${f0(esperado)} %`} />}
    </div>
  );
}
/** Factores en barras divergentes: a la izquierda lo que frena, a la derecha lo que empuja. */
function Divergente({ filas }: { filas: { clave: string; titulo: string; sub?: string; puntos: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => Math.abs(f.puntos)));
  return (
    <ul className="space-y-2">
      {filas.map((f) => { const w = (Math.abs(f.puntos) / max) * 100, pos = f.puntos > 0, c = pos ? "var(--ok)" : "var(--bad)"; return (
        <li key={f.clave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <div className="min-w-0"><div className="truncate text-[12.5px] font-semibold text-ink">{f.titulo}</div>{f.sub && <div className="truncate text-[12px] text-muted">{f.sub}</div>}</div>
          <Efecto puntos={f.puntos} />
          <div className="col-span-2 grid grid-cols-2 gap-px" aria-hidden>
            <div className="flex justify-end">{!pos && <div className="h-1.5 rounded-l-full" style={{ width: `${w}%`, background: c }} />}</div>
            <div className="border-l border-line-strong">{pos && <div className="h-1.5 rounded-r-full" style={{ width: `${w}%`, background: c }} />}</div>
          </div>
        </li>
      ); })}
    </ul>
  );
}
function Dato({ label, valor, pie, color, icono: Icon }: { label: string; valor: ReactNode; pie?: ReactNode; color?: string; icono?: typeof Target }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="label flex items-center gap-1.5">{Icon && <Icon size={13} />}{label}</div>
      <div className="num mt-2 text-[28px] font-extrabold leading-none text-ink" style={color ? { color } : undefined}>{valor}</div>
      {pie && <div className="mt-2 text-[12px] leading-snug text-muted">{pie}</div>}
    </Card>
  );
}

/* ═══ Tarjeta de un resultado clave ═══ */
function TarjetaKr({ k, foco, onOpenIni }: { k: KrImpacto; foco?: string | null; onOpenIni: (id: string) => void }) {
  const n = NIVEL[k.nivel], m = k.medido;
  const Tend = m.tendencia === "MEJORA" ? TrendingUp : m.tendencia === "EMPEORA" ? TrendingDown : Minus;
  const factores = k.factores.slice(0, 5).map((f, i) => ({ clave: `${f.iniId}-${f.clave}-${i}`, titulo: f.titulo, sub: k.proyectos.length > 1 ? f.iniName : f.detalle, puntos: f.puntosKr }));
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 py-4" style={{ background: tinte(n.color, 5) }}>
        <div className="min-w-0 flex-1">
          <div className="num text-[12px] font-extrabold text-cyan-deep">{k.code}{k.due ? <span className="font-medium text-faint"> · plazo {k.due}</span> : null}</div>
          <div className="mt-0.5 text-[14.5px] font-extrabold leading-snug text-ink">{k.name}</div>
        </div>
        <ChipNivel nivel={k.nivel} />
      </div>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
        <div>
          <div className="label">Medido</div>
          {m.valor === null ? <p className="mt-1.5 text-[12.5px] text-muted">Sin dato reportado. Meta {f1(m.meta)} {k.unit}.</p> : (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5"><span className="num whitespace-nowrap text-[20px] font-extrabold text-ink">{f1(m.valor)}</span><span className="text-[12px] text-muted">{k.unit} · meta {f1(m.meta)}</span></div>
              <div className="mt-1.5"><BarraAvance avance={m.avance} esperado={null} color="var(--cyan-fill)" alto={6} /></div>
              <div className="mt-1 flex items-center gap-1 text-[12px] text-muted"><Tend size={12} style={{ color: m.tendencia === "MEJORA" ? "var(--ok)" : m.tendencia === "EMPEORA" ? "var(--bad)" : "var(--faint)" }} />{f0(m.avance ?? 0)} % del tramo a la meta · {m.periodo}</div>
            </>
          )}
        </div>
        <div>
          <div className="label">Ejecución que lo mueve</div>
          {k.avance === null ? <p className="mt-1.5 text-[12.5px] text-muted">Sus proyectos aún no tienen plan de trabajo.</p> : (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5"><span className="num whitespace-nowrap text-[20px] font-extrabold text-ink">{f0(k.avance)} %</span><span className="whitespace-nowrap text-[12px] text-muted">de {f0(k.esperado ?? 0)} % esperado</span></div>
              <div className="mt-2"><BarraAvance avance={k.avance} esperado={k.esperado} /></div>
              <div className="mt-1.5 text-[12px]" style={{ color: (k.ritmo ?? 0) <= -REGLAS.ritmo.tolerancia ? "var(--bad)" : (k.ritmo ?? 0) >= REGLAS.ritmo.tolerancia ? "var(--ok)" : "var(--muted)" }}>
                {(k.ritmo ?? 0) <= -REGLAS.ritmo.tolerancia ? `${f0(Math.abs(k.ritmo!))} puntos por debajo del plan` : (k.ritmo ?? 0) >= REGLAS.ritmo.tolerancia ? `${f0(k.ritmo!)} puntos por encima del plan` : "Al ritmo del plan"}
              </div>
            </>
          )}
        </div>
        <div>
          <div className="label">Confianza de entrega</div>
          <div className="mt-1 flex items-baseline gap-1.5"><span className="num text-[28px] font-extrabold leading-none" style={{ color: n.color }}>{k.confianza ?? "—"}</span><span className="text-[12px] text-muted">{k.confianza === null ? "sin señal" : "de 100"}</span></div>
          {k.cobertura < 1 && <p className="mt-1.5 text-[12px] leading-snug text-warn">{f0((1 - k.cobertura) * 100)} % del peso está en proyectos sin plan de trabajo: la lectura es parcial.</p>}
        </div>
      </div>
      {factores.length > 0 && (
        <div className="border-t border-line px-5 py-4">
          <div className="label mb-2.5">Qué lo empuja y qué lo frena · puntos de confianza</div>
          <Divergente filas={factores} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface-2/50 px-5 py-3">
        <span className="text-[12px] font-semibold text-muted">Lo {k.proyectos.length === 1 ? "mueve" : "mueven"}:</span>
        {k.proyectos.map((p) => (
          <button key={p.iniId} type="button" onClick={() => onOpenIni(p.iniId)} title={`${p.name} · ${p.principal ? "resultado clave principal" : "resultado clave adicional"} · pesa ${f0(p.peso * 100)} %`}
            className={`inline-flex max-w-[260px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors hover:text-cyan-deep ${foco === p.iniId ? "bg-navy text-white hover:text-white" : "bg-surface text-ink-soft shadow-[var(--e1)]"}`}>
            <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: NIVEL[p.nivel].color }} /><span className="truncate">{p.name}</span><span className="num shrink-0 opacity-70">{f0(p.peso * 100)} %</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ═══ Movimientos ═══ */
function ListaMovimientos({ ms, conProyecto, onOpenTask }: { ms: Movimiento[]; conProyecto: boolean; onOpenTask: (id: string) => void }) {
  if (!ms.length) return <div className="px-5 py-5"><EmptyNote>Aún no hay movimientos registrados. Cada cierre de tarea, bloqueo, cambio de fecha o riesgo aparece aquí con su efecto.</EmptyNote></div>;
  return (
    <ul className="divide-y divide-line">
      {ms.map((m) => { const esTarea = m.refId.startsWith("T-"); return (
        <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-5 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-snug text-ink">{m.texto}</div>
            <div className="mt-0.5 text-[12px] leading-snug text-muted">
              {esTarea ? <button type="button" onClick={() => onOpenTask(m.refId)} className="text-left font-semibold text-ink-soft hover:text-cyan-deep hover:underline">{m.refTitulo}</button> : <span className="font-semibold text-ink-soft">{m.refTitulo}</span>}
              {conProyecto && <> · {m.iniName}</>} · {m.actor} · {hace(m.at)}
            </div>
            {m.puntos !== 0 && m.krs.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{m.krs.map((k) => <span key={k.code} className="num inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11.5px] text-ink-soft"><b>{k.code}</b><span style={{ color: k.puntos > 0 ? "var(--ok)" : "var(--bad)" }}>{signo(k.puntos)}</span></span>)}</div>
            )}
          </div>
          <Efecto puntos={m.puntos} />
        </li>
      ); })}
    </ul>
  );
}

/* ═══ Cómo se calcula ═══ */
function ComoSeCalcula() {
  const R = REGLAS;
  return (
    <details className="group rounded-2xl bg-surface shadow-[var(--e1)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[13px] font-bold text-ink"><Info size={15} className="text-cyan-deep" /> Cómo se calcula esta lectura <ChevronRight size={14} className="ml-auto text-faint transition-transform group-open:rotate-90" /></summary>
      <div className="grid gap-5 border-t border-line px-5 py-4 text-[12.5px] leading-relaxed text-ink-soft md:grid-cols-2">
        <div className="space-y-2">
          <p><b className="text-ink">Es una lectura de la ejecución, no una medición del resultado.</b> El valor «medido» de cada resultado clave viene de sus reportes; lo demás dice si el trabajo que debería moverlo va como se planeó.</p>
          <p><b className="text-ink">Avance ejecutado.</b> Promedio del trabajo de las tareas: hecha {f0(R.credito.HECHA * 100)} %, en revisión {f0(R.credito.EN_REVISION * 100)} %, en curso {f0(R.credito.EN_CURSO * 100)} %, bloqueada {f0(R.credito.BLOQUEADA * 100)} %, por hacer 0 %. El <b>esperado</b> es lo que debería ir a la fecha según el inicio y el compromiso de cada tarea.</p>
          <p><b className="text-ink">Del proyecto al resultado clave.</b> Un proyecto pesa {R.pesoPrincipal} en su resultado clave principal y {f1(R.pesoAdicional)} en los adicionales; el peso se reparte entre los proyectos que mueven el mismo resultado.</p>
          <p><b className="text-ink">Niveles.</b> A favor desde {R.niveles.aFavor}, en observación desde {R.niveles.enObservacion}, en contra por debajo.</p>
        </div>
        <div>
          <p className="mb-1.5"><b className="text-ink">Confianza de entrega.</b> Parte de 100 y cada señal suma o resta:</p>
          <ul className="space-y-1">
            <li>· Ritmo: −{f1(R.ritmo.porPuntoAtraso)} por punto de atraso frente al plan (hasta −{R.ritmo.topeAtraso}); +{f1(R.ritmo.porPuntoAdelanto)} por punto de adelanto (hasta +{R.ritmo.topeAdelanto}).</li>
            <li>· Tareas vencidas: −{R.vencidas.porTarea} por tarea y −{f1(R.vencidas.porDia)} por día de atraso (hasta −{R.vencidas.tope}).</li>
            <li>· Tareas bloqueadas: −{R.bloqueadas.porTarea} por tarea (hasta −{R.bloqueadas.tope}).</li>
            <li>· Entregables e hitos atrasados: −{R.entregablesAtrasados.porEntregable} adicionales por cada uno (hasta −{R.entregablesAtrasados.tope}).</li>
            <li>· Entregables e hitos cumplidos: +{f1(R.entregablesCumplidos.porEntregable)} por cada uno (hasta +{R.entregablesCumplidos.tope}).</li>
            <li>· Riesgos: severidad ÷ 25 × {R.riesgos.ABIERTO} si está abierto, × {R.riesgos.EN_MITIGACION} en mitigación, × {R.riesgos.MATERIALIZADO} materializado (hasta −{R.riesgos.tope}).</li>
            <li>· Fin previsto: −1 por cada {R.finPrevisto.diasPorPunto} días que el fin del proyecto se corre según la ruta crítica (hasta −{R.finPrevisto.tope}).</li>
            <li>· Presupuesto: −{f1(R.presupuesto.porPuntoBrecha)} por cada punto que lo ejecutado va por encima del avance, desde {REGLAS_PRESUPUESTO.brechaMinima} puntos (hasta −{R.presupuesto.topeBrecha}); −{f1(R.presupuesto.porPuntoSobrecompromiso)} por cada punto que lo comprometido supera lo planeado (hasta −{R.presupuesto.topeSobrecompromiso}).</li>
            <li>· Cronograma corrido: −1 por cada {R.cronograma.diasPorPunto} días frente a la línea base (hasta −{R.cronograma.tope}).</li>
          </ul>
          <p className="mt-2"><b className="text-ink">Movimientos.</b> Cada cambio registrado lleva el efecto que tuvo al hacerse: entregable cumplido +{EFECTO.entregableCumplido}, tarea cerrada +{EFECTO.tareaCerrada}, bloqueo {EFECTO.bloqueo}, desbloqueo +{EFECTO.desbloqueo}, fecha corrida −1 por cada {EFECTO.fechaCorrida.diasPorPunto} días, y los riesgos según su severidad.</p>
        </div>
      </div>
    </details>
  );
}

/* ═══ Vista ═══ */
export function ImpactoView({ iniId, rev, onOpenIni, onOpenTask, onVer }: { iniId: string | null; rev: number; onOpenIni: (id: string | null) => void; onOpenTask: (id: string) => void; onVer: (v: "tablero" | "riesgos" | "presupuesto") => void }) {
  const { data, error } = useImpacto(rev);
  if (error) return <EmptyNote>{error}</EmptyNote>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>;
  const p = iniId ? data.proyectos.find((x) => x.iniId === iniId) ?? null : null;
  return p ? <DeProyecto data={data} p={p} onOpenIni={onOpenIni} onOpenTask={onOpenTask} onVer={onVer} /> : <DePortafolio data={data} onOpenIni={onOpenIni} onOpenTask={onOpenTask} onVer={onVer} />;
}

function DePortafolio({ data, onOpenIni, onOpenTask, onVer }: { data: ImpactoData; onOpenIni: (id: string | null) => void; onOpenTask: (id: string) => void; onVer: (v: "tablero" | "riesgos" | "presupuesto") => void }) {
  const conSenal = data.proyectos.filter((p) => p.confianza !== null), conPlan = data.proyectos.filter((p) => p.avance !== null);
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const confianza = media(conSenal.map((p) => p.confianza!)), avance = media(conPlan.map((p) => p.avance!)), esperado = media(conPlan.map((p) => p.esperado!));
  const porNivel = (n: Nivel) => data.krs.filter((k) => k.nivel === n).length;
  const vivos = data.riesgos.filter(riesgoVivo), altos = vivos.filter((r) => severidad(r) >= 15).length;
  const nivelGlobal: Nivel = confianza === null ? "SIN_SENAL" : confianza >= REGLAS.niveles.aFavor ? "A_FAVOR" : confianza >= REGLAS.niveles.enObservacion ? "EN_OBSERVACION" : "EN_CONTRA";
  const proyectos = [...data.proyectos].sort((a, b) => (a.confianza ?? 101) - (b.confianza ?? 101) || a.name.localeCompare(b.name));
  if (!conSenal.length) return (
    <div className="space-y-5">
      <Card className="p-6 sm:p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-wash)] text-[var(--gold)]"><Activity size={20} /></span>
        <h3 className="mt-4 text-[18px] font-extrabold text-ink">Aún no hay ejecución que leer</h3>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-soft">Este tablero muestra cómo cada movimiento de los proyectos empuja o frena los resultados clave. Para que tenga señal, los proyectos necesitan su plan de trabajo (tareas con inicio, compromiso y responsable) o riesgos registrados. Hay {data.proyectos.length} {data.proyectos.length === 1 ? "proyecto" : "proyectos"} y {data.krs.length} {data.krs.length === 1 ? "resultado clave con proyecto" : "resultados clave con proyecto"}.</p>
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => onVer("tablero")} className="btn-primary">Ir al tablero de tareas</button><button type="button" onClick={() => onVer("riesgos")} className="btn-ghost"><ShieldAlert size={14} /> Registrar un riesgo</button></div>
      </Card>
      <ComoSeCalcula />
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="rise grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato label="Confianza de entrega" icono={Target} valor={confianza === null ? "—" : f0(confianza)} color={NIVEL[nivelGlobal].color} pie={`${NIVEL[nivelGlobal].label} · promedio de ${conSenal.length} ${conSenal.length === 1 ? "proyecto" : "proyectos"} con señal`} />
        <Dato label="Avance ejecutado" icono={Activity} valor={avance === null ? "—" : `${f0(avance)} %`} pie={avance === null ? "Sin plan de trabajo" : <>{f0(esperado!)} % esperado a la fecha · {Math.abs(avance - esperado!) < REGLAS.ritmo.tolerancia ? "al ritmo del plan" : avance < esperado! ? <b style={{ color: "var(--bad)" }}>{f0(esperado! - avance)} puntos por debajo</b> : <b style={{ color: "var(--ok)" }}>{f0(avance - esperado!)} puntos por encima</b>}</>} />
        <Dato label="Resultados clave" icono={TrendingUp} valor={data.krs.length} pie={<span className="flex flex-wrap gap-x-2">{(["A_FAVOR", "EN_OBSERVACION", "EN_CONTRA", "SIN_SENAL"] as Nivel[]).filter((n) => porNivel(n)).map((n) => <span key={n} className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: NIVEL[n].color }} />{porNivel(n)} {NIVEL[n].label.toLowerCase()}</span>)}</span>} />
        <Dato label="Riesgos abiertos" icono={ShieldAlert} valor={vivos.length} color={altos ? "var(--bad)" : undefined} pie={vivos.length ? `${altos} de nivel alto · ${vivos.filter((r) => r.status === "MATERIALIZADO").length} materializados` : "Ninguno registrado"} />
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Cómo mueve la ejecución cada resultado clave</h2><p className="text-[12.5px] text-muted">Primero los que la ejecución está frenando. Lectura al {dia(data.hoy)}.</p></div></div>
        {data.krs.length ? <div className="grid gap-5 xl:grid-cols-2">{data.krs.map((k) => <TarjetaKr key={k.code} k={k} onOpenIni={onOpenIni} />)}</div>
          : <Card className="p-5"><EmptyNote>Ningún proyecto está asociado a un resultado clave todavía.</EmptyNote></Card>}
      </section>

      <Card className="overflow-hidden">
        <CardHeader title={`Proyectos (${data.proyectos.length})`} sub="de menor a mayor confianza · la marca negra es el avance esperado a la fecha" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-[12.5px]">
            <thead><tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.08em] text-faint"><th className="px-5 py-2.5">Proyecto</th><th className="px-3 py-2.5">Resultados clave</th><th className="px-3 py-2.5">Avance</th><th className="px-3 py-2.5">Confianza</th><th className="px-3 py-2.5">Señales</th><th className="px-3 py-2.5">Próximo compromiso</th></tr></thead>
            <tbody>{proyectos.map((p) => <FilaProyecto key={p.iniId} p={p} responsables={data.responsables} onOpen={() => onOpenIni(p.iniId)} />)}</tbody>
          </table>
        </div>
        {data.sinKr.length > 0 && <p className="border-t border-line px-5 py-3 text-[12px] text-muted">{data.sinKr.length} {data.sinKr.length === 1 ? "proyecto no está asociado" : "proyectos no están asociados"} a ningún resultado clave: su ejecución se sigue aquí, pero no entra a la lectura de los resultados.</p>}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Movimientos recientes" sub="cada cambio registrado y el efecto que tuvo sobre la confianza del proyecto y de sus resultados clave" />
        <ListaMovimientos ms={data.movimientos.slice(0, 20)} conProyecto onOpenTask={onOpenTask} />
      </Card>
      <ComoSeCalcula />
    </div>
  );
}

function FilaProyecto({ p, responsables, onOpen }: { p: PulsoProyecto; responsables: Record<string, string>; onOpen: () => void }) {
  return (
    <tr className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/60" onClick={onOpen}>
      <td className="px-5 py-3"><div className="max-w-[300px] font-bold leading-snug text-ink">{p.name}</div><div className="num text-[12px] text-faint">{p.iniId} · {responsables[p.ownerId] ?? "sin sponsor"}</div></td>
      <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{p.krs.length ? p.krs.map((k) => <span key={k} className="chip num !py-0 text-[11px]">{k}</span>) : <span className="text-faint">—</span>}</div></td>
      <td className="w-[190px] px-3 py-3">{p.avance === null ? <span className="text-faint">Sin plan de trabajo</span> : <><BarraAvance avance={p.avance} esperado={p.esperado} alto={8} /><div className="num mt-1 text-[12px] text-muted">{f0(p.avance)} % · esperado {f0(p.esperado!)} %</div></>}</td>
      <td className="px-3 py-3"><ChipNivel nivel={p.nivel} valor={p.confianza} /></td>
      <td className="px-3 py-3"><div className="flex flex-wrap gap-1 text-[11.5px]">
        {p.tareas.vencidas > 0 && <span className="chip chip-bad !py-0">{p.tareas.vencidas} vencidas</span>}
        {p.tareas.bloqueadas > 0 && <span className="chip chip-warn !py-0">{p.tareas.bloqueadas} bloqueadas</span>}
        {p.riesgos.vivos > 0 && <span className={`chip !py-0 ${p.riesgos.altos ? "chip-bad" : "chip-warn"}`}>{p.riesgos.vivos} {p.riesgos.vivos === 1 ? "riesgo" : "riesgos"}</span>}
        {p.entregables.total > 0 && <span className="chip !py-0">{p.entregables.cumplidos}/{p.entregables.total} entregables</span>}
        {(p.presupuesto.estado === "ALERTA" || p.presupuesto.estado === "SOBRECOSTO") && <span className={`chip !py-0 ${ESTADO_PRESUPUESTO[p.presupuesto.estado].chip}`} title={ESTADO_PRESUPUESTO[p.presupuesto.estado].desc}>Presupuesto: {ESTADO_PRESUPUESTO[p.presupuesto.estado].label.toLowerCase()}</span>}
        {!p.tareas.vencidas && !p.tareas.bloqueadas && !p.riesgos.vivos && !p.entregables.total && <span className="text-faint">—</span>}
      </div></td>
      <td className="px-3 py-3">{p.proximo ? <div className="max-w-[220px]"><div className="truncate text-ink-soft">{p.proximo.title}</div><div className="num text-[12px] text-faint">{dia(p.proximo.due)}{p.proximo.hito ? " · hito" : p.proximo.entregable ? " · entregable" : ""}{p.fin && p.fin.desvio > 0 ? <span style={{ color: "var(--bad)" }}> · fin +{p.fin.desvio} d</span> : null}</div></div> : <span className="text-faint">—</span>}</td>
    </tr>
  );
}

function DeProyecto({ data, p, onOpenIni, onOpenTask, onVer }: { data: ImpactoData; p: PulsoProyecto; onOpenIni: (id: string | null) => void; onOpenTask: (id: string) => void; onVer: (v: "tablero" | "riesgos" | "presupuesto") => void }) {
  const n = NIVEL[p.nivel];
  const krs = data.krs.filter((k) => k.proyectos.some((x) => x.iniId === p.iniId));
  const riesgos = data.riesgos.filter((r) => r.iniId === p.iniId && riesgoVivo(r));
  const ms = data.movimientos.filter((m) => m.iniId === p.iniId).slice(0, 20);
  const filas = p.factores.map((f: Factor) => ({ clave: f.clave + f.titulo, titulo: f.titulo, sub: f.detalle, puntos: f.puntos }));
  return (
    <div className="space-y-6">
      <Card className="rise overflow-hidden">
        <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
            <div><div className="label">Confianza de entrega</div><div className="num mt-1 text-[46px] font-extrabold leading-none" style={{ color: n.color }}>{p.confianza ?? "—"}</div></div>
            <ChipNivel nivel={p.nivel} />
          </div>
          <div className="min-w-0">
            <div className="label">Avance del plan de trabajo</div>
            {p.avance === null ? <p className="mt-2 text-[13px] text-muted">Este proyecto no tiene tareas todavía. Su confianza sale solo de los riesgos registrados.</p> : (
              <>
                <div className="mt-1 flex items-baseline gap-2"><span className="num text-[26px] font-extrabold text-ink">{f0(p.avance)} %</span><span className="text-[12.5px] text-muted">ejecutado · {f0(p.esperado!)} % esperado al {dia(data.hoy)}</span></div>
                <div className="mt-2.5"><BarraAvance avance={p.avance} esperado={p.esperado} alto={12} /></div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] text-ink-soft sm:grid-cols-4">
                  <span><b className="num text-ink">{p.tareas.hechas}</b> de {p.tareas.total} hechas</span>
                  <span><b className="num" style={{ color: p.tareas.vencidas ? "var(--bad)" : undefined }}>{p.tareas.vencidas}</b> vencidas</span>
                  <span><b className="num" style={{ color: p.tareas.bloqueadas ? "var(--warn)" : undefined }}>{p.tareas.bloqueadas}</b> bloqueadas</span>
                  <span><b className="num text-ink">{p.entregables.cumplidos}</b> de {p.entregables.total} entregables</span>
                </div>
                {p.fin && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
                    <Flag size={13} /> Fin planeado <b className="num text-ink-soft">{dia(p.fin.planeado)}</b>
                    {p.fin.desvio > 0 ? <span className="chip chip-bad !py-0 text-[11px]" title="Con el estado de las tareas a la fecha y lo pendiente tardando lo planeado">previsto {dia(p.fin.previsto)} · +{p.fin.desvio} {p.fin.desvio === 1 ? "día" : "días"}</span> : <span className="chip chip-ok !py-0 text-[11px]">en fecha</span>}
                    <span>· {p.fin.criticasPendientes} {p.fin.criticasPendientes === 1 ? "tarea pendiente" : "tareas pendientes"} en la ruta crítica</span>
                    {p.fin.hitos > 0 && <span>· {p.fin.hitosCumplidos} de {p.fin.hitos} hitos</span>}
                  </p>
                )}
                {p.presupuesto.planeado > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
                    <Wallet size={13} /> Presupuesto <b className="num text-ink-soft">{dinero(p.presupuesto.planeado, p.presupuesto.moneda)}</b> · ejecutado {f0(p.presupuesto.pctEjecutado ?? 0)} %
                    <span className={`chip !py-0 text-[11px] ${ESTADO_PRESUPUESTO[p.presupuesto.estado].chip}`} title={ESTADO_PRESUPUESTO[p.presupuesto.estado].desc}>{ESTADO_PRESUPUESTO[p.presupuesto.estado].label}</span>
                    <button type="button" onClick={() => onVer("presupuesto")} className="font-semibold text-cyan-deep hover:underline">Ver presupuesto</button>
                  </p>
                )}
                {p.proximo && <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-muted"><CalendarClock size={13} /> Próximo{p.proximo.hito ? " hito" : ""}: <button type="button" onClick={() => onOpenTask(p.proximo!.id)} className="truncate font-semibold text-ink-soft hover:text-cyan-deep hover:underline">{p.proximo.title}</button> · {dia(p.proximo.due)}</p>}
              </>
            )}
          </div>
          <div className="min-w-0">
            <div className="label mb-2.5">Qué la sube y qué la baja · puntos</div>
            {filas.length ? <Divergente filas={filas} /> : <p className="text-[13px] text-muted">{p.confianza === null ? "Sin plan de trabajo ni riesgos: no hay señal todavía." : "Va al ritmo del plan, sin vencidas, bloqueos ni riesgos abiertos."}</p>}
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-[17px] font-extrabold tracking-[-0.01em] text-ink">{krs.length === 1 ? "Resultado clave que mueve" : `Resultados clave que mueve (${krs.length})`}</h2>
        {krs.length ? <div className="grid gap-5 xl:grid-cols-2">{krs.map((k) => <TarjetaKr key={k.code} k={k} foco={p.iniId} onOpenIni={onOpenIni} />)}</div>
          : <Card className="p-5"><EmptyNote>Este proyecto no está asociado a ningún resultado clave{p.categoria ? " (está mapeado como proyecto especial o iniciativa disruptiva)" : ""}: su ejecución se sigue aquí, pero no mueve ninguna lectura de resultados.</EmptyNote></Card>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={`Riesgos abiertos (${riesgos.length})`} sub="lo que puede frenar el proyecto y sus resultados" right={<button type="button" onClick={() => onVer("riesgos")} className="btn-ghost btn-sm text-[12px]">Ver registro</button>} />
          {riesgos.length ? <ul className="divide-y divide-line">{riesgos.slice(0, 5).map((r) => { const nv = NIVEL_RIESGO[nivelRiesgo(severidad(r))]; return (
            <li key={r.id} className="flex items-start gap-3 px-5 py-3"><span className="num grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12.5px] font-extrabold text-white" style={{ background: nv.color }} title={`Severidad ${severidad(r)} · ${nv.label}`}>{severidad(r)}</span>
              <div className="min-w-0"><div className="text-[13px] font-semibold leading-snug text-ink">{r.title}</div><div className="text-[12px] text-muted">{riskStatusLabel(r.status)}{r.due ? ` · respuesta al ${dia(r.due)}` : ""}</div></div></li>
          ); })}</ul> : <div className="px-5 py-5"><EmptyNote>Sin riesgos abiertos en este proyecto.</EmptyNote></div>}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Movimientos del proyecto" sub="cada cambio y su efecto sobre la confianza" />
          <ListaMovimientos ms={ms} conProyecto={false} onOpenTask={onOpenTask} />
        </Card>
      </div>
      <ComoSeCalcula />
    </div>
  );
}
