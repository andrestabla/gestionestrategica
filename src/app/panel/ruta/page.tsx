"use client";

// M5 · Mapa de ruta: Gantt por trimestres + matriz de priorización.

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card, CardHeader, StatusChip } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { GanttChart, PriorityMatrix } from "@/components/charts";
import { INITIATIVES, LINES, fmtCOP } from "@/data/demo";
import { priorityRanking } from "@/lib/logic";

export default function RutaPage() {
  const [sel, setSel] = useState<string | null>(null);
  const ini = sel ? INITIATIVES.find((i) => i.id === sel) : null;

  const corto = INITIATIVES.filter((i) => i.horizon === "CORTO");
  const mediano = INITIATIVES.filter((i) => i.horizon === "MEDIANO");

  return (
    <>
      <PageHeader kicker="M5 · Mapa de ruta" title="Roadmap 2026–2028"
        desc="La ruta con pertinencia contextual: cada iniciativa declara horizonte, responsable, presupuesto, capacidad que fortalece e indicador que debe mover." actions={<AccessChip module="ruta" />} />

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-1">
          <CardHeader title="Cronograma por horizontes"
            sub={`Corto plazo: ${corto.length} iniciativas · mediano plazo: ${mediano.length}`} />
          <div className="px-5 py-4">
            <GanttChart onSelect={setSel}
              items={INITIATIVES.map((i) => ({
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
          <CardHeader title="Priorización" sub="Impacto × factibilidad — el sustento de qué se ejecuta primero" />
          <div className="px-5 py-4">
            <PriorityMatrix onSelect={setSel}
              items={INITIATIVES.map((i) => ({
                id: i.id, name: i.name, impact: i.impact,
                feasibility: i.feasibility, horizon: i.horizon,
              }))} />
          </div>
        </Card>
      </div>

      {/* ranking de prioridad compuesta (AlgoritmoT-IES) */}
      <Card className="rise rise-2 mb-5">
        <CardHeader title="Prioridad compuesta del portafolio"
          sub="0,30·Impacto + 0,20·Urgencia + 0,15·Riesgo + 0,15·Alineación + 0,10·Factibilidad + 0,10·Dependencia (criterios 1–5)" />
        <div className="overflow-x-auto px-3 pb-4">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="label px-3 pb-2 text-left !text-[8.5px]">#</th>
                <th className="label px-3 pb-2 text-left !text-[8.5px]">Iniciativa</th>
                <th className="label px-3 pb-2 text-right !text-[8.5px]">Prioridad</th>
                <th className="label px-3 pb-2 text-left !text-[8.5px]">Desglose</th>
              </tr>
            </thead>
            <tbody>
              {priorityRanking().map((p, idx) => (
                <tr key={p.id} className={`border-b border-line last:border-0 ${idx < 3 ? "bg-cyan-wash/40" : ""}`}>
                  <td className="num px-3 py-2 font-extrabold text-faint">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setSel(p.id)} className="text-left font-semibold text-ink hover:text-cyan-deep">
                      {p.name}
                    </button>
                  </td>
                  <td className="num px-3 py-2 text-right text-[14px] font-extrabold"
                    style={{ color: p.score >= 4 ? "var(--cyan-deep)" : "var(--ink)" }}>
                    {p.score.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.criteria.map((c) => (
                        <span key={c.key} className="num rounded bg-surface-2 px-1.5 py-0.5 text-[9.5px] text-muted"
                          title={`${c.label} · peso ${Math.round(c.weight * 100)} %`}>
                          {c.label.split(" ")[0].slice(0, 6)} {c.value}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-2.5 text-[10.5px] text-faint">
          Riesgo derivado del motor de seguimiento; alineación derivada de la salud del objetivo CMI al que sirve.
          La factibilidad pesa poco a propósito: una acción fácil pero irrelevante no debe desplazar a una estratégica.
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
              <div className="label mb-1">Prioridad</div>
              <div className="text-[12.5px] text-muted">
                Impacto <b className="text-ink">{ini.impact}/5</b> · Factibilidad{" "}
                <b className="text-ink">{ini.feasibility}/5</b> ·{" "}
                {ini.impact >= 4 && ini.feasibility >= 4 ? "Quick win" :
                  ini.impact >= 4 ? "Apuesta mayor" : "Complementaria"}
              </div>
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
