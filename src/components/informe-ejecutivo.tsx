"use client";

// Informe ejecutivo de la autoevaluación directiva (individual o consolidado del comité): portada, resumen,
// capacidades con radar, dimensiones con barras interactivas y lecturas de la IA, fortalezas y brechas,
// patrones y prioridades, preguntas y nota metodológica. Todo en lenguaje de hipótesis: es la evaluación
// que el directivo hace de la compañía, no un diagnóstico de la persona. Pensado también para imprimirse
// como PDF (portada, saltos de página, pie en cada hoja) desde el diálogo del navegador.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MiniRadar } from "@/components/charts";
import { avisar } from "@/components/feedback";
import { CAPS, LEVELS, THRESHOLD, levelOf, levelName } from "@/data/mapa";
import type { InformeIA, InformeKind } from "@/lib/informe-ia";
import type { DimEjec, DatosEjec } from "@/lib/informe-datos";
import { Printer, Link2, RefreshCw, Loader2, Sparkles, AlertTriangle, ArrowLeft, Lightbulb, Target, ListChecks, HelpCircle, BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";

export const fmtN = (x: number | null | undefined, d = 2) => (x == null ? "—" : x.toFixed(d).replace(".", ","));

export type { DimEjec, CapEjec, DatosEjec } from "@/lib/informe-datos";

/* ═══ Carga y generación automática ═══ */

export type InformeApi = { disponible: boolean; informe: InformeIA | null; at: string | null; by: string | null; model: string | null; desactualizado: boolean; shareUrl?: string | null; sujeto?: string };

/** Lee el análisis guardado y, si procede (auto y lectura completa), lo genera una sola vez. */
export function useInformeIA(kind: InformeKind, email: string | null | undefined, auto: boolean) {
  const [data, setData] = useState<InformeApi | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);
  const q = `kind=${kind}${email ? `&email=${encodeURIComponent(email)}` : ""}`;
  useEffect(() => {
    let vivo = true;
    fetch(`/api/td/diagnostico/informe?${q}`).then(async (r) => { const j = await r.json().catch(() => ({})); if (!vivo) return; if (r.ok) setData(j); else setError(j.error ?? `Error ${r.status}`); }).catch(() => { if (vivo) setError("No se pudo conectar con el servidor."); });
    return () => { vivo = false; };
  }, [q]);
  const generar = async (silencioso = false) => {
    if (busy) return false;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/td/diagnostico/informe?${q}`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); setBusy(false); return false; }
      setData(j); if (!silencioso) avisar("Análisis actualizado"); setBusy(false); return true;
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); return false; }
  };
  // generación automática y única: cuando el modelo está disponible y aún no hay análisis guardado
  useEffect(() => { if (auto && data && data.disponible && !data.informe && !pedido.current) { pedido.current = true; void generar(true); } });
  return { data, busy, error, generar };
}

/* ═══ Gráficas ═══ */

function BarrasDimensiones({ dims, sel, onSel, consolidado }: { dims: DimEjec[]; sel: string | null; onSel: (c: string) => void; consolidado?: boolean }) {
  const rowH = 24, gapGrupo = 26, x0 = 178, ancho = 380, pad = 8;
  const grupos = CAPS.map((c) => ({ c, ds: dims.filter((d) => d.capCode === c.code) }));
  const alto = grupos.reduce((a, g) => a + gapGrupo + g.ds.length * rowH, 0) + pad * 2 + 16;
  const xDe = (v: number) => x0 + (v / 5) * ancho;
  // posiciones calculadas de antemano (sin mutar variables dentro del render)
  const layout: { c: (typeof CAPS)[number]; yG: number; filas: { d: DimEjec; yy: number }[] }[] = [];
  for (let y = pad + 12, gi = 0; gi < grupos.length; gi++) {
    const { c, ds } = grupos[gi]; const yG = y; y += gapGrupo;
    const filas = ds.map((d, k) => ({ d, yy: y + k * rowH })); y += ds.length * rowH;
    layout.push({ c, yG, filas });
  }
  return (
    <svg viewBox={`0 0 ${x0 + ancho + 60} ${alto}`} className="h-auto w-full" role="img" aria-label="Puntaje por dimensión">
      {[1, 2, 3, 4, 5].map((v) => <g key={v}><line x1={xDe(v)} y1={pad + 8} x2={xDe(v)} y2={alto - 8} stroke={v === THRESHOLD ? "var(--gold)" : "var(--line)"} strokeWidth={v === THRESHOLD ? 1.4 : 0.8} strokeDasharray={v === THRESHOLD ? "4 3" : undefined} /><text x={xDe(v)} y={pad + 4} textAnchor="middle" fontSize="8.5" fill={v === THRESHOLD ? "var(--gold-text)" : "var(--faint)"} fontWeight={v === THRESHOLD ? 800 : 600}>{v === THRESHOLD ? "3,0 · umbral" : v}</text></g>)}
      {layout.map(({ c, yG, filas }) => {
        return (
          <g key={c.code}>
            <rect x={0} y={yG + 4} width={4} height={gapGrupo - 10 + filas.length * rowH} rx={2} fill={c.color} />
            <text x={12} y={yG + 17} fontSize="10" fontWeight={800} fill="var(--ink)">{c.code} · {c.name}</text>
            {filas.map(({ d, yy }) => {
              const on = sel === d.code; const col = d.m == null ? "var(--line)" : LEVELS[levelOf(d.m) - 1].color;
              return (
                <g key={d.code} onClick={() => onSel(d.code)} style={{ cursor: "pointer" }}>
                  <rect x={0} y={yy} width={x0 + ancho + 60} height={rowH} fill={on ? "color-mix(in srgb, var(--gold) 12%, transparent)" : "transparent"} rx={6} />
                  <text x={12} y={yy + 15.5} fontSize="9.5" fontWeight={on ? 800 : 600} fill="var(--ink-soft)"><tspan fontWeight={800} fill="var(--ink)">{d.code}</tspan> · {d.name.length > 26 ? d.name.slice(0, 25) + "…" : d.name}</text>
                  <rect x={x0} y={yy + 6} width={ancho} height={12} rx={6} fill="var(--surface-2)" />
                  {d.m != null && <rect x={x0} y={yy + 6} width={Math.max(4, (d.m / 5) * ancho)} height={12} rx={6} fill={col} />}
                  {consolidado && d.sd != null && d.m != null && <line x1={xDe(Math.max(0, d.m - d.sd))} y1={yy + 12} x2={xDe(Math.min(5, d.m + d.sd))} y2={yy + 12} stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={1.5} />}
                  <text x={x0 + ancho + 8} y={yy + 16} fontSize="10" fontWeight={800} fill={d.m != null && d.m < THRESHOLD ? "var(--bad-text)" : "var(--ink)"} className="num">{fmtN(d.m)}</text>
                  {d.n < d.tot && !consolidado && <text x={x0 + ancho + 36} y={yy + 16} fontSize="8" fill="var(--faint)">{d.n}/{d.tot}</text>}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

const Nivel = ({ m }: { m: number | null }) => m == null ? <span className="chip">sin dato</span> : <span className="chip" style={{ background: `color-mix(in srgb, ${LEVELS[levelOf(m) - 1].color} 18%, var(--surface))`, color: "var(--ink)" }}>{levelName(m)}</span>;

/* ═══ Informe ═══ */

export function InformeEjecutivo({ kind, empresa, persona, fecha, datos, informe, estado, meta, shareUrl, canRegen, onRegen, busy, volverHref, error }: {
  kind: InformeKind; empresa: string; persona?: { nombre: string; cargo?: string }; fecha: string; datos: DatosEjec; informe: InformeIA | null;
  estado: "listo" | "generando" | "pendiente" | "no-disponible" | "desactualizado"; meta?: string; shareUrl?: string | null; canRegen?: boolean; onRegen?: () => void; busy?: boolean; volverHref?: string; error?: string | null;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const general = (() => { const xs = datos.caps.filter((c) => c.m != null).map((c) => c.m as number); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; })();
  const bajo = datos.dims.filter((d) => d.m != null && (d.m as number) < THRESHOLD);
  const conDato = datos.caps.filter((c) => c.m != null);
  const fuerte = conDato.length ? conDato.reduce((a, b) => ((b.m as number) > (a.m as number) ? b : a)) : null;
  const debil = conDato.length ? conDato.reduce((a, b) => ((b.m as number) < (a.m as number) ? b : a)) : null;
  const lecturaDim = (code: string) => informe?.dimensiones?.find((x) => x.dimension.startsWith(code))?.lectura;
  const lecturaCap = (name: string) => informe?.capacidades.find((c) => c.capacidad.toLowerCase().startsWith(name.toLowerCase().slice(0, 5)));
  const selDim = sel ? datos.dims.find((d) => d.code === sel) : null;
  const compartir = async () => { if (!shareUrl) return; if (navigator.share) { try { await navigator.share({ title: "Informe consolidado del diagnóstico", url: shareUrl }); return; } catch { /* cancelado */ } } await navigator.clipboard.writeText(shareUrl); avisar("Enlace copiado: quien lo tenga ve el informe consolidado, sin nombres"); };
  const sujeto = kind === "f1" ? `Evaluación de ${persona?.nombre ?? "un directivo"}${persona?.cargo ? ` · ${persona.cargo}` : ""}` : `Lectura consolidada del comité · ${datos.personas ?? 0} ${datos.personas === 1 ? "directivo" : "directivos"}`;
  const secciones = [["resumen", "Resumen"], ["capacidades", "Capacidades"], ["dimensiones", "Dimensiones"], ["hallazgos", "Hallazgos"], ["ruta", "Ruta"], ["metodo", "Método"]] as const;
  const toggle = (code: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  return (
    <EstadoCtx.Provider value={estado}>
    <article className="informe mx-auto max-w-[1040px]">
      {/* barra de acciones (solo pantalla) */}
      <div className="no-print sticky top-[54px] z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line/70 bg-surface/90 px-3 py-2 backdrop-blur-xl">
        {volverHref && <Link href={volverHref} className="btn-ghost btn-sm"><ArrowLeft size={13} /> Volver</Link>}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Secciones del informe">{secciones.map(([id, l]) => <a key={id} href={`#${id}`} className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-muted hover:bg-surface-2 hover:text-ink">{l}</a>)}</nav>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {estado === "desactualizado" && <span className="chip chip-warn"><AlertTriangle size={11} /> Hay respuestas nuevas</span>}
          {canRegen && onRegen && (estado === "desactualizado" || estado === "pendiente") && <button type="button" onClick={onRegen} disabled={busy} className="btn-ghost btn-sm">{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {informe ? "Actualizar análisis" : "Generar análisis"}</button>}
          {shareUrl && <button type="button" onClick={compartir} className="btn-ghost btn-sm"><Link2 size={13} /> Compartir</button>}
          <button type="button" onClick={() => window.print()} className="btn-primary btn-sm" title="Se abre el diálogo de impresión: elige «Guardar como PDF»"><Printer size={13} /> Descargar PDF</button>
        </span>
      </div>

      {/* portada */}
      <header className="informe-portada relative mb-6 overflow-hidden rounded-3xl px-7 py-8 text-white sm:px-10 sm:py-10" style={{ background: "var(--grad-deep)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(520px 260px at 100% 0%, rgb(241 186 91 / 0.16), transparent 60%)" }} />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-fill">Informe ejecutivo · {kind === "f1" ? "Autoevaluación directiva · Fuente 1" : "Consolidado del comité · Fuente 1"}</div>
          <div className="mt-1 text-[13px] font-semibold text-white/70">{empresa}</div>
          <h1 className="mt-4 max-w-[22ch] text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[36px]">{informe?.titulo ?? `Capacidades organizacionales de ${empresa}`}</h1>
          <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-white/80">{informe?.hipotesis_central ?? (kind === "f1" ? "Cómo ve el directivo las capacidades de la compañía frente al método 4Shine Empresas." : "Cómo ve el comité directivo las capacidades de la compañía frente al método 4Shine Empresas.")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/75">
            <span>{sujeto}</span><span>·</span><span>{fecha}</span><span>·</span><span>{datos.answered} de {datos.total} afirmaciones{datos.personas && datos.personas > 1 ? " por persona" : ""}</span>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            {[
              { k: "Promedio general", v: fmtN(general), s: general != null ? levelName(general) : "sin dato" },
              { k: "Bajo el umbral", v: String(bajo.length), s: bajo.length === 1 ? "dimensión por debajo de 3,0" : "dimensiones por debajo de 3,0" },
              { k: "Capacidad más sólida", v: fuerte ? fmtN(fuerte.m) : "—", s: fuerte?.name ?? "sin dato" },
              { k: "Capacidad a cuidar", v: debil ? fmtN(debil.m) : "—", s: debil?.name ?? "sin dato" },
            ].map((x) => <div key={x.k} className="rounded-2xl bg-white/[0.07] px-4 py-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09)]"><div className="text-[11px] font-bold uppercase tracking-wider text-white/55">{x.k}</div><div className="num mt-1 text-[26px] font-extrabold leading-none">{x.v}</div><div className="mt-1 text-[12px] text-white/70">{x.s}</div></div>)}
          </div>
          <div className="mt-6 inline-flex items-start gap-2 rounded-xl bg-white/[0.07] px-4 py-2.5 text-[12.5px] leading-snug text-white/80"><Lightbulb size={14} className="mt-0.5 shrink-0 text-gold" /><span><b className="text-white">Léelo como hipótesis.</b> Es la evaluación que {kind === "f1" ? "el directivo hace de la compañía" : "la dirección hace de la compañía"}, no un diagnóstico de personas. Se contrasta con {kind === "f1" ? "las lecturas de los pares, " : ""}la percepción de los equipos y la evidencia documental.</span></div>
        </div>
      </header>

      {/* estado del análisis */}
      {estado !== "listo" && estado !== "desactualizado" && (
        <div className="informe-aviso mb-6 flex items-start gap-3 rounded-2xl border border-line px-5 py-4 text-[13px]">
          {estado === "generando" ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-cyan-deep" /> : estado === "pendiente" ? <Sparkles size={16} className="mt-0.5 shrink-0 text-gold" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-bad" />}
          <div className="text-ink-soft">
            {estado === "generando" && <><b className="text-ink">El advisor virtual está escribiendo la lectura.</b> Tarda menos de un minuto; las cifras ya están abajo y el texto aparece solo cuando termine.</>}
            {estado === "pendiente" && <><b className="text-ink">La lectura con IA se genera al completar las 68 afirmaciones.</b> Faltan {datos.total - datos.answered}. Mientras tanto, el informe muestra las cifras.</>}
            {estado === "no-disponible" && <><b className="text-ink">El análisis con IA no está configurado.</b> Se activa con la integración de OpenAI en Administración → Integraciones. El informe muestra las cifras.</>}
            {error && <div className="mt-1 text-bad-text">{error}</div>}
          </div>
        </div>
      )}

      {/* resumen */}
      <section id="informe-resumen" className="informe-seccion mb-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel px-6 py-5 sm:px-7">
          <Kicker icon={<BookOpen size={12} />}>Resumen ejecutivo</Kicker>
          {informe ? informe.resumen.map((p, i) => <p key={i} className="mt-3 text-[14px] leading-relaxed text-ink-soft first:mt-2">{p}</p>) : <Esqueleto filas={5} />}
        </div>
        <div className="panel px-6 py-5">
          <Kicker>Perfil de las cuatro capacidades</Kicker>
          <MiniRadar color="var(--navy)" size={230} axes={datos.caps.map((c) => ({ label: c.code, value: Math.max(0, c.m ?? 0), target: THRESHOLD }))} />
          <p className="text-[11.5px] leading-snug text-faint">La línea punteada marca 3,0: por debajo, la práctica no está instalada. Un promedio alto no borra una dimensión débil.</p>
        </div>
      </section>

      {/* capacidades */}
      <section id="capacidades" className="informe-seccion mb-6">
        <Kicker icon={<Target size={12} />}>Las cuatro capacidades</Kicker>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {datos.caps.map((c) => { const L = lecturaCap(c.name); return (
            <div key={c.code} className="panel overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: c.color }}>
                <div className="min-w-0 flex-1"><div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">{c.code} · {c.verb}</div><div className="text-[16px] font-extrabold">{c.name}</div></div>
                <div className="num text-[28px] font-extrabold leading-none">{fmtN(c.m)}</div>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted"><Nivel m={c.m} /><span>{kind === "consolidado" ? `${datos.dims.filter((d) => d.capCode === c.code && d.m != null).length} de ${datos.dims.filter((d) => d.capCode === c.code).length} dimensiones con dato` : `${c.n} de ${c.tot} afirmaciones`}</span></div>
                <div className="relative mt-2 h-[8px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.m ?? 0) / 5) * 100}%`, background: c.m != null && c.m < THRESHOLD ? "var(--bad)" : c.color }} /><i className="absolute top-0 h-full w-px bg-ink/40" style={{ left: `${(THRESHOLD / 5) * 100}%` }} /></div>
                <div className="mt-3 text-[13px] leading-relaxed text-ink-soft">{L?.lectura ?? (informe ? c.q : <Esqueleto filas={3} />)}</div>
              </div>
            </div>
          ); })}
        </div>
      </section>

      {/* dimensiones */}
      <section id="dimensiones" className="informe-seccion mb-6 panel px-5 py-5 sm:px-7">
        <Kicker icon={<ListChecks size={12} />}>Las diecisiete dimensiones</Kicker>
        <p className="mt-1 text-[12.5px] text-muted">Promedio de las cuatro prácticas de cada dimensión, coloreado por nivel. {kind === "consolidado" ? "La línea oscura muestra la dispersión entre directivos (± una desviación)." : ""} <span className="no-print">Toca una barra para ver su lectura.</span></p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <BarrasDimensiones dims={datos.dims} sel={sel} onSel={(c) => setSel((s) => (s === c ? null : c))} consolidado={kind === "consolidado"} />
          <div className="no-print">
            {selDim ? (
              <div className="rounded-2xl border border-line px-5 py-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint">{selDim.capName}</div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3"><b className="text-[15px] text-ink">{selDim.code} · {selDim.name}</b><span className="num text-[20px] font-extrabold" style={{ color: selDim.m != null ? LEVELS[levelOf(selDim.m) - 1].color : "var(--faint)" }}>{fmtN(selDim.m)}</span></div>
                <p className="mt-1 text-[12px] leading-snug text-muted">{selDim.defn}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{lecturaDim(selDim.code) ?? (informe ? "Sin lectura específica para esta dimensión." : "La lectura aparece cuando termine el análisis.")}</p>
                {selDim.prac && (
                  <ul className="mt-3 space-y-1.5">{selDim.prac.map((p) => <li key={p.code} className="flex items-start gap-2 text-[12px]"><span className={`num mt-0.5 w-6 shrink-0 rounded-md text-center font-extrabold ${p.v == null ? "bg-surface-2 text-faint" : p.v < THRESHOLD ? "bg-bad/15 text-bad-text" : "bg-ok/15 text-ok-text"}`}>{p.v ?? "—"}</span><span className="text-ink-soft">{p.text}</span></li>)}</ul>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-line px-5 py-4 text-center text-[12.5px] text-faint">Selecciona una dimensión en la gráfica para ver su definición, su lectura y, en la evaluación individual, las cuatro prácticas calificadas.</div>
            )}
          </div>
        </div>
        {/* lecturas por dimensión: en pantalla plegables, en PDF todas */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {datos.dims.filter((d) => d.m != null).map((d) => { const l = lecturaDim(d.code); const open = abiertas.has(d.code); return (
            <div key={d.code} className="informe-dim rounded-xl border border-line px-4 py-2.5">
              <button type="button" onClick={() => toggle(d.code)} className="flex w-full items-center gap-2 text-left" aria-expanded={open}>
                <span className="num w-10 shrink-0 text-[14px] font-extrabold" style={{ color: LEVELS[levelOf(d.m as number) - 1].color }}>{fmtN(d.m)}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">{d.code} · {d.name}</span>
                <Nivel m={d.m} /><ChevronDown size={14} className={`no-print shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              <p className={`informe-dim-texto mt-1.5 text-[12.5px] leading-relaxed text-ink-soft ${open ? "" : "hidden"}`}>{l ?? (informe ? "Sin lectura específica." : "Pendiente del análisis.")}</p>
            </div>
          ); })}
        </div>
      </section>

      {/* hallazgos */}
      <section id="hallazgos" className="informe-seccion mb-6 grid gap-5 lg:grid-cols-2">
        <div className="panel px-6 py-5">
          <Kicker tono="ok">Fortalezas que sostienen</Kicker>
          {!informe ? <Esqueleto filas={4} /> : informe.fortalezas.length === 0 ? <p className="mt-2 text-[13px] italic text-faint">La lectura no destaca fortalezas por encima del umbral.</p> : <ul className="mt-2 space-y-2">{informe.fortalezas.map((f) => <li key={f.dimension} className="rounded-xl bg-surface-2/70 px-4 py-3 text-[13px]"><b className="text-ink">{f.dimension}.</b> <span className="text-ink-soft">{f.por_que}</span></li>)}</ul>}
        </div>
        <div className="panel px-6 py-5">
          <Kicker tono="bad">Brechas y qué las demostraría</Kicker>
          {!informe ? <Esqueleto filas={4} /> : informe.brechas.length === 0 ? <p className="mt-2 text-[13px] italic text-faint">Ninguna dimensión con dato quedó bajo el umbral.</p> : <ul className="mt-2 space-y-2">{informe.brechas.map((b) => (
            <li key={b.dimension} className="rounded-xl border border-line px-4 py-3 text-[13px]">
              <div className="flex items-baseline justify-between gap-3"><b className="text-ink">{b.dimension}</b>{b.puntaje != null && <span className="num font-extrabold text-bad-text">{fmtN(b.puntaje)}</span>}</div>
              <p className="mt-1 text-ink-soft">{b.que_revela}</p>
              {b.evidencia_a_verificar && <p className="mt-1.5 text-[12.5px] text-muted"><b className="text-ink">Evidencia a verificar.</b> {b.evidencia_a_verificar}</p>}
              {b.framework && <p className="mt-1 text-[12.5px] text-muted"><b className="text-ink">Framework.</b> {b.framework}</p>}
            </li>
          ))}</ul>}
        </div>
      </section>

      {/* ruta */}
      <section id="ruta" className="informe-seccion mb-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="panel px-6 py-5">
          <Kicker>Patrones y causa raíz</Kicker>
          {informe ? <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{informe.patrones}</p> : <Esqueleto filas={5} />}
          {informe?.dispersion && informe.dispersion.length > 0 && (
            <div className="mt-4">
              <Kicker tono="warn">Donde el comité no coincide</Kicker>
              <ul className="mt-2 space-y-2">{informe.dispersion.map((d) => <li key={d.dimension} className="rounded-xl bg-gold-wash px-4 py-3 text-[13px]"><b className="text-ink">{d.dimension}.</b> <span className="text-ink-soft">{d.lectura}</span></li>)}</ul>
            </div>
          )}
          {informe?.nivel_acompanamiento && (
            <div className="mt-4 rounded-2xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel de acompañamiento sugerido</div>
              <div className="text-[18px] font-extrabold">{informe.nivel_acompanamiento.nivel}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-white/85">{informe.nivel_acompanamiento.por_que}</p>
            </div>
          )}
        </div>
        <div className="panel px-6 py-5">
          <Kicker>Por dónde empezar · próximos 90 días</Kicker>
          {informe ? (
            <ol className="relative mt-3 space-y-3 border-l-2 border-line pl-6">
              {informe.prioridades.map((p, i) => (
                <li key={`${p.orden}-${p.dimension}`} className="relative">
                  <span className="num absolute -left-[33px] top-0 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: "var(--navy)" }}>{p.orden || i + 1}</span>
                  <div className="text-[13.5px] font-extrabold text-ink">{p.dimension}</div>
                  {p.framework && <div className="text-[12px] text-muted">Framework · {p.framework}</div>}
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{p.primer_paso}</p>
                </li>
              ))}
            </ol>
          ) : <Esqueleto filas={6} />}
        </div>
      </section>

      {/* método */}
      <section id="metodo" className="informe-seccion mb-6 grid gap-5 lg:grid-cols-2">
        <div className="panel px-6 py-5">
          <Kicker icon={<HelpCircle size={12} />}>Preguntas para la devolución</Kicker>
          {informe ? <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] text-ink-soft">{informe.preguntas.map((q, i) => <li key={i}>{q}</li>)}</ul> : <Esqueleto filas={4} />}
        </div>
        <div className="panel px-6 py-5">
          <Kicker>Cómo leer este informe</Kicker>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">Fuente 1 del diagnóstico de capacidades del método 4Shine Empresas: {kind === "f1" ? "la evaluación que un directivo hace de la compañía" : "el promedio de las evaluaciones que los directivos hacen de la compañía"} en 68 prácticas observables, cuatro por dimensión, en una escala de 1 (incipiente) a 5 (multiplicadora). El umbral de práctica instalada es 3,0. Son hipótesis: se contrastan con {kind === "f1" ? "las lecturas de los pares, " : ""}la percepción de los equipos (Fuente 2) y la evidencia documental (Fuente 3); una práctica declarada y no demostrada queda como máximo en 2,9.</p>
          {informe?.nota_metodologica && <p className="mt-3 rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] italic leading-relaxed text-muted">{informe.nota_metodologica}</p>}
          {meta && <p className="mt-3 text-[11.5px] text-faint">{meta}</p>}
        </div>
      </section>

      <footer className="informe-pie text-[11px] uppercase tracking-[0.16em] text-faint">Gestión estratégica · {empresa} · {kind === "f1" ? "Informe individual y confidencial" : "Informe consolidado del comité"} · {fecha}</footer>
    </article>
    </EstadoCtx.Provider>
  );
}

function Kicker({ children, icon, tono }: { children: ReactNode; icon?: ReactNode; tono?: "ok" | "bad" | "warn" }) {
  const color = tono === "ok" ? "var(--ok-text)" : tono === "bad" ? "var(--bad-text)" : tono === "warn" ? "var(--warn-text)" : "var(--gold-text)";
  return <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{icon}{children}</div>;
}
function Esqueleto({ filas }: { filas: number }) {
  const estado = useContext(EstadoCtx);
  if (estado !== "generando") return <p className="mt-2 text-[12.5px] italic text-faint">{estado === "pendiente" ? "La lectura con IA aparece al completar las 68 afirmaciones." : estado === "no-disponible" ? "Sin análisis con IA configurado." : "Pendiente del análisis."}</p>;
  return <div className="mt-3 space-y-2" aria-hidden>{Array.from({ length: filas }).map((_, i) => <div key={i} className="h-3 animate-pulse rounded bg-surface-2" style={{ width: `${92 - (i % 3) * 14}%` }} />)}</div>;
}
const EstadoCtx = createContext<"listo" | "generando" | "pendiente" | "no-disponible" | "desactualizado">("listo");
