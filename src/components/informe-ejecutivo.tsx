"use client";

// Informe ejecutivo de la autoevaluación directiva (individual o consolidado del comité).
// En pantalla: seis pestañas con contenido propio (Resumen, Capacidades, Dimensiones, Hallazgos, Ruta y
// Método), una guía de navegación que explica dónde tocar para profundizar y botones anterior/siguiente.
// En PDF: una versión editorial por hojas A4 (portada, secciones numeradas, cabecera y pie en cada hoja)
// que se imprime en lugar de la pantalla. Todo en lenguaje de hipótesis: es la evaluación que el directivo
// hace de la compañía, no un diagnóstico de la persona.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { MiniRadar } from "@/components/charts";
import { avisar } from "@/components/feedback";
import { CAPS, LEVELS, THRESHOLD, levelOf, levelName } from "@/data/mapa";
import type { InformeIA, InformeKind } from "@/lib/informe-ia";
import type { DimEjec, DatosEjec } from "@/lib/informe-datos";
import { Printer, Link2, RefreshCw, Loader2, Sparkles, AlertTriangle, ArrowLeft, ArrowRight, Lightbulb, Target, ListChecks, HelpCircle, BookOpen, ChevronDown, Compass, MousePointerClick, Route, X, Layers, Flame } from "lucide-react";

export type { DimEjec, CapEjec, DatosEjec } from "@/lib/informe-datos";

export const fmtN = (x: number | null | undefined, d = 2) => (x == null ? "—" : x.toFixed(d).replace(".", ","));
type Estado = "listo" | "generando" | "pendiente" | "no-disponible" | "desactualizado";

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

function BarrasDimensiones({ dims, sel, onSel, consolidado, compacto }: { dims: DimEjec[]; sel: string | null; onSel?: (c: string) => void; consolidado?: boolean; compacto?: boolean }) {
  const rowH = compacto ? 20 : 24, gapGrupo = compacto ? 22 : 26, x0 = 178, ancho = 380, pad = 8;
  const grupos = CAPS.map((c) => ({ c, ds: dims.filter((d) => d.capCode === c.code) }));
  const alto = grupos.reduce((a, g) => a + gapGrupo + g.ds.length * rowH, 0) + pad * 2 + 16;
  const xDe = (v: number) => x0 + (v / 5) * ancho;
  const layout: { c: (typeof CAPS)[number]; yG: number; filas: { d: DimEjec; yy: number }[] }[] = [];
  for (let y = pad + 12, gi = 0; gi < grupos.length; gi++) {
    const { c, ds } = grupos[gi]; const yG = y; y += gapGrupo;
    const filas = ds.map((d, k) => ({ d, yy: y + k * rowH })); y += ds.length * rowH;
    layout.push({ c, yG, filas });
  }
  return (
    <svg viewBox={`0 0 ${x0 + ancho + 60} ${alto}`} className="h-auto w-full" role="img" aria-label="Puntaje por dimensión">
      {[1, 2, 3, 4, 5].map((v) => <g key={v}><line x1={xDe(v)} y1={pad + 8} x2={xDe(v)} y2={alto - 8} stroke={v === THRESHOLD ? "var(--gold)" : "var(--line)"} strokeWidth={v === THRESHOLD ? 1.4 : 0.8} strokeDasharray={v === THRESHOLD ? "4 3" : undefined} /><text x={xDe(v)} y={pad + 4} textAnchor="middle" fontSize="8.5" fill={v === THRESHOLD ? "var(--gold-text)" : "var(--faint)"} fontWeight={v === THRESHOLD ? 800 : 600}>{v === THRESHOLD ? "3,0 · umbral" : v}</text></g>)}
      {layout.map(({ c, yG, filas }) => (
        <g key={c.code}>
          <rect x={0} y={yG + 4} width={4} height={gapGrupo - 10 + filas.length * rowH} rx={2} fill={c.color} />
          <text x={12} y={yG + 17} fontSize="10" fontWeight={800} fill="var(--ink)">{c.code} · {c.name}</text>
          {filas.map(({ d, yy }) => {
            const on = sel === d.code; const col = d.m == null ? "var(--line)" : LEVELS[levelOf(d.m) - 1].color;
            return (
              <g key={d.code} onClick={onSel ? () => onSel(d.code) : undefined} style={onSel ? { cursor: "pointer" } : undefined} role={onSel ? "button" : undefined} aria-label={onSel ? `${d.code} · ${d.name}: ${fmtN(d.m)}. Toca para ver su lectura` : undefined}>
                <rect x={0} y={yy} width={x0 + ancho + 60} height={rowH} fill={on ? "color-mix(in srgb, var(--gold) 14%, transparent)" : "transparent"} rx={6} />
                <text x={12} y={yy + rowH / 2 + 3.5} fontSize="9.5" fontWeight={on ? 800 : 600} fill="var(--ink-soft)"><tspan fontWeight={800} fill="var(--ink)">{d.code}</tspan> · {d.name.length > 26 ? d.name.slice(0, 25) + "…" : d.name}</text>
                <rect x={x0} y={yy + rowH / 2 - 6} width={ancho} height={12} rx={6} fill="var(--surface-2)" />
                {d.m != null && <rect x={x0} y={yy + rowH / 2 - 6} width={Math.max(4, (d.m / 5) * ancho)} height={12} rx={6} fill={col} />}
                {consolidado && d.sd != null && d.m != null && <line x1={xDe(Math.max(0, d.m - d.sd))} y1={yy + rowH / 2} x2={xDe(Math.min(5, d.m + d.sd))} y2={yy + rowH / 2} stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={1.5} />}
                <text x={x0 + ancho + 8} y={yy + rowH / 2 + 4} fontSize="10" fontWeight={800} fill={d.m != null && d.m < THRESHOLD ? "var(--bad-text)" : "var(--ink)"} className="num">{fmtN(d.m)}</text>
                {d.n < d.tot && !consolidado && <text x={x0 + ancho + 36} y={yy + rowH / 2 + 4} fontSize="8" fill="var(--faint)">{d.n}/{d.tot}</text>}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

const Nivel = ({ m }: { m: number | null }) => m == null ? <span className="chip">sin dato</span> : <span className="chip" style={{ background: `color-mix(in srgb, ${LEVELS[levelOf(m) - 1].color} 18%, var(--surface))`, color: "var(--ink)" }}>{levelName(m)}</span>;

const SECCIONES = [
  { id: "resumen", label: "Resumen", icon: BookOpen, n: "01", desc: "Qué dice la lectura y la hipótesis central" },
  { id: "capacidades", label: "Capacidades", icon: Target, n: "02", desc: "Las cuatro capacidades, una a una" },
  { id: "dimensiones", label: "Dimensiones", icon: ListChecks, n: "03", desc: "Las 17 dimensiones: toca una barra para profundizar" },
  { id: "hallazgos", label: "Hallazgos", icon: Flame, n: "04", desc: "Fortalezas que sostienen y brechas por demostrar" },
  { id: "ruta", label: "Ruta", icon: Route, n: "05", desc: "Patrones, causa raíz y los primeros 90 días" },
  { id: "metodo", label: "Método", icon: HelpCircle, n: "06", desc: "Preguntas para la devolución y cómo leer el informe" },
] as const;
type SeccionId = (typeof SECCIONES)[number]["id"];

/* ═══ Informe ═══ */

export function InformeEjecutivo({ kind, empresa, persona, fecha, datos, informe, estado, meta, shareUrl, canRegen, onRegen, busy, volverHref, error }: {
  kind: InformeKind; empresa: string; persona?: { nombre: string; cargo?: string }; fecha: string; datos: DatosEjec; informe: InformeIA | null;
  estado: Estado; meta?: string; shareUrl?: string | null; canRegen?: boolean; onRegen?: () => void; busy?: boolean; volverHref?: string; error?: string | null;
}) {
  const [tab, setTab] = useState<SeccionId>("resumen");
  const [sel, setSel] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [guia, setGuia] = useState(() => { try { return localStorage.getItem("ge-informe-guia") !== "ok"; } catch { return true; } });
  const cerrarGuia = () => { setGuia(false); try { localStorage.setItem("ge-informe-guia", "ok"); } catch { /* nada */ } };
  const cifras = resumenCifras(datos);
  const lecturaDim = (code: string) => informe?.dimensiones?.find((x) => x.dimension.startsWith(code))?.lectura;
  const lecturaCap = (name: string) => informe?.capacidades.find((c) => c.capacidad.toLowerCase().startsWith(name.toLowerCase().slice(0, 5)));
  const selDim = sel ? datos.dims.find((d) => d.code === sel) : null;
  const compartir = async () => { if (!shareUrl) return; if (navigator.share) { try { await navigator.share({ title: "Informe consolidado del diagnóstico", url: shareUrl }); return; } catch { /* cancelado */ } } await navigator.clipboard.writeText(shareUrl); avisar("Enlace copiado: quien lo tenga ve el informe consolidado, sin nombres"); };
  const sujeto = kind === "f1" ? `Evaluación de ${persona?.nombre ?? "un directivo"}${persona?.cargo ? ` · ${persona.cargo}` : ""}` : `Lectura consolidada del comité · ${datos.personas ?? 0} ${datos.personas === 1 ? "directivo" : "directivos"}`;
  const toggle = (code: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(code)) n.delete(code); else n.add(code); return n; });
  const idx = SECCIONES.findIndex((s) => s.id === tab);
  const ir = (id: SeccionId) => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const titulo = informe?.titulo ?? `Capacidades organizacionales de ${empresa}`;
  const hipotesis = informe?.hipotesis_central ?? (kind === "f1" ? "Cómo ve el directivo las capacidades de la compañía frente al método 4Shine Empresas." : "Cómo ve el comité directivo las capacidades de la compañía frente al método 4Shine Empresas.");

  return (
    <EstadoCtx.Provider value={estado}>
    <article className="informe mx-auto max-w-[1040px]">
      {/* ─── pantalla ─── */}
      <div className="informe-pantalla">
        <div className="sticky top-[54px] z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line/70 bg-surface/90 px-3 py-2 backdrop-blur-xl">
          {volverHref && <Link href={volverHref} className="btn-ghost btn-sm"><ArrowLeft size={13} /> Volver</Link>}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {estado === "desactualizado" && <span className="chip chip-warn"><AlertTriangle size={11} /> Hay respuestas nuevas</span>}
            {canRegen && onRegen && (estado === "desactualizado" || estado === "pendiente") && <button type="button" onClick={onRegen} disabled={busy} className="btn-ghost btn-sm">{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {informe ? "Actualizar análisis" : "Generar análisis"}</button>}
            {shareUrl && <button type="button" onClick={compartir} className="btn-ghost btn-sm"><Link2 size={13} /> Compartir</button>}
            <button type="button" onClick={() => window.print()} className="btn-primary btn-sm" title="Se abre el diálogo de impresión: elige «Guardar como PDF»"><Printer size={13} /> Descargar PDF</button>
          </span>
        </div>

        {/* cabecera compacta */}
        <header className="relative mb-4 overflow-hidden rounded-3xl px-6 py-6 text-white sm:px-8" style={{ background: "var(--grad-deep)" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(520px 260px at 100% 0%, rgb(241 186 91 / 0.16), transparent 60%)" }} />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-fill">Informe ejecutivo · {kind === "f1" ? "Autoevaluación directiva · Fuente 1" : "Consolidado del comité · Fuente 1"} · {empresa}</div>
            <h1 className="mt-2 max-w-[26ch] text-[24px] font-extrabold leading-[1.12] tracking-tight sm:text-[30px]">{titulo}</h1>
            <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-white/80">{hipotesis}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/70"><span>{sujeto}</span><span>·</span><span>{fecha}</span><span>·</span><span>{datos.answered} de {datos.total} afirmaciones{datos.personas && datos.personas > 1 ? " por persona" : ""}</span></div>
          </div>
        </header>

        {/* estado del análisis */}
        {estado !== "listo" && estado !== "desactualizado" && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-[13px]">
            {estado === "generando" ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-cyan-deep" /> : estado === "pendiente" ? <Sparkles size={16} className="mt-0.5 shrink-0 text-gold" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-bad" />}
            <div className="text-ink-soft">
              {estado === "generando" && <><b className="text-ink">El advisor virtual está escribiendo la lectura.</b> Tarda menos de un minuto; las cifras ya están y los textos aparecen solos cuando termine.</>}
              {estado === "pendiente" && <><b className="text-ink">La lectura con IA se genera al completar las 68 afirmaciones.</b> Faltan {datos.total - datos.answered}. Mientras tanto, el informe muestra las cifras.</>}
              {estado === "no-disponible" && <><b className="text-ink">El análisis con IA no está configurado.</b> Se activa con la integración de OpenAI en Administración → Integraciones. El informe muestra las cifras.</>}
              {error && <div className="mt-1 text-bad-text">{error}</div>}
            </div>
          </div>
        )}

        {/* guía de navegación */}
        {guia && (
          <div className="mb-4 rounded-2xl border border-gold/40 bg-gold-wash px-5 py-4">
            <div className="flex items-start gap-3">
              <Compass size={18} className="mt-0.5 shrink-0 text-gold-text" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-extrabold text-ink">Cómo recorrer este informe</div>
                <ol className="mt-2 grid gap-2 text-[12.5px] leading-snug text-ink-soft sm:grid-cols-2">
                  <li className="flex gap-2"><b className="num shrink-0 text-gold-text">1.</b><span><b className="text-ink">Sigue las seis pestañas en orden</b> o salta a la que te interese; cada una es una página distinta, con su propio contenido.</span></li>
                  <li className="flex gap-2"><b className="num shrink-0 text-gold-text">2.</b><span><b className="text-ink">En Dimensiones, toca una barra</b> para abrir su definición, la lectura de la IA y las prácticas calificadas. En las tarjetas, el chevron ▾ despliega la lectura.</span></li>
                  <li className="flex gap-2"><b className="num shrink-0 text-gold-text">3.</b><span><b className="text-ink">Léelo como hipótesis:</b> es la evaluación que {kind === "f1" ? "el directivo" : "la dirección"} hace de la compañía, a contrastar con {kind === "f1" ? "los pares, " : ""}los equipos y la evidencia.</span></li>
                  <li className="flex gap-2"><b className="num shrink-0 text-gold-text">4.</b><span><b className="text-ink">Descargar PDF</b> genera la versión editorial completa, con todas las secciones y lecturas, lista para compartir.</span></li>
                </ol>
              </div>
              <button type="button" onClick={cerrarGuia} className="btn-ghost btn-sm shrink-0" aria-label="Cerrar la guía"><X size={13} /> Entendido</button>
            </div>
          </div>
        )}

        {/* pestañas */}
        <nav className="mb-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-2 p-1.5 sm:grid-cols-6" aria-label="Secciones del informe" role="tablist">
          {SECCIONES.map((s) => { const on = s.id === tab; return (
            <button key={s.id} type="button" role="tab" aria-selected={on} onClick={() => ir(s.id)} title={s.desc}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12.5px] font-bold transition-all ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <span className="num text-[10px] text-gold-text">{s.n}</span><s.icon size={13} className={on ? "text-cyan-deep" : ""} /> {s.label}
            </button>
          ); })}
        </nav>
        {!guia && <p className="mb-3 -mt-3 text-[11.5px] text-faint"><MousePointerClick size={11} className="mr-1 inline" />{SECCIONES[idx].desc}. <button type="button" onClick={() => setGuia(true)} className="font-bold text-cyan-deep hover:underline">Ver la guía</button></p>}

        {/* ─ 01 Resumen ─ */}
        {tab === "resumen" && (
          <section className="rise space-y-4" aria-label="Resumen">
            <div className="grid gap-3 sm:grid-cols-4">
              {cifras.map((x) => <div key={x.k} className="panel px-4 py-3"><div className="text-[11px] font-bold uppercase tracking-wider text-faint">{x.k}</div><div className="num mt-1 text-[26px] font-extrabold leading-none text-ink">{x.v}</div><div className="mt-1 text-[12px] text-muted">{x.s}</div></div>)}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="panel px-6 py-5 sm:px-7">
                <Kicker icon={<BookOpen size={12} />}>Resumen ejecutivo</Kicker>
                {informe ? informe.resumen.map((p, i) => <p key={i} className="mt-3 text-[14px] leading-relaxed text-ink-soft first:mt-2">{p}</p>) : <Esqueleto filas={5} />}
                {informe?.contexto_empresa && <div className="mt-4 rounded-xl border-l-4 border-gold bg-gold-wash px-4 py-3"><div className="text-[11px] font-bold uppercase tracking-wider text-gold-text">A la luz de los datos de la empresa e Inteligencia</div><p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{informe.contexto_empresa}</p></div>}
              </div>
              <div className="panel px-6 py-5">
                <Kicker>Perfil de las cuatro capacidades</Kicker>
                <MiniRadar color="var(--navy)" size={230} axes={datos.caps.map((c) => ({ label: c.code, value: Math.max(0, c.m ?? 0), target: THRESHOLD }))} />
                <p className="text-[11.5px] leading-snug text-faint">La línea punteada marca 3,0: por debajo, la práctica no está instalada. Un promedio alto no borra una dimensión débil.</p>
                <div className="mt-3 rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-snug text-ink-soft"><Lightbulb size={13} className="mr-1 inline text-gold-text" /><b className="text-ink">Hipótesis, no veredicto.</b> Se contrasta con {kind === "f1" ? "las lecturas de los pares, " : ""}la percepción de los equipos y la evidencia documental.</div>
              </div>
            </div>
          </section>
        )}

        {/* ─ 02 Capacidades ─ */}
        {tab === "capacidades" && (
          <section className="rise grid gap-3 sm:grid-cols-2" aria-label="Capacidades">
            {datos.caps.map((c) => { const L = lecturaCap(c.name); return (
              <div key={c.code} className="panel overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: c.color }}>
                  <div className="min-w-0 flex-1"><div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">{c.code} · {c.verb}</div><div className="text-[16px] font-extrabold">{c.name}</div></div>
                  <div className="num text-[28px] font-extrabold leading-none">{fmtN(c.m)}</div>
                </div>
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted"><Nivel m={c.m} /><span>{cobertura(datos, c.code, kind)}</span></div>
                  <div className="relative mt-2 h-[8px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.m ?? 0) / 5) * 100}%`, background: c.m != null && c.m < THRESHOLD ? "var(--bad)" : c.color }} /><i className="absolute top-0 h-full w-px bg-ink/40" style={{ left: `${(THRESHOLD / 5) * 100}%` }} /></div>
                  <p className="mt-2 text-[12px] italic text-faint">{c.q}</p>
                  <div className="mt-2 text-[13px] leading-relaxed text-ink-soft">{L?.lectura ?? <Esqueleto filas={3} />}</div>
                  <button type="button" onClick={() => { setTab("dimensiones"); setSel(datos.dims.find((d) => d.capCode === c.code)?.code ?? null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-cyan-deep hover:underline">Ver sus dimensiones <ArrowRight size={12} /></button>
                </div>
              </div>
            ); })}
          </section>
        )}

        {/* ─ 03 Dimensiones ─ */}
        {tab === "dimensiones" && (
          <section className="rise space-y-4" aria-label="Dimensiones">
            <div className="panel px-5 py-5 sm:px-7">
              <Kicker icon={<ListChecks size={12} />}>Las diecisiete dimensiones</Kicker>
              <p className="mt-1 text-[12.5px] text-muted">Promedio de las cuatro prácticas de cada dimensión, coloreado por nivel. {kind === "consolidado" ? "La línea oscura muestra la dispersión entre directivos (± una desviación). " : ""}<b className="text-ink"><MousePointerClick size={12} className="mr-0.5 inline" />Toca una barra</b> para ver su definición, su lectura y{kind === "f1" ? " las cuatro prácticas calificadas" : " su dispersión"}.</p>
              <div className="mt-3 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                <BarrasDimensiones dims={datos.dims} sel={sel} onSel={(c) => setSel((s) => (s === c ? null : c))} consolidado={kind === "consolidado"} />
                <div>
                  {selDim ? (
                    <div className="rise rounded-2xl border border-line px-5 py-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-faint">{selDim.capName}</div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-3"><b className="text-[15px] text-ink">{selDim.code} · {selDim.name}</b><span className="num text-[20px] font-extrabold" style={{ color: selDim.m != null ? LEVELS[levelOf(selDim.m) - 1].color : "var(--faint)" }}>{fmtN(selDim.m)}</span></div>
                      <div className="mt-1 flex flex-wrap items-center gap-2"><Nivel m={selDim.m} />{kind === "consolidado" && selDim.sd != null && <span className="chip">dispersión ± {fmtN(selDim.sd)}</span>}</div>
                      <p className="mt-2 text-[12px] leading-snug text-muted">{selDim.defn}</p>
                      <div className="mt-3 text-[13px] leading-relaxed text-ink-soft">{lecturaDim(selDim.code) ?? (informe ? "Sin lectura específica para esta dimensión." : <Esqueleto filas={3} />)}</div>
                      {selDim.prac && (
                        <ul className="mt-3 space-y-1.5">{selDim.prac.map((p) => <li key={p.code} className="flex items-start gap-2 text-[12px]"><span className={`num mt-0.5 w-6 shrink-0 rounded-md text-center font-extrabold ${p.v == null ? "bg-surface-2 text-faint" : p.v < THRESHOLD ? "bg-bad/15 text-bad-text" : "bg-ok/15 text-ok-text"}`}>{p.v ?? "—"}</span><span className="text-ink-soft">{p.text}</span></li>)}</ul>
                      )}
                      <button type="button" onClick={() => setSel(null)} className="mt-3 text-[12px] font-bold text-cyan-deep hover:underline">Cerrar</button>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-5 py-4 text-center text-[12.5px] text-faint"><MousePointerClick size={20} className="text-gold" />Toca una barra de la gráfica para profundizar en esa dimensión.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="panel px-5 py-5 sm:px-7">
              <Kicker>Lectura de cada dimensión</Kicker>
              <p className="mt-1 text-[12.5px] text-muted">Toca una tarjeta para desplegar su lectura; en el PDF aparecen todas.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {datos.dims.filter((d) => d.m != null).map((d) => { const l = lecturaDim(d.code); const open = abiertas.has(d.code); return (
                  <div key={d.code} className="rounded-xl border border-line px-4 py-2.5">
                    <button type="button" onClick={() => toggle(d.code)} className="flex w-full items-center gap-2 text-left" aria-expanded={open}>
                      <span className="num w-10 shrink-0 text-[14px] font-extrabold" style={{ color: LEVELS[levelOf(d.m as number) - 1].color }}>{fmtN(d.m)}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">{d.code} · {d.name}</span>
                      <Nivel m={d.m} /><ChevronDown size={14} className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{l ?? (informe ? "Sin lectura específica." : "Pendiente del análisis.")}</p>}
                  </div>
                ); })}
              </div>
            </div>
          </section>
        )}

        {/* ─ 04 Hallazgos ─ */}
        {tab === "hallazgos" && (
          <section className="rise grid gap-4 lg:grid-cols-2" aria-label="Hallazgos">
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
        )}

        {/* ─ 05 Ruta ─ */}
        {tab === "ruta" && (
          <section className="rise grid gap-4 lg:grid-cols-[1fr_1.1fr]" aria-label="Ruta">
            <div className="panel px-6 py-5">
              <Kicker icon={<Layers size={12} />}>Patrones y causa raíz</Kicker>
              {informe ? <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{informe.patrones}</p> : <Esqueleto filas={5} />}
              {informe?.dispersion && informe.dispersion.length > 0 && (<div className="mt-4"><Kicker tono="warn">Donde el comité no coincide</Kicker><ul className="mt-2 space-y-2">{informe.dispersion.map((d) => <li key={d.dimension} className="rounded-xl bg-gold-wash px-4 py-3 text-[13px]"><b className="text-ink">{d.dimension}.</b> <span className="text-ink-soft">{d.lectura}</span></li>)}</ul></div>)}
              {informe?.nivel_acompanamiento && (<div className="mt-4 rounded-2xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel de acompañamiento sugerido</div><div className="text-[18px] font-extrabold">{informe.nivel_acompanamiento.nivel}</div><p className="mt-1 text-[13px] leading-relaxed text-white/85">{informe.nivel_acompanamiento.por_que}</p></div>)}
            </div>
            <div className="panel px-6 py-5">
              <Kicker icon={<Route size={12} />}>Por dónde empezar · próximos 90 días</Kicker>
              {informe ? <Prioridades informe={informe} /> : <Esqueleto filas={6} />}
            </div>
          </section>
        )}

        {/* ─ 06 Método ─ */}
        {tab === "metodo" && (
          <section className="rise grid gap-4 lg:grid-cols-2" aria-label="Método">
            <div className="panel px-6 py-5">
              <Kicker icon={<HelpCircle size={12} />}>Preguntas para la devolución</Kicker>
              {informe ? <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] text-ink-soft">{informe.preguntas.map((q, i) => <li key={i}>{q}</li>)}</ul> : <Esqueleto filas={4} />}
            </div>
            <div className="panel px-6 py-5">
              <Kicker>Cómo leer este informe</Kicker>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{textoMetodo(kind)}</p>
              {informe?.nota_metodologica && <p className="mt-3 rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] italic leading-relaxed text-muted">{informe.nota_metodologica}</p>}
              {meta && <p className="mt-3 text-[11.5px] text-faint">{meta}</p>}
            </div>
          </section>
        )}

        {/* anterior / siguiente */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {idx > 0 ? <button type="button" onClick={() => ir(SECCIONES[idx - 1].id)} className="btn-ghost text-[12.5px]"><ArrowLeft size={13} /> {SECCIONES[idx - 1].n} · {SECCIONES[idx - 1].label}</button> : <span />}
          <span className="num text-[12px] text-faint">{SECCIONES[idx].n} de 06</span>
          {idx < SECCIONES.length - 1 ? <button type="button" onClick={() => ir(SECCIONES[idx + 1].id)} className="btn-primary text-[12.5px]">Siguiente: {SECCIONES[idx + 1].label} <ArrowRight size={13} /></button> : <button type="button" onClick={() => window.print()} className="btn-primary text-[12.5px]"><Printer size={13} /> Descargar PDF</button>}
        </div>
      </div>

      {/* ─── PDF: hojas editoriales ─── */}
      <InformeImpreso kind={kind} empresa={empresa} sujeto={sujeto} fecha={fecha} datos={datos} informe={informe} titulo={titulo} hipotesis={hipotesis} cifras={cifras} meta={meta} />
    </article>
    </EstadoCtx.Provider>
  );
}

/* ═══ Versión impresa (hojas A4) ═══ */

function Hoja({ n, seccion, children, oscura, empresa, kind, fecha, pagina }: { n: string; seccion: string; children: ReactNode; oscura?: boolean; empresa: string; kind: InformeKind; fecha: string; pagina: number }) {
  return (
    <section className={`hoja ${oscura ? "hoja-oscura" : ""}`}>
      {!oscura && (
        <div className="mb-[8mm] flex items-end justify-between border-b border-line pb-[3mm]">
          <div className="flex items-baseline gap-3"><span className="num text-[18pt] font-extrabold leading-none text-gold">{n}</span><span className="text-[9pt] font-bold uppercase tracking-[0.2em] text-ink">{seccion}</span></div>
          <div className="text-[8pt] uppercase tracking-[0.16em] text-faint">{empresa} · Informe ejecutivo</div>
        </div>
      )}
      <div className="flex-1">{children}</div>
      <div className="hoja-pie"><span>Gestión estratégica · {kind === "f1" ? "informe individual y confidencial" : "informe consolidado del comité"}</span><span>{fecha} · {pagina}</span></div>
    </section>
  );
}

function InformeImpreso({ kind, empresa, sujeto, fecha, datos, informe, titulo, hipotesis, cifras, meta }: { kind: InformeKind; empresa: string; sujeto: string; fecha: string; datos: DatosEjec; informe: InformeIA | null; titulo: string; hipotesis: string; cifras: { k: string; v: string; s: string }[]; meta?: string }) {
  const lecturaDim = (code: string) => informe?.dimensiones?.find((x) => x.dimension.startsWith(code))?.lectura;
  const lecturaCap = (name: string) => informe?.capacidades.find((c) => c.capacidad.toLowerCase().startsWith(name.toLowerCase().slice(0, 5)));
  const conDato = datos.dims.filter((d) => d.m != null);
  const H = { empresa, kind, fecha };
  const paginas = conDato.length > 0 ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7];
  let p = 0;
  const sig = () => paginas[p++];
  return (
    <div className="informe-impreso">
      {/* portada */}
      <Hoja {...H} n="" seccion="" oscura pagina={sig()}>
        <div className="flex h-full flex-col justify-between py-[10mm]">
          <div>
            <div className="text-[9pt] font-bold uppercase tracking-[0.24em] text-cyan-fill">Informe ejecutivo · {kind === "f1" ? "Autoevaluación directiva · Fuente 1" : "Consolidado del comité · Fuente 1"}</div>
            <div className="mt-2 text-[12pt] font-semibold text-white/70">{empresa}</div>
          </div>
          <div>
            <h1 className="max-w-[20ch] text-[30pt] font-extrabold leading-[1.08] tracking-tight">{titulo}</h1>
            <p className="mt-6 max-w-[60ch] border-l-[3px] border-gold pl-4 text-[12.5pt] leading-relaxed text-white/85">{hipotesis}</p>
            <div className="mt-8 grid grid-cols-4 gap-3">
              {cifras.map((x) => <div key={x.k} className="rounded-xl bg-white/[0.08] px-4 py-3"><div className="text-[7.5pt] font-bold uppercase tracking-wider text-white/55">{x.k}</div><div className="num mt-1 text-[22pt] font-extrabold leading-none">{x.v}</div><div className="mt-1 text-[8.5pt] text-white/70">{x.s}</div></div>)}
            </div>
          </div>
          <div>
            <div className="text-[10pt] text-white/80">{sujeto}</div>
            <div className="text-[10pt] text-white/60">{fecha} · {datos.answered} de {datos.total} afirmaciones{datos.personas && datos.personas > 1 ? " por persona" : ""}</div>
            <p className="mt-5 max-w-[70ch] text-[9pt] leading-relaxed text-white/70"><b className="text-white">Léelo como hipótesis.</b> Es la evaluación que {kind === "f1" ? "el directivo hace de la compañía" : "la dirección hace de la compañía"}, no un diagnóstico de personas. Se contrasta con {kind === "f1" ? "las lecturas de los pares, " : ""}la percepción de los equipos (Fuente 2) y la evidencia documental (Fuente 3).</p>
          </div>
        </div>
      </Hoja>

      {/* 01 resumen */}
      <Hoja {...H} n="01" seccion="Resumen ejecutivo" pagina={sig()}>
        <div className="grid grid-cols-[1.35fr_1fr] gap-[10mm]">
          <div>
            <h2 className="text-[16pt] font-extrabold leading-snug text-ink">{titulo}</h2>
            {informe ? informe.resumen.map((par, i) => <p key={i} className="mt-3 text-[10pt] leading-[1.55] text-ink-soft">{par}</p>) : <p className="mt-3 text-[10pt] italic text-faint">{textoPendiente(datos)}</p>}
            {informe?.contexto_empresa && <div className="mt-5 border-l-[3px] border-gold pl-4"><div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-gold-text">A la luz de los datos de la empresa e Inteligencia</div><p className="mt-1 text-[9.5pt] leading-[1.5] text-ink-soft">{informe.contexto_empresa}</p></div>}
          </div>
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-gold-text">Perfil de las cuatro capacidades</div>
            <MiniRadar color="var(--navy)" size={220} axes={datos.caps.map((c) => ({ label: c.code, value: Math.max(0, c.m ?? 0), target: THRESHOLD }))} />
            <table className="mt-2 w-full text-[9pt]"><tbody>{datos.caps.map((c) => <tr key={c.code} className="border-t border-line"><td className="py-1.5 font-bold text-ink">{c.code} · {c.name}</td><td className="num py-1.5 text-right font-extrabold" style={{ color: c.m != null && c.m < THRESHOLD ? "var(--bad-text)" : "var(--ink)" }}>{fmtN(c.m)}</td><td className="py-1.5 pl-2 text-right text-muted">{c.m != null ? levelName(c.m) : "sin dato"}</td></tr>)}</tbody></table>
            <p className="mt-3 text-[8pt] leading-snug text-faint">Escala de 1 (incipiente) a 5 (multiplicadora). Umbral de práctica instalada: 3,0. Un promedio alto no borra una dimensión débil.</p>
          </div>
        </div>
      </Hoja>

      {/* 02 capacidades */}
      <Hoja {...H} n="02" seccion="Las cuatro capacidades" pagina={sig()}>
        <div className="grid grid-cols-2 gap-[6mm]">
          {datos.caps.map((c) => { const L = lecturaCap(c.name); return (
            <div key={c.code} className="evitar overflow-hidden rounded-xl border border-line">
              <div className="flex items-center gap-3 px-4 py-2.5 text-white" style={{ background: c.color }}><div className="flex-1"><div className="text-[7.5pt] font-bold uppercase tracking-[0.16em] opacity-80">{c.code} · {c.verb}</div><div className="text-[12pt] font-extrabold">{c.name}</div></div><div className="num text-[20pt] font-extrabold leading-none">{fmtN(c.m)}</div></div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-[8.5pt] text-muted"><span>{c.m != null ? levelName(c.m) : "sin dato"}</span><span>{cobertura(datos, c.code, kind)}</span></div>
                <div className="relative mt-1.5 h-[6px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${((c.m ?? 0) / 5) * 100}%`, background: c.m != null && c.m < THRESHOLD ? "var(--bad)" : c.color }} /><i className="absolute top-0 h-full w-px bg-ink/40" style={{ left: `${(THRESHOLD / 5) * 100}%` }} /></div>
                <p className="mt-2 text-[8.5pt] italic text-faint">{c.q}</p>
                <p className="mt-2 text-[9.5pt] leading-[1.5] text-ink-soft">{L?.lectura ?? textoPendiente(datos)}</p>
                <ul className="mt-2 space-y-0.5 text-[8.5pt] text-muted">{datos.dims.filter((d) => d.capCode === c.code).map((d) => <li key={d.code} className="flex justify-between"><span>{d.code} · {d.name}</span><b className="num text-ink">{fmtN(d.m)}</b></li>)}</ul>
              </div>
            </div>
          ); })}
        </div>
      </Hoja>

      {/* 03 dimensiones: gráfica */}
      <Hoja {...H} n="03" seccion="Las diecisiete dimensiones" pagina={sig()}>
        <p className="mb-3 text-[9.5pt] leading-snug text-ink-soft">Promedio de las cuatro prácticas de cada dimensión, coloreado por nivel; la línea punteada marca el umbral 3,0.{kind === "consolidado" ? " La línea oscura muestra la dispersión entre directivos (± una desviación)." : ""}</p>
        <BarrasDimensiones dims={datos.dims} sel={null} consolidado={kind === "consolidado"} compacto />
        <div className="mt-4 flex flex-wrap gap-3 text-[8pt] text-muted">{LEVELS.map((l) => <span key={l.n} className="inline-flex items-center gap-1.5"><i className="inline-block h-[8px] w-[14px] rounded-full" style={{ background: l.color }} />{l.n} · {l.name}</span>)}</div>
      </Hoja>

      {/* 03b lecturas por dimensión */}
      {conDato.length > 0 && (
        <Hoja {...H} n="03" seccion="Lectura de cada dimensión" pagina={sig()}>
          <div className="columns-2 gap-[8mm]">
            {conDato.map((d) => (
              <div key={d.code} className="evitar mb-3 border-b border-line pb-2.5">
                <div className="flex items-baseline justify-between gap-2"><b className="text-[9.5pt] text-ink">{d.code} · {d.name}</b><span className="num text-[11pt] font-extrabold" style={{ color: LEVELS[levelOf(d.m as number) - 1].color }}>{fmtN(d.m)}</span></div>
                <div className="text-[7.5pt] uppercase tracking-wider text-faint">{levelName(d.m as number)}{kind === "consolidado" && d.sd != null ? ` · dispersión ± ${fmtN(d.sd)}` : ""}</div>
                <p className="mt-1 text-[8.8pt] leading-[1.45] text-ink-soft">{lecturaDim(d.code) ?? d.defn}</p>
              </div>
            ))}
          </div>
        </Hoja>
      )}

      {/* 04 hallazgos */}
      <Hoja {...H} n="04" seccion="Hallazgos" pagina={sig()}>
        <div className="grid grid-cols-2 gap-[8mm]">
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--ok-text)" }}>Fortalezas que sostienen</div>
            {!informe ? <p className="mt-2 text-[9.5pt] italic text-faint">{textoPendiente(datos)}</p> : informe.fortalezas.length === 0 ? <p className="mt-2 text-[9.5pt] italic text-faint">La lectura no destaca fortalezas por encima del umbral.</p> : informe.fortalezas.map((f) => <div key={f.dimension} className="evitar mt-3 rounded-lg bg-surface-2/70 px-3.5 py-2.5 text-[9.5pt] leading-[1.5]"><b className="text-ink">{f.dimension}.</b> <span className="text-ink-soft">{f.por_que}</span></div>)}
          </div>
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--bad-text)" }}>Brechas y qué las demostraría</div>
            {!informe ? <p className="mt-2 text-[9.5pt] italic text-faint">{textoPendiente(datos)}</p> : informe.brechas.length === 0 ? <p className="mt-2 text-[9.5pt] italic text-faint">Ninguna dimensión con dato quedó bajo el umbral.</p> : informe.brechas.map((b) => (
              <div key={b.dimension} className="evitar mt-3 rounded-lg border border-line px-3.5 py-2.5 text-[9.5pt] leading-[1.5]">
                <div className="flex items-baseline justify-between gap-2"><b className="text-ink">{b.dimension}</b>{b.puntaje != null && <span className="num font-extrabold" style={{ color: "var(--bad-text)" }}>{fmtN(b.puntaje)}</span>}</div>
                <p className="mt-0.5 text-ink-soft">{b.que_revela}</p>
                {b.evidencia_a_verificar && <p className="mt-1 text-[8.8pt] text-muted"><b className="text-ink">Evidencia a verificar.</b> {b.evidencia_a_verificar}</p>}
                {b.framework && <p className="text-[8.8pt] text-muted"><b className="text-ink">Framework.</b> {b.framework}</p>}
              </div>
            ))}
          </div>
        </div>
      </Hoja>

      {/* 05 ruta */}
      <Hoja {...H} n="05" seccion="Patrones y ruta de 90 días" pagina={sig()}>
        <div className="grid grid-cols-[1fr_1.15fr] gap-[8mm]">
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-gold-text">Patrones y causa raíz</div>
            <p className="mt-2 text-[10pt] leading-[1.55] text-ink-soft">{informe?.patrones ?? textoPendiente(datos)}</p>
            {informe?.dispersion && informe.dispersion.length > 0 && <div className="mt-4"><div className="text-[7.5pt] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--warn-text)" }}>Donde el comité no coincide</div>{informe.dispersion.map((d) => <p key={d.dimension} className="mt-2 rounded-lg bg-gold-wash px-3.5 py-2.5 text-[9.5pt] leading-[1.5]"><b className="text-ink">{d.dimension}.</b> <span className="text-ink-soft">{d.lectura}</span></p>)}</div>}
            {informe?.nivel_acompanamiento && <div className="evitar mt-4 rounded-xl px-4 py-3 text-white" style={{ background: "var(--grad-deep)" }}><div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel de acompañamiento sugerido</div><div className="text-[14pt] font-extrabold">{informe.nivel_acompanamiento.nivel}</div><p className="mt-1 text-[9.5pt] leading-[1.5] text-white/85">{informe.nivel_acompanamiento.por_que}</p></div>}
          </div>
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-gold-text">Por dónde empezar · próximos 90 días</div>
            {informe ? <div className="mt-2"><Prioridades informe={informe} impreso /></div> : <p className="mt-2 text-[9.5pt] italic text-faint">{textoPendiente(datos)}</p>}
          </div>
        </div>
      </Hoja>

      {/* 06 método */}
      <Hoja {...H} n="06" seccion="Preguntas y método" pagina={sig()}>
        <div className="grid grid-cols-2 gap-[8mm]">
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-gold-text">Preguntas para la devolución</div>
            {informe ? <ol className="mt-2 space-y-2">{informe.preguntas.map((q, i) => <li key={i} className="flex gap-2 text-[10pt] leading-[1.5] text-ink-soft"><span className="num shrink-0 font-extrabold text-gold">{String(i + 1).padStart(2, "0")}</span>{q}</li>)}</ol> : <p className="mt-2 text-[9.5pt] italic text-faint">{textoPendiente(datos)}</p>}
          </div>
          <div>
            <div className="text-[7.5pt] font-bold uppercase tracking-[0.18em] text-gold-text">Cómo leer este informe</div>
            <p className="mt-2 text-[9.5pt] leading-[1.55] text-ink-soft">{textoMetodo(kind)}</p>
            {informe?.nota_metodologica && <p className="mt-3 border-l-[3px] border-line pl-3 text-[9pt] italic leading-[1.5] text-muted">{informe.nota_metodologica}</p>}
            {meta && <p className="mt-4 text-[8pt] text-faint">{meta}</p>}
            <p className="mt-6 text-[8pt] leading-snug text-faint">Método 4Shine Empresas · plataforma Gestión estratégica de Algoritmo T. Las cifras provienen de las respuestas guardadas en la plataforma; la lectura cualitativa la escribe un modelo de lenguaje a partir del método y de los datos de la empresa, y la revisa el advisor en la devolución.</p>
          </div>
        </div>
      </Hoja>
    </div>
  );
}

/* ═══ Piezas compartidas ═══ */

function Prioridades({ informe, impreso }: { informe: InformeIA; impreso?: boolean }) {
  return (
    <ol className={`relative space-y-3 border-l-2 border-line ${impreso ? "pl-5" : "mt-3 pl-6"}`}>
      {informe.prioridades.map((p, i) => (
        <li key={`${p.orden}-${p.dimension}`} className="evitar relative">
          <span className={`num absolute flex items-center justify-center rounded-full font-extrabold text-white ${impreso ? "-left-[27px] top-0 h-6 w-6 text-[8.5pt]" : "-left-[33px] top-0 h-7 w-7 text-[12px]"}`} style={{ background: "var(--navy)" }}>{p.orden || i + 1}</span>
          <div className={`font-extrabold text-ink ${impreso ? "text-[10pt]" : "text-[13.5px]"}`}>{p.dimension}</div>
          {p.framework && <div className={`text-muted ${impreso ? "text-[8.5pt]" : "text-[12px]"}`}>Framework · {p.framework}</div>}
          <p className={`mt-1 leading-relaxed text-ink-soft ${impreso ? "text-[9.5pt]" : "text-[13px]"}`}>{p.primer_paso}</p>
        </li>
      ))}
    </ol>
  );
}

function resumenCifras(datos: DatosEjec) {
  const con = datos.caps.filter((c) => c.m != null);
  const general = con.length ? con.reduce((a, c) => a + (c.m as number), 0) / con.length : null;
  const bajo = datos.dims.filter((d) => d.m != null && (d.m as number) < THRESHOLD);
  const fuerte = con.length ? con.reduce((a, b) => ((b.m as number) > (a.m as number) ? b : a)) : null;
  const debil = con.length ? con.reduce((a, b) => ((b.m as number) < (a.m as number) ? b : a)) : null;
  return [
    { k: "Promedio general", v: fmtN(general), s: general != null ? levelName(general) : "sin dato" },
    { k: "Bajo el umbral", v: String(bajo.length), s: bajo.length === 1 ? "dimensión por debajo de 3,0" : "dimensiones por debajo de 3,0" },
    { k: "Capacidad más sólida", v: fuerte ? fmtN(fuerte.m) : "—", s: fuerte?.name ?? "sin dato" },
    { k: "Capacidad a cuidar", v: debil ? fmtN(debil.m) : "—", s: debil?.name ?? "sin dato" },
  ];
}
const cobertura = (datos: DatosEjec, capCode: string, kind: InformeKind) => {
  const c = datos.caps.find((x) => x.code === capCode)!;
  return kind === "consolidado" ? `${datos.dims.filter((d) => d.capCode === capCode && d.m != null).length} de ${datos.dims.filter((d) => d.capCode === capCode).length} dimensiones con dato` : `${c.n} de ${c.tot} afirmaciones`;
};
const textoMetodo = (kind: InformeKind) => `Fuente 1 del diagnóstico de capacidades del método 4Shine Empresas: ${kind === "f1" ? "la evaluación que un directivo hace de la compañía" : "el promedio de las evaluaciones que los directivos hacen de la compañía"} en 68 prácticas observables, cuatro por dimensión, en una escala de 1 (incipiente) a 5 (multiplicadora). El umbral de práctica instalada es 3,0. Son hipótesis: se contrastan con ${kind === "f1" ? "las lecturas de los pares, " : ""}la percepción de los equipos (Fuente 2) y la evidencia documental (Fuente 3); una práctica declarada y no demostrada queda como máximo en 2,9.`;
const textoPendiente = (datos: DatosEjec) => (datos.answered < datos.total ? `La lectura con IA se genera al completar las 68 afirmaciones (faltan ${datos.total - datos.answered}).` : "Lectura con IA pendiente de generar.");

function Kicker({ children, icon, tono }: { children: ReactNode; icon?: ReactNode; tono?: "ok" | "bad" | "warn" }) {
  const color = tono === "ok" ? "var(--ok-text)" : tono === "bad" ? "var(--bad-text)" : tono === "warn" ? "var(--warn-text)" : "var(--gold-text)";
  return <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{icon}{children}</div>;
}
const EstadoCtx = createContext<Estado>("listo");
function Esqueleto({ filas }: { filas: number }) {
  const estado = useContext(EstadoCtx);
  if (estado !== "generando") return <p className="mt-2 text-[12.5px] italic text-faint">{estado === "pendiente" ? "La lectura con IA aparece al completar las 68 afirmaciones." : estado === "no-disponible" ? "Sin análisis con IA configurado." : "Pendiente del análisis."}</p>;
  return <div className="mt-3 space-y-2" aria-hidden>{Array.from({ length: filas }).map((_, i) => <div key={i} className="h-3 animate-pulse rounded bg-surface-2" style={{ width: `${92 - (i % 3) * 14}%` }} />)}</div>;
}
