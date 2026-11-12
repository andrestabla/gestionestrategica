"use client";

// Madurez digital · análisis con IA. Tres piezas sobre el mismo servicio (/api/td/madurez/informe):
// la lectura personal de quien terminó su diagnóstico de percepción, la lectura breve que encabeza
// el Resumen y el informe de resultados completo de una medición. El análisis se guarda con la
// huella de los datos: si cambian, se avisa que quedó desactualizado.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Building2, CircleHelp, Compass, FileText, Flag, Layers, Lightbulb, Loader2, Printer, RefreshCw, Route, Scale, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { avisar } from "@/components/feedback";
import {
  madLevelN, madLevelName, indexLevel, lineLevel, lineIndex, dimLevel, overallLevel, generalIndex, evidenceCoverage, aiqOf, progressOf,
  type MadInstrument, type Captures, type SafeguardState,
} from "@/lib/madurez";
import type { MadInformeIA, MadLecturaIA, Exigencia, Posicion, Grado } from "@/lib/madurez-ia";
import type { SectorCruce } from "@/server/madurez-sector";
import { MapaCalor, NivelPorLinea, DispersionPE, EstadoPracticas, IndiceTransversal, ComponentesIA, MatrizSector, BarrasEstrategia, SectorCifras, MercadoCanales, MercadoPosicion, MatrizPrioridades, AdopcionIndustria, ParesIndustria, Vars, lineaDe, nivelDe } from "./informe-graficas";

type Api<T> = { disponible: boolean; informe: T | null; at: string | null; model: string | null; desactualizado: boolean; fuente: string; puedeGenerar: boolean; falta: string | null; sector?: SectorCruce | null };

const f1 = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f0 = (n: number) => Math.round(n).toLocaleString("es-CO");
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
const nColor = (v: number) => `var(--n${madLevelN(v)})`;

/** Lee el análisis guardado y, si se pide, lo genera una sola vez cuando falta. Quien lo usa le pone key con la consulta. */
function useAnalisis<T>(q: string, auto: boolean) {
  const [data, setData] = useState<Api<T> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/td/madurez/informe?${q}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!vivo) return; if (r.ok) setData(j); else setError(j.error ?? `Error ${r.status}`); })
      .catch(() => { if (vivo) setError("No se pudo conectar con el servidor."); });
    return () => { vivo = false; };
  }, [q]);
  const generar = async (silencioso = false) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/td/madurez/informe?${q}`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(j.error ?? `Error ${r.status}`);
      else { setData(j); if (!silencioso) avisar("Análisis actualizado."); }
    } catch { setError("No se pudo conectar con el servidor."); }
    setBusy(false);
  };
  // generación automática y única por visita, solo cuando no hay análisis guardado
  useEffect(() => { if (auto && data && data.disponible && data.puedeGenerar && !data.informe && !pedido.current) { pedido.current = true; void generar(true); } });
  return { data, busy, error, generar };
}

function Sello({ at, model }: { at: string | null; model: string | null }) {
  return <span className="inline-flex items-center gap-1.5 text-[12px] text-faint"><Sparkles size={13} /> Generado con IA{at ? ` · ${fecha(at)}` : ""}{model ? ` · ${model}` : ""}</span>;
}
function Generando({ texto, largo = false }: { texto: string; largo?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2" role="status">
      <Loader2 size={18} className="animate-spin text-[var(--gold)]" />
      <div><div className="text-[14px] font-semibold text-ink">{texto}</div><div className="text-[12.5px] text-muted">{largo ? "Toma entre uno y dos minutos: el informe se escribe en dos partes. Puedes seguir en la página." : "Toma menos de un minuto. Puedes seguir en la página."}</div></div>
    </div>
  );
}
function Seccion({ icon: Icon, titulo, sub, children, id }: { icon: typeof Sparkles; titulo: string; sub?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20"><Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[var(--gold-wash)] text-[var(--gold)]"><Icon size={16} /></span>
        <div><h3 className="text-[15.5px] font-extrabold leading-tight text-ink">{titulo}</h3>{sub && <p className="text-[12.5px] text-muted">{sub}</p>}</div></div>
      <div className="mt-4">{children}</div>
    </Card></section>
  );
}
const Parrafos = ({ xs }: { xs: string[] }) => <div className="space-y-3">{xs.map((p, i) => <p key={i} className="text-[14px] leading-relaxed text-ink-soft">{p}</p>)}</div>;

/* ═══ Lectura personal (Mi diagnóstico) ═══ */
export function LecturaPersonal({ ins, completo }: { ins: MadInstrument; completo: boolean }) {
  const { data, busy, error, generar } = useAnalisis<MadLecturaIA>("tipo=persona", completo);
  if (!data) return error ? <Card className="p-5 text-[13px] text-muted">{error}</Card> : null;
  const L = data.informe;
  const generando = busy || (completo && data.disponible && data.puedeGenerar && !L);
  if (!L && !generando) {
    if (!data.disponible) return completo ? <Card className="p-5 text-[13px] text-muted">La lectura con IA no está disponible en este momento. Tus respuestas quedaron guardadas.</Card> : null;
    if (!data.puedeGenerar) return null;
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><div className="label flex items-center gap-1.5"><Sparkles size={14} /> Tu lectura con IA</div><p className="mt-1 text-[13px] text-ink-soft">Ya valoraste suficientes afirmaciones para una primera lectura. Al completar el diagnóstico se genera sola.</p></div>
        <button type="button" onClick={() => void generar()} className="btn-ghost"><Sparkles size={14} /> Generar lectura</button>
      </Card>
    );
  }
  const linea = (txt: string) => ins.lines.find((l) => txt.startsWith(l.code) || txt.includes(l.name));
  return (
    <Card className="rise overflow-hidden">
      <div className="border-b border-line px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-text)]">Tu lectura</div>
          {L && <Sello at={data.at} model={null} />}
        </div>
        {generando && !L ? <div className="mt-3"><Generando texto="Preparando tu lectura…" /></div> : L && (
          <>
            <h3 className="mt-2 text-[21px] font-extrabold leading-tight tracking-[-0.015em] text-ink sm:text-[24px]">{L.titulo}</h3>
            <div className="mt-3 max-w-[78ch]"><Parrafos xs={L.resumen} /></div>
          </>
        )}
        {error && <p className="mt-3 text-[12.5px] text-[var(--bad)]">{error}</p>}
        {L && data.desactualizado && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-wash px-4 py-3 text-[13px] text-ink-soft">
            <span>Cambiaste respuestas después de esta lectura.</span>
            <button type="button" onClick={() => void generar()} disabled={busy || !data.puedeGenerar} className="btn-ghost btn-sm">{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualizar lectura</button>
          </div>
        )}
      </div>
      {L && (
        <div className="space-y-6 px-5 py-5 sm:px-7">
          <div className="grid gap-4 md:grid-cols-2">
            {L.lineas.map((x, i) => { const l = linea(x.linea); return (
              <div key={i} className="rounded-xl bg-surface-2 p-4">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink"><i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: l?.color ?? "var(--gold)" }} />{l?.name ?? x.linea}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{x.lectura}</p>
              </div>
            ); })}
          </div>
          {(L.confianza.length > 0 || L.alertas.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {L.confianza.length > 0 && <div><div className="label flex items-center gap-1.5"><TrendingUp size={14} /> Donde ves más avance</div>
                <ul className="mt-2.5 space-y-3">{L.confianza.map((x, i) => <li key={i} className="border-l-2 pl-3" style={{ borderColor: "var(--n4)" }}><div className="text-[13.5px] font-semibold text-ink">{x.afirmacion}</div><p className="text-[13px] leading-snug text-ink-soft">{x.lectura}</p></li>)}</ul></div>}
              {L.alertas.length > 0 && <div><div className="label flex items-center gap-1.5"><AlertTriangle size={14} /> Donde ves más distancia</div>
                <ul className="mt-2.5 space-y-3">{L.alertas.map((x, i) => <li key={i} className="border-l-2 pl-3" style={{ borderColor: "var(--n2)" }}><div className="text-[13.5px] font-semibold text-ink">{x.afirmacion}</div><p className="text-[13px] leading-snug text-ink-soft">{x.lectura}</p></li>)}</ul></div>}
            </div>
          )}
          {L.puntos_ciegos && <div><div className="label flex items-center gap-1.5"><CircleHelp size={14} /> Lo que marcaste «No lo sé»</div><p className="mt-1.5 max-w-[78ch] text-[13.5px] leading-relaxed text-ink-soft">{L.puntos_ciegos}</p></div>}
          {L.preguntas.length > 0 && <div><div className="label flex items-center gap-1.5"><Lightbulb size={14} /> Para llevar a la conversación</div>
            <ul className="mt-2 space-y-1.5">{L.preguntas.map((q, i) => <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft"><span className="num font-bold text-[var(--gold)]">{i + 1}.</span>{q}</li>)}</ul></div>}
          {L.nota && <p className="border-t border-line pt-4 text-[12.5px] leading-snug text-muted">{L.nota}</p>}
        </div>
      )}
    </Card>
  );
}

/* ═══ Lectura breve que encabeza el Resumen ═══ */
export function LecturaResumen({ fuente, href, cal }: { fuente: string; href: string; cal: boolean }) {
  const { data } = useAnalisis<MadInformeIA>(`tipo=empresa&fuente=${encodeURIComponent(fuente)}`, false);
  if (!data) return null;
  const I = data.informe;
  if (!I) {
    if (!cal || !data.disponible || !data.puedeGenerar) return null;
    return (
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-5">
        <div><div className="label flex items-center gap-1.5"><Sparkles size={14} /> Lectura con IA</div><p className="mt-1 text-[13px] text-ink-soft">Esta medición todavía no tiene informe de resultados. Se genera a partir de las cifras, los hallazgos y el contexto de la empresa.</p></div>
        <Link href={href} className="btn-ghost"><FileText size={14} /> Ir al informe</Link>
      </Card>
    );
  }
  return (
    <Card className="rise mb-5 overflow-hidden">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-text)]">Lectura de la medición</span><Sello at={data.at} model={null} /></div>
          <h3 className="mt-2 text-[19px] font-extrabold leading-tight tracking-[-0.015em] text-ink sm:text-[21px]">{I.titulo}</h3>
          <p className="mt-2 max-w-[82ch] text-[14px] leading-relaxed text-ink-soft">{I.hipotesis_central || I.resumen[0]}</p>
          {data.desactualizado && <p className="mt-2 text-[12.5px] text-[var(--warn)]">La medición cambió después de este análisis{cal ? ": actualízalo en el informe." : "."}</p>}
        </div>
        <Link href={href} className="btn-primary no-print flex-none">Ver el informe completo <ArrowRight size={15} /></Link>
      </div>
    </Card>
  );
}

/* ═══ Informe de resultados ═══ */

/** Texto del modelo con sus citas: «[3]» o «[3, 7]» se vuelven enlaces a la fuente; un número que no está entre las fuentes guardadas se omite. */
function Txt({ t, fuentes }: { t: string; fuentes: Set<number> }) {
  const partes = t.split(/(\[\d{1,3}(?:\s*[,;y]\s*\d{1,3})*\])/g);
  return <>{partes.map((x, i) => {
    if (!/^\[\d/.test(x)) return x;
    const ns = x.slice(1, -1).split(/[^\d]+/).filter(Boolean).map(Number).filter((n) => fuentes.has(n));
    return ns.length ? <span key={i} className="whitespace-nowrap">{ns.map((n) => <a key={n} href={`#fuente-${n}`} className="cita" title="Ver la fuente">{n}</a>)}</span> : null;
  })}</>;
}
const EXIG_CLS: Record<Exigencia, string> = { alta: "chip chip-bad", media: "chip chip-warn", baja: "chip" };
const POS: Record<Posicion, { label: string; cls: string }> = { rezago: { label: "Rezago", cls: "chip chip-bad whitespace-nowrap" }, en_linea: { label: "En línea", cls: "chip chip-warn whitespace-nowrap" }, ventaja: { label: "Ventaja", cls: "chip chip-ok whitespace-nowrap" } };
const GRADO_CLS = (g: Grado, bueno: Grado) => (g === bueno ? "chip chip-ok" : g === "medio" ? "chip chip-warn" : "chip chip-bad");

export function InformeResultados({ ins, caps, sg, previo, fuente, etiqueta, empresa, cal }: { ins: MadInstrument; caps: Captures; sg: SafeguardState; previo: Captures | null; fuente: string; etiqueta: string; empresa: string; cal: boolean }) {
  const { data, busy, error, generar } = useAnalisis<MadInformeIA>(`tipo=empresa&fuente=${encodeURIComponent(fuente)}`, false);
  const general = overallLevel(ins, caps), idx = generalIndex(ins, caps), pr = progressOf(ins, caps), aiq = aiqOf(ins, caps, sg);
  if (!data) return error ? <Card className="p-6 text-[13.5px] text-ink-soft">{error}</Card> : <Card className="p-6"><Generando texto="Cargando el informe…" /></Card>;
  const I = data.informe, S = data.sector ?? null;
  const linea = (txt: string) => lineaDe(ins, txt);
  const dimension = (txt: string) => ins.dimensions.find((d) => txt.toLowerCase().includes(d.name.toLowerCase()));
  const fuentes = new Set((I?.fuentes ?? []).map((f) => f.n));
  const T = (t?: string) => (t ? <Txt t={t} fuentes={fuentes} /> : null);
  const anterior = !!I && (I.version ?? 1) < 2;   // informe guardado antes del cruce con el sector
  const cifras: [string, string, string][] = [
    ["Madurez general", general === null ? "—" : f1(general), general === null ? "Sin nivel asignado todavía" : `${madLevelName(general)} · escala de 1 a 5`],
    ["Índice general", idx === null ? "—" : f0(idx), idx === null ? "Requiere percepción y evidencia" : `${indexLevel(idx).name} · escala de 0 a 100`],
    ["Evidencia suficiente", `${f0(evidenceCoverage(ins, caps))} %`, `${pr.dik} de ${pr.total} variables con evidencia calificada`],
    ["Preparación para IA", aiq.capped === null ? "—" : f0(aiq.capped), aiq.capped === null ? "Sin datos suficientes" : aiq.capApplied ? `Con techo ${aiq.cap} por salvaguarda` : "Índice de 0 a 100"],
  ];
  const indice: [string, string][] = I ? ([["resumen", "Resumen"], I.patrones?.length ? ["patrones", "Patrones"] : null, ["lineas", "Líneas"], ["brechas", "Fortalezas y brechas"], ["percepcion", "Percepción y evidencia"], I.sector ? ["industria", "La industria"] : null, I.sector ? ["sector", "El sector"] : null, I.estrategia?.length ? ["estrategia", "Estrategia"] : null, ["ia", "IA"], ["prioridades", "Prioridades"], ["ruta", "Ruta"], I.fuentes?.length ? ["fuentes", "Fuentes"] : null] as ([string, string] | null)[]).filter((x): x is [string, string] => !!x) : [];
  return (
    <div className="space-y-5">
      <Card className="rise overflow-hidden">
        <div className="bg-navy px-6 py-7 text-white sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-fill)]">Informe de resultados · {etiqueta}</div>
            <div className="no-print flex flex-wrap gap-2">
              {cal && data.disponible && (I || data.puedeGenerar) && (
                <button type="button" onClick={() => void generar()} disabled={busy || !data.puedeGenerar} className="btn-on-dark btn-sm disabled:opacity-50">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : I ? <RefreshCw size={13} /> : <Sparkles size={13} />} {busy ? "Generando…" : I ? "Actualizar con IA" : "Generar con IA"}
                </button>
              )}
              {I && <button type="button" onClick={() => window.print()} className="btn-on-dark btn-sm"><Printer size={13} /> Imprimir o PDF</button>}
            </div>
          </div>
          <h2 className="mt-3 max-w-[30ch] text-[25px] font-extrabold leading-[1.14] tracking-[-0.02em] sm:text-[31px]">{I ? I.titulo : "Diagnóstico de transformación digital"}</h2>
          <p className="mt-1.5 text-[13.5px] text-white/65">{empresa ? `${empresa} · ` : ""}Diagnóstico de transformación digital{S ? ` · ${S.label}` : ""}</p>
          {I?.hipotesis_central && <p className="mt-4 max-w-[70ch] border-l-2 border-[var(--gold-fill)] pl-4 text-[15px] leading-relaxed text-white/90">{I.hipotesis_central}</p>}
          {I && <div className="mt-4 text-white/55"><span className="inline-flex items-center gap-1.5 text-[12px]"><Sparkles size={13} /> Generado con IA{data.at ? ` · ${fecha(data.at)}` : ""}{data.model ? ` · ${data.model}` : ""}</span></div>}
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {cifras.map(([l, v, p]) => (
            <div key={l} className="bg-surface px-5 py-4"><div className="label">{l}</div><div className="num mt-1.5 text-[26px] font-extrabold leading-none text-ink">{v}</div><div className="mt-1.5 text-[12px] leading-snug text-muted">{p}</div></div>
          ))}
        </div>
        {indice.length > 0 && <nav aria-label="Secciones del informe" className="no-print flex flex-wrap gap-1.5 border-t border-line px-5 py-3">{indice.map(([id, l]) => <a key={id} href={`#inf-${id}`} className="chip hover:bg-surface-3">{l}</a>)}</nav>}
      </Card>

      {error && <p className="rounded-xl px-4 py-3 text-[13px]" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--surface))", color: "var(--bad)" }}>{error}</p>}
      {busy && <Card className="p-5"><Generando largo texto={I ? "Actualizando el informe con IA…" : "Escribiendo el informe con IA…"} /></Card>}
      {I && (data.desactualizado || anterior) && !busy && (
        <p className="no-print rounded-xl bg-gold-wash px-4 py-3 text-[13px] text-ink-soft">
          {anterior ? "Este informe se generó antes de que la plataforma cruzara la medición con la industria y el sector. Las gráficas ya usan las cifras vigentes; el texto no trae todavía ese cruce." : `La medición cambió después de este análisis. Las cifras y las gráficas son las vigentes; el texto corresponde a los datos del ${data.at ? fecha(data.at) : "análisis guardado"}.`}{cal ? " Actualízalo con IA para alinearlo." : ""}
        </p>
      )}

      {!I && !busy && (
        <Card className="p-6 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-wash)] text-[var(--gold)]"><FileText size={20} /></span>
          <h3 className="mt-4 text-[18px] font-extrabold text-ink">{cal ? "Esta medición aún no tiene informe" : "El informe aún no está disponible"}</h3>
          <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-soft">
            {!data.disponible ? "El análisis con IA no está configurado en Administración → Integraciones."
              : cal ? (data.falta ?? "El informe interpreta las cifras de la medición, los hallazgos que registraste y el contexto de la empresa, y los cruza con su industria y con su estrategia: resumen ejecutivo, patrones, lectura por línea, fortalezas y brechas, percepción frente a evidencia, cómo está la industria en lo digital, lo que exige el sector, preparación para IA, prioridades, ruta y escenarios.")
              : "El advisor lo genera a partir de la medición. Cuando esté listo, lo encuentras aquí."}
          </p>
          {cal && data.disponible && data.puedeGenerar && <button type="button" onClick={() => void generar()} className="btn-primary mt-5"><Sparkles size={15} /> Generar informe con IA</button>}
        </Card>
      )}

      {I && (
        <>
          <Seccion id="inf-resumen" icon={Compass} titulo="Resumen ejecutivo">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="space-y-3">{I.resumen.map((p, i) => <p key={i} className="text-[14px] leading-relaxed text-ink-soft">{T(p)}</p>)}
                {I.contexto_empresa && <div className="rounded-xl bg-surface-2 p-4"><div className="label">Frente al contexto de la empresa</div><p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{T(I.contexto_empresa)}</p></div>}</div>
              <div className="space-y-4"><NivelPorLinea ins={ins} caps={caps} previo={previo} /><MapaCalor ins={ins} caps={caps} /></div>
            </div>
          </Seccion>

          {!!I.patrones?.length && (
            <Seccion id="inf-patrones" icon={Layers} titulo="Patrones que atraviesan la medición" sub="lo que se repite en varias líneas y explica el resultado">
              <div className="grid gap-4 md:grid-cols-2">{I.patrones.map((x, i) => (
                <div key={i} className="break-inside-avoid rounded-xl bg-surface-2 p-4"><div className="text-[14px] font-bold text-ink">{x.titulo}</div><p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{T(x.lectura)}</p><Vars ins={ins} caps={caps} ids={x.variables} /></div>
              ))}</div>
            </Seccion>
          )}

          <Seccion id="inf-lineas" icon={Target} titulo="Lectura por línea" sub="nivel de 1 a 5 e índice de 0 a 100 de la medición vigente">
            <div className="grid gap-4 md:grid-cols-2">
              {I.lineas.map((x, i) => { const l = linea(x.linea), n = l ? lineLevel(ins, caps, l.n) : null, ix = l ? lineIndex(ins, caps, l.n) : null; return (
                <div key={i} className="break-inside-avoid rounded-xl bg-surface-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-[14px] font-bold text-ink"><i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: l?.color ?? "var(--gold)" }} />{l?.name ?? x.linea}</div>
                    <div className="flex gap-1.5 text-[12px]">
                      {n !== null && <span className="rounded-full px-2 py-0.5 font-bold text-ink" style={{ background: `color-mix(in srgb, ${nColor(n)} 26%, var(--surface))` }}>nivel <span className="num">{f1(n)}</span></span>}
                      {ix !== null && <span className="chip">índice <b className="num ml-1">{f0(ix)}</b></span>}
                    </div>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{T(x.lectura)}</p>
                  {x.causa && <p className="mt-2 text-[13px] leading-snug text-ink-soft"><b className="text-ink">Por qué está ahí.</b> {T(x.causa)}</p>}
                  {x.riesgo && <p className="mt-1.5 text-[13px] leading-snug text-ink-soft"><b className="text-ink">Qué pasa si no avanza.</b> {T(x.riesgo)}</p>}
                  {!!x.variables_clave?.length && <Vars ins={ins} caps={caps} ids={x.variables_clave} />}
                </div>
              ); })}
            </div>
            {I.dimensiones.length > 0 && (
              <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
                {I.dimensiones.map((x, i) => { const d = dimension(x.dimension), n = d ? dimLevel(ins, caps, d.key) : null; return (
                  <div key={i}><div className="flex items-baseline justify-between gap-3 text-[13.5px]"><span className="font-semibold text-ink">{d?.name ?? x.dimension}</span>{n !== null && <span className="num text-[12.5px] font-bold text-ink">{f1(n)}</span>}</div>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{T(x.lectura)}</p></div>
                ); })}
              </div>
            )}
            <div className="mt-5 grid gap-4 lg:grid-cols-2"><EstadoPracticas ins={ins} caps={caps} /><IndiceTransversal ins={ins} caps={caps} /></div>
          </Seccion>

          <div id="inf-brechas" className="grid scroll-mt-20 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <Seccion icon={TrendingUp} titulo="Fortalezas" sub="lo que la evidencia sostiene">
              {I.fortalezas.length ? <ul className="space-y-3.5">{I.fortalezas.map((x, i) => <li key={i} className="border-l-2 pl-3" style={{ borderColor: "var(--n4)" }}><div className="text-[13.5px] font-semibold text-ink">{x.variable}</div><p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{T(x.por_que)}</p></li>)}</ul>
                : <p className="text-[13.5px] text-muted">La medición todavía no tiene evidencia que respalde una fortaleza.</p>}
            </Seccion>
            <Seccion icon={AlertTriangle} titulo="Brechas que más pesan" sub="de mayor a menor efecto sobre las demás">
              <ol className="space-y-4">{I.brechas.map((x, i) => (
                <li key={i} className="grid break-inside-avoid gap-3 rounded-xl bg-surface-2 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <span className="num grid h-7 w-7 place-items-center rounded-full bg-navy text-[12px] font-bold text-white">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-bold text-ink">{x.variable}</span>{x.referente && <span className="chip">{x.referente}</span>}</div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{T(x.que_revela)}</p>
                    {x.causa_raiz && <p className="mt-1.5 text-[13px] leading-snug text-ink-soft"><b className="text-ink">Causa de fondo.</b> {T(x.causa_raiz)}</p>}
                    {x.evidencia_a_verificar && <p className="mt-1.5 text-[12.5px] leading-snug text-muted"><b className="text-ink-soft">Evidencia a verificar:</b> {x.evidencia_a_verificar}</p>}
                    {!!x.efecto_en?.length && <div className="mt-2 text-[12px] text-muted">Arrastra a:<Vars ins={ins} caps={caps} ids={x.efecto_en} /></div>}
                  </div>
                </li>
              ))}</ol>
            </Seccion>
          </div>

          <Seccion id="inf-percepcion" icon={Scale} titulo="Percepción frente a evidencia" sub="lo que se cree y lo que se demuestra">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <p className="text-[13.5px] leading-relaxed text-ink-soft">{T(I.percepcion_evidencia) || "Sin lectura disponible."}</p>
              <DispersionPE ins={ins} caps={caps} />
            </div>
          </Seccion>

          {I.sector && (
            <Seccion id="inf-industria" icon={Building2} titulo="Cómo está la industria en transformación digital" sub={S ? `empresas de la misma industria · ${S.label}` : "empresas de la misma industria"}>
              {I.sector.industria && <p className="max-w-[88ch] text-[14px] leading-relaxed text-ink-soft">{T(I.sector.industria)}</p>}
              {(!S || (S.industria.datos.length === 0 && S.industria.pares.length === 0)) && <p className="no-print mt-3 rounded-xl bg-gold-wash px-4 py-3 text-[13px] text-ink-soft">La base de Inteligencia de la empresa aún no tiene cifras de adopción digital ni iniciativas de otras empresas de su industria.{cal ? <> Se investigan en <Link href="/panel/bi?t=senales" className="font-semibold text-cyan-deep underline">Inteligencia → Señales y fuentes</Link>; después, actualiza este informe.</> : null}</p>}
              {S && (S.industria.datos.length > 0 || S.industria.pares.length > 0) && <div className="mt-5 grid gap-4 lg:grid-cols-2 lg:items-start"><AdopcionIndustria lineas={ins.lines} datos={S.industria.datos} /><ParesIndustria lineas={ins.lines} pares={S.industria.pares} /></div>}
              {!!I.sector.comparacion?.length && (
                <div className="mt-5">
                  <div className="label">La organización frente a las prácticas de la industria</div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-[12.5px]">
                      <thead><tr className="text-left text-[11.5px] text-muted"><th className="pb-2 pr-3 font-semibold">Práctica</th><th className="pb-2 pr-3 font-semibold">En la industria</th><th className="pb-2 pr-3 font-semibold">En la organización</th><th className="pb-2 font-semibold">Posición</th></tr></thead>
                      <tbody>{I.sector.comparacion.map((x, i) => (
                        <tr key={i} className="break-inside-avoid border-t border-line align-top">
                          <td className="py-2.5 pr-3 font-semibold text-ink">{x.practica}</td>
                          <td className="py-2.5 pr-3 leading-snug text-ink-soft">{T(x.industria)}</td>
                          <td className="py-2.5 pr-3 leading-snug text-ink-soft">{T(x.organizacion)}<Vars ins={ins} caps={caps} ids={x.variables} /></td>
                          <td className="py-2.5"><span className={POS[x.posicion].cls}>{POS[x.posicion].label}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </Seccion>
          )}

          {(I.sector || S) && (
            <Seccion id="inf-sector" icon={Flag} titulo="Lo que el sector le exige a la organización" sub={S && S.n > 0 ? `${S.fuente}, cierre ${S.corte}${S.mercado ? ` · ${S.mercado.fuente}` : ""}` : undefined}>
              {I.sector && <p className="max-w-[88ch] text-[14px] leading-relaxed text-ink-soft">{T(I.sector.lectura)}</p>}
              {I.sector && I.sector.lineas.length > 0 && (
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
                  <MatrizSector ins={ins} caps={caps} lineas={I.sector.lineas} />
                  <div className="space-y-3">{I.sector.lineas.map((x, i) => { const l = linea(x.linea); return (
                    <div key={i} className="break-inside-avoid rounded-xl bg-surface-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2 text-[13.5px] font-bold text-ink"><i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: l?.color ?? "var(--gold)" }} />{l?.name ?? x.linea}</div>
                        <div className="flex gap-1.5"><span className={EXIG_CLS[x.exigencia]}>exigencia {x.exigencia}</span><span className={POS[x.posicion].cls}>{POS[x.posicion].label}</span></div></div>
                      <p className="mt-1.5 text-[13px] leading-snug text-ink-soft"><b className="text-ink">Qué exige.</b> {T(x.que_exige)}</p>
                      <p className="mt-1.5 text-[13px] leading-snug text-ink-soft"><b className="text-ink">Cómo queda.</b> {T(x.lectura)}</p>
                    </div>
                  ); })}</div>
                </div>
              )}
              {S && S.n > 0 && <div className={`mt-5 grid gap-4 lg:items-start ${S.mercado ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}><SectorCifras s={S} />{S.mercado && <MercadoCanales m={S.mercado} />}{S.mercado && <MercadoPosicion m={S.mercado} />}</div>}
              {I.sector && (I.sector.oportunidades.length > 0 || I.sector.riesgos.length > 0) && (
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  {([["Oportunidades que el nivel actual deja sin capturar", I.sector.oportunidades, "var(--n4)"], ["Riesgos a los que expone el nivel actual", I.sector.riesgos, "var(--n1)"]] as const).map(([t, xs, col]) => xs.length > 0 && (
                    <div key={t}><div className="label">{t}</div>
                      <ul className="mt-2.5 space-y-3.5">{xs.map((x, i) => <li key={i} className="break-inside-avoid border-l-2 pl-3" style={{ borderColor: col }}><div className="text-[13.5px] font-semibold text-ink">{x.titulo}</div><p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{T(x.lectura)}</p><Vars ins={ins} caps={caps} ids={x.variables} /></li>)}</ul></div>
                  ))}
                </div>
              )}
              {I.sector?.regulatorio && <div className="mt-5 rounded-xl bg-surface-2 p-4"><div className="label">Regulación y referentes</div><p className="mt-1.5 max-w-[88ch] text-[13.5px] leading-relaxed text-ink-soft">{T(I.sector.regulatorio)}</p></div>}
            </Seccion>
          )}

          {!!I.estrategia?.length && (
            <Seccion id="inf-estrategia" icon={Target} titulo="Lo digital que sostiene la estrategia" sub="qué tanto depende cada prioridad de capacidades digitales y con qué nivel cuenta">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
                <BarrasEstrategia caps={caps} estrategia={I.estrategia} />
                <div className="space-y-3">{I.estrategia.map((x, i) => { const { nivel } = nivelDe(caps, x.variables); return (
                  <div key={i} className="break-inside-avoid rounded-xl bg-surface-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[13.5px] font-bold text-ink">{x.prioridad}</span>
                      <div className="flex gap-1.5"><span className={EXIG_CLS[x.dependencia]}>dependencia {x.dependencia}</span>{nivel !== null && <span className="rounded-full px-2 py-0.5 text-[12px] font-bold text-ink" style={{ background: `color-mix(in srgb, ${nColor(nivel)} 26%, var(--surface))` }}>nivel <span className="num">{f1(nivel)}</span></span>}</div></div>
                    <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">{T(x.lectura)}</p><Vars ins={ins} caps={caps} ids={x.variables} />
                  </div>
                ); })}</div>
              </div>
            </Seccion>
          )}

          <Seccion id="inf-ia" icon={ShieldCheck} titulo="Preparación para inteligencia artificial">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div><p className="text-[13.5px] leading-relaxed text-ink-soft">{T(I.preparacion_ia) || "Sin lectura disponible."}</p>
                {!!I.ia_condiciones?.length && <div className="mt-4"><div className="label">Antes de escalar inteligencia artificial</div><ul className="mt-2 space-y-1.5">{I.ia_condiciones.map((c, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-soft"><span className="num font-bold text-[var(--gold)]">{i + 1}.</span><span>{T(c)}</span></li>)}</ul></div>}</div>
              <ComponentesIA ins={ins} caps={caps} sg={sg} />
            </div>
          </Seccion>

          <Seccion id="inf-prioridades" icon={Target} titulo="Prioridades" sub="qué va primero, por qué ahora y cuál es el primer paso">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
              <ol className="space-y-4">{I.prioridades.map((x, i) => (
                <li key={i} className="grid break-inside-avoid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <span className="num grid h-8 w-8 place-items-center rounded-full bg-[var(--gold-fill)] text-[13px] font-extrabold text-[#0D1B2A]">{i + 1}</span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-bold text-ink">{x.variable}</span>{x.plazo && <span className="chip">{x.plazo}</span>}{x.impacto && <span className={GRADO_CLS(x.impacto, "alto")}>impacto {x.impacto}</span>}{x.esfuerzo && <span className={GRADO_CLS(x.esfuerzo, "bajo")}>esfuerzo {x.esfuerzo}</span>}</div>
                    {x.por_que_ahora && <p className="mt-1 text-[13px] leading-snug text-ink-soft"><b className="text-ink">Por qué ahora.</b> {T(x.por_que_ahora)}</p>}
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft"><b className="text-ink">Primer paso.</b> {T(x.primer_paso)}</p>
                    {x.resultado_esperado && <p className="mt-1.5 text-[12.5px] leading-snug text-muted"><b className="text-ink-soft">Queda como evidencia:</b> {x.resultado_esperado}</p>}</div>
                </li>
              ))}</ol>
              <MatrizPrioridades prioridades={I.prioridades} />
            </div>
          </Seccion>

          {I.ruta.length > 0 && (
            <Seccion id="inf-ruta" icon={Route} titulo="Ruta sugerida y escenarios">
              <div className="grid gap-4 md:grid-cols-3">{I.ruta.map((x, i) => (
                <div key={i} className="break-inside-avoid rounded-xl bg-surface-2 p-4"><div className="num text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--gold-text)]">{x.horizonte}</div><p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{T(x.foco)}</p>
                  {!!x.hitos?.length && <ul className="mt-2.5 space-y-1.5 border-t border-line pt-2.5">{x.hitos.map((h, k) => <li key={k} className="flex gap-2 text-[12.5px] leading-snug text-ink-soft"><i className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[var(--gold)]" />{h}</li>)}</ul>}</div>
              ))}</div>
              {I.escenarios && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="break-inside-avoid rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))" }}><div className="label">Si no se actúa</div><p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{T(I.escenarios.si_no_se_actua)}</p></div>
                  <div className="break-inside-avoid rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--ok) 9%, var(--surface))" }}><div className="label">Si se ejecutan las prioridades</div><p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{T(I.escenarios.si_se_ejecuta)}</p></div>
                </div>
              )}
              {!!I.indicadores?.length && (
                <div className="mt-5"><div className="label">Indicadores para seguir el avance</div>
                  <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[560px] text-[12.5px]">
                    <thead><tr className="text-left text-[11.5px] text-muted"><th className="pb-2 pr-3 font-semibold">Indicador</th><th className="pb-2 pr-3 font-semibold">Hoy</th><th className="pb-2 pr-3 font-semibold">A doce meses</th><th className="pb-2 font-semibold">De dónde sale</th></tr></thead>
                    <tbody>{I.indicadores.map((x, i) => <tr key={i} className="border-t border-line align-top"><td className="py-2 pr-3 font-semibold text-ink">{x.indicador}</td><td className="py-2 pr-3 text-ink-soft">{x.linea_base}</td><td className="py-2 pr-3 text-ink-soft">{x.meta}</td><td className="py-2 text-muted">{x.fuente}</td></tr>)}</tbody>
                  </table></div></div>
              )}
            </Seccion>
          )}

          <Seccion icon={Lightbulb} titulo="Preguntas para la sesión de devolución">
            <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">{I.preguntas.map((q, i) => <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink-soft"><span className="num font-bold text-[var(--gold)]">{i + 1}.</span><span>{T(q)}</span></li>)}</ul>
          </Seccion>

          {!!I.fuentes?.length && (
            <Seccion id="inf-fuentes" icon={BookOpen} titulo="Fuentes del sector citadas" sub="los hechos en los que se apoya el cruce con la industria">
              <ol className="space-y-2.5">{I.fuentes.map((f) => (
                <li key={f.n} id={`fuente-${f.n}`} className="grid scroll-mt-24 grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-[12.5px] leading-snug">
                  <span className="cita mt-0.5">{f.n}</span>
                  <div><p className="text-ink-soft">{f.hecho}{f.nota ? <span className="text-muted"> ({f.nota})</span> : null}</p>
                    <p className="mt-0.5 text-muted">{f.editor} · {f.fecha} · <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-deep hover:underline">{f.titulo}</a></p></div>
                </li>
              ))}</ol>
            </Seccion>
          )}

          {I.nota_metodologica && <p className="px-1 text-[12.5px] leading-relaxed text-muted"><b className="text-ink-soft">Nota metodológica.</b> {I.nota_metodologica} El análisis lo redacta un modelo de IA a partir de las cifras y los hallazgos de la medición; las cifras y las gráficas de este informe son las de la plataforma. La comparación con la industria se apoya en hechos publicados por terceros, cada uno con su fuente: no existe una medición de madurez digital de las demás empresas del sector.</p>}
        </>
      )}
    </div>
  );
}
