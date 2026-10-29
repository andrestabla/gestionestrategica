"use client";

// Informe del diagnóstico con IA: vista del informe (también la usa la página pública de solo lectura) y el
// bloque interactivo que lo genera, actualiza, descarga en PDF (impresión del navegador) y comparte.

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, EmptyNote, Skeleton } from "@/components/ui";
import { avisar } from "@/components/feedback";
import type { InformeIA as Informe, InformeKind } from "@/lib/informe-ia";
import { Sparkles, RefreshCw, Printer, Link2, Loader2, AlertTriangle } from "lucide-react";

export function InformeView({ informe, meta }: { informe: Informe; meta?: string }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="kicker mb-1">Análisis del advisor · con IA, según el método 4Shine Empresas</div>
        <h2 className="text-[20px] font-extrabold leading-tight text-ink">{informe.titulo}</h2>
        {meta && <div className="mt-1 text-[12px] text-muted">{meta}</div>}
      </div>
      <div className="space-y-3 text-[14px] leading-relaxed text-ink-soft">{informe.resumen.map((p, i) => <p key={i}>{p}</p>)}</div>
      <section>
        <h3 className="mb-2 text-[15px] font-extrabold text-ink">Las cuatro capacidades</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {informe.capacidades.map((c) => (
            <div key={c.capacidad} className="rounded-xl bg-surface-2/70 px-4 py-3">
              <div className="flex items-baseline justify-between"><b className="text-[13.5px] text-ink">{c.capacidad}</b>{c.puntaje != null && <span className="num text-[13px] font-bold text-ink">{c.puntaje.toFixed(2).replace(".", ",")}</span>}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{c.lectura}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[15px] font-extrabold text-ink">Fortalezas que sostienen</h3>
          <ul className="space-y-2">{informe.fortalezas.map((f) => <li key={f.dimension} className="rounded-xl border border-line px-4 py-3 text-[13px]"><b className="text-ink">{f.dimension}.</b> <span className="text-ink-soft">{f.por_que}</span></li>)}</ul>
        </section>
        <section>
          <h3 className="mb-2 text-[15px] font-extrabold text-ink">Brechas y qué las demostraría</h3>
          <ul className="space-y-2">
            {informe.brechas.length === 0 && <li className="text-[13px] italic text-faint">Ninguna dimensión bajo el umbral en esta lectura.</li>}
            {informe.brechas.map((b) => (
              <li key={b.dimension} className="rounded-xl border border-line px-4 py-3 text-[13px]">
                <div className="flex items-baseline justify-between gap-3"><b className="text-ink">{b.dimension}</b>{b.puntaje != null && <span className="num font-bold text-bad">{b.puntaje.toFixed(2).replace(".", ",")}</span>}</div>
                <p className="mt-1 text-ink-soft">{b.que_revela}</p>
                {b.evidencia_a_verificar && <p className="mt-1.5 text-[12.5px] text-muted"><b className="text-ink">Evidencia a verificar.</b> {b.evidencia_a_verificar}</p>}
                {b.framework && <p className="mt-1 text-[12.5px] text-muted"><b className="text-ink">Framework.</b> {b.framework}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {informe.dispersion && informe.dispersion.length > 0 && (
        <section>
          <h3 className="mb-2 text-[15px] font-extrabold text-ink">Donde el comité no coincide</h3>
          <ul className="space-y-2">{informe.dispersion.map((d) => <li key={d.dimension} className="rounded-xl bg-gold-wash px-4 py-3 text-[13px]"><b className="text-ink">{d.dimension}.</b> <span className="text-ink-soft">{d.lectura}</span></li>)}</ul>
        </section>
      )}
      <section>
        <h3 className="mb-2 text-[15px] font-extrabold text-ink">Patrones y causa raíz</h3>
        <p className="text-[13.5px] leading-relaxed text-ink-soft">{informe.patrones}</p>
      </section>
      <section>
        <h3 className="mb-2 text-[15px] font-extrabold text-ink">Por dónde empezar · próximos 90 días</h3>
        <ol className="space-y-2">
          {informe.prioridades.map((p, i) => (
            <li key={`${p.orden}-${p.dimension}`} className="flex gap-3 rounded-xl border border-line px-4 py-3 text-[13px]">
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: "var(--navy)" }}>{p.orden || i + 1}</span>
              <div><b className="text-ink">{p.dimension}</b>{p.framework && <span className="text-muted"> · {p.framework}</span>}<p className="mt-1 text-ink-soft">{p.primer_paso}</p></div>
            </li>
          ))}
        </ol>
      </section>
      {informe.nivel_acompanamiento && (
        <section className="rounded-2xl px-5 py-4 text-white" style={{ background: "var(--grad-deep)" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Nivel de acompañamiento sugerido</div>
          <div className="text-[17px] font-extrabold">{informe.nivel_acompanamiento.nivel}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-white/85">{informe.nivel_acompanamiento.por_que}</p>
        </section>
      )}
      <section>
        <h3 className="mb-2 text-[15px] font-extrabold text-ink">Preguntas para la devolución</h3>
        <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-ink-soft">{informe.preguntas.map((q, i) => <li key={i}>{q}</li>)}</ul>
      </section>
      {informe.nota_metodologica && <p className="rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] italic leading-relaxed text-muted">{informe.nota_metodologica}</p>}
    </div>
  );
}

type Api = { disponible: boolean; informe: Informe | null; at: string | null; by: string | null; model: string | null; desactualizado: boolean; shareUrl?: string | null; sujeto?: string };

export function InformeIA({ kind, email, canShare = false, titulo = "Análisis con IA" }: { kind: InformeKind; email?: string | null; canShare?: boolean; titulo?: string }) {
  const [data, setData] = useState<Api | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = `kind=${kind}${email ? `&email=${encodeURIComponent(email)}` : ""}`;
  const load = useCallback(async () => {
    try { const r = await fetch(`/api/td/diagnostico/informe?${q}`); if (r.ok) setData(await r.json()); else setError((await r.json().catch(() => ({}))).error ?? `Error ${r.status}`); } catch { setError("No se pudo conectar con el servidor."); }
  }, [q]);
  useEffect(() => { void load(); }, [load]);
  const generar = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/td/diagnostico/informe?${q}`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(j.error ?? `Error ${r.status}`); else { setData(j); avisar(data?.informe ? "Análisis actualizado" : "Análisis generado"); }
    } catch { setError("No se pudo conectar con el servidor."); }
    setBusy(false);
  };
  const compartir = async () => {
    if (!data?.shareUrl) return;
    if (navigator.share) { try { await navigator.share({ title: "Informe consolidado del diagnóstico", url: data.shareUrl }); return; } catch { /* cancelado */ } }
    await navigator.clipboard.writeText(data.shareUrl); avisar("Enlace copiado: quien lo tenga ve el informe consolidado, sin nombres");
  };
  const fecha = data?.at ? new Date(data.at).toLocaleString("es-CO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <Card className="rise mt-5 overflow-hidden">
      <CardHeader title={titulo} sub={kind === "f1" ? "lectura profunda y cualitativa de tu autoevaluación, según el método 4Shine Empresas" : "lectura profunda y cualitativa del comité, según el método 4Shine Empresas"}
        right={<span className="no-print flex flex-wrap items-center gap-2">
          {data?.informe && <button type="button" onClick={() => window.print()} className="btn-ghost btn-sm" title="Se abre el diálogo de impresión: elige «Guardar como PDF»"><Printer size={13} /> Descargar PDF</button>}
          {canShare && data?.shareUrl && data.informe && <button type="button" onClick={compartir} className="btn-ghost btn-sm"><Link2 size={13} /> Compartir enlace</button>}
          {data?.disponible && <button type="button" onClick={generar} disabled={busy} className={`${data.informe ? "btn-ghost" : "btn-primary"} btn-sm`}>{busy ? <Loader2 size={13} className="animate-spin" /> : data.informe ? <RefreshCw size={13} /> : <Sparkles size={13} />} {busy ? "Analizando…" : data.informe ? "Actualizar análisis" : "Generar análisis"}</button>}
        </span>} />
      <div className="px-5 pb-5">
        {!data && !error && <><Skeleton className="h-5 w-72" /><Skeleton className="mt-3 h-24" /></>}
        {error && <p className="mb-3 flex items-start gap-2 rounded-xl px-4 py-2.5 text-[12.5px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 12%, var(--surface))" }}><AlertTriangle size={14} className="mt-0.5 shrink-0 text-bad" /> {error}</p>}
        {data && !data.disponible && !data.informe && <EmptyNote>El análisis con IA requiere el modelo configurado en Administración → Integraciones (OpenAI). Con la clave activa, el botón «Generar análisis» aparece aquí.</EmptyNote>}
        {data?.disponible && !data.informe && !busy && <EmptyNote>{kind === "f1" ? "Genera tu análisis: el advisor virtual lee tus 68 respuestas con el método y te devuelve fortalezas, brechas, patrones y por dónde empezar. Tarda menos de un minuto." : "Genera el análisis consolidado del comité: capacidades, dispersión entre miembros, causa raíz y nivel de acompañamiento. Tarda menos de un minuto."}</EmptyNote>}
        {busy && !data?.informe && <div className="py-6 text-center text-[13px] text-muted"><Loader2 size={18} className="mx-auto mb-2 animate-spin text-cyan-deep" />Leyendo la autoevaluación con el método…</div>}
        {data?.informe && (
          <>
            {data.desactualizado && <p className="no-print mb-3 rounded-xl bg-gold-wash px-4 py-2.5 text-[12.5px] text-ink-soft"><b className="text-ink">Hay respuestas nuevas desde este análisis.</b> Actualízalo para que refleje la lectura vigente.</p>}
            <InformeView informe={data.informe} meta={`${fecha ? `Generado el ${fecha}` : ""}${data.by ? ` · solicitado por ${data.by}` : ""}${data.model ? ` · modelo ${data.model}` : ""}`} />
          </>
        )}
      </div>
    </Card>
  );
}
