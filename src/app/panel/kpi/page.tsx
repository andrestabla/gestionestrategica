"use client";

// M4 · Indicadores con ficha completa: definición operativa, fórmula, serie
// con notas, dueño del dato, fuente, periodicidad y objetivo CMI.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { AccessChip, useCan } from "@/components/user-context";
import { Sparkline } from "@/components/charts";
import { KPIS, LINES, INITIATIVES, fmtNum } from "@/data/demo";
import { CMI_OBJECTIVES, responsible, type KpiFull } from "@/data/cmi";
import { kpiHealth } from "@/lib/logic";
import {
  X, User, Database, CalendarClock, Target, ListChecks, Sigma,
  Loader2, PlusCircle, AlertTriangle, Upload, FileDown, CheckCircle2,
} from "lucide-react";
import { periodIndex } from "@/lib/period";
import { downloadCsv } from "@/lib/csv";

const PERIOD_HINT: Record<KpiFull["frequency"], string> = {
  Mensual: "2027-T1", Trimestral: "2027-T2", Semestral: "2027-S1", Anual: "2027",
};

export default function KpiPage() {
  const [lineFilter, setLineFilter] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const canReportAny = useCan("report_kpi");

  // serie efectiva: seed + valores reportados desde la plataforma
  const [eff, setEff] = useState<Record<string, { series: KpiFull["series"]; reported: string[] }>>({});
  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/td/kpi");
      if (!res.ok) return;
      const j = await res.json();
      setEff(Object.fromEntries(
        (j.kpis as (KpiFull & { reportedPeriods: string[] })[]).map((k) => [
          k.code, { series: k.series, reported: k.reportedPeriods ?? [] },
        ]),
      ));
    } catch { /* seed como respaldo */ }
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  const seriesOf = (k: { code: string; series: KpiFull["series"] }) =>
    eff[k.code]?.series ?? k.series;

  const list = lineFilter ? KPIS.filter((k) => k.line === lineFilter) : KPIS;
  const kpi = open ? KPIS.find((k) => k.code === open) : null;
  const kpiSeries = kpi ? seriesOf(kpi) : [];
  const health = kpi ? kpiHealth({ ...kpi, series: kpiSeries }) : null;
  const kpiObj = kpi ? CMI_OBJECTIVES.find((o) => o.id === kpi.cmi) : null;
  const kpiInis = kpi ? INITIATIVES.filter((i) => i.kpi === kpi.code) : [];

  return (
    <>
      <PageHeader kicker="M4 · Indicadores" title="Indicadores de la educación digital"
        desc="Cada indicador declara su definición operativa, su fórmula, quién produce el dato y con qué frecuencia. Clic en una tarjeta para abrir la ficha completa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canReportAny && (
              <button onClick={() => setImporting((v) => !v)} className="btn-ghost !py-1.5 text-[12px]">
                <Upload size={13} /> Importar CSV
              </button>
            )}
            <AccessChip module="kpi" />
          </div>
        } />

      {importing && canReportAny && (
        <KpiImport onDone={refetch} onClose={() => setImporting(false)} />
      )}

      <div className="rise mb-5 flex flex-wrap gap-2">
        <button onClick={() => setLineFilter(null)}
          className={`chip cursor-pointer ${lineFilter === null ? "chip-cyan" : ""}`}>
          Todos · {KPIS.length}
        </button>
        {LINES.map((l) => (
          <button key={l.n} onClick={() => setLineFilter(lineFilter === l.n ? null : l.n)}
            className={`chip cursor-pointer ${lineFilter === l.n ? "chip-cyan" : ""}`}>
            {l.code} {l.short} · {KPIS.filter((k) => k.line === l.n).length}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* tarjetas */}
        <div className="grid content-start gap-3.5 sm:grid-cols-2">
          {list.map((k, idx) => {
            const series = seriesOf(k);
            const last = series[series.length - 1];
            const prev = series[series.length - 2];
            const delta = prev ? last.value - prev.value : 0;
            const improving = k.goodDirection === "up" ? delta >= 0 : delta <= 0;
            const toTarget = k.goodDirection === "up"
              ? (last.value / k.target) * 100
              : (k.target / last.value) * 100;
            const line = LINES.find((l) => l.n === k.line)!;
            const active = open === k.code;
            return (
              <button key={k.code} onClick={() => setOpen(active ? null : k.code)}
                className={`panel panel-lift rise rise-${Math.min(idx % 4 + 1, 4)} p-4 text-left ${
                  active ? "ring-2 ring-cyan" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12.5px] font-bold leading-snug text-ink">{k.name}</div>
                  <span className="chip shrink-0" style={{ color: line.color }}>{k.code}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="num text-[22px] font-extrabold text-ink">{fmtNum(last.value, 2)}</span>
                  <span className="text-[10.5px] text-faint">{k.unit}</span>
                  <span className="num ml-auto text-[11px] font-bold"
                    style={{ color: improving ? "var(--ok)" : "var(--bad)" }}>
                    {delta >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(delta), 2)}
                  </span>
                </div>
                <div className="mt-1"><Sparkline values={series.map((s) => s.value)} good={improving} /></div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="label !text-[8.5px]">meta {fmtNum(k.target, 1)} · {k.frequency.toLowerCase()}</span>
                  <span className="num text-[9.5px] font-bold"
                    style={{ color: toTarget >= 85 ? "var(--ok)" : toTarget >= 55 ? "var(--warn)" : "var(--bad)" }}>
                    {Math.min(999, Math.round(toTarget))} % de la meta
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ficha */}
        <div className="lg:sticky lg:top-[70px] lg:self-start">
          <Card className="rise rise-2">
            {!kpi ? (
              <div className="px-5 py-6 text-[12.5px] italic text-faint">
                Abre un indicador para ver su ficha: definición operativa, fórmula,
                serie con notas, dueño del dato y objetivo estratégico al que sirve.
              </div>
            ) : (
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="num text-[10px] font-bold text-cyan-deep">{kpi.code}</div>
                    <h3 className="text-[15px] font-extrabold leading-snug text-ink">{kpi.name}</h3>
                  </div>
                  <button onClick={() => setOpen(null)}
                    className="rounded-md p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink">
                    <X size={15} />
                  </button>
                </div>

                <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">{kpi.definition}</p>

                <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
                  <Sigma size={13} className="mt-0.5 shrink-0 text-muted" />
                  <code className="num text-[11px] leading-relaxed text-ink-soft">{kpi.formula}</code>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex items-start gap-2">
                    <User size={13} className="mt-0.5 shrink-0 text-cyan-deep" />
                    <div>
                      <div className="label !text-[8.5px]">Dueño del dato</div>
                      <div className="text-[11.5px] font-semibold leading-snug text-ink">
                        {responsible(kpi.ownerId).cargo}
                      </div>
                      <div className="text-[10px] text-faint">{responsible(kpi.ownerId).dependencia}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Database size={13} className="mt-0.5 shrink-0 text-cyan-deep" />
                    <div>
                      <div className="label !text-[8.5px]">Fuente</div>
                      <div className="text-[11.5px] font-semibold leading-snug text-ink">{kpi.source}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarClock size={13} className="mt-0.5 shrink-0 text-cyan-deep" />
                    <div>
                      <div className="label !text-[8.5px]">Periodicidad</div>
                      <div className="text-[11.5px] font-semibold text-ink">{kpi.frequency}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Target size={13} className="mt-0.5 shrink-0 text-cyan-deep" />
                    <div>
                      <div className="label !text-[8.5px]">Línea base → meta</div>
                      <div className="num text-[11.5px] font-semibold text-ink">
                        {fmtNum(kpi.baseline, 1)} → {fmtNum(kpi.target, 1)} {kpi.unit}
                      </div>
                    </div>
                  </div>
                </div>

                {health && (
                  <div className="mt-4 rounded-lg px-3.5 py-2.5"
                    style={{
                      background: health.projection.willReachTarget
                        ? "color-mix(in srgb, var(--ok) 8%, white)"
                        : "color-mix(in srgb, var(--warn) 10%, white)",
                    }}>
                    <div className="label !text-[8.5px]"
                      style={{ color: health.projection.willReachTarget ? "var(--ok)" : "var(--warn)" }}>
                      Proyección a dic-2028 (tendencia lineal de la serie)
                    </div>
                    <div className="mt-0.5 text-[12px] font-semibold leading-snug text-ink">
                      Al ritmo actual llegaría a{" "}
                      <b className="num">{fmtNum(health.projection.projectedAtTarget, 1)} {kpi.unit}</b>
                      {" "}frente a la meta de <b className="num">{fmtNum(kpi.target, 1)}</b> —{" "}
                      {health.projection.willReachTarget ? "la alcanza." : "no la alcanza: la iniciativa asociada debe acelerar."}
                    </div>
                    {health.isStale && (
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: "var(--bad)" }}>
                        Dato rezagado: {health.staleBy} meses sobre la periodicidad declarada.
                      </div>
                    )}
                  </div>
                )}

                {kpiObj && (
                  <Link href="/panel/capacidades"
                    className="mt-4 block rounded-lg bg-navy px-3.5 py-2.5 transition-transform hover:translate-x-0.5">
                    <div className="num text-[9px] font-bold text-white/60">{kpiObj.id} · OBJETIVO CMI</div>
                    <div className="text-[12px] font-semibold leading-snug text-white">{kpiObj.name}</div>
                  </Link>
                )}

                <div className="mt-4">
                  <div className="label mb-2">Serie del indicador</div>
                  <table className="w-full">
                    <tbody>
                      {kpiSeries.map((s) => (
                        <tr key={s.period} className="border-b border-line last:border-0">
                          <td className="num py-1.5 pr-2 text-[11px] font-semibold text-muted">
                            {s.period}
                            {eff[kpi.code]?.reported.includes(s.period) && (
                              <span className="chip chip-cyan ml-1.5 !py-0 !text-[8px]">reportado</span>
                            )}
                          </td>
                          <td className="num py-1.5 pr-2 text-right text-[12px] font-bold text-ink">
                            {fmtNum(s.value, 2)}
                          </td>
                          <td className="py-1.5 text-[10.5px] italic leading-snug text-faint">{s.note ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ReportForm kpi={kpi} onReported={refetch} />

                {kpiInis.length > 0 && (
                  <div className="mt-4">
                    <div className="label mb-2 flex items-center gap-1.5">
                      <ListChecks size={11} /> Iniciativas que lo mueven
                    </div>
                    {kpiInis.map((i) => (
                      <Link key={i.id} href={`/panel/iniciativas/${i.id}`}
                        className="block rounded-lg bg-gold-wash px-3 py-2 transition-transform hover:translate-x-0.5">
                        <div className="text-[12px] font-semibold text-ink">{i.name}</div>
                        <div className="num mt-0.5 text-[10px]" style={{ color: "var(--gold)" }}>
                          avance {i.progress} % · {i.start} → {i.end}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ─── importador CSV de valores de KPI ─── */

type ImportRow = {
  code: string; period: string; value: number; note?: string;
  problem?: string;                       // validación local
  result?: "ok" | string;                 // resultado del servidor
};

function KpiImport({ onDone, onClose }: {
  onDone: () => Promise<void>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const parse = async (file: File) => {
    const text = await file.text();
    const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setRows([]); return; }
    const delim = lines[0].includes(";") ? ";" : ",";
    const header = lines[0].toLowerCase().split(delim).map((h) => h.trim());
    const idx = {
      code: header.findIndex((h) => /c(ó|o)digo|code/.test(h)),
      period: header.findIndex((h) => /periodo|period/.test(h)),
      value: header.findIndex((h) => /valor|value/.test(h)),
      note: header.findIndex((h) => /nota|note/.test(h)),
    };
    const parsed: ImportRow[] = lines.slice(1).map((l) => {
      const cells = l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
      const code = (cells[idx.code] ?? "").toUpperCase();
      const period = cells[idx.period] ?? "";
      const value = Number((cells[idx.value] ?? "").replace(",", "."));
      const note = idx.note >= 0 ? cells[idx.note] || undefined : undefined;
      const k = KPIS.find((x) => x.code === code);
      const problem = !k ? `código desconocido (${code || "vacío"})`
        : periodIndex(period) === 0 ? `periodo inválido (${period})`
        : !Number.isFinite(value) || value < 0 ? "valor no numérico"
        : undefined;
      return { code, period, value, note, problem };
    });
    setRows(parsed);
    setDone(false);
  };

  const valid = (rows ?? []).filter((r) => !r.problem);

  const runImport = async () => {
    setBusy(true);
    const next = [...(rows ?? [])];
    for (const r of next) {
      if (r.problem) continue;
      const res = await fetch("/api/td/kpi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: r.code, period: r.period, value: r.value, note: r.note }),
      });
      r.result = res.ok ? "ok" : ((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
      setRows([...next]);
    }
    await onDone();
    setDone(true);
    setBusy(false);
  };

  return (
    <Card className="rise mb-5 ring-1 ring-cyan/40">
      <div className="flex flex-wrap items-center gap-2.5 px-5 pb-2 pt-4">
        <span className="p-title">Importar valores de KPI desde CSV</span>
        <span className="p-sub">columnas: código · periodo · valor · nota (separador ; o ,)</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => downloadCsv("plantilla-kpi",
              ["codigo", "periodo", "valor", "nota"],
              [["AV-01", "2027-T2", 52, "corte del LMS"], ["IN-01", "2027-S1", 48, ""]])}
            className="chip cursor-pointer"><FileDown size={10} /> Plantilla</button>
          <button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink">
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="space-y-3 px-5 pb-5">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 transition-colors hover:bg-cyan-wash">
          <Upload size={13} className="shrink-0 text-cyan-deep" />
          <span className={`min-w-0 flex-1 truncate text-[12px] ${fileName ? "font-semibold text-ink" : "text-muted"}`}>
            {fileName || "Seleccionar archivo .csv…"}
          </span>
          <input type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFileName(f.name); parse(f); }
            }} />
        </label>

        {rows && (
          <>
            <div className="max-h-56 overflow-y-auto rounded-lg bg-surface-2/60">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-line-strong">
                    {["Código", "Periodo", "Valor", "Estado"].map((h) => (
                      <th key={h} className="label px-3 py-1.5 text-left !text-[8px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="num px-3 py-1 font-bold text-cyan-deep">{r.code || "—"}</td>
                      <td className="num px-3 py-1 text-muted">{r.period || "—"}</td>
                      <td className="num px-3 py-1 text-right font-semibold text-ink">
                        {Number.isFinite(r.value) ? fmtNum(r.value, 2) : "—"}
                      </td>
                      <td className="px-3 py-1">
                        {r.problem ? (
                          <span className="text-[10.5px]" style={{ color: "var(--bad)" }}>{r.problem}</span>
                        ) : r.result === "ok" ? (
                          <span className="flex items-center gap-1 text-[10.5px]" style={{ color: "var(--ok)" }}>
                            <CheckCircle2 size={10} /> importado
                          </span>
                        ) : r.result ? (
                          <span className="text-[10.5px]" style={{ color: "var(--bad)" }}>{r.result}</span>
                        ) : (
                          <span className="text-[10.5px] text-muted">válida</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={runImport} disabled={busy || valid.length === 0 || done}
                className="btn-primary !py-2 text-[12px] disabled:opacity-40">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Importar {valid.length} válida{valid.length !== 1 ? "s" : ""}
              </button>
              <span className="text-[11px] text-faint">
                {rows.length - valid.length > 0 && `${rows.length - valid.length} con problemas (no se importan) · `}
                el servidor revalida permisos y reglas fila a fila
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/* ─── registrar el valor del periodo (report_kpi, por línea) ─── */

function ReportForm({ kpi, onReported }: {
  kpi: (typeof KPIS)[number];
  onReported: () => Promise<void>;
}) {
  const canReport = useCan("report_kpi", kpi.line);
  const [period, setPeriod] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  if (!canReport) {
    return (
      <p className="mt-4 text-[10.5px] italic text-faint">
        El valor del periodo lo reporta el dueño del dato (responsable de la capacidad {LINES[kpi.line - 1].name}, líder o advisor).
      </p>
    );
  }

  const submit = async () => {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    const res = await fetch("/api/td/kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: kpi.code, period: period.trim(), value: Number(value), note: note || undefined }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error al reportar");
    } else {
      setOkMsg(`${period.trim()} = ${value} ${kpi.unit} registrado`);
      setPeriod(""); setValue(""); setNote("");
      await onReported();
    }
    setSaving(false);
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg bg-surface-2/70 p-3">
      <div className="label !text-[8.5px]">Registrar valor del periodo</div>
      <div className="flex gap-2">
        <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)}
          placeholder={PERIOD_HINT[kpi.frequency]}
          className="input w-24 !py-1.5 text-[11.5px]" />
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={`valor (${kpi.unit})`}
          className="input min-w-0 flex-1 !py-1.5 text-[11.5px]" />
      </div>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Nota del periodo (opcional)"
        className="input !py-1.5 text-[11.5px]" />
      {error && (
        <p className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--bad)" }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {okMsg && <p className="num text-[11px]" style={{ color: "var(--ok)" }}>✓ {okMsg}</p>}
      <button onClick={submit} disabled={saving || !period.trim() || value === ""}
        className="btn-primary w-full !py-1.5 text-[11.5px] disabled:opacity-40">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
        Reportar
      </button>
      <p className="text-[9px] text-faint">
        Se suma a la serie y recalcula semáforo, rezago y proyección. Queda en la auditoría.
      </p>
    </div>
  );
}
