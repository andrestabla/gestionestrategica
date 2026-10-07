"use client";

// M1 · Diagnóstico 4Shine-OD con rutas profundas:
//   /panel/diagnostico                      → resumen: radar, mapa de calor, fuentes y señales
//   /panel/diagnostico/capacidad/<n>        → una capacidad y sus dimensiones
//   /panel/diagnostico/dimension/<DIR-1>    → una dimensión: prácticas, evidencia y fuentes
//   /panel/diagnostico/test                 → test de capacidad empresarial: participantes y contraste
//   /panel/diagnostico/brechas              → brechas priorizadas y nivel de acompañamiento
//   /panel/diagnostico/captura              → captura del corte A3 (autoevaluación y verificación)

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader, StatCard, LevelBadge } from "@/components/ui";
import { AccessChip, useCan } from "@/components/user-context";
import { MaturityRadar, MaturityHeatmap, MiniRadar, type ScoresMap } from "@/components/charts";
import { useCatalog } from "@/components/catalog-context";
import { LINES, fmtNum } from "@/data/demo";
import {
  CAPS, DIMS, dimOf, dimsOf, PRACTICES, LEVELS, STAGES, TEST, TEST_QUESTIONS, GUIDES, FLAG_TEXT,
  methodologyOf, frameworkOf, frameworkOfPractice, DRAG_WEIGHT, THRESHOLD, levelName,
} from "@/data/mapa";
import { scoresOf, responsible } from "@/lib/vista";
import { consolidate, readTest, recommend, testContrast, avg, rangeText, type DimResult, type Consolidated } from "@/lib/od";
import { useMaturity } from "@/lib/use-maturity";
import type { VariableCapture, TestResponse, TestNotes } from "@/server/store";
import type { Response } from "@/lib/od";
import {
  Radar, Layers, ClipboardList, Flame, PenLine, ArrowLeft, CheckCircle2,
  AlertTriangle, Info, Loader2, Upload, FileCheck2, Send, Link2, Users, Printer, FileText,
} from "lucide-react";

type Tab = "resumen" | "capacidad" | "dimension" | "test" | "brechas" | "captura" | "informe";

/* ═══ Corte que se lee: el publicado (las fuentes demo de la empresa, si las
   tiene) o el que se captura en la plataforma ═══ */

type Cut = { src: "vigente" | "curso"; responses: Response[]; C: Consolidated; label: string; scores: ScoresMap | null };
/** Corte sin fuentes: todas las dimensiones sin dato. Solo sirve de valor por
    defecto del contexto; el DiagnosticoPage siempre provee el corte real. */
const EMPTY_CUT: Cut = { src: "vigente", responses: [], C: consolidate([]), label: "Sin corte", scores: null };
/** Mapa de puntajes del corte en curso: las dimensiones sin dato van en −1 (los gráficos las muestran en blanco). */
const cutScoresOf = (C: Consolidated, base: ScoresMap): ScoresMap => {
  const out: ScoresMap = { 1: {}, 2: {}, 3: {}, 4: {} };
  for (const d of C.dims) out[d.line][d.code] = { value: d.m ?? -1, target: base[d.line]?.[d.code]?.target ?? 3 };
  return out;
};
const CutCtx = createContext<Cut>(EMPTY_CUT);
const useCut = () => useContext(CutCtx);
type OdApi = { responses: Response[]; published: boolean; progress: { total: number; perception: number; dik: number; level: number }; f2: number };
const TABS: { id: Tab; label: string; icon: typeof Radar; href: string }[] = [
  { id: "resumen", label: "Resumen", icon: Radar, href: "/panel/diagnostico" },
  { id: "capacidad", label: "Capacidades", icon: Layers, href: "/panel/diagnostico/capacidad/1" },
  { id: "test", label: "Test", icon: ClipboardList, href: "/panel/diagnostico/test" },
  { id: "brechas", label: "Brechas", icon: Flame, href: "/panel/diagnostico/brechas" },
  { id: "captura", label: "Captura A3", icon: PenLine, href: "/panel/diagnostico/captura" },
  { id: "informe", label: "Informe", icon: FileText, href: "/panel/diagnostico/informe" },
];

const f1 = (x: number | null | undefined, d = 1) => (x == null ? "—" : fmtNum(x, d));
const LEVEL_CLS = ["", "chip-bad", "chip-warn", "", "chip-ok", "chip-ok"];

export default function DiagnosticoPage() {
  const params = useParams<{ slug?: string[] }>();
  const slug = params.slug ?? [];
  const seg = (slug[0] ?? "resumen").toLowerCase();
  const tab: Tab = (["capacidad", "dimension", "test", "brechas", "captura", "informe"].includes(seg) ? seg : "resumen") as Tab;
  const arg = slug[1] ? decodeURIComponent(slug[1]).toUpperCase() : null;
  const arg2 = slug[2] ? decodeURIComponent(slug[2]) : null;
  const router = useRouter();
  const v = useCatalog();
  const [od, setOd] = useState<OdApi | null>(null);
  const [src, setSrc] = useState<"vigente" | "curso" | null>(null);
  useEffect(() => { fetch("/api/td/od").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setOd(j); }).catch(() => null); }, [tab]);
  const hasCurso = (od?.responses.length ?? 0) > 0;
  // Corte publicado: las fuentes demo de la empresa (vacías en una empresa nueva:
  // entonces el corte publicado no tiene respuestas y la UI rinde con el corte en curso).
  const publishedCut = useMemo<Cut>(() => {
    const responses = v.catalog.demoResponses;
    return { src: "vigente", responses, C: consolidate(responses), label: `Corte publicado · ${v.current.id}`, scores: null };
  }, [v]);
  const eff = src ?? (od?.published ? "curso" : "vigente");
  const cut = useMemo<Cut>(() => {
    if (eff === "curso" && od && hasCurso) {
      const C = consolidate(od.responses);
      return { src: "curso", responses: od.responses, C, label: od.published ? "Corte A3 · publicado desde la plataforma" : "Corte en curso · capturado en la plataforma", scores: cutScoresOf(C, scoresOf(v)) };
    }
    return publishedCut;
  }, [eff, od, hasCurso, publishedCut, v]);

  return (
    <CutCtx.Provider value={cut}>
      <div className="no-print">
      <PageHeader kicker="M1 · Diagnóstico 4Shine-OD" title="Capacidad organizacional de la empresa"
        desc="Dos instrumentos en secuencia: el test de capacidad empresarial como puerta de entrada y el diagnóstico completo de tres fuentes sobre las 68 prácticas del mapa. Madurez = 0,40 × evidencia + 0,30 × dirección + 0,30 × equipos, con techo de evidencia."
        actions={<AccessChip module="madurez" />} />
      <div className="rise mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {TABS.map((t) => {
          const on = tab === t.id || (tab === "dimension" && t.id === "capacidad");
          return (
            <button key={t.id} onClick={() => router.push(t.href)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <t.icon size={14} className={on ? "text-cyan-deep" : ""} />{t.label}
            </button>
          );
        })}
        {hasCurso && tab !== "captura" && tab !== "test" && (
          <div className="ml-auto flex items-center gap-1 pr-1 text-[11px]">
            <span className="hidden text-faint sm:inline">Leer:</span>
            <button onClick={() => setSrc("vigente")} className={`chip ${cut.src === "vigente" ? "chip-cyan" : ""}`}>Corte publicado</button>
            <button onClick={() => setSrc("curso")} className={`chip ${cut.src === "curso" ? "chip-cyan" : ""}`}>{od?.published ? "A3 publicado" : "Corte en curso"}</button>
          </div>
        )}
      </div>
      </div>
      {cut.src === "curso" && (
        <div className="no-print mb-4 rounded-xl px-4 py-2.5 text-[12px]" style={{ background: "var(--gold-wash)", color: "var(--gold)" }}>
          <b>{cut.label}.</b> {cut.C.f1n} autoevaluaciones, {cut.C.f2n} respuestas de equipos y evidencia {cut.C.hasF3 ? "registrada" : "pendiente"}; las dimensiones sin dato quedan en blanco. {od?.published ? "Es la medición vigente." : "No es la medición vigente hasta que el advisor publique el corte."}
        </div>
      )}
      {tab === "resumen" && <Resumen />}
      {tab === "capacidad" && <Capacidad n={Number(arg ?? 1)} />}
      {tab === "dimension" && arg && <Dimension code={arg} />}
      {tab === "test" && (arg === "RESPONDER" ? <ResponderTest /> : arg === "INFORME" && arg2 ? <InformeTest id={arg2} /> : <TestTab />)}
      {tab === "informe" && <InformeDiagnostico />}
      {tab === "brechas" && <Brechas />}
      {tab === "captura" && <Captura />}
    </CutCtx.Provider>
  );
}

/* ═══ Resumen ═══ */

function Resumen() {
  const v = useCatalog();
  const { scores: pubScores, data } = useMaturity();
  const { C, src, label, scores: cutScores } = useCut();
  const scores = cutScores ?? pubScores;
  const router = useRouter();
  const verified = src === "curso" ? C.dims.reduce((a, d) => a + d.verified, 0) : v.catalog.evidences.filter((e) => e.status === "VERIFICADA").length;
  const flagged = C.dims.filter((d) => d.flags.length);
  const belowCaps = C.caps.filter((c) => (c.m ?? 5) < THRESHOLD);
  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Madurez de la empresa" value={avg(C.caps.map((c) => c.m)) ?? 0} decimals={1} foot="promedio de las cuatro capacidades" />
        <StatCard label="Capacidades en brecha" value={belowCaps.length} foot={belowCaps.length ? belowCaps.map((c) => c.name).join(", ") : "ninguna bajo 3,0"} good={belowCaps.length === 0} />
        <StatCard label="Dimensiones bajo el umbral" value={C.priorities.length} unit="de 17" foot="prioridad = (3,0 − madurez) × arrastre" />
        <StatCard label="Evidencias verificadas" value={verified} unit="de 68" foot="una por práctica, revisadas tal como están" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="rise rise-1">
          <CardHeader title="Radar de capacidades" sub="madurez triangulada frente a la meta a 24 meses" />
          <div className="px-4 pb-4"><MaturityRadar scores={scores} /></div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Mapa de calor de las 17 dimensiones" sub={`${src === "curso" ? label : (data?.current.label ?? "Medición vigente")} · clic en una dimensión abre sus prácticas`} />
          <div className="px-5 pb-5 pt-2">
            <MaturityHeatmap scores={scores} onCell={(_, dim) => router.push(`/panel/diagnostico/dimension/${dim}`)} />
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
          {v.assessments.length === 0 && <div className="text-[12.5px] italic text-faint sm:col-span-3">Aún no hay mediciones: la primera se construye en «Captura A3».</div>}
          {v.assessments.map((a) => (
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
  const { scores: pubScores } = useMaturity();
  const dims = dimsOf(cap.n);
  const { C, scores: cutScores } = useCut();
  const scores = cutScores ?? pubScores;
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
              const r = C.dims.find((x) => x.code === d.code);
              if (!r) return null;
              const s = scores[d.line]?.[d.code] ?? { value: -1, target: 3 };
              return (
                <Link key={d.code} href={`/panel/diagnostico/dimension/${d.code}`} className="grid gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/70 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="num text-[10.5px] font-bold text-cyan-deep">{d.code}</span><span className="text-[13.5px] font-bold text-ink">{d.name}</span>{r.flags.map((f) => <span key={f.key} className={`chip ${f.severe ? "chip-bad" : "chip-warn"}`}>{f.key}</span>)}</div>
                    <p className="mt-1 text-[12px] leading-snug text-muted">{d.defn}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="num text-right text-[11px] text-muted">F1 {f1(r.f1)} · F2 {f1(r.f2raw)} · F3 {f1(r.f3)}</div>
                    <div className="text-right"><div className="num text-[20px] font-extrabold text-ink">{s.value < 0 ? "—" : fmtNum(s.value, 1)}</div><div className="num text-[10px] text-faint">meta {s.target}</div></div>
                    {s.value >= 0 && <LevelBadge level={Math.max(1, Math.min(5, Math.round(s.value)))} />}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Perfil de la capacidad" sub="madurez por dimensión frente a la meta" />
          <div className="px-4 pb-4"><MiniRadar color={cap.color} axes={dims.map((d) => { const s = scores[d.line]?.[d.code]; return { label: d.code, value: Math.max(0, s?.value ?? 0), target: s?.target ?? 3 }; })} /></div>
        </Card>
      </div>
    </>
  );
}

/* ═══ Dimensión ═══ */

function Dimension({ code }: { code: string }) {
  const v = useCatalog();
  const d = DIMS.find((x) => x.code === code);
  const { C, responses } = useCut();
  const r = d ? C.dims.find((x) => x.code === d.code) : undefined;
  const cap = d ? CAPS.find((c) => c.n === d.line) : undefined;
  if (!d || !r || !cap) return <div className="text-muted">La dimensión {code} no existe.</div>;
  const idx = DIMS.indexOf(d);
  const prev = DIMS[idx - 1], next = DIMS[idx + 1];
  const F1 = responses.filter((x) => x.tipo === "f1");
  const F2 = responses.filter((x) => x.tipo === "f2");
  const F3 = responses.find((x) => x.tipo === "f3");
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
          const ev = v.catalog.evidences.find((e) => e.practice === p.code);   // puede no existir en una empresa nueva
          const mark = F3?.r[p.code] as "V" | "P" | "N" | undefined;
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
                    <div className="mb-1 flex items-center gap-2"><span className="label">Evidencia</span>{mark && <span className={`chip ${MARK[mark][1]}`}>{MARK[mark][0]}</span>}{ev ? <span className="num text-[10px] text-faint">{ev.id} · {ev.kind} · {responsible(v, ev.sourceId).dependencia}</span> : <span className="text-[10px] italic text-faint">sin evidencia registrada</span>}</div>
                    <p className="text-[12px] leading-snug text-ink-soft">{p.ev}</p>
                    <p className="mt-1 text-[11.5px] leading-snug text-muted">{p.verif}</p>
                    {ev?.note && <p className="mt-1 text-[11px] italic text-muted">{ev.note}</p>}
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

const toResponse = (t: TestResponse): Response => ({ tipo: "test", meta: { nombre: t.name, cargo: t.cargo ?? t.role, empresa: "" }, r: t.r });

function useTestResponses() {
  const [stored, setStored] = useState<TestResponse[]>([]);
  const [mine, setMine] = useState<TestResponse | null>(null);
  const refetch = useCallback(async () => {
    try { const r = await fetch("/api/td/test"); if (r.ok) { const j = await r.json(); setStored(j.responses ?? []); setMine(j.mine ?? null); } } catch { /* demo */ }
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  return { stored, mine, refetch };
}

function TestTab() {
  const v = useCatalog();
  const { stored, mine } = useTestResponses();
  const demo = v.catalog.demoResponses.filter((x) => x.tipo === "test");
  const tests = [...demo, ...stored.map(toResponse)];
  const reads = tests.map((t) => readTest(t.r));
  const contrast = testContrast(tests);
  const stages = new Set(reads.map((r) => r.stage));
  const lead: (typeof reads)[number] | undefined = reads[0];   // sin participantes en una empresa nueva
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Puerta de entrada</div>
          <div className="text-[15px] font-extrabold">{mine ? "Ya respondiste el test" : "Responde el test de capacidad empresarial"}</div>
          <div className="text-[12px] text-white/75">{mine ? `Guardado el ${new Date(mine.at).toLocaleDateString("es-CO")}. Puedes corregirlo; la última respuesta reemplaza a la anterior.` : "24 preguntas, seis por capacidad, más el desafío dominante. Unos 20 minutos; cada número trae la guía de lo que habría que poder mostrar."}</div>
        </div>
        <Link href="/panel/diagnostico/test/responder" className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><ClipboardList size={13} /> {mine ? "Revisar mi test" : "Responder el test"}</Link>
      </div>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rise rise-1">
          <CardHeader title="Participantes" sub={`${demo.length} de la demo${stored.length ? ` · ${stored.length} desde la plataforma` : ""} · cobertura mínima 5 de 6 para reportar una capacidad`} />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Participante</th>{TEST.bloques.map((b) => <th key={b.cap} className="num px-2 py-2 text-center">{b.cap}</th>)}<th className="px-3 py-2">Etapa según respuestas</th><th className="px-3 py-2">Pregunta 25</th></tr></thead>
              <tbody>
                {tests.length === 0 && <tr className="border-t border-line"><td colSpan={2 + TEST.bloques.length} className="px-3 py-4 text-[12.5px] italic text-faint">Nadie ha respondido el test todavía.</td></tr>}
                {tests.map((t, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2"><b className="text-ink">{String(t.meta.nombre)}</b><div className="text-[10.5px] text-faint">{String(t.meta.cargo ?? "")}{i >= demo.length ? " · plataforma" : ""} · <Link href={`/panel/diagnostico/test/informe/${i < demo.length ? `demo:${i}` : encodeURIComponent(stored[i - demo.length].email)}`} className="font-bold text-cyan-deep hover:underline">informe</Link></div></td>
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
          <CardHeader title="Patrones y prioridades" sub={lead ? `según las respuestas de ${String(tests[0].meta.nombre)}` : "se leen a partir del primer test respondido"} />
          <div className="divide-y divide-line">
            {!lead && <div className="px-5 py-4 text-[12.5px] italic text-faint">Sin respuestas todavía.</div>}
            {lead?.patterns.map((p, i) => (
              <div key={p.hip} className="px-5 py-3"><div className="label mb-0.5">{i === 0 ? "Prioridad principal" : "Prioridad de soporte"} · preguntas {p.qs.join(", ")}</div><div className="text-[13px] font-bold text-ink">{p.accion}</div><div className="text-[12px] text-muted">{p.hip}</div></div>
            ))}
            {lead && lead.pending.length > 0 && <div className="px-5 py-3 text-[12px] text-muted">Pendientes de verificación: preguntas {lead.pending.join(", ")}.</div>}
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {STAGES.map((s) => { const on = lead?.stage === s.name; return (
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

/* ═══ Responder el test ═══ */

function ResponderTest() {
  const { mine, refetch } = useTestResponses();
  const [r, setR] = useState<Record<string, number | string>>({});
  const [cargo, setCargo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<TestResponse | null>(null);
  useEffect(() => { if (mine) { setR(mine.r); setCargo(mine.cargo ?? ""); setObjetivo(mine.objetivo ?? ""); } }, [mine]);
  const answered = TEST_QUESTIONS.filter((q) => r[q.n] != null && r[q.n] !== "").length;
  const set = (n: number | string, v: number | string | undefined) => setR((prev) => { const next = { ...prev }; if (v === undefined) delete next[n]; else next[n] = v; return next; });
  const submit = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/td/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ r, cargo, objetivo }) });
    const j = await res.json();
    if (!res.ok) setMsg(j.error ?? "No se pudo guardar."); else { setSaved(j.response); await refetch(); window.scrollTo({ top: 0 }); }
    setBusy(false);
  };
  if (saved) {
    const T = readTest(saved.r);
    const stage = STAGES.find((s) => s.name === T.stage)!;
    return (
      <>
        <div className="mb-4 flex items-center justify-between"><Link href="/panel/diagnostico/test" className="inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Participantes</Link><button className="chip" onClick={() => setSaved(null)}>Corregir mis respuestas</button></div>
        <Card className="rise rise-1 mb-5">
          <CardHeader title="Tu resultado preliminar" sub={`${saved.name}${saved.cargo ? ` · ${saved.cargo}` : ""} · ${new Date(saved.at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`} />
          <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="label mb-2">Etapa predominante</div>
              <div className="grid grid-cols-5 gap-1">{STAGES.map((s) => <div key={s.name} className={`rounded-lg px-2 py-2 text-center text-[11px] font-bold ${s.name === T.stage ? "text-white" : s.name === T.hypothesis ? "bg-cyan-wash text-cyan-deep" : "bg-surface-2 text-muted"}`} style={s.name === T.stage ? { background: "var(--navy)" } : undefined}>{s.name}</div>)}</div>
              <p className="mt-3 text-[13px] text-ink"><b>{stage.name}{T.provisional ? " (provisional)" : ""}.</b> {stage.pregunta} {stage.cond}</p>
              {T.hypothesis && T.hypothesis !== T.stage && <p className="mt-2 rounded-lg bg-gold-wash px-3 py-2 text-[12px] text-ink-soft">En la pregunta 25 señalaste un desafío propio de <b>{T.hypothesis}</b>; tus respuestas apuntan a <b>{T.stage}</b>. Las dos quedan como hipótesis hasta comprobarlas con evidencia.</p>}
              {saved.objetivo && <p className="mt-2 text-[12.5px] text-muted"><b className="text-ink">Objetivo a doce meses.</b> {saved.objetivo}</p>}
            </div>
            <div className="space-y-2">
              {T.caps.map((c, i) => (
                <div key={c.n} className="text-[12px]"><div className="flex items-baseline justify-between"><b className="text-ink">{c.name}</b><span className="num text-muted">{f1(c.avg, 2)} · cobertura {c.cov}/6</span></div><div className="relative h-[7px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.avg ?? 0) / 5) * 100}%`, background: c.avg != null && c.avg < THRESHOLD ? "var(--bad)" : LINES[i].color }} /><div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: "60%" }} /></div><div className="mt-0.5 text-[11px] leading-snug text-muted">{c.reportable ? rangeText(c.avg) : "Cobertura insuficiente: se necesitan al menos cinco respuestas de seis."}</div></div>
              ))}
            </div>
          </div>
          <div className="border-t border-line px-5 py-4">
            <div className="label mb-2">Qué está limitando el crecimiento</div>
            {T.patterns.length ? T.patterns.slice(0, 3).map((p, i) => (
              <div key={p.hip} className="mb-2 rounded-xl bg-surface-2 px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-wider text-cyan-deep">{i === 0 ? "Prioridad principal" : "Prioridad de soporte"} · preguntas {p.qs.join(", ")}</div><div className="text-[13px] font-bold text-ink">{p.accion}</div><div className="text-[12px] text-muted">{p.hip}</div></div>
            )) : <p className="text-[12.5px] text-muted">No aparece un patrón dominante{T.lows.length ? `; las preguntas más débiles son ${T.lows.slice(0, 3).map((q) => q.n).join(", ")}` : ""}.</p>}
            {T.pending.length > 0 && <p className="text-[12px] text-muted">Pendientes de verificación: preguntas {T.pending.join(", ")}. No cuentan como nota baja.</p>}
            <p className="mt-2 text-[11.5px] italic text-faint">Lectura automática de tus respuestas. El advisor la confirma con evidencia: una práctica declarada y no demostrada queda como máximo en nivel 2.</p>
          </div>
        </Card>
      </>
    );
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/diagnostico/test" className="inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Participantes</Link>
        <span className="num text-[12px] font-bold text-muted">{answered} de 24 respondidas</span>
      </div>
      <Card className="rise rise-1 mb-5">
        <CardHeader title="Antes de comenzar" sub="Responde pensando en cómo funciona realmente la empresa en los últimos seis meses. Elige la respuesta que puedas sostener con ejemplos concretos; si no sabes, marca «Sin información»." />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-faint">Tu cargo<input className="input mt-1 font-normal normal-case tracking-normal" value={cargo} onChange={(e) => setCargo(e.target.value)} /></label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-faint">Principal objetivo de crecimiento a doce meses<input className="input mt-1 font-normal normal-case tracking-normal" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></label>
        </div>
      </Card>
      {TEST.bloques.map((b, bi) => (
        <div key={b.cap} className="mb-5">
          <div className="mb-2 rounded-xl px-5 py-3 text-white" style={{ background: LINES[bi].color }}><div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Bloque {bi + 1} de 4</div><div className="text-[16px] font-extrabold">{b.cap}</div><div className="text-[12px] opacity-90">{b.pregunta}</div></div>
          {b.qs.map((q) => {
            const g = GUIDES.test[String(q.n)]; const v = r[q.n];
            return (
              <Card key={q.n} className="mb-2">
                <div className="px-5 py-4">
                  <div className="flex gap-3"><span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: "var(--navy)" }}>{q.n}</span><div><p className="text-[13.5px] font-semibold leading-snug text-ink">{q.q}</p><p className="mt-0.5 text-[11.5px] text-muted"><b className="text-[10px] uppercase tracking-wider text-cyan-deep">Lo demuestra</b> {q.demo}</p></div></div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {LEVELS.map((l) => (
                      <button key={l.n} type="button" onClick={() => set(q.n, l.n)} title={g?.n?.[String(l.n)]}
                        className={`rounded-lg border px-1 py-2 text-center transition-all ${v === l.n ? "border-navy text-white" : "border-line bg-surface hover:border-gold"}`} style={v === l.n ? { background: "var(--navy)" } : undefined}>
                        <div className="num text-[16px] font-extrabold">{l.n}</div><div className={`text-[9.5px] font-semibold ${v === l.n ? "text-cyan-fill" : "text-muted"}`}>{l.name}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <button type="button" onClick={() => set(q.n, v === "NI" ? undefined : "NI")} className={`chip ${v === "NI" ? "chip-warn" : ""}`}>Sin información</button>
                    {typeof v === "number" && g?.n?.[String(v)] && <p className="flex-1 rounded-lg bg-cyan-wash px-3 py-2 text-[12px] leading-snug text-ink-soft"><b className="text-ink">{v} · {LEVELS[v - 1].name}.</b> {g.n[String(v)]}{g.q && <i className="mt-0.5 block text-muted">{g.q}</i>}</p>}
                    {v === "NI" && g?.ni && <p className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-muted">{g.ni}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
      <Card className="mb-5">
        <CardHeader title="25 · El desafío dominante" sub="¿Cuál de estas frases describe mejor el desafío de tu empresa hoy? Elige una sola." />
        <div className="space-y-2 px-5 pb-5">
          {TEST.q25.map((o) => (
            <button key={o.k} type="button" onClick={() => set(25, o.k)} className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[12.5px] transition-all ${r[25] === o.k ? "border-navy bg-cyan-wash" : "border-line bg-surface hover:border-gold"}`}>
              <b className="num text-cyan-deep">{o.k}</b><span className="text-ink-soft">{o.text}</span>
            </button>
          ))}
        </div>
      </Card>
      {msg && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: "#fbeaea", color: "var(--bad)" }}>{msg}</div>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted">Se guarda una respuesta por persona; la última reemplaza a la anterior. Se necesitan al menos 12 preguntas con número.</span>
        <button onClick={submit} disabled={busy || answered < 12} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Guardar y ver mi resultado</button>
      </div>
    </>
  );
}

/* ═══ Informe de una página del test ═══ */

function PrintField({ label, value, id, field, canEdit, onSave, placeholder }: {
  label: string; value: string; id: string; field: keyof TestNotes; canEdit: boolean;
  onSave: (id: string, field: keyof TestNotes, v: string) => Promise<void>; placeholder: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <div className="label mb-1">{label}</div>
      {canEdit && <textarea className="input no-print min-h-[64px] text-[12.5px]" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(id, field, v); }} />}
      <p className={`${canEdit ? "only-print hidden" : ""} whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-soft`}>{value || <span className="italic text-faint">Por completar en la devolución.</span>}</p>
    </div>
  );
}

function InformeTest({ id }: { id: string }) {
  const v = useCatalog();
  const { stored } = useTestResponses();
  const canPublish = useCan("publish_maturity"), canLead = useCan("edit_initiatives");
  const canEdit = canPublish || canLead;
  const [notes, setNotes] = useState<Record<string, TestNotes>>({});
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { fetch("/api/td/test/informe").then((r) => (r.ok ? r.json() : null)).then((j) => j && setNotes(j.notes)).catch(() => null); }, []);
  const demo = v.catalog.demoResponses.filter((x) => x.tipo === "test");
  const resp: Response | null = id.startsWith("demo:") ? (demo[Number(id.slice(5))] ?? null) : (() => { const t = stored.find((x) => x.email === id); return t ? { ...toResponse(t), meta: { ...toResponse(t).meta, objetivo: t.objetivo, at: t.at } } : null; })();
  if (!resp) return <div className="text-muted">{stored.length ? "No encontramos ese participante." : "Cargando el participante…"}</div>;
  const T = readTest(resp.r);
  const stage = STAGES.find((s) => s.name === T.stage)!;
  const n = notes[id] ?? ({} as TestNotes);
  const save = async (pid: string, field: keyof TestNotes, v: string) => {
    const r = await fetch("/api/td/test/informe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pid, [field]: v }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "No se pudo guardar."); else { setNotes((p) => ({ ...p, [pid]: j.notes })); setMsg("Guardado."); setTimeout(() => setMsg(null), 1500); }
  };
  const fecha = resp.meta.at ? new Date(String(resp.meta.at)) : new Date();
  const main = T.patterns[0], support = T.patterns.slice(1, 3);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/diagnostico/test" className="inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Participantes</Link>
        <div className="flex items-center gap-2">{msg && <span className="text-[11.5px] text-muted">{msg}</span>}<button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><Printer size={13} /> Imprimir o guardar en PDF</button></div>
      </div>
      <div className="panel px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="kicker">Test de capacidad empresarial · Informe de una página</div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">{String(resp.meta.nombre)}</h2>
            <div className="text-[12px] text-muted">{String(resp.meta.cargo ?? "")} · {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/4shine-logo-negro.png" alt="4Shine" className="h-7 object-contain" />
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <div className="label mb-1">Etapa predominante</div>
            <div className="grid grid-cols-5 gap-1">{STAGES.map((s) => <div key={s.name} className={`rounded-md px-1 py-1.5 text-center text-[10px] font-bold ${s.name === T.stage ? "text-white" : s.name === T.hypothesis ? "bg-cyan-wash text-cyan-deep" : "bg-surface-2 text-muted"}`} style={s.name === T.stage ? { background: "var(--navy)" } : undefined}>{s.name}</div>)}</div>
            <p className="mt-2 text-[12.5px] text-ink"><b>{stage.name}{T.provisional ? " (provisional)" : ""}.</b> {stage.cond}{T.hypothesis && T.hypothesis !== T.stage ? ` En la pregunta 25 señaló un desafío propio de ${T.hypothesis}: ambas quedan como hipótesis.` : ""}</p>
            <div className="label mb-1 mt-3">Objetivo de crecimiento a doce meses</div>
            <p className="text-[12.5px] text-ink-soft">{String(resp.meta.objetivo ?? "") || <span className="italic text-faint">No registrado.</span>}</p>
          </div>
          <div>
            <div className="label mb-1">Perfil de capacidades y cobertura de verificación</div>
            {T.caps.map((c, i) => (
              <div key={c.n} className="mb-1.5 text-[12px]"><div className="flex items-baseline justify-between"><b className="text-ink">{c.name}</b><span className="num text-muted">{f1(c.avg, 2)} · {c.cov}/6</span></div><div className="relative h-[6px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.avg ?? 0) / 5) * 100}%`, background: c.avg != null && c.avg < THRESHOLD ? "var(--bad)" : LINES[i].color }} /><div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: "60%" }} /></div></div>
            ))}
            <p className="mt-1 text-[10.5px] text-faint">Umbral 3,0. Un promedio superior no elimina las debilidades de preguntas individuales.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <PrintField label="Principal restricción" id={id} field="restriccion" canEdit={canEdit} onSave={save} placeholder="Práctica concreta que limita el objetivo" value={n.restriccion ?? ""} />
          <PrintField label="Evidencias que la sostienen" id={id} field="evidencias" canEdit={canEdit} onSave={save} placeholder="Dos o tres hechos" value={n.evidencias ?? ""} />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="label mb-1">Prioridad principal</div>
            {main ? <p className="text-[12.5px] text-ink"><b>{main.accion}</b> {main.hip} <span className="text-faint">(preguntas {main.qs.join(", ")})</span></p> : <p className="text-[12.5px] italic text-faint">Sin patrón dominante; la conversación se concentra en verificar las prácticas más altas.</p>}
          </div>
          <div>
            <div className="label mb-1">Prioridades de soporte</div>
            {support.length ? support.map((p) => <p key={p.hip} className="text-[12.5px] text-ink-soft"><b className="text-ink">{p.accion}</b> {p.hip}</p>) : <p className="text-[12.5px] italic text-faint">Máximo dos; ninguna adicional.</p>}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <PrintField label="Acción a 90 días" id={id} field="accion" canEdit={canEdit} onSave={save} placeholder="Cambio específico, responsable, indicador y meta acordada" value={n.accion ?? ""} />
          <PrintField label="Qué no necesita ahora" id={id} field="noNecesita" canEdit={canEdit} onSave={save} placeholder="Iniciativas que conviene posponer para proteger el foco" value={n.noNecesita ?? ""} />
        </div>

        <div className="mt-5 border-t border-line pt-3 text-[11.5px] text-muted">
          <b className="text-ink">Pendientes de verificación:</b> {T.pending.length ? `preguntas ${T.pending.join(", ")}` : "ninguna"}. Una práctica declarada y no demostrada queda como máximo en nivel 2; la etapa y la prioridad se confirman con evidencia.
          {n.by && <span className="block text-faint">Notas del consultor: {n.by}, {new Date(n.at).toLocaleDateString("es-CO")}.</span>}
        </div>
      </div>
    </>
  );
}

/* ═══ Informe del diagnóstico completo (cinco salidas, imprimible) ═══ */

function InformeDiagnostico() {
  const v = useCatalog();
  const { C, label, scores: cutScores } = useCut();
  const { scores: pubScores } = useMaturity();
  const scores = cutScores ?? pubScores;
  const R = recommend(C);
  const flagged = C.dims.filter((d) => d.flags.length);
  const strongest = [...C.caps].filter((c) => c.m != null).sort((a, b) => (b.m ?? 0) - (a.m ?? 0))[0];
  const gap = C.caps.filter((c) => (c.m ?? 5) < THRESHOLD);
  const head = (n: number, t: string, sub: string) => <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2"><span className="num text-[22px] font-extrabold text-cyan-deep">{n}</span><div><div className="text-[15px] font-extrabold text-ink">{t}</div><div className="text-[11.5px] text-muted">{sub}</div></div></div>;
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">Las cinco salidas del diagnóstico completo sobre <b className="text-ink">{label}</b>, listas para la devolución de 90 minutos. El navegador las guarda en PDF.</p>
        <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><Printer size={13} /> Imprimir o guardar en PDF</button>
      </div>
      <div className="panel mb-5 px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="kicker">Diagnóstico 4Shine-OD · {label}</div><h2 className="text-[20px] font-extrabold tracking-tight text-ink">{v.catalog.company.name}</h2><div className="text-[12px] text-muted">{C.f1n} autoevaluaciones · {C.f2n} respuestas de equipos{C.okF2 ? "" : " (muestra insuficiente)"} · evidencia {C.hasF3 ? "registrada" : "pendiente"}</div></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/4shine-logo-negro.png" alt="4Shine" className="h-7 object-contain" />
        </div>
        {head(1, "Radar de las cuatro capacidades", "lectura ejecutiva con el umbral de brecha y el titular del patrón")}
        <div className="grid gap-5 md:grid-cols-[300px_1fr] md:items-center">
          <MaturityRadar size={300} scores={scores} />
          <div>
            <p className="text-[13.5px] leading-relaxed text-ink">{gap.length ? <>{gap.length === 1 ? "Una capacidad" : `${gap.length} capacidades`} por debajo del umbral: <b>{gap.map((c) => c.name).join(", ")}</b>. {gap.length >= 2 ? "Dos o más capacidades en brecha indican una falla de arquitectura, no un problema de esfuerzo." : "Las demás están suficientemente instaladas."}</> : "Ninguna capacidad está por debajo del umbral."}{strongest ? ` La capacidad más avanzada es ${strongest.name} (${f1(strongest.m)}).` : ""}</p>
            <table className="mt-3 w-full text-[12px]"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="py-1">Capacidad</th><th className="num py-1 text-center">F1</th><th className="num py-1 text-center">F2</th><th className="num py-1 text-center">F3</th><th className="num py-1 text-center">Madurez</th></tr></thead><tbody>{C.caps.map((c) => <tr key={c.n} className="border-t border-line"><td className="py-1 font-bold text-ink">{c.name}</td><td className="num py-1 text-center">{f1(c.f1)}</td><td className="num py-1 text-center">{f1(c.f2)}</td><td className="num py-1 text-center">{f1(c.f3)}</td><td className="num py-1 text-center font-extrabold" style={{ color: (c.m ?? 5) < THRESHOLD ? "var(--bad)" : "var(--ink)" }}>{f1(c.m)}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
      <div className="panel print-break mb-5 px-7 py-6">
        {head(2, "Mapa de calor por dimensión", "las 17 dimensiones con sus tres fuentes, la madurez triangulada, el nivel y las marcas")}
        <MaturityHeatmap scores={scores} />
        <table className="mt-4 w-full text-[11.5px]"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="py-1">Dimensión</th><th className="num py-1 text-center">F1</th><th className="num py-1 text-center">F2</th><th className="num py-1 text-center">F3</th><th className="num py-1 text-center">Madurez</th><th className="py-1">Nivel</th><th className="py-1">Marcas</th></tr></thead><tbody>{C.dims.map((d) => <tr key={d.code} className="border-t border-line"><td className="py-1"><b className="num text-cyan-deep">{d.code}</b> {d.name}</td><td className="num py-1 text-center">{f1(d.f1)}</td><td className="num py-1 text-center">{f1(d.f2raw)}</td><td className="num py-1 text-center">{f1(d.f3)}</td><td className="num py-1 text-center font-extrabold">{f1(d.m)}</td><td className="py-1">{d.m != null ? levelName(d.m) : "—"}</td><td className="py-1 text-muted">{d.flags.map((f) => f.key).join(" · ")}</td></tr>)}</tbody></table>
      </div>
      <div className="panel print-break mb-5 px-7 py-6">
        {head(3, "Brechas priorizadas", "máximo cinco, ordenadas por profundidad y efecto de arrastre, con la metodología y el framework que las instalan")}
        {C.priorities.length === 0 && <p className="text-[12.5px] text-muted">Ninguna dimensión está por debajo de 3,0.</p>}
        {C.priorities.slice(0, 5).map((d, i) => { const dim = dimOf(d.code); return (
          <div key={d.code} className="mb-3 border-l-[3px] pl-3" style={{ borderColor: i === 0 ? "var(--bad)" : "var(--gold)" }}>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{i === 0 ? "Cuello de botella" : `Brecha ${i + 1}`} · madurez {f1(d.m)} · arrastre {fmtNum(DRAG_WEIGHT(d.code), 1)} · prioridad {fmtNum(d.priority, 2)}</div>
            <div className="text-[13.5px] font-extrabold text-ink">{d.code} · {d.name}</div>
            <p className="text-[12px] text-ink-soft"><b>Hallazgo.</b> {dim.defn} F1 {f1(d.f1)} · F2 {f1(d.f2raw)} · F3 {f1(d.f3)}{d.flags.length ? ` · ${d.flags.map((f) => f.key).join(", ")}` : ""}.</p>
            <p className="text-[12px] text-ink-soft"><b>Efecto cruzado.</b> {DRAG_WEIGHT(d.code) > 1 ? `Arrastra otras dimensiones (peso ${fmtNum(DRAG_WEIGHT(d.code), 1)}): no se resuelve de forma aislada.` : "Efecto acotado a su propia dimensión."}</p>
            <p className="text-[12px] text-ink-soft"><b>Intervención.</b> {dim.mets.map((m) => methodologyOf(m).name).join(", ")}; se trabaja con {dim.fws.map((f) => `${f} · ${frameworkOf(f).name}`).join(" y ")}.</p>
          </div>
        ); })}
      </div>
      <div className="panel print-break mb-5 px-7 py-6">
        {head(4, "Comparativo de fuentes", "dirección, equipos y evidencia lado a lado: así nos vemos frente a así operamos")}
        {flagged.length === 0 ? <p className="text-[12.5px] text-muted">No hay divergencias marcadas entre las fuentes.</p> : <ul className="space-y-1.5 text-[12px]">{flagged.map((d) => <li key={d.code}><b className="text-ink">{d.code} · {d.name}.</b> {d.flags.map((f) => FLAG_TEXT[f.key] ?? f.key).join(" ")} <span className="num text-muted">(F1 {f1(d.f1)} · F2 {f1(d.f2raw)} · F3 {f1(d.f3)})</span></li>)}</ul>}
        {C.f2n > 0 && <table className="mt-4 w-full text-[11.5px]"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="py-1">Ítems de contraste general (equipos)</th><th className="num py-1 text-right">Promedio</th></tr></thead><tbody>{C.general.map((q) => <tr key={q.code} className="border-t border-line"><td className="py-1 text-ink-soft">{q.text}</td><td className="num py-1 text-right font-bold">{f1(q.avg)}</td></tr>)}</tbody></table>}
        {C.openAnswers.length > 0 && <div className="mt-3"><div className="label mb-1">Respuestas abiertas (anónimas)</div><ul className="text-[12px] text-ink-soft">{C.openAnswers.map((t, i) => <li key={i}>«{t}»</li>)}</ul></div>}
      </div>
      <div className="panel mb-5 px-7 py-6">
        {head(5, "Recomendación de nivel", "nivel de acompañamiento, composición propuesta y lo que no se necesita hoy")}
        <div className="rounded-xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel recomendado</div><div className="text-[22px] font-extrabold">{R.level}</div><p className="mt-1 text-[12.5px] text-white/85">{R.text}</p>{R.notNeeded && <p className="mt-2 text-[12px] text-white/75">{R.notNeeded}</p>}</div>
        <p className="mt-3 text-[11px] text-muted">Los puntajes son madurez evaluada con reglas de evidencia, no una medición psicométrica; no son comparables entre empresas mientras no existan baremos. La recomendación la confirma el advisor con las entrevistas y el contexto de la empresa.</p>
      </div>
    </>
  );
}

/* ═══ Brechas ═══ */

function Brechas() {
  const { C } = useCut();
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

/* ═══ Fuente 2 · enlace anónimo y respuestas recibidas ═══ */

type F2Api = { url: string | null; total: number; byArea: Record<string, number>; latest: string | null; open: string[] };

function F2Card() {
  const [d, setD] = useState<F2Api | null>(null);
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/td/f2"); if (r.ok) setD(await r.json()); }, []);
  useEffect(() => { load(); }, [load]);
  const copy = async () => { if (!d?.url) return; await navigator.clipboard.writeText(d.url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const ok = (d?.total ?? 0) >= 8;
  return (
    <Card className="rise rise-2 mb-5">
      <CardHeader title="Fuente 2 · Percepción de equipos" sub="encuesta anónima por enlace: sin cuenta, sin nombre, sin registro de origen · mínimo 8 respuestas o el 20 % de los mandos medios" />
      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1fr_280px]">
        <div>
          {d?.url ? (
            <>
              <div className="label mb-1">Enlace de la empresa</div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="num min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 text-[11.5px] text-ink-soft">{d.url}</code>
                <button onClick={copy} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><Link2 size={13} /> {copied ? "Copiado" : "Copiar enlace"}</button>
                <a href={d.url} target="_blank" rel="noreferrer" className="chip">Abrir</a>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">Compártelo con los mandos medios y colaboradores en la ventana acordada en el kickoff. Las respuestas de percepción se recogen antes de mostrar cualquier resultado. Rotar el secreto del servidor invalida el enlace.</p>
            </>
          ) : <p className="text-[12.5px] text-muted">El enlace lo genera y comparte el advisor o el líder de la empresa.</p>}
          {d && d.open.length > 0 && <div className="mt-3"><div className="label mb-1">Respuestas abiertas recibidas</div><ul className="space-y-1 text-[12px] text-ink-soft">{d.open.map((t, i) => <li key={i}>«{t}»</li>)}</ul></div>}
        </div>
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-2"><Users size={14} className="text-cyan-deep" /><span className="num text-[26px] font-extrabold text-ink">{d?.total ?? 0}</span><span className="text-[12px] text-muted">respuestas recibidas</span></div>
          <div className="mt-1 text-[11.5px] text-muted">{ok ? "Muestra suficiente para reportar." : `Faltan ${8 - (d?.total ?? 0)} para la muestra mínima; con menos de cinco la Fuente 2 no se reporta y la madurez se calcula 55/45.`}</div>
          {d && Object.keys(d.byArea).length > 0 && <div className="mt-2 space-y-0.5 text-[11.5px]">{Object.entries(d.byArea).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-ink-soft">{k}</span><span className="num text-muted">{v}{v < 5 ? " · no se reporta por separado" : ""}</span></div>)}</div>}
          {d?.latest && <div className="mt-2 text-[10.5px] text-faint">Última: {new Date(d.latest).toLocaleString("es-CO")}</div>}
        </div>
      </div>
    </Card>
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
  const niv = (d: { code: string }) => GUIDES.niv[d.code];
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
      <F2Card />
      {!canCapture && <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-muted">Tu rol consulta la captura; la registran los responsables de cada capacidad y el advisor.</div>}
      <div className="space-y-5">
        {dimsOf(cap).map((d) => (
          <Card key={d.code}>
            <CardHeader title={`${d.code} · ${d.name}`} sub={d.defn} />
            {niv(d) && <div className="grid gap-1.5 px-5 pb-3 sm:grid-cols-5">{[1, 2, 3, 4, 5].map((n) => <div key={n} className="rounded-lg bg-surface-2 px-2.5 py-2 text-[10.5px] leading-snug text-muted"><b className="text-ink">Nivel {n}.</b> {niv(d)[String(n)]}</div>)}</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-5 py-2">Práctica</th><th className="px-2 py-2">Autoevaluación</th><th className="px-2 py-2">Evidencia</th><th className="px-2 py-2">Nivel</th><th className="px-2 py-2">Registro</th></tr></thead>
                <tbody>
                  {practices.filter((p) => p.dim === d.code).map((p) => {
                    const c = vars[p.code];
                    return (
                      <Fragment key={p.code}>
                      <tr className="border-t border-line align-top">
                        <td className="px-5 py-2.5"><span className="num text-[10.5px] font-bold text-cyan-deep">{p.code}</span><div className="text-[12px] leading-snug text-ink-soft">{p.f1}</div></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canCapture || busy === p.code || data?.published} value={c?.perception ?? ""} onChange={(e) => send(p.code, { perception: Number(e.target.value) })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {LEVELS[n - 1].name}</option>)}</select></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canPublish || busy === p.code || data?.published} value={c?.evidence ?? ""} onChange={(e) => send(p.code, { evidence: e.target.value })}><option value="">—</option><option value="V">Verificada</option><option value="P">Parcial</option><option value="N">No existe</option></select></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canPublish || busy === p.code || data?.published} value={c?.level ?? ""} onChange={(e) => send(p.code, { level: Number(e.target.value) })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
                        <td className="px-2 py-2.5 text-[11px] text-faint">{c ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} style={{ color: "var(--ok)" }} /> {c.by} · {new Date(c.at).toLocaleDateString("es-CO")}</span> : "sin captura"}</td>
                      </tr>
                      {c && (c.perception || c.evidence) && (
                        <tr className="bg-cyan-wash/50"><td colSpan={5} className="px-5 py-2 text-[11.5px] leading-snug text-ink-soft">
                          {c.perception && GUIDES.f1[p.code]?.n?.[String(c.perception)] && <span><b className="text-ink">{c.perception} · {LEVELS[c.perception - 1].name}.</b> {GUIDES.f1[p.code].n![String(c.perception)]} </span>}
                          {c.evidence && GUIDES.ev[p.code]?.[c.evidence] && <span className="block text-muted"><b>Evidencia {c.evidence === "V" ? "verificada" : c.evidence === "P" ? "parcial" : "no existe"}.</b> {GUIDES.ev[p.code][c.evidence]}</span>}
                        </td></tr>
                      )}
                      </Fragment>
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
