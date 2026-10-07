"use client";

// Panel principal: héroe con gauge de la empresa, avance por capacidad,
// feed de atención y módulos.

import Link from "next/link";
import { PageHeader, Card, CardHeader, StatCard, ModuleCard, StateDot } from "@/components/ui";
import { MaturityRadar, ScoreGauge } from "@/components/charts";
import { useCatalog } from "@/components/catalog-context";
import { useBase } from "@/components/user-context";
import { LINES, fmtCOP } from "@/data/demo";
import { prevScores } from "@/lib/vista";
import { buildAlerts, executiveSummary } from "@/lib/logic";
import { useMaturity } from "@/lib/use-maturity";
import { ArrowRight, ShieldAlert, AlertTriangle, Info } from "lucide-react";

const SEV_META = {
  1: { icon: ShieldAlert, color: "var(--bad)", label: "Críticas" },
  2: { icon: AlertTriangle, color: "var(--warn)", label: "Advertencias" },
  3: { icon: Info, color: "var(--muted)", label: "Informativas" },
} as const;

export default function Panel() {
  const base = useBase();
  const v = useCatalog();
  // medición vigente efectiva (si A3 se publicó desde la plataforma, manda A3)
  const { data: matData, scores: effScores, lineScoreOf, prevLineScoreOf, institution } = useMaturity();
  const score = institution;
  const prevByLine = prevScores(v);
  const prev = matData?.previous
    ? [1, 2, 3, 4].reduce((a, n) => a + (prevLineScoreOf(n) ?? 0), 0) / 4
    : Object.values(prevByLine).reduce((a, b) => a + b, 0) / 4;
  const alerts = buildAlerts(v);
  const summary = executiveSummary(v);
  const initiatives = v.initiatives;
  const budget = initiatives.reduce(
    (a, i) => ({
      planned: a.planned + i.budgetPlanned,
      executed: a.executed + i.budgetExecuted,
    }),
    { planned: 0, executed: 0 },
  );
  const budgetPct = budget.planned ? Math.round((budget.executed / budget.planned) * 100) : 0;
  const serie = summary.maturity.history.map((h) => h.institution.toFixed(2).replace(".", ",")).join(" → ");

  return (
    <>
      <PageHeader
        kicker={v.catalog.company.name}
        title="Estado de la capacidad organizacional"
        desc={`Medición vigente: ${matData?.current.label ?? summary.maturity.assessment.label} (${matData?.current.period ?? summary.maturity.assessment.period}).${serie ? ` Serie de la empresa: ${serie}.` : " Aún no hay mediciones publicadas."}`}
      />

      {/* ── héroe: gauge + avance por línea ── */}
      <div className="rise rise-1 panel relative mb-5 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(560px 240px at 12% 0%, rgb(14 147 180 / 0.06), transparent 60%)" }} />
        <div className="relative grid gap-8 px-7 py-6 lg:grid-cols-[240px_1fr_320px] lg:items-center">
          <div>
            <div className="label mb-2">Madurez de la empresa</div>
            <ScoreGauge value={score} />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
              <span className="chip chip-ok num">▲ {(score - prev).toFixed(1).replace(".", ",")}</span>
              frente a la medición anterior
            </div>
          </div>

          <div className="space-y-4">
            <div className="label">Avance por capacidad</div>
            {LINES.map((l) => {
              const now = lineScoreOf(l.n);
              const before = prevLineScoreOf(l.n) ?? prevByLine[l.n] ?? 0;
              return (
                <Link key={l.n} href={`${base}/panel/diagnostico/capacidad/${l.n}`} className="group block">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13px] font-bold text-ink transition-colors group-hover:text-cyan-deep">
                      {l.code} <span className="font-semibold text-ink-soft">{l.name}</span>
                    </span>
                    <span className="num text-[12px] text-muted">
                      {before.toFixed(1)} → <b className="text-[13px] text-cyan-deep">{now.toFixed(1)}</b>
                    </span>
                  </div>
                  <div className="relative h-[9px] overflow-hidden rounded-full bg-surface-2">
                    <div className="absolute inset-y-0 left-0 rounded-full opacity-25"
                      style={{ width: `${(before / 5) * 100}%`, background: l.color }} />
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(now / 5) * 100}%`,
                        background: `linear-gradient(90deg, color-mix(in srgb, ${l.color} 55%, white), ${l.color})`,
                      }} />
                    <div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold"
                      style={{ left: `${((now + 2) / 5) * 100}%` }} />
                  </div>
                </Link>
              );
            })}
            <div className="flex items-center gap-4 pt-1 text-[10.5px] text-faint">
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-[3px] w-4 rounded-full bg-line-strong" /> medición anterior
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-gold" /> meta 24 m
              </span>
            </div>
          </div>

          <div className="hidden lg:block">
            <MaturityRadar size={320} scores={effScores} />
          </div>
        </div>
      </div>

      {/* ── métricas ── */}
      <div className="rise rise-2 mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Iniciativas en ejecución"
          value={initiatives.filter((i) => i.status === "EN_CURSO").length}
          unit={`de ${initiatives.length}`} foot="Roadmap 2026–2028" />
        <StatCard label="Presupuesto ejecutado"
          value={budgetPct} unit="%"
          foot={`${fmtCOP(budget.executed)} de ${fmtCOP(budget.planned)}`}
          accent="linear-gradient(90deg, var(--n4), var(--n5))" />
        <StatCard label="Alertas del motor de seguimiento" value={summary.alertCounts.critical}
          unit={`críticas · ${summary.alertCounts.warning} advertencias`}
          foot={`${summary.actions.done}/${summary.actions.total} acciones completadas · ${summary.actions.late} vencidas`}
          accent="linear-gradient(90deg, var(--bad), #a13c44)" />
      </div>

      {/* ── alertas del motor de seguimiento ── */}
      <Card className="rise rise-3 mb-8">
        <CardHeader title="Alertas del motor de seguimiento"
          sub="Generadas por las reglas del marco conceptual: rachas en rojo, KPI contra meta, rezago de captura, proyección insuficiente, desalineación presupuestal y evidencia faltante" />
        <div className="grid gap-x-6 px-4 pb-4 lg:grid-cols-2">
          {alerts.slice(0, 10).map((al) => {
            const meta = SEV_META[al.severity];
            return (
              <Link key={al.id} href={al.href}
                className="group flex min-w-0 items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2">
                <meta.icon size={15} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-ink">{al.title}</div>
                  <div className="text-[11.5px] leading-snug text-muted">{al.detail}</div>
                  {al.owner && <div className="num mt-0.5 text-[9.5px] text-faint">{al.owner}</div>}
                </div>
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-faint transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
        {alerts.length > 10 && (
          <div className="border-t border-line px-5 py-2.5 text-[11px] text-faint">
            {alerts.length - 10} alertas más de menor severidad en los módulos correspondientes.
          </div>
        )}
      </Card>

      {/* ── módulos ── */}
      <div className="rise rise-4">
        <div className="kicker mb-4">Módulos de la plataforma</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard href={`${base}/panel/diagnostico`} code="M1" title="Diagnóstico 4Shine-OD"
            desc="Radar de capacidades, mapa de calor de las 17 dimensiones, evidencia por práctica y serie de mediciones."
            tags={["17 dimensiones", "68 evidencias"]} />
          <ModuleCard href={`${base}/panel/benchmark`} code="M2" title="Benchmark"
            desc="Posición sectorial frente a pares comparables y presencia territorial por departamento."
            tags={["Sector", "Territorio"]} />
          <ModuleCard href={`${base}/panel/estrategia`} code="M3" title="Estrategia · cuadro de mando y OKR"
            desc="Objetivo, resultados clave, dimensión que instala e iniciativa: la trazabilidad completa, navegable."
            tags={["4 perspectivas", "10 objetivos"]} />
          <ModuleCard href={`${base}/panel/kpi`} code="M4" title="Indicadores"
            desc="Batería de KPI con dueño, fuente, periodicidad, serie histórica y semáforo frente a meta."
            tags={[`${v.kpis.length} indicadores`]} />
          <ModuleCard href={`${base}/panel/ruta`} code="M5" title="Mapa de ruta"
            desc="Roadmap por horizontes con Gantt y la matriz 4Shine de priorización (D·E·M·L)."
            tags={["2026–2028"]} />
          <ModuleCard href={`${base}/panel/iniciativas`} code="M6" title="Seguimiento de iniciativas"
            desc="Avance, presupuesto en tres estados y factores críticos de éxito en semáforo."
            tags={[fmtCOP(budget.planned)]} />
        </div>
      </div>
    </>
  );
}
