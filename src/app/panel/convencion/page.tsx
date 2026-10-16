"use client";

// Convención de planeación: apoyo a la facilitación en vivo.
//   Dirección   → objetivos por palanca y horizonte (mesa redonda, talleres 2027/2030/2033)
//   OKR         → objetivos del primer horizonte con sus resultados clave y reglas de calidad
//   Iniciativas → qué iniciativa mueve cada resultado clave; vinculación en vivo
//   Priorización→ cobertura de la evaluación con la matriz, ranking y actividad por evaluador
//   Portafolio  → por horizonte y decisión, renuncias con motivo, exportación CSV
// Edita quien administra el catálogo (advisor, gerencia); los demás ven en vivo.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ItinerarioView } from "@/components/itinerario";
import type { Itinerary as ItineraryT, ItineraryComment } from "@/lib/itinerario";
import Link from "next/link";
import { PageHeader, Card, CardHeader, StatCard, Modal, EmptyNote } from "@/components/ui";
import { AccessChip, useCan, useBase, useUser } from "@/components/user-context";
import { ACCESS_SECTIONS, type AccessSection } from "@/lib/acceso";
import { useCatalog, useCatalogRefetch } from "@/components/catalog-context";
import { horizonsOf, horizonLabel, leversOf, typeRuleOf, isConvencion, type Lever } from "@/data/catalogo";
import { PERSPECTIVES, type CmiObjective, type KpiFull } from "@/data/cmi";
import { LINES } from "@/data/demo";
import { objectivesMatrix, keyResultsOf, healthKpisOf, initiativesOfKr, okrChecks, evaluationCoverage, portfolioSummary, portfolioCsv, type PortfolioRow } from "@/lib/convencion";
import { usePriorizacion, DECISION_CLS, HorizonHint, type PriorizacionData } from "@/components/priorizacion";
import { CRITERIA, decisionLabel, validationLabel, validationCriteriaCount, type Decision } from "@/lib/priorizacion";
import { Presentation, Target, Gauge, Rocket, Scale, Layers, Plus, Pencil, Loader2, Save, AlertTriangle, X, Download, RefreshCw, Users, CheckCircle2, Link2, QrCode, Copy, CalendarDays, Upload, Filter } from "lucide-react";

type Tab = "itinerario" | "direccion" | "okr" | "iniciativas" | "priorizacion" | "portafolio";
const TABS: { id: Tab; label: string; icon: typeof Target; agenda: string }[] = [
  { id: "itinerario", label: "Itinerario", icon: CalendarDays, agenda: "Ruta de los dos días: metodología, materiales, plataforma y comentarios del equipo organizador" },
  { id: "direccion", label: "Dirección", icon: Target, agenda: "Día 1 · mesa redonda y talleres 2027 / 2030 / 2033" },
  { id: "okr", label: "OKR", icon: Gauge, agenda: "Día 2 · laboratorio y validación cruzada de OKR" },
  { id: "iniciativas", label: "Iniciativas → KR", icon: Rocket, agenda: "Día 2 · iniciativas críticas para mover resultados" },
  { id: "priorizacion", label: "Priorización en vivo", icon: Scale, agenda: "Día 2 · priorización en herramienta" },
  { id: "portafolio", label: "Portafolio", icon: Layers, agenda: "Día 2 · portafolio por horizonte, capacidad y ratificación" },
];
const INPUT = "input !py-2 text-[12px]";
const SCORE_COLOR = (s: number) => s >= 80 ? "var(--ok)" : s >= 65 ? "var(--cyan-deep)" : s >= 50 ? "var(--warn)" : "var(--bad)";

export default function ConvencionPage() {
  const v = useCatalog();
  const refetch = useCatalogRefetch();
  const base = useBase();
  const canEdit = useCan("manage_catalog");
  const canAccess = useCan("manage_users");
  const me = useUser();
  // quien entró por el QR (o no administra el catálogo) ve la agenda de participantes, no el itinerario del equipo organizador
  const guest = !!me.qr || !(me.role === "ADMIN" || me.role === "CONSULTOR" || me.role === "LIDER");
  const agendaOf = (t: (typeof TABS)[number]) => t.id === "itinerario" && guest ? "Agenda de los dos días: horario, momento, quién lo conduce y descripción" : t.agenda;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // la sección vive en la URL (?t=okr): el menú lateral en modo convención y los enlaces QR apuntan a ella
  const tParam = searchParams.get("t");
  const tab: Tab = TABS.some((x) => x.id === tParam) ? (tParam as Tab) : "direccion";
  const setTab = (t: Tab) => router.replace(`${pathname}?t=${t}`);
  const convencion = isConvencion(v.catalog.company);
  const [qr, setQr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: prio, refetch: refetchPrio } = usePriorizacion();

  // en vivo: la priorización se refresca sola mientras se proyecta
  useEffect(() => {
    if (tab !== "priorizacion" && tab !== "portafolio") return;
    const t = setInterval(() => { void refetchPrio(); }, 15_000);
    return () => clearInterval(t);
  }, [tab, refetchPrio]);

  const mutate = async (entity: string, op: "upsert" | "delete", data: unknown) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/td/catalogo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, op, data }) });
      if (!res.ok) { setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`); setSaving(false); return false; }
      await refetch(); setSaving(false); return true;
    } catch { setError("No se pudo conectar con el servidor."); setSaving(false); return false; }
  };

  const cat = v.catalog;
  const horizons = horizonsOf(cat.company);
  const levers = leversOf(cat.company);
  const first = horizons[0]?.id ?? "";

  return (
    <div>
      <PageHeader kicker="Convención de planeación" title={`Convención · ${cat.company.name}`}
        desc="De los diagnósticos de las tribus a la dirección compartida, de los objetivos a OKR y prioridades ejecutables. Lo que se decide en sala queda registrado aquí, en vivo."
        actions={<span className="flex items-center gap-2"><AccessChip module="iniciativas" />
          {canAccess && <button type="button" onClick={() => setQr(true)} className="btn-ghost !py-1.5 text-[11.5px]" title="QR único de la convención: tribu y rol al entrar"><QrCode size={13} /> QR de la convención</button>}</span>} />

      {error && (
        <div className="rise mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} /><p className="flex-1 text-[12.5px] text-ink-soft">{error}</p><button onClick={() => setError(null)} className="text-faint hover:text-ink"><X size={14} /></button>
        </div>
      )}

      {qr && <AccesoQrModal section={tab} onClose={() => setQr(false)} />}
      {/* en móvil la lámina de sección reemplaza la descripción larga del encabezado */}
      {convencion ? (
        <div className="rise mb-5 flex items-center gap-2 text-[12.5px] text-muted">
          {(() => { const t = TABS.find((x) => x.id === tab)!; return <><t.icon size={14} className="text-cyan-deep" /><b className="text-ink">{t.label}</b><span>· {agendaOf(t)}</span></>; })()}
        </div>
      ) : (
      <div className="rise mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} title={agendaOf(t)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            <t.icon size={13} className={tab === t.id ? "text-cyan-deep" : ""} /> {t.label}
          </button>
        ))}
        <span className="ml-auto hidden text-[10.5px] text-faint sm:block">{agendaOf(TABS.find((t) => t.id === tab)!)}</span>
      </div>
      )}

      {tab === "itinerario" && <ItinerarioTab />}
      {tab === "direccion" && <DireccionTab cat={cat} levers={levers} horizons={horizons} canEdit={canEdit && (!isConvencion(cat.company) || me.role === "ADMIN" || me.role === "CONSULTOR")} saving={saving} mutate={mutate} />}
      {tab === "okr" && <OkrTab cat={cat} levers={levers} horizon={first} canEdit={canEdit} saving={saving} mutate={mutate} base={base} />}
      {tab === "iniciativas" && <IniciativasTab cat={cat} levers={levers} horizon={first} canEdit={canEdit} saving={saving} mutate={mutate} base={base} />}
      {tab === "priorizacion" && <PriorizacionTab cat={cat} levers={levers} prio={prio} base={base} onRefresh={() => void refetchPrio()} />}
      {tab === "portafolio" && <PortafolioTab cat={cat} levers={levers} horizons={horizons.map((h) => h.id)} prio={prio} base={base} />}
    </div>
  );
}

type Mutate = (entity: string, op: "upsert" | "delete", data: unknown) => Promise<boolean>;
type Cat = ReturnType<typeof useCatalog>["catalog"];

/* ═══ Dirección: palanca × horizonte ═══ */

function DireccionTab({ cat, levers, horizons, canEdit, saving, mutate }: { cat: Cat; levers: Lever[]; horizons: { id: string; label: string; months: number }[]; canEdit: boolean; saving: boolean; mutate: Mutate }) {
  const m = objectivesMatrix(cat);
  const [open, setOpen] = useState<CmiObjective | { lever?: string; horizon?: string } | null>(null);
  const [leversOpen, setLeversOpen] = useState(false);
  const owner = (id?: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "";
  const editing = open && "id" in open ? (open as CmiObjective) : null;
  const hz = [...horizons].reverse();   // del más lejano (2033) al más cercano (2027): así trabaja la mesa redonda
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] text-muted">Trabajo retrospectivo desde {horizons[horizons.length - 1]?.label ?? "el horizonte más lejano"}: estado deseado, hitos intermedios y resultados indispensables en {horizons[0]?.label ?? "el primer horizonte"}, por palanca.</p>
        {canEdit && <span className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <button onClick={() => setLeversOpen(true)} className="btn-ghost flex-1 justify-center !py-1.5 text-[11.5px] sm:flex-none"><Pencil size={12} /> Palancas</button>
          <button onClick={() => setOpen({})} className="btn-primary flex-1 justify-center !py-1.5 text-[11.5px] sm:flex-none"><Plus size={12} /> Nuevo objetivo</button>
        </span>}
      </div>
      {levers.length === 0 ? (
        <Card className="rise p-6"><EmptyNote>Esta empresa aún no define sus palancas estratégicas. {canEdit ? "Créalas con «Palancas»: ordenan la convención y agrupan objetivos e iniciativas." : "Las define el advisor o la gerencia."}</EmptyNote></Card>
      ) : (<>
        {/* móvil: una tarjeta por palanca con sus horizontes apilados */}
        <div className="rise space-y-4 sm:hidden">
          {levers.map((l) => (
            <div key={l.id} className="rounded-2xl bg-surface-2/60 p-3">
              <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">{l.order}. {l.id}</div>
              <div className="text-[15px] font-extrabold leading-tight text-ink">{l.name}</div>
              {l.indicator && <div className="mt-1 text-[11px] leading-snug text-muted">{l.indicator}</div>}
              {hz.map((h) => {
                const objs = m.cell(l.id, h.id);
                return (
                  <div key={h.id} className="mt-3">
                    <div className="mb-1.5 text-[11.5px] font-extrabold text-ink">{h.label} <span className="num font-semibold text-faint">· {h.months} meses</span></div>
                    <div className="space-y-2">
                      {objs.map((o) => <ObjectiveCard key={o.id} o={o} cat={cat} onEdit={canEdit ? () => setOpen(o) : undefined} />)}
                      {canEdit && <button onClick={() => setOpen({ lever: l.id, horizon: h.id })} className="w-full rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-[12px] font-semibold text-faint">+ objetivo</button>}
                      {!canEdit && objs.length === 0 && <div className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-[11px] italic text-faint">por definir</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="rise hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[820px] border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="w-[200px] text-left align-bottom"><span className="label">Palanca</span></th>
                {hz.map((h) => <th key={h.id} className="text-left"><div className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] font-extrabold text-ink">{h.label} <span className="num font-semibold text-faint">· {h.months} meses</span></div></th>)}
              </tr>
            </thead>
            <tbody>
              {levers.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="rounded-xl bg-surface-2/60 px-3 py-3">
                    <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">{l.order}. {l.id}</div>
                    <div className="text-[13.5px] font-extrabold leading-tight text-ink">{l.name}</div>
                    {l.indicator && <div className="mt-1 text-[10.5px] leading-snug text-muted">{l.indicator}</div>}
                    {l.ownerId && <div className="mt-1 text-[10px] text-faint">{owner(l.ownerId)}</div>}
                  </td>
                  {hz.map((h) => {
                    const objs = m.cell(l.id, h.id);
                    return (
                      <td key={h.id} className="min-w-[200px]">
                        <div className="space-y-2">
                          {objs.map((o) => <ObjectiveCard key={o.id} o={o} cat={cat} onEdit={canEdit ? () => setOpen(o) : undefined} />)}
                          {canEdit && <button onClick={() => setOpen({ lever: l.id, horizon: h.id })} className="w-full rounded-xl border border-dashed border-line-strong px-3 py-2 text-[11px] font-semibold text-faint hover:border-cyan-deep hover:text-cyan-deep">+ objetivo</button>}
                          {!canEdit && objs.length === 0 && <div className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-[10.5px] italic text-faint">por definir</div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
      {m.orphan.length > 0 && (
        <Card className="rise rise-2 mt-5">
          <CardHeader title={`Objetivos sin palanca u horizonte (${m.orphan.length})`} sub="siguen en el cuadro de mando; ubícalos en la matriz para que entren a la convención" />
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {m.orphan.map((o) => <button key={o.id} onClick={canEdit ? () => setOpen(o) : undefined} className="chip !py-1 text-[11px]">{o.id} · {o.name.slice(0, 60)}{o.name.length > 60 ? "…" : ""}</button>)}
          </div>
        </Card>
      )}
      {open && <ObjectiveForm cat={cat} levers={levers} horizons={horizons} initial={editing} preset={editing ? undefined : (open as { lever?: string; horizon?: string })} saving={saving}
        onCancel={() => setOpen(null)} onSubmit={async (d) => { const ok = await mutate("objective", "upsert", editing ? { id: editing.id, ...d } : d); if (ok) setOpen(null); return ok; }}
        onDelete={editing ? async () => { if (window.confirm(`¿Eliminar el objetivo ${editing.id}?`)) { const ok = await mutate("objective", "delete", { id: editing.id }); if (ok) setOpen(null); } } : undefined} />}
      {leversOpen && <LeversForm cat={cat} initial={levers} saving={saving} onCancel={() => setLeversOpen(false)} onSubmit={async (d) => { const ok = await mutate("levers", "upsert", d); if (ok) setLeversOpen(false); return ok; }} />}
    </>
  );
}

function ObjectiveCard({ o, cat, onEdit }: { o: CmiObjective; cat: Cat; onEdit?: () => void }) {
  const krs = keyResultsOf(cat, o);
  return (
    <div className="panel group px-3.5 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="num text-[9.5px] font-bold uppercase tracking-wider text-faint">{o.id}{o.pillar ? ` · ${o.pillar.split(" · ")[0]}` : ""}</div>
          <div className="text-[12.5px] font-bold leading-snug text-ink">{o.name}</div>
          {o.desc && <p className="mt-1 text-[11px] leading-snug text-muted">{o.desc}</p>}
          {o.indicator && <p className="mt-1 text-[10.5px] text-ink-soft"><span className="font-semibold">Indicador:</span> {o.indicator}</p>}
        </div>
        {onEdit && <button onClick={onEdit} className="shrink-0 rounded-lg p-2 text-faint transition-opacity hover:bg-surface-2 hover:text-ink sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100" title="Editar"><Pencil size={13} /></button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className={`chip !py-0 text-[9.5px] ${krs.length ? "chip-cyan" : ""}`}>{krs.length} KR</span>
        {krs.slice(0, 3).map((k) => <span key={k.code} className="num chip !py-0 text-[9px]" title={k.name}>{k.code}</span>)}
      </div>
    </div>
  );
}

function ObjectiveForm({ cat, levers, horizons, initial, preset, saving, onCancel, onSubmit, onDelete }: {
  cat: Cat; levers: Lever[]; horizons: { id: string; label: string }[]; initial: CmiObjective | null; preset?: { lever?: string; horizon?: string }; saving: boolean;
  onCancel: () => void; onSubmit: (d: Record<string, unknown>) => Promise<boolean>; onDelete?: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "", desc: initial?.desc ?? "", indicator: initial?.indicator ?? "", pillar: initial?.pillar ?? "",
    lever: initial?.lever ?? preset?.lever ?? levers[0]?.id ?? "", horizon: initial?.horizon ?? preset?.horizon ?? horizons[0]?.id ?? "",
    perspective: initial?.perspective ?? "clientes", line: String(initial?.line ?? ""),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const pillars = [...new Set(cat.objectives.map((o) => o.pillar).filter(Boolean))] as string[];
  return (
    <Modal title={initial ? `Objetivo · ${initial.id}` : "Nuevo objetivo"} sub="aspiración, indicador impulsor, palanca y horizonte" onClose={onCancel}
      footer={<>
        {onDelete && <button type="button" onClick={onDelete} className="btn-ghost mr-auto !py-2 text-[12px] text-bad">Eliminar</button>}
        <button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || f.name.trim().length < 5} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40"
          onClick={() => onSubmit({ name: f.name.trim(), desc: f.desc.trim(), indicator: f.indicator.trim(), pillar: f.pillar.trim(), lever: f.lever, horizon: f.horizon, perspective: f.perspective, kpis: initial?.kpis ?? [], ...(f.line ? { line: Number(f.line) } : {}) })}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {initial ? "Guardar" : "Crear"}
        </button>
      </>}>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Palanca"><select value={f.lever} onChange={set("lever")} className={INPUT}><option value="">— sin palanca —</option>{levers.map((l) => <option key={l.id} value={l.id}>{l.order}. {l.name}</option>)}</select></Field>
          <Field label="Horizonte"><select value={f.horizon} onChange={set("horizon")} className={INPUT}><option value="">— sin horizonte —</option>{horizons.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}</select></Field>
        </div>
        <Field label="Objetivo"><input value={f.name} onChange={set("name")} placeholder="Qué se logra o queda habilitado" className={INPUT} /></Field>
        <Field label="Aspiración (estado deseado)"><textarea value={f.desc} onChange={set("desc")} rows={3} placeholder="¿Qué necesitamos lograr o dejar habilitado?" className={`${INPUT} resize-y`} /></Field>
        <Field label="Indicador impulsor"><input value={f.indicator} onChange={set("indicator")} placeholder="¿Cómo mediremos ese avance? (complementa el indicador de la palanca)" className={INPUT} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pilar corporativo"><input list="pilares" value={f.pillar} onChange={set("pillar")} placeholder="p. ej. El ser humano" className={INPUT} /><datalist id="pilares">{pillars.map((p) => <option key={p} value={p} />)}</datalist></Field>
          <Field label="Perspectiva del cuadro de mando"><select value={f.perspective} onChange={set("perspective")} className={INPUT}>{PERSPECTIVES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        </div>
        <Field label="Capacidad 4Shine dominante (opcional)"><select value={f.line} onChange={set("line")} className={INPUT}><option value="">—</option>{LINES.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.name}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function LeversForm({ cat, initial, saving, onCancel, onSubmit }: { cat: Cat; initial: Lever[]; saving: boolean; onCancel: () => void; onSubmit: (d: unknown) => Promise<boolean> }) {
  const [rows, setRows] = useState<{ id: string; name: string; ownerId: string; indicator: string; desc: string }[]>(initial.map((l) => ({ id: l.id, name: l.name, ownerId: l.ownerId ?? "", indicator: l.indicator ?? "", desc: l.desc ?? "" })));
  const upd = (i: number, k: string, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= rows.length) return; const c = [...rows]; [c[i], c[j]] = [c[j], c[i]]; setRows(c); };
  return (
    <Modal title="Palancas estratégicas" sub="el orden es la jerarquía acordada por la dirección; cada tribu trabaja una palanca" onClose={onCancel} wide
      footer={<><button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || rows.some((r) => !r.id.trim() || r.name.trim().length < 3)} onClick={() => onSubmit(rows)} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar palancas</button></>}>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[28px_80px_1fr_1fr_1fr_60px] items-start gap-1.5">
            <div className="flex flex-col pt-1"><button onClick={() => move(i, -1)} className="text-[10px] text-faint hover:text-ink">▲</button><button onClick={() => move(i, 1)} className="text-[10px] text-faint hover:text-ink">▼</button></div>
            <input value={r.id} onChange={(e) => upd(i, "id", e.target.value.toUpperCase())} placeholder="MS" className="input num !py-1.5 !text-[11px]" />
            <input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} placeholder="Nombre de la palanca" className="input !py-1.5 !text-[11px]" />
            <input value={r.indicator} onChange={(e) => upd(i, "indicator", e.target.value)} placeholder="Indicador principal" className="input !py-1.5 !text-[11px]" />
            <select value={r.ownerId} onChange={(e) => upd(i, "ownerId", e.target.value)} className="input !py-1.5 !text-[11px]"><option value="">Tribu / responsable</option>{cat.responsibles.map((x) => <option key={x.id} value={x.id}>{x.dependencia || x.cargo}</option>)}</select>
            <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="pt-1.5 text-[11px] text-faint hover:text-bad">Quitar</button>
          </div>
        ))}
        {rows.length < 8 && <button onClick={() => setRows([...rows, { id: "", name: "", ownerId: "", indicator: "", desc: "" }])} className="text-[11px] font-bold text-cyan-deep hover:underline">+ añadir palanca</button>}
      </div>
    </Modal>
  );
}

/* ═══ OKR del primer horizonte ═══ */

function OkrTab({ cat, levers, horizon, canEdit, saving, mutate, base }: { cat: Cat; levers: Lever[]; horizon: string; canEdit: boolean; saving: boolean; mutate: Mutate; base: string }) {
  const allObjectives = cat.objectives.filter((o) => o.horizon === horizon);
  const issues = okrChecks(cat, horizon);
  const [kr, setKr] = useState<{ obj: CmiObjective; kpi: KpiFull | null } | null>(null);
  const owner = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "—";
  // filtros: objetivo estratégico y tribu (la tribu dueña de la palanca o de alguno de los KR)
  const [fOe, setFOe] = useState(""); const [fTribe, setFTribe] = useState("");
  const tribeOf = (o: CmiObjective) => { const l = levers.find((x) => x.id === o.lever); return l?.ownerId ?? ""; };
  const inTribe = (o: CmiObjective, t: string) => !t || tribeOf(o) === t || keyResultsOf(cat, o).some((k) => k.ownerId === t);
  const tribes = cat.responsibles.filter((r) => allObjectives.some((o) => inTribe(o, r.id) && (tribeOf(o) === r.id || keyResultsOf(cat, o).some((k) => k.ownerId === r.id))));
  const objectives = allObjectives.filter((o) => (!fOe || o.id === fOe) && inTribe(o, fTribe));
  const byLever = [...levers.map((l) => ({ key: l.id, label: `${l.order}. ${l.name}`, objs: objectives.filter((o) => o.lever === l.id) })), { key: "", label: "Sin palanca", objs: objectives.filter((o) => !o.lever || !levers.some((l) => l.id === o.lever)) }].filter((g) => g.objs.length);
  const high = issues.filter((i) => i.level === "alto").length;
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard label={`Objetivos ${horizonLabel(cat.company, horizon)}`} value={allObjectives.length} foot={`${allObjectives.filter((o) => keyResultsOf(cat, o).length >= 2 && keyResultsOf(cat, o).length <= 5).length} con 2 a 5 resultados clave`} accent={allObjectives.every((o) => keyResultsOf(cat, o).length >= 2 && keyResultsOf(cat, o).length <= 5) ? "linear-gradient(90deg, var(--ok), #2f8f5b)" : undefined} />
        <StatCard label="Resultados clave" value={objectives.reduce((a, o) => a + keyResultsOf(cat, o).length, 0)} foot="indicador, base, meta, dueño y plazo" />
        <StatCard label="Alertas de calidad" value={issues.length} foot={`${high} de nivel alto`} accent={issues.length ? "linear-gradient(90deg, var(--warn), var(--bad))" : "linear-gradient(90deg, var(--ok), #2f8f5b)"} />
        <StatCard label="Iniciativas vinculadas" value={cat.initiatives.filter((i) => i.horizon === horizon && i.kpi).length} unit={`de ${cat.initiatives.filter((i) => i.horizon === horizon).length}`} foot="mueven un resultado clave" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={13} className="shrink-0 text-cyan-deep" />
        <span className="num text-[12px] font-bold text-ink">{objectives.length} de {allObjectives.length} objetivos</span>
        <select value={fOe} onChange={(e) => setFOe(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[320px]" title="Objetivo estratégico"><option value="">Todos los objetivos (OE)</option>{allObjectives.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}</select>
        <select value={fTribe} onChange={(e) => setFTribe(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[260px]" title="Tribu"><option value="">Todas las tribus</option>{tribes.map((t) => <option key={t.id} value={t.id}>{t.dependencia || t.cargo}</option>)}</select>
        {(fOe || fTribe) && <button type="button" onClick={() => { setFOe(""); setFTribe(""); }} className="btn-ghost !py-1.5 text-[11.5px]"><X size={12} /> Quitar filtros</button>}
        {!canEdit && <span className="ml-auto text-[10.5px] text-faint">Solo lectura: el líder de cada tribu registra con el QR de edición.</span>}
      </div>
      {allObjectives.length === 0 && <Card className="rise p-6"><EmptyNote>No hay objetivos en {horizonLabel(cat.company, horizon)}. Créalos en «Dirección» y vuelve aquí para sus resultados clave.</EmptyNote></Card>}
      {allObjectives.length > 0 && objectives.length === 0 && <Card className="rise p-6"><EmptyNote>Ningún objetivo coincide con el filtro.</EmptyNote></Card>}
      {byLever.map((g) => (
        <Card key={g.key} className="rise mb-5 overflow-hidden">
          <CardHeader title={g.label} sub={`${g.objs.length} objetivo${g.objs.length === 1 ? "" : "s"} en ${horizonLabel(cat.company, horizon)}`} />
          <div className="divide-y divide-line">
            {g.objs.map((o) => {
              const krs = keyResultsOf(cat, o);
              const mine = issues.filter((i) => i.ref === o.id || krs.some((k) => k.code === i.ref));
              return (
                <div key={o.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">{o.id}</div>
                      <div className="text-[14px] font-extrabold leading-snug text-ink">{o.name}</div>
                      {o.indicator && <div className="mt-0.5 text-[11px] text-muted">Indicador impulsor: {o.indicator}</div>}
                    </div>
                    {canEdit && <button onClick={() => setKr({ obj: o, kpi: null })} className="btn-primary w-full justify-center !py-2 text-[12px] sm:w-auto sm:!py-1.5 sm:text-[11px]"><Plus size={12} /> Resultado clave</button>}
                  </div>
                  {krs.length > 0 && (
                    <div className="mt-3 space-y-2 sm:hidden">
                      {krs.map((k) => {
                        const bad = issues.find((i) => i.kind === "kr-incompleto" && i.ref === k.code);
                        const body = (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="num shrink-0 text-[11px] font-extrabold text-cyan-deep">{k.code}</span>
                              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">{k.name}</span>
                              {canEdit && <Pencil size={13} className="mt-0.5 shrink-0 text-faint" />}
                            </div>
                            <div className="num mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                              <span>Base <b className="text-ink">{k.baseline || "—"}</b> → Meta <b className="text-ink">{k.target || "—"}</b> {k.unit}</span>
                              <span>{k.ownerId ? owner(k.ownerId) : <span className="text-warn">sin dueño</span>}</span>
                              <span>{k.due ?? <span className="text-warn">sin plazo</span>}</span>
                              <span>{initiativesOfKr(cat, k.code).length} inic.</span>
                              {bad && <span className="chip chip-warn !py-0 text-[9.5px]" title={bad.text}>incompleto</span>}
                            </div>
                          </>
                        );
                        return canEdit
                          ? <button key={k.code} type="button" onClick={() => setKr({ obj: o, kpi: k })} className="block w-full rounded-xl bg-surface-2/60 px-3 py-2.5 text-left active:bg-cyan-wash">{body}</button>
                          : <div key={k.code} className="rounded-xl bg-surface-2/60 px-3 py-2.5">{body}</div>;
                      })}
                    </div>
                  )}
                  {krs.length > 0 && (
                    <div className="mt-3 hidden overflow-x-auto sm:block">
                      <table className="w-full min-w-[640px] text-[12px]">
                        <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="py-1 pr-2">KR</th><th className="py-1 pr-2">Resultado clave</th><th className="num py-1 pr-2 text-right">Base</th><th className="num py-1 pr-2 text-right">Meta</th><th className="py-1 pr-2">Unidad</th><th className="py-1 pr-2">Dueño</th><th className="py-1 pr-2">Plazo</th><th className="num py-1 pr-2 text-right">Inic.</th><th /></tr></thead>
                        <tbody>
                          {krs.map((k) => {
                            const bad = issues.find((i) => i.kind === "kr-incompleto" && i.ref === k.code);
                            return (
                              <tr key={k.code} className="border-t border-line">
                                <td className="num py-1.5 pr-2 font-bold text-cyan-deep">{k.code}</td>
                                <td className="py-1.5 pr-2 font-semibold text-ink">{k.name}{bad && <span className="ml-1 chip chip-warn !py-0 text-[9px]" title={bad.text}>incompleto</span>}</td>
                                <td className="num py-1.5 pr-2 text-right text-muted">{k.baseline || "—"}</td>
                                <td className="num py-1.5 pr-2 text-right font-bold text-ink">{k.target || "—"}</td>
                                <td className="py-1.5 pr-2 text-muted">{k.unit}</td>
                                <td className="py-1.5 pr-2 text-muted">{k.ownerId ? owner(k.ownerId) : <span className="text-warn">sin dueño</span>}</td>
                                <td className="num py-1.5 pr-2 text-muted">{k.due ?? <span className="text-warn">sin plazo</span>}</td>
                                <td className="num py-1.5 pr-2 text-right text-muted">{initiativesOfKr(cat, k.code).length}</td>
                                <td className="py-1.5 text-right">{canEdit && <button onClick={() => setKr({ obj: o, kpi: k })} className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink" title="Editar"><Pencil size={12} /></button>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {healthKpisOf(cat, o).length > 0 && (
                    <p className="mt-2 text-[10.5px] leading-snug text-faint"><span className="font-semibold text-muted">KPI de salud</span> (sin plazo, no cuentan como resultado clave): {healthKpisOf(cat, o).map((k) => `${k.code} ${k.name}`).join(" · ")}</p>
                  )}
                  {mine.filter((i) => i.kind !== "kr-incompleto").length > 0 && (
                    <ul className="mt-2 space-y-0.5">{mine.filter((i) => i.kind !== "kr-incompleto").map((i, n) => <li key={n} className={`text-[11px] ${i.level === "alto" ? "text-bad" : "text-warn"}`}>• {i.text}</li>)}</ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <p className="text-[11px] text-faint">Regla de calidad: cada objetivo con 2 a 5 resultados clave; cada resultado clave con línea base, meta, dueño y plazo, y al menos una iniciativa que lo mueva. Un KPI con plazo es resultado clave; sin plazo, KPI de salud del objetivo. Los valores de los KR se reportan en <Link href={`${base}/panel/kpi`} className="text-cyan-deep hover:underline">Indicadores</Link>.</p>
      {kr && <KrForm cat={cat} obj={kr.obj} initial={kr.kpi} saving={saving} onCancel={() => setKr(null)}
        onSubmit={async (d) => { const ok = await mutate("kpi", "upsert", d); if (ok) setKr(null); return ok; }}
        onDelete={kr.kpi ? async () => { if (window.confirm(`¿Eliminar el resultado clave ${kr.kpi!.code}?`)) { const ok = await mutate("kpi", "delete", { code: kr.kpi!.code }); if (ok) setKr(null); } } : undefined} />}
    </>
  );
}

function KrForm({ cat, obj, initial, saving, onCancel, onSubmit, onDelete }: { cat: Cat; obj: CmiObjective; initial: KpiFull | null; saving: boolean; onCancel: () => void; onSubmit: (d: Record<string, unknown>) => Promise<boolean>; onDelete?: () => void }) {
  const prefix = (obj.lever ?? "KR").slice(0, 4);
  const next = (() => { let n = 1; while (cat.kpis.some((k) => k.code === `${prefix}-${String(n).padStart(2, "0")}`)) n++; return `${prefix}-${String(n).padStart(2, "0")}`; })();
  const [f, setF] = useState({
    code: initial?.code ?? next, name: initial?.name ?? "", unit: initial?.unit ?? "%", baseline: String(initial?.baseline ?? ""), target: String(initial?.target ?? ""),
    ownerId: initial?.ownerId ?? (cat.company.levers?.find((l) => l.id === obj.lever)?.ownerId ?? ""), due: initial?.due ?? `${new Date().getFullYear() + 1}-T4`,
    goodDirection: initial?.goodDirection ?? "up", frequency: initial?.frequency ?? "Trimestral", definition: initial?.definition ?? "", source: initial?.source ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const num = (s: string) => { const n = Number(String(s).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const ok = f.code.trim().length >= 2 && f.name.trim().length >= 3 && f.unit.trim() && /^\d{4}(-T[1-4])?$/.test(f.due.trim().toUpperCase());
  return (
    <Modal title={initial ? `Resultado clave · ${initial.code}` : `Nuevo resultado clave · ${obj.id}`} sub={obj.name} onClose={onCancel}
      footer={<>
        {onDelete && <button type="button" onClick={onDelete} className="btn-ghost mr-auto !py-2 text-[12px] text-bad">Eliminar</button>}
        <button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || !ok} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40"
          onClick={() => onSubmit({ code: f.code.trim().toUpperCase(), name: f.name.trim(), unit: f.unit.trim(), baseline: num(f.baseline), target: num(f.target), ownerId: f.ownerId, due: f.due.trim().toUpperCase(), goodDirection: f.goodDirection, frequency: f.frequency, definition: f.definition.trim(), source: f.source.trim(), cmi: obj.id, line: obj.line ?? 1, series: initial?.series ?? [], formula: initial?.formula ?? "" })}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {initial ? "Guardar" : "Crear"}
        </button>
      </>}>
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr]">
          <Field label="Código"><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} disabled={!!initial} className={`${INPUT} num`} /></Field>
          <Field label="Resultado clave"><input value={f.name} onChange={set("name")} placeholder="Qué resultado verificable y cuánto" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Línea base"><input type="number" step="any" value={f.baseline} onChange={set("baseline")} className={`${INPUT} num`} /></Field>
          <Field label="Meta"><input type="number" step="any" value={f.target} onChange={set("target")} className={`${INPUT} num`} /></Field>
          <Field label="Unidad"><input value={f.unit} onChange={set("unit")} className={INPUT} /></Field>
          <Field label="Mejor si"><select value={f.goodDirection} onChange={set("goodDirection")} className={INPUT}><option value="up">sube</option><option value="down">baja</option></select></Field>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Dueño"><select value={f.ownerId} onChange={set("ownerId")} className={INPUT}><option value="">—</option>{cat.responsibles.map((r) => <option key={r.id} value={r.id}>{r.dependencia || r.cargo}</option>)}</select></Field>
          <Field label="Plazo (AAAA o AAAA-Tn)"><input value={f.due} onChange={set("due")} className={`${INPUT} num`} /></Field>
          <Field label="Frecuencia"><select value={f.frequency} onChange={set("frequency")} className={INPUT}>{["Mensual", "Trimestral", "Semestral", "Anual"].map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="Definición y fuente (opcional)"><input value={f.definition} onChange={set("definition")} placeholder="Cómo se calcula y de dónde sale el dato" className={INPUT} /></Field>
      </div>
    </Modal>
  );
}

/* ═══ Iniciativas → resultado clave ═══ */

function IniciativasTab({ cat, levers, horizon, canEdit, saving, mutate, base }: { cat: Cat; levers: Lever[]; horizon: string; canEdit: boolean; saving: boolean; mutate: Mutate; base: string }) {
  const objectives = cat.objectives.filter((o) => o.horizon === horizon);
  const krs = objectives.flatMap((o) => keyResultsOf(cat, o).map((k) => ({ k, o })));
  const [fTribe, setFTribe] = useState("");
  const tribes = cat.responsibles.filter((r) => cat.initiatives.some((i) => i.ownerId === r.id));
  const unlinked = cat.initiatives.filter((i) => (!i.kpi || !krs.some((x) => x.k.code === i.kpi)) && (!fTribe || i.ownerId === fTribe));
  const [link, setLink] = useState<string | null>(null);
  const owner = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "—";
  const leverName = (o: CmiObjective) => levers.find((l) => l.id === o.lever)?.name ?? "";
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={13} className="shrink-0 text-cyan-deep" />
        <select value={fTribe} onChange={(e) => setFTribe(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[260px]" title="Tribu"><option value="">Todas las tribus</option>{tribes.map((t) => <option key={t.id} value={t.id}>{t.dependencia || t.cargo}</option>)}</select>
        <span className="text-[11px] text-faint">{canEdit ? "Vincula cada iniciativa de tu tribu al resultado clave que mueve: así queda habilitada para calificar." : "Solo lectura: el líder de cada tribu vincula con el QR de edición; una iniciativa sin KR no se puede calificar."}</span>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Resultados clave" value={krs.length} foot={`en ${horizonLabel(cat.company, horizon)}`} />
        <StatCard label="KR con iniciativa" value={krs.filter((x) => initiativesOfKr(cat, x.k.code).length > 0).length} unit={`de ${krs.length}`} foot="al menos una iniciativa los mueve" accent="linear-gradient(90deg, var(--ok), #2f8f5b)" />
        <StatCard label="Iniciativas sin KR" value={unlinked.length} unit={`de ${cat.initiatives.length}`} foot="no mueven un resultado clave del horizonte" accent="linear-gradient(90deg, var(--gold), #a87a14)" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="rise overflow-hidden">
          <CardHeader title="Qué mueve cada resultado clave" sub="depurar: solo las iniciativas que efectivamente alteran el KR" />
          <div className="divide-y divide-line">
            {krs.map(({ k, o }) => {
              const inis = initiativesOfKr(cat, k.code).filter((i) => !fTribe || i.ownerId === fTribe);
              if (fTribe && inis.length === 0) return null;
              return (
                <div key={k.code} className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline gap-2"><span className="num text-[11px] font-extrabold text-cyan-deep">{k.code}</span><span className="text-[12.5px] font-bold text-ink">{k.name}</span><span className="text-[10px] text-faint sm:ml-auto">{o.id} · {leverName(o)}</span></div>
                  {inis.length === 0 ? <p className="mt-1 text-[11px] italic text-warn">Ninguna iniciativa lo mueve.</p> : (
                    <ul className="mt-1.5 space-y-1">{inis.map((i) => <li key={i.id} className="flex items-center gap-2 text-[11.5px]"><Rocket size={10} className="shrink-0 text-faint" /><Link href={`${base}/panel/iniciativas/${i.id}`} className="min-w-0 flex-1 truncate text-ink-soft hover:text-cyan-deep">{i.name}</Link><span className="num hidden shrink-0 text-[10px] text-faint sm:inline">{i.id} · {owner(i.ownerId)}</span></li>)}</ul>
                  )}
                </div>
              );
            })}
            {krs.length === 0 && <div className="px-5 py-4"><EmptyNote>Sin resultados clave en {horizonLabel(cat.company, horizon)}: defínelos en «OKR».</EmptyNote></div>}
          </div>
        </Card>
        <Card className="rise rise-1 overflow-hidden">
          <CardHeader title={`Iniciativas sin resultado clave (${unlinked.length})`} sub="vincúlalas a un KR o déjalas fuera del portafolio" />
          <div className="divide-y divide-line">
            {unlinked.map((i) => (
              <div key={i.id} className="flex items-center gap-2 px-5 py-2.5 text-[12px]">
                <div className="min-w-0 flex-1"><div className="truncate font-semibold text-ink">{i.name}</div><div className="num text-[10px] text-faint">{i.id} · {owner(i.ownerId)} · {horizonLabel(cat.company, i.horizon)}{i.kpi ? ` · KPI ${i.kpi}` : ""}</div></div>
                {canEdit && <button onClick={() => setLink(i.id)} className="btn-ghost shrink-0 !py-1.5 text-[11px] sm:!py-1 sm:text-[10.5px]"><Link2 size={11} /> Vincular</button>}
              </div>
            ))}
            {unlinked.length === 0 && <div className="px-5 py-4 text-[12px] text-muted"><CheckCircle2 size={14} className="mr-1 inline text-ok" /> Todas las iniciativas mueven un resultado clave.</div>}
          </div>
        </Card>
      </div>
      {link && (() => {
        const ini = cat.initiatives.find((i) => i.id === link)!;
        return (
          <LinkForm ini={ini} krs={krs} saving={saving} onCancel={() => setLink(null)}
            onSubmit={async (code, cmi) => { const ok = await mutate("initiative", "upsert", { ...ini, kpi: code, cmi }); if (ok) setLink(null); return ok; }} />
        );
      })()}
    </>
  );
}

function LinkForm({ ini, krs, saving, onCancel, onSubmit }: { ini: { id: string; name: string; kpi: string; cmi: string }; krs: { k: KpiFull; o: CmiObjective }[]; saving: boolean; onCancel: () => void; onSubmit: (code: string, cmi: string) => Promise<boolean> }) {
  const [code, setCode] = useState(krs[0]?.k.code ?? "");
  const sel = krs.find((x) => x.k.code === code);
  return (
    <Modal title={`Vincular · ${ini.id}`} sub={ini.name} onClose={onCancel}
      footer={<><button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || !sel} onClick={() => sel && onSubmit(sel.k.code, sel.o.id)} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">{saving ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Vincular</button></>}>
      <Field label="Resultado clave que mueve">
        <select value={code} onChange={(e) => setCode(e.target.value)} className={INPUT}>{krs.map((x) => <option key={x.k.code} value={x.k.code}>{x.k.code} · {x.k.name} ({x.o.id})</option>)}</select>
      </Field>
      <p className="mt-2 text-[11px] text-faint">Al vincular, la iniciativa queda asociada también al objetivo del resultado clave.</p>
    </Modal>
  );
}

/* ═══ Priorización en vivo ═══ */

function PriorizacionTab({ cat, levers, prio, base, onRefresh }: { cat: Cat; levers: Lever[]; prio: PriorizacionData | null; base: string; onRefresh: () => void }) {
  // el ranking se agrupa por tribu (palanca, por defecto) o por resultado clave; el selector filtra un grupo
  const [mode, setMode] = useState<"tribu" | "resultado">("tribu");
  const [sel, setSel] = useState("");
  const [expected, setExpected] = useState(3);
  const rows = prio?.ranking ?? [];
  const owner = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "—";
  type Ini = Cat["initiatives"][number];
  const objLever = (i: { cmi: string }) => cat.objectives.find((o) => o.id === i.cmi)?.lever ?? "";
  const tribe = (id?: string) => (id ? cat.responsibles.find((r) => r.id === id)?.dependencia : undefined);
  const leverLabel = (l: Lever) => { const t = tribe(l.ownerId); return t ? `${t} · ${l.name}` : `${l.order}. ${l.name}`; };
  const krs = cat.kpis.filter((k) => cat.initiatives.some((i) => i.kpi === k.code));
  const groupKey = (i: Ini) => (mode === "tribu" ? objLever(i) : i.kpi && krs.some((k) => k.code === i.kpi) ? i.kpi : "");
  const groupDefs: { key: string; label: string }[] = mode === "tribu"
    ? [...levers.map((l) => ({ key: l.id, label: leverLabel(l) })), { key: "", label: "Sin palanca" }]
    : [...krs.map((k) => ({ key: k.code, label: `${k.code} · ${k.name}` })), { key: "", label: "Sin resultado clave" }];
  const list = cat.initiatives.filter((i) => !sel || groupKey(i) === sel);
  const cov = evaluationCoverage(list, (prio?.evaluations ?? []).filter((e) => list.some((i) => i.id === e.iniId)), expected);
  const rank = (items: Ini[]) => items.map((i) => ({ i, r: rows.find((r) => r.id === i.id) })).sort((a, b) => ((b.r?.c.n ? b.r.c.score : -1) - (a.r?.c.n ? a.r.c.score : -1)));
  const groups = groupDefs.map((g) => ({ ...g, items: rank(list.filter((i) => groupKey(i) === g.key)) })).filter((g) => g.items.length > 0);
  const ranked = groups.flatMap((g) => g.items);
  const sub = (i: Ini) => (mode === "tribu" ? (i.kpi ? `KR ${i.kpi}` : "sin KR") : owner(i.ownerId));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-[11px]" role="group" aria-label="Agrupar el ranking">
          {(["tribu", "resultado"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setSel(""); }} className={`rounded-md px-2.5 py-1 font-bold transition-colors ${mode === m ? "text-white" : "text-muted hover:text-ink"}`} style={mode === m ? { background: "var(--navy)" } : undefined}>{m === "tribu" ? "Por tribu" : "Por resultado"}</button>
          ))}
        </div>
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[360px]"><option value="">{mode === "tribu" ? "Todas las tribus" : "Todos los resultados clave"}</option>{groupDefs.filter((g) => g.key).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</select>
        <label className="flex items-center gap-1.5 text-[11.5px] text-muted">Evaluadores esperados <input type="number" min={1} max={20} value={expected} onChange={(e) => setExpected(Math.max(1, Number(e.target.value) || 1))} className="input w-14 !py-1 text-center !text-[11.5px]" /></label>
        <button onClick={onRefresh} className="btn-ghost ml-auto !py-1.5 text-[11.5px]"><RefreshCw size={12} /> Actualizar</button>
        <span className="text-[10.5px] text-faint">se refresca cada 15 s</span>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Iniciativas evaluadas" value={cov.evaluated} unit={`de ${cov.total}`} foot={`${cov.pct} % con al menos una calificación`} accent="linear-gradient(90deg, var(--cyan), var(--cyan-deep))" />
        <StatCard label="Con evaluación completa" value={cov.complete} unit={`de ${cov.total}`} foot={`${expected} evaluadores o más`} accent="linear-gradient(90deg, var(--ok), #2f8f5b)" />
        <StatCard label="Evaluaciones registradas" value={(prio?.evaluations ?? []).filter((e) => list.some((i) => i.id === e.iniId)).length} foot={`${cov.evaluators.length} evaluadores activos`} />
        <StatCard label="Habilitadas para calificar" value={list.filter((i) => i.kpi).length} unit={`de ${list.length}`} foot="vinculadas a un resultado clave por el líder de tribu" accent="linear-gradient(90deg, var(--gold), #a87a14)" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rise overflow-hidden">
          <CardHeader title="Ranking en vivo" sub="puntaje consolidado · elegibilidad y capacidad · horizonte sugerido · decisión" />
          <div className="divide-y divide-line sm:hidden">
            {groups.map((g) => (<div key={g.key || "sin"}>
              <div className="bg-surface-2/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">{g.label} · {g.items.length}</div>
              {g.items.map(({ i, r }, n) => {
              const d = prio?.decisions[i.id]; const c = r?.c;
              return (
                <Link key={i.id} href={`${base}/panel/iniciativas/${i.id}`} className="flex items-start gap-3 px-4 py-3 active:bg-cyan-wash">
                  <span className="num w-6 shrink-0 pt-0.5 text-[13px] font-extrabold text-faint">{c && c.n ? n + 1 : "—"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug text-ink">{i.name}</span>
                    <span className="num block text-[10.5px] text-faint">{i.id} · {sub(i)} · {horizonLabel(cat.company, i.horizon)}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {!i.kpi && <span className="chip chip-warn !py-0 text-[9.5px]" title="Sin resultado clave: el líder de tribu la vincula en Iniciativas → KR">sin KR · no se califica</span>}
                      <span className={`chip !py-0 text-[9.5px] ${(c?.n ?? 0) >= expected ? "chip-ok" : (c?.n ?? 0) > 0 ? "chip-cyan" : ""}`}>{c?.n ?? 0}/{expected} eval.</span>
                      {c && c.n > 0 && !c.eligible && <span className="chip chip-warn !py-0 text-[9.5px]">D {c.rounded.D}</span>}
                      {c && c.n > 0 && c.capacityFirst && <span className="chip chip-warn !py-0 text-[9.5px]">L {c.rounded.L}</span>}
                      {c && c.lowConsensus && <span className="chip chip-bad !py-0 text-[9.5px]">consenso</span>}
                      {c && c.n > 0 && c.eligible && !c.capacityFirst && !c.lowConsensus && <span className="chip chip-ok !py-0 text-[9.5px]">elegible</span>}
                      {c && c.transfer && <span className="chip chip-warn !py-0 text-[9.5px]">táctica</span>}
                      {d ? <span className={DECISION_CLS[d.decision]}>{decisionLabel(d.decision)}</span> : null}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[20px] font-extrabold" style={{ color: c && c.n ? SCORE_COLOR(c.score) : "var(--faint)" }}>{c && c.n ? c.score : "—"}</span>
                </Link>
              );
            })}
            </div>))}
            {ranked.length === 0 && <p className="px-4 py-4 text-[12px] italic text-faint">Sin iniciativas.</p>}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[720px] text-[12px]">
              <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="px-4 py-2">#</th><th className="px-2 py-2">Iniciativa</th><th className="num px-2 py-2 text-center">Eval.</th>{CRITERIA.map((c) => <th key={c.key} className="num px-2 py-2 text-center">{c.key}</th>)}<th className="num px-2 py-2 text-right">Puntaje</th><th className="px-2 py-2">Reglas</th><th className="px-2 py-2">Horizonte</th><th className="px-2 py-2">Decisión</th></tr></thead>
              <tbody>
                {groups.map((g) => [
                  <tr key={`g-${g.key}`}><td colSpan={CRITERIA.length + 7} className="bg-surface-2/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">{g.label} · {g.items.length}</td></tr>,
                  ...g.items.map(({ i, r }, n) => {
                  const d = prio?.decisions[i.id];
                  const c = r?.c;
                  return (
                    <tr key={i.id} className="border-t border-line">
                      <td className="num px-4 py-2 font-extrabold text-faint">{c && c.n ? n + 1 : "—"}</td>
                      <td className="px-2 py-2"><Link href={`${base}/panel/iniciativas/${i.id}`} className="font-bold text-ink hover:text-cyan-deep">{i.name}</Link><div className="num text-[10px] text-faint">{i.id} · {owner(i.ownerId)}{i.kpi ? ` · KR ${i.kpi}` : ""}</div></td>
                      <td className="num px-2 py-2 text-center"><span className={`chip !py-0 text-[9.5px] ${(c?.n ?? 0) >= expected ? "chip-ok" : (c?.n ?? 0) > 0 ? "chip-cyan" : ""}`}>{c?.n ?? 0}/{expected}</span></td>
                      {CRITERIA.map((cr) => <td key={cr.key} className="num px-2 py-2 text-center">{c && c.n ? <span className={`font-bold ${c.rounded[cr.key] >= 3 ? "text-ink" : "text-muted"}`}>{c.avg[cr.key]}</span> : <span className="text-faint">—</span>}</td>)}
                      <td className="num px-2 py-2 text-right text-[14px] font-extrabold" style={{ color: c && c.n ? SCORE_COLOR(c.score) : "var(--faint)" }}>{c && c.n ? c.score : "—"}</td>
                      <td className="px-2 py-2"><span className="flex flex-wrap gap-1">
                        {!i.kpi && <span className="chip chip-warn !py-0 text-[9.5px]" title="Sin resultado clave: el líder de tribu la vincula en Iniciativas → KR">sin KR</span>}
                        {c && c.n > 0 && !c.eligible && <span className="chip chip-warn !py-0 text-[9.5px]">D {c.rounded.D}</span>}
                        {c && c.n > 0 && c.capacityFirst && <span className="chip chip-warn !py-0 text-[9.5px]">L {c.rounded.L}</span>}
                        {c && c.lowConsensus && <span className="chip chip-bad !py-0 text-[9.5px]">consenso</span>}
                        {c && c.n > 0 && c.eligible && !c.capacityFirst && !c.lowConsensus && <span className="chip chip-ok !py-0 text-[9.5px]">elegible</span>}
                      </span></td>
                      <td className="px-2 py-2"><span className="num text-[10.5px] text-muted">{horizonLabel(cat.company, i.horizon)}</span> {r && <HorizonHint compact current={i.horizon} suggested={r.suggested} company={cat.company} />}</td>
                      <td className="px-2 py-2">{d ? <span className={DECISION_CLS[d.decision]}>{decisionLabel(d.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}</td>
                    </tr>
                  );
                })])}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="rise rise-1 self-start">
          <CardHeader title="Actividad por evaluador" sub="quién ha calificado cuántas iniciativas" />
          <div className="space-y-1.5 px-5 pb-5">
            {cov.evaluators.length === 0 && <p className="text-[12px] italic text-faint">Aún nadie ha calificado.</p>}
            {cov.evaluators.map((e) => (
              <div key={e.by} className="flex items-center gap-2 text-[12px]">
                <Users size={12} className="shrink-0 text-faint" /><span className="truncate font-semibold text-ink">{e.name}</span><span className="chip !py-0 text-[9px]">{e.role.toLowerCase()}</span>
                <div className="ml-auto h-[7px] w-24 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (e.count / Math.max(1, list.length)) * 100)}%`, background: "var(--grad-brand)" }} /></div>
                <span className="num w-10 text-right font-bold text-ink">{e.count}</span>
              </div>
            ))}
            <p className="pt-2 text-[10.5px] leading-snug text-faint">Cada evaluador valida desde la ficha de la iniciativa (Iniciativas → «Validación con {validationCriteriaCount(typeRuleOf(cat.company))} criterios»). El comité revisa elegibilidad y consistencia aquí.</p>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ═══ Portafolio por horizonte y decisión ═══ */

type PortRow = PortfolioRow & { oe: string; ownerId: string; leverId: string; kpi: string };
type PortStatus = "" | "PENDIENTE" | "IMPLEMENTAR" | "PREPARAR" | "BACKLOG" | "RENUNCIAR" | "TACTICA" | "SIN_DUENO" | "SIN_KR" | "SIN_EVAL";
const PORT_STATUS: { key: PortStatus; label: string }[] = [
  { key: "", label: "Todas" }, { key: "PENDIENTE", label: "Pendientes (sin decisión)" }, { key: "IMPLEMENTAR", label: "Implementar" }, { key: "PREPARAR", label: "Preparar o validar" },
  { key: "BACKLOG", label: "Backlog" }, { key: "RENUNCIAR", label: "Renunciadas" }, { key: "TACTICA", label: "Tácticas (transferidas al área)" }, { key: "SIN_DUENO", label: "Sin dueño" },
  { key: "SIN_KR", label: "Sin resultado clave" }, { key: "SIN_EVAL", label: "Sin evaluación" },
];
const matchStatus = (r: PortRow, st: PortStatus) =>
  st === "" ? true : st === "PENDIENTE" ? !r.decision : st === "TACTICA" ? r.c.transfer : st === "SIN_DUENO" ? !r.ownerId : st === "SIN_KR" ? !r.kpi : st === "SIN_EVAL" ? r.c.n === 0 : r.decision === st;

function PortafolioTab({ cat, levers, horizons, prio, base }: { cat: Cat; levers: Lever[]; horizons: string[]; prio: PriorizacionData | null; base: string }) {
  // el portafolio parte del 100 % de las iniciativas del catálogo; el ranking consolidado se superpone cuando llega
  const all: PortRow[] = useMemo(() => cat.initiatives.map((i) => {
    const r = prio?.ranking.find((x) => x.id === i.id);
    const d = prio?.decisions[i.id];
    const o = cat.objectives.find((x) => x.id === i.cmi);
    const c = r?.c ?? { n: 0, avg: { D: 0, E: 0, M: 0, L: 0 }, rounded: { D: 1, E: 1, M: 1, L: 1 }, score: 0, eligible: false, capacityFirst: true, type: null, transfer: false, strategicVotes: 0, spread: 0, lowConsensus: false, evaluators: [] } as PortfolioRow["c"];
    return { id: i.id, name: i.name, horizon: i.horizon, suggested: r?.suggested ?? null, c, decision: d?.decision ?? null, rationale: d?.rationale, lever: levers.find((l) => l.id === o?.lever)?.name, owner: cat.responsibles.find((x) => x.id === i.ownerId)?.dependencia, oe: o?.id ?? "", ownerId: i.ownerId ?? "", leverId: o?.lever ?? "", kpi: i.kpi ?? "" };
  }), [prio, cat, levers]);
  // filtros: objetivo estratégico, tribu (responsable), palanca y estado
  const [fOe, setFOe] = useState(""); const [fTribe, setFTribe] = useState(""); const [fLever, setFLever] = useState(""); const [fStatus, setFStatus] = useState<PortStatus>("");
  const oes = useMemo(() => cat.objectives.filter((o) => all.some((r) => r.oe === o.id)), [cat, all]);
  const tribes = useMemo(() => cat.responsibles.filter((t) => all.some((r) => r.ownerId === t.id)), [cat, all]);
  const rows = useMemo(() => all.filter((r) => (!fOe || r.oe === fOe) && (!fTribe || r.ownerId === fTribe) && (!fLever || r.leverId === fLever) && matchStatus(r, fStatus)), [all, fOe, fTribe, fLever, fStatus]);
  const filtered = !!(fOe || fTribe || fLever || fStatus);
  const count = (st: PortStatus) => all.filter((r) => matchStatus(r, st)).length;
  const hzAll = useMemo(() => [...horizons, ...[...new Set(all.map((r) => r.horizon))].filter((h) => !horizons.includes(h))], [horizons, all]);   // «sin horizonte» o valores fuera del catálogo también se muestran
  const sum = portfolioSummary(rows, hzAll);
  const tactical = rows.filter((r) => r.c.transfer);
  const DEC: (Decision | "PENDIENTE")[] = ["IMPLEMENTAR", "PREPARAR", "BACKLOG", "RENUNCIAR", "PENDIENTE"];
  const label = (d: Decision | "PENDIENTE") => d === "PENDIENTE" ? "Pendiente" : decisionLabel(d);
  const download = () => {
    const blob = new Blob(["﻿" + portfolioCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `portafolio-${cat.company.slug}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] text-muted">Separar la naturaleza de la apuesta (horizonte), la fecha de inicio y el momento de captura de valor; aprobar, condicionar, posponer o descartar. Las decisiones se registran en la ficha de cada iniciativa.</p>
        <button onClick={download} className="btn-ghost w-full justify-center !py-1.5 text-[11.5px] sm:ml-auto sm:w-auto"><Download size={12} /> Exportar CSV{filtered ? ` (${rows.length})` : ""}</button>
      </div>
      <Card className="rise mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Filter size={13} className="shrink-0 text-cyan-deep" />
          <span className="num text-[12px] font-bold text-ink">{rows.length} de {all.length} iniciativas{filtered ? "" : " · 100 %"}</span>
          <select value={fOe} onChange={(e) => setFOe(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[300px]" title="Objetivo estratégico"><option value="">Todos los objetivos (OE)</option>{oes.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}</select>
          <select value={fTribe} onChange={(e) => setFTribe(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[260px]" title="Tribu o área responsable"><option value="">Todas las tribus</option>{tribes.map((t) => <option key={t.id} value={t.id}>{t.dependencia || t.cargo}</option>)}</select>
          <select value={fLever} onChange={(e) => setFLever(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto" title="Palanca"><option value="">Todas las palancas</option>{levers.map((l) => <option key={l.id} value={l.id}>{l.order}. {l.name}</option>)}</select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value as PortStatus)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto" title="Estado"><option value="">Todos los estados</option>{PORT_STATUS.filter((x) => x.key).map((x) => <option key={x.key} value={x.key}>{x.label} ({count(x.key)})</option>)}</select>
          {filtered && <button type="button" onClick={() => { setFOe(""); setFTribe(""); setFLever(""); setFStatus(""); }} className="btn-ghost !py-1.5 text-[11.5px]"><X size={12} /> Quitar filtros</button>}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2">
          {(["PENDIENTE", "RENUNCIAR", "SIN_DUENO", "SIN_KR", "TACTICA", "SIN_EVAL"] as PortStatus[]).map((st) => (
            <button key={st} type="button" onClick={() => setFStatus(fStatus === st ? "" : st)} className={`chip !py-0.5 text-[10.5px] ${fStatus === st ? "chip-cyan" : ""}`} title="Filtrar por este estado">{PORT_STATUS.find((x) => x.key === st)!.label} · {count(st)}</button>
          ))}
        </div>
      </Card>
      <Card className="rise mb-5 overflow-hidden">
        <CardHeader title="Resumen por horizonte y decisión" />
        <div className="space-y-2 px-4 pb-3 sm:hidden">
          {hzAll.map((h) => (
            <div key={h} className="rounded-xl bg-surface-2/60 px-3 py-2">
              <div className="flex items-baseline justify-between text-[12.5px]"><b className="text-ink">{horizonLabel(cat.company, h)}</b><span className="num text-muted">{DEC.reduce((a, d) => a + (sum[h]?.[d] ?? 0), 0)} iniciativas</span></div>
              <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">{DEC.map((d) => <span key={d}>{label(d)} <b className="text-ink">{sum[h]?.[d] ?? 0}</b></span>)}</div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto px-2 pb-3 sm:block">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Horizonte</th>{DEC.map((d) => <th key={d} className="num px-2 py-2 text-center">{label(d)}</th>)}<th className="num px-2 py-2 text-right">Total</th></tr></thead>
            <tbody>
              {hzAll.map((h) => <tr key={h} className="border-t border-line"><td className="px-3 py-2 font-bold text-ink">{h ? horizonLabel(cat.company, h) : "Sin horizonte"}</td>{DEC.map((d) => <td key={d} className="num px-2 py-2 text-center font-bold text-ink">{sum[h]?.[d] ?? 0}</td>)}<td className="num px-2 py-2 text-right text-muted">{DEC.reduce((a, d) => a + (sum[h]?.[d] ?? 0), 0)}</td></tr>)}
            </tbody>
          </table>
          <p className="px-3 pt-2 text-[11px] text-muted">
            Validación con {validationLabel(typeRuleOf(cat.company))}. {tactical.length ? <>Tácticas según el consolidado (se transfieren al área responsable y no compiten en el portafolio): <b className="text-ink">{tactical.length}</b> · {tactical.map((t) => t.id).join(", ")}.</> : typeRuleOf(cat.company).excludeTactical ? "Ninguna iniciativa evaluada quedó como táctica." : ""}
          </p>
        </div>
      </Card>
      {hzAll.map((h) => {
        const hr = rows.filter((r) => r.horizon === h).sort((a, b) => (b.c.n ? b.c.score : -1) - (a.c.n ? a.c.score : -1));
        if (filtered && hr.length === 0) return null;
        return (
          <Card key={h} className="rise rise-1 mb-5 overflow-hidden">
            <CardHeader title={h ? horizonLabel(cat.company, h) : "Sin horizonte"} sub={`${hr.length} iniciativas · ordenadas por puntaje consolidado`} />
            <div className="divide-y divide-line sm:hidden">
              {hr.map((r) => (
                <Link key={r.id} href={`${base}/panel/iniciativas/${r.id}`} className="block px-4 py-3 active:bg-cyan-wash">
                  <div className="flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold leading-snug text-ink">{r.name}</span>
                      <span className="num block text-[10.5px] text-faint">{r.id} · {r.lever ?? "—"} · {r.owner ?? "—"}</span>
                    </span>
                    <span className="num shrink-0 text-[18px] font-extrabold" style={{ color: r.c.n ? SCORE_COLOR(r.c.score) : "var(--faint)" }}>{r.c.n ? r.c.score : "—"}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <HorizonHint compact current={r.horizon} suggested={r.suggested} company={cat.company} />
                    {r.decision ? <span className={DECISION_CLS[r.decision]}>{decisionLabel(r.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}
                  </div>
                  {r.rationale && <p className="mt-1 text-[11px] leading-snug text-ink-soft">{r.rationale}</p>}
                </Link>
              ))}
              {hr.length === 0 && <p className="px-4 py-3 text-[12px] italic text-faint">Sin iniciativas en este horizonte.</p>}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-[12px]">
                <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="px-4 py-2">Iniciativa</th><th className="px-2 py-2">Palanca</th><th className="num px-2 py-2 text-right">Puntaje</th><th className="px-2 py-2">Sugerido</th><th className="px-2 py-2">Decisión</th><th className="px-2 py-2">Motivo</th></tr></thead>
                <tbody>
                  {hr.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2"><Link href={`${base}/panel/iniciativas/${r.id}`} className="font-bold text-ink hover:text-cyan-deep">{r.name}</Link><div className="num text-[10px] text-faint">{r.id} · {r.owner ?? "—"}</div></td>
                      <td className="px-2 py-2 text-[11px] text-muted">{r.lever ?? "—"}</td>
                      <td className="num px-2 py-2 text-right font-extrabold" style={{ color: r.c.n ? SCORE_COLOR(r.c.score) : "var(--faint)" }}>{r.c.n ? r.c.score : "—"}</td>
                      <td className="px-2 py-2"><HorizonHint compact current={r.horizon} suggested={r.suggested} company={cat.company} /></td>
                      <td className="px-2 py-2">{r.decision ? <span className={DECISION_CLS[r.decision]}>{decisionLabel(r.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}</td>
                      <td className="px-2 py-2 text-[11px] leading-snug text-ink-soft">{r.rationale ?? ""}</td>
                    </tr>
                  ))}
                  {hr.length === 0 && <tr><td colSpan={6} className="px-4 py-3 text-[12px] italic text-faint">Sin iniciativas en este horizonte.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
      <div className="rise rise-2 flex items-start gap-2 rounded-xl bg-cyan-wash/50 px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
        <Presentation size={14} className="mt-0.5 shrink-0 text-cyan-deep" />
        <span>Ratificación ejecutiva: las renuncias exigen motivo registrado; lo no resuelto queda explícitamente pendiente. El seguimiento posterior sigue el ritmo de la empresa (trimestres y sprints) desde <Link href={`${base}/panel/proyectos`} className="font-semibold text-cyan-deep hover:underline">Proyectos</Link>.</span>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className="label !text-[8.5px]">{label}</span><div className="mt-1">{children}</div></label>;
}

/* ═══ QR de acceso por sección ═══ */

type AccessRow = { section: AccessSection; label: string; role: "LIDER" | "DIRECTIVO"; token: string; url: string; what: string };

function AccesoQrModal({ section, onClose }: { section: Tab; onClose: () => void }) {
  const [rows, setRows] = useState<AccessRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    fetch("/api/td/convencion/acceso").then(async (res) => { const j = await res.json().catch(() => null); if (!on) return; if (!res.ok) setError(j?.error ?? `Error ${res.status}`); else setRows(j.access); }).catch(() => { if (on) setError("No se pudo conectar con el servidor."); });
    return () => { on = false; };
  }, []);
  const post = async (sec: AccessSection, body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    const res = await fetch("/api/td/convencion/acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: sec, ...body }) });
    const j = await res.json().catch(() => null);
    if (!res.ok) setError(j?.error ?? `Error ${res.status}`); else setRows(j.access);
    setBusy(false);
  };
  const meta = TABS.find((t) => t.id === section)!;
  const mine = rows ?? [];   // un solo acceso para toda la convención
  void section;
  return (
    <Modal wide title="QR de la convención" sub="Un solo QR para los dos días. Quien lo escanea escribe su nombre y correo, elige su tribu y su rol (miembro o líder de tribu), acepta el tratamiento de datos y entra a la plataforma. El correo identifica: la cuenta se crea una sola vez y se reutiliza." onClose={onClose}
      footer={<button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cerrar</button>}>
      {error && <p className="mb-3 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, white)" }}>{error}</p>}
      {!rows ? <p className="text-[12px] text-muted">Cargando…</p> : (
        <div className="space-y-4">
          {mine.map((row) => {
            const def = ACCESS_SECTIONS.find((x) => x.id === row.section)!;
            return (
              <div key={row.section} className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-[200px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/td/convencion/acceso/qr?section=${row.section}&v=${row.token}`} alt={`QR de acceso a ${row.label}`} className="w-[200px] rounded-xl border border-line bg-white p-2" />
                <div className="min-w-0 space-y-2.5 text-[12.5px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-extrabold text-ink">{row.label}</span>
                    <span className="chip chip-gold !py-0 text-[9.5px]">miembro: ve y califica lo de su tribu · líder: además registra OKR y vincula iniciativas</span>
                  </div>
                  <p className="text-[11.5px] leading-snug text-muted">{def.what}</p>
                  <div className="num break-all rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-ink">{row.url}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={async () => { await navigator.clipboard.writeText(row.url); setCopied(row.section); setTimeout(() => setCopied(null), 1500); }} className="btn-primary !py-1.5 text-[11.5px]">{copied === row.section ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied === row.section ? "Copiado" : "Copiar enlace"}</button>
                    <a href={`/api/td/convencion/acceso/qr?section=${row.section}&v=${row.token}`} download={`qr-${row.section}.svg`} className="btn-ghost !py-1.5 text-[11.5px]"><Download size={12} /> SVG</a>
                    <button type="button" onClick={() => { if (confirm("Al regenerar, los QR impresos con el enlace anterior dejan de valer. ¿Continuar?")) void post(row.section, { regenerate: true }); }} disabled={busy} className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40"><RefreshCw size={12} /> Regenerar</button>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-muted">{meta.agenda}. Imprime el QR en cada mesa y proyéctalo al abrir cada bloque. Quien ya tiene cuenta conserva su rol; quien entra como líder recibe el permiso de edición solo durante esa sesión. Al cerrar la convención, «Regenerar» invalida el enlace.</p>
        </div>
      )}
    </Modal>
  );
}

/* ═══ Itinerario de la convención (modo sesión) ═══ */

type ItinData = { itinerary: ItineraryT | null; audience?: "organizador" | "participantes"; comments: ItineraryComment[]; publicUrl: string | null; publicUrlP?: string | null; canManage: boolean };

function ItinerarioTab() {
  const [data, setData] = useState<ItinData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let on = true;
    fetch("/api/td/itinerario").then(async (res) => { const j = await res.json().catch(() => null); if (!on) return; if (!res.ok) setError(j?.error ?? `Error ${res.status}`); else setData(j); }).catch(() => { if (on) setError("No se pudo conectar con el servidor."); });
    return () => { on = false; };
  }, []);
  const post = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    const res = await fetch("/api/td/itinerario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); return false; }
    setData((d) => ({ itinerary: j.itinerary, audience: d?.audience, comments: j.comments, publicUrl: j.publicUrl, publicUrlP: j.publicUrlP ?? null, canManage: d?.canManage ?? false }));
    return true;
  };
  if (!data && !error) return <p className="text-[12.5px] text-muted">Cargando el itinerario…</p>;
  if (!data?.itinerary) {
    return (
      <Card className="rise p-6">
        <EmptyNote>{data?.canManage ? "Esta empresa aún no tiene itinerario cargado. Carga el JSON generado desde la guía de facilitación (Cresio/Convención/itinerario.json)." : "El equipo organizador aún no ha publicado la agenda."}</EmptyNote>
        {data?.canManage && <label className="btn-primary mt-3 inline-flex cursor-pointer !py-2 text-[12px]"><Upload size={12} /> Cargar JSON<input type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await post({ op: "set", itinerary: JSON.parse(await f.text()) }); } catch { setError("El archivo no es un JSON válido."); } }} /></label>}
        {error && <p className="mt-3 text-[12px] text-bad">{error}</p>}
      </Card>
    );
  }
  return (
    <ItinerarioView itinerary={data.itinerary} comments={data.comments} mode="sesion" audience={data.audience ?? "organizador"} canManage={data.canManage} publicUrl={data.publicUrl} publicUrlP={data.publicUrlP ?? null} error={error} busy={busy}
      onComment={(momentId, kind, text) => post({ op: "comment", momentId, kind, text })}
      onPublish={async (on, regenerate, audience) => { await post({ op: "publish", on, regenerate, audience }); }}
      onUpload={async (json) => { await post({ op: "set", itinerary: json }); }}
      onSave={(it) => post({ op: "set", itinerary: it })}
      onUploadFile={async (file, group) => {
        setBusy(true); setError(null);
        const fd = new FormData(); fd.append("file", file); fd.append("group", group);
        const res = await fetch("/api/td/itinerario/material", { method: "POST", body: fd });
        const j = await res.json().catch(() => null); setBusy(false);
        if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); return false; }
        setData((d) => d ? { ...d, itinerary: j.itinerary } : d); return true;
      }}
      onUploadMomentFile={async (momentId, file) => {
        // sube el PDF y lo vincula al momento desde el que se subió (los vínculos previos se conservan)
        setBusy(true); setError(null);
        const fd = new FormData(); fd.append("file", file); fd.append("group", "material");
        const res = await fetch("/api/td/itinerario/material", { method: "POST", body: fd });
        const j = await res.json().catch(() => null); setBusy(false);
        if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); return false; }
        const it = j.itinerary as ItineraryT; setData((d) => d ? { ...d, itinerary: it } : d);
        const id = String(j.file?.id ?? ""); if (!id) return false;
        const prev = it.items.find((x) => x.id === momentId)?.files ?? [];
        return post({ op: "files", momentId, fileIds: prev.includes(id) ? prev : [...prev, id] });
      }}
      onRemoveFile={(id) => post({ op: "removeFile", id })}
      onMomentFiles={(momentId, fileIds) => post({ op: "files", momentId, fileIds })}
      onResolve={async (id, resolved) => { await post({ op: "resolve", id, resolved }); }}
      onDelete={async (id) => { await post({ op: "delete", id }); }} />
  );
}
