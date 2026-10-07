"use client";

// Gráficos SVG propios v2 — trazo degradado de marca, animación de dibujo,
// glow sutil. Sin dependencias externas.

import { useId } from "react";
import { LINES, DIMENSIONS } from "@/data/demo";
import { CO_PATHS, CO_VIEW, CESAR_MARK, CESAR_PATH, CESAR_VIEW, projectCesar } from "@/data/geo";
import { EC_PATHS, EC_VIEW } from "@/data/geo-ec";

/** Geometría territorial por país: departamentos de Colombia o provincias del Ecuador. */
export const TERRITORY_GEO: Record<"CO" | "EC", { view: { w: number; h: number }; paths: { name: string; d: string }[]; unitName: string }> = {
  CO: { view: CO_VIEW, paths: CO_PATHS, unitName: "departamento" },
  EC: { view: EC_VIEW, paths: EC_PATHS, unitName: "provincia" },
};

/** Mapa de puntajes línea → dimensión. Los gráficos lo reciben por props (la
    vista de la empresa activa, scoresOf(v)); sin él, pintan «sin dato». */
export type ScoresMap = Record<number, Record<string, { value: number; target: number }>>;

/** Sin puntajes: ninguna celda. Los gráficos lo leen como «sin dato» (—). */
const NO_SCORES: ScoresMap = { 1: {}, 2: {}, 3: {}, 4: {} };

const fmtLevel = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

/* ─── Gauge de la empresa (semicírculo) ─────────────────────────────────── */

export function ScoreGauge({ value, max = 5, size = 210 }:
  { value: number; max?: number; size?: number }) {
  const gid = useId();
  const W = size, H = size * 0.62;
  const cx = W / 2, cy = H - 8, r = W / 2 - 16;
  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from), a1 = Math.PI * (1 - to);
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const frac = Math.max(0, Math.min(1, value / max));
  const len = Math.PI * r;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label={`Madurez de la empresa: ${value.toFixed(1)} de ${max}`}>
      <defs>
        <linearGradient id={`${gid}-g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--cyan-fill)" />
          <stop offset="55%" stopColor="var(--cyan)" />
          <stop offset="100%" stopColor="var(--navy)" />
        </linearGradient>
      </defs>
      <path d={arc(0, 1)} fill="none" stroke="var(--surface-3)" strokeWidth="13" strokeLinecap="round" />
      <path d={arc(0, frac)} fill="none" stroke={`url(#${gid}-g)`} strokeWidth="13"
        strokeLinecap="round" className="draw" style={{ ["--dash" as string]: len }} />
      {/* marcas 1..5 */}
      {[1, 2, 3, 4, 5].map((n) => {
        const a = Math.PI * (1 - n / max);
        const x = cx + (r + 11) * Math.cos(a), y = cy - (r + 11) * Math.sin(a);
        return (
          <text key={n} x={x} y={y + 3} textAnchor="middle"
            className="num" fontSize="9" fill="var(--faint)">{n}</text>
        );
      })}
      <text x={cx} y={cy - 16} textAnchor="middle" className="num"
        fontSize={W * 0.2} fontWeight={800} fill="var(--ink)" letterSpacing="-2">
        {value.toFixed(1).replace(".", ",")}
      </text>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="10" fontWeight={600}
        fill="var(--faint)" letterSpacing="1.5" style={{ textTransform: "uppercase" }}>
        DE {max} · 16 PUNTOS
      </text>
    </svg>
  );
}

/* ─── Radar de madurez (4 ejes) ─────────────────────────────────────────── */

export function MaturityRadar({ size = 380, scores = NO_SCORES }: { size?: number; scores?: ScoresMap }) {
  const gid = useId();
  const cx = size / 2, cy = size / 2 + 8;
  const rMax = size * 0.31;
  const pt = (axis: number, v: number): [number, number] => {
    const r = (v / 5) * rMax;
    const ang = (Math.PI / 2) * axis - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const poly = (vals: number[]) =>
    vals.map((v, i) => pt(i, Number.isNaN(v) ? 0 : v).map((n) => n.toFixed(1)).join(",")).join(" ");

  const avgOf = (n: number, key: "value" | "target") => {
    const dims = Object.values(scores[n] ?? {}).filter((d) => d.value >= 0);   // −1 = sin dato
    return dims.length ? dims.reduce((a, d) => a + d[key], 0) / dims.length : NaN;   // NaN = sin dato
  };
  const actual = LINES.map((l) => avgOf(l.n, "value"));
  const target = LINES.map((l) => avgOf(l.n, "target"));
  const perimeter = 4 * Math.SQRT2 * rMax; // aproximación suficiente para el dash

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" role="img"
      aria-label="Radar de madurez de las cuatro capacidades">
      <defs>
        <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cyan-fill)" />
          <stop offset="60%" stopColor="var(--cyan)" />
          <stop offset="100%" stopColor="var(--navy)" />
        </linearGradient>
        <radialGradient id={`${gid}-fill`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.05" />
        </radialGradient>
        <filter id={`${gid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {[1, 2, 3, 4, 5].map((lvl) => (
        <polygon key={lvl} points={poly([lvl, lvl, lvl, lvl])} fill="none"
          stroke={lvl === 5 ? "var(--line-strong)" : "var(--line)"} strokeWidth={0.9} />
      ))}
      <line x1={cx} y1={cy - rMax} x2={cx} y2={cy + rMax} stroke="var(--line)" />
      <line x1={cx - rMax} y1={cy} x2={cx + rMax} y2={cy} stroke="var(--line)" />
      {/* números de anillo sobre el eje superior */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <text key={lvl} x={cx + 5} y={cy - (lvl / 5) * rMax + 3}
          className="num" fontSize="7.5" fill="var(--faint)">{lvl}</text>
      ))}

      <polygon points={poly(target)} fill="rgba(168,122,20,.05)" stroke="var(--gold)"
        strokeWidth="1.4" strokeDasharray="5 4" />

      <polygon points={poly(actual)} fill={`url(#${gid}-fill)`} />
      <polygon points={poly(actual)} fill="none" stroke={`url(#${gid}-stroke)`}
        strokeWidth="2.4" strokeLinejoin="round" filter={`url(#${gid}-glow)`}
        className="draw" style={{ ["--dash" as string]: perimeter }} />
      {actual.map((v, i) => {
        if (Number.isNaN(v)) return null;
        const [x, y] = pt(i, v);
        return (
          <circle key={i} cx={x} cy={y} r="4.5" fill="var(--cyan)"
            stroke="var(--surface)" strokeWidth="2.5" className="pop" />
        );
      })}

      {LINES.map((l, i) => {
        const vertical = i === 0 || i === 2;
        const y = i === 0 ? cy - rMax - 28 : i === 2 ? cy + rMax + 24 : cy - 13;
        const x = vertical ? cx : i === 1 ? size - 4 : 4;
        const anchor = vertical ? "middle" : i === 1 ? "end" : "start";
        return (
          <g key={l.n} fontSize="11.5" fontWeight={600} fill="var(--ink-soft)">
            <text x={x} y={y} textAnchor={anchor}>{l.code} {l.short}</text>
            <text x={x} y={y + 16} textAnchor={anchor} className="num"
              fontSize="12.5" fontWeight={800} fill="var(--cyan-deep)">
              {Number.isNaN(actual[i]) ? "—" : actual[i].toFixed(1).replace(".", ",")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Radar compacto reutilizable (N ejes) ──────────────────────────────── */

/** Radar pequeño para una línea (ejes = dimensiones) o una dimensión
    (ejes = líneas). Trazo en el color propio, meta punteada en dorado. */
export function MiniRadar({ axes, color = "var(--cyan)", size = 200, max = 5 }: {
  axes: { label: string; value: number; target?: number }[];
  color?: string; size?: number; max?: number;
}) {
  const n = axes.length;
  const cx = size / 2, cy = size / 2 + 3;
  const rMax = size * 0.28;
  const pt = (i: number, v: number): [number, number] => {
    const ang = ((2 * Math.PI) / n) * i - Math.PI / 2;
    const r = (v / max) * rMax;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const poly = (vals: number[]) =>
    vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
  const hasTarget = axes.some((a) => a.target !== undefined);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" role="img"
      aria-label={`Radar: ${axes.map((a) => `${a.label} ${a.value}`).join(", ")}`}>
      {[1, 2, 3, 4, 5].map((lvl) => (
        <polygon key={lvl} points={poly(axes.map(() => lvl))} fill="none"
          stroke={lvl === max ? "var(--line-strong)" : "var(--line)"} strokeWidth={0.8} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, max);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={0.8} />;
      })}

      {hasTarget && (
        <polygon points={poly(axes.map((a) => a.target ?? a.value))}
          fill="rgba(168,122,20,.05)" stroke="var(--gold)"
          strokeWidth="1.2" strokeDasharray="4 3.5" />
      )}

      <polygon points={poly(axes.map((a) => a.value))}
        fill={`color-mix(in srgb, ${color} 15%, transparent)`}
        stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.value);
        return (
          <circle key={i} cx={x} cy={y} r="3.6" fill={color}
            stroke="var(--surface)" strokeWidth="2" />
        );
      })}

      {/* etiquetas: nombre del eje + valor */}
      {axes.map((a, i) => {
        const ang = ((2 * Math.PI) / n) * i - Math.PI / 2;
        const cos = Math.cos(ang), sin = Math.sin(ang);
        const lx = cx + (rMax + 12) * cos;
        const ly = cy + (rMax + 12) * sin;
        const anchor = Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "start" : "end";
        const dy = sin < -0.3 ? -12 : sin > 0.3 ? 10 : -3;
        return (
          <g key={a.label} textAnchor={anchor}>
            <text x={lx} y={ly + dy} fontSize="9.5" fontWeight={650} fill="var(--ink-soft)">
              {a.label}
            </text>
            <text x={lx} y={ly + dy + 12} className="num" fontSize="10.5" fontWeight={800} fill={color}>
              {a.value.toFixed(1).replace(".", ",")}
              {a.target !== undefined && (
                <tspan fontSize="8" fontWeight={600} fill="var(--faint)"> →{a.target}</tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Mapa de calor línea × dimensión (grid) ────────────────────────────── */

const LEVEL_BG = ["", "var(--n1)", "var(--n2)", "var(--n3)", "var(--n4)", "var(--n5)"];

export function MaturityHeatmap({ onCell, selected, scores = NO_SCORES }: {
  onCell?: (line: number, dim: string) => void;
  selected?: { line: number; dim: string } | null;
  scores?: ScoresMap;
}) {
  const sc = scores;
  return (
    <div className="space-y-2.5">
      {LINES.map((l) => {
        const dims = DIMENSIONS.filter((d) => d.line === l.n);
        return (
          <div key={l.n} className="grid items-center gap-x-2 gap-y-1"
            style={{ gridTemplateColumns: "minmax(110px, 150px) repeat(5, minmax(0, 1fr))" }}>
            <div className="pr-2 text-[12.5px] font-bold text-ink whitespace-nowrap">
              {l.code} <span className="font-semibold text-ink-soft">{l.short}</span>
            </div>
            {dims.map((d) => {
              const s = sc[l.n]?.[d.key] ?? { value: -1, target: 3 };   // sin celda = sin dato
              const lvl = Math.max(1, Math.min(5, Math.round(s.value)));
              const isSel = selected?.line === l.n && selected?.dim === d.key;
              if (s.value < 0) {
                return (
                  <button key={d.key} onClick={() => onCell?.(l.n, d.key)} title={`${d.key} · ${d.name}: sin dato en este corte`}
                    className="num w-full rounded-xl border border-dashed border-line-strong bg-surface px-1 py-2 text-left text-faint">
                    <span className="block px-1.5 text-[8.5px] font-bold uppercase tracking-wider">{d.key}</span>
                    <span className="block px-1.5 text-[15px] font-extrabold leading-tight">—</span>
                  </button>
                );
              }
              return (
                <button key={d.key} onClick={() => onCell?.(l.n, d.key)}
                  className={`num relative w-full cursor-pointer rounded-xl px-1 py-2 text-left text-white transition-all duration-150 hover:scale-[1.04] hover:shadow-lg ${
                    isSel ? "scale-[1.04] shadow-lg ring-2 ring-navy ring-offset-2" : ""}`}
                  style={{
                    background: `linear-gradient(160deg, color-mix(in srgb, ${LEVEL_BG[lvl]} 88%, white) 0%, ${LEVEL_BG[lvl]} 100%)`,
                    boxShadow: isSel ? undefined : `inset 0 1px 0 rgb(255 255 255 / 0.22), 0 1px 3px color-mix(in srgb, ${LEVEL_BG[lvl]} 35%, transparent)`,
                  }}
                  title={`${d.key} · ${d.name}: madurez ${fmtLevel(s.value)} → meta ${s.target}`}>
                  <span className="block px-1.5 text-[8.5px] font-bold uppercase tracking-wider opacity-80">{d.key}</span>
                  <span className="block px-1.5 text-[15px] font-extrabold leading-tight">{fmtLevel(s.value)}</span>
                  <span className="absolute bottom-[4px] right-[7px] text-[8px] font-semibold opacity-70">→{s.target}</span>
                </button>
              );
            })}
            {dims.length < 5 && <div />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Sparkline ─────────────────────────────────────────────────────────── */

export function Sparkline({ values, good = true, w = 150, h = 38 }:
  { values: number[]; good?: boolean; w?: number; h?: number }) {
  const gid = useId();
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const px = (i: number) => (i / (values.length - 1)) * (w - 8) + 4;
  const py = (v: number) => h - 6 - ((v - min) / span) * (h - 12);
  const d = values.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const color = good ? "var(--n4)" : "var(--bad)";
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-hidden>
      <defs>
        <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${px(values.length - 1)},${h - 2} L4,${h - 2} Z`} fill={`url(#${gid}-a)`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={px(values.length - 1)} cy={py(last)} r="3.4" fill={color}
        stroke="var(--surface)" strokeWidth="1.6" />
    </svg>
  );
}

/* ─── Benchmark de pares ────────────────────────────────────────────────── */

export function PeerBars({ peers, nationalAvg, refLabel = "media nacional" }:
  { peers: { name: string; value: number; self?: boolean }[]; nationalAvg: number; refLabel?: string }) {
  const max = Math.max(...peers.map((p) => p.value), nationalAvg, 1) * 1.15;
  const w = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="space-y-3">
      {peers.map((p) => (
        <div key={p.name} className="flex items-center gap-3">
          <span className={`w-36 shrink-0 truncate text-[12px] ${p.self ? "font-extrabold text-cyan-deep" : "font-medium text-muted"}`} title={p.name}>
            {p.name}
          </span>
          <div className="relative h-[20px] flex-1 overflow-hidden rounded-lg bg-surface-2">
            <div className="h-full rounded-lg transition-all duration-700"
              style={{
                width: w(p.value),
                background: p.self ? "var(--grad-brand)" : "var(--line-strong)",
              }} />
            <div className="absolute top-0 h-full border-l-[1.5px] border-dashed"
              style={{ left: w(nationalAvg), borderColor: "var(--gold)" }} />
          </div>
          <span className={`num w-11 shrink-0 text-right text-[12px] ${p.self ? "font-extrabold text-cyan-deep" : "font-semibold text-muted"}`}>
            {p.value.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 text-[11px] font-medium" style={{ color: "var(--gold)" }}>
        <span className="inline-block h-0 w-5 border-t-[1.5px] border-dashed" style={{ borderColor: "var(--gold)" }} />
        {refLabel} {nationalAvg.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %
      </div>
    </div>
  );
}

/* ─── Matriz de priorización 4Shine: capacidad (L) × impacto (D) ───────────
   Las dos reglas de la matriz definen los cuadrantes: D ≥ 3 para competir como
   prioridad crítica y L ≥ 3 para implementar ahora. */

export function PriorityMatrix({ items, onSelect, selected }: {
  items: { id: string; name: string; D: number; L: number; score: number; horizon: string; color?: string }[];
  onSelect?: (id: string) => void;
  selected?: string | null;
}) {
  const W = 460, H = 300, pad = 34;
  const px = (l: number) => pad + ((l - 1) / 3) * (W - pad - 12);
  const py = (d: number) => H - pad - ((d - 1) / 3) * (H - pad - 16);
  const mx = px(2.5), my = py(2.5);   // umbral: nivel 3 redondeado
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label="Matriz de priorización 4Shine: capacidad de ejecución contra impacto en el resultado">
      <rect x={mx} y={16} width={W - 12 - mx} height={my - 16} rx={10} fill="#eaf4ee" opacity=".9" />
      <rect x={pad} y={16} width={mx - pad} height={my - 16} rx={10} fill="var(--cyan-wash)" opacity=".8" />
      <rect x={mx} y={my} width={W - 12 - mx} height={H - pad - my} rx={10} fill="var(--gold-wash)" opacity=".7" />
      <rect x={pad} y={my} width={mx - pad} height={H - pad - my} rx={10} fill="var(--surface-2)" opacity=".5" />
      <g fontSize="8.5" fontWeight={650} letterSpacing="1.2" fill="var(--faint)">
        <text x={pad + 10} y={32}>PREPARAR LA CAPACIDAD</text>
        <text x={mx + 10} y={32}>IMPLEMENTAR AHORA</text>
        <text x={pad + 10} y={my + 16}>RENUNCIAR O REPLANTEAR</text>
        <text x={mx + 10} y={my + 16}>BACKLOG</text>
      </g>
      <g fontSize="8" fill="var(--faint)">
        {[1, 2, 3, 4].map((v) => <text key={`x${v}`} x={px(v)} y={H - pad + 11} textAnchor="middle">{v}</text>)}
        {[1, 2, 3, 4].map((v) => <text key={`y${v}`} x={pad - 6} y={py(v) + 3} textAnchor="end">{v}</text>)}
      </g>

      {items.map((it) => {
        const isSel = selected === it.id;
        const r = 6 + ((it.score - 25) / 75) * 8;   // radio ∝ puntaje (25–100)
        return (
          <g key={it.id} onClick={() => onSelect?.(it.id)}
            style={{ cursor: onSelect ? "pointer" : "default" }}>
            {isSel && (
              <circle cx={px(it.L)} cy={py(it.D)} r={r + 6} fill="none"
                stroke="var(--navy)" strokeWidth="1.5" opacity=".5" />
            )}
            <circle cx={px(it.L)} cy={py(it.D)} r={r}
              fill={it.color ?? (it.horizon === "CORTO" ? "var(--cyan)" : "var(--gold-fill)")}
              opacity=".92" stroke="var(--surface)" strokeWidth="2"
              className="transition-transform hover:scale-110"
              style={{ transformOrigin: "center", transformBox: "fill-box" }}>
              <title>{`${it.name} · D ${it.D} · L ${it.L} · ${it.score} pts`}</title>
            </circle>
            <text x={px(it.L)} y={py(it.D) + 3} textAnchor="middle" fontSize="8" fontWeight="800" fill="white" style={{ pointerEvents: "none" }}>{it.id.toUpperCase()}</text>
          </g>
        );
      })}

      <text x={(W + pad) / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="var(--faint)">L · Capacidad de ejecución →</text>
      <text x={10} y={(H - pad + 16) / 2} textAnchor="middle" fontSize="10.5" fill="var(--faint)"
        transform={`rotate(-90 10 ${(H - pad + 16) / 2})`}>D · Impacto en el resultado →</text>
    </svg>
  );
}

/* ─── Gantt por trimestres ──────────────────────────────────────────────── */

const DEFAULT_QUARTERS = ["2026-T3", "2026-T4", "2027-T1", "2027-T2", "2027-T3", "2027-T4", "2028-T1", "2028-T2", "2028-T3", "2028-T4"];
const MAX_QUARTERS = 32;
const qIndex = (s: string) => { const m = /^(\d{4})-T([1-4])$/.exec(s); return m ? Number(m[1]) * 4 + Number(m[2]) - 1 : null; };
const qLabel = (i: number) => `${Math.floor(i / 4)}-T${(i % 4) + 1}`;

/** Eje de trimestres: del primer inicio al último fin de las iniciativas (acotado). */
export function quartersFor(items: { start: string; end: string }[]): string[] {
  const idx = items.flatMap((i) => [qIndex(i.start), qIndex(i.end)]).filter((x): x is number => x !== null);
  if (!idx.length) return DEFAULT_QUARTERS;
  const lo = Math.min(...idx), hi = Math.min(Math.max(...idx), lo + MAX_QUARTERS - 1);
  return Array.from({ length: hi - lo + 1 }, (_, k) => qLabel(lo + k));
}

export function GanttChart({ items, onSelect, selected }: {
  items: { id: string; name: string; start: string; end: string; horizon: string; progress: number; color?: string }[];
  onSelect?: (id: string) => void;
  selected?: string | null;
}) {
  const QUARTERS = quartersFor(items);
  const q = (s: string) => { const i = QUARTERS.indexOf(s); return i >= 0 ? i : (qIndex(s) ?? 0) < (qIndex(QUARTERS[0]) ?? 0) ? 0 : QUARTERS.length - 1; };
  const rowH = 36, left = 210, colW = 44;
  const W = left + QUARTERS.length * colW, H = items.length * rowH + 30;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 640 }} className="w-full h-auto"
        role="img" aria-label="Cronograma de iniciativas">
        {QUARTERS.map((qt, i) => (
          <g key={qt}>
            <line x1={left + i * colW} y1={20} x2={left + i * colW} y2={H - 8}
              stroke={i % 2 === 0 ? "var(--line)" : "var(--surface-3)"} strokeDasharray={i % 2 ? "2 4" : undefined} />
            <text x={left + i * colW + colW / 2} y={12} textAnchor="middle"
              className="num" fontSize="8.5" fontWeight={600} fill="var(--faint)">
              {qt.replace("20", "'")}
            </text>
          </g>
        ))}
        {items.map((it, r) => {
          const x0 = left + q(it.start) * colW;
          const x1 = left + (q(it.end) + 1) * colW;
          const y = 26 + r * rowH;
          const color = it.color ?? (it.horizon === "CORTO" ? "var(--cyan)" : "var(--gold-fill)");
          const isSel = selected === it.id;
          return (
            <g key={it.id} onClick={() => onSelect?.(it.id)}
              style={{ cursor: onSelect ? "pointer" : "default" }} opacity={selected && !isSel ? 0.45 : 1}>
              <text x={0} y={y + 12} fontSize="11" fontWeight={isSel ? 700 : 500}
                fill={isSel ? "var(--ink)" : "var(--ink-soft)"}>
                {it.name.length > 30 ? it.name.slice(0, 29) + "…" : it.name}
              </text>
              <rect x={x0} y={y} width={x1 - x0} height={16} rx={8} fill={color} opacity=".25" />
              <rect x={x0} y={y} width={Math.max(16, (x1 - x0) * (it.progress / 100))} height={16} rx={8} fill={color}>
                <title>{`${it.name}: ${it.progress} %`}</title>
              </rect>
              {it.progress > 0 && (
                <text x={x0 + 8} y={y + 12} fontSize="8.5" fontWeight={700} fill="#fff" className="num">
                  {it.progress}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Barra de presupuesto ──────────────────────────────────────────────── */

export function BudgetBar({ planned, committed, executed }:
  { planned: number; committed: number; executed: number }) {
  const pctE = planned ? (executed / planned) * 100 : 0;
  const pctC = planned ? (committed / planned) * 100 : 0;
  return (
    <div className="flex h-[12px] w-full overflow-hidden rounded-full bg-surface-2 shadow-[inset_0_1px_2px_rgb(15_21_32/0.06)]">
      <div className="rounded-l-full" style={{ width: `${Math.min(pctE, 100)}%`, background: "linear-gradient(90deg, var(--n5), var(--n4))" }} />
      <div style={{ width: `${Math.min(pctC, 100 - pctE)}%`, background: "var(--cyan-fill)" }} />
    </div>
  );
}

/* ─── Mapas ─────────────────────────────────────────────────────────────── */

export function ColombiaMap() {
  return (
    <svg viewBox={`0 0 ${CO_VIEW.w} ${CO_VIEW.h}`} className="w-full h-auto" role="img"
      aria-label="Mapa de Colombia con el departamento del Cesar destacado">
      {CO_PATHS.map((p, i) => (
        <path key={i} d={p.d}
          fill={p.cesar ? "var(--cyan)" : "var(--surface-3)"}
          stroke={p.cesar ? "var(--cyan-deep)" : "var(--line-strong)"}
          strokeWidth={p.cesar ? 1.2 : 0.5} />
      ))}
      <line x1={CESAR_MARK.x + 8} y1={CESAR_MARK.y} x2={CO_VIEW.w - 92} y2={CESAR_MARK.y - 40}
        stroke="var(--cyan-deep)" strokeWidth="1" />
      <circle cx={CESAR_MARK.x} cy={CESAR_MARK.y} r="3" fill="var(--cyan-deep)" />
      <text x={CO_VIEW.w - 88} y={CESAR_MARK.y - 42} fontSize="12.5" fontWeight="800" fill="var(--cyan-deep)">Cesar</text>
      <text x={CO_VIEW.w - 88} y={CESAR_MARK.y - 28} fontSize="9.5" fill="var(--muted)">25 municipios</text>
    </svg>
  );
}


/** Mapa del Cesar con tres lentes: cobertura (peso/cobertura del municipio) o
    un mapa de valores (producción, convenios) con radio ∝ √valor. */
/** Colombia con intensidad por departamento (coautorías / convenios). */
export function ColombiaImpactMap({ values, selected, onSelect, home = [], unit = "", country = "CO" }: {
  values: Record<string, number>;
  selected?: string | null;
  onSelect?: (dept: string | null) => void;
  /** departamentos o provincias con sede de la empresa: se marcan con borde propio */
  home?: string[];
  unit?: string;
  /** país de la empresa: decide la geometría (Colombia por departamentos, Ecuador por provincias) */
  country?: "CO" | "EC";
}) {
  const geo = TERRITORY_GEO[country] ?? TERRITORY_GEO.CO;
  const maxV = Math.max(1, ...Object.values(values));
  const fillOf = (name: string) => {
    const v = values[name] ?? 0;
    if (v <= 0) return "var(--surface-3)";
    const t = Math.sqrt(v / maxV);
    return `color-mix(in srgb, var(--cyan-deep) ${Math.round(18 + t * 78)}%, white)`;
  };
  return (
    <svg viewBox={`0 0 ${geo.view.w} ${geo.view.h}`} className="w-full h-auto" role="img"
      aria-label={`Mapa con la intensidad del sector por ${geo.unitName}`}>
      {geo.paths.map((p) => {
        const v = values[p.name] ?? 0;
        const isSel = selected === p.name;
        const isHome = home.includes(p.name);
        return (
          <path key={p.name} d={p.d}
            fill={fillOf(p.name)}
            stroke={isSel ? "var(--gold)" : isHome ? "var(--navy)" : "var(--line-strong)"}
            strokeWidth={isSel ? 1.8 : isHome ? 1.3 : 0.5}
            style={{ cursor: v > 0 && onSelect ? "pointer" : "default", transition: "fill .2s" }}
            onClick={() => v > 0 && onSelect?.(isSel ? null : p.name)}>
            <title>{`${p.name}${v > 0 ? `: ${v}${unit}` : ""}`}</title>
          </path>
        );
      })}
    </svg>
  );
}

/* ─── Cuadrante de pertinencia ──────────────────────────────────────────── */

export function PertinenceQuadrant({ points, labels, axes }: {
  points: { name: string; x: number; y: number; self?: boolean }[];
  /** nombres de los cuatro cuadrantes: arriba-izquierda, arriba-derecha, abajo-izquierda, abajo-derecha */
  labels?: [string, string, string, string];
  axes?: [string, string];
}) {
  const L = labels ?? ["Crece sin capacidad", "Crece con capacidad", "Estancado", "Capacidad sin crecimiento"];
  const AX = axes ?? ["Capacidad organizacional →", "Crecimiento →"];
  const W = 420, H = 250, pad = 30;
  const px = (x: number) => pad + x * (W - pad - 14);
  const py = (y: number) => H - pad - y * (H - pad - 18);
  const mx = pad + (W - pad - 14) / 2, my = 18 + (H - pad - 18) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label={`Posición sectorial: ${AX[0]} contra ${AX[1]}`}>
      <rect x={pad} y={18} width={mx - pad} height={my - 18} rx={10} fill="#fbeaea" opacity=".75" />
      <rect x={mx} y={18} width={W - 14 - mx} height={my - 18} rx={10} fill="#eaf4ee" opacity=".85" />
      <rect x={pad} y={my} width={mx - pad} height={H - pad - my} rx={10} fill="var(--surface-2)" opacity=".55" />
      <rect x={mx} y={my} width={W - 14 - mx} height={H - pad - my} rx={10} fill="var(--gold-wash)" opacity=".75" />
      <g fontSize="9.5" fontWeight={550} fill="var(--muted)">
        <text x={pad + 9} y={33}>{L[0]}</text>
        <text x={mx + 9} y={33}>{L[1]}</text>
        <text x={pad + 9} y={my + 15}>{L[2]}</text>
        <text x={mx + 9} y={my + 15}>{L[3]}</text>
      </g>
      {points.map((p) => (
        <g key={p.name}>
          {p.self && (
            <circle cx={px(p.x)} cy={py(p.y)} r={13} fill="none"
              stroke="var(--cyan)" strokeWidth="1.4" className="pulse-ring" />
          )}
          <circle cx={px(p.x)} cy={py(p.y)} r={p.self ? 9 : 5}
            fill={p.self ? "var(--cyan)" : "var(--faint)"}
            stroke={p.self ? "var(--surface)" : "none"} strokeWidth="2">
            <title>{p.name}</title>
          </circle>
          {p.self && (
            <text x={px(p.x) + 15} y={py(p.y) + 4} fontSize="11.5" fontWeight="800" fill="var(--cyan-deep)">
              {p.name}
            </text>
          )}
        </g>
      ))}
      <text x={(W + pad) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--faint)">{AX[0]}</text>
      <text x={10} y={(H - pad + 18) / 2} textAnchor="middle" fontSize="10" fill="var(--faint)"
        transform={`rotate(-90 10 ${(H - pad + 18) / 2})`}>{AX[1]}</text>
    </svg>
  );
}
