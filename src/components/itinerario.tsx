"use client";

// Itinerario de la convención: línea de tiempo vertical por día, modal por
// momento (metodología, materiales, plataforma, salida) y comentarios
// metodológicos o logísticos del equipo organizador. Sirve dentro de la
// plataforma (modo sesión) y en el enlace público (modo público).
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui";
import { ITINERARY_KINDS, COMMENT_KINDS, type Itinerary, type ItineraryItem, type ItineraryComment, type ItineraryKind, type CommentKind } from "@/lib/itinerario";
import { MessageSquare, CheckCircle2, Trash2, Link2, RefreshCw, Upload, Globe, Lock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const KIND_CLS: Record<ItineraryKind, string> = {
  conferencia: "bg-[#8A6D1F] text-white", mesa: "bg-[#D4AF37] text-[#0D1B2A]", taller: "bg-[#0B6F88] text-white", plenaria: "bg-[#0D1B2A] text-white",
  break: "bg-[#B6BDC7] text-[#0D1B2A]", energizacion: "bg-[#B6BDC7] text-[#0D1B2A]", logistica: "bg-[#4C078C] text-white",
};
const DOT: Record<ItineraryKind, string> = { conferencia: "#8A6D1F", mesa: "#D4AF37", taller: "#0B6F88", plenaria: "#0D1B2A", break: "#B6BDC7", energizacion: "#B6BDC7", logistica: "#4C078C" };
const FILTERS: { k: ItineraryKind | "all"; label: string }[] = [{ k: "all", label: "Todo" }, { k: "mesa", label: "Mesa redonda" }, { k: "taller", label: "Talleres" }, { k: "conferencia", label: "Conferencias" }, { k: "plenaria", label: "Plenarias" }];

export function ItinerarioView({ itinerary, comments, mode, company, canManage = false, publicUrl = null, error = null, busy = false, onComment, onPublish, onUpload, onResolve, onDelete }: {
  itinerary: Omit<Itinerary, "token">; comments: ItineraryComment[]; mode: "sesion" | "publico"; company?: { name: string; shortName: string };
  canManage?: boolean; publicUrl?: string | null; error?: string | null; busy?: boolean;
  onComment: (momentId: string, kind: CommentKind, text: string, author?: string, email?: string) => Promise<boolean>;
  onPublish?: (on: boolean, regenerate?: boolean) => Promise<void>;
  onUpload?: (json: unknown) => Promise<void>;
  onResolve?: (id: string, resolved: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<ItineraryKind | "all">("all");
  const [open, setOpen] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const items = useMemo(() => itinerary.items, [itinerary]);
  const byMoment = useMemo(() => { const m = new Map<string, ItineraryComment[]>(); for (const c of comments) { const l = m.get(c.momentId) ?? []; l.push(c); m.set(c.momentId, l); } return m; }, [comments]);
  const pending = comments.filter((c) => !c.resolvedAt).length;
  const cur = open >= 0 ? items[open] : null;
  const pub = mode === "publico";

  return (
    <div className={pub ? "mx-auto max-w-[960px] px-4 py-6 sm:px-6" : ""}>
      {pub && (
        <div className="mb-6 rounded-2xl bg-[#0D1B2A] px-5 py-6 text-white">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">{company?.name ?? ""} · 4Shine Empresas</div>
          <h1 className="mt-1.5 text-[24px] font-extrabold leading-tight sm:text-[30px]">{itinerary.title}</h1>
          {itinerary.sub && <p className="mt-1.5 max-w-2xl text-[13.5px] text-white/75">{itinerary.sub}</p>}
          <p className="mt-3 text-[12px] text-white/60">Toca cada momento para ver la metodología, los materiales, el uso de la plataforma y el resultado esperado, y para dejar comentarios metodológicos o logísticos.</p>
        </div>
      )}
      {!pub && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-muted">{itinerary.sub ?? "Ruta de la convención, momento a momento: metodología, materiales, plataforma y salida."}{pending ? <> · <b className="text-ink">{pending}</b> comentario{pending === 1 ? "" : "s"} por atender</> : null}</p>
          {canManage && (
            <span className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
              <label className="btn-ghost cursor-pointer !py-1.5 text-[11.5px]"><Upload size={12} /> Cargar JSON<input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !onUpload) return; try { await onUpload(JSON.parse(await f.text())); } catch { alert("El archivo no es un JSON válido."); } e.target.value = ""; }} /></label>
              {itinerary.public
                ? <button type="button" onClick={() => onPublish?.(false)} disabled={busy} className="btn-ghost !py-1.5 text-[11.5px]"><Lock size={12} /> Retirar del público</button>
                : <button type="button" onClick={() => onPublish?.(true)} disabled={busy} className="btn-primary !py-1.5 text-[11.5px]"><Globe size={12} /> Publicar sin login</button>}
              {itinerary.public && publicUrl && <button type="button" onClick={async () => { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost !py-1.5 text-[11.5px]">{copied ? <CheckCircle2 size={12} /> : <Link2 size={12} />} {copied ? "Copiado" : "Copiar enlace público"}</button>}
              {itinerary.public && <button type="button" onClick={() => { if (confirm("El enlace anterior dejará de valer. ¿Regenerar?")) void onPublish?.(true, true); }} disabled={busy} className="btn-ghost !py-1.5 text-[11.5px]" title="Cambia el enlace público"><RefreshCw size={12} /></button>}
            </span>
          )}
        </div>
      )}
      {!pub && itinerary.public && publicUrl && <p className="num mb-4 break-all rounded-xl bg-cyan-wash/60 px-3 py-2 text-[11.5px] text-ink"><Globe size={12} className="mr-1 inline text-cyan-deep" /> Público en {publicUrl}</p>}
      {error && <p className="mb-3 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, white)" }}>{error}</p>}

      <div className="sticky top-[54px] z-10 -mx-1 mb-4 flex flex-wrap gap-1.5 bg-surface-2/90 px-1 py-2 backdrop-blur sm:top-0">
        {itinerary.days.map((d) => <a key={d.id} href={`#dia-${d.id}`} className="chip !py-1 text-[11px] font-bold">{d.title.split(" · ")[0]}</a>)}
        {FILTERS.map((f) => <button key={f.k} type="button" onClick={() => setFilter(f.k)} className={`chip !py-1 text-[11px] font-bold ${filter === f.k ? "!bg-[#0D1B2A] !text-white" : ""}`}>{f.label}</button>)}
      </div>

      {itinerary.days.map((d) => {
        const list = items.map((it, i) => ({ it, i })).filter(({ it }) => it.day === d.id && (filter === "all" || it.kind === filter));
        const total = items.filter((it) => it.day === d.id).reduce((a, it) => a + it.minutes, 0);
        return (
          <section key={d.id} id={`dia-${d.id}`} className="mb-7 scroll-mt-24">
            <h2 className="text-[18px] font-extrabold text-ink">{d.title}</h2>
            <p className="mb-3 text-[12.5px] text-muted">{d.sub ? `${d.sub} · ` : ""}{items.filter((it) => it.day === d.id).length} momentos · {Math.round(total / 6) / 10} horas de agenda</p>
            <div className="relative pl-7 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-[2px] before:bg-gradient-to-b before:from-[#D4AF37] before:to-[#0D1B2A]">
              {list.map(({ it, i }) => {
                const n = byMoment.get(it.id)?.length ?? 0, pend = (byMoment.get(it.id) ?? []).filter((c) => !c.resolvedAt).length;
                const soft = it.kind === "break" || it.kind === "energizacion";
                return (
                  <button key={it.id} type="button" onClick={() => setOpen(i)}
                    className={`relative mb-2 grid w-full grid-cols-[54px_1fr] items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all active:bg-cyan-wash sm:grid-cols-[62px_1fr_auto] ${soft ? "border-dashed border-line bg-transparent" : "border-line bg-surface hover:-translate-y-px hover:shadow-sm"}`}>
                    <span className="absolute -left-[23px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-[3px] bg-white" style={{ borderColor: DOT[it.kind], background: it.kind === "mesa" ? DOT.mesa : "#fff" }} />
                    <span className="num text-[13px] font-extrabold text-ink">{it.time}{it.minutes ? <small className="block text-[10.5px] font-semibold text-muted">{it.minutes} min</small> : null}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold leading-snug text-ink">{it.title}</span>
                      <span className="block text-[11.5px] text-muted">{it.who}</span>
                      {n > 0 && <span className={`mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold ${pend ? "text-warn" : "text-faint"}`}><MessageSquare size={11} /> {n} comentario{n === 1 ? "" : "s"}{pend ? ` · ${pend} por atender` : ""}</span>}
                    </span>
                    <span className={`col-start-2 justify-self-start rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider sm:col-start-3 ${KIND_CLS[it.kind]}`}>{ITINERARY_KINDS[it.kind]}</span>
                  </button>
                );
              })}
              {list.length === 0 && <p className="text-[12px] italic text-faint">Sin momentos de este tipo.</p>}
            </div>
          </section>
        );
      })}

      {cur && <MomentModal it={cur} day={itinerary.days.find((d) => d.id === cur.day)?.title ?? ""} comments={byMoment.get(cur.id) ?? []} pub={pub} canManage={canManage} busy={busy}
        onClose={() => setOpen(-1)} onPrev={open > 0 ? () => setOpen(open - 1) : undefined} onNext={open < items.length - 1 ? () => setOpen(open + 1) : undefined}
        onComment={onComment} onResolve={onResolve} onDelete={onDelete} />}
    </div>
  );
}

function MomentModal({ it, day, comments, pub, canManage, busy, onClose, onPrev, onNext, onComment, onResolve, onDelete }: {
  it: ItineraryItem; day: string; comments: ItineraryComment[]; pub: boolean; canManage: boolean; busy: boolean; onClose: () => void; onPrev?: () => void; onNext?: () => void;
  onComment: (momentId: string, kind: CommentKind, text: string, author?: string, email?: string) => Promise<boolean>;
  onResolve?: (id: string, resolved: boolean) => Promise<void>; onDelete?: (id: string) => Promise<void>;
}) {
  const [kind, setKind] = useState<CommentKind>("metodologico");
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(() => { try { return localStorage.getItem("itin-autor") ?? ""; } catch { return ""; } });
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("itin-correo") ?? ""; } catch { return ""; } });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const send = async () => {
    setSending(true); setDone(false);
    try { localStorage.setItem("itin-autor", author); localStorage.setItem("itin-correo", email); } catch { /* sin almacenamiento */ }
    const ok = await onComment(it.id, kind, text, pub ? author : undefined, pub ? email : undefined);
    if (ok) { setText(""); setDone(true); }
    setSending(false);
  };
  return (
    <Modal title={it.title} sub={`${day.split(" · ")[0]} · ${it.time}${it.minutes ? ` · ${it.minutes} min` : ""} · ${ITINERARY_KINDS[it.kind]} · ${it.who}`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onPrev} disabled={!onPrev} className="btn-ghost mr-auto !py-2 text-[12px] disabled:opacity-40"><ChevronLeft size={13} /> Anterior</button>
        <button type="button" onClick={onNext} disabled={!onNext} className="btn-ghost !py-2 text-[12px] disabled:opacity-40">Siguiente <ChevronRight size={13} /></button>
      </>}>
      <div className="space-y-4 text-[13.5px]">
        <div><div className="label !text-[9px]">Metodología · dinámica y resultado</div><p className="mt-1 leading-relaxed text-ink">{it.method || "—"}</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#FAF4E3] px-3.5 py-3"><div className="label !text-[9px]">Materiales físicos</div>{it.materials.length ? <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-ink">{it.materials.map((m, i) => <li key={i}>{m}</li>)}</ul> : <p className="mt-1 text-[13px] text-muted">—</p>}</div>
          <div className="rounded-xl bg-cyan-wash/60 px-3.5 py-3"><div className="label !text-[9px]">Plataforma y pantalla</div><p className="mt-1 text-[13px] text-ink">{it.platform || "—"}</p></div>
        </div>
        <div><div className="label !text-[9px]">Salida del momento</div><p className="mt-1 text-ink">{it.output || "—"}</p></div>

        <div className="border-t border-line pt-3">
          <div className="label !text-[9px]">Comentarios del equipo organizador ({comments.length})</div>
          <div className="mt-2 space-y-2">
            {comments.length === 0 && <p className="text-[12px] italic text-faint">Aún no hay comentarios sobre este momento.</p>}
            {comments.map((c) => (
              <div key={c.id} className={`rounded-xl px-3 py-2.5 ${c.resolvedAt ? "bg-surface-2/50" : "bg-surface-2"}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`chip !py-0 text-[9.5px] ${c.kind === "metodologico" ? "chip-cyan" : "chip-gold"}`}>{COMMENT_KINDS[c.kind]}</span>
                  <b className="text-ink">{c.author}</b><span className="text-faint">· {new Date(c.at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{c.via === "publico" ? " · enlace público" : ""}</span>
                  {c.resolvedAt && <span className="chip chip-ok !py-0 text-[9.5px]">atendido · {c.resolvedBy}</span>}
                  {canManage && !pub && <span className="ml-auto flex gap-1">
                    <button type="button" onClick={() => onResolve?.(c.id, !c.resolvedAt)} disabled={busy} className="rounded-md p-1 text-faint hover:bg-surface hover:text-ok" title={c.resolvedAt ? "Marcar como pendiente" : "Marcar como atendido"}><CheckCircle2 size={13} /></button>
                    <button type="button" onClick={() => { if (confirm("¿Eliminar el comentario?")) void onDelete?.(c.id); }} disabled={busy} className="rounded-md p-1 text-faint hover:bg-surface hover:text-bad" title="Eliminar"><Trash2 size={13} /></button>
                  </span>}
                </div>
                <p className={`mt-1 text-[12.5px] leading-snug ${c.resolvedAt ? "text-muted" : "text-ink"}`}>{c.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-line px-3.5 py-3">
            <div className="text-[12px] font-bold text-ink">Dejar un comentario</div>
            {pub && <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Tu nombre" autoComplete="name" className="input !py-2 text-[13px]" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo (opcional)" type="email" autoComplete="email" inputMode="email" className="input !py-2 text-[13px]" />
            </div>}
            <div className="mt-2 grid gap-2 sm:grid-cols-[180px_1fr]">
              <select value={kind} onChange={(e) => setKind(e.target.value as CommentKind)} className="input !py-2 text-[13px]"><option value="metodologico">Metodológico</option><option value="logistico">Logístico</option></select>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1200} placeholder="Qué cambiarías, qué falta, qué hay que prever…" className="input !py-2 text-[13px]" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {done && <span className="text-[11.5px] text-ok"><CheckCircle2 size={12} className="mr-1 inline" />Comentario registrado</span>}
              <button type="button" onClick={send} disabled={sending || text.trim().length < 3 || (pub && author.trim().length < 3)} className="btn-primary ml-auto !py-2 text-[12px] disabled:opacity-40">{sending ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />} Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
