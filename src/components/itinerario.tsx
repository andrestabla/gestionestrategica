"use client";

// Itinerario de la convención: línea de tiempo vertical por día, modal por
// momento (descripción, metodología, materiales, plataforma) y comentarios
// metodológicos o logísticos del equipo organizador. Sirve dentro de la
// plataforma (modo sesión) y en el enlace público (modo público).
import { useMemo, useState } from "react";
import { Modal, AutoTextarea } from "@/components/ui";
import { ITINERARY_KINDS, COMMENT_KINDS, materialHref, fileKindOf, linkHost, URL_RE, type Itinerary, type ItineraryItem, type ItineraryComment, type ItineraryKind, type CommentKind, type ItineraryFile } from "@/lib/itinerario";
import { consentSummary } from "@/lib/consentimiento";
import { MessageSquare, CheckCircle2, Trash2, Link2, RefreshCw, Upload, Globe, Lock, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, ArrowUp, ArrowDown, FileText, Presentation, ExternalLink } from "lucide-react";

const KIND_CLS: Record<ItineraryKind, string> = {
  conferencia: "bg-[#8A6D1F] text-white", mesa: "bg-[#D4AF37] text-[#0D1B2A]", taller: "bg-[#0B6F88] text-white", plenaria: "bg-[#0D1B2A] text-white",
  break: "bg-[#B6BDC7] text-[#0D1B2A]", energizacion: "bg-[#B6BDC7] text-[#0D1B2A]", logistica: "bg-[#4C078C] text-white",
};
const DOT: Record<ItineraryKind, string> = { conferencia: "#8A6D1F", mesa: "#D4AF37", taller: "#0B6F88", plenaria: "#0D1B2A", break: "#B6BDC7", energizacion: "#B6BDC7", logistica: "#4C078C" };
/** Con tema del evento, los tipos se tiñen con sus colores: acento para la mesa, fondo para plenarias, gris oscuro para talleres. */
const kindStyle = (kind: ItineraryKind, accent: string, bg: string): { background: string; color: string } => {
  switch (kind) {
    case "mesa": return { background: accent, color: "#fff" };
    case "conferencia": return { background: `${accent}CC`, color: "#fff" };
    case "plenaria": return { background: bg, color: "#fff" };
    case "taller": return { background: "#2B2B33", color: "#fff" };
    case "logistica": return { background: "#55555F", color: "#fff" };
    default: return { background: "#C9CBD3", color: bg };
  }
};
const FILTERS: { k: ItineraryKind | "all"; label: string }[] = [{ k: "all", label: "Todo" }, { k: "mesa", label: "Mesa redonda" }, { k: "taller", label: "Talleres" }, { k: "conferencia", label: "Conferencias" }, { k: "plenaria", label: "Plenarias" }];

export function ItinerarioView({ itinerary, comments, mode, audience = "organizador", company, canManage = false, publicUrl = null, publicUrlP = null, error = null, busy = false, onComment, onPublish, onUpload, onResolve, onDelete, onSave, onUploadFile, onRemoveFile, onMomentFiles, onUploadMomentFile, onAddLink, publicRef }: {
  itinerary: Omit<Itinerary, "token" | "tokenP">; comments: ItineraryComment[]; mode: "sesion" | "publico"; audience?: "organizador" | "participantes"; company?: { name: string; shortName: string };
  canManage?: boolean; publicUrl?: string | null; publicUrlP?: string | null; error?: string | null; busy?: boolean;
  onComment: (momentId: string, kind: CommentKind, text: string, author?: string, email?: string, consent?: boolean) => Promise<boolean>;
  onPublish?: (on: boolean, regenerate?: boolean, audience?: "organizador" | "participantes") => Promise<void>;
  onUpload?: (json: unknown) => Promise<void>;
  onResolve?: (id: string, resolved: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSave?: (itinerary: Omit<Itinerary, "token">) => Promise<boolean>;   // edición de textos (advisor o gerencia)
  onUploadFile?: (file: File, group: string) => Promise<boolean>;         // sube un PDF a los materiales
  onRemoveFile?: (id: string) => Promise<boolean>;
  onMomentFiles?: (momentId: string, fileIds: string[]) => Promise<boolean>;
  onUploadMomentFile?: (momentId: string, file: File) => Promise<boolean>;   // sube un PDF o PowerPoint y lo deja vinculado a ese momento
  onAddLink?: (name: string, url: string, momentId?: string) => Promise<boolean>;   // añade un enlace como material (y lo vincula al momento, si se indica)
  publicRef?: { slug: string; token: string };                             // en el enlace público, para abrir los PDF
}) {
  const [filter, setFilter] = useState<ItineraryKind | "all">("all");
  const [editHeader, setEditHeader] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const files = itinerary.files ?? [];
  const fileHref = (f: ItineraryFile) => materialHref(f, publicRef);
  // identidad visual del evento: con tema, cabecera oscura con el color de acento del cliente; sin tema, la identidad de la plataforma
  const th = itinerary.theme;
  const accent = th?.accent ?? "#D4AF37", bg = th?.bg ?? "#0D1B2A";
  // con foto de fondo, un velo oscuro casi opaco sobre la mitad izquierda (donde va el texto) que se abre hacia la derecha: contraste garantizado sobre cualquier foto
  const heroStyle = th?.image
    ? { backgroundImage: `linear-gradient(100deg, ${bg} 0%, ${bg} 34%, ${bg}E6 52%, ${bg}8C 72%, ${bg}40 100%), linear-gradient(180deg, ${bg}33 0%, transparent 40%, ${bg}B3 100%), url("${th.image}")`, backgroundSize: "cover", backgroundPosition: "center right", backgroundColor: bg }
    : { background: th ? `radial-gradient(circle at 88% 20%, ${accent}55, transparent 42%), linear-gradient(135deg, ${bg} 0%, ${bg} 70%, ${accent}22 100%)` : bg };
  const titleCls = th ? "uppercase tracking-tight font-black" : "font-extrabold";
  const [editDay, setEditDay] = useState<string | null>(null);
  const editable = !pubMode(mode) && canManage && !!onSave;
  const save = (patch: Partial<Omit<Itinerary, "token">>) => onSave ? onSave({ ...itinerary, ...patch }) : Promise.resolve(false);
  const newId = (day: string) => { let n = 1; while (itinerary.items.some((x) => x.id === `${day}-${String(n).padStart(2, "0")}`)) n++; return `${day}-${String(n).padStart(2, "0")}`; };
  const addMoment = (day: string) => {
    const last = [...itinerary.items].reverse().find((x) => x.day === day);
    const it: ItineraryItem = { id: newId(day), day, time: last?.time ?? "8:00", minutes: 15, title: "Nuevo momento", kind: "plenaria", who: "", description: "", method: "", materials: [], platform: "" };
    const idx = last ? itinerary.items.indexOf(last) + 1 : itinerary.items.length;
    const items = [...itinerary.items]; items.splice(idx, 0, it);
    return save({ items }).then((ok) => { if (ok) setOpen(idx); });
  };
  const [open, setOpen] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [copiedP, setCopiedP] = useState(false);
  const items = useMemo(() => itinerary.items, [itinerary]);
  const byMoment = useMemo(() => { const m = new Map<string, ItineraryComment[]>(); for (const c of comments) { const l = m.get(c.momentId) ?? []; l.push(c); m.set(c.momentId, l); } return m; }, [comments]);
  const pending = comments.filter((c) => !c.resolvedAt).length;
  const cur = open >= 0 ? items[open] : null;
  const pub = pubMode(mode);

  return (
    <div className={pub ? "mx-auto max-w-[960px] px-4 py-6 sm:px-6" : ""}>
      {pub && (
        <div className="mb-6 overflow-hidden rounded-2xl px-5 py-6 text-white sm:px-7 sm:py-8" style={heroStyle}>
          {itinerary.logo && (
            <div className="mb-4 inline-flex items-center rounded-xl bg-surface px-4 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itinerary.logo} alt={company?.name ?? "Empresa"} className="h-10 w-auto max-w-[200px] object-contain" />
            </div>
          )}
          <div className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>{th?.label ?? `${company?.name ?? ""} · Gestión estratégica`}{audience === "participantes" ? " · agenda" : " · equipo organizador"}</div>
          <h1 className={`mt-1.5 text-[26px] leading-[1.05] sm:text-[36px] ${titleCls}`} style={th?.image ? { textShadow: "0 1px 12px rgba(0,0,0,.6)" } : undefined}>{itinerary.title}</h1>
          {itinerary.sub && <p className="mt-1.5 max-w-2xl text-[13.5px] text-white/75">{itinerary.sub}</p>}
          {th?.tagline && <><div className="mt-4 h-[3px] w-16 rounded-full" style={{ background: accent }} /><p className="mt-2 text-[14px] italic text-white/90">«{th.tagline}»</p></>}
          <p className="mt-3 text-[12px] text-white/70">{audience === "participantes" ? "Toca cada momento para ver de qué trata y quién lo conduce." : "Toca cada momento para ver la metodología, los materiales, el uso de la plataforma y el resultado esperado, y para dejar comentarios metodológicos o logísticos."}</p>
        </div>
      )}
      {!pub && th && (
        <div className="mb-4 overflow-hidden rounded-2xl px-5 py-4 text-white" style={heroStyle}>
          <div className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>{th.label ?? itinerary.title}</div>
          <div className={`mt-1 text-[22px] leading-none sm:text-[26px] ${titleCls}`}>{itinerary.title}</div>
          {th.tagline && <p className="mt-1.5 text-[12.5px] italic text-white/85">«{th.tagline}»</p>}
        </div>
      )}
      {!pub && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-muted">{itinerary.sub ?? "Ruta de la convención, momento a momento: descripción, metodología, materiales y plataforma."}{pending ? <> · <b className="text-ink">{pending}</b> comentario{pending === 1 ? "" : "s"} por atender</> : null}</p>
          {canManage && (
            <span className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
              {editable && <button type="button" onClick={() => setEditHeader(true)} className="btn-ghost btn-sm.5 text-[12px]"><Pencil size={12} /> Encabezado</button>}
              {editable && onUploadFile && <button type="button" onClick={() => setShowFiles((v) => !v)} className="btn-ghost btn-sm.5 text-[12px]"><FileText size={12} /> Materiales ({files.length})</button>}
              <label className="btn-ghost cursor-pointer btn-sm.5 text-[12px]"><Upload size={12} /> Cargar JSON<input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !onUpload) return; try { await onUpload(JSON.parse(await f.text())); } catch { alert("El archivo no es un JSON válido."); } e.target.value = ""; }} /></label>
              {itinerary.public
                ? <button type="button" onClick={() => onPublish?.(false)} disabled={busy} className="btn-ghost btn-sm.5 text-[12px]"><Lock size={12} /> Retirar del público</button>
                : <button type="button" onClick={() => onPublish?.(true)} disabled={busy} className="btn-primary btn-sm.5 text-[12px]"><Globe size={12} /> Publicar sin login</button>}
              {itinerary.public && publicUrl && <button type="button" onClick={async () => { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost btn-sm.5 text-[12px]">{copied ? <CheckCircle2 size={12} /> : <Link2 size={12} />} {copied ? "Copiado" : "Copiar enlace público"}</button>}
              {itinerary.public && <button type="button" onClick={() => { if (confirm("El enlace anterior dejará de valer. ¿Regenerar?")) void onPublish?.(true, true); }} disabled={busy} className="btn-ghost btn-sm.5 text-[12px]" title="Cambia el enlace público"><RefreshCw size={12} /></button>}
              {itinerary.publicP
                ? <button type="button" onClick={() => onPublish?.(false, false, "participantes")} disabled={busy} className="btn-ghost btn-sm.5 text-[12px]" title="La agenda para participantes deja de verse"><Lock size={12} /> Retirar agenda</button>
                : <button type="button" onClick={() => onPublish?.(true, false, "participantes")} disabled={busy} className="btn-ghost btn-sm.5 text-[12px]" title="Enlace aparte, sin logística ni comentarios: horario, momento, quién y descripción"><Globe size={12} /> Agenda para participantes</button>}
              {itinerary.publicP && publicUrlP && <button type="button" onClick={async () => { await navigator.clipboard.writeText(publicUrlP); setCopiedP(true); setTimeout(() => setCopiedP(false), 1500); }} className="btn-ghost btn-sm.5 text-[12px]">{copiedP ? <CheckCircle2 size={12} /> : <Link2 size={12} />} {copiedP ? "Copiado" : "Copiar enlace de participantes"}</button>}
            </span>
          )}
        </div>
      )}
      {!pub && itinerary.public && publicUrl && <p className="num mb-2 break-all rounded-xl bg-cyan-wash/60 px-3 py-2 text-[12px] text-ink"><Globe size={12} className="mr-1 inline text-cyan-deep" /> Equipo organizador (logística y comentarios): {publicUrl}</p>}
      {!pub && itinerary.publicP && publicUrlP && <p className="num mb-4 break-all rounded-xl bg-[#FAF4E3] px-3 py-2 text-[12px] text-ink"><Globe size={12} className="mr-1 inline text-[#8A6D1F]" /> Participantes (agenda): {publicUrlP}</p>}
      {error && <p className="mb-3 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--surface))" }}>{error}</p>}
      {!pub && showFiles && onUploadFile && (
        <div className="mb-5 rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[13px] font-bold text-ink">Materiales</div>
            <span className="text-[12px] text-muted">PDF (se abre en línea), PowerPoint .pptx (se descarga) o enlace. Los archivos se guardan en el almacenamiento (R2). También puedes añadirlos desde el modal de cada momento: quedan vinculados a ese momento.</span>
            {onAddLink && <LinkForm busy={busy} onAdd={(n, u) => onAddLink(n, u)} className="ml-auto" />}
            <label className={`btn-primary cursor-pointer btn-sm.5 text-[12px] ${onAddLink ? "" : "ml-auto"}`}><Upload size={12} /> Subir PDF o PowerPoint<input type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple className="hidden" onChange={async (e) => { const list = Array.from(e.target.files ?? []); for (const f of list) await onUploadFile(f, "material"); e.target.value = ""; }} /></label>
          </div>
          <FileList files={files} href={fileHref} onRemove={onRemoveFile} busy={busy} />
        </div>
      )}
      {pub && audience !== "participantes" && files.length > 0 && (
        <details className="mb-5 rounded-2xl border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-bold text-ink">Materiales de la convención ({files.length})</summary>
          <FileList files={files} href={fileHref} busy={false} />
        </details>
      )}

      <div className="sticky top-[54px] z-10 -mx-1 mb-4 flex flex-wrap gap-1.5 bg-surface-2/90 px-1 py-2 backdrop-blur sm:top-0">
        {itinerary.days.map((d) => <a key={d.id} href={`#dia-${d.id}`} className="chip !py-1 text-[12px] font-bold">{d.title.split(" · ")[0]}</a>)}
        {FILTERS.map((f) => <button key={f.k} type="button" onClick={() => setFilter(f.k)} className={`chip !py-1 text-[12px] font-bold ${filter === f.k ? "!text-white" : ""}`} style={filter === f.k ? { background: bg } : undefined}>{f.label}</button>)}
      </div>

      {itinerary.days.map((d) => {
        const list = items.map((it, i) => ({ it, i })).filter(({ it }) => it.day === d.id && (filter === "all" || it.kind === filter));
        const total = items.filter((it) => it.day === d.id).reduce((a, it) => a + it.minutes, 0);
        return (
          <section key={d.id} id={`dia-${d.id}`} className="mb-7 scroll-mt-24">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-[18px] text-ink ${th ? "uppercase tracking-tight font-black" : "font-extrabold"}`}>{d.title}</h2>
              {editable && <span className="flex gap-1.5">
                <button type="button" onClick={() => setEditDay(d.id)} className="rounded-lg p-1.5 text-faint hover:bg-surface hover:text-ink" title="Editar el día"><Pencil size={13} /></button>
                <button type="button" onClick={() => void addMoment(d.id)} disabled={busy} className="btn-ghost btn-sm text-[12px]"><Plus size={11} /> Momento</button>
              </span>}
            </div>
            <p className="mb-3 text-[12.5px] text-muted">{d.sub ? `${d.sub} · ` : ""}{items.filter((it) => it.day === d.id).length} momentos · {Math.round(total / 6) / 10} horas de agenda</p>
            <div className="relative pl-7">
              <span aria-hidden className="absolute bottom-2 left-[9px] top-2 w-[2px]" style={{ background: `linear-gradient(${accent}, ${bg})` }} />
              {list.map(({ it, i }) => {
                const n = byMoment.get(it.id)?.length ?? 0, pend = (byMoment.get(it.id) ?? []).filter((c) => !c.resolvedAt).length;
                const soft = it.kind === "break" || it.kind === "energizacion";
                return (
                  <button key={it.id} type="button" onClick={() => setOpen(i)}
                    className={`relative mb-2 grid w-full grid-cols-[54px_1fr] items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all active:bg-cyan-wash sm:grid-cols-[62px_1fr_auto] ${soft ? "border-dashed border-line bg-transparent" : "border-line bg-surface hover:-translate-y-px hover:shadow-sm"}`}>
                    <span className="absolute -left-[23px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-[3px] bg-surface" style={th ? { borderColor: kindStyle(it.kind, accent, bg).background, background: it.kind === "mesa" ? accent : "#fff" } : { borderColor: DOT[it.kind], background: it.kind === "mesa" ? DOT.mesa : "#fff" }} />
                    <span className="num text-[13px] font-extrabold text-ink" style={th ? { color: accent } : undefined}>{it.time}{it.minutes ? <small className="block text-[12px] font-semibold text-muted">{it.minutes} min</small> : null}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold leading-snug text-ink">{it.title}</span>
                      <span className="block text-[12px] text-muted">{it.who}</span>
                      {n > 0 && <span className={`mt-1 inline-flex items-center gap-1 text-[12px] font-bold ${pend ? "text-warn" : "text-faint"}`}><MessageSquare size={11} /> {n} comentario{n === 1 ? "" : "s"}{pend ? ` · ${pend} por atender` : ""}</span>}
                    </span>
                    <span className={`col-start-2 justify-self-start rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider sm:col-start-3 ${th ? "" : KIND_CLS[it.kind]}`} style={th ? kindStyle(it.kind, accent, bg) : undefined}>{th && it.kind === "break" ? "Pit Stop" : ITINERARY_KINDS[it.kind]}</span>
                  </button>
                );
              })}
              {list.length === 0 && <p className="text-[12px] italic text-faint">Sin momentos de este tipo.</p>}
            </div>
          </section>
        );
      })}

      {cur && <MomentModal it={cur} day={itinerary.days.find((d) => d.id === cur.day)?.title ?? ""} days={itinerary.days} comments={byMoment.get(cur.id) ?? []} pub={pub} simple={audience === "participantes"} canManage={canManage} busy={busy} companyName={company?.name ?? "la empresa"} files={files} href={fileHref}
        onFiles={editable && onMomentFiles ? (ids) => onMomentFiles(cur.id, ids) : undefined}
        onUpload={editable && onUploadMomentFile ? (f) => onUploadMomentFile(cur.id, f) : undefined}
        onAddLink={editable && onAddLink ? (n, u) => onAddLink(n, u, cur.id) : undefined}
        onClose={() => setOpen(-1)} onPrev={open > 0 ? () => setOpen(open - 1) : undefined} onNext={open < items.length - 1 ? () => setOpen(open + 1) : undefined}
        onComment={onComment} onResolve={onResolve} onDelete={onDelete}
        onEdit={editable ? async (next) => { const items = itinerary.items.map((x) => (x.id === cur.id ? next : x)); return save({ items }); } : undefined}
        onRemove={editable ? async () => { const ok = await save({ items: itinerary.items.filter((x) => x.id !== cur.id) }); if (ok) setOpen(-1); return ok; } : undefined}
        onMove={editable ? async (dir) => { const i = itinerary.items.indexOf(cur), j = i + dir; if (j < 0 || j >= itinerary.items.length) return false; const items = [...itinerary.items]; [items[i], items[j]] = [items[j], items[i]]; const ok = await save({ items }); if (ok) setOpen(j); return ok; } : undefined} />}
      {editHeader && <HeaderForm itinerary={itinerary} busy={busy} onClose={() => setEditHeader(false)} onSave={async (title, sub) => { const ok = await save({ title, sub }); if (ok) setEditHeader(false); }} />}
      {editDay && <DayForm day={itinerary.days.find((d) => d.id === editDay)!} busy={busy} onClose={() => setEditDay(null)} onSave={async (title, sub) => { const ok = await save({ days: itinerary.days.map((d) => (d.id === editDay ? { ...d, title, ...(sub ? { sub } : {}) } : d)) }); if (ok) setEditDay(null); }} />}
    </div>
  );
}

const pubMode = (m: "sesion" | "publico") => m === "publico";

function MomentModal({ it, day, days, comments, pub, simple = false, canManage, busy, companyName, onClose, onPrev, onNext, onComment, onResolve, onDelete, onEdit, onRemove, onMove, files, href, onFiles, onUpload, onAddLink }: {
  it: ItineraryItem; day: string; days: { id: string; title: string }[]; comments: ItineraryComment[]; pub: boolean; simple?: boolean; canManage: boolean; busy: boolean; companyName: string; onClose: () => void; onPrev?: () => void; onNext?: () => void;
  onComment: (momentId: string, kind: CommentKind, text: string, author?: string, email?: string, consent?: boolean) => Promise<boolean>;
  onResolve?: (id: string, resolved: boolean) => Promise<void>; onDelete?: (id: string) => Promise<void>;
  onEdit?: (next: ItineraryItem) => Promise<boolean>; onRemove?: () => Promise<boolean>; onMove?: (dir: -1 | 1) => Promise<boolean>;
  files: ItineraryFile[]; href: (f: ItineraryFile) => string; onFiles?: (ids: string[]) => Promise<boolean>; onUpload?: (file: File) => Promise<boolean>; onAddLink?: (name: string, url: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const linked = (it.files ?? []).map((id) => files.find((f) => f.id === id)).filter((f): f is ItineraryFile => !!f);
  const [f, setF] = useState(() => ({ ...it, materialsText: it.materials.join("\n") }));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const startEdit = () => { setF({ ...it, materialsText: it.materials.join("\n") }); setEditing(true); };
  const commitEdit = async () => {
    if (!onEdit) return;
    const { materialsText, ...rest } = f;
    const ok = await onEdit({ ...rest, minutes: Math.max(0, Math.round(Number(f.minutes) || 0)), materials: materialsText.split("\n").map((m) => m.trim()).filter(Boolean) });
    if (ok) setEditing(false);
  };
  const [kind, setKind] = useState<CommentKind>("metodologico");
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(() => { try { return localStorage.getItem("itin-autor") ?? ""; } catch { return ""; } });
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("itin-correo") ?? ""; } catch { return ""; } });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);
  const send = async () => {
    setSending(true); setDone(false);
    try { localStorage.setItem("itin-autor", author); localStorage.setItem("itin-correo", email); } catch { /* sin almacenamiento */ }
    const ok = await onComment(it.id, kind, text, pub ? author : undefined, pub ? email : undefined, pub ? consent : undefined);
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
        {onEdit && !editing && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={startEdit} className="btn-ghost btn-sm.5 text-[12px]"><Pencil size={12} /> Editar textos</button>
            {onMove && <button type="button" onClick={() => void onMove(-1)} disabled={busy || !onPrev} className="btn-ghost btn-sm.5 text-[12px] disabled:opacity-40" title="Mover antes"><ArrowUp size={12} /></button>}
            {onMove && <button type="button" onClick={() => void onMove(1)} disabled={busy || !onNext} className="btn-ghost btn-sm.5 text-[12px] disabled:opacity-40" title="Mover después"><ArrowDown size={12} /></button>}
            {onRemove && <button type="button" onClick={() => { if (confirm(`¿Eliminar el momento «${it.title}»?`)) void onRemove(); }} disabled={busy} className="btn-ghost ml-auto btn-sm.5 text-[12px] text-bad"><Trash2 size={12} /> Eliminar</button>}
          </div>
        )}
        {editing ? (
          <div className="space-y-2.5 rounded-xl border border-line px-3.5 py-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px]">
              <label className="block"><span className="label !text-[11px]">Título</span><AutoTextarea value={f.title} onChange={set("title")} className="input mt-1 !py-2 text-[13px]" /></label>
              <label className="block"><span className="label !text-[11px]">Hora</span><input value={f.time} onChange={set("time")} className="input mt-1 !py-2 text-[13px]" placeholder="8:05" /></label>
              <label className="block"><span className="label !text-[11px]">Minutos</span><input type="number" min={0} value={f.minutes} onChange={set("minutes")} className="input mt-1 !py-2 text-[13px]" /></label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block"><span className="label !text-[11px]">Tipo</span><select value={f.kind} onChange={set("kind")} className="input mt-1 !py-2 text-[13px]">{(Object.keys(ITINERARY_KINDS) as ItineraryKind[]).map((k) => <option key={k} value={k}>{ITINERARY_KINDS[k]}</option>)}</select></label>
              <label className="block"><span className="label !text-[11px]">Día</span><select value={f.day} onChange={set("day")} className="input mt-1 !py-2 text-[13px]">{days.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
              <label className="block"><span className="label !text-[11px]">Quién conduce</span><AutoTextarea value={f.who} onChange={set("who")} className="input mt-1 !py-2 text-[13px]" /></label>
            </div>
            <label className="block"><span className="label !text-[11px]">Descripción del momento (lo que ven los participantes)</span><textarea value={f.description} onChange={set("description")} rows={3} maxLength={500} className="input mt-1 !py-2 text-[13px]" /></label>
            <label className="block"><span className="label !text-[11px]">Metodología · dinámica y resultado</span><textarea value={f.method} onChange={set("method")} rows={5} maxLength={1200} className="input mt-1 !py-2 text-[13px]" /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block"><span className="label !text-[11px]">Materiales físicos (uno por línea)</span><textarea value={f.materialsText} onChange={set("materialsText")} rows={4} className="input mt-1 !py-2 text-[13px]" /></label>
              <label className="block"><span className="label !text-[11px]">Plataforma y pantalla</span><textarea value={f.platform} onChange={set("platform")} rows={4} maxLength={400} className="input mt-1 !py-2 text-[13px]" /></label>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
              <button type="button" onClick={() => void commitEdit()} disabled={busy || f.title.trim().length < 3 || !f.time.trim()} className="btn-primary ml-auto !py-2 text-[12px] disabled:opacity-40">{busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Guardar</button>
            </div>
          </div>
        ) : simple ? (<>
        <div><div className="label !text-[11px]">Descripción</div><p className="mt-1 leading-relaxed text-ink">{it.description || "—"}</p></div>
        <div><div className="label !text-[11px]">Quién lo conduce</div><p className="mt-1 text-ink">{it.who || "—"}</p></div>
        </>) : (<>
        <div><div className="label !text-[11px]">Descripción del momento</div><p className="mt-1 leading-relaxed text-ink">{it.description || "—"}</p></div>
        <div><div className="label !text-[11px]">Metodología · dinámica y resultado</div><p className="mt-1 leading-relaxed text-ink">{it.method || "—"}</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#FAF4E3] px-3.5 py-3"><div className="label !text-[11px]">Materiales físicos</div>{it.materials.length ? <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-ink">{it.materials.map((m, i) => <li key={i}>{m}</li>)}</ul> : <p className="mt-1 text-[13px] text-muted">—</p>}</div>
          <div className="rounded-xl bg-cyan-wash/60 px-3.5 py-3"><div className="label !text-[11px]">Plataforma y pantalla</div><p className="mt-1 text-[13px] text-ink">{it.platform || "—"}</p></div>
        </div>
        {(linked.length > 0 || onFiles) && (
          <div className="rounded-xl bg-surface-2/60 px-3.5 py-3">
            <div className="label !text-[11px]">Materiales de este momento</div>
            {linked.length ? <ul className="mt-1.5 space-y-1">{linked.map((f) => <li key={f.id}><a href={href(f)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-cyan-deep hover:underline"><FileIcon f={f} size={13} /> {f.name}<span className="num text-[12px] font-normal text-faint">· {fileMeta(f)}</span></a></li>)}</ul> : <p className="mt-1 text-[12px] italic text-faint">Sin materiales vinculados.</p>}
            {onAddLink && <div className="mt-2"><LinkForm busy={busy} onAdd={onAddLink} label="Añadir enlace a este momento" /></div>}
            {onUpload && (
              <label className={`btn-ghost mt-2 inline-flex cursor-pointer btn-sm.5 text-[12px] ${busy ? "pointer-events-none opacity-50" : ""}`} title="Sube un PDF o un PowerPoint al almacenamiento y lo deja vinculado a este momento">
                <Upload size={12} /> Subir PDF o PowerPoint a este momento
                <input type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple className="hidden" disabled={busy} onChange={async (e) => { const list = Array.from(e.target.files ?? []); for (const f of list) { if (!(await onUpload(f))) break; } e.target.value = ""; }} />
              </label>
            )}
            {onFiles && files.length > 0 && (
              <details className="mt-2"><summary className="cursor-pointer text-[12px] font-bold text-ink">Vincular materiales</summary>
                <div className="mt-1.5 grid gap-1 sm:grid-cols-2">{files.map((f) => { const on = (it.files ?? []).includes(f.id); return (
                  <label key={f.id} className="flex items-center gap-2 text-[12px] text-ink"><input type="checkbox" checked={on} disabled={busy} onChange={() => void onFiles(on ? (it.files ?? []).filter((x) => x !== f.id) : [...(it.files ?? []), f.id])} /> {f.name}</label>); })}</div>
              </details>
            )}
          </div>
        )}
        </>)}

        {!simple && <div className="border-t border-line pt-3">
          <div className="label !text-[11px]">Comentarios del equipo organizador ({comments.length})</div>
          <div className="mt-2 space-y-2">
            {comments.length === 0 && <p className="text-[12px] italic text-faint">Aún no hay comentarios sobre este momento.</p>}
            {comments.map((c) => (
              <div key={c.id} className={`rounded-xl px-3 py-2.5 ${c.resolvedAt ? "bg-surface-2/50" : "bg-surface-2"}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className={`chip !py-0 text-[11px] ${c.kind === "metodologico" ? "chip-cyan" : "chip-gold"}`}>{COMMENT_KINDS[c.kind]}</span>
                  <b className="text-ink">{c.author}</b><span className="text-faint">· {new Date(c.at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{c.via === "publico" ? " · enlace público" : ""}</span>
                  {c.resolvedAt && <span className="chip chip-ok !py-0 text-[11px]">atendido · {c.resolvedBy}</span>}
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
            {pub && <label className="mt-2 flex items-start gap-2 text-[12px] leading-snug text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--navy)]" />
              <span>{consentSummary(companyName)}</span>
            </label>}
            <div className="mt-2 flex items-center gap-2">
              {done && <span className="text-[12px] text-ok"><CheckCircle2 size={12} className="mr-1 inline" />Comentario registrado</span>}
              <button type="button" onClick={send} disabled={sending || text.trim().length < 3 || (pub && (author.trim().length < 3 || !consent))} className="btn-primary ml-auto !py-2 text-[12px] disabled:opacity-40">{sending ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />} Enviar</button>
            </div>
          </div>
        </div>}
      </div>
    </Modal>
  );
}

function HeaderForm({ itinerary, busy, onClose, onSave }: { itinerary: Omit<Itinerary, "token">; busy: boolean; onClose: () => void; onSave: (title: string, sub?: string) => Promise<void> }) {
  const [title, setTitle] = useState(itinerary.title); const [sub, setSub] = useState(itinerary.sub ?? "");
  return (
    <Modal title="Encabezado del itinerario" onClose={onClose} footer={<><button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cancelar</button><button type="button" disabled={busy || title.trim().length < 3} onClick={() => void onSave(title.trim(), sub.trim() || undefined)} className="btn-primary !py-2 text-[12px] disabled:opacity-40">Guardar</button></>}>
      <div className="space-y-2.5">
        <label className="block"><span className="label !text-[11px]">Título</span><AutoTextarea value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="input mt-1 !py-2 text-[13px]" /></label>
        <label className="block"><span className="label !text-[11px]">Subtítulo</span><AutoTextarea value={sub} onChange={(e) => setSub(e.target.value)} maxLength={200} className="input mt-1 !py-2 text-[13px]" /></label>
      </div>
    </Modal>
  );
}

function DayForm({ day, busy, onClose, onSave }: { day: { id: string; title: string; sub?: string }; busy: boolean; onClose: () => void; onSave: (title: string, sub?: string) => Promise<void> }) {
  const [title, setTitle] = useState(day.title); const [sub, setSub] = useState(day.sub ?? "");
  return (
    <Modal title={`Día · ${day.id}`} onClose={onClose} footer={<><button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cancelar</button><button type="button" disabled={busy || title.trim().length < 3} onClick={() => void onSave(title.trim(), sub.trim() || undefined)} className="btn-primary !py-2 text-[12px] disabled:opacity-40">Guardar</button></>}>
      <div className="space-y-2.5">
        <label className="block"><span className="label !text-[11px]">Título del día</span><AutoTextarea value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="input mt-1 !py-2 text-[13px]" placeholder="Día 1 · miércoles 22 de octubre" /></label>
        <label className="block"><span className="label !text-[11px]">Subtítulo</span><AutoTextarea value={sub} onChange={(e) => setSub(e.target.value)} maxLength={200} className="input mt-1 !py-2 text-[13px]" /></label>
      </div>
    </Modal>
  );
}

/** Icono según el tipo de material. */
function FileIcon({ f, size = 13, className = "shrink-0 text-cyan-deep" }: { f: ItineraryFile; size?: number; className?: string }) {
  const k = fileKindOf(f);
  return k === "link" ? <ExternalLink size={size} className={className} /> : k === "pptx" ? <Presentation size={size} className={className} /> : <FileText size={size} className={className} />;
}
/** Dato breve junto al nombre: tamaño del archivo, o dominio del enlace. */
const fileMeta = (f: ItineraryFile) => (fileKindOf(f) === "link" ? linkHost(f.url ?? "") || "enlace" : `${fileKindOf(f) === "pptx" ? "PowerPoint · " : ""}${Math.max(1, Math.round(f.size / 1024))} KB`);
/** Formulario mínimo para añadir un enlace como material: nombre y URL. */
function LinkForm({ busy, onAdd, label = "Añadir enlace", className = "" }: { busy: boolean; onAdd: (name: string, url: string) => Promise<boolean>; label?: string; className?: string }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [url, setUrl] = useState("");
  const ok = name.trim().length >= 2 && URL_RE.test(url.trim());
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`btn-ghost btn-sm.5 text-[12px] ${className}`}><Link2 size={12} /> {label}</button>;
  return (
    <div className={`flex w-full flex-wrap items-end gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-2 ${className}`}>
      <label className="block min-w-[160px] flex-1"><span className="label !text-[11px]">Nombre</span><AutoTextarea value={name} onChange={(e) => setName(e.target.value)} maxLength={160} className="input mt-1 !py-1.5 text-[12.5px]" placeholder="Presentación de la tribu" /></label>
      <label className="block min-w-[200px] flex-[2]"><span className="label !text-[11px]">URL</span><AutoTextarea value={url} onChange={(e) => setUrl(e.target.value)} maxLength={600} inputMode="url" className="input mt-1 !py-1.5 text-[12.5px]" placeholder="https://…" /></label>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm.5 text-[12px]">Cancelar</button>
      <button type="button" disabled={busy || !ok} onClick={async () => { if (await onAdd(name.trim(), url.trim())) { setName(""); setUrl(""); setOpen(false); } }} className="btn-primary btn-sm.5 text-[12px] disabled:opacity-40">{busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Añadir</button>
    </div>
  );
}
function FileList({ files, href, onRemove, busy }: { files: ItineraryFile[]; href: (f: ItineraryFile) => string; onRemove?: (id: string) => Promise<boolean>; busy: boolean }) {
  if (!files.length) return <p className="mt-2 text-[12px] italic text-faint">Aún no hay materiales. Sube plantillas y presentaciones (PDF o PowerPoint) o añade enlaces.</p>;
  const groups = [...new Set(files.map((f) => f.group ?? "material"))];
  return (
    <div className="mt-2 grid gap-1 sm:grid-cols-2">
      {groups.map((g) => files.filter((f) => (f.group ?? "material") === g).map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-2.5 py-1.5 text-[12px]">
          <FileIcon f={f} />
          <a href={href(f)} target="_blank" rel="noopener" className="min-w-0 flex-1 break-words font-semibold leading-snug text-ink hover:text-cyan-deep">{f.name}</a>
          <span className="num shrink-0 text-[12px] text-faint">{fileMeta(f)}</span>
          {onRemove && <button type="button" disabled={busy} onClick={() => { if (confirm(`¿Quitar «${f.name}» de los materiales?`)) void onRemove(f.id); }} className="rounded-md p-1 text-faint hover:text-bad" title="Quitar"><Trash2 size={12} /></button>}
        </div>
      )))}
    </div>
  );
}
