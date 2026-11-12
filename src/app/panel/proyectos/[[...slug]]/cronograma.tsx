"use client";

// Gestión de proyectos · cronograma. Barras con precisión de día, hitos como rombos, la ruta
// crítica resaltada, la holgura de las tareas que no son críticas, las dependencias como líneas,
// la línea base cuando la tarea se corrió, el fin previsto de cada proyecto y la línea de hoy.
// La ruta crítica y el fin previsto se calculan con todas las tareas del proyecto (src/lib/ruta-critica.ts),
// aunque aquí se muestre solo una parte por los filtros.

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { TASK_STATUS_META, diasEntre, vencida, type Task, type TaskStatus } from "@/data/proyectos";
import { rutaCritica, sumarDias, type RutaCritica } from "@/lib/ruta-critica";
import { Flag, GitBranch, Diamond } from "lucide-react";

const FILA = 30, MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MES[Number(m) - 1]} ${y.slice(2)}`; };
const ESTADOS: TaskStatus[] = ["POR_HACER", "EN_CURSO", "EN_REVISION", "BLOQUEADA", "HECHA"];

export function Cronograma({ proyectos, tasks, todas, hoy, baselines, onOpenTask }: {
  proyectos: { id: string; name: string }[]; tasks: Task[]; todas: Task[]; hoy: string;
  baselines: Record<string, { start: string; due: string } | null>; onOpenTask: (id: string) => void;
}) {
  const [verDeps, setVerDeps] = useState(true), [soloCritica, setSoloCritica] = useState(false);
  const rutas = useMemo(() => Object.fromEntries(proyectos.map((p) => [p.id, rutaCritica(todas.filter((t) => t.iniId === p.id), hoy)])) as Record<string, RutaCritica>, [proyectos, todas, hoy]);
  const grupos = proyectos.map((p) => ({ p, ruta: rutas[p.id], filas: tasks.filter((t) => t.iniId === p.id && (!soloCritica || rutas[p.id].nodos[t.id]?.critica)).sort((a, b) => a.start.localeCompare(b.start) || a.due.localeCompare(b.due)) })).filter((g) => g.filas.length);

  // escala: del primer inicio (o línea base) al último fin (planeado, previsto o línea base), en meses completos
  const fechas = [hoy, ...grupos.flatMap((g) => [...(g.ruta.finPrevisto ? [g.ruta.finPrevisto] : []), ...g.filas.flatMap((t) => [t.start, t.due, baselines[t.id]?.start ?? t.start, baselines[t.id]?.due ?? t.due, sumarDias(t.due, Math.max(0, g.ruta.nodos[t.id]?.holgura ?? 0))])])];
  const min = fechas.reduce((a, b) => (a < b ? a : b)), max = fechas.reduce((a, b) => (a > b ? a : b));
  const desde = `${min.slice(0, 7)}-01`;
  const [fy, fm] = max.split("-").map(Number);
  const hasta = new Date(Date.UTC(fy, fm, 0)).toISOString().slice(0, 10);   // último día del mes del fin
  const total = diasEntre(desde, hasta) + 1;
  const x = (iso: string) => (diasEntre(desde, iso) / total) * 100;        // inicio del día, en %
  const meses: { key: string; label: string; left: number; width: number }[] = [];
  for (let d = desde; d <= hasta;) {
    const [y, m] = d.split("-").map(Number), fin = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    meses.push({ key: d, label: `${MES[m - 1]}${m === 1 || d === desde ? ` ${String(y).slice(2)}` : ""}`, left: x(d), width: ((diasEntre(d, fin) + 1) / total) * 100 });
    d = sumarDias(fin, 1);
  }
  const anchoMin = Math.max(900, 260 + meses.length * 92);

  if (!grupos.length) return <Card className="p-6 text-[13px] text-muted">{soloCritica ? "Ninguna de las tareas visibles está en la ruta crítica." : "No hay tareas que mostrar en el cronograma."}{soloCritica && <button type="button" onClick={() => setSoloCritica(false)} className="ml-2 font-semibold text-cyan-deep underline">Ver todas</button>}</Card>;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-[12.5px]">
        <label className="flex cursor-pointer items-center gap-1.5 text-ink-soft"><input type="checkbox" checked={soloCritica} onChange={(e) => setSoloCritica(e.target.checked)} /> <Flag size={13} /> Solo la ruta crítica</label>
        <label className="flex cursor-pointer items-center gap-1.5 text-ink-soft"><input type="checkbox" checked={verDeps} onChange={(e) => setVerDeps(e.target.checked)} /> <GitBranch size={13} /> Dependencias</label>
        <span className="text-faint sm:ml-auto">Hoy: {dia(hoy)} · clic en una barra para abrir la tarea</span>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: anchoMin }}>
          {/* escala de meses */}
          <div className="grid border-b border-line" style={{ gridTemplateColumns: "260px minmax(0,1fr)" }}>
            <div />
            <div className="relative h-8">
              {meses.map((m) => <div key={m.key} className="num absolute top-0 flex h-full items-center border-l border-line pl-2 text-[11px] font-bold uppercase tracking-[0.06em] text-faint" style={{ left: `${m.left}%`, width: `${m.width}%` }}>{m.label}</div>)}
            </div>
          </div>

          {grupos.map(({ p, ruta, filas }) => {
            const fila = new Map(filas.map((t, i) => [t.id, i]));
            const y = (i: number) => i * FILA + FILA / 2;
            const pend = ruta.criticas.filter((id) => todas.find((t) => t.id === id)?.status !== "HECHA").length;
            return (
              <div key={p.id} className="border-b border-line last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-2/60 px-5 py-2">
                  <span className="text-[12.5px] font-extrabold text-ink">{p.name}</span>
                  {ruta.ciclo ? <span className="chip chip-bad !py-0 text-[11px]">Dependencias en ciclo: no hay ruta crítica que calcular</span> : ruta.fin && (
                    <>
                      <span className="num text-[12px] text-muted">fin planeado {dia(ruta.fin)}</span>
                      {ruta.desvio > 0 ? <span className="chip chip-bad !py-0 text-[11px]" title="Con el estado de las tareas a la fecha y lo pendiente tardando lo planeado">fin previsto {dia(ruta.finPrevisto!)} · +{ruta.desvio} {ruta.desvio === 1 ? "día" : "días"}</span> : <span className="chip chip-ok !py-0 text-[11px]">en fecha</span>}
                      <span className="chip !py-0 text-[11px]" title="Tareas sin holgura: si una se corre, se corre el fin del proyecto"><Flag size={10} className="mr-1" />{ruta.criticas.length} en ruta crítica{pend !== ruta.criticas.length ? ` · ${pend} pendientes` : ""}</span>
                    </>
                  )}
                </div>
                <div className="grid" style={{ gridTemplateColumns: "260px minmax(0,1fr)" }}>
                  <div>
                    {filas.map((t) => { const n = ruta.nodos[t.id]; return (
                      <button key={t.id} type="button" onClick={() => onOpenTask(t.id)} title={t.title} style={{ height: FILA }}
                        className="flex w-full items-center gap-1.5 px-5 text-left text-[12px] text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">
                        {t.milestone ? <Diamond size={10} className="shrink-0 fill-current text-navy" /> : n?.critica && t.status !== "HECHA" ? <Flag size={10} className="shrink-0 text-bad" /> : <span className="w-[10px] shrink-0" />}
                        <span className={`truncate ${n?.critica && t.status !== "HECHA" ? "font-semibold text-ink" : ""}`}>{t.title}</span>
                      </button>
                    ); })}
                  </div>
                  <div className="relative" style={{ height: filas.length * FILA }}>
                    {meses.map((m) => <span key={m.key} className="absolute inset-y-0 border-l border-line/70" style={{ left: `${m.left}%` }} />)}
                    {filas.map((_, i) => i % 2 === 1 && <span key={i} className="absolute inset-x-0 bg-surface-2/40" style={{ top: i * FILA, height: FILA }} />)}
                    {/* dependencias */}
                    {verDeps && (
                      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                        {filas.flatMap((t) => (t.dependsOn ?? []).filter((d) => fila.has(d)).map((d) => {
                          const pre = filas[fila.get(d)!], xp = x(sumarDias(pre.due, 1)), xs = x(t.start), yp = y(fila.get(d)!), ys = y(fila.get(t.id)!);
                          const crit = ruta.nodos[t.id]?.critica && ruta.nodos[d]?.critica, c = crit ? "var(--ink)" : "var(--faint)";
                          return <g key={`${d}>${t.id}`} stroke={c} strokeWidth={crit ? 1.5 : 1.1} opacity={crit ? 0.75 : 0.6} fill="none">
                            <line x1={`${xp}%`} y1={yp} x2={`${xs}%`} y2={yp} /><line x1={`${xs}%`} y1={yp} x2={`${xs}%`} y2={ys} /><circle cx={`${xs}%`} cy={ys} r={2.6} fill={c} stroke="none" />
                          </g>;
                        }))}
                      </svg>
                    )}
                    {/* hoy */}
                    {hoy >= desde && hoy <= hasta && <span className="absolute inset-y-0 z-[2] w-[2px] bg-[var(--gold-fill)]" style={{ left: `${x(hoy)}%` }} title={`Hoy: ${dia(hoy)}`} />}
                    {filas.map((t, i) => {
                      const n = ruta.nodos[t.id], late = vencida(t, hoy), meta = TASK_STATUS_META[t.status], color = late ? "var(--bad)" : meta.color;
                      const base = baselines[t.id], corrida = base && (base.start !== t.start || base.due !== t.due);
                      const critica = !!n?.critica && t.status !== "HECHA", holgura = Math.max(0, n?.holgura ?? 0);
                      const izq = x(t.start), ancho = Math.max(0.5, x(sumarDias(t.due, 1)) - izq), top = i * FILA;
                      const info = `${t.title}\n${dia(t.start)} → ${dia(t.due)} · ${meta.label}${late ? " · vencida" : ""}${t.milestone ? " · hito" : ""}${critica ? "\nEn la ruta crítica: si se corre, se corre el fin del proyecto" : n && n.holgura !== null && t.status !== "HECHA" ? `\nHolgura: ${holgura} ${holgura === 1 ? "día" : "días"} sin mover el fin` : ""}${n?.conflicto ? "\nEmpieza antes de que termine una tarea de la que depende" : ""}${n && n.atraso > 0 && t.status !== "HECHA" ? `\nFin previsto: ${dia(n.finPrevisto)} (+${n.atraso} días)` : ""}${corrida ? `\nLínea base: ${dia(base!.start)} → ${dia(base!.due)}` : ""}`;
                      return (
                        <div key={t.id}>
                          {corrida && <span className="absolute h-[3px] rounded-full bg-line-strong" style={{ left: `${x(base!.start)}%`, width: `${Math.max(0.5, x(sumarDias(base!.due, 1)) - x(base!.start))}%`, top: top + FILA - 7 }} />}
                          {holgura > 0 && t.status !== "HECHA" && !t.milestone && <span className="absolute border-t border-dashed border-faint" style={{ left: `${izq + ancho}%`, width: `${x(sumarDias(t.due, holgura + 1)) - (izq + ancho)}%`, top: top + FILA / 2 }} />}
                          {n && n.atraso > 0 && t.status !== "HECHA" && <span className="absolute h-[2px] bg-[var(--bad)] opacity-60" style={{ left: `${izq + ancho}%`, width: `${Math.max(0, x(sumarDias(n.finPrevisto, 1)) - (izq + ancho))}%`, top: top + FILA / 2 - 1 }} />}
                          {t.milestone ? (
                            <button type="button" onClick={() => onOpenTask(t.id)} title={info} aria-label={`Hito: ${t.title}`} className="absolute z-[3] grid place-items-center transition-transform hover:scale-125" style={{ left: `calc(${x(sumarDias(t.due, 1))}% - 8px)`, top: top + FILA / 2 - 8, width: 16, height: 16 }}>
                              <span className="block h-[11px] w-[11px] rotate-45 rounded-[2px]" style={{ background: t.status === "HECHA" ? "var(--ok)" : late ? "var(--bad)" : "var(--navy)", boxShadow: critica ? "0 0 0 2px var(--surface), 0 0 0 3.5px var(--bad)" : "0 0 0 2px var(--surface)" }} />
                            </button>
                          ) : (
                            <button type="button" onClick={() => onOpenTask(t.id)} title={info} aria-label={t.title} className="absolute z-[3] rounded-full transition-transform hover:scale-y-125"
                              style={{ left: `${izq}%`, width: `${ancho}%`, top: top + 8, height: FILA - 16, background: color, opacity: t.status === "HECHA" ? 0.5 : 0.95, boxShadow: critica ? "0 0 0 1.5px var(--surface), 0 0 0 3px var(--ink)" : n?.conflicto ? "0 0 0 1.5px var(--surface), 0 0 0 3px var(--warn)" : undefined }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-5 py-2.5 text-[12px] text-muted">
        {ESTADOS.map((c) => <span key={c} className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-full" style={{ background: TASK_STATUS_META[c].color }} />{TASK_STATUS_META[c].label}</span>)}
        <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-full" style={{ background: "var(--bad)" }} />Vencida</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-full bg-surface-3" style={{ boxShadow: "0 0 0 1.5px var(--surface), 0 0 0 3px var(--ink)" }} />Ruta crítica</span>
        <span className="flex items-center gap-1.5"><i className="block h-[9px] w-[9px] rotate-45 rounded-[2px] bg-navy" />Hito</span>
        <span className="flex items-center gap-1.5"><i className="w-5 border-t border-dashed border-faint" />Holgura</span>
        <span className="flex items-center gap-1.5"><i className="h-[3px] w-5 rounded-full bg-line-strong" />Línea base</span>
        <span className="flex items-center gap-1.5"><i className="h-[2px] w-5 bg-[var(--bad)] opacity-60" />Fin previsto</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-[2px] bg-[var(--gold-fill)]" />Hoy</span>
      </div>
    </Card>
  );
}
