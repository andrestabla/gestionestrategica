"use client";

// M5 · Mapa de ruta: Gantt por trimestres + la matriz 4Shine de priorización
// (las mismas variables D·E·M·L que se evalúan en Iniciativas).

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card, CardHeader, StatusChip } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { GanttChart, PriorityMatrix } from "@/components/charts";
import { LINES, fmtCOP } from "@/data/demo";
import { useCatalog } from "@/components/catalog-context";
import { initiativesOf } from "@/lib/vista";
import { usePriorizacion, DECISION_CLS } from "@/components/priorizacion";
import { CRITERIA, LEVEL_NAMES, decisionLabel } from "@/lib/priorizacion";

const SCORE_COLOR = (s: number) => s >= 80 ? "var(--ok)" : s >= 65 ? "var(--cyan-deep)" : s >= 50 ? "var(--warn)" : "var(--bad)";

export default function RutaPage() {
  const [sel, setSel] = useState<string | null>(null);
  const v = useCatalog();
  const inis = initiativesOf(v);
  const ini = sel ? inis.find((i) => i.id === sel) : null;
  const { data: prio } = usePriorizacion();
  const rows = prio?.ranking ?? [];
  const cOf = (id: string) => rows.find((r) => r.id === id)?.c;
  const evaluated = rows.filter((r) => r.c.n > 0);
  const selC = ini ? cOf(ini.id) : undefined;
  const selD = ini ? prio?.decisions[ini.id] : undefined;

  const corto = inis.filter((i) => i.horizon === "CORTO");
  const mediano = inis.filter((i) => i.horizon === "MEDIANO");

  return (
    <>
      <PageHeader kicker="M5 · Mapa de ruta" title="Roadmap 2026–2028"
        desc="La ruta con pertinencia contextual: cada iniciativa declara horizonte, responsable, presupuesto, capacidad que fortalece e indicador que debe mover." actions={<AccessChip module="ruta" />} />

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-1">
          <CardHeader title="Cronograma por horizontes"
            sub={`Corto plazo: ${corto.length} iniciativas · mediano plazo: ${mediano.length}`} />
          <div className="px-5 py-4">
            {inis.length === 0 && (
              <p className="mb-3 text-[12.5px] italic text-faint">Esta empresa aún no tiene iniciativas en su ruta.</p>
            )}
            <GanttChart onSelect={setSel}
              items={inis.map((i) => ({
                id: i.id, name: i.name, start: i.start, end: i.end,
                horizon: i.horizon, progress: i.progress,
              }))} />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-5 py-3 text-[11.5px] text-muted">
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded" style={{ background: "var(--cyan)" }} /> Corto plazo (0–12 m)</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded" style={{ background: "var(--gold-fill)" }} /> Mediano plazo (12–36 m)</span>
          </div>
        </Card>

        <Card className="rise rise-2">
          <CardHeader title="Matriz 4Shine de priorización" sub="capacidad de ejecución (L) × impacto en el resultado (D) del consolidado · tamaño: puntaje" />
          <div className="px-5 py-4">
            <PriorityMatrix onSelect={setSel} selected={sel}
              items={evaluated.map((r) => ({ id: r.id, name: r.name, D: r.c.avg.D, L: r.c.avg.L, score: r.c.score, horizon: r.horizon }))} />
          </div>
          <div className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-muted">
            D ≥ 3 compite como prioridad crítica; con L en 1 o 2 se resuelve primero la capacidad. {rows.length - evaluated.length > 0 && <>{rows.length - evaluated.length} sin evaluar: no aparecen en la matriz.</>}
            {" "}Se evalúa en <Link href="/panel/iniciativas/priorizacion" className="font-semibold text-cyan-deep">Iniciativas → Portafolio priorizado</Link>.
          </div>
        </Card>
      </div>

      {/* orden del portafolio con la matriz 4Shine */}
      <Card className="rise rise-2 mb-5">
        <CardHeader title="Orden del portafolio"
          sub="Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4 · ordena dentro de cada horizonte · la decisión de tiempo la registra la gerencia" />
        <div className="overflow-x-auto px-3 pb-4">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="label px-3 pb-2 text-left !text-[8.5px]">#</th>
                <th className="label px-3 pb-2 text-left !text-[8.5px]">Iniciativa</th>
                {CRITERIA.map((c) => <th key={c.key} className="label px-2 pb-2 text-center !text-[8.5px]" title={`${c.name} · ${c.weight} %`}>{c.key} · {c.weight} %</th>)}
                <th className="label px-3 pb-2 text-right !text-[8.5px]">Puntaje</th>
                <th className="label px-3 pb-2 text-left !text-[8.5px]">Tipo</th>
                <th className="label px-3 pb-2 text-left !text-[8.5px]">Decisión</th>
              </tr>
            </thead>
            <tbody>
              {(["CORTO", "MEDIANO"] as const).flatMap((h) => [
                <tr key={`h-${h}`}><td colSpan={9} className="px-3 pb-1 pt-3 text-[9.5px] font-bold uppercase tracking-wider text-faint">{h === "CORTO" ? "Corto plazo" : "Mediano plazo"}</td></tr>,
                ...rows.filter((r) => r.horizon === h).map((r) => {
                  const d = prio?.decisions[r.id];
                  return (
                    <tr key={r.id} className={`border-b border-line last:border-0 ${sel === r.id ? "bg-cyan-wash/40" : ""}`}>
                      <td className="num px-3 py-2 font-extrabold text-faint">{r.c.n ? r.position : "—"}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => setSel(r.id)} className="text-left font-semibold text-ink hover:text-cyan-deep">{r.name}</button>
                        <div className="num text-[10px] text-faint">{r.id.toUpperCase()} · {r.c.n} evaluador{r.c.n === 1 ? "" : "es"}</div>
                      </td>
                      {CRITERIA.map((c) => (
                        <td key={c.key} className="num px-2 py-2 text-center" title={r.c.n ? `${c.name}: ${r.c.avg[c.key]} · ${LEVEL_NAMES[r.c.rounded[c.key]]}` : undefined}>
                          {r.c.n ? <span className={`font-bold ${r.c.rounded[c.key] >= 3 ? "text-ink" : "text-muted"}`}>{r.c.avg[c.key]}</span> : <span className="text-faint">—</span>}
                        </td>
                      ))}
                      <td className="num px-3 py-2 text-right text-[14px] font-extrabold" style={{ color: r.c.n ? SCORE_COLOR(r.c.score) : "var(--faint)" }}>{r.c.n ? r.c.score : "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-ink-soft">{r.c.type ? (r.c.type === "ESTRATEGICO" ? "Estratégica" : "Táctica") : "—"}</td>
                      <td className="px-3 py-2">{d ? <span className={DECISION_CLS[d.decision]}>{decisionLabel(d.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}</td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-2.5 text-[10.5px] text-faint">
          La matriz ayuda a comparar; el presupuesto y la capacidad determinan cuántas se aprueban. Las calificaciones y la decisión se registran en la ficha de cada iniciativa, según el rol.
        </div>
      </Card>

      {/* detalle de iniciativa */}
      {ini && (
        <Card className="rise mb-5 border-cyan/40">
          <CardHeader title={ini.name} sub="Ficha de la iniciativa"
            right={
              <span className="flex items-center gap-2">
                <Link href={`/panel/proyectos/${ini.id}`} className="chip chip-cyan">Plan de trabajo →</Link>
                <StatusChip status={ini.status} />
              </span>
            } />
          <div className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="label mb-1">Capacidad</div>
              <div className="text-[13px] font-semibold text-ink">
                {LINES.find((l) => l.n === ini.line)?.code}{" "}
                {LINES.find((l) => l.n === ini.line)?.name}
              </div>
            </div>
            <div>
              <div className="label mb-1">Responsable</div>
              <div className="text-[13px] font-semibold text-ink">{ini.owner}</div>
            </div>
            <div>
              <div className="label mb-1">Ventana</div>
              <div className="font-mono text-[12.5px] text-ink">{ini.start} → {ini.end}</div>
            </div>
            <div>
              <div className="label mb-1">Presupuesto</div>
              <div className="font-mono text-[12.5px] text-ink">{fmtCOP(ini.budgetPlanned)}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="label mb-1">Matriz 4Shine de priorización</div>
              {selC && selC.n > 0 ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                  {CRITERIA.map((c) => <span key={c.key}>{c.key} <b className="text-ink">{selC.avg[c.key]}</b></span>)}
                  <span>· <b className="num text-[14px]" style={{ color: SCORE_COLOR(selC.score) }}>{selC.score}</b> pts</span>
                  <span>· {selC.type === "ESTRATEGICO" ? "estratégica" : "táctica"}</span>
                  {selD ? <span className={DECISION_CLS[selD.decision]}>{decisionLabel(selD.decision)}</span> : <span className="chip">sin decisión</span>}
                  <Link href={`/panel/iniciativas/${ini.id}`} className="font-semibold text-cyan-deep hover:underline">Evaluar →</Link>
                </div>
              ) : (
                <div className="text-[12.5px] text-muted">Sin evaluación con la matriz. <Link href={`/panel/iniciativas/${ini.id}`} className="font-semibold text-cyan-deep hover:underline">Evaluar →</Link></div>
              )}
            </div>
            <div className="sm:col-span-2">
              <div className="label mb-1">Avance</div>
              <div className="flex items-center gap-3">
                <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-cyan" style={{ width: `${ini.progress}%` }} />
                </div>
                <span className="font-mono text-[12px] font-bold text-cyan-deep">{ini.progress} %</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* listas por horizonte */}
      <div className="rise rise-3 grid gap-5 lg:grid-cols-2">
        {[{ label: "Corto plazo · 0–12 meses", items: corto, color: "var(--cyan)" },
          { label: "Mediano plazo · 12–36 meses", items: mediano, color: "var(--gold-fill)" }].map((g) => (
          <Card key={g.label}>
            <CardHeader title={g.label} />
            <div className="divide-y divide-line">
              {g.items.length === 0 && (
                <p className="px-5 py-4 text-[12px] italic text-faint">Sin iniciativas en este horizonte.</p>
              )}
              {g.items.map((i) => (
                <button key={i.id} onClick={() => setSel(i.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{i.name}</div>
                    <div className="font-mono text-[10.5px] text-faint">
                      {i.start} → {i.end} · {fmtCOP(i.budgetPlanned)}
                    </div>
                  </div>
                  <StatusChip status={i.status} />
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
