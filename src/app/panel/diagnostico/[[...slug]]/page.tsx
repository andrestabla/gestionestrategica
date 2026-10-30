"use client";

// M1 · Diagnóstico de capacidades con rutas profundas:
//   /panel/diagnostico                      → resumen: radar, mapa de calor, fuentes y señales
//   /panel/diagnostico/capacidad/<n>        → una capacidad y sus dimensiones
//   /panel/diagnostico/dimension/<DIR-1>    → una dimensión: prácticas, evidencia y fuentes
//   /panel/diagnostico/test                 → test de capacidad empresarial: participantes y contraste
//   /panel/diagnostico/autoevaluacion       → fuente 1: autoevaluación directiva por persona (responder, mi lectura, consolidado)
//   /panel/diagnostico/brechas              → brechas priorizadas y nivel de acompañamiento
//   /panel/diagnostico/captura              → captura del corte A3 (autoevaluación y verificación)

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader, StatCard, LevelBadge, Skeleton, SkeletonCards, ResponsiveTable } from "@/components/ui";
import { avisar, confirmar } from "@/components/feedback";
import { AccessChip, useCan } from "@/components/user-context";
import { MaturityRadar, MaturityHeatmap, MiniRadar, type ScoresMap } from "@/components/charts";
import { useCatalog } from "@/components/catalog-context";
import { LINES, fmtNum } from "@/data/demo";
import {
  CAPS, DIMS, dimOf, dimsOf, PRACTICES, LEVELS, STAGES, TEST, TEST_QUESTIONS, GUIDES, FLAG_TEXT, MAPA,
  methodologyOf, frameworkOf, frameworkOfPractice, DRAG_WEIGHT, THRESHOLD, levelName, levelOf,
} from "@/data/mapa";
import { scoresOf, responsible } from "@/lib/vista";
import { consolidate, readTest, recommend, testContrast, avg, sdev, rangeText, type DimResult, type Consolidated } from "@/lib/od";
import { useMaturity } from "@/lib/use-maturity";
import { hasInstrument, instrumentLabel, type Instrument } from "@/lib/instrumentos";
import type { VariableCapture, TestResponse, TestNotes, F1Response } from "@/server/store";
import type { Response } from "@/lib/od";
import { lecturaF1 } from "@/lib/f1";
import { InformeEjecutivo, useInformeIA } from "@/components/informe-ejecutivo";
import { datosDesdeRespuesta, datosDesdeComite } from "@/lib/informe-datos";
import { ModoFocal, pedirPantallaCompleta, teclaNumero, irAlSiguientePendiente, focalArriba, ITEM_CLS } from "@/components/modo-focal";
import { UnaAUna, SelectorVista, useVista, type Pantalla } from "@/components/una-a-una";
import {
  Radar, Layers, ClipboardList, ClipboardCheck, Flame, PenLine, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, Info, Loader2, Upload, FileCheck2, Send, Link2, Users, Printer, FileText, RefreshCw,
} from "lucide-react";

type Tab = "resumen" | "capacidad" | "dimension" | "test" | "autoevaluacion" | "brechas" | "captura" | "informe";

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
  { id: "autoevaluacion", label: "Autoevaluación", icon: ClipboardCheck, href: "/panel/diagnostico/autoevaluacion" },
  { id: "brechas", label: "Brechas", icon: Flame, href: "/panel/diagnostico/brechas" },
  { id: "captura", label: "Captura A3", icon: PenLine, href: "/panel/diagnostico/captura" },
  { id: "informe", label: "Informe", icon: FileText, href: "/panel/diagnostico/informe" },
];

const f1 = (x: number | null | undefined, d = 1) => (x == null ? "—" : fmtNum(x, d));
/** Pestañas que dependen de un instrumento habilitado por la empresa. */
const TAB_INSTRUMENT: Partial<Record<Tab, Instrument>> = { test: "test", autoevaluacion: "f1", captura: "captura" };
const LEVEL_CLS = ["", "chip-bad", "chip-warn", "", "chip-ok", "chip-ok"];

export default function DiagnosticoPage() {
  const params = useParams<{ slug?: string[] }>();
  const slug = params.slug ?? [];
  const seg = (slug[0] ?? "resumen").toLowerCase();
  const tab: Tab = (["capacidad", "dimension", "test", "autoevaluacion", "brechas", "captura", "informe"].includes(seg) ? seg : "resumen") as Tab;
  const arg = slug[1] ? decodeURIComponent(slug[1]).toUpperCase() : null;
  const arg2 = slug[2] ? decodeURIComponent(slug[2]) : null;
  const router = useRouter();
  const v = useCatalog();
  const [od, setOd] = useState<OdApi | null>(null);
  const [src, setSrc] = useState<"vigente" | "curso" | null>(null);
  useEffect(() => { fetch("/api/td/od").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setOd(j); }).catch(() => null); }, [tab]);
  const hasCurso = (od?.responses.length ?? 0) > 0;
  const tabEnabled = (t: Tab) => { const ins = TAB_INSTRUMENT[t]; return !ins || hasInstrument(v.catalog.company, ins); };
  const tabs = TABS.filter((t) => tabEnabled(t.id));
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

  // el informe ejecutivo ocupa la pantalla: solo una miga de pan, sin la cabecera ni las pestañas del diagnóstico
  const informeFocal = tab === "autoevaluacion" && arg === "INFORME";
  return (
    <CutCtx.Provider value={cut}>
      {informeFocal && <div className="no-print mb-3 flex items-center gap-1.5 text-[12px] text-muted"><Link href="/panel/diagnostico" className="font-semibold text-cyan-deep hover:underline">Diagnóstico</Link><span>›</span><Link href="/panel/diagnostico/autoevaluacion" className="font-semibold text-cyan-deep hover:underline">Autoevaluación</Link><span>›</span><span className="font-semibold text-ink">Informe ejecutivo</span></div>}
      {!informeFocal && <div className="no-print">
      <PageHeader kicker="M1 · Diagnóstico de capacidades" title="Capacidad organizacional de la empresa"
        crumbs={tab === "resumen" ? undefined : [{ label: "Diagnóstico", href: "/panel/diagnostico" }, { label: TABS.find((t) => t.id === tab)?.label ?? (tab === "dimension" ? "Dimensión" : tab), href: TABS.find((t) => t.id === tab)?.href }, ...(arg ? [{ label: arg === "RESPONDER" ? "Responder" : arg === "RESULTADO" ? "Lectura" : arg === "INFORME" ? "Informe" : arg }] : [])]}
        desc="Dos instrumentos en secuencia: el test de capacidad empresarial como puerta de entrada y el diagnóstico de tres fuentes sobre las 68 prácticas del mapa."
        actions={<AccessChip module="madurez" />} />
      <details className="rise mb-4 rounded-xl bg-surface-2/70 px-4 py-2 text-[12.5px] text-ink-soft">
        <summary className="cursor-pointer select-none font-semibold text-ink">¿Cómo se calcula la madurez?</summary>
        <p className="mt-2 leading-relaxed">Cada dimensión combina las tres fuentes: madurez = 0,40 × evidencia documental (F3) + 0,30 × autoevaluación directiva (F1) + 0,30 × percepción de equipos (F2). Sin evidencia verificada, la madurez tiene techo de 2,9; sin equipos, pesa 55 % la evidencia y 45 % la dirección. La escala va de 1 (incipiente) a 5 (multiplicadora) y el umbral de práctica instalada es 3,0.</p>
      </details>
      <div className="rise mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {tabs.map((t) => {
          const on = tab === t.id || (tab === "dimension" && t.id === "capacidad");
          return (
            <button key={t.id} onClick={() => router.push(t.href)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <t.icon size={14} className={on ? "text-cyan-deep" : ""} />{t.label}
            </button>
          );
        })}
        {hasCurso && tab !== "captura" && tab !== "test" && tab !== "autoevaluacion" && (
          <div className="ml-auto flex items-center gap-1 pr-1 text-[12px]">
            <span className="hidden text-faint sm:inline">Leer:</span>
            <button onClick={() => setSrc("vigente")} className={`chip ${cut.src === "vigente" ? "chip-cyan" : ""}`}>Corte publicado</button>
            <button onClick={() => setSrc("curso")} className={`chip ${cut.src === "curso" ? "chip-cyan" : ""}`}>{od?.published ? "A3 publicado" : "Corte en curso"}</button>
          </div>
        )}
      </div>
      </div>}
      {cut.src === "curso" && (
        <div className="no-print mb-4 rounded-xl px-4 py-2.5 text-[12px]" style={{ background: "var(--gold-wash)", color: "var(--gold-text)" }}>
          <b>{cut.label}.</b> {cut.C.f1n} autoevaluaciones, {cut.C.f2n} respuestas de equipos y evidencia {cut.C.hasF3 ? "registrada" : "pendiente"}; las dimensiones sin dato quedan en blanco. {od?.published ? "Es la medición vigente." : "No es la medición vigente hasta que el advisor publique el corte."}
        </div>
      )}
      {!tabEnabled(tab) && <Card className="rise p-6"><div className="text-[13px] text-ink"><b>{instrumentLabel(TAB_INSTRUMENT[tab]!)}</b> no está habilitada para esta empresa. <Link href="/panel/diagnostico" className="font-bold text-cyan-deep hover:underline">Ir al resumen</Link></div></Card>}
      {tab === "resumen" && <Resumen />}
      {tab === "capacidad" && <Capacidad n={Number(arg ?? 1)} />}
      {tab === "dimension" && arg && <Dimension code={arg} />}
      {tabEnabled(tab) && tab === "test" && (arg === "RESPONDER" ? <ResponderTest /> : arg === "INFORME" && arg2 ? <InformeTest id={arg2} /> : <TestTab />)}
      {tabEnabled(tab) && tab === "autoevaluacion" && (arg === "RESPONDER" ? <ResponderF1 /> : arg === "RESULTADO" ? <ResultadoF1 email={arg2} /> : arg === "INFORME" ? <InformeF1 email={arg2} /> : <AutoevaluacionTab />)}
      {tab === "informe" && <InformeDiagnostico />}
      {tab === "brechas" && <Brechas />}
      {tabEnabled(tab) && tab === "captura" && <Captura />}
    </CutCtx.Provider>
  );
}

/* ═══ Resumen ═══ */

function Resumen() {
  const v = useCatalog();
  const { scores: pubScores, data } = useMaturity();
  const { C, src, label, scores: cutScores } = useCut();
  // sin medición publicada ni corte en curso: gráficos vacíos («—»), no «1,0 Incipiente»
  const sinDato = src !== "curso" && (data?.current.id ?? v.current.id) === "A0";
  const scores = cutScores ?? (sinDato ? ({ 1: {}, 2: {}, 3: {}, 4: {} } as ScoresMap) : pubScores);
  const router = useRouter();
  const verified = src === "curso" ? C.dims.reduce((a, d) => a + d.verified, 0) : v.catalog.evidences.filter((e) => e.status === "VERIFICADA").length;
  const flagged = C.dims.filter((d) => d.flags.length);
  const belowCaps = C.caps.filter((c) => (c.m ?? 5) < THRESHOLD);
  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Madurez de la empresa" value={avg(C.caps.map((c) => c.m)) ?? 0} decimals={1} foot={sinDato ? "sin medición todavía" : "promedio de las cuatro capacidades"} />
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
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-5 py-2.5 text-[12px] text-faint">
            {LEVELS.map((l) => <span key={l.n} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded" style={{ background: l.color }} /> {l.n} {l.name}</span>)}
          </div>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-2">
          <CardHeader title="Las tres fuentes por capacidad" sub="F1 autoevaluación directiva · F2 percepción de equipos · F3 evidencia documental" />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint">
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
          <div className="border-t border-line px-5 py-2.5 text-[12px] text-faint">
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
                <div className="num mt-1 text-[12px] text-muted">F1 {f1(d.f1)} · F2 {f1(d.f2raw)} · F3 {f1(d.f3)} → madurez {f1(d.m)} ({d.base})</div>
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
              <div className="flex items-center justify-between"><span className="num text-[12px] font-bold text-faint">{a.id} · {a.period}</span><span className={`chip ${a.status === "PUBLICADA" ? "chip-ok" : "chip-warn"}`}>{a.status === "PUBLICADA" ? "Publicada" : "En captura"}</span></div>
              <div className="mt-1 text-[13px] font-bold text-ink">{a.label}</div>
              <div className="mt-1 text-[12px] leading-snug text-muted">{a.note}</div>
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
                    <div className="flex flex-wrap items-center gap-2"><span className="num text-[12px] font-bold text-cyan-deep">{d.code}</span><span className="text-[13.5px] font-bold text-ink">{d.name}</span>{r.flags.map((f) => <span key={f.key} className={`chip ${f.severe ? "chip-bad" : "chip-warn"}`}>{f.key}</span>)}</div>
                    <p className="mt-1 text-[12px] leading-snug text-muted">{d.defn}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="num text-right text-[12px] text-muted">F1 {f1(r.f1)} · F2 {f1(r.f2raw)} · F3 {f1(r.f3)}</div>
                    <div className="text-right"><div className="num text-[20px] font-extrabold text-ink">{s.value < 0 ? "—" : fmtNum(s.value, 1)}</div><div className="num text-[12px] text-faint">meta {s.target}</div></div>
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
              {f.severe ? <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad-text)" }} /> : <Info size={15} className="mt-0.5 shrink-0" style={{ color: "var(--gold-text)" }} />}
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
          <span className="text-[12px] font-bold text-faint">Metodologías:</span>
          {d.mets.map((m) => <span key={m} className="chip" title={methodologyOf(m).principio}>{m} · {methodologyOf(m).name}</span>)}
          <span className="ml-2 text-[12px] font-bold text-faint">Frameworks:</span>
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
                  <div className="flex flex-wrap items-center gap-2"><span className="num text-[12px] font-extrabold text-cyan-deep">{p.code}</span><span className="num text-[12px] text-muted">autoevaluación {f1(f1avg)}</span><Link href={`/panel/metodologia#${fw.id}`} className="chip">{fw.id} · {fw.name}</Link></div>
                  <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink">{p.f1}</p>
                  {guide?.q && <p className="mt-1 text-[12px] italic text-muted">{guide.q}</p>}
                  <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2"><span className="label">Evidencia</span>{mark && <span className={`chip ${MARK[mark][1]}`}>{MARK[mark][0]}</span>}{ev ? <span className="num text-[12px] text-faint">{ev.id} · {ev.kind} · {responsible(v, ev.sourceId).dependencia}</span> : <span className="text-[12px] italic text-faint">sin evidencia registrada</span>}</div>
                    <p className="text-[12px] leading-snug text-ink-soft">{p.ev}</p>
                    <p className="mt-1 text-[12px] leading-snug text-muted">{p.verif}</p>
                    {ev?.note && <p className="mt-1 text-[12px] italic text-muted">{ev.note}</p>}
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
        <div className="min-w-0 flex-1 basis-[280px]">
          <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Puerta de entrada</div>
          <div className="text-[15px] font-extrabold">{mine ? "Ya respondiste el test" : "Responde el test de capacidad empresarial"}</div>
          <div className="text-[12px] text-white/75">{mine ? `Guardado el ${new Date(mine.at).toLocaleDateString("es-CO")}. Puedes corregirlo; la última respuesta reemplaza a la anterior.` : "24 preguntas, seis por capacidad, más el desafío dominante. Unos 20 minutos; cada número trae la guía de lo que habría que poder mostrar."}</div>
        </div>
        <Link href="/panel/diagnostico/test/responder" onClick={pedirPantallaCompleta} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><ClipboardList size={13} /> {mine ? "Revisar mi test" : "Responder el test"}</Link>
      </div>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rise rise-1">
          <CardHeader title="Participantes" sub={`${demo.length} de la demo${stored.length ? ` · ${stored.length} desde la plataforma` : ""} · cobertura mínima 5 de 6 para reportar una capacidad`} />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Participante</th>{TEST.bloques.map((b) => <th key={b.cap} className="num px-2 py-2 text-center">{b.cap}</th>)}<th className="px-3 py-2">Etapa según respuestas</th><th className="px-3 py-2">Pregunta 25</th></tr></thead>
              <tbody>
                {tests.length === 0 && <tr className="border-t border-line"><td colSpan={2 + TEST.bloques.length} className="px-3 py-4 text-[12.5px] italic text-faint">Nadie ha respondido el test todavía.</td></tr>}
                {tests.map((t, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2"><b className="text-ink">{String(t.meta.nombre)}</b><div className="text-[12px] text-faint">{String(t.meta.cargo ?? "")}{i >= demo.length ? " · plataforma" : ""} · <Link href={`/panel/diagnostico/test/informe/${i < demo.length ? `demo:${i}` : encodeURIComponent(stored[i - demo.length].email)}`} className="font-bold text-cyan-deep hover:underline">informe</Link></div></td>
                    {reads[i].caps.map((c) => <td key={c.n} className={`num px-2 py-2 text-center ${c.avg != null && c.avg < THRESHOLD ? "font-bold" : ""}`} style={c.avg != null && c.avg < THRESHOLD ? { color: "var(--bad-text)" } : undefined}>{f1(c.avg, 2)}<div className="text-[11px] font-normal text-faint">{c.cov}/6</div></td>)}
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
              <div key={b.cap} className="text-[12px]"><div className="flex items-baseline justify-between"><b className="text-ink">{b.cap}</b><span className="num text-muted">{f1(a, 2)}</span></div><div className="relative h-[7px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((a ?? 0) / 5) * 100}%`, background: a != null && a < THRESHOLD ? "var(--bad)" : LINES[i].color }} /><div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: "60%" }} /></div><div className="mt-0.5 text-[12px] leading-snug text-muted">{rangeText(a)}</div></div>
            ); })}
          </div>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-3">
          <CardHeader title="Conversaciones de contraste" sub="diferencias de dos o más puntos entre participantes: no se promedian, se conversan" />
          <div className="divide-y divide-line">
            {contrast.length === 0 && <div className="px-5 py-4 text-[12.5px] italic text-faint">Sin diferencias de dos o más puntos.</div>}
            {contrast.map((c) => <div key={c.q.n} className="px-5 py-2.5 text-[12.5px]"><b className="num text-cyan-deep">{c.q.n}.</b> <span className="text-ink-soft">{c.q.q}</span><div className="num mt-0.5 text-[12px] text-muted">respuestas {c.vs.join(" · ")} · diferencia {c.d}</div></div>)}
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
            <div className={`mt-0.5 text-[12px] leading-snug ${on ? "text-white/80" : "text-muted"}`}>{s.pregunta}</div>
            <div className={`mt-1.5 text-[12px] font-bold uppercase tracking-wider ${on ? "text-cyan-fill" : "text-faint"}`}>Lidera {s.lider}</div>
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
  const router = useRouter();
  const [vista, setVista] = useVista();
  useEffect(() => { if (mine) { setR(mine.r); setCargo(mine.cargo ?? ""); setObjetivo(mine.objetivo ?? ""); } }, [mine]);
  const answered = TEST_QUESTIONS.filter((q) => r[q.n] != null && r[q.n] !== "").length;
  const set = (n: number | string, v: number | string | undefined) => setR((prev) => { const next = { ...prev }; if (v === undefined) delete next[n]; else next[n] = v; return next; });
  // responder avanza a la siguiente pregunta pendiente (la respuesta no se guarda hasta enviar)
  const responder = (n: number, v: number | string) => { set(n, v); irAlSiguientePendiente(String(n)); };
  const sinGuardar = JSON.stringify(r) !== JSON.stringify(mine?.r ?? {}) || cargo !== (mine?.cargo ?? "") || objetivo !== (mine?.objetivo ?? "");
  const salir = async () => {
    if (sinGuardar && !(await confirmar({ title: "Salir sin enviar", body: "El test solo se guarda al enviarlo. Si sales ahora, lo respondido en esta sesión se pierde.", confirmLabel: "Salir", danger: true }))) return;
    router.push("/panel/diagnostico/test");
  };
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
        <div className="mb-4 flex items-center justify-between"><Link href="/panel/diagnostico/test" className="inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Participantes</Link><button className="chip" onClick={() => { pedirPantallaCompleta(); setSaved(null); }}>Corregir mis respuestas</button></div>
        <Card className="rise rise-1 mb-5">
          <CardHeader title="Tu resultado preliminar" sub={`${saved.name}${saved.cargo ? ` · ${saved.cargo}` : ""} · ${new Date(saved.at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`} />
          <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="label mb-2">Etapa predominante</div>
              <div className="grid grid-cols-5 gap-1">{STAGES.map((s) => <div key={s.name} className={`rounded-lg px-2 py-2 text-center text-[12px] font-bold ${s.name === T.stage ? "text-white" : s.name === T.hypothesis ? "bg-cyan-wash text-cyan-deep" : "bg-surface-2 text-muted"}`} style={s.name === T.stage ? { background: "var(--navy)" } : undefined}>{s.name}</div>)}</div>
              <p className="mt-3 text-[13px] text-ink"><b>{stage.name}{T.provisional ? " (provisional)" : ""}.</b> {stage.pregunta} {stage.cond}</p>
              {T.hypothesis && T.hypothesis !== T.stage && <p className="mt-2 rounded-lg bg-gold-wash px-3 py-2 text-[12px] text-ink-soft">En la pregunta 25 señalaste un desafío propio de <b>{T.hypothesis}</b>; tus respuestas apuntan a <b>{T.stage}</b>. Las dos quedan como hipótesis hasta comprobarlas con evidencia.</p>}
              {saved.objetivo && <p className="mt-2 text-[12.5px] text-muted"><b className="text-ink">Objetivo a doce meses.</b> {saved.objetivo}</p>}
            </div>
            <div className="space-y-2">
              {T.caps.map((c, i) => (
                <div key={c.n} className="text-[12px]"><div className="flex items-baseline justify-between"><b className="text-ink">{c.name}</b><span className="num text-muted">{f1(c.avg, 2)} · cobertura {c.cov}/6</span></div><div className="relative h-[7px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.avg ?? 0) / 5) * 100}%`, background: c.avg != null && c.avg < THRESHOLD ? "var(--bad)" : LINES[i].color }} /><div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: "60%" }} /></div><div className="mt-0.5 text-[12px] leading-snug text-muted">{c.reportable ? rangeText(c.avg) : "Cobertura insuficiente: se necesitan al menos cinco respuestas de seis."}</div></div>
              ))}
            </div>
          </div>
          <div className="border-t border-line px-5 py-4">
            <div className="label mb-2">Qué está limitando el crecimiento</div>
            {T.patterns.length ? T.patterns.slice(0, 3).map((p, i) => (
              <div key={p.hip} className="mb-2 rounded-xl bg-surface-2 px-4 py-3"><div className="text-[12px] font-bold uppercase tracking-wider text-cyan-deep">{i === 0 ? "Prioridad principal" : "Prioridad de soporte"} · preguntas {p.qs.join(", ")}</div><div className="text-[13px] font-bold text-ink">{p.accion}</div><div className="text-[12px] text-muted">{p.hip}</div></div>
            )) : <p className="text-[12.5px] text-muted">No aparece un patrón dominante{T.lows.length ? `; las preguntas más débiles son ${T.lows.slice(0, 3).map((q) => q.n).join(", ")}` : ""}.</p>}
            {T.pending.length > 0 && <p className="text-[12px] text-muted">Pendientes de verificación: preguntas {T.pending.join(", ")}. No cuentan como nota baja.</p>}
            <p className="mt-2 text-[12px] italic text-faint">Lectura automática de tus respuestas. El advisor la confirma con evidencia: una práctica declarada y no demostrada queda como máximo en nivel 2.</p>
          </div>
        </Card>
      </>
    );
  }
  const introTest = (
    <Card className="rise rise-1 mb-5">
      <CardHeader title="Antes de comenzar" sub="Responde pensando en cómo funciona realmente la empresa en los últimos seis meses. Elige la respuesta que puedas sostener con ejemplos concretos; si no sabes, marca «Sin información»." />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <label className="text-[12px] font-bold uppercase tracking-wider text-faint">Tu cargo<input className="input mt-1 font-normal normal-case tracking-normal" value={cargo} onChange={(e) => setCargo(e.target.value)} /></label>
        <label className="text-[12px] font-bold uppercase tracking-wider text-faint">Principal objetivo de crecimiento a doce meses<input className="input mt-1 font-normal normal-case tracking-normal" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></label>
      </div>
      <div className="grid gap-1.5 px-5 pb-5 sm:grid-cols-5">{LEVELS.map((l) => <div key={l.n} className="rounded-lg bg-surface-2 px-3 py-2 text-[12px]"><b className="text-ink">{l.n} · {l.name}</b><div className="text-muted">{l.desc}</div></div>)}</div>
    </Card>
  );
  const q25 = (
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
  );
  const pantallasTest: Pantalla[] = [
    { kind: "libre", id: "intro", node: introTest },
    ...TEST.bloques.flatMap((b, bi) => b.qs.map((q) => ({ kind: "item" as const, id: String(q.n), grupo: `Bloque ${bi + 1} de 4 · ${b.cap}`, grupoDesc: b.pregunta, code: String(q.n), texto: q.q, demo: q.demo, niveles: LEVELS.map((l) => ({ n: l.n, name: l.name, desc: l.desc })), guia: GUIDES.test[String(q.n)], value: r[q.n], onSet: (v: number | string | undefined) => set(q.n, v), ni: true }))),
    { kind: "libre", id: "q25", node: q25 },
    { kind: "libre", id: "fin", node: (
      <Card className="rise p-6 text-center">
        <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-deep">Fin del test</div>
        <div className="mt-1 text-[18px] font-extrabold text-ink">{answered} de 24 preguntas con número{r[25] ? " y el desafío dominante elegido" : ""}</div>
        <p className="mx-auto mt-2 max-w-[48ch] text-[13px] text-muted">{answered < 12 ? `Se necesitan al menos 12 preguntas con número; llevas ${answered}. Usa el mapa de puntos para volver a las pendientes.` : "Puedes volver a cualquier pregunta con el mapa de puntos antes de enviar. Se guarda una respuesta por persona; la última reemplaza a la anterior."}</p>
        <button onClick={submit} disabled={busy || answered < 12} className="btn-primary mt-4 inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Guardar y ver mi resultado</button>
      </Card>
    ) },
  ];
  return (
    <ModoFocal kicker="Test de capacidad empresarial · puerta de entrada" title="25 preguntas sobre cómo funciona la empresa" color="var(--navy)"
      progress={{ n: answered, total: 24, label: "con número" }} status={sinGuardar ? "Se guarda al enviar" : undefined} onExit={salir} exitLabel="Participantes"
      footer={vista === "una" ? undefined : <>
        <span className="text-[12px] text-muted">Se guarda una respuesta por persona; la última reemplaza a la anterior. Se necesitan al menos 12 preguntas con número.</span>
        <button onClick={submit} disabled={busy || answered < 12} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Guardar y ver mi resultado</button>
      </>}>
      <div className="mb-4 flex justify-end"><SelectorVista vista={vista} onChange={setVista} /></div>
      {vista === "lista" ? (<>
      <Card className="rise rise-1 mb-5">
        <CardHeader title="Antes de comenzar" sub="Responde pensando en cómo funciona realmente la empresa en los últimos seis meses. Elige la respuesta que puedas sostener con ejemplos concretos; si no sabes, marca «Sin información»." />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          <label className="text-[12px] font-bold uppercase tracking-wider text-faint">Tu cargo<input className="input mt-1 font-normal normal-case tracking-normal" value={cargo} onChange={(e) => setCargo(e.target.value)} /></label>
          <label className="text-[12px] font-bold uppercase tracking-wider text-faint">Principal objetivo de crecimiento a doce meses<input className="input mt-1 font-normal normal-case tracking-normal" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></label>
        </div>
      </Card>
      {TEST.bloques.map((b, bi) => (
        <div key={b.cap} className="mb-5">
          <div className="mb-2 rounded-xl px-5 py-3 text-white" style={{ background: LINES[bi].color }}><div className="text-[12px] font-bold uppercase tracking-[0.18em] opacity-80">Bloque {bi + 1} de 4</div><div className="text-[16px] font-extrabold">{b.cap}</div><div className="text-[12px] opacity-90">{b.pregunta}</div></div>
          {b.qs.map((q) => {
            const g = GUIDES.test[String(q.n)]; const v = r[q.n];
            return (
              <div key={q.n} className={ITEM_CLS} data-item={String(q.n)} data-pendiente={v == null || v === "" ? "1" : "0"} tabIndex={-1} onKeyDown={(e) => teclaNumero(e, 5, (n) => responder(q.n, n))}>
              <Card>
                <div className="px-5 py-4">
                  <div className="flex gap-3"><span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: "var(--navy)" }}>{q.n}</span><div><p className="text-[13.5px] font-semibold leading-snug text-ink">{q.q}</p><p className="mt-0.5 text-[12px] text-muted"><b className="text-[12px] uppercase tracking-wider text-cyan-deep">Lo demuestra</b> {q.demo}</p></div></div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {LEVELS.map((l) => (
                      <button key={l.n} type="button" onClick={() => responder(q.n, l.n)} title={g?.n?.[String(l.n)]}
                        className={`rounded-lg border px-1 py-2 text-center transition-all ${v === l.n ? "border-navy text-white" : "border-line bg-surface hover:border-gold"}`} style={v === l.n ? { background: "var(--navy)" } : undefined}>
                        <div className="num text-[16px] font-extrabold">{l.n}</div><div className={`text-[11px] font-semibold ${v === l.n ? "text-cyan-fill" : "text-muted"}`}>{l.name}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <button type="button" onClick={() => (v === "NI" ? set(q.n, undefined) : responder(q.n, "NI"))} className={`chip ${v === "NI" ? "chip-warn" : ""}`}>Sin información</button>
                    {typeof v === "number" && g?.n?.[String(v)] && <p className="flex-1 rounded-lg bg-cyan-wash px-3 py-2 text-[12px] leading-snug text-ink-soft"><b className="text-ink">{v} · {LEVELS[v - 1].name}.</b> {g.n[String(v)]}{g.q && <i className="mt-0.5 block text-muted">{g.q}</i>}</p>}
                    {v === "NI" && g?.ni && <p className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-muted">{g.ni}</p>}
                  </div>
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      ))}
      <div className={ITEM_CLS} data-item="25" data-pendiente={r[25] ? "0" : "1"} tabIndex={-1}>
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
      </div>
      </>) : <UnaAUna key={mine ? "con" : "sin"} pantallas={pantallasTest} color="var(--navy)" etiqueta="preguntas" />}
      {msg && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 12%, var(--surface))", color: "var(--bad-text)" }}>{msg}</div>}
    </ModoFocal>
  );
}

/* ═══ Fuente 1 · Autoevaluación directiva por persona ═══
   Cada cuenta responde los 68 ítems del mapa (cuatro por dimensión) y ve su
   lectura; el advisor y el administrador ven a todo el comité y su consolidado,
   que a su vez alimenta el corte en curso del diagnóstico. */

type F1Api = { responses: F1Response[]; mine: F1Response | null; all: boolean; total: number; closed: boolean };

function useF1() {
  const [data, setData] = useState<F1Api | null>(null);
  const refetch = useCallback(async () => {
    try { const r = await fetch("/api/td/f1"); if (r.ok) setData(await r.json()); } catch { /* sin red */ }
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, refetch };
}

/** Promedio por dimensión y por capacidad de una respuesta (solo lo contestado): regla compartida con el informe con IA. */
const f1Lectura = lecturaF1;

const f1Fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function EscalaF1() {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {MAPA.escalaF1.map((e, i) => (
        <div key={e.n} className="rounded-xl bg-surface-2 px-3 py-2.5">
          <div className="flex items-center gap-2"><span className="num flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: LEVELS[i].color }}>{e.n}</span><b className="text-[12.5px] text-ink">{e.name}</b></div>
          <p className="mt-1 text-[12px] leading-snug text-muted">{e.desc}</p>
        </div>
      ))}
    </div>
  );
}

function AutoevaluacionTab() {
  const { data } = useF1();
  const canAll = useCan("view_f1_all");
  const mine = data?.mine ?? null;
  const total = data?.total ?? PRACTICES.length;
  const myN = mine ? Object.keys(mine.r).length : 0;
  const estado = !mine ? "pendiente" : myN >= total ? "completa" : "parcial";
  if (!data) return <><Skeleton className="mb-4 h-24" /><SkeletonCards n={3} /></>;
  const lista = data.responses;
  const lecturas = lista.map((f) => ({ f, L: f1Lectura(f.r) }));
  // consolidado: promedio de los promedios por persona y dispersión entre ellas, dimensión por dimensión
  const consolidado = DIMS.map((d, i) => {
    const xs = lecturas.map((x) => x.L.dims[i].m).filter((m): m is number => m != null);
    return { d, m: avg(xs), s: sdev(xs), n: xs.length };
  });
  const capsCons = CAPS.map((c) => ({ cap: c, m: avg(consolidado.filter((x) => x.d.cap === c.name).map((x) => x.m)) }));
  const dispersas = consolidado.filter((x) => (x.s ?? 0) >= 1);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}>
        <div className="min-w-0 flex-1 basis-[280px]">
          <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Fuente 1 · Autoevaluación directiva</div>
          <div className="text-[15px] font-extrabold">{estado === "completa" ? "Ya respondiste la autoevaluación" : estado === "parcial" ? `Llevas ${myN} de ${total} afirmaciones` : "Responde la autoevaluación directiva"}</div>
          <div className="text-[12px] text-white/75">
            {data?.closed ? "El corte ya se publicó: la autoevaluación está cerrada y tu lectura queda como quedó."
              : estado === "pendiente" ? "68 afirmaciones, cuatro por dimensión, en la escala de 1 a 5. Entre 35 y 45 minutos; puedes parar y seguir después: el avance se guarda en la plataforma."
              : `Guardada el ${f1Fecha(mine!.at)}. Puedes corregir cualquier respuesta hasta que el advisor cierre el corte.`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mine && <Link href="/panel/diagnostico/autoevaluacion/resultado" className="btn-on-dark text-[12px]"><FileText size={13} /> Mi lectura</Link>}
          {!data?.closed && <Link href="/panel/diagnostico/autoevaluacion/responder" onClick={pedirPantallaCompleta} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><ClipboardCheck size={13} /> {estado === "pendiente" ? "Responder" : estado === "parcial" ? "Continuar" : "Revisar mis respuestas"}</Link>}
        </div>
      </div>

      <Card className="rise rise-1 mb-5">
        <CardHeader title="Cómo se responde" sub="califica lo que la organización hace de forma recurrente y podría demostrar con un ejemplo, un documento o un indicador; no lo que te gustaría que ocurriera" />
        <div className="px-5 pb-5">
          <ul className="mb-4 grid gap-1.5 text-[12.5px] text-ink-soft sm:grid-cols-3">
            <li className="rounded-xl bg-surface-2 px-3 py-2">Responde de forma individual, sin deliberar con otros miembros del comité.</li>
            <li className="rounded-xl bg-surface-2 px-3 py-2">Si dudas entre dos números, elige el menor.</li>
            <li className="rounded-xl bg-surface-2 px-3 py-2">Tu respuesta es confidencial: al comité se le reportan agregados; solo el advisor ve cada lectura.</li>
          </ul>
          <EscalaF1 />
        </div>
      </Card>

      {canAll && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Respuestas" value={lista.length} foot={`${lecturas.filter((x) => x.L.answered >= total).length} completas · ${lecturas.filter((x) => x.L.answered < total).length} en curso`} />
            <StatCard label="Autoevaluación del comité" value={avg(capsCons.map((c) => c.m)) ?? 0} decimals={1} foot="promedio de las cuatro capacidades" />
            <StatCard label="Dimensiones con lecturas distintas" value={dispersas.length} unit="de 17" foot="dispersión de 1,0 o más entre miembros" good={dispersas.length === 0} />
          </div>
          <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <Card className="rise rise-2">
              <CardHeader title="Quién ha respondido" sub="cada lectura individual la ve solo el advisor; el comité recibe el consolidado" />
              <div className="px-3 pb-3">
                <ResponsiveTable rows={lecturas} rowKey={(x) => x.f.email} empty="Nadie ha respondido todavía." columns={[
                  { key: "quien", header: "Participante", priority: 1, cell: ({ f }) => <><Link href={`/panel/diagnostico/autoevaluacion/resultado/${encodeURIComponent(f.email)}`} className="font-bold text-cyan-deep hover:underline">{f.name}</Link><div className="text-[12px] font-normal text-faint">{f.cargo ?? f.role}</div></> },
                  ...CAPS.map((c, i) => ({ key: c.code, header: c.code, align: "center" as const, priority: 2 as const, cell: ({ L }: (typeof lecturas)[number]) => { const m = L.caps[i].m; return <span className={m != null && m < THRESHOLD ? "font-bold text-bad" : ""}>{f1(m, 2)}</span>; } })),
                  { key: "avance", header: "Avance", align: "center", priority: 2, cell: ({ L }) => `${L.answered}/${total}` },
                  { key: "fecha", header: "Guardada", priority: 3, cell: ({ f }) => <span className="text-muted">{new Date(f.at).toLocaleDateString("es-CO")}</span> },
                ]} />
                {lecturas.length > 1 && <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2/60 px-4 py-2 text-[12.5px]"><b className="text-ink">Comité</b>{capsCons.map((c) => <span key={c.cap.n} className="num"><span className="text-faint">{c.cap.code}</span> <b className="text-ink">{f1(c.m, 2)}</b></span>)}</div>}
              </div>
            </Card>
            <Card className="rise rise-3">
              <CardHeader title="Perfil del comité" sub="promedio de las lecturas individuales" />
              <div className="px-4 pb-4"><MiniRadar color="var(--gold)" axes={capsCons.map((c) => ({ label: c.cap.code, value: Math.max(0, c.m ?? 0), target: THRESHOLD }))} /></div>
            </Card>
          </div>
          <Card className="rise rise-4 mb-5">
            <CardHeader title="Las diecisiete dimensiones según el comité" sub="promedio, dispersión entre miembros y nivel; la dispersión alta se conversa, no se promedia" />
            <div className="px-3 pb-3">
              <ResponsiveTable rows={consolidado} rowKey={(x) => x.d.code} columns={[
                { key: "dim", header: "Dimensión", priority: 1, cell: (x) => <><b className="text-ink">{x.d.code}</b> · {x.d.name}</> },
                { key: "cap", header: "Capacidad", priority: 3, cell: (x) => <span className="text-muted">{x.d.cap}</span> },
                { key: "m", header: "Promedio", align: "center", priority: 2, cell: (x) => <span className={x.m != null && x.m < THRESHOLD ? "font-bold text-bad" : ""}>{f1(x.m, 2)}</span> },
                { key: "s", header: "Dispersión", align: "center", priority: 2, cell: (x) => x.s != null ? <span className={`chip !py-0 ${x.s >= 1 ? "chip-warn" : ""}`}>{f1(x.s, 2)}</span> : "—" },
                { key: "n", header: "Respuestas", align: "center", priority: 3, cell: (x) => <span className="text-muted">{x.n}</span> },
                { key: "nivel", header: "Nivel", priority: 2, cell: (x) => x.m != null ? <span className={`chip !py-0 ${LEVEL_CLS[levelOf(x.m)]}`}>{levelName(x.m)}</span> : "—" },
              ]} />
            </div>
            <div className="border-t border-line px-5 py-3 text-[12px] text-muted">El consolidado entra al corte en curso como Fuente 1: en <Link href="/panel/diagnostico" className="font-bold text-cyan-deep hover:underline">Resumen</Link> se cruza con la percepción de equipos y la evidencia.</div>
          </Card>
          <InformeCta kind="consolidado" completa={lista.length > 0} href="/panel/diagnostico/autoevaluacion/informe/consolidado" />
        </>
      )}
    </>
  );
}

function ResponderF1() {
  const { data, refetch } = useF1();
  const [r, setR] = useState<Record<string, number>>({});
  const [cargo, setCargo] = useState("");
  const [step, setStep] = useState(0);        // 0..3 capacidades
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const [vista, setVista] = useVista();
  useEffect(() => { if (data && !loaded) { if (data.mine) { setR(data.mine.r); setCargo(data.mine.cargo ?? ""); } setLoaded(true); } }, [data, loaded]);
  const total = PRACTICES.length;
  const answered = Object.keys(r).length;
  const save = useCallback(async (silent: boolean) => {
    if (!Object.keys(r).length) return false;
    setSaving(true); setMsg(null);
    const res = await fetch("/api/td/f1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ r, cargo }) });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg(j.error ?? "No se pudo guardar."); return false; }
    setDirty(false); setSavedAt(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }));
    if (!silent) await refetch();
    return true;
  }, [r, cargo, refetch]);
  // guardado automático: un segundo después del último cambio
  useEffect(() => { if (!dirty || data?.closed) return; const t = setTimeout(() => { void save(true); }, 1000); return () => clearTimeout(t); }, [dirty, r, cargo, data?.closed, save]);
  const set = (code: string, v: number) => { setR((prev) => { const next = { ...prev }; if (next[code] === v) delete next[code]; else next[code] = v; return next; }); setDirty(true); };
  if (data?.closed) {
    return (
      <Card className="rise p-6"><div className="text-[13px] text-ink"><b>La autoevaluación está cerrada:</b> el advisor ya publicó el corte. {data.mine ? <Link href="/panel/diagnostico/autoevaluacion/resultado" className="font-bold text-cyan-deep hover:underline">Ver mi lectura</Link> : "No alcanzaste a responder."}</div></Card>
    );
  }
  const cap = CAPS[step];
  const dims = DIMS.filter((d) => d.cap === cap.name);
  const stepN = (c: (typeof CAPS)[number]) => DIMS.filter((d) => d.cap === c.name).flatMap((d) => d.prac).filter((p) => r[p.code] != null).length;
  const stepTot = (c: (typeof CAPS)[number]) => DIMS.filter((d) => d.cap === c.name).reduce((a, d) => a + d.prac.length, 0);
  const finish = async () => { const ok = await save(false); if (ok) { avisar("Autoevaluación guardada"); router.push("/panel/diagnostico/autoevaluacion/resultado"); } };
  // responder una afirmación avanza a la siguiente pendiente; volver a pulsar el mismo número la desmarca
  const responder = (code: string, v: number) => { const cambia = r[code] !== v; set(code, v); if (cambia) irAlSiguientePendiente(code); };
  const salir = async () => { if (dirty) await save(true); router.push("/panel/diagnostico/autoevaluacion"); };
  const irAlPaso = (i: number) => { setStep(i); focalArriba(); };
  const setValor = (code: string, v: number | string | undefined) => { setR((prev) => { const next = { ...prev }; if (v === undefined) delete next[code]; else next[code] = Number(v); return next; }); setDirty(true); };
  const introF1 = (
    <Card className="rise rise-1 mb-5">
      <CardHeader title="Antes de comenzar" sub="responde según lo que la empresa hace de forma recurrente y podría demostrar; si dudas entre dos números, elige el menor" />
      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[260px_1fr]">
        <label className="text-[12px] font-bold uppercase tracking-wider text-faint">Tu cargo<input className="input mt-1 font-normal normal-case tracking-normal" value={cargo} onChange={(e) => { setCargo(e.target.value); setDirty(true); }} /></label>
        <EscalaF1 />
      </div>
    </Card>
  );
  const ultimo = step === CAPS.length - 1;
  const pantallasF1: Pantalla[] = [
    ...(step === 0 ? [{ kind: "libre" as const, id: "intro", node: introF1 }] : []),
    ...dims.flatMap((d) => d.prac.map((p) => ({ kind: "item" as const, id: p.code, grupo: `${d.code} · ${d.name}`, grupoDesc: d.defn, code: p.code, texto: p.f1, niveles: MAPA.escalaF1.map((l, i) => ({ n: i + 1, name: l.name, desc: l.desc })), guia: GUIDES.f1[p.code], value: r[p.code], onSet: (v: number | string | undefined) => setValor(p.code, v) }))),
    { kind: "libre", id: "fin", node: (
      <div className="panel rise p-6 text-center" style={{ borderTop: `3px solid ${cap.color}` }}>
        <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: cap.color }}>Paso {step + 1} de 4 · {cap.name}</div>
        <div className="mt-1 text-[18px] font-extrabold text-ink">{stepN(cap)} de {stepTot(cap)} afirmaciones respondidas</div>
        <p className="mx-auto mt-2 max-w-[48ch] text-[13px] text-muted">{stepN(cap) < stepTot(cap) ? "Puedes dejar pendientes y volver después: el avance se guarda solo. Usa el mapa de puntos para ir a las que faltan." : ultimo ? "Completaste las cuatro capacidades. Guarda y mira tu lectura." : "Paso completo. Sigue con la siguiente capacidad."}</p>
        {ultimo
          ? <button type="button" onClick={finish} disabled={saving || answered === 0} className="btn-primary mt-4 inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Guardar y ver mi lectura</button>
          : <button type="button" onClick={() => irAlPaso(step + 1)} className="btn-primary mt-4 inline-flex items-center gap-1.5 text-[12.5px]">Paso {step + 2}: {CAPS[step + 1].name} <ArrowRight size={13} /></button>}
      </div>
    ) },
  ];
  return (
    <ModoFocal kicker={`Fuente 1 · Autoevaluación directiva · paso ${step + 1} de 4`} title={cap.name} color={cap.color}
      progress={{ n: answered, total, label: "afirmaciones" }}
      status={saving ? "Guardando…" : dirty ? "Cambios sin guardar" : savedAt ? `Guardado ${savedAt}` : "El avance se guarda solo"}
      onExit={salir} exitLabel="Autoevaluación"
      footer={vista === "una" ? undefined : <>
        <button type="button" onClick={() => irAlPaso(Math.max(0, step - 1))} disabled={step === 0} className="btn-ghost text-[12.5px] disabled:opacity-40"><ArrowLeft size={13} /> Anterior</button>
        <span className="hidden text-[12px] text-muted sm:inline">{stepN(cap)} de {stepTot(cap)} en este paso · puedes cerrar y seguir después.</span>
        {step < CAPS.length - 1
          ? <button type="button" onClick={() => irAlPaso(step + 1)} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px]">Siguiente <ArrowRight size={13} /></button>
          : <button type="button" onClick={finish} disabled={saving || answered === 0} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Guardar y ver mi lectura</button>}
      </>}>
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {CAPS.map((c, i) => { const n = stepN(c), t = stepTot(c); const on = i === step; return (
          <button key={c.n} type="button" onClick={() => irAlPaso(i)} aria-current={on ? "step" : undefined} className={`min-w-0 rounded-xl px-2 py-2 text-left transition-all sm:px-3 ${on ? "text-white shadow-sm" : "bg-surface-2 hover:bg-surface"}`} style={on ? { background: c.color } : undefined}>
            <div className={`hidden text-[12px] font-bold uppercase tracking-wider sm:block ${on ? "text-white/70" : "text-faint"}`}>Paso {i + 1} de 4</div>
            <div className={`truncate text-[12px] font-extrabold sm:text-[13px] ${on ? "" : "text-ink"}`}><span className="sm:hidden">{c.code}</span><span className="hidden sm:inline">{c.name}</span></div>
            <div className="relative mt-1.5 h-[5px] overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full" style={{ width: `${(n / t) * 100}%`, background: on ? "rgba(255,255,255,.85)" : c.color }} /></div>
            <div className={`num mt-1 text-[12px] ${on ? "text-white/80" : "text-muted"}`}>{n} de {t}</div>
          </button>
        ); })}
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="rounded-xl px-4 py-2 text-white" style={{ background: cap.color }}><span className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{cap.code} · {cap.verb}</span> <b className="ml-2 text-[13px]">{cap.q}</b></div><SelectorVista vista={vista} onChange={setVista} /></div>
      {vista === "lista" ? (<>
      {step === 0 && (
        <Card className="rise rise-1 mb-5">
          <CardHeader title="Antes de comenzar" sub="responde según lo que la empresa hace de forma recurrente y podría demostrar; si dudas entre dos números, elige el menor" />
          <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[260px_1fr]">
            <label className="text-[12px] font-bold uppercase tracking-wider text-faint">Tu cargo<input className="input mt-1 font-normal normal-case tracking-normal" value={cargo} onChange={(e) => { setCargo(e.target.value); setDirty(true); }} /></label>
            <EscalaF1 />
          </div>
        </Card>
      )}
      {dims.map((d) => (
        <div key={d.code} className="mb-5">
          <div className="mb-2 mt-4 px-1"><div className="text-[14px] font-extrabold text-ink">{d.code} · {d.name}</div><p className="text-[12px] leading-snug text-muted">{d.defn}</p></div>
          {d.prac.map((p) => {
            const g = GUIDES.f1[p.code]; const v = r[p.code];
            return (
              <div key={p.code} className={ITEM_CLS} data-item={p.code} data-pendiente={v == null ? "1" : "0"} tabIndex={-1} onKeyDown={(e) => teclaNumero(e, 5, (n) => responder(p.code, n))}>
              <Card>
                <div className="px-5 py-4">
                  <div className="flex gap-3"><span className="num shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[12px] font-extrabold text-ink-soft">{p.code}</span><p className="text-[13.5px] font-semibold leading-snug text-ink">{p.f1}</p></div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {MAPA.escalaF1.map((l, i) => { const n = i + 1; return (
                      <button key={l.n} type="button" onClick={() => responder(p.code, n)} title={g?.n?.[String(n)]}
                        className={`rounded-lg border px-1 py-2 text-center transition-all ${v === n ? "border-navy text-white" : "border-line bg-surface hover:border-gold"}`} style={v === n ? { background: "var(--navy)" } : undefined}>
                        <div className="num text-[16px] font-extrabold">{n}</div><div className={`text-[11px] font-semibold ${v === n ? "text-cyan-fill" : "text-muted"}`}>{l.name}</div>
                      </button>
                    ); })}
                  </div>
                  {typeof v === "number" && g?.n?.[String(v)] && <p className="mt-2 rounded-lg bg-cyan-wash px-3 py-2 text-[12px] leading-snug text-ink-soft"><b className="text-ink">{v} · {MAPA.escalaF1[v - 1].name}.</b> {g.n[String(v)]}{g.q && <i className="mt-0.5 block text-muted">{g.q}</i>}</p>}
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      ))}
      </>) : <UnaAUna key={`${step}-${loaded ? 1 : 0}`} pantallas={pantallasF1} color={cap.color} />}
      {msg && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 12%, var(--surface))", color: "var(--bad-text)" }}>{msg}</div>}
    </ModoFocal>
  );
}

function ResultadoF1({ email }: { email: string | null }) {
  const { data } = useF1();
  const canAll = useCan("view_f1_all");
  const f = email && canAll ? (data?.responses.find((x) => x.email.toLowerCase() === email.toLowerCase()) ?? null) : data?.mine ?? null;
  const total = PRACTICES.length;
  if (!data) return <Skeleton className="h-44" />;
  if (!f) return (
    <Card className="rise p-6"><div className="text-[13px] text-ink">{email && canAll ? "Esa persona no ha respondido la autoevaluación." : "Todavía no has respondido la autoevaluación."} <Link href="/panel/diagnostico/autoevaluacion" className="font-bold text-cyan-deep hover:underline">Volver</Link></div></Card>
  );
  const L = f1Lectura(f.r);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/diagnostico/autoevaluacion" className="inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Autoevaluación</Link>
        <span className="flex gap-2">
          {!data.closed && f.email.toLowerCase() === (data.mine?.email ?? "").toLowerCase() && <Link href="/panel/diagnostico/autoevaluacion/responder" onClick={pedirPantallaCompleta} className="chip">Corregir respuestas</Link>}
          <button type="button" onClick={() => window.print()} className="chip inline-flex items-center gap-1"><Printer size={12} /> Imprimir o guardar en PDF</button>
        </span>
      </div>
      <Card className="rise rise-1 mb-5">
        <CardHeader title="Tu evaluación de la compañía · Fuente 1 de 3" sub={`${f.name}${f.cargo ? ` · ${f.cargo}` : ""} · ${f1Fecha(f.at)}`} />
        <div className="px-5 pb-2 text-[13px] leading-relaxed text-ink-soft">Cómo ves las capacidades de la compañía desde tu rol. Es una hipótesis individual: el consolidado promedia a todos los miembros del comité y se contrasta con lo que viven los equipos y con la evidencia documental.</div>
        {L.answered < total && <div className="mx-5 mb-4 rounded-xl px-4 py-2.5 text-[12px]" style={{ background: "var(--gold-wash)", color: "var(--gold-text)" }}><b>Lectura parcial.</b> Llevas {L.answered} de {total} afirmaciones. Las dimensiones sin responder aparecen vacías y los promedios se calculan solo con lo contestado.</div>}
        <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[260px_1fr]">
          <div><div className="label mb-2">Perfil de las cuatro capacidades</div><MiniRadar color="var(--navy)" size={230} axes={L.caps.map((c) => ({ label: c.cap.code, value: Math.max(0, c.m ?? 0), target: THRESHOLD }))} /></div>
          <div className="space-y-3">
            {L.caps.map((c) => (
              <div key={c.cap.n} className="text-[12px]">
                <div className="flex items-baseline justify-between"><b className="text-ink">{c.cap.name}</b><span className="num text-muted">{f1(c.m, 2)} · {c.n} de {c.tot} respondidas</span></div>
                <div className="relative h-[7px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.m ?? 0) / 5) * 100}%`, background: c.m != null && c.m < THRESHOLD ? "var(--bad)" : c.cap.color }} /><i className="absolute top-0 h-full w-px bg-ink/40" style={{ left: `${(THRESHOLD / 5) * 100}%` }} /></div>
                <div className="mt-0.5 text-[12px] text-muted">{c.m != null ? <><b className="text-ink">{levelName(c.m)}.</b> {LEVELS[levelOf(c.m) - 1].desc}</> : "Sin responder"}</div>
              </div>
            ))}
            <p className="text-[12px] italic text-faint">La marca del umbral señala 3,0: por debajo, la práctica no está instalada. Un promedio alto no borra una dimensión débil.</p>
          </div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="rise rise-2">
          <CardHeader title="Las diecisiete dimensiones" sub="promedio de las cuatro afirmaciones de cada una" />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Dimensión</th><th className="px-3 py-2">Capacidad</th><th className="num px-2 py-2 text-center">Tu puntaje</th><th className="px-3 py-2">Nivel</th></tr></thead>
              <tbody>
                {L.dims.map((x) => (
                  <tr key={x.d.code} className="border-t border-line">
                    <td className="px-3 py-2"><b className="text-ink">{x.d.code}</b> · {x.d.name}{x.n < x.d.prac.length && <span className="num ml-1 text-[12px] text-faint">{x.n}/{x.d.prac.length}</span>}</td>
                    <td className="px-3 py-2 text-muted">{x.d.cap}</td>
                    <td className={`num px-2 py-2 text-center ${x.m != null && x.m < THRESHOLD ? "font-bold" : ""}`} style={x.m != null && x.m < THRESHOLD ? { color: "var(--bad-text)" } : undefined}>{f1(x.m, 2)}</td>
                    <td className="px-3 py-2">{x.m != null ? <span className={`chip !py-0 ${LEVEL_CLS[levelOf(x.m)]}`}>{levelName(x.m)}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="rise rise-3">
          <CardHeader title="Qué conviene mirar primero" sub="dimensiones bajo 3,0 ordenadas por su arrastre sobre las demás" />
          <div className="divide-y divide-line">
            {L.prios.length === 0 && <div className="px-5 py-4 text-[12.5px] italic text-faint">{L.answered ? "Ninguna dimensión quedó bajo el umbral según tu lectura." : "Responde para ver qué mirar primero."}</div>}
            {L.prios.slice(0, 6).map((x, i) => (
              <div key={x.d.code} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3"><div className="text-[13px] font-bold text-ink">{i + 1}. {x.d.name}</div><span className="num text-[12px] text-muted">{f1(x.m, 2)}</span></div>
                <div className="text-[12px] text-muted">{x.d.code} · {x.d.cap}{x.d.fws.length ? ` · se instala con ${x.d.fws.map((id) => MAPA.fw[id]?.name ?? id).join(", ")}` : ""}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-5 py-3 text-[12px] italic text-faint">Lectura automática de tus respuestas. El advisor la confirma con la percepción de los equipos y la evidencia: una práctica declarada y no demostrada queda como máximo en nivel 2.</div>
        </Card>
      </div>
      <InformeCta kind="f1" email={email && canAll ? f.email : null} completa={L.answered >= total} href={`/panel/diagnostico/autoevaluacion/informe${email && canAll ? `/${encodeURIComponent(f.email)}` : ""}`} />
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
        <div className="flex items-center gap-2">{msg && <span className="text-[12px] text-muted">{msg}</span>}<button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><Printer size={13} /> Imprimir o guardar en PDF</button></div>
      </div>
      <div className="panel px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="kicker">Test de capacidad empresarial · Informe de una página</div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">{String(resp.meta.nombre)}</h2>
            <div className="text-[12px] text-muted">{String(resp.meta.cargo ?? "")} · {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ge-logo-negro.png" alt="Gestión estratégica" className="h-7 object-contain" />
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <div className="label mb-1">Etapa predominante</div>
            <div className="grid grid-cols-5 gap-1">{STAGES.map((s) => <div key={s.name} className={`rounded-md px-1 py-1.5 text-center text-[12px] font-bold ${s.name === T.stage ? "text-white" : s.name === T.hypothesis ? "bg-cyan-wash text-cyan-deep" : "bg-surface-2 text-muted"}`} style={s.name === T.stage ? { background: "var(--navy)" } : undefined}>{s.name}</div>)}</div>
            <p className="mt-2 text-[12.5px] text-ink"><b>{stage.name}{T.provisional ? " (provisional)" : ""}.</b> {stage.cond}{T.hypothesis && T.hypothesis !== T.stage ? ` En la pregunta 25 señaló un desafío propio de ${T.hypothesis}: ambas quedan como hipótesis.` : ""}</p>
            <div className="label mb-1 mt-3">Objetivo de crecimiento a doce meses</div>
            <p className="text-[12.5px] text-ink-soft">{String(resp.meta.objetivo ?? "") || <span className="italic text-faint">No registrado.</span>}</p>
          </div>
          <div>
            <div className="label mb-1">Perfil de capacidades y cobertura de verificación</div>
            {T.caps.map((c, i) => (
              <div key={c.n} className="mb-1.5 text-[12px]"><div className="flex items-baseline justify-between"><b className="text-ink">{c.name}</b><span className="num text-muted">{f1(c.avg, 2)} · {c.cov}/6</span></div><div className="relative h-[6px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.avg ?? 0) / 5) * 100}%`, background: c.avg != null && c.avg < THRESHOLD ? "var(--bad)" : LINES[i].color }} /><div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold" style={{ left: "60%" }} /></div></div>
            ))}
            <p className="mt-1 text-[12px] text-faint">Umbral 3,0. Un promedio superior no elimina las debilidades de preguntas individuales.</p>
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

        <div className="mt-5 border-t border-line pt-3 text-[12px] text-muted">
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
  const head = (n: number, t: string, sub: string) => <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2"><span className="num text-[22px] font-extrabold text-cyan-deep">{n}</span><div><div className="text-[15px] font-extrabold text-ink">{t}</div><div className="text-[12px] text-muted">{sub}</div></div></div>;
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">Las cinco salidas del diagnóstico completo sobre <b className="text-ink">{label}</b>, listas para la devolución de 90 minutos. El navegador las guarda en PDF.</p>
        <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-1.5 text-[12px]"><Printer size={13} /> Imprimir o guardar en PDF</button>
      </div>
      <div className="panel mb-5 px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="kicker">Diagnóstico de capacidades · {label}</div><h2 className="text-[20px] font-extrabold tracking-tight text-ink">{v.catalog.company.name}</h2><div className="text-[12px] text-muted">{C.f1n} autoevaluaciones · {C.f2n} respuestas de equipos{C.okF2 ? "" : " (muestra insuficiente)"} · evidencia {C.hasF3 ? "registrada" : "pendiente"}</div></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ge-logo-negro.png" alt="Gestión estratégica" className="h-7 object-contain" />
        </div>
        {head(1, "Radar de las cuatro capacidades", "lectura ejecutiva con el umbral de brecha y el titular del patrón")}
        <div className="grid gap-5 md:grid-cols-[300px_1fr] md:items-center">
          <MaturityRadar size={300} scores={scores} />
          <div>
            <p className="text-[13.5px] leading-relaxed text-ink">{gap.length ? <>{gap.length === 1 ? "Una capacidad" : `${gap.length} capacidades`} por debajo del umbral: <b>{gap.map((c) => c.name).join(", ")}</b>. {gap.length >= 2 ? "Dos o más capacidades en brecha indican una falla de arquitectura, no un problema de esfuerzo." : "Las demás están suficientemente instaladas."}</> : "Ninguna capacidad está por debajo del umbral."}{strongest ? ` La capacidad más avanzada es ${strongest.name} (${f1(strongest.m)}).` : ""}</p>
            <table className="mt-3 w-full text-[12px]"><thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="py-1">Capacidad</th><th className="num py-1 text-center">F1</th><th className="num py-1 text-center">F2</th><th className="num py-1 text-center">F3</th><th className="num py-1 text-center">Madurez</th></tr></thead><tbody>{C.caps.map((c) => <tr key={c.n} className="border-t border-line"><td className="py-1 font-bold text-ink">{c.name}</td><td className="num py-1 text-center">{f1(c.f1)}</td><td className="num py-1 text-center">{f1(c.f2)}</td><td className="num py-1 text-center">{f1(c.f3)}</td><td className="num py-1 text-center font-extrabold" style={{ color: (c.m ?? 5) < THRESHOLD ? "var(--bad)" : "var(--ink)" }}>{f1(c.m)}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
      <div className="panel print-break mb-5 px-7 py-6">
        {head(2, "Mapa de calor por dimensión", "las 17 dimensiones con sus tres fuentes, la madurez triangulada, el nivel y las marcas")}
        <MaturityHeatmap scores={scores} />
        <table className="mt-4 w-full text-[12px]"><thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="py-1">Dimensión</th><th className="num py-1 text-center">F1</th><th className="num py-1 text-center">F2</th><th className="num py-1 text-center">F3</th><th className="num py-1 text-center">Madurez</th><th className="py-1">Nivel</th><th className="py-1">Marcas</th></tr></thead><tbody>{C.dims.map((d) => <tr key={d.code} className="border-t border-line"><td className="py-1"><b className="num text-cyan-deep">{d.code}</b> {d.name}</td><td className="num py-1 text-center">{f1(d.f1)}</td><td className="num py-1 text-center">{f1(d.f2raw)}</td><td className="num py-1 text-center">{f1(d.f3)}</td><td className="num py-1 text-center font-extrabold">{f1(d.m)}</td><td className="py-1">{d.m != null ? levelName(d.m) : "—"}</td><td className="py-1 text-muted">{d.flags.map((f) => f.key).join(" · ")}</td></tr>)}</tbody></table>
      </div>
      <div className="panel print-break mb-5 px-7 py-6">
        {head(3, "Brechas priorizadas", "máximo cinco, ordenadas por profundidad y efecto de arrastre, con la metodología y el framework que las instalan")}
        {C.priorities.length === 0 && <p className="text-[12.5px] text-muted">Ninguna dimensión está por debajo de 3,0.</p>}
        {C.priorities.slice(0, 5).map((d, i) => { const dim = dimOf(d.code); return (
          <div key={d.code} className="mb-3 border-l-[3px] pl-3" style={{ borderColor: i === 0 ? "var(--bad)" : "var(--gold)" }}>
            <div className="text-[12px] font-bold uppercase tracking-wider text-faint">{i === 0 ? "Cuello de botella" : `Brecha ${i + 1}`} · madurez {f1(d.m)} · arrastre {fmtNum(DRAG_WEIGHT(d.code), 1)} · prioridad {fmtNum(d.priority, 2)}</div>
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
        {C.f2n > 0 && <table className="mt-4 w-full text-[12px]"><thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="py-1">Ítems de contraste general (equipos)</th><th className="num py-1 text-right">Promedio</th></tr></thead><tbody>{C.general.map((q) => <tr key={q.code} className="border-t border-line"><td className="py-1 text-ink-soft">{q.text}</td><td className="num py-1 text-right font-bold">{f1(q.avg)}</td></tr>)}</tbody></table>}
        {C.openAnswers.length > 0 && <div className="mt-3"><div className="label mb-1">Respuestas abiertas (anónimas)</div><ul className="text-[12px] text-ink-soft">{C.openAnswers.map((t, i) => <li key={i}>«{t}»</li>)}</ul></div>}
      </div>
      <div className="panel mb-5 px-7 py-6">
        {head(5, "Recomendación de nivel", "nivel de acompañamiento, composición propuesta y lo que no se necesita hoy")}
        <div className="rounded-xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}><div className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel recomendado</div><div className="text-[22px] font-extrabold">{R.level}</div><p className="mt-1 text-[12.5px] text-white/85">{R.text}</p>{R.notNeeded && <p className="mt-2 text-[12px] text-white/75">{R.notNeeded}</p>}</div>
        <p className="mt-3 text-[12px] text-muted">Los puntajes son madurez evaluada con reglas de evidencia, no una medición psicométrica; no son comparables entre empresas mientras no existan baremos. La recomendación la confirma el advisor con las entrevistas y el contexto de la empresa.</p>
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
            <div className="flex flex-wrap items-center gap-2"><span className="num text-[12px] font-extrabold" style={{ color: i === 0 ? "var(--bad)" : "var(--gold)" }}>{i === 0 ? "CUELLO DE BOTELLA" : `BRECHA ${i + 1}`}</span><span className="num text-[12px] text-muted">madurez {f1(d.m)} · arrastre {fmtNum(DRAG_WEIGHT(d.code), 1)} · prioridad {fmtNum(d.priority, 2)}</span></div>
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
        <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel de acompañamiento recomendado</div>
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
                <code className="num min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-ink-soft">{d.url}</code>
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
          <div className="mt-1 text-[12px] text-muted">{ok ? "Muestra suficiente para reportar." : `Faltan ${8 - (d?.total ?? 0)} para la muestra mínima; con menos de cinco la Fuente 2 no se reporta y la madurez se calcula 55/45.`}</div>
          {d && Object.keys(d.byArea).length > 0 && <div className="mt-2 space-y-0.5 text-[12px]">{Object.entries(d.byArea).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-ink-soft">{k}</span><span className="num text-muted">{v}{v < 5 ? " · no se reporta por separado" : ""}</span></div>)}</div>}
          {d?.latest && <div className="mt-2 text-[12px] text-faint">Última: {new Date(d.latest).toLocaleString("es-CO")}</div>}
        </div>
      </div>
    </Card>
  );
}

/* ═══ Captura A3 ═══ */

type CaptureApi = { capture: { vars: Record<string, VariableCapture>; progress: { total: number; perception: number; dik: number; level: number } }; published: boolean };

function Captura() {
  const cv = useCatalog();
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
      {msg && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: "var(--gold-wash)", color: "var(--gold-text)" }}>{msg}</div>}
      {hasInstrument(cv.catalog.company, "f2") && <F2Card />}
      {!canCapture && <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-muted">Tu rol consulta la captura; la registran los responsables de cada capacidad y el advisor.</div>}
      <div className="space-y-5">
        {dimsOf(cap).map((d) => (
          <Card key={d.code}>
            <CardHeader title={`${d.code} · ${d.name}`} sub={d.defn} />
            {niv(d) && <div className="grid gap-1.5 px-5 pb-3 sm:grid-cols-5">{[1, 2, 3, 4, 5].map((n) => <div key={n} className="rounded-lg bg-surface-2 px-2.5 py-2 text-[12px] leading-snug text-muted"><b className="text-ink">Nivel {n}.</b> {niv(d)[String(n)]}</div>)}</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-5 py-2">Práctica</th><th className="px-2 py-2">Autoevaluación</th><th className="px-2 py-2">Evidencia</th><th className="px-2 py-2">Nivel</th><th className="px-2 py-2">Registro</th></tr></thead>
                <tbody>
                  {practices.filter((p) => p.dim === d.code).map((p) => {
                    const c = vars[p.code];
                    return (
                      <Fragment key={p.code}>
                      <tr className="border-t border-line align-top">
                        <td className="px-5 py-2.5"><span className="num text-[12px] font-bold text-cyan-deep">{p.code}</span><div className="text-[12px] leading-snug text-ink-soft">{p.f1}</div></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canCapture || busy === p.code || data?.published} value={c?.perception ?? ""} onChange={(e) => send(p.code, { perception: Number(e.target.value) })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {LEVELS[n - 1].name}</option>)}</select></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canPublish || busy === p.code || data?.published} value={c?.evidence ?? ""} onChange={(e) => send(p.code, { evidence: e.target.value })}><option value="">—</option><option value="V">Verificada</option><option value="P">Parcial</option><option value="N">No existe</option></select></td>
                        <td className="px-2 py-2.5"><select className="input" disabled={!canPublish || busy === p.code || data?.published} value={c?.level ?? ""} onChange={(e) => send(p.code, { level: Number(e.target.value) })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
                        <td className="px-2 py-2.5 text-[12px] text-faint">{c ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} style={{ color: "var(--ok-text)" }} /> {c.by} · {new Date(c.at).toLocaleDateString("es-CO")}</span> : "sin captura"}</td>
                      </tr>
                      {c && (c.perception || c.evidence) && (
                        <tr className="bg-cyan-wash/50"><td colSpan={5} className="px-5 py-2 text-[12px] leading-snug text-ink-soft">
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

/* ═══ Informe ejecutivo de la autoevaluación (individual o consolidado) ═══
   El análisis con IA se genera una sola vez, de forma automática, cuando la evaluación individual está
   completa; queda guardado en la base y forma parte del informe. El consolidado lo generan admin y advisor. */

function InformeCta({ kind, email, completa, href }: { kind: "f1" | "consolidado"; email?: string | null; completa: boolean; href: string }) {
  const canAll = useCan("view_f1_all");
  const { data, busy, error, generar } = useInformeIA(kind, email, kind === "f1" && completa);
  const estado = !data ? "cargando" : data.informe ? (data.desactualizado ? "desactualizado" : "listo") : !data.disponible ? "no-disponible" : busy || (kind === "f1" && completa) ? "generando" : "pendiente";
  return (
    <Card className="rise mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: "var(--grad-deep)" }}><FileText size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-ink">{kind === "f1" ? "Informe ejecutivo de tu evaluación" : "Informe ejecutivo consolidado del comité"}</div>
          <div className="text-[12.5px] text-muted">
            {estado === "cargando" && "Cargando…"}
            {estado === "listo" && `Lectura con IA generada${data?.at ? ` el ${f1Fecha(data.at)}` : ""}. Gráficas por capacidad y dimensión, hallazgos y ruta de 90 días; descargable en PDF.`}
            {estado === "desactualizado" && "Hay respuestas nuevas desde el análisis guardado. El informe muestra las cifras vigentes; la lectura con IA puede actualizarse."}
            {estado === "generando" && (busy ? "El advisor virtual está escribiendo la lectura: tarda menos de un minuto." : "La lectura con IA se genera sola al abrir el informe.")}
            {estado === "pendiente" && (kind === "f1" ? "La lectura con IA se genera automáticamente al completar las 68 afirmaciones. Mientras tanto puedes ver las cifras." : "Aún no se ha generado la lectura consolidada con IA.")}
            {estado === "no-disponible" && "El análisis con IA requiere la integración de OpenAI (Administración → Integraciones). Las cifras del informe están disponibles."}
            {error && <span className="text-bad-text"> {error}</span>}
          </div>
        </div>
        <span className="flex flex-wrap items-center gap-2">
          {kind === "consolidado" && canAll && data?.disponible && (!data.informe || data.desactualizado) && <button type="button" onClick={() => void generar()} disabled={busy} className="btn-ghost btn-sm">{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {data.informe ? "Actualizar lectura" : "Generar lectura"}</button>}
          <Link href={href} className="btn-primary btn-sm">Abrir informe <ArrowRight size={13} /></Link>
        </span>
      </div>
    </Card>
  );
}

function InformeF1({ email }: { email: string | null }) {
  const { data } = useF1();
  const canAll = useCan("view_f1_all");
  const cv = useCatalog();
  const consolidado = email === "consolidado";
  const f = consolidado ? null : email && canAll ? (data?.responses.find((x) => x.email.toLowerCase() === email.toLowerCase()) ?? null) : data?.mine ?? null;
  const completa = !!f && Object.keys(f.r).length >= PRACTICES.length;
  const ia = useInformeIA(consolidado ? "consolidado" : "f1", consolidado ? null : f?.email ?? email, !consolidado && completa);
  if (!data) return <Skeleton className="h-64" />;
  if (consolidado && !canAll) return <Card className="rise p-6 text-[13px] text-ink">El consolidado lo ven el administrador y el advisor. <Link href="/panel/diagnostico/autoevaluacion" className="font-bold text-cyan-deep hover:underline">Volver</Link></Card>;
  if (!consolidado && !f) return <Card className="rise p-6 text-[13px] text-ink">{email && canAll ? "Esa persona no ha respondido la autoevaluación." : "Todavía no has respondido la autoevaluación."} <Link href="/panel/diagnostico/autoevaluacion" className="font-bold text-cyan-deep hover:underline">Volver</Link></Card>;
  let datos; let fecha: string; let persona: { nombre: string; cargo?: string } | undefined;
  if (consolidado) {
    const lect = data.responses.map((x) => lecturaF1(x.r));
    const porDim = DIMS.map((d, i) => { const xs = lect.map((L) => L.dims[i].m).filter((m): m is number => m != null); return { code: d.code, m: avg(xs), sd: sdev(xs), n: xs.length }; });
    datos = datosDesdeComite(porDim, data.responses.length, lect.map((L) => L.answered));
    fecha = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  } else {
    datos = datosDesdeRespuesta(f!.r); fecha = f1Fecha(f!.at); persona = { nombre: f!.name, cargo: f!.cargo };
  }
  const d = ia.data;
  const estado = !d ? "generando" : d.informe ? (d.desactualizado ? "desactualizado" : "listo") : !d.disponible ? "no-disponible" : ia.busy || (!consolidado && completa) ? "generando" : "pendiente";
  const meta = d?.at ? `Lectura con IA generada el ${new Date(d.at).toLocaleString("es-CO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}${d.model ? ` · modelo ${d.model}` : ""}.` : undefined;
  return (
    <InformeEjecutivo kind={consolidado ? "consolidado" : "f1"} empresa={cv.catalog.company.name} persona={persona} fecha={fecha} datos={datos} informe={d?.informe ?? null}
      estado={estado} meta={meta} shareUrl={consolidado ? d?.shareUrl : null} canRegen={canAll} onRegen={() => void ia.generar()} busy={ia.busy} error={ia.error}
      volverHref={consolidado ? "/panel/diagnostico/autoevaluacion" : `/panel/diagnostico/autoevaluacion/resultado${email && canAll && !consolidado ? `/${encodeURIComponent(email)}` : ""}`} />
  );
}
