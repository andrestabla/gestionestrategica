"use client";

// Madurez digital · gráficas del informe de resultados. Todas salen de las cifras de la plataforma (la
// medición y los datos del sector); del modelo solo toman clasificaciones (exigencia del sector por línea,
// variables de las que depende cada prioridad, esfuerzo e impacto), nunca cifras. Un solo eje por gráfica,
// rótulos directos, leyenda cuando hay más de una serie y el detalle al pasar el cursor.

import type { ReactNode } from "react";
import {
  P, E, madLevelN, madLevelName, lineLevel, cellOf, d7Index, aiqOf, practiceState, PRACTICE_STATES, D7_KEYS, indexLevel,
  type MadInstrument, type MadLine, type Captures, type SafeguardState, type PracticeState,
} from "@/lib/madurez";
import type { MadInformeIA, Exigencia, Grado } from "@/lib/madurez-ia";
import type { SectorCruce } from "@/server/madurez-sector";

const f1 = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f0 = (n: number) => Math.round(n).toLocaleString("es-CO");
const pct = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
const nColor = (v: number) => `var(--n${madLevelN(v)})`;
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export const lineaDe = (ins: MadInstrument, txt: string) => ins.lines.find((l) => txt.startsWith(l.code) || txt.includes(l.name));
/** Nivel y meta promedio de un grupo de variables (las que tengan nivel). */
export function nivelDe(caps: Captures, idsVar: string[]) {
  return { nivel: media(idsVar.map((id) => caps[id]?.level).filter(num)), meta: media(idsVar.map((id) => caps[id]?.target).filter(num)) };
}

export function Figura({ titulo, nota, children, className = "" }: { titulo: string; nota?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <figure className={`break-inside-avoid rounded-xl border border-line bg-surface p-4 ${className}`}>
      <figcaption className="text-[13px] font-bold leading-snug text-ink">{titulo}</figcaption>
      <div className="mt-3">{children}</div>
      {nota && <p className="mt-3 text-[11.5px] leading-snug text-muted">{nota}</p>}
    </figure>
  );
}
const Leyenda = ({ items }: { items: { color: string; label: string; forma?: "punto" | "raya" | "aro" }[] }) => (
  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
    {items.map((x) => (
      <span key={x.label} className="inline-flex items-center gap-1.5">
        {x.forma === "raya" ? <i className="h-3 w-0 border-l-2" style={{ borderColor: x.color }} />
          : x.forma === "aro" ? <i className="h-2.5 w-2.5 rounded-full border-2 bg-surface" style={{ borderColor: x.color }} />
          : <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: x.color }} />}
        {x.label}
      </span>
    ))}
  </div>
);

/** Identificadores de variable con su nivel: el color es el del nivel y el nombre aparece al pasar el cursor. */
export function Vars({ ins, caps, ids }: { ins: MadInstrument; caps: Captures; ids: string[] }) {
  const xs = ids.map((id) => ins.variables.find((v) => v.id === id)).filter((v): v is NonNullable<typeof v> => !!v);
  if (!xs.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {xs.map((v) => { const n = caps[v.id]?.level; return (
        <span key={v.id} title={`${v.name}${num(n) ? ` · nivel ${n} (${madLevelName(n)})` : " · sin nivel"}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11.5px] text-ink-soft">
          <i className="h-2 w-2 rounded-full" style={{ background: num(n) ? nColor(n) : "var(--line-strong)" }} /><span className="num font-semibold">{v.id}</span>{num(n) && <span className="num text-muted">{n}</span>}
        </span>
      ); })}
    </div>
  );
}

/* ═══ 1 · Mapa de calor línea × dimensión ═══ */
export function MapaCalor({ ins, caps }: { ins: MadInstrument; caps: Captures }) {
  return (
    <Figura titulo="Nivel de madurez por línea y dimensión" nota="Promedio del nivel (1 a 5) de las variables de cada cruce. El color sigue la escala de madurez; «—» es un cruce sin nivel asignado.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-[3px] text-[12px]">
          <thead><tr><th className="w-[34%]" />{ins.dimensions.map((d) => <th key={d.key} className="px-1 pb-1 text-center text-[11px] font-semibold leading-tight text-muted">{d.short || d.name}</th>)}</tr></thead>
          <tbody>
            {ins.lines.map((l) => (
              <tr key={l.n}>
                <th className="pr-2 text-left text-[12px] font-semibold leading-tight text-ink"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: l.color }} />{l.short}</span></th>
                {ins.dimensions.map((d) => { const c = cellOf(ins, caps, l.n, d.key); return (
                  <td key={d.key} title={`${l.name} · ${d.name}: ${c.value === null ? "sin nivel" : `nivel ${f1(c.value)} (${madLevelName(c.value)})`}${c.target !== null ? ` · meta ${f1(c.target)}` : ""} · ${c.graded} de ${c.n} variables`}
                    className="rounded-md py-2.5 text-center" style={{ background: c.value === null ? "var(--surface-2)" : `color-mix(in srgb, ${nColor(c.value)} 34%, var(--surface))` }}>
                    <span className="num text-[14px] font-extrabold text-ink">{c.value === null ? "—" : f1(c.value)}</span>
                  </td>
                ); })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">{[1, 2, 3, 4, 5].map((n) => <span key={n} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `var(--n${n})` }} />{n} · {madLevelName(n)}</span>)}</div>
    </Figura>
  );
}

/* ═══ 2 · Nivel actual, meta y corte anterior por línea ═══ */
export function NivelPorLinea({ ins, caps, previo }: { ins: MadInstrument; caps: Captures; previo: Captures | null }) {
  const x = (v: number) => `${((v - 1) / 4) * 100}%`;
  const filas = ins.lines.map((l) => ({ l, nivel: lineLevel(ins, caps, l.n), meta: media(ins.variables.filter((v) => v.line === l.n).map((v) => caps[v.id]?.target).filter(num)), antes: previo ? lineLevel(ins, previo, l.n) : null }));
  return (
    <Figura titulo="Dónde está cada línea y a dónde debe llegar" nota="Escala de 1 a 5. La barra es el nivel de hoy; la raya, la meta promedio de sus variables.">
      <div className="space-y-3.5">
        {filas.map(({ l, nivel, meta, antes }) => (
          <div key={l.n}>
            <div className="flex items-baseline justify-between gap-3 text-[12.5px]"><span className="font-semibold text-ink">{l.name}</span>
              <span className="num flex-none text-ink-soft">{nivel === null ? "—" : <b className="text-ink">{f1(nivel)}</b>}{meta !== null && <span className="text-muted"> → meta {f1(meta)}</span>}</span></div>
            <div className="relative mt-1.5 h-3 rounded-full bg-surface-2" title={`${l.name}: nivel ${nivel === null ? "sin asignar" : f1(nivel)}${meta !== null ? ` · meta ${f1(meta)}` : ""}${antes !== null ? ` · corte anterior ${f1(antes)}` : ""}`}>
              {nivel !== null && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: x(nivel), background: l.color }} />}
              {antes !== null && <i className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface" style={{ left: x(antes), borderColor: "var(--ink-soft)" }} />}
              {meta !== null && <i className="absolute -top-1 h-5 w-0 -translate-x-1/2 border-l-2" style={{ left: x(meta), borderColor: "var(--ink)" }} />}
            </div>
          </div>
        ))}
        <div className="flex justify-between text-[11px] text-faint">{[1, 2, 3, 4, 5].map((n) => <span key={n} className="num">{n}</span>)}</div>
      </div>
      <Leyenda items={[{ color: "var(--ink)", label: "Meta", forma: "raya" }, ...(filas.some((f) => f.antes !== null) ? [{ color: "var(--ink-soft)", label: "Corte anterior", forma: "aro" as const }] : [])]} />
    </Figura>
  );
}

/* ═══ 3 · Percepción frente a evidencia, variable por variable ═══ */
export function DispersionPE({ ins, caps }: { ins: MadInstrument; caps: Captures }) {
  const pts = ins.variables.map((v) => ({ v, p: P(caps[v.id]), e: E(caps[v.id]), l: ins.lines.find((l) => l.n === v.line)! })).filter((x): x is typeof x & { p: number; e: number } => x.p !== null && x.e !== null);
  const W = 420, H = 300, m = { l: 38, r: 12, t: 12, b: 34 }, w = W - m.l - m.r, h = H - m.t - m.b;
  const sx = (e: number) => m.l + (e / 100) * w, sy = (p: number) => m.t + h - (p / 100) * h;
  const sobre = pts.filter((x) => x.p - x.e > 20), invis = pts.filter((x) => x.e - x.p > 20);
  const rotulos = [...pts].sort((a, b) => Math.abs(b.p - b.e) - Math.abs(a.p - a.e)).slice(0, 4).filter((x) => Math.abs(x.p - x.e) > 20);
  if (!pts.length) return <Figura titulo="Percepción frente a evidencia"><p className="text-[12.5px] text-muted">Aún no hay variables con percepción y evidencia calificada para comparar.</p></Figura>;
  return (
    <Figura titulo="Lo que la gente percibe frente a lo que se demuestra" nota={<>Cada punto es una variable (0 a 100). Sobre la franja: la gente cree más de lo que la evidencia sostiene ({sobre.length} {sobre.length === 1 ? "variable" : "variables"}). Bajo la franja: la práctica existe y no se ve ({invis.length}). Dentro: percepción y evidencia coinciden ({pts.length - sobre.length - invis.length}).</>}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Dispersión de ${pts.length} variables: percepción frente a evidencia`}>
        <polygon points={`${sx(0)},${sy(20)} ${sx(0)},${sy(0)} ${sx(20)},${sy(0)} ${sx(100)},${sy(80)} ${sx(100)},${sy(100)} ${sx(80)},${sy(100)}`} fill="var(--surface-2)" />
        {[0, 25, 50, 75, 100].map((t) => <g key={t}><line x1={sx(t)} x2={sx(t)} y1={m.t} y2={m.t + h} stroke="var(--line)" /><line x1={m.l} x2={m.l + w} y1={sy(t)} y2={sy(t)} stroke="var(--line)" />
          <text x={sx(t)} y={m.t + h + 14} textAnchor="middle" fontSize="10" fill="var(--faint)">{t}</text><text x={m.l - 6} y={sy(t) + 3} textAnchor="end" fontSize="10" fill="var(--faint)">{t}</text></g>)}
        <line x1={sx(0)} y1={sy(0)} x2={sx(100)} y2={sy(100)} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <text x={sx(4)} y={m.t + 12} fontSize="10.5" fontWeight="700" fill="var(--muted)">Sobreestimación</text>
        <text x={sx(96)} y={m.t + h - 8} textAnchor="end" fontSize="10.5" fontWeight="700" fill="var(--muted)">Práctica invisible</text>
        <text x={m.l + w / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="var(--muted)">Evidencia →</text>
        <text x={11} y={m.t + h / 2} textAnchor="middle" fontSize="10.5" fill="var(--muted)" transform={`rotate(-90 11 ${m.t + h / 2})`}>Percepción →</text>
        {pts.map(({ v, p, e, l }) => <circle key={v.id} cx={sx(e)} cy={sy(p)} r="5" fill={l.color} stroke="var(--surface)" strokeWidth="2"><title>{`${v.id} · ${v.name}: percepción ${f0(p)}, evidencia ${f0(e)} (${p - e > 0 ? "+" : ""}${f0(p - e)})`}</title></circle>)}
        {rotulos.map(({ v, p, e }) => <text key={v.id} x={sx(e) + (e > 78 ? -8 : 8)} y={sy(p) + 3.5} textAnchor={e > 78 ? "end" : "start"} fontSize="10" fontWeight="600" fill="var(--ink-soft)">{v.id}</text>)}
      </svg>
      <Leyenda items={ins.lines.map((l) => ({ color: l.color, label: l.short }))} />
    </Figura>
  );
}

/* ═══ 4 · Estado de las prácticas por línea ═══ */
export function EstadoPracticas({ ins, caps }: { ins: MadInstrument; caps: Captures }) {
  const filas = ins.lines.map((l) => {
    const cuenta = Object.fromEntries(PRACTICE_STATES.map((s) => [s.key, 0])) as Record<PracticeState, number>;
    let n = 0; for (const v of ins.variables.filter((x) => x.line === l.n)) { const st = practiceState(caps[v.id]); if (st) { cuenta[st]++; n++; } }
    return { l, cuenta, n };
  });
  if (!filas.some((f) => f.n)) return <Figura titulo="Estado de las prácticas"><p className="text-[12.5px] text-muted">Aún no hay evidencia calificada para clasificar las prácticas.</p></Figura>;
  return (
    <Figura titulo="Qué tan instaladas están las prácticas" nota="Número de variables de cada línea según su evidencia: de ausente (no hay nada verificable) a con impacto (el resultado se mide y se sostiene).">
      <div className="space-y-3">
        {filas.map(({ l, cuenta, n }) => (
          <div key={l.n}>
            <div className="flex items-baseline justify-between text-[12.5px]"><span className="font-semibold text-ink">{l.short}</span><span className="num text-muted">{n} variables</span></div>
            <div className="mt-1.5 flex h-5 gap-[2px]">
              {PRACTICE_STATES.map((s, i) => cuenta[s.key] > 0 && (
                <div key={s.key} title={`${l.name} · ${s.label}: ${cuenta[s.key]} de ${n}`} className="grid place-items-center rounded-[4px] text-[11px] font-bold text-white" style={{ flex: cuenta[s.key], background: `var(--n${i + 1})` }}><span className="num">{cuenta[s.key]}</span></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Leyenda items={PRACTICE_STATES.map((s, i) => ({ color: `var(--n${i + 1})`, label: s.label }))} />
    </Figura>
  );
}

/* ═══ 5 · Barras de índice (0 a 100): dimensiones transversales y componentes de IA ═══ */
function BarrasIndice({ items, techo }: { items: { label: string; valor: number | null; detalle?: string }[]; techo?: number | null }) {
  return (
    <div className="space-y-2.5">
      {items.map((x) => (
        <div key={x.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1" title={`${x.label}: ${x.valor === null ? "sin dato" : `${f0(x.valor)} de 100 (${indexLevel(x.valor).name})`}${x.detalle ? ` · ${x.detalle}` : ""}`}>
          <span className="text-[12px] leading-tight text-ink-soft">{x.label}</span><span className="num text-[12.5px] font-bold text-ink">{x.valor === null ? "—" : f0(x.valor)}</span>
          <div className="relative col-span-2 h-2.5 rounded-full bg-surface-2">
            {x.valor !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-navy" style={{ width: `${x.valor}%` }} />}
            {num(techo) && <i className="absolute -top-1 h-[18px] w-0 -translate-x-1/2 border-l-2 border-dashed" style={{ left: `${techo}%`, borderColor: "var(--bad)" }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
export function IndiceTransversal({ ins, caps }: { ins: MadInstrument; caps: Captures }) {
  return (
    <Figura titulo="Índice por dimensión transversal" nota="Índice de 0 a 100 (percepción y evidencia combinadas) de las siete dimensiones que atraviesan las líneas.">
      <BarrasIndice items={D7_KEYS.map((k) => ({ label: ins.d7[k].name, valor: d7Index(ins, caps, k) }))} />
    </Figura>
  );
}
export function ComponentesIA({ ins, caps, sg }: { ins: MadInstrument; caps: Captures; sg: SafeguardState }) {
  const a = aiqOf(ins, caps, sg);
  return (
    <Figura titulo="Preparación para inteligencia artificial, por componente" nota={<>Índice de 0 a 100. Preparación (gobierno, datos y talento): <b className="num text-ink-soft">{a.preparacion === null ? "—" : f0(a.preparacion)}</b> · adopción e impacto: <b className="num text-ink-soft">{a.adopcion === null ? "—" : f0(a.adopcion)}</b>.{a.capApplied ? ` La línea punteada es el techo de ${a.cap} que impone una salvaguarda en falla.` : ""}</>}>
      <BarrasIndice techo={a.capApplied ? a.cap : null} items={a.components.map((c) => ({ label: c.name, valor: c.score, detalle: `${c.prep ? "preparación" : "adopción e impacto"} · peso ${Math.round(c.weight * 100)} %` }))} />
    </Figura>
  );
}

/* ═══ 6 · Madurez de cada línea frente a la exigencia del sector ═══ */
const EXIG: Record<Exigencia, { y: number; label: string }> = { alta: { y: 0, label: "Alta" }, media: { y: 1, label: "Media" }, baja: { y: 2, label: "Baja" } };
export function MatrizSector({ ins, caps, lineas }: { ins: MadInstrument; caps: Captures; lineas: NonNullable<MadInformeIA["sector"]>["lineas"] }) {
  const pts = lineas.map((x) => { const l = lineaDe(ins, x.linea); return l ? { l, x, nivel: lineLevel(ins, caps, l.n) } : null; }).filter((p): p is { l: MadLine; x: (typeof lineas)[number]; nivel: number } => !!p && p.nivel !== null);
  if (!pts.length) return null;
  const W = 420, H = 250, m = { l: 62, r: 14, t: 10, b: 36 }, w = W - m.l - m.r, h = H - m.t - m.b, band = h / 3;
  const sx = (n: number) => m.l + ((n - 1) / 4) * w;
  // las líneas de una misma banda se reparten en vertical, ordenadas por nivel, para que sus rótulos no se encimen
  const fila = new Map<number, number>();
  for (const k of ["alta", "media", "baja"] as Exigencia[]) { const xs = pts.filter((p) => p.x.exigencia === k).sort((a, b) => a.nivel - b.nivel); xs.forEach((p, i) => fila.set(p.l.n, (i - (xs.length - 1) / 2) * Math.min(17, (band - 14) / Math.max(1, xs.length - 1 || 1)))); }
  return (
    <Figura titulo="Nivel de cada línea frente a lo que exige el sector" nota="El nivel (eje horizontal) es el de la medición. La exigencia del sector (eje vertical) es la lectura del modelo a partir de los hechos citados; no existe un dato de madurez digital de otras empresas del sector.">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Nivel de madurez de cada línea frente a la exigencia del sector">
        <rect x={m.l} y={m.t} width={sx(3) - m.l} height={band} fill="color-mix(in srgb, var(--bad) 13%, var(--surface))" />
        <rect x={m.l} y={m.t + band} width={sx(2) - m.l} height={band} fill="color-mix(in srgb, var(--warn) 13%, var(--surface))" />
        <text x={m.l + 6} y={m.t + 13} fontSize="10" fontWeight="700" fill="var(--bad-text)">Rezago frente al sector</text>
        {(["alta", "media", "baja"] as Exigencia[]).map((k) => <g key={k}><line x1={m.l} x2={m.l + w} y1={m.t + EXIG[k].y * band} y2={m.t + EXIG[k].y * band} stroke="var(--line)" />
          <text x={m.l - 8} y={m.t + EXIG[k].y * band + band / 2 + 3} textAnchor="end" fontSize="10.5" fill="var(--muted)">{EXIG[k].label}</text></g>)}
        <line x1={m.l} x2={m.l + w} y1={m.t + h} y2={m.t + h} stroke="var(--line-strong)" />
        {[1, 2, 3, 4, 5].map((n) => <g key={n}><line x1={sx(n)} x2={sx(n)} y1={m.t} y2={m.t + h} stroke="var(--line)" /><text x={sx(n)} y={m.t + h + 14} textAnchor="middle" fontSize="10" fill="var(--faint)">{n}</text></g>)}
        <text x={m.l + w / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="var(--muted)">Nivel de madurez de la línea →</text>
        <text x={12} y={m.t + h / 2} textAnchor="middle" fontSize="10.5" fill="var(--muted)" transform={`rotate(-90 12 ${m.t + h / 2})`}>Exigencia del sector</text>
        {pts.map(({ l, x, nivel }) => { const cy = m.t + EXIG[x.exigencia].y * band + band / 2 + (fila.get(l.n) ?? 0) + (x.exigencia === "alta" ? 5 : 0); return (
          <g key={l.n}><circle cx={sx(nivel)} cy={cy} r="7" fill={l.color} stroke="var(--surface)" strokeWidth="2"><title>{`${l.name}: nivel ${f1(nivel)} · exigencia ${x.exigencia}`}</title></circle>
            <text x={sx(nivel) + (nivel > 4 ? -12 : 12)} y={cy + 3.5} textAnchor={nivel > 4 ? "end" : "start"} fontSize="10.5" fontWeight="700" fill="var(--ink)">{l.code} · {f1(nivel)}</text></g>
        ); })}
      </svg>
      <Leyenda items={pts.map(({ l }) => ({ color: l.color, label: `${l.code} ${l.short}` }))} />
    </Figura>
  );
}

/* ═══ 7 · Madurez que sostiene cada prioridad estratégica ═══ */
export function BarrasEstrategia({ caps, estrategia }: { caps: Captures; estrategia: NonNullable<MadInformeIA["estrategia"]> }) {
  const x = (v: number) => `${((v - 1) / 4) * 100}%`;
  const filas = estrategia.map((e) => ({ e, ...nivelDe(caps, e.variables) }));
  if (!filas.some((f) => f.nivel !== null)) return null;
  return (
    <Figura titulo="Nivel digital que sostiene cada prioridad estratégica" nota="Promedio del nivel (1 a 5) de las variables de las que depende cada prioridad; la raya es su meta promedio. Las variables de cada prioridad las asocia el modelo; los niveles son los de la medición.">
      <div className="space-y-3">
        {filas.map(({ e, nivel, meta }) => (
          <div key={e.prioridad} title={`${e.prioridad}: nivel ${nivel === null ? "sin dato" : f1(nivel)}${meta !== null ? ` · meta ${f1(meta)}` : ""} · ${e.variables.length} variables · dependencia ${e.dependencia}`}>
            <div className="flex items-baseline justify-between gap-3 text-[12.5px]"><span className="min-w-0 truncate font-semibold text-ink">{e.prioridad}</span><span className="num flex-none text-ink-soft">{nivel === null ? "—" : <b className="text-ink">{f1(nivel)}</b>}{meta !== null && <span className="text-muted"> → {f1(meta)}</span>}</span></div>
            <div className="relative mt-1.5 h-3 rounded-full bg-surface-2">
              {nivel !== null && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: x(nivel), background: nColor(nivel) }} />}
              {meta !== null && <i className="absolute -top-1 h-5 w-0 -translate-x-1/2 border-l-2" style={{ left: x(meta), borderColor: "var(--ink)" }} />}
            </div>
          </div>
        ))}
        <div className="flex justify-between text-[11px] text-faint">{[1, 2, 3, 4, 5].map((n) => <span key={n} className="num">{n}</span>)}</div>
      </div>
      <Leyenda items={[{ color: "var(--ink)", label: "Meta", forma: "raya" }]} />
    </Figura>
  );
}

/* ═══ 8 · El sector en cifras: cuartiles y actividad ═══ */
export function SectorCifras({ s }: { s: SectorCruce }) {
  return (
    <Figura titulo={`El sector en cifras · ${s.n.toLocaleString("es-CO")} sociedades`} nota={`${s.fuente}, cierre ${s.corte}. La franja va del cuartil 1 al cuartil 3 y la raya es la mediana${s.ratios.some((r) => r.empresa !== null) ? "; el punto es la empresa" : ""}. Las veinte mayores concentran ${pct(s.top20)} de los ingresos.`}>
      <div className="space-y-4">
        {s.ratios.map((r) => { const vals = [r.p25, r.p50, r.p75, r.empresa].filter(num), lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.15 || 1, x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`; return (
          <div key={r.key} title={`${r.name}: cuartil 1 ${r.p25 === null ? "—" : pct(r.p25)}, mediana ${r.p50 === null ? "—" : pct(r.p50)}, cuartil 3 ${r.p75 === null ? "—" : pct(r.p75)}${r.empresa !== null ? ` · empresa ${pct(r.empresa)} (percentil ${r.percentil})` : ""}`}>
            <div className="flex items-baseline justify-between gap-3 text-[12.5px]"><span className="font-semibold text-ink">{r.name}</span><span className="num text-ink-soft">mediana <b className="text-ink">{r.p50 === null ? "—" : pct(r.p50)}</b>{r.empresa !== null && <span className="text-muted"> · empresa {pct(r.empresa)}</span>}</span></div>
            <div className="relative mt-1.5 h-3 rounded-full bg-surface-2">
              {num(r.p25) && num(r.p75) && <div className="absolute inset-y-0 rounded-full" style={{ left: x(r.p25), width: `calc(${x(r.p75)} - ${x(r.p25)})`, background: "color-mix(in srgb, var(--navy) 30%, var(--surface))" }} />}
              {num(r.p50) && <i className="absolute -top-1 h-5 w-0 -translate-x-1/2 border-l-2" style={{ left: x(r.p50), borderColor: "var(--navy)" }} />}
              {num(r.empresa) && <i className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-[var(--gold)]" style={{ left: x(r.empresa) }} />}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-faint"><span className="num">{r.p25 === null ? "" : `Q1 ${pct(r.p25)}`}</span><span className="num">{r.p75 === null ? "" : `Q3 ${pct(r.p75)}`}</span></div>
          </div>
        ); })}
        {s.actividades.length > 1 && (
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[11px] text-muted"><th className="pb-1 font-semibold">Actividad</th><th className="pb-1 pl-2 text-right font-semibold">Sociedades</th><th className="pb-1 pl-2 text-right font-semibold">Crecimiento</th><th className="pb-1 pl-2 text-right font-semibold">Margen op.</th></tr></thead>
            <tbody>{s.actividades.map((a) => (
              <tr key={a.code} className="border-t border-line" title={a.name}><td className="py-1.5 pr-2 text-ink-soft"><span className="num font-semibold text-ink">{a.code}</span>{a.propia && <span className="block text-[10.5px] font-semibold text-[var(--gold-text)]">la de la empresa</span>}</td>
                <td className="num py-1.5 pl-2 text-right text-ink-soft">{a.n}</td><td className="num whitespace-nowrap py-1.5 pl-2 text-right font-semibold text-ink">{a.growthP50 === null ? "—" : pct(a.growthP50)}</td><td className="num whitespace-nowrap py-1.5 pl-2 text-right font-semibold text-ink">{a.opMarginP50 === null ? "—" : pct(a.opMarginP50)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </Figura>
  );
}

/* ═══ 9 · El mercado: canales y posición ═══ */
const C_RETAIL = "#0e93b4", C_INST = "#7c5cd6";
export function MercadoCanales({ m }: { m: NonNullable<SectorCruce["mercado"]> }) {
  const max = Math.max(...m.canales.flatMap((c) => [c.retail, c.institucional]));
  return (
    <Figura titulo="Hacia dónde crece el mercado: retail frente a institucional" nota={`Crecimiento anual proyectado en valores (${m.fuente}; lectura de ${m.fecha}). Crecimiento anual compuesto ${m.cagr.periodo}: retail ${pct(m.cagr.retail)}, institucional ${pct(m.cagr.institucional)}.`}>
      <div className="flex items-end gap-3" style={{ height: 150 }}>
        {m.canales.map((c) => (
          <div key={c.anio} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: 120 }}>
              {([["Retail", c.retail, C_RETAIL], ["Institucional", c.institucional, C_INST]] as const).map(([n, v, col]) => (
                <div key={n} title={`${c.anio} · ${n}: ${pct(v)}`} className="flex w-[42%] max-w-[26px] flex-col items-center justify-end" style={{ height: "100%" }}>
                  <span className="num mb-0.5 text-[10px] font-semibold text-ink-soft">{v.toLocaleString("es-CO", { maximumFractionDigits: 1 })}</span>
                  <div className="w-full rounded-t-[4px]" style={{ height: `${(v / max) * 78}%`, background: col }} />
                </div>
              ))}
            </div>
            <span className="num text-[11px] text-muted">{c.anio}</span>
          </div>
        ))}
      </div>
      <Leyenda items={[{ color: C_RETAIL, label: "Retail (% anual)" }, { color: C_INST, label: "Institucional (% anual)" }]} />
    </Figura>
  );
}
export function MercadoPosicion({ m }: { m: NonNullable<SectorCruce["mercado"]> }) {
  const max = Math.max(...m.crecimiento.flatMap((g) => [Math.abs(g.mercado), Math.abs(g.empresa)]));
  return (
    <Figura titulo="Crecimiento de la empresa frente a su mercado" nota={`Puesto ${m.posicion.rank} entre corporaciones, con ${pct(m.posicion.ms)} de participación (${m.posicion.msDelta >= 0 ? "+" : ""}${m.posicion.msDelta.toLocaleString("es-CO")} puntos) · ${m.posicion.corte}.`}>
      <div className="space-y-4">
        {m.crecimiento.map((g) => (
          <div key={g.grupo}>
            <div className="text-[12.5px] font-semibold text-ink">{g.grupo} <span className="font-normal text-muted">· {g.corte}</span></div>
            <div className="mt-1.5 space-y-1.5">
              {([["Mercado", g.mercado, "color-mix(in srgb, var(--navy) 35%, var(--surface))"], [g.nombre, g.empresa, "var(--gold)"]] as const).map(([n, v, col]) => (
                <div key={n} className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-2 text-[12px]" title={`${g.grupo} · ${n}: ${v >= 0 ? "+" : ""}${pct(v)}`}>
                  <span className="text-ink-soft">{n}</span>
                  <div className="h-3 rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (Math.abs(v) / max) * 100)}%`, background: col }} /></div>
                  <span className="num w-[58px] text-right font-bold text-ink">{v >= 0 ? "+" : ""}{pct(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Figura>
  );
}

/* ═══ 10 · Prioridades: impacto frente a esfuerzo ═══ */
const G: Grado[] = ["bajo", "medio", "alto"];
export function MatrizPrioridades({ prioridades }: { prioridades: MadInformeIA["prioridades"] }) {
  const con = prioridades.map((p, i) => ({ p, n: i + 1 })).filter((x) => x.p.esfuerzo && x.p.impacto);
  if (!con.length) return null;
  return (
    <Figura titulo="Prioridades: impacto frente a esfuerzo" nota="Cada número es una prioridad de la lista. Arriba a la izquierda, lo que más rinde con menos esfuerzo: por ahí se empieza. La clasificación es del modelo.">
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-[3px] text-[11.5px]">
        <span />{G.map((e) => <span key={e} className="pb-1 text-center text-muted">Esfuerzo {e}</span>)}
        {[...G].reverse().map((imp) => (
          <div key={imp} className="contents">
            <span className="flex items-center pr-2 text-muted">Impacto {imp}</span>
            {G.map((esf) => { const xs = con.filter((x) => x.p.impacto === imp && x.p.esfuerzo === esf), primero = imp === "alto" && esf !== "alto"; return (
              <div key={esf} className="flex min-h-[52px] flex-wrap content-center items-center justify-center gap-1.5 rounded-md p-1.5" style={{ background: primero ? "var(--gold-wash)" : "var(--surface-2)" }}>
                {xs.map((x) => <span key={x.n} title={`${x.n}. ${x.p.variable} · impacto ${x.p.impacto}, esfuerzo ${x.p.esfuerzo}${x.p.plazo ? ` · ${x.p.plazo}` : ""}`} className="num grid h-6 w-6 place-items-center rounded-full bg-navy text-[11.5px] font-bold text-white">{x.n}</span>)}
              </div>
            ); })}
          </div>
        ))}
      </div>
    </Figura>
  );
}

/* ═══ 11 · La industria en cifras digitales ═══ */
export type LineaRef = { n: number; name: string; short: string; color: string };
export function AdopcionIndustria({ lineas, datos }: { lineas: LineaRef[]; datos: SectorCruce["industria"]["datos"] }) {
  const pctDatos = datos.filter((d) => d.unidad === "%");
  if (!pctDatos.length) return null;
  const grupos = lineas.map((l) => ({ l, xs: pctDatos.filter((d) => d.linea === l.n) })).filter((g) => g.xs.length);
  return (
    <Figura titulo="Cómo está la industria en lo digital: cifras de adopción" nota="Porcentajes publicados por las fuentes citadas (el número lleva a la fuente). Cada cifra indica su universo y su año: no son comparables entre sí ni son un promedio de madurez del sector.">
      <div className="space-y-4">
        {grupos.map(({ l, xs }) => (
          <div key={l.n}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink"><i className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />{l.name}</div>
            <div className="space-y-2">
              {xs.map((d) => (
                <div key={d.n} title={`${d.indicador}: ${pct(d.valor)} · ${d.alcance}, ${d.anio}`}>
                  <div className="flex items-baseline justify-between gap-3 text-[12px]"><span className="text-ink-soft">{d.indicador} <a href={`#fuente-${d.n}`} className="cita">{d.n}</a></span><span className="num flex-none font-bold text-ink">{pct(d.valor)}</span></div>
                  <div className="mt-1 h-2.5 rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, d.valor)}%`, background: l.color }} /></div>
                  <div className="mt-0.5 text-[11px] text-faint">{d.alcance} · {d.anio}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Figura>
  );
}

/* ═══ 12 · Qué están haciendo otras empresas de la industria ═══ */
export function ParesIndustria({ lineas, pares }: { lineas: LineaRef[]; pares: SectorCruce["industria"]["pares"] }) {
  if (!pares.length) return null;
  return (
    <Figura titulo="Qué están haciendo otras empresas de la industria" nota="Iniciativas públicas y fechadas, tomadas de las fuentes citadas. Muestran hacia dónde se mueven los competidores; no miden su nivel de madurez.">
      <ul className="divide-y divide-line">
        {pares.map((p) => { const l = lineas.find((x) => x.n === p.linea); return (
          <li key={p.n} className="grid gap-x-3 gap-y-0.5 py-2.5 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div><div className="text-[12.5px] font-bold text-ink">{p.empresa}</div><div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted"><span className="num">{p.anio}</span>{l && <><i className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.short}</>}</div></div>
            <p className="text-[12.5px] leading-snug text-ink-soft">{p.que} <a href={`#fuente-${p.n}`} className="cita">{p.n}</a></p>
          </li>
        ); })}
      </ul>
    </Figura>
  );
}
