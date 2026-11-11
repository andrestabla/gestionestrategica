"use client";

// Madurez digital · diagnóstico de transformación digital y niveles de madurez.
// Cinco vistas con ruta propia (/panel/madurez/<vista>): Resumen, Variables,
// Dominios, Índices y Captura. El instrumento depende del tipo de organización
// (empresa o institución educativa). La medición es de la empresa: nace vacía,
// se captura y se publica como corte; las vistas leen el corte elegido o la
// captura en curso.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader, Card, CardHeader, EmptyNote, Skeleton } from "@/components/ui";
import { useBase } from "@/components/user-context";
import { avisar, confirmar } from "@/components/feedback";
import { instrumentOf } from "@/data/madurez";
import {
  MAD_LEVELS, madLevelName, madLevelN, INDEX_LEVELS, indexLevel, DIK_ANCHORS, ITEM_TYPE_LABEL, PRACTICE_STATES, GAP_LABEL, SAFEGUARD_LABEL, D7_KEYS,
  P, E, S, gapPE, gapReading, practiceState, cellOf, lineLevel, dimLevel, overallLevel, domainLevel, lineIndex, generalIndex, d7Index,
  practiceCounts, evidenceCoverage, aiqOf, progressOf,
  type OrgKind, type Captures, type MadCapture, type MadCut, type SafeguardState, type SafeguardStatus, type MadInstrument, type MadVariable, type Progress, type CaptureField, type EvidenceComponent,
} from "@/lib/madurez";
import { Layers, Search, BookOpenCheck, Sigma, ClipboardList, ChevronDown, Lock, Send } from "lucide-react";

type Api = { kind: OrgKind; vars: Captures; safeguards: SafeguardState; cuts: MadCut[]; progress: Progress; puede: { calificar: boolean } };
type Tab = "resumen" | "variables" | "dominios" | "indices" | "captura";
const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "resumen", label: "Resumen", icon: Layers },
  { id: "variables", label: "Variables", icon: Search },
  { id: "dominios", label: "Dominios", icon: BookOpenCheck },
  { id: "indices", label: "Índices", icon: Sigma },
  { id: "captura", label: "Captura", icon: ClipboardList },
];
const isTab = (x: string | undefined): x is Tab => TABS.some((t) => t.id === x);

const f1 = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f0 = (n: number) => Math.round(n).toLocaleString("es-CO");
const nColor = (v: number) => `var(--n${madLevelN(v)})`;
const wash = (c: string, p = 20) => `color-mix(in srgb, ${c} ${p}%, var(--surface))`;
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

function Nivel({ v, dec = true }: { v: number | null | undefined; dec?: boolean }) {
  if (v === null || v === undefined) return <span className="num text-[13px] text-faint" title="Sin dato">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-bold text-ink" style={{ background: wash(nColor(v), 26) }}>
      <i className="h-2 w-2 rounded-full" style={{ background: nColor(v) }} /><span className="num">{dec ? f1(v) : v}</span>
    </span>
  );
}
function Barra({ pct, color = "var(--navy)", alto = 8 }: { pct: number | null; color?: string; alto?: number }) {
  return <div className="w-full overflow-hidden rounded-full bg-surface-3" style={{ height: alto }}><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%`, background: color }} /></div>;
}
function Dato({ label, valor, pie, color }: { label: string; valor: string; pie?: string; color?: string }) {
  return (
    <Card className="p-5">
      <div className="label">{label}</div>
      <div className="num mt-2 text-[30px] font-extrabold leading-none text-ink" style={color ? { color } : undefined}>{valor}</div>
      {pie && <div className="mt-2 text-[12px] leading-snug text-muted">{pie}</div>}
    </Card>
  );
}

export default function MadurezPage() {
  const base = useBase();
  const params = useParams<{ slug?: string[] }>();
  const seg = params.slug?.[0]?.toLowerCase();
  const tab: Tab = isTab(seg) ? seg : "resumen";
  const [data, setData] = useState<Api | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuente, setFuente] = useState<string | null>(null);   // id del corte o "curso"; nulo = el último corte, o la captura si no hay

  useEffect(() => {
    let vivo = true;
    fetch("/api/td/madurez", { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => null); if (!vivo) return; if (r.ok) setData(j); else setError(j?.error ?? `Error ${r.status}`); })
      .catch(() => { if (vivo) setError("No se pudo conectar con el servidor."); });
    return () => { vivo = false; };
  }, []);

  const enviar = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch("/api/td/madurez", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { avisar(j?.error ?? `Error ${r.status}`, "bad"); return false; }
    setData(j); return true;
  }, []);

  if (error) return <EmptyNote>{error}</EmptyNote>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  const ins = instrumentOf(data.kind);
  const ultimo = data.cuts[data.cuts.length - 1];
  const sel = tab === "captura" ? "curso" : fuente ?? (ultimo ? ultimo.id : "curso");
  const corte = data.cuts.find((c) => c.id === sel);
  const caps = corte ? corte.vars : data.vars;
  const sg = corte ? corte.safeguards : data.safeguards;
  const previo = corte ? data.cuts[data.cuts.indexOf(corte) - 1] : ultimo;

  return (
    <div>
      <PageHeader kicker="Madurez digital" title="Diagnóstico de transformación digital"
        desc={ins.intro}
        actions={tab !== "captura" && (
          <label className="flex items-center gap-2 text-[12px] text-muted">
            <span className="label !mb-0">Medición</span>
            <select value={sel} onChange={(e) => setFuente(e.target.value)} className="input !w-auto !py-1.5 text-[12.5px]" aria-label="Medición que se muestra">
              {[...data.cuts].reverse().map((c) => <option key={c.id} value={c.id}>{c.label} · {fecha(c.at)}</option>)}
              <option value="curso">Captura en curso</option>
            </select>
          </label>
        )} />

      <div className="rise mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Vistas de Madurez digital">
        {TABS.map((t) => { const on = t.id === tab; return (
          <Link key={t.id} href={`${base}/panel/madurez/${t.id}`} role="tab" aria-selected={on}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${on ? "bg-navy text-white" : "bg-surface text-ink-soft shadow-[var(--e1)] hover:text-navy"}`}>
            <t.icon size={15} /> {t.label}
          </Link>
        ); })}
      </div>

      {tab !== "captura" && !corte && (
        <p className="mb-4 rounded-xl bg-gold-wash px-4 py-3 text-[13px] text-ink-soft">
          {data.progress.level === 0 && data.progress.perception === 0
            ? <>Aún no hay medición. Empieza por la <Link href={`${base}/panel/madurez/captura`} className="font-semibold text-cyan-deep underline">captura</Link>: percepción, evidencia y nivel de cada variable.</>
            : <>Estás viendo la captura en curso ({data.progress.level} de {data.progress.total} variables con nivel). Las cifras son provisionales hasta que se publique el corte.</>}
        </p>
      )}

      {tab === "resumen" && <Resumen ins={ins} caps={caps} previo={previo && previo !== corte ? previo.vars : null} />}
      {tab === "variables" && <Variables ins={ins} caps={caps} />}
      {tab === "dominios" && <Dominios ins={ins} caps={caps} />}
      {tab === "indices" && <Indices ins={ins} caps={caps} sg={sg} editable={!corte && data.puede.calificar} enviar={enviar} />}
      {tab === "captura" && <Captura ins={ins} data={data} enviar={enviar} />}
    </div>
  );
}

/* ═══ Resumen ═══ */
function Resumen({ ins, caps, previo }: { ins: MadInstrument; caps: Captures; previo: Captures | null }) {
  const general = overallLevel(ins, caps), idx = generalIndex(ins, caps), prog = progressOf(ins, caps);
  const antes = previo ? overallLevel(ins, previo) : null;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Dato label="Madurez general" valor={general === null ? "—" : f1(general)} color={general === null ? undefined : nColor(general)}
          pie={general === null ? "Sin variables calificadas" : `${madLevelName(general)} · escala de 1 a 5${antes !== null ? ` · antes ${f1(antes)}` : ""}`} />
        <Dato label="Índice general" valor={idx === null ? "—" : f0(idx)} pie={idx === null ? "Requiere percepción y evidencia" : `${indexLevel(idx).name} · escala de 0 a 100`} />
        <Dato label="Cobertura de evidencia" valor={`${f0(evidenceCoverage(ins, caps))} %`} pie="Variables documentadas, implementadas y medidas" />
        <Dato label="Variables calificadas" valor={`${prog.level} de ${prog.total}`} pie={`Percepción ${prog.perception} · evidencia ${prog.dik}`} />
      </div>

      <Card>
        <CardHeader title="Madurez por línea y dimensión" sub="promedio del nivel de las variables de cada celda" />
        <div className="overflow-x-auto p-5 pt-4">
          <table className="w-full min-w-[620px] border-separate border-spacing-1.5 text-[13px]">
            <thead><tr>
              <th className="label text-left">Línea</th>
              {ins.dimensions.map((d) => <th key={d.key} className="label text-center">{d.name}</th>)}
              <th className="label text-center">Línea</th>
            </tr></thead>
            <tbody>
              {ins.lines.map((l) => (
                <tr key={l.n}>
                  <th className="max-w-[240px] py-1 pr-3 text-left text-[13px] font-semibold text-ink"><span className="num mr-2 text-[12px] text-faint">{l.code}</span>{l.name}</th>
                  {ins.dimensions.map((d) => { const c = cellOf(ins, caps, l.n, d.key); return (
                    <td key={d.key} className="rounded-lg px-2 py-3 text-center" style={{ background: c.value === null ? "var(--surface-2)" : wash(nColor(c.value), 30) }}
                      title={`${c.graded} de ${c.n} variables calificadas${c.target !== null ? ` · meta ${f1(c.target)}` : ""}`}>
                      <span className="num text-[15px] font-bold text-ink">{c.value === null ? "—" : f1(c.value)}</span>
                    </td>
                  ); })}
                  <td className="px-2 text-center"><Nivel v={lineLevel(ins, caps, l.n)} /></td>
                </tr>
              ))}
              <tr>
                <th className="label py-1 text-left">Dimensión</th>
                {ins.dimensions.map((d) => <td key={d.key} className="px-2 text-center"><Nivel v={dimLevel(ins, caps, d.key)} /></td>)}
                <td className="px-2 text-center"><Nivel v={general} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Niveles de madurez" sub="la escala contra la que se califica cada variable" />
        <div className="grid gap-3 p-5 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {MAD_LEVELS.map((n) => (
            <div key={n.n} className="rounded-xl p-3.5" style={{ background: wash(n.color, 14) }}>
              <div className="flex items-center gap-2"><span className="num grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: n.color }}>{n.n}</span><b className="text-[13.5px] text-ink">{n.name}</b></div>
              <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{n.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══ Variables ═══ */
function Ficha({ ins, v, c }: { ins: MadInstrument; v: MadVariable; c?: MadCapture }) {
  const st = practiceState(c), gr = gapReading(c), p = P(c), e = E(c), s = S(c);
  return (
    <div className="grid gap-5 border-t border-line bg-surface-2 px-5 py-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div><div className="label">Qué mide</div><p className="mt-1 text-[13px] text-ink-soft">{v.desc}</p></div>
        <div><div className="label">Qué se pregunta</div>
          <ul className="mt-1.5 space-y-1.5">{v.items.map((i, k) => (
            <li key={k} className="text-[13px] text-ink-soft"><span className="chip mr-1.5">{ITEM_TYPE_LABEL[i.type]}</span>{i.text}
              <span className="mt-0.5 block text-[12px] text-faint">{i.audiences.map((a) => ins.audiences[a] ?? a).join(" · ")}</span></li>
          ))}</ul>
        </div>
        <div><div className="label">Evidencia que se solicita</div>
          <ul className="mt-1.5 space-y-1.5">{v.evidence.map((r, k) => (
            <li key={k} className="text-[13px] text-ink-soft"><span className="chip chip-gold mr-1.5">{DIK_ANCHORS[r.component].label}{c && typeof c[r.component.toLowerCase() as "d" | "i" | "k"] === "number" ? ` · ${c[r.component.toLowerCase() as "d" | "i" | "k"]}` : ""}</span>{r.what}
              <span className="mt-0.5 block text-[12px] text-faint">Criterio: {r.criterio}</span></li>
          ))}</ul>
        </div>
      </div>
      <div className="space-y-4">
        <div><div className="label">Rúbrica</div>
          <ol className="mt-1.5 space-y-1">{v.rubric.map((r, k) => (
            <li key={k} className={`flex gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${c?.level === k + 1 ? "bg-surface font-semibold text-ink shadow-[var(--e1)]" : "text-ink-soft"}`}>
              <span className="num mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: `var(--n${k + 1})` }}>{k + 1}</span>{r}</li>
          ))}</ol>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[12px]">
          {p !== null && <span className="chip">Percepción <b className="num ml-1">{f0(p)}</b></span>}
          {e !== null && <span className="chip">Evidencia <b className="num ml-1">{f0(e)}</b></span>}
          {s !== null && <span className="chip chip-cyan">Puntuación <b className="num ml-1">{f0(s)}</b></span>}
          {gr && <span className={`chip ${gr === "CONVERGENCIA" ? "chip-ok" : "chip-warn"}`}>{GAP_LABEL[gr]}</span>}
          {st && <span className="chip">{PRACTICE_STATES.find((x) => x.key === st)?.label}</span>}
        </div>
        {c?.hallazgo && <div><div className="label">Hallazgo</div><p className="mt-1 text-[13px] text-ink-soft">{c.hallazgo}</p></div>}
        {c?.recomendacion && <div><div className="label">Recomendación</div><p className="mt-1 text-[13px] text-ink-soft">{c.recomendacion}</p></div>}
      </div>
    </div>
  );
}

function Variables({ ins, caps }: { ins: MadInstrument; caps: Captures }) {
  const [line, setLine] = useState(0), [dim, setDim] = useState(""), [frame, setFrame] = useState(""), [brecha, setBrecha] = useState(false), [q, setQ] = useState(""), [abierta, setAbierta] = useState<string | null>(null);
  const lista = useMemo(() => ins.variables.filter((v) => {
    const c = caps[v.id];
    if (line && v.line !== line) return false;
    if (dim && v.dimension !== dim) return false;
    if (frame && v.frame !== frame) return false;
    if (brecha && !(typeof c?.level === "number" && c.level < (c.target ?? 3))) return false;
    if (q && !`${v.id} ${v.name} ${v.desc}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [ins, caps, line, dim, frame, brecha, q]);
  return (
    <Card>
      <CardHeader title={`${lista.length} de ${ins.variables.length} variables`} sub="cada variable se evalúa contra un referente, con su protocolo y su rúbrica" />
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar variable" aria-label="Buscar variable" className="input !w-auto min-w-[180px] flex-1 !py-2 text-[13px]" />
        <select value={line} onChange={(e) => setLine(Number(e.target.value))} aria-label="Línea" className="input !w-auto !py-2 text-[13px]"><option value={0}>Todas las líneas</option>{ins.lines.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.short}</option>)}</select>
        <select value={dim} onChange={(e) => setDim(e.target.value)} aria-label="Dimensión" className="input !w-auto !py-2 text-[13px]"><option value="">Todas las dimensiones</option>{ins.dimensions.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}</select>
        <select value={frame} onChange={(e) => setFrame(e.target.value)} aria-label="Referente" className="input !w-auto !py-2 text-[13px]"><option value="">Todos los referentes</option>{Object.keys(ins.frames).map((f) => <option key={f} value={f}>{f}</option>)}</select>
        <label className="flex items-center gap-1.5 text-[13px] text-ink-soft"><input type="checkbox" checked={brecha} onChange={(e) => setBrecha(e.target.checked)} /> Solo con brecha</label>
      </div>
      <ul className="mt-4 divide-y divide-line border-t border-line">
        {lista.map((v) => { const c = caps[v.id], on = abierta === v.id; return (
          <li key={v.id}>
            <button type="button" onClick={() => setAbierta(on ? null : v.id)} aria-expanded={on} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
              <span className="num w-[76px] flex-none text-[12px] text-faint">{v.id}</span>
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-ink">{v.name}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{ins.lines.find((l) => l.n === v.line)?.short} · {ins.dimensions.find((d) => d.key === v.dimension)?.name} · <span style={{ color: ins.frames[v.frame]?.color }} className="font-semibold">{v.frame}</span></span></span>
              <span className="hidden text-[12px] text-muted sm:block">{typeof c?.target === "number" ? <>meta <b className="num text-ink">{c.target}</b></> : null}</span>
              <Nivel v={c?.level} dec={false} />
              <ChevronDown size={16} className={`flex-none text-faint transition-transform ${on ? "rotate-180" : ""}`} />
            </button>
            {on && <Ficha ins={ins} v={v} c={c} />}
          </li>
        ); })}
        {!lista.length && <li className="px-5 py-8 text-center text-[13px] text-muted">Ninguna variable cumple el filtro.</li>}
      </ul>
    </Card>
  );
}

/* ═══ Dominios ═══ */
function Dominios({ ins, caps }: { ins: MadInstrument; caps: Captures }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ins.domains.map((d) => { const lv = domainLevel(ins, caps, d); return (
        <Card key={d.id} className="p-5">
          <div className="flex items-start justify-between gap-3"><h3 className="text-[15.5px] font-bold text-ink">{d.name}</h3><Nivel v={lv} /></div>
          <p className="mt-1.5 text-[13px] text-muted">{d.desc}</p>
          <ul className="mt-4 space-y-2">
            {d.variableIds.map((id) => { const v = ins.variables.find((x) => x.id === id); if (!v) return null; const c = caps[id]; return (
              <li key={id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]">
                <span className="min-w-0 text-ink-soft"><span className="num mr-2 text-[12px] text-faint">{id}</span>{v.name}</span>
                <span className="flex w-[130px] items-center gap-2"><Barra pct={typeof c?.level === "number" ? (c.level / 5) * 100 : null} color={typeof c?.level === "number" ? nColor(c.level) : undefined} /><span className="num w-4 text-right text-[12.5px] font-bold text-ink">{c?.level ?? "—"}</span></span>
              </li>
            ); })}
          </ul>
        </Card>
      ); })}
    </div>
  );
}

/* ═══ Índices ═══ */
function Fila({ nombre, v, peso }: { nombre: string; v: number | null; peso?: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(90px,38%)_44px] items-center gap-3 text-[13px]">
      <span className="min-w-0 text-ink-soft">{nombre}{peso !== undefined && <span className="num ml-2 text-[12px] text-faint">{f0(peso * 100)} %</span>}</span>
      <Barra pct={v} color={v === null ? undefined : indexLevel(v).color} />
      <span className="num text-right text-[13px] font-bold text-ink">{v === null ? "—" : f0(v)}</span>
    </div>
  );
}
function Indices({ ins, caps, sg, editable, enviar }: { ins: MadInstrument; caps: Captures; sg: SafeguardState; editable: boolean; enviar: (b: Record<string, unknown>) => Promise<boolean> }) {
  const idx = generalIndex(ins, caps), pc = practiceCounts(ins, caps), aiq = aiqOf(ins, caps, sg);
  const brechas = ins.variables.map((v) => ({ v, g: gapPE(caps[v.id]) })).filter((x): x is { v: MadVariable; g: number } => x.g !== null && Math.abs(x.g) > 20).sort((a, b) => Math.abs(b.g) - Math.abs(a.g)).slice(0, 8);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="p-5">
          <div className="label">Índice general</div>
          <div className="mt-2 flex items-baseline gap-3"><span className="num text-[44px] font-extrabold leading-none text-ink">{idx === null ? "—" : f0(idx)}</span>{idx !== null && <span className="chip" style={{ background: wash(indexLevel(idx).color, 24) }}>{indexLevel(idx).name}</span>}</div>
          <p className="mt-3 text-[12.5px] leading-snug text-muted">Puntuación verificada de 0 a 100: 40 % percepción y 60 % evidencia (documentación 25, implementación 35, indicadores 40). Las líneas se ponderan por su peso.</p>
          <div className="mt-4 space-y-1.5">{INDEX_LEVELS.map((l) => <div key={l.name} className="flex gap-2 text-[12.5px] text-ink-soft"><i className="mt-1 h-2.5 w-2.5 flex-none rounded-full" style={{ background: l.color }} /><span><b className="text-ink">{l.name}</b> <span className="num text-faint">{l.min}–{l.max}</span> · {l.desc}</span></div>)}</div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5"><div className="label mb-3">Índice por línea</div><div className="space-y-2.5">{ins.lines.map((l) => <Fila key={l.n} nombre={l.name} v={lineIndex(ins, caps, l.n)} peso={l.weight} />)}</div></Card>
          <Card className="p-5"><div className="label mb-3">Índice por dimensión transversal</div><div className="space-y-2.5">{D7_KEYS.map((d) => <Fila key={d} nombre={ins.d7[d].name} v={d7Index(ins, caps, d)} />)}</div></Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="label">Estado de las prácticas</div>
          <p className="mt-1 text-[12.5px] text-muted">{pc.n} de {ins.variables.length} variables con evidencia calificada.</p>
          <div className="mt-4 space-y-3">{PRACTICE_STATES.map((s, i) => (
            <div key={s.key}><div className="flex justify-between text-[13px]"><span className="font-semibold text-ink">{s.label}</span><span className="num font-bold text-ink">{pc.counts[s.key]}</span></div>
              <div className="mt-1"><Barra pct={pc.n ? (pc.counts[s.key] / pc.n) * 100 : 0} color={`var(--n${i + 1})`} /></div>
              <p className="mt-1 text-[12px] text-faint">{s.question}</p></div>
          ))}</div>
        </Card>
        <Card className="p-5">
          <div className="label">Brecha entre percepción y evidencia</div>
          <p className="mt-1 text-[12.5px] text-muted">Más de 20 puntos de diferencia es un hallazgo de gestión: se cree más de lo que se demuestra, o hay prácticas que nadie ve.</p>
          {brechas.length ? <ul className="mt-4 space-y-2.5">{brechas.map(({ v, g }) => (
            <li key={v.id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]"><span className="min-w-0 text-ink-soft"><span className="num mr-2 text-[12px] text-faint">{v.id}</span>{v.name}</span>
              <span className={`chip ${g > 0 ? "chip-warn" : "chip-cyan"}`}>{g > 0 ? "Sobreestimación" : "Práctica invisible"} <b className="num ml-1">{g > 0 ? "+" : "−"}{f0(Math.abs(g))}</b></span></li>
          ))}</ul> : <p className="mt-4 text-[13px] text-muted">Sin brechas mayores a 20 puntos entre las variables con percepción y evidencia.</p>}
        </Card>
      </div>

      <Card>
        <CardHeader title="Preparación para inteligencia artificial" sub="componentes ponderados; una salvaguarda en falla le pone techo al índice" />
        <div className="grid gap-6 p-5 pt-4 lg:grid-cols-2">
          <div>
            <div className="flex items-baseline gap-3"><span className="num text-[36px] font-extrabold leading-none text-ink">{aiq.capped === null ? "—" : f0(aiq.capped)}</span>
              {aiq.capApplied && <span className="chip chip-bad">Techo {aiq.cap} por salvaguarda · sin techo {f0(aiq.raw!)}</span>}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]"><span className="chip">Preparación <b className="num ml-1">{aiq.preparacion === null ? "—" : f0(aiq.preparacion)}</b></span><span className="chip">Adopción e impacto <b className="num ml-1">{aiq.adopcion === null ? "—" : f0(aiq.adopcion)}</b></span></div>
            <div className="mt-4 space-y-2.5">{aiq.components.map((c) => <Fila key={c.key} nombre={c.name} v={c.score} peso={c.weight} />)}</div>
          </div>
          <div>
            <div className="label mb-2">Salvaguardas</div>
            <ul className="space-y-3">{ins.safeguards.map((s) => { const e = sg[s.id]; return (
              <li key={s.id} className="rounded-xl bg-surface-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 text-[13px] text-ink-soft"><span className="num mr-2 text-[12px] text-faint">{s.id}</span>{s.rule}</span>
                  {editable ? (
                    <select value={e?.status ?? ""} aria-label={`Estado de la salvaguarda ${s.id}`} className="input !w-auto !py-1.5 text-[12.5px]"
                      onChange={(ev) => void enviar({ op: "salvaguarda", id: s.id, status: ev.target.value || null, note: e?.note })}>
                      <option value="">Sin evaluar</option>{(["CUMPLE", "PARCIAL", "FALLA"] as SafeguardStatus[]).map((x) => <option key={x} value={x}>{SAFEGUARD_LABEL[x]}</option>)}
                    </select>
                  ) : <span className={`chip ${e?.status === "CUMPLE" ? "chip-ok" : e?.status === "FALLA" ? "chip-bad" : e?.status === "PARCIAL" ? "chip-warn" : ""}`}>{e ? SAFEGUARD_LABEL[e.status] : "Sin evaluar"}</span>}
                </div>
                {s.cap !== null && <p className="mt-1 text-[12px] text-faint">Si falla, el índice no pasa de {s.cap}.</p>}
              </li>
            ); })}</ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══ Captura ═══ */
function Escala({ valor, min, max, onPick, disabled, etiqueta }: { valor?: number; min: number; max: number; onPick: (v: number | null) => void; disabled?: boolean; etiqueta: string }) {
  return (
    <div className="flex gap-1" role="group" aria-label={etiqueta}>
      {Array.from({ length: max - min + 1 }, (_, k) => min + k).map((n) => (
        <button key={n} type="button" disabled={disabled} aria-pressed={valor === n} onClick={() => onPick(valor === n ? null : n)}
          className={`num grid h-9 w-9 place-items-center rounded-lg text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${valor === n ? "bg-navy text-white" : "bg-surface text-ink-soft shadow-[var(--e1)] hover:text-navy"}`}>{n}</button>
      ))}
    </div>
  );
}
function Texto({ label, valor, onSave }: { label: string; valor?: string; onSave: (v: string) => void }) {
  const [t, setT] = useState(valor ?? "");   // quien lo usa le pone key={valor}: al cambiar el valor guardado, el campo se reinicia
  return (
    <label className="block"><span className="label">{label}</span>
      <textarea value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { if (t.trim() !== (valor ?? "")) onSave(t); }} rows={2} maxLength={1200} className="input mt-1.5 text-[13px]" /></label>
  );
}
function Captura({ ins, data, enviar }: { ins: MadInstrument; data: Api; enviar: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [line, setLine] = useState(ins.lines[0].n), [abierta, setAbierta] = useState<string | null>(null), [label, setLabel] = useState(""), [ocupado, setOcupado] = useState(false);
  const cal = data.puede.calificar, pr = data.progress;
  const set = (id: string, campo: CaptureField, valor: number | string | null) => void enviar({ op: "capturar", id, patch: { [campo]: valor } });
  const publicar = async () => {
    if (!(await confirmar({ title: "Publicar el corte", body: `Se publica la medición con las ${pr.total} variables calificadas. El corte queda como referencia y la captura sigue abierta para el siguiente.`, confirmLabel: "Publicar" }))) return;
    setOcupado(true);
    if (await enviar({ op: "publicar", label })) { avisar("Corte publicado."); setLabel(""); }
    setOcupado(false);
  };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid gap-5 md:grid-cols-3">
          {([["Percepción", pr.perception, "la registra cualquier persona de la empresa"], ["Evidencia D · I · K", pr.dik, "la califica el advisor"], ["Nivel contra la rúbrica", pr.level, "lo asigna el advisor"]] as const).map(([t, n, d]) => (
            <div key={t}><div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold text-ink">{t}</span><span className="num text-[13px] font-bold text-ink">{n} de {pr.total}</span></div>
              <div className="mt-1.5"><Barra pct={(n / pr.total) * 100} color="var(--cyan-fill)" /></div><p className="mt-1 text-[12px] text-faint">{d}</p></div>
          ))}
        </div>
        {cal ? (
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <label className="min-w-[220px] flex-1"><span className="label">Nombre del corte</span><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Corte ${data.cuts.length + 1}`} maxLength={80} className="input mt-1.5 !py-2 text-[13px]" /></label>
            <button type="button" onClick={publicar} disabled={ocupado || pr.level < pr.total} className="btn-primary disabled:opacity-40"><Send size={15} /> Publicar corte</button>
            {pr.level < pr.total && <p className="w-full text-[12px] text-muted">Faltan {pr.total - pr.level} variables por calificar con nivel. Una medición parcial no se publica.</p>}
          </div>
        ) : <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[12.5px] text-muted"><Lock size={14} /> Tu captura registra la percepción. La evidencia, el nivel y la publicación del corte son del advisor.</p>}
      </Card>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Línea">
        {ins.lines.map((l) => { const vs = ins.variables.filter((v) => v.line === l.n), hechas = vs.filter((v) => typeof data.vars[v.id]?.[cal ? "level" : "perception"] === "number").length; return (
          <button key={l.n} type="button" role="tab" aria-selected={line === l.n} onClick={() => { setLine(l.n); setAbierta(null); }}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold ${line === l.n ? "bg-navy text-white" : "bg-surface text-ink-soft shadow-[var(--e1)]"}`}>{l.code} · {l.short} <span className="num ml-1 opacity-70">{hechas}/{vs.length}</span></button>
        ); })}
      </div>

      <Card>
        <ul className="divide-y divide-line">
          {ins.variables.filter((v) => v.line === line).map((v) => { const c = data.vars[v.id] ?? ({} as MadCapture), on = abierta === v.id; return (
            <li key={v.id}>
              <button type="button" onClick={() => setAbierta(on ? null : v.id)} aria-expanded={on} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                <span className="num w-[76px] flex-none text-[12px] text-faint">{v.id}</span>
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-ink">{v.name}</span><span className="mt-0.5 block text-[12px] text-muted">{ins.dimensions.find((d) => d.key === v.dimension)?.name} · {v.frame}</span></span>
                <span className="hidden text-[12px] text-muted sm:block">percepción <b className="num text-ink">{c.perception ?? "—"}</b></span>
                <Nivel v={c.level} dec={false} />
                <ChevronDown size={16} className={`flex-none text-faint transition-transform ${on ? "rotate-180" : ""}`} />
              </button>
              {on && (
                <div className="grid gap-6 border-t border-line bg-surface-2 px-5 py-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <p className="text-[13px] text-ink-soft">{v.desc}</p>
                    <div><div className="label">Percepción · de 1 (en desacuerdo) a 5 (de acuerdo)</div>
                      <p className="mb-2 mt-1 text-[13px] font-semibold text-ink">{v.items.find((i) => i.type === "likert")?.text}</p>
                      <Escala etiqueta="Percepción" valor={c.perception} min={1} max={5} onPick={(n) => set(v.id, "perception", n)} /></div>
                    {v.items.filter((i) => i.type !== "likert").length > 0 && (
                      <div><div className="label">Preguntas de apoyo</div><ul className="mt-1.5 space-y-1">{v.items.filter((i) => i.type !== "likert").map((i, k) => <li key={k} className="text-[12.5px] text-ink-soft"><span className="chip mr-1.5">{ITEM_TYPE_LABEL[i.type]}</span>{i.text}</li>)}</ul></div>
                    )}
                    {cal && <><Texto key={`h${c.hallazgo ?? ""}`} label="Hallazgo" valor={c.hallazgo} onSave={(t) => set(v.id, "hallazgo", t)} /><Texto key={`r${c.recomendacion ?? ""}`} label="Recomendación" valor={c.recomendacion} onSave={(t) => set(v.id, "recomendacion", t)} /></>}
                  </div>
                  <div className="space-y-4">
                    <div><div className="label">Evidencia · de 0 a 4</div>
                      <div className="mt-2 space-y-3">{(["D", "I", "K"] as EvidenceComponent[]).map((k) => { const req = v.evidence.find((e) => e.component === k), campo = k.toLowerCase() as "d" | "i" | "k", val = c[campo]; return (
                        <div key={k}>
                          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[13px] font-semibold text-ink">{DIK_ANCHORS[k].label} <span className="font-normal text-muted">· {DIK_ANCHORS[k].question}</span></span>
                            <Escala etiqueta={DIK_ANCHORS[k].label} valor={val} min={0} max={4} disabled={!cal} onPick={(n) => set(v.id, campo, n)} /></div>
                          {req && <p className="mt-1 text-[12px] text-faint">{req.what}. Criterio: {req.criterio}</p>}
                          {typeof val === "number" && <p className="mt-0.5 text-[12px] font-semibold text-ink-soft">{val} · {DIK_ANCHORS[k].levels[val]}</p>}
                        </div>
                      ); })}</div>
                    </div>
                    <div><div className="label">Nivel contra la rúbrica</div>
                      <ol className="mt-1.5 space-y-1">{v.rubric.map((r, k) => (
                        <li key={k}><button type="button" disabled={!cal} aria-pressed={c.level === k + 1} onClick={() => set(v.id, "level", c.level === k + 1 ? null : k + 1)}
                          className={`flex w-full gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] disabled:cursor-not-allowed ${c.level === k + 1 ? "bg-surface font-semibold text-ink shadow-[var(--e1)]" : "text-ink-soft hover:bg-surface"}`}>
                          <span className="num mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: `var(--n${k + 1})` }}>{k + 1}</span>{r}</button></li>
                      ))}</ol>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[13px] font-semibold text-ink">Meta de la variable</span><Escala etiqueta="Meta" valor={c.target} min={1} max={5} disabled={!cal} onPick={(n) => set(v.id, "target", n)} /></div>
                    {c.by && <p className="text-[12px] text-faint">Última captura: {c.by} · {fecha(c.at)}</p>}
                  </div>
                </div>
              )}
            </li>
          ); })}
        </ul>
      </Card>
    </div>
  );
}
