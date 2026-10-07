"use client";

// Informe ejecutivo interactivo e imprimible: el estado de la transformación
// digital en una pieza para comité. El compositor permite elegir qué secciones
// van al PDF; las tablas se ordenan y navegan a su módulo; la nota del
// consultor se escribe aquí y se imprime como texto. «Imprimir» produce el PDF
// del navegador (los estilos de impresión ocultan la navegación y el editor).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";
import { MaturityHeatmap, MaturityRadar, BudgetBar } from "@/components/charts";
import { useCatalog } from "@/components/catalog-context";
import { LINES, DIMENSIONS, fmtCOP, fmtNum } from "@/data/demo";
import { useMaturity } from "@/lib/use-maturity";
import { downloadCsv } from "@/lib/csv";
import {
  Printer, FileDown, Loader2, ChevronDown, ChevronRight, ArrowUpDown,
  ExternalLink, PenLine,
} from "lucide-react";

type Summary = {
  maturity: {
    assessment: { id: string; label: string; period: string };
    lines: { n: number; code: string; name: string; value: number; target: number; prev: number | null }[];
    institution: { value: number; target: number };
    history: { id: string; period: string; institution: number }[];
  };
  kpis: { code: string; name: string; health: { latest: number; latestPeriod: string; semaphore: string; improving: boolean; pctToTarget: number } }[];
  initiatives: { id: string; name: string; status: string; progress: number; risk: { score: number; level: string } }[];
  budget: { planned: number; committed: number; executed: number };
  actions: { total: number; done: number; late: number };
  objectives: { id: string; semaphore: "OK" | "WARN" | "BAD"; kpiOk: number; kpiTotal: number; worstInitiativeRisk: string | null }[];
  alerts: { id: string; kind: string; severity: 1 | 2 | 3; title: string; detail: string; owner?: string }[];
  alertCounts: { critical: number; warning: number; info: number };
};

type GpTask = {
  id: string; iniId: string; title: string; status: string; due: string;
  assigneeId: string; evidenceIds?: string[];
};
type GpData = {
  tasks: GpTask[];
  people: { id: string; name: string }[];
  stats: {
    total: number; overdue: number; dueSoon: number; withEvidence: number; people: number;
    byStatus: Record<string, number>;
  };
};

const SEM_COLOR: Record<string, string> = { OK: "var(--ok)", WARN: "var(--warn)", BAD: "var(--bad)" };
const SEM_LABEL: Record<string, string> = { OK: "en meta", WARN: "en riesgo", BAD: "crítico" };
const RISK_COLOR: Record<string, string> = { BAJO: "var(--ok)", MEDIO: "var(--muted)", ALTO: "var(--warn)", "CRÍTICO": "var(--bad)" };
const RISK_ORDER: Record<string, number> = { "CRÍTICO": 0, ALTO: 1, MEDIO: 2, BAJO: 3 };
const DEMO_TODAY = "2027-03-10";

/** Secciones del compositor: qué entra en la pieza (pantalla e impresión). */
const SECTIONS = [
  ["resumen", "Resumen ejecutivo"],
  ["madurez", "Madurez"],
  ["brechas", "Brechas prioritarias"],
  ["alertas", "Atención de la dirección"],
  ["kpi", "Indicadores"],
  ["iniciativas", "Iniciativas y presupuesto"],
  ["gp", "Planes de trabajo"],
  ["objetivos", "Objetivos estratégicos"],
  ["nota", "Nota del consultor"],
] as const;
type SectionKey = (typeof SECTIONS)[number][0];

function Sparkline({ points }: { points: { period: string; value: number }[] }) {
  if (points.length < 2) return null;
  const w = 180, h = 44, pad = 6;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
  const ys = points.map((p) => h - pad - ((p.value - 1) / 4) * (h - pad * 2));
  return (
    <svg width={w} height={h} className="overflow-visible" role="img" aria-label="Serie histórica de madurez">
      <polyline
        points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")}
        fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={p.period}>
          <circle cx={xs[i]} cy={ys[i]} r={3} fill="var(--cyan)" />
          <text x={xs[i]} y={h + 10} textAnchor="middle" fill="var(--faint)" fontSize={8.5}>
            {p.period}
          </text>
          <text x={xs[i]} y={ys[i] - 6} textAnchor="middle" fill="var(--ink)" fontSize={9} fontWeight={700}>
            {fmtNum(p.value, 2)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function EjecutivoTab() {
  const router = useRouter();
  const v = useCatalog();
  const [s, setS] = useState<Summary | null>(null);
  const [gp, setGp] = useState<GpData | null>(null);
  const { scores } = useMaturity();

  // compositor de secciones + nota, persistidos localmente
  const [on, setOn] = useState<Record<SectionKey, boolean>>(
    () => Object.fromEntries(SECTIONS.map(([k]) => [k, true])) as Record<SectionKey, boolean>,
  );
  const [nota, setNota] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [kpiSort, setKpiSort] = useState<"sem" | "pct" | "code">("sem");
  const [iniSort, setIniSort] = useState<"risk" | "progress" | "id">("risk");

  useEffect(() => {
    fetch("/api/td/summary").then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => null);
    fetch("/api/td/tasks").then((r) => (r.ok ? r.json() : null)).then(setGp).catch(() => null);
    try {
      const savedOn = localStorage.getItem("4shine-informe-secciones");
      if (savedOn) setOn((prev) => ({ ...prev, ...JSON.parse(savedOn) }));
      setNota(localStorage.getItem("4shine-informe-nota") ?? "");
    } catch { /* sin persistencia */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("4shine-informe-secciones", JSON.stringify(on)); } catch { /* noop */ }
  }, [on]);
  useEffect(() => {
    try { localStorage.setItem("4shine-informe-nota", nota); } catch { /* noop */ }
  }, [nota]);

  const kpisSorted = useMemo(() => {
    if (!s) return [];
    const arr = [...s.kpis];
    if (kpiSort === "sem") {
      const w: Record<string, number> = { BAD: 0, WARN: 1, OK: 2 };
      arr.sort((a, b) => w[a.health.semaphore] - w[b.health.semaphore] || a.health.pctToTarget - b.health.pctToTarget);
    } else if (kpiSort === "pct") {
      arr.sort((a, b) => a.health.pctToTarget - b.health.pctToTarget);
    } else arr.sort((a, b) => a.code.localeCompare(b.code));
    return arr;
  }, [s, kpiSort]);

  const inisSorted = useMemo(() => {
    if (!s) return [];
    const arr = [...s.initiatives];
    if (iniSort === "risk") arr.sort((a, b) => RISK_ORDER[a.risk.level] - RISK_ORDER[b.risk.level] || b.risk.score - a.risk.score);
    else if (iniSort === "progress") arr.sort((a, b) => a.progress - b.progress);
    else arr.sort((a, b) => a.id.localeCompare(b.id));
    return arr;
  }, [s, iniSort]);

  // dimensiones más rezagadas (brechas prioritarias)
  const brechas = useMemo(() => {
    const cells: { n: number; dim: string; dimName: string; value: number; target: number }[] = [];
    for (const d of DIMENSIONS) {
      const c = scores[d.line]?.[d.key];
      if (c) cells.push({ n: d.line, dim: d.key, dimName: d.name, value: c.value, target: c.target });
    }
    return cells.sort((a, b) => a.value - b.value || (b.target - b.value) - (a.target - a.value)).slice(0, 5);
  }, [scores]);

  // GP: próximos hitos y vencidas contra la fecha demo
  const gpDerived = useMemo(() => {
    if (!gp) return null;
    const pending = gp.tasks.filter((t) => t.status !== "HECHA");
    const overdue = pending.filter((t) => t.due < DEMO_TODAY).sort((a, b) => a.due.localeCompare(b.due));
    const upcoming = pending.filter((t) => t.due >= DEMO_TODAY).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
    const byIni = new Map<string, { total: number; done: number }>();
    for (const t of gp.tasks) {
      const e = byIni.get(t.iniId) ?? { total: 0, done: 0 };
      e.total += 1; if (t.status === "HECHA") e.done += 1;
      byIni.set(t.iniId, e);
    }
    const person = (id: string) => gp.people.find((p) => p.id === id)?.name ?? id;
    return { overdue, upcoming, byIni, person };
  }, [gp]);

  if (!s) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <Loader2 size={16} className="animate-spin" /> Preparando el informe…
        </span>
      </div>
    );
  }

  const hoy = "10 de marzo de 2027 (demo)";
  const criticalAlerts = s.alerts.filter((a) => a.severity === 1);
  const warnAlerts = s.alerts.filter((a) => a.severity === 2).slice(0, 6);
  const kpiBad = s.kpis.filter((k) => k.health.semaphore === "BAD");
  const iniRisky = s.initiatives.filter((i) => i.risk.level === "ALTO" || i.risk.level === "CRÍTICO");
  const lineByValue = [...s.maturity.lines].sort((a, b) => b.value - a.value);
  const strongest = lineByValue[0];
  const weakest = lineByValue[lineByValue.length - 1];
  const budgetUsedPct = s.budget.planned ? Math.round(((s.budget.executed + s.budget.committed) / s.budget.planned) * 100) : 0;
  const delta = (l: { value: number; prev: number | null }) =>
    l.prev === null ? null : Math.round((l.value - l.prev) * 10) / 10;

  const sortBtn = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide transition-colors";
  const sortOn = "bg-cyan-wash text-cyan-deep";
  const sortOff = "text-faint hover:text-muted";

  return (
    <>
      <div className="no-print">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[520px] text-[12.5px] leading-relaxed text-muted">
            Pieza interactiva para comité: elige las secciones, ordena las tablas y navega al
            detalle. «Imprimir» genera el PDF con lo que esté activado.
          </p>
          {(
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.print()} className="btn-primary !py-2 text-[12px]">
                <Printer size={13} /> Imprimir / PDF
              </button>
              <button
                onClick={() => downloadCsv("kpis-pgtd",
                  ["Código", "Indicador", "Último valor", "Periodo", "Semáforo", "% de la meta"],
                  s.kpis.map((k) => [k.code, k.name, k.health.latest, k.health.latestPeriod, k.health.semaphore, k.health.pctToTarget]))}
                className="btn-ghost !py-2 text-[12px]">
                <FileDown size={13} /> KPI (CSV)
              </button>
              <button
                onClick={() => downloadCsv("iniciativas-pgtd",
                  ["Id", "Iniciativa", "Estado", "Avance %", "Riesgo", "Puntaje riesgo"],
                  s.initiatives.map((i) => [i.id.toUpperCase(), i.name, i.status, i.progress, i.risk.level, i.risk.score]))}
                className="btn-ghost !py-2 text-[12px]">
                <FileDown size={13} /> Iniciativas (CSV)
              </button>
              {gp && (
                <button
                  onClick={() => downloadCsv("tareas-pgtd",
                    ["Id", "Iniciativa", "Tarea", "Estado", "Vence", "Evidencias"],
                    gp.tasks.map((t) => [t.id, t.iniId.toUpperCase(), t.title, t.status, t.due, t.evidenceIds?.length ?? 0]))}
                  className="btn-ghost !py-2 text-[12px]">
                  <FileDown size={13} /> Tareas (CSV)
                </button>
              )}
            </div>
          )}
        </div>

        {/* compositor: qué secciones lleva la pieza */}
        <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5">
          <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wide text-faint">Secciones del informe</span>
          {SECTIONS.map(([key, label]) => (
            <button key={key}
              onClick={() => setOn((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                on[key] ? "border-cyan bg-cyan-wash text-cyan-deep" : "border-line text-faint hover:text-muted"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* cabecera del informe (visible también al imprimir) */}
      <div className="panel mb-5 overflow-hidden">
        <div className="spine h-[3px]" />
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div>
            <div className="kicker mb-1">Informe ejecutivo · PGTD</div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-ink">{v.catalog.company.name}</h1>
            <p className="mt-1 text-[12px] text-muted">
              Medición vigente: <b className="text-ink">{s.maturity.assessment.label}</b> ({s.maturity.assessment.period}) ·
              corte del informe: {hoy}
            </p>
          </div>
          <div className="flex items-end gap-6">
            <div className="pb-1"><Sparkline points={s.maturity.history.map((h) => ({ period: h.period, value: h.institution }))} /></div>
            <div className="text-right">
              <div className="label">Madurez de la empresa</div>
              <div className="num text-[36px] font-extrabold leading-none text-ink">
                {fmtNum(s.maturity.institution.value, 1)}
                <span className="text-[14px] font-semibold text-faint"> / 5</span>
              </div>
              <div className="num mt-1 text-[10.5px] text-faint">meta {fmtNum(s.maturity.institution.target, 1)} a 24 meses</div>
            </div>
          </div>
        </div>
      </div>

      {/* resumen ejecutivo automático */}
      {on.resumen && (
        <Card className="mb-5">
          <CardHeader title="Resumen ejecutivo" sub="lectura automática del corte — los enlaces llevan al detalle" />
          <ul className="grid gap-x-6 gap-y-1.5 px-5 pb-4 text-[12.5px] leading-relaxed text-ink-soft lg:grid-cols-2">
            <li>
              La capacidad más avanzada es <b className="text-ink">{strongest.code} {strongest.name}</b> ({fmtNum(strongest.value, 1)}
              {delta(strongest) !== null && <> · {delta(strongest)! >= 0 ? "+" : ""}{fmtNum(delta(strongest)!, 1)} vs. medición anterior</>});
              la más rezagada, <b className="text-ink">{weakest.code} {weakest.name}</b> ({fmtNum(weakest.value, 1)}).
            </li>
            <li>
              La brecha más crítica está en <b className="text-ink">{LINES.find((l) => l.n === brechas[0]?.n)?.short} · {brechas[0]?.dimName}</b>{" "}
              (nivel {fmtNum(brechas[0]?.value ?? 0, 1)} frente a meta {fmtNum(brechas[0]?.target ?? 0, 1)}).
            </li>
            <li>
              <b className="text-ink">{kpiBad.length}</b> de {s.kpis.length} indicadores están en rojo
              {kpiBad.length > 0 && <> — el más lejano de su meta: <Link href="/panel/kpi" className="font-semibold text-cyan-deep hover:underline">{kpiBad[0].code} {kpiBad[0].name}</Link></>}.
            </li>
            <li>
              <b className="text-ink">{iniRisky.length}</b> iniciativas en riesgo alto o crítico
              {iniRisky[0] && <> — la primera: <Link href={`/panel/iniciativas/${iniRisky[0].id}`} className="font-semibold text-cyan-deep hover:underline">{iniRisky[0].name}</Link></>}.
            </li>
            <li>
              Presupuesto del portafolio: <b className="text-ink">{fmtCOP(s.budget.planned)}</b>, con {budgetUsedPct}&nbsp;% ejecutado o comprometido.
            </li>
            <li>
              Planes de trabajo: <b className="text-ink">{gp ? `${gp.stats.byStatus.HECHA}/${gp.stats.total}` : "…"}</b> tareas hechas,{" "}
              <b style={{ color: "var(--bad)" }}>{gp?.stats.overdue ?? "…"}</b> vencidas y {gp?.stats.byStatus.BLOQUEADA ?? "…"} bloqueadas al corte.
            </li>
          </ul>
        </Card>
      )}

      {/* madurez: barras con drill-down + radar + heatmap */}
      {on.madurez && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Avance por capacidad" sub="actual vs. meta a 24 meses — clic en una capacidad abre sus dimensiones" />
            <div className="space-y-3 px-5 pb-5">
              {s.maturity.lines.map((l) => {
                const meta = LINES.find((x) => x.n === l.n)!;
                const isOpen = expanded === l.n;
                return (
                  <div key={l.n}>
                    <button onClick={() => setExpanded(isOpen ? null : l.n)} className="block w-full text-left">
                      <div className="mb-1 flex items-baseline justify-between text-[12px]">
                        <span className="flex items-center gap-1 font-bold text-ink">
                          {isOpen ? <ChevronDown size={12} className="no-print" /> : <ChevronRight size={12} className="no-print" />}
                          {l.code} {l.name}
                        </span>
                        <span className="num text-muted">
                          {l.prev !== null && <>{fmtNum(l.prev, 1)} → </>}
                          <b className="text-ink">{fmtNum(l.value, 1)}</b> / meta {fmtNum(l.target, 1)}
                        </span>
                      </div>
                      <div className="relative h-[8px] overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full" style={{ width: `${(l.value / 5) * 100}%`, background: meta.color }} />
                        <div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold"
                          style={{ left: `${(l.target / 5) * 100}%` }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="no-print mt-2 space-y-1.5 rounded-lg bg-surface-2/60 px-3 py-2.5">
                        {DIMENSIONS.filter((d) => d.line === l.n).map((d) => {
                          const c = scores[l.n]?.[d.key];
                          if (!c) return null;
                          return (
                            <div key={d.key} className="flex items-center gap-2 text-[11.5px]">
                              <span className="w-[150px] shrink-0 text-muted">{d.name}</span>
                              <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-surface">
                                <div className="h-full rounded-full" style={{ width: `${(c.value / 5) * 100}%`, background: meta.color, opacity: 0.75 }} />
                              </div>
                              <span className="num w-[64px] shrink-0 text-right text-ink">
                                <b>{fmtNum(c.value, 1)}</b> / {fmtNum(c.target, 1)}
                              </span>
                            </div>
                          );
                        })}
                        <Link href={`/panel/diagnostico/capacidad/${l.n}`} className="inline-flex items-center gap-1 pt-1 text-[11px] font-bold text-cyan-deep hover:underline">
                          Ver prácticas y evidencia <ExternalLink size={11} />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="pt-2"><MaturityRadar size={300} scores={scores} /></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Mapa de calor de las 17 dimensiones" sub="madurez de la medición vigente" />
            <div className="px-5 pb-5 pt-2"><MaturityHeatmap scores={scores} /></div>
            <div className="border-t border-line px-5 py-2.5 text-[10.5px] text-faint">
              Alertas del motor: {s.alertCounts.critical} críticas · {s.alertCounts.warning} advertencias · {s.alertCounts.info} informativas.
              Acciones del roadmap: {s.actions.done}/{s.actions.total} hechas ({s.actions.late} vencidas).
            </div>
          </Card>
        </div>
      )}

      {/* brechas prioritarias */}
      {on.brechas && (
        <Card className="mb-5">
          <CardHeader title="Brechas prioritarias" sub="las cinco dimensiones con menor madurez — por donde empezar" />
          <div className="grid gap-x-6 gap-y-2 px-5 pb-4 lg:grid-cols-2">
            {brechas.map((b, idx) => {
              const line = LINES.find((l) => l.n === b.n)!;
              return (
                <Link key={`${b.n}-${b.dim}`} href={`/panel/diagnostico/dimension/${b.dim}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/70">
                  <span className="num w-5 shrink-0 text-center text-[13px] font-extrabold text-faint">{idx + 1}</span>
                  <i className="h-8 w-1 shrink-0 rounded-full" style={{ background: line.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-ink group-hover:text-cyan-deep">
                      {line.code} {line.short} · {b.dimName}
                    </div>
                    <div className="text-[10.5px] text-muted">
                      nivel {fmtNum(b.value, 1)} · meta {fmtNum(b.target, 1)} · brecha {fmtNum(b.target - b.value, 1)}
                    </div>
                  </div>
                  <div className="relative h-[6px] w-[110px] shrink-0 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(b.value / 5) * 100}%`, background: line.color }} />
                    <div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: `${(b.target / 5) * 100}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* alertas para el comité */}
      {on.alertas && (
        <Card className="mb-5">
          <CardHeader title="Atención de la dirección"
            sub={`${criticalAlerts.length} críticas y ${s.alertCounts.warning} advertencias — las críticas piden decisión, no seguimiento`} />
          <div className="grid gap-x-6 gap-y-1 px-5 pb-4 lg:grid-cols-2">
            {[...criticalAlerts, ...warnAlerts].map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-1.5">
                <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: a.severity === 1 ? "var(--bad)" : "var(--warn)" }} />
                <div className="min-w-0">
                  <div className="text-[12px] font-bold leading-snug text-ink">{a.title}</div>
                  <div className="text-[10.5px] leading-snug text-muted">{a.detail}{a.owner ? ` — ${a.owner}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KPI + iniciativas */}
      {(on.kpi || on.iniciativas) && (
        <div className="print-break grid gap-5 lg:grid-cols-2">
          {on.kpi && (
            <Card>
              <CardHeader title="Indicadores" sub="clic en una fila abre el módulo de KPI"
                right={
                  <div className="no-print flex items-center gap-0.5">
                    <ArrowUpDown size={11} className="mr-1 text-faint" />
                    {([["sem", "semáforo"], ["pct", "% meta"], ["code", "código"]] as const).map(([k, label]) => (
                      <button key={k} onClick={() => setKpiSort(k)} className={`${sortBtn} ${kpiSort === k ? sortOn : sortOff}`}>{label}</button>
                    ))}
                  </div>
                } />
              <div className="px-5 pb-4">
                <table className="w-full text-[11.5px]">
                  <tbody>
                    {kpisSorted.map((k) => (
                      <tr key={k.code} onClick={() => router.push("/panel/kpi")}
                        className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2/60">
                        <td className="num whitespace-nowrap py-1 pr-2 font-bold text-cyan-deep">{k.code}</td>
                        <td className="w-full max-w-0 truncate py-1 pr-2 text-ink-soft">{k.name}</td>
                        <td className="num py-1 pr-2 text-right font-bold text-ink">{fmtNum(k.health.latest, 1)}</td>
                        <td className="num whitespace-nowrap py-1 pr-2 text-right text-muted">{k.health.pctToTarget} %</td>
                        <td className="py-1 text-right">
                          <i className="inline-block h-2.5 w-2.5 rounded-full" title={SEM_LABEL[k.health.semaphore]}
                            style={{ background: SEM_COLOR[k.health.semaphore] }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {on.iniciativas && (
            <Card>
              <CardHeader title="Iniciativas"
                sub={`presupuesto ${fmtCOP(s.budget.planned)} · ejecutado+comprometido ${budgetUsedPct} %`}
                right={
                  <div className="no-print flex items-center gap-0.5">
                    <ArrowUpDown size={11} className="mr-1 text-faint" />
                    {([["risk", "riesgo"], ["progress", "avance"], ["id", "id"]] as const).map(([k, label]) => (
                      <button key={k} onClick={() => setIniSort(k)} className={`${sortBtn} ${iniSort === k ? sortOn : sortOff}`}>{label}</button>
                    ))}
                  </div>
                } />
              <div className="px-5 pb-4">
                <div className="mb-3"><BudgetBar planned={s.budget.planned} committed={s.budget.committed} executed={s.budget.executed} /></div>
                <table className="w-full text-[11.5px]">
                  <tbody>
                    {inisSorted.map((i) => (
                      <tr key={i.id} onClick={() => router.push(`/panel/iniciativas/${i.id}`)}
                        className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2/60">
                        <td className="num whitespace-nowrap py-1 pr-2 font-bold text-cyan-deep">{i.id.toUpperCase()}</td>
                        <td className="w-full max-w-0 truncate py-1 pr-2 text-ink-soft">{i.name}</td>
                        <td className="num whitespace-nowrap py-1 pr-2 text-right text-muted">{i.progress} %</td>
                        <td className="num py-1 text-right font-bold" style={{ color: RISK_COLOR[i.risk.level] }}>
                          {i.risk.level.toLowerCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* planes de trabajo (GP) */}
      {on.gp && gp && gpDerived && (
        <Card className="mt-5">
          <CardHeader title="Planes de trabajo"
            sub={`${gp.stats.byStatus.HECHA}/${gp.stats.total} tareas hechas · ${gp.stats.overdue} vencidas · ${gp.stats.byStatus.BLOQUEADA} bloqueadas · ${gp.stats.withEvidence} con evidencia`} />
          <div className="grid gap-x-8 gap-y-4 px-5 pb-5 lg:grid-cols-2">
            <div>
              <div className="label mb-2">Avance por iniciativa</div>
              <div className="space-y-2">
                {s.initiatives.map((i) => {
                  const st = gpDerived.byIni.get(i.id);
                  if (!st) return null;
                  const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
                  return (
                    <Link key={i.id} href={`/panel/proyectos/${i.id}`} className="group block">
                      <div className="mb-0.5 flex items-baseline justify-between text-[11.5px]">
                        <span className="truncate pr-2 font-semibold text-ink-soft group-hover:text-cyan-deep">
                          {i.id.toUpperCase()} · {i.name}
                        </span>
                        <span className="num shrink-0 text-muted">{st.done}/{st.total}</span>
                      </div>
                      <div className="h-[6px] overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              {gpDerived.overdue.length > 0 && (
                <div>
                  <div className="label mb-2" style={{ color: "var(--bad)" }}>Vencidas al corte</div>
                  {gpDerived.overdue.slice(0, 4).map((t) => (
                    <Link key={t.id} href={`/panel/proyectos/${t.iniId}`} className="group flex items-baseline gap-2 py-1 text-[11.5px]">
                      <span className="num shrink-0 font-bold" style={{ color: "var(--bad)" }}>{t.due}</span>
                      <span className="truncate text-ink-soft group-hover:text-cyan-deep">{t.title}</span>
                      <span className="num ml-auto shrink-0 text-faint">{gpDerived.person(t.assigneeId).split(" ")[0]}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div>
                <div className="label mb-2">Próximos hitos</div>
                {gpDerived.upcoming.map((t) => (
                  <Link key={t.id} href={`/panel/proyectos/${t.iniId}`} className="group flex items-baseline gap-2 py-1 text-[11.5px]">
                    <span className="num shrink-0 font-bold text-cyan-deep">{t.due}</span>
                    <span className="truncate text-ink-soft group-hover:text-cyan-deep">{t.title}</span>
                    <span className="num ml-auto shrink-0 text-faint">{gpDerived.person(t.assigneeId).split(" ")[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* objetivos estratégicos (CMI) */}
      {on.objetivos && (
        <Card className="mt-5">
          <CardHeader title="Objetivos estratégicos" sub="salud por objetivo del mapa: KPI en meta y peor riesgo de sus iniciativas" />
          <div className="px-5 pb-4">
            <table className="w-full text-[11.5px]">
              <tbody>
                {s.objectives.map((o) => {
                  const obj = v.catalog.objectives.find((c) => c.id === o.id);
                  if (!obj) return null;
                  return (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="num whitespace-nowrap py-1.5 pr-2 font-bold text-cyan-deep">{o.id}</td>
                      <td className="w-full max-w-0 truncate py-1.5 pr-2 text-ink-soft">{obj.name}</td>
                      <td className="num whitespace-nowrap py-1.5 pr-2 text-right text-muted">KPI {o.kpiOk}/{o.kpiTotal}</td>
                      <td className="num py-1.5 pr-3 text-right font-bold"
                        style={{ color: o.worstInitiativeRisk ? RISK_COLOR[o.worstInitiativeRisk] : "var(--faint)" }}>
                        {o.worstInitiativeRisk?.toLowerCase() ?? "—"}
                      </td>
                      <td className="w-4 py-1.5 text-right">
                        <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEM_COLOR[o.semaphore] }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* nota del consultor */}
      {on.nota && (
        <Card className="mt-5">
          <CardHeader title="Nota del consultor" sub="lectura cualitativa del corte — se guarda localmente y sale impresa como texto" />
          <div className="px-5 pb-5">
            <div className="no-print">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] text-faint">
                <PenLine size={11} /> Escribe aquí la interpretación que acompaña los números.
              </div>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={5}
                placeholder="Ej.: El avance de Academia y Virtualidad confirma el efecto del aula estándar; la prioridad del trimestre es cerrar la brecha de datos en Investigación…"
                className="input w-full resize-y text-[12.5px] leading-relaxed" />
            </div>
            {nota.trim() && (
              <p className="only-print whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-soft">{nota}</p>
            )}
          </div>
        </Card>
      )}

      <p className="mt-5 text-[10px] leading-relaxed text-faint">
        Generado por la PGTD · Algoritmo T S.A.S. · datos ilustrativos del modo demo. Las reglas de
        semáforos, riesgo y proyección están documentadas en Metodología.
      </p>
    </>
  );
}
