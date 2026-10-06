"use client";

// M1 · Diagnóstico 4Shine-OD con rutas profundas:
//   /panel/diagnostico                      → resumen: radar, mapa de calor, fuentes y señales
//   /panel/diagnostico/capacidad/<n>        → una capacidad y sus dimensiones
//   /panel/diagnostico/dimension/<DIR-1>    → una dimensión: prácticas, evidencia y fuentes
//   /panel/diagnostico/test                 → test de capacidad empresarial: participantes y contraste
//   /panel/diagnostico/brechas              → brechas priorizadas y nivel de acompañamiento
//   /panel/diagnostico/captura              → captura del corte A3 (autoevaluación y verificación)

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader, StatCard, LevelBadge } from "@/components/ui";
import { AccessChip, useCan } from "@/components/user-context";
import { MaturityRadar, MaturityHeatmap, MiniRadar } from "@/components/charts";
import { LINES, fmtNum } from "@/data/demo";
import {
  CAPS, DIMS, dimOf, dimsOf, PRACTICES, LEVELS, STAGES, TEST, GUIDES, FLAG_TEXT,
  methodologyOf, frameworkOf, frameworkOfPractice, DRAG_WEIGHT, THRESHOLD, levelName,
} from "@/data/mapa";
import { CONSOLIDATED, EVIDENCE_CATALOG, ASSESSMENTS, responsible } from "@/data/cmi";
import { OD_RESPONSES } from "@/data/od-demo";
import { readTest, recommend, testContrast, avg, rangeText, type DimResult } from "@/lib/od";
import { useMaturity } from "@/lib/use-maturity";
import type { VariableCapture } from "@/server/store";
import {
  Radar, Layers, ClipboardList, Flame, PenLine, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, Info, Loader2, Upload, FileCheck2,
} from "lucide-react";

type Tab = "resumen" | "capacidad" | "dimension" | "test" | "brechas" | "captura";
const TABS: { id: Tab; label: string; icon: typeof Radar; href: string }[] = [
  { id: "resumen", label: "Resumen", icon: Radar, href: "/panel/diagnostico" },
  { id: "capacidad", label: "Capacidades", icon: Layers, href: "/panel/diagnostico/capacidad/1" },
  { id: "test", label: "Test", icon: ClipboardList, href: "/panel/diagnostico/test" },
  { id: "brechas", label: "Brechas", icon: Flame, href: "/panel/diagnostico/brechas" },
  { id: "captura", label: "Captura A3", icon: PenLine, href: "/panel/diagnostico/captura" },
];

const f1 = (x: number | null | undefined, d = 1) => (x == null ? "—" : fmtNum(x, d));
const LEVEL_CLS = ["", "chip-bad", "chip-warn", "", "chip-ok", "chip-ok"];

export default function DiagnosticoPage() {
  const params = useParams<{ slug?: string[] }>();
  const slug = params.slug ?? [];
  const seg = (slug[0] ?? "resumen").toLowerCase();
  const tab: Tab = (["capacidad", "dimension", "test", "brechas", "captura"].includes(seg) ? seg : "resumen") as Tab;
  const arg = slug[1] ? decodeURIComponent(slug[1]).toUpperCase() : null;
  const router = useRouter();

  return (
    <>
      <PageHeader kicker="M1 · Diagnóstico 4Shine-OD" title="Capacidad organizacional de la empresa"
        desc="Dos instrumentos en secuencia: el test de capacidad empresarial como puerta de entrada y el diagnóstico completo de tres fuentes sobre las 68 prácticas del mapa. Madurez = 0,40 × evidencia + 0,30 × dirección + 0,30 × equipos, con techo de evidencia."
        actions={<AccessChip module="madurez" />} />
      <div className="rise mb-6 flex flex-wrap gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {TABS.map((t) => {
          const on = tab === t.id || (tab === "dimension" && t.id === "capacidad");
          return (
            <button key={t.id} onClick={() => router.push(t.href)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <t.icon size={14} className={on ? "text-cyan-deep" : ""} />{t.label}
            </button>
          );
        })}
      </div>
      {tab === "resumen" && <Resumen />}
      {tab === "capacidad" && <Capacidad n={Number(arg ?? 1)} />}
      {tab === "dimension" && arg && <Dimension code={arg} />}
      {tab === "test" && <TestTab />}
      {tab === "brechas" && <Brechas />}
      {tab === "captura" && <Captura />}
    </>
  );
}

/* ═══ Resumen ═══ */

function Resumen() {
  const { scores, data } = useMaturity();
  const C = CONSOLIDATED;
  const flagged = C.dims.filter((d) => d.flags.length);
  const belowCaps = C.caps.filter((c) => (c.m ?? 5) < THRESHOLD);
  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Madurez de la empresa" value={avg(C.caps.map((c) => c.m)) ?? 0} decimals={1} foot="promedio de las cuatro capacidades" />
        <StatCard label="Capacidades en brecha" value={belowCaps.length} foot={belowCaps.length ? belowCaps.map((c) => c.name).join(", ") : "ninguna bajo 3,0"} good={belowCaps.length === 0} />
        <StatCard label="Dimensiones bajo el umbral" value={C.priorities.length} unit="de 17" foot="prioridad = (3,0 − madurez) × arrastre" />
        <StatCard label="Evidencias verificadas" value={EVIDENCE_CATALOG.filter((e) => e.status === "VERIFICADA").length} unit="de 68" foot="una por práctica, revisadas tal como están" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="rise rise-1">
          <CardHeader title="Radar de capacidades" sub="madurez triangulada frente a la meta a 24 meses" />
          <div className="px-4 pb-4"><MaturityRadar scores={scores} /></div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Mapa de calor de las 17 dimensiones" sub={`${data?.current.label ?? "Medición vigente"} · clic en una dimensión abre sus prácticas`} />
          <div className="px-5 pb-5 pt-2">
            <MaturityHeatmap scores={scores} onCell={(_, dim) => { window.location.href = `/panel/diagnostico/dimension/${dim}`; }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-5 py-2.5 text-[10.5px] text-faint">
            {LEVELS.map((l) => <span key={l.n} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded" style={{ background: l.color }} /> {l.n} {l.name}</span>)}
          </div>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-2">
          <CardHeader title="Las tres fuentes por capacidad" sub="F1 autoevaluación directiva · F2 percepción de equipos · F3 evidencia documental" />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint">
                <th className="px-3 py-2">Capacidad</th><th className="num px-2 py-2 text-center">F1</th><th className="num px-2 py-2 text-center">F2</th><th className="num px-2 py-2 text-center">F3</th><th className="num px-2 py-2 text-center">Madurez</th><th className="px-3 py-2">Nivel</th>
              </tr></thead>
              <tbody>
                {C.caps.map((c) => (
                  <tr key={c.n} className="border-t border-line">
                    <td className="px-3 py-2 font-bold text-ink"><Link href={`/panel/diagnostico/capacidad/${c.n}`} className="hover:text-cyan-deep">{LINES[c.n - 1].code} {c.name}</Link></td>
                    <td className="num px-2 py-2 text-center">{f1(c.f1)}</td>
                    <td className="num px-2 py-2 text-center">{f1(c.f2)}</td>
                    <td className="num px-2 py-2 text-center">{f1(c.f3)}</td>
                    <td className="num px-2 py-2 text-center font-extrabold text-ink">{f1(c.m)}</td>
                    <td className="px-3 py-2">{c.m != null && <span className={`chip ${LEVEL_CLS[Math.round(c.m) < 3 ? 1 : 4]}`}>{levelName(c.m)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-2.5 text-[11px] text-faint">
            {C.f1n} autoevaluaciones · {C.f2n} respuestas de equipos{C.okF2 ? "" : " (muestra insuficiente: se repondera 55/45)"} · evidencia {C.hasF3 ? "registrada" : "pendiente"}.
          </div>
        </Card>
        <Card className="rise rise-3">
          <CardHeader title="Señales entre fuentes" sub="donde las miradas discrepan aparece el hallazgo que más mueve la conversación" />
          <div className="divide-y divide-line">
            {flagged.length === 0 && <div className="px-5 py-4 text-[12.5px] italic text-faint">No hay divergencias marcadas.</div>}
            {flagged.map((d) => (
              <Link key={d.code} href={`/panel/diagnostico/dimension/${d.code}`} className="block px-5 py-3 transition-colors hover:bg-surface-2/70">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-ink">{d.code} · {d.name}</span>
                  {d.flags.map((f) => <span key={f.key} className={`chip ${f.severe ? "chip-bad" : "chip-warn"}`}>{f.key}</span>)}
                </div>
                <div className="num mt-1 text-[11px] text-muted">F1 {f1(d.f1)} · F2 {f1(d.f2raw)} · F3 {f1(d.f3)} → madurez {f1(d.m)} ({d.base})</div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rise rise-4">
        <CardHeader title="Serie de mediciones" sub="la madurez es una serie, no una foto" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
          {ASSESSMENTS.map((a) => (
            <div key={a.id} className={`rounded-xl px-4 py-3 ${a.status === "PUBLICADA" ? "bg-surface-2" : "border border-dashed border-line-strong"}`}>
              <div className="flex items-center justify-between"><span className="num text-[10px] font-bold text-faint">{a.id} · {a.period}</span><span className={`chip ${a.status === "PUBLICADA" ? "chip-ok" : "chip-warn"}`}>{a.status === "PUBLICADA" ? "Publicada" : "En captura"}</span></div>
              <div className="mt-1 text-[13px] font-bold text-ink">{a.label}</div>
              <div className="mt-1 text-[11.5px] leading-snug text-muted">{a.note}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ═══ Capacidad ═══ */

function Capacidad({ n }: { n: number }) {
  const cap = CAPS.find((c) => c.n === n) ?? CAPS[0];
  const { scores } = useMaturity();
  const dims = dimsOf(cap.n);
  const C = CONSOLIDATED;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CAPS.map((c) => (
          <Link key={c.n} href={`/panel/diagnostico/capacidad/${c.n}`}
            className={`chip ${c.n === cap.n ? "chip-cyan" : ""}`} style={c.n === cap.n ? { background: c.color, color: "#fff" } : undefined}>
            {c.code} · {c.name}
          </Link>
        ))}
      </div>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card className="rise rise-1">
          <CardHeader title={`${cap.name} · ${cap.verb}`} sub={cap.q} />
          <div className="divide-y divide-line">
            {dims.map((d) => {
              const r = C.dims.find((x) => x.code === d.code)!;
              const s = scores[d.line][d.code];
              return (
                <Link key={d.code} href={`/panel/diagnostico/dimension/${d.code}`} className="grid gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/70 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="num text-[10.5px] font-bold text-cyan-deep">{d.code}</span><span className="text-[13.5px] font-bold text-ink">{d.name}</span>{r.flags.map((f) => <span key={f.key} className={`chip ${f.severe ? "chip-bad" : "chip-warn"}`}>{f.key}</span>)}</div>
                    <p className="mt-1 text-[12px] leading-snug text-muted">{d.defn}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="num text-right text-[11px] text-muted">F1 {f1(r.f1)} · F2 {f1(r.f2raw)} · F3 {f1(r.f3)}</div>
                    <div className="text-right"><div className="num text-[20px] font-extrabold text-ink">{fmtNum(s.value, 1)}</div><div className="num text-[10px] text-faint">meta {s.target}</div></div>
                    <LevelBadge level={Math.max(1, Math.min(5, Math.round(s.value)))} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Perfil de la capacidad" sub="madurez por dimensión frente a la meta" />
          <div className="px-4 pb-4"><MiniRadar color={cap.color} axes={dims.map((d) => ({ label: d.code, value: scores[d.line][d.code].value, target: scores[d.line][d.code].target }))} /></div>
        </Card>
      </div>
    </>
  );
}

/* ═══ Dimensión ═══ */

function Dimension({ code }: { code: string }) {
  const d = DIMS.find((x) => x.code === code);
  if (!d) return <div className="text-muted">La dimensión {code} no existe.</div>;
  const r = CONSOLIDATED.dims.find((x) => x.code === d.code)!;
  const cap = CAPS.find((c) => c.n === d.line)!;
  const idx = DIMS.indexOf(d);
  const prev = DIMS[idx - 1], next = DIMS[idx + 1];
  const F1 = OD_RESPONSES.filter((x) => x.tipo === "f1");
  const F2 = OD_RESPONSES.filter((x) => x.tipo === "f2");
  const F3 = OD_RESPONSES.find((x) => x.tipo === "f3")!;
  const MARK = { V: ["Verificada", "chip-ok"], P: ["Parcial", "chip-warn"], N: ["No existe", "chip-bad"] } as const;
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href={`/panel/diagnostico/capacidad/${d.line}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline"><ArrowLeft size={13} /> {cap.code} · {cap.name}</Link>
        <div className="flex gap-2">
          {prev && <Link href={`/panel/diagnostico/dimension/${prev.code}`} className="chip">← {prev.code}</Link>}
          {next && <Link href={`/panel/diagnostico/dimension/${next.code}`} className="chip">{next.code} →</Link>}
        </div>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Madurez triangulada" value={r.m ?? 0} decimals={1} foot={`${r.base} · ${r.m != null ? levelName(r.m) : ""}`} />
        <StatCard label="F1 · Autoevaluación directiva" value={r.f1 ?? 0} decimals={1} foot={r.sd1 != null ? `dispersión del comité ${fmtNum(r.sd1, 2)}` : ""} />
        <StatCard label="F2 · Percepción de equipos" value={r.f2raw ?? 0} decimals={1} foot={r.f2 == null ? "muestra insuficiente" : "promedio de dos ítems"} />
        <StatCard label="F3 · Evidencia documental" value={r.f3 ?? 0} decimals={0} foot={`${r.verified} de 4 evidencias verificadas`} />
      </div>
      {r.flags.length > 0 && (
        <div className="mb-5 space-y-2">
          {r.flags.map((f) => (
            <div key={f.key} className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px]" style={{ background: f.severe ? "#fbeaea" : "var(--gold-wash)" }}>
              {f.severe ? <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} /> : <Info size={15} className="mt-0.5 shrink-0" style={{ color: "var(--gold)" }} />}
              <span><b className="text-ink">{f.key}.</b> {FLAG_TEXT[f.key]}</span>
            </div>
          ))}
        </div>
      )}
      <Card className="rise rise-1 mb-5">
        <CardHeader title={`${d.code} · ${d.name}`} sub={d.defn} />
        <div className="grid gap-4 px-5 pb-5 lg:grid-cols-3">
          {(["Nivel 1 · Incipiente", "Nivel 3 · Instalada", "Nivel 5 · Multiplicadora"] as const).map((t, i) => (
            <div key={t} className="rounded-xl bg-surface-2 px-4 py-3"><div className="label mb-1">{t}</div><p className="text-[12px] leading-snug text-ink-soft">{d.rub[i]}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">
          <span className="text-[11px] font-bold text-faint">Metodologías:</span>
          {d.mets.map((m) => <span key={m} className="chip" title={methodologyOf(m).principio}>{m} · {methodologyOf(m).name}</span>)}
          <span className="ml-2 text-[11px] font-bold text-faint">Frameworks:</span>
          {d.fws.map((f) => <Link key={f} href={`/panel/metodologia#${f}`} className="chip chip-cyan">{f} · {frameworkOf(f).name}</Link>)}
        </div>
      </Card>

      <div className="space-y-4">
        {d.prac.map((p) => {
          const ev = EVIDENCE_CATALOG.find((e) => e.practice === p.code)!;
          const mark = F3.r[p.code] as "V" | "P" | "N" | undefined;
          const f1avg = avg(F1.map((f) => f.r[p.code]));
          const fw = frameworkOfPractice(p.code);
          const guide = GUIDES.f1[p.code];
          return (
            <Card key={p.code} className="rise rise-2">
              <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_320px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="num text-[10.5px] font-extrabold text-cyan-deep">{p.code}</span><span className="num text-[11px] text-muted">autoevaluación {f1(f1avg)}</span><Link href={`/panel/metodologia#${fw.id}`} className="chip">{fw.id} · {fw.name}</Link></div>
                  <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink">{p.f1}</p>
                  {guide?.q && <p className="mt-1 text-[11.5px] italic text-muted">{guide.q}</p>}
                  <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2"><span className="label">Evidencia</span>{mark && <span className={`chip ${MARK[mark][1]}`}>{MARK[mark][0]}</span>}<span className="num text-[10px] text-faint">{ev.id} · {ev.kind} · {responsible(ev.sourceId).dependencia}</span></div>
                    <p className="text-[12px] leading-snug text-ink-soft">{p.ev}</p>
                    <p className="mt-1 text-[11.5px] leading-snug text-muted">{p.verif}</p>
                    {ev.note && <p className="mt-1 text-[11px] italic text-muted">{ev.note}</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-line px-4 py-3">
                  <div className="label mb-2">Lo que viven los equipos</div>
                  {d.f2.map((q) => (
                    <div key={q.code} className="mb-2 text-[12px]"><div className="flex items-baseline justify-between gap-2"><span className="leading-snug text-ink-soft">{q.text}</span><b className="num shrink-0 text-ink">{f1(avg(F2.map((f) => f.r[q.code])))}</b></div></div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ═══ Test ═══ */

function TestTab() {
  const tests = OD_RESPONSES.filter((x) => x.tipo === "test");
  const reads = tests.map((t) => readTest(t.r));
  const contrast = testContrast(tests);
  const stages = new Set(reads.map((r) => r.stage));
  return (
    <>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rise rise-1">
          <CardHeader title="Participantes" sub="24 preguntas, seis por capacidad, más el desafío dominante · cobertura mínima 5 de 6 para reportar" />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Participante</th>{TEST.bloques.map((b) => <th key={b.cap} className="num px-2 py-2 text-center">{b.cap}</th>)}<th className="px-3 py-2">Etapa según respuestas</th><th className="px-3 py-2">Pregunta 25</th></tr></thead>
              <tbody>
                {tests.map((t, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2"><b className="text-ink">{String(t.meta.nombre)}</b><div className="text-[10.5px] text-faint">{String(t.meta.cargo ?? "")}</div></td>
                    {reads[i].caps.map((c) => <td key={c.n} className={`num px-2 py-2 text-center ${c.avg != null && c.avg < THRESHOLD ? "font-bold" : ""}`} style={c.avg != null && c.avg < THRESHOLD ? { color: "var(--bad)" } : undefined}>{f1(c.avg, 2)}<div className="text-[9.5px] font-normal text-faint">{c.cov}/6</div></td>)}
                    <td className="px-3 py-2 font-semibold text-ink">{reads[i].stage}{reads[i].provisional ? " (provisional)" : ""}</td>
                    <td className="px-3 py-2 text-muted">{reads[i].hypothesis ?? "—"}</td>
                  </tr>
                ))}
                {tests.length > 1 && <tr className="border-t border-line bg-surface-2/60"><td className="px-3 py-2 font-bold text-ink">Promedio</td>{TEST.bloques.map((b, i) => <td key={b.cap} className="num px-2 py-2 text-center font-extrabold text-ink">{f1(avg(reads.map((r) => r.caps[i].avg)), 2)}</td>)}<td colSpan={2} /></tr>}
              </tbody>
            </table>
          </div>
          {stages.size > 1 && <div className="border-t border-line px-5 py-3 text-[12px] text-muted">Los participantes no coinciden en la etapa: se reportan como hipótesis hasta comprobar con evidencia qué restricción explica mejor el bloqueo actual.</div>}
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Lectura del perfil" sub="rangos propios del test" />
          <div className="space-y-2 px-5 pb-4">
            {TEST.bloques.map((b, i) => { const a = avg(reads.map((r) => r.caps[i].avg)); return (
              <div key={b.cap} className="text-[12px]"><div className="flex items-baseline justify-between"><b className="text-ink">{b.cap}</b><span className="num text-muted">{f1(a, 2)}</span></div><div className="relative h-[7px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((a ?? 0) / 5) * 100}%`, background: a != null && a < THRESHOLD ? "var(--bad)" : LINES[i].color }} /><div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: "60%" }} /></div><div className="mt-0.5 text-[11px] leading-snug text-muted">{rangeText(a)}</div></div>
            ); })}
          </div>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-3">
          <CardHeader title="Conversaciones de contraste" sub="diferencias de dos o más puntos entre participantes: no se promedian, se conversan" />
          <div className="divide-y divide-line">
            {contrast.length === 0 && <div className="px-5 py-4 text-[12.5px] italic text-faint">Sin diferencias de dos o más puntos.</div>}
            {contrast.map((c) => <div key={c.q.n} className="px-5 py-2.5 text-[12.5px]"><b className="num text-cyan-deep">{c.q.n}.</b> <span className="text-ink-soft">{c.q.q}</span><div className="num mt-0.5 text-[11px] text-muted">respuestas {c.vs.join(" · ")} · diferencia {c.d}</div></div>)}
          </div>
        </Card>
        <Card className="rise rise-4">
          <CardHeader title="Patrones y prioridades" sub="según las respuestas de la gerencia general" />
          <div className="divide-y divide-line">
            {reads[0].patterns.map((p, i) => (
              <div key={p.hip} className="px-5 py-3"><div className="label mb-0.5">{i === 0 ? "Prioridad principal" : "Prioridad de soporte"} · preguntas {p.qs.join(", ")}</div><div className="text-[13px] font-bold text-ink">{p.accion}</div><div className="text-[12px] text-muted">{p.hip}</div></div>
            ))}
            {reads[0].pending.length > 0 && <div className="px-5 py-3 text-[12px] text-muted">Pendientes de verificación: preguntas {reads[0].pending.join(", ")}.</div>}
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {STAGES.map((s) => { const on = reads[0].stage === s.name; return (
          <div key={s.name} className={`rounded-xl px-4 py-3 ${on ? "text-white" : "bg-surface-2"}`} style={on ? { background: "var(--navy)" } : undefined}>
            <div className={`text-[13px] font-extrabold ${on ? "" : "text-ink"}`}>{s.name}</div>
            <div className={`mt-0.5 text-[11px] leading-snug ${on ? "text-white/80" : "text-muted"}`}>{s.pregunta}</div>
            <div className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${on ? "text-cyan-fill" : "text-faint"}`}>Lidera {s.lider}</div>
          </div>
        ); })}
      </div>
    </>
  );
}

/* ═══ Brechas ═══ */

function Brechas() {
  const C = CONSOLIDATED;
  const R = recommend(C);
  const row = (d: DimResult, i: number) => {
    const dim = dimOf(d.code);
    return (
      <Card key={d.code} className={`rise rise-${Math.min(i + 1, 4)}`}>
        <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="num text-[11px] font-extrabold" style={{ color: i === 0 ? "var(--bad)" : "var(--gold)" }}>{i === 0 ? "CUELLO DE BOTELLA" : `BRECHA ${i + 1}`}</span><span className="num text-[11px] text-muted">madurez {f1(d.m)} · arrastre {fmtNum(DRAG_WEIGHT(d.code), 1)} · prioridad {fmtNum(d.priority, 2)}</span></div>
            <Link href={`/panel/diagnostico/dimension/${d.code}`} className="mt-1 block text-[15px] font-extrabold text-ink hover:text-cyan-deep">{d.code} · {d.name}</Link>
            <p className="mt-1 text-[12.5px] leading-snug text-muted">{dim.defn}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{d.flags.map((f) => <span key={f.key} className={`chip ${f.severe ? "chip-bad" : "chip-warn"}`}>{f.key}</span>)}</div>
          </div>
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <div className="label mb-1">Cómo se instala</div>
            <div className="flex flex-wrap gap-1">{dim.mets.map((m) => <span key={m} className="chip">{methodologyOf(m).name}</span>)}</div>
            <div className="label mb-1 mt-2">Con qué framework</div>
            <div className="flex flex-wrap gap-1">{dim.fws.map((f) => <Link key={f} href={`/panel/metodologia#${f}`} className="chip chip-cyan">{f} · {frameworkOf(f).name}</Link>)}</div>
          </div>
        </div>
      </Card>
    );
  };
  return (
    <>
      <div className="rise mb-5 rounded-2xl px-6 py-5 text-white" style={{ background: "var(--grad-deep)" }}>
        <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel de acompañamiento recomendado</div>
        <div className="mt-1 text-[26px] font-extrabold tracking-tight">{R.level}</div>
        <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-white/80">{R.text}</p>
        {R.notNeeded && <p className="mt-2 text-[12.5px] text-white/70">{R.notNeeded}</p>}
      </div>
      <p className="mb-4 text-[12.5px] text-muted">El cuello de botella es una dimensión, no una capacidad. Las brechas se ordenan por profundidad y por cuántas otras dimensiones arrastran: DIR-4 y EJE-2 pesan 1,5; LID-1 y MUL-5, 1,4; LID-2 y EJE-4, 1,3; las demás, 1,0.</p>
      <div className="space-y-4">{C.priorities.slice(0, 6).map(row)}</div>
      {C.priorities.length > 6 && <p className="mt-4 text-[12px] text-muted">Otras dimensiones bajo el umbral: {C.priorities.slice(6).map((d) => `${d.code} (${f1(d.m)})`).join(", ")}.</p>}
    </>
  );
}

/* ═══ Captura A3 ═══ */

type CaptureApi = { capture: { vars: Record<string, VariableCapture>; progress: { total: number; perception: number; dik: number; level: number } }; published: boolean };

function Captura() {
  const canCapture = useCan("capture_maturity");
  const canPublish = useCan("publish_maturity");
  const [data, setData] = useState<CaptureApi | null>(null);
  const [cap, setCap] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/td/maturity"); if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  const send = async (code: string, patch: Record<string, unknown>) => {
    setBusy(code); setMsg(null);
    const r = await fetch("/api/td/captura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ varId: code, ...patch }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "No se pudo guardar.");
    await load(); setBusy(null);
  };
  const publish = async () => {
    setBusy("publish"); setMsg(null);
    const r = await fetch("/api/td/captura/publicar", { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Corte A3 publicado: ahora es la medición vigente." : (j.error ?? "No se pudo publicar."));
    await load(); setBusy(null);
  };
  const vars = data?.capture.vars ?? {};
  const prog = data?.capture.progress;
  const practices = useMemo(() => PRACTICES.filter((p) => p.line === cap), [cap]);
  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Autoevaluación capturada" value={prog?.perception ?? 0} unit="de 68" foot="responsables de cada capacidad y advisor" />
        <StatCard label="Evidencia marcada" value={prog?.dik ?? 0} unit="de 68" foot="verificada, parcial o no existe · advisor" />
        <StatCard label="Nivel calificado" value={prog?.level ?? 0} unit="de 68" foot="contra la rúbrica · publicar exige las 68" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CAPS.map((c) => <button key={c.n} onClick={() => setCap(c.n)} className="chip" style={c.n === cap ? { background: c.color, color: "#fff" } : undefined}>{c.code} · {c.name}</button>)}
        <span className="flex-1" />
        {data?.published ? <span className="chip chip-ok"><FileCheck2 size={11} /> A3 publicada</span> : canPublish && (
          <button onClick={publish} disabled={busy !== null} className="btn-primary inline-flex items-center gap-1.5 text-[12px]">{busy === "publish" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Publicar corte A3</button>
        )}
      </div>
      {msg && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: "var(--gold-wash)", color: "var(--gold)" }}>{msg}</div>}
      {!canCapture && <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-muted">Tu rol consulta la captura; la registran los responsables de cada capacidad y el advisor.</div>}
      <div className="space-y-5">
        {dimsOf(cap).map((d) => (
          <Card key={d.code}>
            <CardHeader title={`${d.code} · ${d.name}`} sub={d.defn} />
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-5 py-2">Práctica</th><th className="px-2 py-2">Autoevaluación</th><th className="px-2 py-2">Evidencia</th><th className="px-2 py-2">Nivel</th><th className="px-2 py-2">Registro</th></tr></thead>
                <tbody>
                  {practices.filter((p) => p.dim === d.code).map((p) => {
                    const c = vars[p.code];
                    return (
                      <tr key={p.code} className="border-t border-line align-top">
                        <td className="px-5 py-2.5"><span className="num text-[10.5px] font-bold text-cyan-deep">{p.code}</span><div className="text-[12px] leading-snug text-ink-soft">{p.f1}</div></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canCapture || busy === p.code || data?.published} value={c?.perception ?? ""} onChange={(e) => send(p.code, { perception: Number(e.target.value) })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {LEVELS[n - 1].name}</option>)}</select></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canPublish || busy === p.code || data?.published} value={c?.evidence ?? ""} onChange={(e) => send(p.code, { evidence: e.target.value })}><option value="">—</option><option value="V">Verificada</option><option value="P">Parcial</option><option value="N">No existe</option></select></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canPublish || busy === p.code || data?.published} value={c?.level ?? ""} onChange={(e) => send(p.code, { level: Number(e.target.value) })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
                        <td className="px-2 py-2.5 text-[11px] text-faint">{c ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} style={{ color: "var(--ok)" }} /> {c.by} · {new Date(c.at).toLocaleDateString("es-CO")}</span> : "sin captura"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
