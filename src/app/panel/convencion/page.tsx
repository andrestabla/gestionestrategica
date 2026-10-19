"use client";

// Convención de planeación: apoyo a la facilitación en vivo.
//   Dirección 3x3   → objetivos por palanca y horizonte (mesa redonda, talleres 2027/2030/2033)
//   OKR         → objetivos del primer horizonte con sus resultados clave y reglas de calidad
//   Iniciativas → qué iniciativa mueve cada resultado clave; vinculación en vivo
//   Priorización→ cobertura de la evaluación con la matriz, ranking y actividad por evaluador
//   Portafolio  → por horizonte y decisión, renuncias con motivo, exportación CSV
// Edita quien administra el catálogo (advisor, gerencia); los demás ven en vivo.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { templatesFor } from "@/lib/okr-plantillas";
import { sessionOf, PRIO_STATUS_LABEL, type PrioSessionAction } from "@/lib/priorizacion-sesion";
import { ejemploPara, type OkrSugerido, type KrSugerido, type ValidacionOkr, type KrPropuesta } from "@/lib/okr-sugerencias";
import type { Evidencia } from "@/data/conocimiento-sector";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ItinerarioView } from "@/components/itinerario";
import type { Itinerary as ItineraryT, ItineraryComment } from "@/lib/itinerario";
import Link from "next/link";
import { PageHeader, Card, CardHeader, StatCard, Modal, EmptyNote } from "@/components/ui";
import { AccessChip, useCan, useBase, useUser } from "@/components/user-context";
import { ACCESS_SECTIONS, type AccessSection } from "@/lib/acceso";
import { useCatalog, useCatalogRefetch } from "@/components/catalog-context";
import { horizonsOf, horizonLabel, leversOf, typeRuleOf, isConvencion, type Lever } from "@/data/catalogo";
import { PERSPECTIVES, type CmiObjective, type KpiFull, type InitiativeFull } from "@/data/cmi";
import { LINES } from "@/data/demo";
import { objectivesMatrix, keyResultsOf, healthKpisOf, initiativesOfKr, okrChecks, okrObjectivesOf, KR_MAX, evaluationCoverage, portfolioSummary, portfolioCsv, type PortfolioRow } from "@/lib/convencion";
import { usePriorizacion, DECISION_CLS, HorizonHint, type PriorizacionData } from "@/components/priorizacion";
import { CRITERIA, decisionLabel, validationLabel, validationCriteriaCount, type Decision } from "@/lib/priorizacion";
import { Presentation, Target, Gauge, Rocket, Scale, Layers, Plus, Pencil, Loader2, Save, AlertTriangle, X, Download, RefreshCw, Users, CheckCircle2, Link2, QrCode, Copy, CalendarDays, Upload, Filter, Lock, ArrowUp, ArrowDown, Sparkles, BookOpen, HelpCircle } from "lucide-react";

type Tab = "itinerario" | "guia" | "direccion" | "okr" | "iniciativas" | "priorizacion" | "portafolio";
const TABS: { id: Tab; label: string; icon: typeof Target; agenda: string }[] = [
  { id: "itinerario", label: "Itinerario", icon: CalendarDays, agenda: "Ruta de los dos días: metodología, materiales, plataforma y comentarios del equipo organizador" },
  { id: "guia", label: "Guía del día 2", icon: BookOpen, agenda: "Qué hace cada tribu en la mesa y en la plataforma, etapa por etapa" },
  { id: "direccion", label: "Dirección 3x3", icon: Target, agenda: "Día 1 · mesa redonda y talleres 2027 / 2030 / 2033" },
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
  const canCreate = useCan("create_initiatives");   // crea iniciativas y edita o elimina las suyas (líder, directivo por QR, advisor)
  const canAccess = useCan("manage_users");
  const me = useUser();
  // quien entró por el QR (o no administra el catálogo) ve la agenda de participantes, no el itinerario del equipo organizador
  const guest = !!me.qr || !(me.role === "ADMIN" || me.role === "CONSULTOR" || me.role === "LIDER");
  // en la convención, el líder de tribu (con tribu asignada) solo edita el OKR, los KR y las iniciativas de su tribu; gerencia, advisor y admin, todo
  const tribeScope = isConvencion(v.catalog.company) && me.role === "LIDER" && me.responsibleId ? me.responsibleId : null;
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
      {tab === "guia" && <GuiaTab me={me} />}
      {tab === "direccion" && <DireccionTab cat={cat} levers={levers} horizons={horizons} canEdit={canEdit && (!isConvencion(cat.company) || me.role === "ADMIN" || me.role === "CONSULTOR")} saving={saving} mutate={mutate} />}
      {tab === "okr" && <OkrTab cat={cat} levers={levers} horizon={first} canEdit={canEdit} scope={tribeScope} saving={saving} mutate={mutate} base={base} />}
      {tab === "iniciativas" && <IniciativasTab cat={cat} levers={levers} horizon={first} canEdit={canEdit} canCreate={canCreate} scope={tribeScope} me={me.email} saving={saving} mutate={mutate} base={base} defaultOwner={me.responsibleId} />}
      {tab === "priorizacion" && <PriorizacionTab cat={cat} levers={levers} prio={prio} base={base} onRefresh={() => void refetchPrio()} onCatalogRefresh={() => void refetch()} me={me} />}
      {tab === "portafolio" && <PortafolioTab cat={cat} levers={levers} horizons={horizons.map((h) => h.id)} prio={prio} base={base} />}
    </div>
  );
}

type Mutate = (entity: string, op: "upsert" | "delete", data: unknown) => Promise<boolean>;
type Cat = ReturnType<typeof useCatalog>["catalog"];

/* ═══ Dirección 3x3: palanca × horizonte ═══ */

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
      {isConvencion(cat.company) && <p className="mb-4 rounded-xl px-4 py-2.5 text-[12px] leading-snug text-ink-soft" style={{ background: "color-mix(in srgb, var(--gold) 14%, white)" }}><b>Dirección 3x3 es informativa:</b> agrupa los objetivos estratégicos de CRESIO por palanca. El objetivo rector de cada palanca es el objetivo del único OKR de su tribu; el día 2 no se modifica (solo el relator registra ajustes ratificados).</p>}
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

function ObjectiveForm({ cat, levers, horizons, initial, preset, saving, onCancel, onSubmit, onDelete, okr = false, directive = [] }: {
  cat: Cat; levers: Lever[]; horizons: { id: string; label: string }[]; initial: CmiObjective | null; preset?: { lever?: string; horizon?: string; name?: string; desc?: string; indicator?: string }; saving: boolean;
  onCancel: () => void; onSubmit: (d: Record<string, unknown>) => Promise<boolean>; onDelete?: () => void;
  okr?: boolean;                 // objetivo de la tribu (laboratorio de OKR): sin perspectiva ni pilar; solo la palanca
  directive?: CmiObjective[];    // objetivos directivos del horizonte, solo como referencia (no se selecciona ninguno)
}) {
  const [f, setF] = useState({
    name: initial?.name ?? preset?.name ?? "", desc: initial?.desc ?? preset?.desc ?? "", indicator: initial?.indicator ?? preset?.indicator ?? "", pillar: initial?.pillar ?? "",
    lever: initial?.lever ?? preset?.lever ?? levers[0]?.id ?? "", horizon: initial?.horizon ?? preset?.horizon ?? horizons[0]?.id ?? "",
    perspective: initial?.perspective ?? "clientes", line: String(initial?.line ?? ""),
  });
  const parents = directive.filter((o) => !f.lever || o.lever === f.lever);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const pillars = [...new Set(cat.objectives.map((o) => o.pillar).filter(Boolean))] as string[];
  // laboratorio de OKR: con palanca y objetivo escritos, el modelo propone los resultados clave; la tribu elige cuáles crear
  const tribe = cat.responsibles.find((r) => r.id === levers.find((l) => l.id === f.lever)?.ownerId);
  const [sug, setSug] = useState<{ loading: boolean; error: string | null; okr: OkrSugerido | null; chosen: boolean[]; fuentes: Evidencia[] }>({ loading: false, error: null, okr: null, chosen: [], fuentes: [] });
  const [verFuentes, setVerFuentes] = useState(false);
  const puedeSugerir = okr && !!f.lever && f.name.trim().length >= 10;
  const pedir = async () => {
    setSug({ loading: true, error: null, okr: null, chosen: [], fuentes: [] });
    const res = await fetch("/api/td/okr/sugerir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lever: f.lever, tribe: tribe?.id, objective: { name: f.name.trim(), desc: f.desc.trim(), indicator: f.indicator.trim() } }) });
    const j = await res.json().catch(() => null);
    if (!res.ok) { setSug({ loading: false, error: j?.error ?? `Error ${res.status}`, okr: null, chosen: [], fuentes: [] }); return; }
    const p: OkrSugerido | undefined = j?.propuestas?.[0];
    if (!p) { setSug({ loading: false, error: "El modelo no devolvió una propuesta utilizable; inténtalo de nuevo.", okr: null, chosen: [], fuentes: [] }); return; }
    setSug({ loading: false, error: null, okr: p, chosen: p.krs.map(() => true), fuentes: Array.isArray(j?.fuentes) ? j.fuentes : [] });
  };
  const krsElegidos = sug.okr ? sug.okr.krs.filter((_, n) => sug.chosen[n]) : [];
  const redaccionDistinta = !!sug.okr && sug.okr.objective.name.trim() !== f.name.trim();
  return (
    <Modal title={initial ? `Objetivo · ${initial.id}` : okr ? "Nuevo objetivo de la tribu" : "Nuevo objetivo"} sub={okr ? "primero el objetivo; después, de 2 a 4 resultados clave (máximo 5)" : "aspiración, indicador impulsor, palanca y horizonte"} onClose={onCancel}
      footer={<>
        {onDelete && <button type="button" onClick={onDelete} className="btn-ghost mr-auto !py-2 text-[12px] text-bad">Eliminar</button>}
        <button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || f.name.trim().length < 5} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40"
          onClick={() => onSubmit({ name: f.name.trim(), desc: f.desc.trim(), indicator: f.indicator.trim(), pillar: f.pillar.trim(), lever: f.lever, horizon: f.horizon, perspective: f.perspective, kpis: initial?.kpis ?? [], ...(f.line ? { line: Number(f.line) } : {}), ...(krsElegidos.length ? { krs: krsElegidos } : {}) })}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {initial ? "Guardar" : "Crear"}{krsElegidos.length ? ` + ${krsElegidos.length} KR` : ""}
        </button>
      </>}>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Palanca"><select value={f.lever} onChange={set("lever")} className={INPUT}><option value="">— sin palanca —</option>{levers.map((l) => <option key={l.id} value={l.id}>{l.order}. {l.name}</option>)}</select></Field>
          {okr
            ? <Field label="Tribu"><input value={cat.responsibles.find((r) => r.id === levers.find((l) => l.id === f.lever)?.ownerId)?.dependencia ?? "—"} disabled className={INPUT} /></Field>
            : <Field label="Horizonte"><select value={f.horizon} onChange={set("horizon")} className={INPUT}><option value="">— sin horizonte —</option>{horizons.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}</select></Field>}
        </div>
        {okr && parents.length > 0 && <p className="text-[11px] leading-snug text-faint">Lineamientos del Directorio para esta palanca (Dirección 3x3): {parents.map((o) => o.name.slice(0, 70)).join(" · ")}.</p>}
        <Field label={okr ? (initial?.parent ? "Objetivo del OKR · objetivo rector de la palanca (se adopta tal cual)" : "Objetivo 2027 de la tribu") : "Objetivo"}><input value={f.name} onChange={set("name")} disabled={okr && !!initial?.parent} placeholder={okr ? "Qué logra la tribu en 2027: concreta el lineamiento, con su «cuánto» en los resultados clave" : "Qué se logra o queda habilitado"} className={INPUT} /></Field>
        <Field label="Aspiración (estado deseado)"><textarea value={f.desc} onChange={set("desc")} rows={3} placeholder="¿Qué necesitamos lograr o dejar habilitado?" className={`${INPUT} resize-y`} /></Field>
        <Field label="Indicador impulsor"><input value={f.indicator} onChange={set("indicator")} placeholder="¿Cómo mediremos ese avance? (complementa el indicador de la palanca)" className={INPUT} /></Field>
        {okr && (
          <div className="rounded-xl border border-dashed border-line px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void pedir()} disabled={!puedeSugerir || sug.loading} className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40" title={puedeSugerir ? "El modelo propone los resultados clave de este objetivo" : "Elige la palanca y escribe el objetivo"}>
                {sug.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {sug.okr ? "Otra propuesta" : "Sugerir OKR"}
              </button>
              {sug.okr && sug.fuentes.length > 0 && <FuentesButton onClick={() => setVerFuentes(true)} />}
              <span className="text-[11px] text-faint">{puedeSugerir ? `Resultados clave sugeridos para este objetivo${tribe ? ` y ${tribe.dependencia}` : ""}; eliges cuáles se crean.` : "Con la palanca y el objetivo escritos, el modelo propone sus resultados clave."}</span>
            </div>
            {sug.error && <p className="mt-2 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, white)" }}>{sug.error}</p>}
            {sug.okr && (
              <div className="mt-2.5 space-y-1.5">
                {redaccionDistinta && (
                  <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-[12px]">
                    <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">Redacción sugerida del objetivo</div>
                    <div className="text-ink">{sug.okr.objective.name}</div>
                    <button type="button" onClick={() => setF({ ...f, name: sug.okr!.objective.name, desc: f.desc || (sug.okr!.objective.desc ?? ""), indicator: f.indicator || (sug.okr!.objective.indicator ?? "") })} className="mt-1 text-[11px] font-semibold text-cyan-deep hover:underline">Usar esta redacción</button>
                  </div>
                )}
                <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">Resultados clave propuestos (marca los que se crean)</div>
                {sug.okr.krs.map((k, n) => (
                  <label key={n} className="flex cursor-pointer items-start gap-2 rounded-lg bg-surface-2/60 px-3 py-2 text-[12px]">
                    <input type="checkbox" checked={!!sug.chosen[n]} onChange={(e) => setSug({ ...sug, chosen: sug.chosen.map((c, m) => (m === n ? e.target.checked : c)) })} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="font-semibold text-ink">{k.name}</span> <span className="num text-muted">· {k.unit} · mejor si {k.goodDirection === "down" ? "baja" : "sube"} · {k.frequency}</span><Refs n={k.sources} />
                      {(k.formula || k.definition) && <span className="block text-[11px] text-muted">{k.definition ? k.definition + " " : ""}{k.formula ? `Fórmula: ${k.formula}` : ""}</span>}
                      {k.why && <span className="block text-[11px] italic text-faint">{k.why}</span>}
                    </span>
                  </label>
                ))}
                {verFuentes && <FuentesModal fuentes={sug.fuentes} usadas={usadasDe(sug.okr)} onClose={() => setVerFuentes(false)} />}
                <p className="text-[11px] leading-snug text-faint">Se crean con línea base 0 y la meta sugerida (si la hay), dueño {tribe?.dependencia ?? "la tribu"} y plazo a fin de {horizons[0]?.label ?? "horizonte"}; la tribu fija base y meta reales en la mesa.</p>
              </div>
            )}
          </div>
        )}
        {!okr && <div className="grid grid-cols-2 gap-2">
          <Field label="Pilar corporativo"><input list="pilares" value={f.pillar} onChange={set("pillar")} placeholder="p. ej. El ser humano" className={INPUT} /><datalist id="pilares">{pillars.map((p) => <option key={p} value={p} />)}</datalist></Field>
          <Field label="Perspectiva del cuadro de mando"><select value={f.perspective} onChange={set("perspective")} className={INPUT}>{PERSPECTIVES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        </div>}
        {!okr && <Field label="Capacidad 4Shine dominante (opcional)"><select value={f.line} onChange={set("line")} className={INPUT}><option value="">—</option>{LINES.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.name}</option>)}</select></Field>}
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

function OkrTab({ cat, levers, horizon, canEdit, scope, saving, mutate, base }: { cat: Cat; levers: Lever[]; horizon: string; canEdit: boolean; scope: string | null; saving: boolean; mutate: Mutate; base: string }) {
  // primero los objetivos (los escribe cada tribu, a partir del objetivo directivo de su palanca), después sus resultados clave
  const allObjectives = okrObjectivesOf(cat, horizon);
  const directive = cat.objectives.filter((o) => o.horizon === horizon && !o.okr);
  const issues = okrChecks(cat, horizon);
  const [kr, setKr] = useState<{ obj: CmiObjective; kpi: KpiFull | null } | null>(null);
  const [obj, setObj] = useState<CmiObjective | { lever?: string; name?: string; desc?: string; indicator?: string } | null>(null);
  const editingObj = obj && "id" in obj ? (obj as CmiObjective) : null;
  const [ejemplo, setEjemplo] = useState<string | null>(null);   // palanca cuyo ejemplo se muestra
  const owner = (id: string) => cat.responsibles.find((r) => r.id === id)?.dependencia ?? "—";
  // filtros: palanca y tribu (la tribu dueña de la palanca o de alguno de los KR); los objetivos no se filtran uno a uno
  const [fLever, setFLever] = useState(""); const [fTribe, setFTribe] = useState("");
  const tribeOf = (o: CmiObjective) => { const l = levers.find((x) => x.id === o.lever); return l?.ownerId ?? ""; };
  // el líder de tribu solo edita el OKR de su tribu (ámbito); los demás objetivos los ve
  const canEditObj = (o: CmiObjective) => canEdit && (!scope || tribeOf(o) === scope);
  const inTribe = (o: CmiObjective, t: string) => !t || tribeOf(o) === t || keyResultsOf(cat, o).some((k) => k.ownerId === t);
  const objectives = allObjectives.filter((o) => (!fLever || o.lever === fLever) && inTribe(o, fTribe));
  // en la convención se ven siempre las palancas (aunque aún no tengan objetivos de la tribu); los objetivos directivos no aparecen aquí
  const convencion = isConvencion(cat.company);
  // tribus del filtro: en la convención, todas (hay que elegir una para pedir sugerencias); si no, las que ya tienen objetivos o KR
  const tribes = convencion ? cat.responsibles.filter((r) => /tribu/i.test(r.dependencia ?? "") || levers.some((l) => l.ownerId === r.id))
    : cat.responsibles.filter((r) => allObjectives.some((o) => inTribe(o, r.id) && (tribeOf(o) === r.id || keyResultsOf(cat, o).some((k) => k.ownerId === r.id))));
  const byLever = [...levers.filter((l) => !fLever || l.id === fLever).map((l) => ({ key: l.id, label: `${l.order}. ${l.name}`, objs: objectives.filter((o) => o.lever === l.id) })), { key: "", label: "Sin palanca", objs: objectives.filter((o) => !o.lever || !levers.some((l) => l.id === o.lever)) }].filter((g) => g.objs.length || (convencion && g.key));   // en la convención, las palancas se ven siempre (con o sin tribu elegida)
  const high = issues.filter((i) => i.level === "alto").length;
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard label={`Objetivos ${horizonLabel(cat.company, horizon)}`} value={allObjectives.length} foot={`${allObjectives.filter((o) => keyResultsOf(cat, o).length >= 2 && keyResultsOf(cat, o).length <= 5).length} con 2 a 4 resultados clave (máximo 5)`} accent={allObjectives.every((o) => keyResultsOf(cat, o).length >= 2 && keyResultsOf(cat, o).length <= 5) ? "linear-gradient(90deg, var(--ok), #2f8f5b)" : undefined} />
        <StatCard label="Resultados clave" value={objectives.reduce((a, o) => a + keyResultsOf(cat, o).length, 0)} foot="indicador, base, meta, dueño y plazo" />
        <StatCard label="Alertas de calidad" value={issues.length} foot={`${high} de nivel alto`} accent={issues.length ? "linear-gradient(90deg, var(--warn), var(--bad))" : "linear-gradient(90deg, var(--ok), #2f8f5b)"} />
        <StatCard label="Iniciativas vinculadas" value={cat.initiatives.filter((i) => i.horizon === horizon && i.kpi).length} unit={`de ${cat.initiatives.filter((i) => i.horizon === horizon).length}`} foot="mueven un resultado clave" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={13} className="shrink-0 text-cyan-deep" />
        <span className="num text-[12px] font-bold text-ink">{objectives.length} de {allObjectives.length} objetivos</span>
        <select value={fLever} onChange={(e) => setFLever(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[260px]" title="Palanca"><option value="">Todas las palancas</option>{levers.map((l) => <option key={l.id} value={l.id}>{l.order}. {l.name}</option>)}</select>
        <select value={fTribe} onChange={(e) => setFTribe(e.target.value)} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[260px]" title="Tribu"><option value="">Todas las tribus</option>{tribes.map((t) => <option key={t.id} value={t.id}>{t.dependencia || t.cargo}</option>)}</select>
        {(fLever || fTribe) && <button type="button" onClick={() => { setFLever(""); setFTribe(""); }} className="btn-ghost !py-1.5 text-[11.5px]"><X size={12} /> Quitar filtros</button>}
        {canEdit && !convencion && <button type="button" onClick={() => setObj({ lever: fLever || undefined })} className="btn-primary ml-auto !py-1.5 text-[11.5px]"><Plus size={12} /> Objetivo</button>}
        {!canEdit && <span className="ml-auto text-[10.5px] text-faint">Solo lectura: el líder de cada tribu registra con el QR de edición.</span>}
      </div>
      {allObjectives.length === 0 && !convencion && <Card className="rise p-6"><EmptyNote>Aún no hay objetivos de las tribus en {horizonLabel(cat.company, horizon)}. Primero el objetivo ({canEdit ? "«+ Objetivo»: lo escribe la tribu a partir del objetivo directivo de su palanca" : "lo escribe el líder de cada tribu"}), después sus resultados clave: de 2 a 4 por objetivo, máximo 5.</EmptyNote></Card>}
      {allObjectives.length > 0 && objectives.length === 0 && <Card className="rise p-6"><EmptyNote>Ningún objetivo coincide con el filtro.</EmptyNote></Card>}
      {byLever.map((g) => (
        <Card key={g.key} className="rise mb-5 overflow-hidden">
          <CardHeader title={g.label} sub={g.objs.length ? `${g.objs.length} objetivo${g.objs.length === 1 ? "" : "s"} de la tribu en ${horizonLabel(cat.company, horizon)}` : "sin OKR todavía · un solo OKR por tribu: el objetivo rector de la palanca con 2 a 4 resultados clave (máximo 5)"}
            right={g.key ? <span className="flex flex-wrap justify-end gap-1.5">
              <button onClick={() => setEjemplo(g.key)} className="btn-ghost !py-1.5 text-[11.5px]" title="Un OKR completo de ejemplo para esta palanca"><BookOpen size={12} /> Ejemplo</button>
              {canEdit && (!scope || levers.find((l) => l.id === g.key)?.ownerId === scope) && (!convencion || g.objs.length === 0) && <button onClick={() => setObj({ lever: g.key })} className="btn-ghost !py-1.5 text-[11.5px]"><Plus size={12} /> Objetivo</button>}
            </span> : undefined} />
          <div className="divide-y divide-line">
            {g.objs.length === 0 && <div className="px-5 py-4"><EmptyNote>Un solo OKR por tribu: su objetivo es el objetivo rector de la palanca (el advisor lo registra tal cual) y la tribu define de 2 a 4 resultados clave (máximo 5){canEdit ? " con «+ Resultado clave» o «Sugerir OKR»" : "; los registra el líder"}.</EmptyNote></div>}
            {g.objs.map((o) => {
              const krs = keyResultsOf(cat, o);
              const mine = issues.filter((i) => i.ref === o.id || krs.some((k) => k.code === i.ref));
              return (
                <div key={o.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">{o.id}{o.parent ? <span className="ml-1.5 normal-case tracking-normal text-faint">· concreta {o.parent}</span> : null}</div>
                      <div className="text-[14px] font-extrabold leading-snug text-ink">{o.name}</div>
                      {o.indicator && <div className="mt-0.5 text-[11px] text-muted">Indicador impulsor: {o.indicator}</div>}
                    </div>
                    {canEditObj(o) && o.okr && <button onClick={() => setObj(o)} className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink" title="Editar el objetivo"><Pencil size={13} /></button>}
                    {canEditObj(o) && <button onClick={() => setKr({ obj: o, kpi: null })} className="btn-primary w-full justify-center !py-2 text-[12px] sm:w-auto sm:!py-1.5 sm:text-[11px]"><Plus size={12} /> Resultado clave</button>}
                  </div>
                  {krs.length > 0 && (
                    <div className="mt-3 space-y-2 sm:hidden">
                      {krs.map((k) => {
                        const bad = issues.find((i) => i.kind === "kr-incompleto" && i.ref === k.code); const noIni = issues.find((i) => i.kind === "kr-sin-iniciativa" && i.ref === k.code);
                        const body = (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="num shrink-0 text-[11px] font-extrabold text-cyan-deep">{k.code}</span>
                              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">{k.name}</span>
                              {canEditObj(o) && <Pencil size={13} className="mt-0.5 shrink-0 text-faint" />}
                            </div>
                            <div className="num mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                              <span>Base <b className="text-ink">{k.baseline || "—"}</b> → Meta <b className="text-ink">{k.target || "—"}</b> {k.unit}</span>
                              <span>{k.ownerId ? owner(k.ownerId) : <span className="text-warn">sin dueño</span>}</span>
                              <span>{k.due ?? <span className="text-warn">sin plazo</span>}</span>
                              <span>{initiativesOfKr(cat, k.code).length} inic.</span>
                              {bad && <span className="chip chip-warn !py-0 text-[9.5px]" title={bad.text}>incompleto</span>}{noIni && <span className="chip chip-bad !py-0 text-[9.5px]" title={noIni.text}>sin iniciativa</span>}
                            </div>
                          </>
                        );
                        return canEditObj(o)
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
                            const bad = issues.find((i) => i.kind === "kr-incompleto" && i.ref === k.code); const noIni = issues.find((i) => i.kind === "kr-sin-iniciativa" && i.ref === k.code);
                            return (
                              <tr key={k.code} className="border-t border-line">
                                <td className="num py-1.5 pr-2 font-bold text-cyan-deep">{k.code}</td>
                                <td className="py-1.5 pr-2 font-semibold text-ink">{k.name}{bad && <span className="ml-1 chip chip-warn !py-0 text-[9px]" title={bad.text}>incompleto</span>}{noIni && <span className="ml-1 chip chip-bad !py-0 text-[9px]" title={noIni.text}>sin iniciativa</span>}</td>
                                <td className="num py-1.5 pr-2 text-right text-muted">{k.baseline || "—"}</td>
                                <td className="num py-1.5 pr-2 text-right font-bold text-ink">{k.target || "—"}</td>
                                <td className="py-1.5 pr-2 text-muted">{k.unit}</td>
                                <td className="py-1.5 pr-2 text-muted">{k.ownerId ? owner(k.ownerId) : <span className="text-warn">sin dueño</span>}</td>
                                <td className="num py-1.5 pr-2 text-muted">{k.due ?? <span className="text-warn">sin plazo</span>}</td>
                                <td className="num py-1.5 pr-2 text-right text-muted">{initiativesOfKr(cat, k.code).length}</td>
                                <td className="py-1.5 text-right">{canEditObj(o) && <button onClick={() => setKr({ obj: o, kpi: k })} className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink" title="Editar"><Pencil size={12} /></button>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <AsistenteKr cat={cat} o={o} krs={krs} tribeId={levers.find((l) => l.id === o.lever)?.ownerId ?? ""} horizon={horizon} canEdit={canEditObj(o)} mutate={mutate} onEditKr={(k) => setKr({ obj: o, kpi: k })} />
                  {healthKpisOf(cat, o).length > 0 && (
                    <p className="mt-2 text-[10.5px] leading-snug text-faint"><span className="font-semibold text-muted">Métricas</span> (sin plazo, no cuentan como resultado clave): {healthKpisOf(cat, o).map((k) => `${k.code} ${k.name}`).join(" · ")}</p>
                  )}
                  {mine.filter((i) => i.kind !== "kr-incompleto" && i.kind !== "kr-sin-iniciativa").length > 0 && (
                    <ul className="mt-2 space-y-0.5">{mine.filter((i) => i.kind !== "kr-incompleto" && i.kind !== "kr-sin-iniciativa").map((i, n) => <li key={n} className={`text-[11px] ${i.level === "alto" ? "text-bad" : "text-warn"}`}>• {i.text}</li>)}</ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <p className="text-[11px] text-faint">Regla de calidad: primero el objetivo, después sus resultados clave, de 2 a 4 por objetivo (máximo 5); cada resultado clave con línea base, meta, dueño y plazo, y al menos una iniciativa que lo mueva. Un KPI con plazo es resultado clave; sin plazo, métrica del objetivo. Los valores de los KR se reportan en <Link href={`${base}/panel/kpi`} className="text-cyan-deep hover:underline">Indicadores</Link>.</p>
      {ejemplo && <OkrEjemploModal levers={levers} lever={ejemplo} onClose={() => setEjemplo(null)} onUsar={canEdit ? () => { const e = ejemploPara(ejemplo); setEjemplo(null); setObj({ lever: ejemplo, name: e.objective.name, desc: e.objective.desc, indicator: e.objective.indicator }); } : undefined} />}
      {obj && <ObjectiveForm cat={cat} levers={levers} horizons={[{ id: horizon, label: horizonLabel(cat.company, horizon) }]} initial={editingObj} preset={editingObj ? undefined : { ...(obj as { lever?: string; name?: string; desc?: string; indicator?: string }), horizon }} okr directive={directive} saving={saving} onCancel={() => setObj(null)}
        onSubmit={async (d) => {
          const { krs, ...data } = d as Record<string, unknown> & { krs?: KrSugerido[] };
          const body = { ...data, ...(editingObj ? { id: editingObj.id } : {}), okr: true, horizon };
          if (!krs?.length) { const ok = await mutate("objective", "upsert", body); if (ok) setObj(null); return ok; }
          const res = await fetch("/api/td/catalogo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "objective", op: "upsert", data: body }) });
          const j = await res.json().catch(() => null);
          if (!res.ok || !j?.id) { window.alert(j?.error ?? `Error ${res.status}`); return false; }
          const tribeId = levers.find((l) => l.id === String(data.lever))?.ownerId ?? "";
          const ok = await crearKrs(cat, j.id, String(data.lever), tribeId, horizon, krs, mutate, j.view?.catalog?.kpis);
          if (ok) setObj(null); return ok;
        }}
        onDelete={editingObj && keyResultsOf(cat, editingObj).length === 0 ? async () => { if (window.confirm(`¿Eliminar el objetivo ${editingObj.id}?`)) { const ok = await mutate("objective", "delete", { id: editingObj.id }); if (ok) setObj(null); } } : undefined} />}
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
  // un resultado clave se valida solo con todos sus campos: nombre, línea base, meta, unidad, dueño, plazo, frecuencia y definición con fórmula y fuente
  const faltan: string[] = [];
  if (f.name.trim().length < 3) faltan.push("resultado clave");
  if (f.baseline.trim() === "" || !Number.isFinite(Number(f.baseline.replace(",", ".")))) faltan.push("línea base");
  if (f.target.trim() === "" || !Number.isFinite(Number(f.target.replace(",", ".")))) faltan.push("meta");
  else if (f.baseline.trim() !== "" && num(f.target) === num(f.baseline)) faltan.push("meta distinta de la línea base");
  if (!f.unit.trim()) faltan.push("unidad");
  if (!f.ownerId) faltan.push("dueño");
  if (!/^\d{4}(-T[1-4])?$/.test(f.due.trim().toUpperCase())) faltan.push("plazo");
  if (f.definition.trim().length < 10) faltan.push("definición con fórmula y fuente");
  const ok = f.code.trim().length >= 2 && faltan.length === 0;
  // biblioteca de plantillas de KR del objetivo: prellena el formulario; la tribu fija base, meta, dueño y plazo
  // plantillas: las del objetivo directivo que concreta (o del propio id); si no hay, todas las de la palanca del objetivo
  const templates = initial ? [] : (() => {
    const own = [...templatesFor(cat.company.krTemplates, obj.parent ?? ""), ...templatesFor(cat.company.krTemplates, obj.id)];
    if (own.length) return own;
    const leverOf = (oe: string) => cat.objectives.find((o) => o.id === oe)?.lever;
    return (cat.company.krTemplates ?? []).filter((t) => obj.lever && leverOf(t.oe) === obj.lever);
  })();
  const [tpl, setTpl] = useState("");
  const applyTemplate = (code: string) => {
    setTpl(code);
    const t = templates.find((x) => x.code === code); if (!t) return;
    const free = !cat.kpis.some((k) => k.code === t.code);
    setF({ ...f, code: free ? t.code : next, name: t.name, unit: t.unit, goodDirection: t.goodDirection ?? "up", frequency: t.frequency ?? "Trimestral",
      definition: [t.definition, t.formula ? `Fórmula: ${t.formula}` : "", t.source ? `Fuente: ${t.source}` : ""].filter(Boolean).join(" · "),
      baseline: t.baseline !== undefined ? String(t.baseline) : "", target: t.target !== undefined ? String(t.target) : "" });
  };
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
        {templates.length > 0 && (
          <Field label="Plantilla de resultado clave (opcional)">
            <select value={tpl} onChange={(e) => applyTemplate(e.target.value)} className={INPUT}>
              <option value="">Elegir de la biblioteca del objetivo… ({templates.length})</option>
              {templates.map((t) => { const used = cat.kpis.some((k) => k.code === t.code); return <option key={t.code} value={t.code}>{t.code} · {t.name}{used ? " (ya creado)" : ""}</option>; })}
            </select>
            <span className="mt-1 block text-[10.5px] leading-snug text-faint">La plantilla trae nombre, unidad, sentido, frecuencia y definición; la tribu fija línea base, meta, dueño y plazo. Se puede editar todo antes de crear.</span>
          </Field>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr]">
          <Field label="Código" help={KR_AYUDA.code}><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} disabled={!!initial} className={`${INPUT} num`} /></Field>
          <Field label="Resultado clave" help={KR_AYUDA.name}><input value={f.name} onChange={set("name")} placeholder="Qué resultado verificable y cuánto" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Línea base" help={KR_AYUDA.baseline}><input type="number" step="any" value={f.baseline} onChange={set("baseline")} className={`${INPUT} num`} /></Field>
          <Field label="Meta" help={KR_AYUDA.target}><input type="number" step="any" value={f.target} onChange={set("target")} className={`${INPUT} num`} /></Field>
          <Field label="Unidad" help={KR_AYUDA.unit}><input value={f.unit} onChange={set("unit")} className={INPUT} /></Field>
          <Field label="Mejor si" help={KR_AYUDA.goodDirection}><select value={f.goodDirection} onChange={set("goodDirection")} className={INPUT}><option value="up">sube</option><option value="down">baja</option></select></Field>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Dueño" help={KR_AYUDA.ownerId}><select value={f.ownerId} onChange={set("ownerId")} className={INPUT}><option value="">—</option>{cat.responsibles.map((r) => <option key={r.id} value={r.id}>{r.dependencia || r.cargo}</option>)}</select></Field>
          <Field label="Plazo (AAAA o AAAA-Tn)" help={KR_AYUDA.due}><input value={f.due} onChange={set("due")} className={`${INPUT} num`} /></Field>
          <Field label="Frecuencia" help={KR_AYUDA.frequency}><select value={f.frequency} onChange={set("frequency")} className={INPUT}>{["Mensual", "Trimestral", "Semestral", "Anual"].map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="Definición, fórmula y fuente" help={KR_AYUDA.definition}><input value={f.definition} onChange={set("definition")} placeholder="Cómo se calcula (fórmula) y de dónde sale el dato" className={INPUT} /></Field>
        {faltan.length > 0 && <p className="text-[11px] leading-snug text-warn">Para registrar el resultado clave completa: {faltan.join(", ")}. Toca «?» en cada campo si tienes dudas.</p>}
      </div>
    </Modal>
  );
}

/* ═══ Iniciativas → resultado clave ═══ */

function IniciativasTab({ cat, levers, horizon, canEdit, canCreate, scope, me, saving, mutate, base, defaultOwner }: { cat: Cat; levers: Lever[]; horizon: string; canEdit: boolean; canCreate: boolean; scope: string | null; me: string; saving: boolean; mutate: Mutate; base: string; defaultOwner?: string }) {
  const objectives = okrObjectivesOf(cat, horizon);
  const krs = objectives.flatMap((o) => keyResultsOf(cat, o).map((k) => ({ k, o })));
  const [fTribe, setFTribe] = useState("");
  const [nueva, setNueva] = useState(false);
  const [edit, setEdit] = useState<InitiativeFull | null>(null);
  // quien administra el catálogo edita todas; quien solo puede crear, edita y elimina las suyas
  // el líder de tribu (ámbito) edita solo las de su tribu; el directivo por QR, las que creó
  const mine = (i: InitiativeFull) => scope ? i.ownerId === scope : canEdit || (canCreate && (i.createdBy ?? "").toLowerCase() === me.toLowerCase());
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
        {(canEdit || canCreate) && <button type="button" onClick={() => setNueva(true)} className="btn-primary !py-1.5 text-[11.5px]" title="Crear una iniciativa nueva, vinculada a un OKR de la tribu"><Plus size={12} /> Iniciativa</button>}
        <span className="text-[11px] text-faint">{canEdit ? "Vincula cada iniciativa de tu tribu al resultado clave que mueve: así queda habilitada para calificar." : canCreate ? "Crea iniciativas asociadas a un resultado clave; puedes editar o eliminar las que creaste." : "Solo lectura: el líder de cada tribu vincula con el QR de edición; una iniciativa sin KR no se puede calificar."}</span>
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
                    <ul className="mt-1.5 space-y-1">{inis.map((i) => <li key={i.id} className="flex items-center gap-2 text-[11.5px]"><Rocket size={10} className="shrink-0 text-faint" /><Link href={`${base}/panel/iniciativas/${i.id}`} className="min-w-0 flex-1 truncate text-ink-soft hover:text-cyan-deep">{i.name}</Link><span className="num hidden shrink-0 text-[10px] text-faint sm:inline">{i.id} · {owner(i.ownerId)}</span>{mine(i) && <button onClick={() => setEdit(i)} className="shrink-0 rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink" title="Editar o eliminar la iniciativa"><Pencil size={11} /></button>}</li>)}</ul>
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
                {mine(i) && <button onClick={() => setLink(i.id)} className="btn-ghost shrink-0 !py-1.5 text-[11px] sm:!py-1 sm:text-[10.5px]"><Link2 size={11} /> Vincular</button>}
                {mine(i) && <button onClick={() => setEdit(i)} className="shrink-0 rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink" title="Editar o eliminar la iniciativa"><Pencil size={12} /></button>}
              </div>
            ))}
            {unlinked.length === 0 && <div className="px-5 py-4 text-[12px] text-muted"><CheckCircle2 size={14} className="mr-1 inline text-ok" /> Todas las iniciativas mueven un resultado clave.</div>}
          </div>
        </Card>
      </div>
      {nueva && <InitiativeForm cat={cat} horizon={horizon} defaultOwner={defaultOwner} lockOwner={!!scope} saving={saving} onCancel={() => setNueva(false)}
        onSubmit={async (d) => { const ok = await mutate("initiative", "upsert", d); if (ok) setNueva(false); return ok; }} />}
      {edit && <InitiativeForm cat={cat} horizon={edit.horizon} initial={edit} defaultOwner={defaultOwner} lockOwner={!!scope} saving={saving} onCancel={() => setEdit(null)}
        onSubmit={async (d) => { const ok = await mutate("initiative", "upsert", { ...edit, ...d }); if (ok) setEdit(null); return ok; }}
        onDelete={async () => { if (window.confirm(`¿Eliminar la iniciativa «${edit.name}»?`)) { const ok = await mutate("initiative", "delete", { id: edit.id }); if (ok) setEdit(null); } }} />}
      {link && (() => {
        const ini = cat.initiatives.find((i) => i.id === link)!;
        return (
          <LinkForm cat={cat} horizon={horizon} ini={ini} saving={saving} onCancel={() => setLink(null)}
            onSubmit={async (cmi, kpi) => { const ok = await mutate("initiative", "upsert", { ...ini, kpi, cmi }); if (ok) setLink(null); return ok; }} />
        );
      })()}
    </>
  );
}

/** Iniciativa nueva creada en la convención: nombre, qué logra, tribu dueña y, obligatorio, el resultado clave principal que mueve. */
/** Selector del OKR al que se vincula una iniciativa: objetivo de la tribu y, si ya tiene resultados clave, el KR principal. Con la IA, sugiere el vínculo a partir del nombre y de lo que logra. */
function OkrPicker({ cat, horizon, value, onChange, initiative }: { cat: Cat; horizon: string; value: { cmi: string; kpi: string }; onChange: (v: { cmi: string; kpi: string }) => void; initiative: { name: string; objetivo: string } }) {
  const objectives = okrObjectivesOf(cat, horizon);
  const sel = objectives.find((o) => o.id === value.cmi);
  const krs = sel ? keyResultsOf(cat, sel) : [];
  const [ia, setIa] = useState<{ loading: boolean; error: string | null; why: string | null; none?: boolean }>({ loading: false, error: null, why: null });
  const puede = objectives.length > 0 && initiative.name.trim().length >= 5;
  const sugerir = async () => {
    setIa({ loading: true, error: null, why: null });
    const res = await fetch("/api/td/okr/vincular", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ horizon, initiative: { name: initiative.name.trim(), objetivo: initiative.objetivo.trim() } }) });
    const j = await res.json().catch(() => null);
    if (!res.ok) { setIa({ loading: false, error: j?.error ?? `Error ${res.status}`, why: null }); return; }
    if (j.none || !j.objective) { setIa({ loading: false, error: null, why: j.why || "No hay evidentemente un OKR con el que se pueda vincular esta iniciativa. Analiza muy bien esta situación. ¿Vale la pena?", none: true }); return; }
    // el vínculo es a un resultado clave concreto: si el OKR sugerido aún no tiene KR, no hay con qué vincular
    if (!j.kpi) { setIa({ loading: false, error: null, why: `El OKR sugerido (${j.objective}) aún no tiene resultados clave; regístralos en OKR y vuelve a vincular.`, none: true }); return; }
    onChange({ cmi: j.objective, kpi: j.kpi });
    setIa({ loading: false, error: null, why: j.why || "Vínculo sugerido por el modelo." });
  };
  const conKr = objectives.filter((o) => keyResultsOf(cat, o).length > 0);
  if (objectives.length === 0) return <p className="rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--warn) 12%, white)" }}>Aún no hay OKR de las tribus en {horizonLabel(cat.company, horizon)}: las iniciativas se vinculan a un resultado clave, así que primero créalos en la pestaña «OKR».</p>;
  if (conKr.length === 0) return <p className="rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--warn) 12%, white)" }}>Los OKR de las tribus aún no tienen resultados clave: las iniciativas se vinculan a un resultado clave concreto, no al objetivo. Regístralos primero en la pestaña «OKR» (etapa 3) y vuelve a vincular.</p>;
  void sel; void krs;
  return (
    <div className="space-y-2">
      <Field label="Resultado clave que mueve (obligatorio)">
        <select value={value.kpi} onChange={(e) => { const code = e.target.value; const o = objectives.find((x) => keyResultsOf(cat, x).some((k) => k.code === code)); onChange({ cmi: o?.id ?? "", kpi: code }); setIa({ loading: false, error: null, why: null }); }} className={INPUT}>
          <option value="">— elegir el resultado clave —</option>
          {objectives.map((o) => { const ks = keyResultsOf(cat, o); return (
            <optgroup key={o.id} label={`${o.id} · ${o.name.slice(0, 80)}`}>
              {ks.length === 0 ? <option disabled value="">sin resultados clave todavía (regístralos en OKR)</option> : ks.map((k) => <option key={k.code} value={k.code}>{k.code} · {k.name}</option>)}
            </optgroup>
          ); })}
        </select>
        <span className="mt-1 block text-[10.5px] leading-snug text-faint">Una iniciativa mueve un resultado clave concreto; el objetivo se toma del KR elegido.</span>
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void sugerir()} disabled={!puede || ia.loading} className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40" title={puede ? "El modelo sugiere a qué OKR vincular esta iniciativa" : "Escribe primero el nombre de la iniciativa"}>{ia.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Sugerir OKR</button>
        {ia.why && !ia.none && <span className="text-[11px] italic text-faint">{ia.why}</span>}
        {ia.error && <span className="text-[11px] text-bad">{ia.error}</span>}
      </div>
      {ia.none && <p className="rounded-lg px-3 py-2 text-[12px] font-semibold text-ink-soft" style={{ background: "color-mix(in srgb, var(--warn) 14%, white)" }}>{ia.why}</p>}
    </div>
  );
}
/** ¿El vínculo está completo? Un resultado clave concreto de un OKR de la tribu (el objetivo se deriva del KR). */
function okrLinkOk(cat: Cat, horizon: string, v: { cmi: string; kpi: string }): boolean {
  const o = okrObjectivesOf(cat, horizon).find((x) => x.id === v.cmi); if (!o) return false;
  return keyResultsOf(cat, o).some((k) => k.code === v.kpi);
}

/** Iniciativa creada en la convención: nombre, qué logra, tribu dueña y, obligatorio, el OKR (objetivo y KR principal) que mueve. */
function InitiativeForm({ cat, horizon, initial, defaultOwner, lockOwner = false, saving, onCancel, onSubmit, onDelete }: { cat: Cat; horizon: string; initial?: InitiativeFull | null; defaultOwner?: string; lockOwner?: boolean; saving: boolean; onCancel: () => void; onSubmit: (d: Record<string, unknown>) => Promise<boolean>; onDelete?: () => void }) {
  const tribes = cat.responsibles.filter((r) => /tribu/i.test(r.dependencia ?? "") || r.id === defaultOwner || r.id === initial?.ownerId);
  const [f, setF] = useState({ name: initial?.name ?? "", objetivo: initial?.objetivo ?? "", ownerId: initial?.ownerId ?? defaultOwner ?? tribes[0]?.id ?? "" });
  const [link, setLink] = useState({ cmi: initial?.cmi ?? "", kpi: initial?.kpi ?? "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim().length >= 5 && !!f.ownerId && okrLinkOk(cat, horizon, link);
  return (
    <Modal title={initial ? `Iniciativa · ${initial.id}` : "Nueva iniciativa"} sub="lo que se hace para mover un OKR de la tribu; con su resultado clave queda habilitada para calificar" onClose={onCancel}
      footer={<>{onDelete && <button type="button" onClick={onDelete} className="btn-ghost mr-auto !py-2 text-[12px] text-bad">Eliminar</button>}<button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || !ok} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40"
          onClick={() => ok && onSubmit({ ...(initial ? { id: initial.id } : {}), name: f.name.trim(), objetivo: f.objetivo.trim(), ownerId: f.ownerId, kpi: link.kpi, cmi: link.cmi, horizon, capability: initial?.capability ?? "EJE-1", subsistema: initial?.subsistema ?? "Operación", status: initial?.status ?? "PLANEADA" })}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : initial ? <Save size={13} /> : <Plus size={13} />} {initial ? "Guardar" : "Crear"}
        </button></>}>
      <div className="space-y-2.5">
        <Field label="Iniciativa"><input value={f.name} onChange={set("name")} placeholder="Nombre corto y reconocible" className={INPUT} /></Field>
        <Field label="Qué logra y cómo (opcional)"><textarea value={f.objetivo} onChange={set("objetivo")} rows={3} placeholder="Beneficio verificable, alcance y primera evidencia a 90 días" className={`${INPUT} resize-y`} /></Field>
        <Field label="Tribu dueña"><select value={f.ownerId} onChange={set("ownerId")} disabled={lockOwner} className={INPUT} title={lockOwner ? "Como líder de tribu registras iniciativas de tu tribu" : undefined}><option value="">—</option>{(tribes.length ? tribes : cat.responsibles).map((r) => <option key={r.id} value={r.id}>{r.dependencia || r.cargo}</option>)}</select></Field>
        <OkrPicker cat={cat} horizon={horizon} value={link} onChange={setLink} initiative={f} />
        <p className="text-[11px] text-faint">Queda asociada al resultado clave elegido y a {horizonLabel(cat.company, horizon)}; así se califica en Priorización en vivo como las demás.</p>
      </div>
    </Modal>
  );
}

function LinkForm({ cat, horizon, ini, saving, onCancel, onSubmit }: { cat: Cat; horizon: string; ini: InitiativeFull; saving: boolean; onCancel: () => void; onSubmit: (cmi: string, kpi: string) => Promise<boolean> }) {
  const [link, setLink] = useState({ cmi: okrObjectivesOf(cat, horizon).some((o) => o.id === ini.cmi) ? ini.cmi : "", kpi: ini.kpi });
  const ok = okrLinkOk(cat, horizon, link);
  return (
    <Modal title={`Vincular · ${ini.id}`} sub={ini.name} onClose={onCancel}
      footer={<><button type="button" onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" disabled={saving || !ok} onClick={() => ok && onSubmit(link.cmi, link.kpi)} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">{saving ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Vincular</button></>}>
      <OkrPicker cat={cat} horizon={horizon} value={link} onChange={setLink} initiative={{ name: ini.name, objetivo: ini.objetivo }} />
      <p className="mt-2 text-[11px] text-faint">Al vincular, la iniciativa queda asociada al resultado clave elegido (y al objetivo al que pertenece) y habilitada para calificar.</p>
    </Modal>
  );
}

/* ═══ Priorización en vivo ═══ */

function PriorizacionTab({ cat, levers, prio, base, onRefresh, onCatalogRefresh, me }: { cat: Cat; levers: Lever[]; prio: PriorizacionData | null; base: string; onRefresh: () => void; onCatalogRefresh: () => void; me: { role: string; responsibleId?: string } }) {
  // sesión de calificación por tribu (modo convención): el líder la abre, la cierra, ajusta el orden y guarda
  const convencion = cat.company.mode === "convencion";
  const sessions = prio?.sessions ?? cat.company.prioSessions ?? {};
  const canManageSession = convencion && (me.role === "CONSULTOR" || me.role === "ADMIN" || me.role === "LIDER");
  const tribeOfLever = (leverId: string) => levers.find((l) => l.id === leverId)?.ownerId ?? "";
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
  // con la priorización de una tribu guardada (o en revisión con orden), el ranking de esa tribu sigue el orden fijado por el líder
  const applyOrder = (key: string, items: { i: Ini; r: PriorizacionData["ranking"][number] | undefined }[]) => {
    if (mode !== "tribu") return items;
    const ses = sessionOf(sessions, tribeOfLever(key));
    if (!ses.order || (ses.status !== "guardada" && ses.status !== "revision")) return items;
    const pos = new Map(ses.order.map((id, n) => [id, n]));
    return [...items].sort((a, b) => (pos.get(a.i.id) ?? 999) - (pos.get(b.i.id) ?? 999));
  };
  const groups = groupDefs.map((g) => { const ses = mode === "tribu" ? sessionOf(sessions, tribeOfLever(g.key)) : null; const tag = ses && ses.status === "guardada" && ses.order ? " · orden guardado por el líder" : ses && ses.status === "abierta" ? " · calificación abierta" : ""; return { ...g, label: g.label + tag, items: applyOrder(g.key, rank(list.filter((i) => groupKey(i) === g.key))) }; }).filter((g) => g.items.length > 0);
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
      {canManageSession && <TribeSessionPanel cat={cat} sessions={sessions} me={me} rank={(items) => rank(items).map((x) => x.i)} scoreOf={(id) => { const r = rows.find((x) => x.id === id); return r?.c.n ? r.c.score : null; }} onChanged={() => { onRefresh(); onCatalogRefresh(); }} />}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Iniciativas evaluadas" value={cov.evaluated} unit={`de ${cov.total}`} foot={`${cov.pct} % con al menos una calificación`} accent="linear-gradient(90deg, var(--cyan), var(--cyan-deep))" />
        <StatCard label="Con evaluación completa" value={cov.complete} unit={`de ${cov.total}`} foot={`${expected} evaluadores o más`} accent="linear-gradient(90deg, var(--ok), #2f8f5b)" />
        <StatCard label="Evaluaciones registradas" value={(prio?.evaluations ?? []).filter((e) => list.some((i) => i.id === e.iniId)).length} foot={`${cov.evaluators.length} evaluadores activos`} />
        <StatCard label="Habilitadas para calificar" value={list.filter((i) => i.kpi).length} unit={`de ${list.length}`} foot="vinculadas a un resultado clave por el líder de tribu" accent="linear-gradient(90deg, var(--gold), #a87a14)" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rise overflow-hidden">
          <CardHeader title="Ranking en vivo" sub={convencion ? "puntaje consolidado · elegibilidad y capacidad · decisión · todo a 2027" : "puntaje consolidado · elegibilidad y capacidad · horizonte sugerido · decisión"} />
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
              <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="px-4 py-2">#</th><th className="px-2 py-2">Iniciativa</th><th className="num px-2 py-2 text-center">Eval.</th>{CRITERIA.map((c) => <th key={c.key} className="num px-2 py-2 text-center">{c.key}</th>)}<th className="num px-2 py-2 text-right">Puntaje</th><th className="px-2 py-2">Reglas</th><th className="px-2 py-2">{convencion ? "Palanca" : "Horizonte"}</th><th className="px-2 py-2">Decisión</th></tr></thead>
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
                      <td className="px-2 py-2"><span className="num text-[10.5px] text-muted">{convencion ? (levers.find((l) => l.id === cat.objectives.find((o) => o.id === i.cmi)?.lever)?.name ?? "—") : horizonLabel(cat.company, i.horizon)}</span> {r && !convencion && <HorizonHint compact current={i.horizon} suggested={r.suggested} company={cat.company} />}</td>
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

/** «2027-T2» → «T2 2027»; «2028-T1» o posterior → «Después»; vacío → «—». */
const quarterLabel = (q: string) => !q ? "—" : /^2027-T[1-4]$/.test(q) ? `${q.slice(5)} 2027` : q >= "2028" ? "Después" : q;
type PortRow = PortfolioRow & { oe: string; ownerId: string; leverId: string; kpi: string; start: string };
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
    return { id: i.id, name: i.name, horizon: i.horizon, start: i.start ?? "", suggested: r?.suggested ?? null, c, decision: d?.decision ?? null, rationale: d?.rationale, lever: levers.find((l) => l.id === o?.lever)?.name, owner: cat.responsibles.find((x) => x.id === i.ownerId)?.dependencia, oe: o?.id ?? "", ownerId: i.ownerId ?? "", leverId: o?.lever ?? "", kpi: i.kpi ?? "" };
  }), [prio, cat, levers]);
  // filtros: objetivo estratégico, tribu (responsable), palanca y estado
  const [fOe, setFOe] = useState(""); const [fTribe, setFTribe] = useState(""); const [fLever, setFLever] = useState(""); const [fStatus, setFStatus] = useState<PortStatus>("");
  const oes = useMemo(() => cat.objectives.filter((o) => all.some((r) => r.oe === o.id)), [cat, all]);
  const tribes = useMemo(() => cat.responsibles.filter((t) => all.some((r) => r.ownerId === t.id)), [cat, all]);
  const rows = useMemo(() => all.filter((r) => (!fOe || r.oe === fOe) && (!fTribe || r.ownerId === fTribe) && (!fLever || r.leverId === fLever) && matchStatus(r, fStatus)), [all, fOe, fTribe, fLever, fStatus]);
  const filtered = !!(fOe || fTribe || fLever || fStatus);
  // en la convención todas las iniciativas se desarrollan a 2027: el portafolio se lee por palanca (y tribu), no por horizonte
  const convencion = isConvencion(cat.company);
  const count = (st: PortStatus) => all.filter((r) => matchStatus(r, st)).length;
  const hzAll = useMemo(() => [...horizons, ...[...new Set(all.map((r) => r.horizon))].filter((h) => !horizons.includes(h))], [horizons, all]);   // «sin horizonte» o valores fuera del catálogo también se muestran
  const groups = convencion ? [...levers.map((l) => l.id), ...(all.some((r) => !r.leverId) ? [""] : [])] : hzAll;
  const gKey = (r: PortRow) => convencion ? (r.leverId ?? "") : r.horizon;
  const gLabel = (g: string) => convencion ? (levers.find((l) => l.id === g)?.name ?? "Sin palanca") : (g ? horizonLabel(cat.company, g) : "Sin horizonte");
  const sum = portfolioSummary(convencion ? rows.map((r) => ({ ...r, horizon: r.leverId ?? "" })) : rows, groups);
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
        <p className="text-[12.5px] text-muted">{convencion ? "Todas las iniciativas se desarrollan en 2027: el portafolio se lee por palanca y tribu. Aprobar, condicionar, posponer o descartar; las decisiones se registran en la ficha de cada iniciativa." : "Separar la naturaleza de la apuesta (horizonte), la fecha de inicio y el momento de captura de valor; aprobar, condicionar, posponer o descartar. Las decisiones se registran en la ficha de cada iniciativa."}</p>
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
        <CardHeader title={convencion ? "Resumen por palanca y decisión" : "Resumen por horizonte y decisión"} />
        <div className="space-y-2 px-4 pb-3 sm:hidden">
          {groups.map((h) => (
            <div key={h} className="rounded-xl bg-surface-2/60 px-3 py-2">
              <div className="flex items-baseline justify-between text-[12.5px]"><b className="text-ink">{gLabel(h)}</b><span className="num text-muted">{DEC.reduce((a, d) => a + (sum[h]?.[d] ?? 0), 0)} iniciativas</span></div>
              <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">{DEC.map((d) => <span key={d}>{label(d)} <b className="text-ink">{sum[h]?.[d] ?? 0}</b></span>)}</div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto px-2 pb-3 sm:block">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">{convencion ? "Palanca" : "Horizonte"}</th>{DEC.map((d) => <th key={d} className="num px-2 py-2 text-center">{label(d)}</th>)}<th className="num px-2 py-2 text-right">Total</th></tr></thead>
            <tbody>
              {groups.map((h) => <tr key={h} className="border-t border-line"><td className="px-3 py-2 font-bold text-ink">{gLabel(h)}</td>{DEC.map((d) => <td key={d} className="num px-2 py-2 text-center font-bold text-ink">{sum[h]?.[d] ?? 0}</td>)}<td className="num px-2 py-2 text-right text-muted">{DEC.reduce((a, d) => a + (sum[h]?.[d] ?? 0), 0)}</td></tr>)}
            </tbody>
          </table>
          <p className="px-3 pt-2 text-[11px] text-muted">
            Validación con {validationLabel(typeRuleOf(cat.company))}. {tactical.length ? <>Tácticas según el consolidado (se transfieren al área responsable y no compiten en el portafolio): <b className="text-ink">{tactical.length}</b> · {tactical.map((t) => t.id).join(", ")}.</> : typeRuleOf(cat.company).excludeTactical ? "Ninguna iniciativa evaluada quedó como táctica." : ""}
          </p>
        </div>
      </Card>
      {groups.map((h) => {
        const hr = rows.filter((r) => gKey(r) === h).sort((a, b) => (b.c.n ? b.c.score : -1) - (a.c.n ? a.c.score : -1));
        if (filtered && hr.length === 0) return null;
        return (
          <Card key={h} className="rise rise-1 mb-5 overflow-hidden">
            <CardHeader title={gLabel(h)} sub={`${hr.length} iniciativas · ordenadas por puntaje consolidado`} />
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
                    {convencion ? <span className="chip !py-0 text-[9.5px]">Inicio {quarterLabel(r.start)}</span> : <HorizonHint compact current={r.horizon} suggested={r.suggested} company={cat.company} />}
                    {r.decision ? <span className={DECISION_CLS[r.decision]}>{decisionLabel(r.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}
                  </div>
                  {r.rationale && <p className="mt-1 text-[11px] leading-snug text-ink-soft">{r.rationale}</p>}
                </Link>
              ))}
              {hr.length === 0 && <p className="px-4 py-3 text-[12px] italic text-faint">{convencion ? "Sin iniciativas en esta palanca." : "Sin iniciativas en este horizonte."}</p>}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-[12px]">
                <thead><tr className="text-left text-[9.5px] uppercase tracking-wider text-faint"><th className="px-4 py-2">Iniciativa</th><th className="px-2 py-2">Palanca</th><th className="num px-2 py-2 text-right">Puntaje</th>{convencion ? <th className="px-2 py-2">Inicio</th> : <th className="px-2 py-2">Sugerido</th>}<th className="px-2 py-2">Decisión</th><th className="px-2 py-2">Motivo</th></tr></thead>
                <tbody>
                  {hr.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2"><Link href={`${base}/panel/iniciativas/${r.id}`} className="font-bold text-ink hover:text-cyan-deep">{r.name}</Link><div className="num text-[10px] text-faint">{r.id} · {r.owner ?? "—"}</div></td>
                      <td className="px-2 py-2 text-[11px] text-muted">{r.lever ?? "—"}</td>
                      <td className="num px-2 py-2 text-right font-extrabold" style={{ color: r.c.n ? SCORE_COLOR(r.c.score) : "var(--faint)" }}>{r.c.n ? r.c.score : "—"}</td>
                      {convencion ? <td className="num px-2 py-2 text-[11px] text-muted">{quarterLabel(r.start)}</td> : <td className="px-2 py-2"><HorizonHint compact current={r.horizon} suggested={r.suggested} company={cat.company} /></td>}
                      <td className="px-2 py-2">{r.decision ? <span className={DECISION_CLS[r.decision]}>{decisionLabel(r.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}</td>
                      <td className="px-2 py-2 text-[11px] leading-snug text-ink-soft">{r.rationale ?? ""}</td>
                    </tr>
                  ))}
                  {hr.length === 0 && <tr><td colSpan={6} className="px-4 py-3 text-[12px] italic text-faint">{convencion ? "Sin iniciativas en esta palanca." : "Sin iniciativas en este horizonte."}</td></tr>}
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

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className="label flex items-center !text-[8.5px]">{label}{help && <FieldHelp text={help} />}</span><div className="mt-1">{children}</div></label>;
}

/** Botón «?» junto al rótulo: abre una nota breve de cómo se construye el campo (método 4Shine). */
function FieldHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [derecha, setDerecha] = useState(false);   // cerca del borde derecho (celular), la nota se abre hacia la izquierda
  return (
    <span className="relative ml-1 inline-flex">
      <button type="button" onClick={(e) => { e.preventDefault(); setDerecha(e.currentTarget.getBoundingClientRect().left + 270 > window.innerWidth); setOpen((v) => !v); }} onBlur={() => setTimeout(() => setOpen(false), 150)} aria-label="Cómo se construye este campo" title="Cómo se construye este campo" className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${open ? "bg-cyan-deep text-white" : "text-faint hover:bg-surface-2 hover:text-ink"}`}><HelpCircle size={11} /></button>
      {open && <span className={`absolute top-5 z-30 block w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface px-3 py-2 text-[11px] font-normal normal-case tracking-normal leading-snug text-ink shadow-lg sm:w-72 ${derecha ? "right-0" : "left-0"}`}>{text}</span>}
    </span>
  );
}

/** Ayuda de cada campo del resultado clave. */
const KR_AYUDA = {
  code: "Identificador único: prefijo de la palanca y número consecutivo (p. ej. MS-01). Se asigna solo; no hace falta cambiarlo.",
  name: "Qué resultado verificable se logra, no qué actividad se hace: nombra el indicador (p. ej. «PDV en funcionamiento», «Market Share de farmacia (%)»). Si empieza por implementar, diseñar o capacitar, es una iniciativa, no un KR.",
  baseline: "El valor real de hoy, con fecha y fuente en la definición. Si aún no se conoce, no inventes un número: anota en la definición quién lo consigue y cuándo, y deja 0 mientras tanto (el KR quedará marcado como incompleto).",
  target: "El valor a alcanzar a 2027-T4: ambicioso pero alcanzable, coherente con el sentido (sube o baja), con el objetivo rector y con las metas de las otras palancas. Debe ser distinto de la línea base.",
  unit: "En qué se mide: %, PDV, días, puntos, USD, clientes. La misma unidad para la línea base y la meta.",
  goodDirection: "Sentido del indicador: «sube» cuando más es mejor (ventas, NPS, cobertura); «baja» cuando menos es mejor (rotación, días al punto de equilibrio, tiempo de espera).",
  ownerId: "Quien responde por el resultado y tiene autoridad para moverlo: la tribu o el líder de escuadrón. Un solo dueño por KR.",
  due: "Cuándo se cumple la meta: un año (2027) o un trimestre (2027-T4). En la convención todos los resultados clave cierran a 2027-T4.",
  frequency: "Cada cuánto se mide y se revisa: mensual para resultados operativos, trimestral para los de negocio; anual solo si no existe una fuente intermedia.",
  definition: "Cómo se calcula (la fórmula) y de dónde sale el dato (sistema, área, encuesta, fecha de corte), para que otra persona lo calcule igual. Obligatoria: sin fórmula y fuente el KR no se valida.",
} as const;

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
                  <div className="rounded-lg border border-line px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Desde un computador, sin escanear</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <a href={shortUrl(row.url)} target="_blank" rel="noreferrer" className="num break-all text-[12.5px] font-bold text-cyan-deep hover:underline">{shortUrl(row.url)}</a>
                      <button type="button" onClick={async () => { await navigator.clipboard.writeText(shortUrl(row.url)); setCopied("corta"); setTimeout(() => setCopied(null), 1500); }} className="btn-ghost !py-1 text-[11px]">{copied === "corta" ? <CheckCircle2 size={11} /> : <Copy size={11} />} Copiar</button>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-snug text-faint">Lleva siempre al enlace vigente del QR, aunque se regenere. Se puede escribir a mano o proyectar junto al QR.</p>
                  </div>
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

/** URL corta de la convención: «/<empresa>/acceder» redirige al enlace vigente del QR. */
const shortUrl = (accessUrl: string) => accessUrl.replace(/\/acceso\/[^/?#]+.*$/, "/acceder");

/* ═══ Guía del día 2: qué hace cada tribu en la mesa y en la plataforma ═══ */

const ETAPAS: { n: number; hora: string; titulo: string; mesa: string[]; plataforma: string[]; entrega: string }[] = [
  { n: 1, hora: "8:05", titulo: "Reconectar y reconfigurar", mesa: ["Cada tribu se sienta en su mesa por palanca, con su líder y su directivo acompañante.", "Se recuperan las conclusiones del día 1, el propósito y las reglas; la moderadora explica el marco de OKR (la palanca como objetivo)."], plataforma: ["Entrar por el QR único o por la URL corta: nombre, correo, tribu y rol.", "Dirección 3x3 es solo de consulta: los objetivos estratégicos no se modifican."], entrega: "Equipos conformados, foco común y reglas claras." },
  { n: 2, hora: "8:50", titulo: "Asumir la palanca y su objetivo", mesa: ["La tribu recibe su palanca con indicador, meta y objetivo rector.", "Ese objetivo rector se copia tal cual en el F3: es el objetivo del único OKR de la tribu."], plataforma: ["En OKR ya está registrado el objetivo rector de cada palanca; no se reescribe."], entrega: "Un objetivo de OKR por tribu, derivado de su palanca." },
  { n: 3, hora: "9:00", titulo: "Definir resultados clave", mesa: ["De 2 a 4 KR (máximo 5) en el F3: indicador, línea base, meta, unidad y dueño.", "Se depuran los tácticos, operativos o escritos como actividades.", "Al cierre: el líder registra, todos validan en su celular, el directivo acompañante complementa y se intercambia el F3 con la tribu par (Market Share con Margen, Fidelización con Madurez)."], plataforma: ["Solo el líder registra en OKR: «Sugerir KR» propone KR con fuentes; «+ Resultado clave» para escribirlos; cada campo tiene su ayuda «?».", "«Validar KR» revisa el conjunto con las reglas del método; un KR solo se registra completo.", "Los miembros ven y validan desde su celular."], entrega: "Un OKR completo por tribu, con KR medibles y suficientes." },
  { n: 4, hora: "10:35", titulo: "Vincular iniciativas", mesa: ["Por cada KR, las iniciativas existentes o nuevas que lo mueven; nueva o de continuidad; dependencias, transversalidad y áreas; trimestre de inicio propuesto.", "Un KR sin iniciativa es una alerta: se crea la que lo mueve o se acepta que no tiene cómo cumplirse."], plataforma: ["Desde las 11:20, el líder registra en Iniciativas → KR: crear nuevas, vincular existentes o dejar fuera las que no mueven ningún KR.", "Vinculada = habilitada para calificar."], entrega: "Portafolio inicial causalmente vinculado a los KR." },
  { n: 5, hora: "13:35", titulo: "Clasificar, priorizar y proponer inicio", mesa: ["Calibración con una iniciativa de ejemplo y explicación de la puntuación: cuatro criterios de 1 a 4; estratégica solo con 3 o 4 en D, E y M.", "Las tácticas quedan registradas con el área responsable.", "La tribu revisa su resultado y su portafolio con el directivo acompañante y prepara la socialización."], plataforma: ["El líder abre la calificación en Priorización en vivo; cada miembro califica una sola vez las iniciativas de su tribu.", "El líder cierra, consolida el ranking, propone el trimestre de inicio (T1 a T4 o después) y guarda.", "Portafolio muestra el ranking y el trimestre propuesto por palanca, en tiempo real."], entrega: "Ranking de iniciativas estratégicas y trimestre propuesto por tribu." },
  { n: 6, hora: "15:35", titulo: "Socializar y desafiar", mesa: ["Quince minutos por tribu: su único OKR, sus KR, sus iniciativas priorizadas y el trimestre propuesto.", "Los directivos desafían supuestos, detectan dependencias entre tribus y plantean ajustes; el líder recalibra si es el caso."], plataforma: ["Se presenta desde la plataforma: OKR y Portafolio filtrados por la tribu que expone."], entrega: "Propuestas contrastadas con la visión corporativa." },
  { n: 7, hora: "16:35", titulo: "Ratificar, secuenciar y comprometer", mesa: ["Con el portafolio completo visible, los directivos ratifican o ajustan el OKR de cada tribu, la prioridad y el trimestre definitivo de inicio (T1, T2, T3, T4, después o se descarta).", "La decisión se conecta con los primeros 90 días y el mecanismo de seguimiento."], plataforma: ["Gerencia y advisor registran la decisión y el trimestre definitivo en la ficha de cada iniciativa; el CSV del portafolio acompaña las conclusiones."], entrega: "Cuatro OKR ratificados, portafolio secuenciado y primeros 90 días identificados." },
];

function GuiaTab({ me }: { me: { role: string; responsibleId?: string; qr?: true } }) {
  const rol = me.role === "LIDER" && me.responsibleId ? "lider" : me.role === "RESPONSABLE" ? "miembro" : me.role === "DIRECTIVO" ? "directivo" : "equipo";
  const ROLES: { id: string; titulo: string; hace: string[] }[] = [
    { id: "miembro", titulo: "Miembro de tribu", hace: ["Trabaja en el F3 con su tribu: resultados clave e iniciativas.", "Ve en su celular lo que el líder registra y lo valida antes de seguir.", "En Priorización en vivo califica, una sola vez, las iniciativas de su tribu cuando el líder abre la calificación.", "Ve el itinerario, OKR, Iniciativas → KR y Portafolio; no edita."] },
    { id: "lider", titulo: "Líder de tribu", hace: ["Conduce la mesa y decide los empates; es el dueño del objetivo.", "Es quien registra en la plataforma: los KR de su OKR, las iniciativas y su vínculo con cada KR.", "Abre y cierra la calificación de su tribu, consolida el ranking, propone el trimestre de inicio y guarda.", "Solo puede editar lo de su tribu; presenta en la socialización."] },
    { id: "directivo", titulo: "Directivo", hace: ["Acompaña una mesa: escucha las primeras definiciones y complementa; no decide las metas por la tribu.", "Llega a la socialización con preguntas preparadas sobre OKR e iniciativas.", "En la etapa 7 ratifica el OKR de cada tribu, la prioridad y el trimestre definitivo.", "Ve toda la convención; crea iniciativas si hace falta."] },
    { id: "equipo", titulo: "Equipo 4Shine y gerencia", hace: ["Resuelve dudas del marco, no decide metas; vigila la regla de un solo OKR por tribu y de 2 a 4 KR.", "Proyecta OKR, Priorización en vivo y Portafolio en los momentos indicados.", "Registra decisiones y trimestres definitivos en la etapa 7."] },
  ];
  return (
    <div className="space-y-5">
      <Card className="rise p-5 sm:p-6">
        <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">Viernes 23 · de los objetivos a OKR y prioridades ejecutables</div>
        <h2 className="mt-1 text-[18px] font-extrabold leading-tight text-ink sm:text-[22px]">Siete etapas: la palanca como objetivo del único OKR de cada tribu</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">Cada tribu trabaja en papel (el formato F3) y <b className="text-ink">solo el líder registra en la plataforma</b>; todos los miembros ven y validan desde su celular. Dirección 3x3 es fuente de consulta: los objetivos estratégicos no se modifican. Un OKR por tribu, con el objetivo rector de la palanca y de 2 a 4 resultados clave (máximo 5). Todas las iniciativas se desarrollan en 2027: no hay horizontes, hay trimestre de inicio.</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {["Un solo OKR por tribu", "2 a 4 KR, máximo 5", "Cada KR con al menos una iniciativa", "Estratégica solo con 3 o 4 en D, E y M", "Trimestre de inicio T1 a T4 o después", "El líder registra, la tribu valida"].map((x) => <span key={x} className="chip chip-cyan !py-0.5">{x}</span>)}
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map((r) => (
          <Card key={r.id} className={`rise p-4 sm:p-5 ${r.id === rol ? "ring-2 ring-cyan-deep/40" : ""}`}>
            <div className="flex items-center gap-2"><Users size={14} className="text-cyan-deep" /><span className="text-[13.5px] font-extrabold text-ink">{r.titulo}</span>{r.id === rol && <span className="chip chip-cyan !py-0 text-[9.5px]">tu rol</span>}</div>
            <ul className="mt-2 space-y-1 text-[12px] leading-snug text-ink-soft">{r.hace.map((h, i) => <li key={i} className="flex gap-1.5"><span className="text-faint">•</span><span>{h}</span></li>)}</ul>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {ETAPAS.map((e) => (
          <Card key={e.n} className="rise overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2.5 sm:px-5">
              <span className="num flex h-7 w-7 items-center justify-center rounded-full bg-cyan-deep text-[12px] font-extrabold text-white">{e.n}</span>
              <span className="text-[14px] font-extrabold text-ink">{e.titulo}</span>
              <span className="num ml-auto text-[11px] text-faint">{e.hora}</span>
            </div>
            <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 sm:px-5">
              <div><div className="num text-[9.5px] font-bold uppercase tracking-wider text-faint">En la mesa (F3)</div><ul className="mt-1 space-y-1 text-[12px] leading-snug text-ink-soft">{e.mesa.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-faint">•</span><span>{x}</span></li>)}</ul></div>
              <div><div className="num text-[9.5px] font-bold uppercase tracking-wider text-faint">En la plataforma</div><ul className="mt-1 space-y-1 text-[12px] leading-snug text-ink-soft">{e.plataforma.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-faint">•</span><span>{x}</span></li>)}</ul></div>
            </div>
            <div className="border-t border-line px-4 py-2 text-[11.5px] text-muted sm:px-5"><b className="text-ink">Entregable:</b> {e.entrega}</div>
          </Card>
        ))}
      </div>
      <Card className="rise p-4 sm:p-5">
        <div className="text-[13.5px] font-extrabold text-ink">Reglas de calidad de un resultado clave</div>
        <ul className="mt-2 grid gap-1 text-[12px] leading-snug text-ink-soft sm:grid-cols-2">
          {["Mide un resultado, no una actividad: si empieza por implementar, diseñar o capacitar, es una iniciativa.", "Tiene indicador con fórmula y fuente: otra persona podría calcularlo igual.", "Línea base real con fecha; si no se conoce, se nombra quién la consigue y cuándo (no se inventa).", "Meta a 2027-T4 ambiciosa pero alcanzable, distinta de la línea base y coherente con el sentido (sube o baja).", "Un dueño con autoridad y un plazo.", "Al menos una iniciativa que lo mueva."].map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-faint">•</span><span>{x}</span></li>)}
        </ul>
        <div className="mt-3 text-[13.5px] font-extrabold text-ink">Cómo se califica una iniciativa</div>
        <p className="mt-1 text-[12px] leading-snug text-ink-soft">Cuatro criterios de 1 (débil) a 4 (decisivo): <b>D</b> Dirección (40 %), <b>E</b> Ejecución (30 %), <b>M</b> Multiplicación (20 %) y <b>L</b> Liderazgo (10 %); los criterios de Cresio van dentro. Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4. Es estratégica solo con 3 o 4 en D, E y M; si alguno queda en 1 o 2 es táctica y se transfiere al área. El puntaje ordena; no aprueba: el directorio ratifica la decisión y el trimestre.</p>
      </Card>
    </div>
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
      onAddLink={async (name, url, momentId) => {
        // registra el enlace como material y, si viene de un momento, lo vincula a ese momento
        setBusy(true); setError(null);
        const res = await fetch("/api/td/itinerario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "link", name, url, group: "material" }) });
        const j = await res.json().catch(() => null); setBusy(false);
        if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); return false; }
        const it = j.itinerary as ItineraryT; setData((d) => d ? { ...d, itinerary: it } : d);
        if (!momentId) return true;
        const f = (it.files ?? []).find((x) => x.url === url.trim()); if (!f) return true;
        const prev = it.items.find((x) => x.id === momentId)?.files ?? [];
        return prev.includes(f.id) ? true : post({ op: "files", momentId, fileIds: [...prev, f.id] });
      }}
      onResolve={async (id, resolved) => { await post({ op: "resolve", id, resolved }); }}
      onDelete={async (id) => { await post({ op: "delete", id }); }} />
  );
}


/* ═══ Sesión de calificación de la tribu (priorización en vivo, modo convención) ═══ */

function TribeSessionPanel({ cat, sessions, me, rank, scoreOf, onChanged }: { cat: Cat; sessions: NonNullable<Cat["company"]["prioSessions"]>; me: { role: string; responsibleId?: string }; rank: (items: Cat["initiatives"]) => Cat["initiatives"]; scoreOf: (id: string) => number | null; onChanged: () => void }) {
  const tribes = cat.responsibles.filter((r) => cat.initiatives.some((i) => i.ownerId === r.id));
  const leaderOnly = me.role === "LIDER" && !!me.responsibleId;
  const [tribe, setTribe] = useState(me.responsibleId && tribes.some((t) => t.id === me.responsibleId) ? me.responsibleId : (tribes[0]?.id ?? ""));
  const ses = sessionOf(sessions, tribe);
  const own = cat.initiatives.filter((i) => i.ownerId === tribe);
  const idx = (id: string) => { const n = ses.order ? ses.order.indexOf(id) : -1; return n === -1 ? 999 : n; };
  const base = ses.order ? [...own].sort((a, b) => idx(a.id) - idx(b.id)) : rank(own);
  const [order, setOrder] = useState<string[] | null>(null);
  const ids = order ?? base.map((i) => i.id);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const MSG: Record<PrioSessionAction, string> = {
    abrir: "Vas a abrir la calificación para tu tribu: desde ahora cada miembro puede calificar una sola vez las iniciativas de la tribu. ¿Confirmas?",
    cerrar: "Vas a cerrar la calificación: nadie más podrá calificar. Después podrás ajustar el orden a mano y guardar. ¿Confirmas?",
    guardar: "Vas a guardar la priorización definitiva de tu tribu con este orden. ¿Confirmas?",
    reabrir: "Vas a reabrir la calificación; el orden guardado se conserva hasta que vuelvas a guardar. ¿Confirmas?",
  };
  const act = async (action: PrioSessionAction) => {
    if (!window.confirm(MSG[action])) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/td/priorizacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tribe, session: action, ...(action === "guardar" ? { order: ids } : {}) }) });
    const j = await res.json().catch(() => null); setBusy(false);
    if (!res.ok) { setErr(j?.error ?? `Error ${res.status}`); return; }
    if (action !== "guardar") setOrder(null);
    onChanged();
  };
  const move = (id: string, d: -1 | 1) => { const a = [...ids]; const i = a.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setOrder(a); };
  const name = (id: string) => cat.initiatives.find((i) => i.id === id)?.name ?? id;
  // trimestre de inicio propuesto por la tribu (T1 a T4 de 2027, o después); lo ratifica el directorio en la ficha
  const INICIO = [["2027-T1", "T1"], ["2027-T2", "T2"], ["2027-T3", "T3"], ["2027-T4", "T4"], ["2028-T1", "Después"]] as const;
  const startOf = (id: string) => cat.initiatives.find((i) => i.id === id)?.start ?? "";
  const setStart = async (id: string, start: string) => {
    const ini = cat.initiatives.find((i) => i.id === id); if (!ini) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/td/catalogo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "initiative", op: "upsert", data: { ...ini, start, end: start > (ini.end || "") ? start : ini.end } }) });
    const j = await res.json().catch(() => null); setBusy(false);
    if (!res.ok) { setErr(j?.error ?? `Error ${res.status}`); return; }
    onChanged();
  };
  const tone = ses.status === "abierta" ? "chip-ok" : ses.status === "guardada" ? "chip-cyan" : ses.status === "revision" ? "chip-gold" : "";
  const hora = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "");
  return (
    <Card className="rise mb-5 overflow-hidden">
      <CardHeader title="Mesa de la tribu · calificación y trimestre de inicio" sub="el líder abre la calificación, la cierra, ajusta el orden si hace falta, propone el trimestre de inicio de cada iniciativa y guarda" />
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {leaderOnly ? <span className="text-[12.5px] font-bold text-ink">{tribes.find((t) => t.id === tribe)?.dependencia ?? "Tu tribu"}</span>
            : <select value={tribe} onChange={(e) => { setTribe(e.target.value); setOrder(null); }} className="input w-full !py-1.5 pr-7 !text-[11.5px] sm:w-auto sm:max-w-[320px]">{tribes.map((t) => <option key={t.id} value={t.id}>{t.dependencia || t.cargo}</option>)}</select>}
          <span className={`chip !py-0.5 text-[10px] ${tone}`}>{PRIO_STATUS_LABEL[ses.status]}</span>
          <span className="ml-auto flex flex-wrap gap-2">
            {ses.status === "cerrada" && <button type="button" disabled={busy || own.length === 0} onClick={() => void act("abrir")} className="btn-primary !py-1.5 text-[11.5px] disabled:opacity-40"><Scale size={12} /> Abrir calificación</button>}
            {ses.status === "abierta" && <button type="button" disabled={busy} onClick={() => void act("cerrar")} className="btn-primary !py-1.5 text-[11.5px] disabled:opacity-40"><Lock size={12} /> Cerrar calificación y revisar</button>}
            {(ses.status === "revision" || ses.status === "abierta") && <button type="button" disabled={busy} onClick={() => void act("guardar")} className={`${ses.status === "revision" ? "btn-primary" : "btn-ghost"} !py-1.5 text-[11.5px] disabled:opacity-40`}><Save size={12} /> Guardar priorización</button>}
            {(ses.status === "guardada" || ses.status === "revision") && <button type="button" disabled={busy} onClick={() => void act("reabrir")} className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40"><RefreshCw size={12} /> Reabrir</button>}
          </span>
        </div>
        {err && <p className="mt-2 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, white)" }}>{err}</p>}
        <p className="mt-2 text-[11px] text-faint">
          {ses.status === "cerrada" ? "Mientras no abras la calificación, los miembros de la tribu no pueden calificar."
            : ses.status === "abierta" ? `Abierta${ses.openedAt ? " a las " + hora(ses.openedAt) : ""}: cada miembro califica una sola vez; el ranking se actualiza en vivo.`
            : ses.status === "revision" ? "Calificación cerrada. Revisa el orden: mueve las iniciativas si la tribu decide algo distinto al puntaje, y guarda."
            : `Priorización guardada${ses.savedAt ? " a las " + hora(ses.savedAt) : ""}. Este orden y los trimestres de inicio propuestos son los que presenta la tribu en la socialización; el directorio ratifica el trimestre definitivo en la ficha de cada iniciativa.`}
        </p>
        {(ses.status === "revision" || ses.status === "guardada") && own.length > 0 && (
          <ol className="mt-3 space-y-1">
            {ids.map((id, n) => (
              <li key={id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-[12px]">
                <span className="num w-5 shrink-0 font-extrabold text-faint">{n + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{name(id)}</span>
                <span className="num shrink-0 text-[11px] text-muted">{scoreOf(id) ?? "—"}</span>
                <select value={INICIO.some(([v]) => v === startOf(id)) ? startOf(id) : ""} onChange={(e) => void setStart(id, e.target.value)} disabled={busy} className="input shrink-0 !py-0.5 pr-6 !text-[10.5px]" title="Trimestre de inicio propuesto por la tribu"><option value="">Inicio…</option>{INICIO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                {ses.status === "revision" && <span className="flex shrink-0 gap-0.5">
                  <button type="button" onClick={() => move(id, -1)} disabled={busy || n === 0} className="rounded-md p-1 text-faint hover:text-ink disabled:opacity-30" title="Subir"><ArrowUp size={12} /></button>
                  <button type="button" onClick={() => move(id, 1)} disabled={busy || n === ids.length - 1} className="rounded-md p-1 text-faint hover:text-ink disabled:opacity-30" title="Bajar"><ArrowDown size={12} /></button>
                </span>}
              </li>
            ))}
          </ol>
        )}
        {ses.status === "revision" && order && <p className="mt-1.5 text-[10.5px] text-warn">Orden ajustado a mano: guarda la priorización para fijarlo.</p>}
      </div>
    </Card>
  );
}


/* ═══ Ejemplo de OKR completo y sugerencias por palanca (laboratorio de OKR) ═══ */

function OkrCard({ okr }: { okr: OkrSugerido }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">Objetivo</div>
      <div className="text-[13.5px] font-extrabold leading-snug text-ink">{okr.objective.name}</div>
      {okr.objective.desc && <p className="mt-1 text-[12px] text-muted">{okr.objective.desc}</p>}
      {okr.objective.indicator && <p className="mt-0.5 text-[11px] text-muted">Indicador impulsor: {okr.objective.indicator}</p>}
      {okr.why && <p className="mt-1 text-[11px] italic text-faint">{okr.why}</p>}
      <div className="num mt-3 text-[10px] font-bold uppercase tracking-wider text-faint">Resultados clave</div>
      <ol className="mt-1 space-y-1.5">
        {okr.krs.map((k, n) => (
          <li key={n} className="rounded-lg bg-surface-2/60 px-3 py-2 text-[12px]">
            <div className="font-semibold text-ink">{n + 1}. {k.name} <span className="num font-normal text-muted">· {k.unit} · mejor si {k.goodDirection === "down" ? "baja" : "sube"} · {k.frequency}</span></div>
            {(k.formula || k.definition) && <div className="mt-0.5 text-[11px] text-muted">{k.definition ? k.definition + " " : ""}{k.formula ? `Fórmula: ${k.formula}` : ""}</div>}
            {k.why && <div className="num mt-0.5 text-[11px] text-faint">{k.why}{k.target !== undefined && k.target !== null && !/→/.test(k.why) ? ` · meta sugerida ${k.target}` : ""}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function OkrEjemploModal({ levers, lever, onClose, onUsar }: { levers: Lever[]; lever: string; onClose: () => void; onUsar?: () => void }) {
  const l = levers.find((x) => x.id === lever);
  return (
    <Modal title={`Ejemplo de OKR completo · ${l?.name ?? lever}`} sub="un objetivo con tres resultados clave; cifras ilustrativas, no son metas de la empresa" onClose={onClose}
      footer={<><button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cerrar</button>{onUsar && <button type="button" onClick={onUsar} className="btn-primary !py-2 text-[12.5px]"><Plus size={13} /> Usar como punto de partida</button>}</>}>
      <OkrCard okr={ejemploPara(lever)} />
      <p className="mt-3 text-[11px] leading-snug text-faint">Anatomía: el objetivo dice qué cambia y para quién; cada resultado clave trae métrica, unidad, sentido, frecuencia y fórmula, y en el laboratorio se le fijan línea base real, meta, dueño y plazo (2027-T4). Al menos dos resultados clave de resultado de negocio; como máximo uno de hito.</p>
    </Modal>
  );
}

/* ═══ Fuentes de las sugerencias: la base de conocimiento del sector y del país, con los hechos que el modelo citó ═══ */

const TIPO_FUENTE: Record<Evidencia["fuente"]["tipo"], string> = { oficial: "fuente oficial", empresa: "información de la empresa", prensa: "prensa con datos citados", consultora: "consultora o benchmark de proveedor", academico: "publicación académica" };

/** Números de hechos citados en una propuesta (objetivo y resultados clave). */
function usadasDe(p: { sources?: number[]; krs: { sources?: number[] }[] } | null): number[] {
  if (!p) return [];
  return [...new Set([...(p.sources ?? []), ...p.krs.flatMap((k) => k.sources ?? [])])].sort((a, b) => a - b);
}

function Refs({ n }: { n?: number[] }) {
  if (!n?.length) return null;
  return <sup className="num ml-1 text-[9.5px] font-bold text-cyan-deep" title="Hechos de la base de conocimiento en los que se apoya (ver «Fuentes»)">{n.map((x) => `[${x}]`).join("")}</sup>;
}

function FuentesButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="btn-ghost !py-1.5 text-[11.5px]" title="Hechos del sector y del país, con su fuente, en los que se basa la sugerencia"><BookOpen size={12} /> Fuentes</button>;
}

function FuentesModal({ fuentes, usadas, onClose }: { fuentes: Evidencia[]; usadas: number[]; onClose: () => void }) {
  const citadas = fuentes.filter((e) => usadas.includes(e.n)), resto = fuentes.filter((e) => !usadas.includes(e.n));
  const Item = ({ e, citada }: { e: Evidencia; citada: boolean }) => (
    <li className={`rounded-xl px-3.5 py-2.5 text-[12px] ${citada ? "border border-cyan-deep/30 bg-cyan-wash/40" : "bg-surface-2/60"}`}>
      <div className="flex items-start gap-2">
        <span className={`num shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold ${citada ? "bg-cyan-deep text-white" : "bg-surface text-faint"}`}>[{e.n}]</span>
        <div className="min-w-0 flex-1">
          <p className="leading-snug text-ink">{e.hecho}</p>
          {e.nota && <p className="mt-0.5 text-[11px] italic leading-snug text-faint">{e.nota}</p>}
          <p className="mt-1 text-[11px] leading-snug text-muted"><span className="font-semibold text-ink-soft">{e.fuente.editor}</span> · {e.fuente.fecha} · {TIPO_FUENTE[e.fuente.tipo]} · <a href={e.fuente.url} target="_blank" rel="noreferrer" className="text-cyan-deep hover:underline">{e.fuente.titulo}</a></p>
        </div>
      </div>
    </li>
  );
  return (
    <Modal title="Fuentes de la sugerencia" sub={`base de conocimiento del sector y del país · ${fuentes.length} hechos con fuente verificable, ${citadas.length} citado${citadas.length === 1 ? "" : "s"} por el asistente`} onClose={onClose}
      footer={<button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cerrar</button>}>
      {citadas.length > 0 && <>
        <div className="num mb-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">Hechos citados en esta propuesta</div>
        <ul className="space-y-1.5">{citadas.map((e) => <Item key={e.n} e={e} citada />)}</ul>
      </>}
      {resto.length > 0 && <>
        <div className={`num mb-1.5 text-[10px] font-bold uppercase tracking-wider text-faint ${citadas.length ? "mt-3" : ""}`}>{citadas.length ? "Otros hechos que recibió el asistente para esta palanca" : "Hechos que recibió el asistente para esta palanca"}</div>
        <ul className="space-y-1.5">{resto.map((e) => <Item key={e.n} e={e} citada={false} />)}</ul>
      </>}
      <p className="mt-3 text-[10.5px] leading-snug text-faint">El asistente solo puede citar hechos de esta base; las cifras de benchmarks de proveedores y de otros países son órdenes de magnitud, no metas de la empresa. Fuentes revisadas el 18 de octubre de 2026.</p>
    </Modal>
  );
}

/* ═══ Asistente de resultados clave: el modelo propone KR complementarios y revisa los registrados ═══ */

const ESTADO_KR = { ok: ["bien", "chip-ok"], ajustar: ["ajustar", "chip-warn"], reemplazar: ["reemplazar", "chip-bad"] } as const;
const VEREDICTO = { listo: ["Listo: el OKR está bien formulado", "chip-ok"], ajustar: ["Casi: hay ajustes puntuales", "chip-warn"], rehacer: ["Rehacer: los resultados clave no miden el objetivo", "chip-bad"] } as const;

function KrChecklist({ krs, chosen, onToggle, onCrear, creando, nota }: { krs: KrSugerido[]; chosen: boolean[]; onToggle: (n: number, v: boolean) => void; onCrear?: (lista: KrSugerido[]) => void; creando: boolean; nota: string }) {
  const elegidos = krs.filter((_, n) => chosen[n]);
  return (
    <div className="space-y-1.5">
      {krs.map((k, n) => (
        <label key={n} className={`flex items-start gap-2 rounded-lg bg-surface-2/60 px-3 py-2 text-[12px] ${onCrear ? "cursor-pointer" : ""}`}>
          {onCrear && <input type="checkbox" checked={!!chosen[n]} onChange={(e) => onToggle(n, e.target.checked)} className="mt-0.5" />}
          <span className="min-w-0">
            <span className="font-semibold text-ink">{k.name}</span> <span className="num text-muted">· {k.unit} · mejor si {k.goodDirection === "down" ? "baja" : "sube"} · {k.frequency}</span><Refs n={k.sources} />
            {(k.formula || k.definition) && <span className="block text-[11px] text-muted">{k.definition ? k.definition + " " : ""}{k.formula ? `Fórmula: ${k.formula}` : ""}</span>}
            {k.why && <span className="block text-[11px] italic text-faint">{k.why}</span>}
          </span>
        </label>
      ))}
      {onCrear && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button type="button" disabled={creando || elegidos.length === 0} onClick={() => onCrear(elegidos)} className="btn-primary !py-1.5 text-[12px] disabled:opacity-40">{creando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Crear {elegidos.length} KR</button>
          <span className="text-[11px] leading-snug text-faint">{nota}</span>
        </div>
      )}
    </div>
  );
}

function AsistenteKr({ cat, o, krs, tribeId, horizon, canEdit, mutate, onEditKr }: { cat: Cat; o: CmiObjective; krs: KpiFull[]; tribeId: string; horizon: string; canEdit: boolean; mutate: Mutate; onEditKr: (k: KpiFull) => void }) {
  const [modo, setModo] = useState<"sugerir" | "validar" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sug, setSug] = useState<{ krs: KrSugerido[]; chosen: boolean[] } | null>(null);
  const [val, setVal] = useState<{ v: ValidacionOkr; chosen: boolean[] } | null>(null);
  const [fuentes, setFuentes] = useState<Evidencia[]>([]);
  const [verFuentes, setVerFuentes] = useState(false);
  const [creando, setCreando] = useState(false);
  const tribe = cat.responsibles.find((r) => r.id === tribeId)?.dependencia ?? "la tribu";
  const nota = `Se crean con línea base 0 y la meta sugerida (si la hay), dueño ${tribe} y plazo a fin de ${horizonLabel(cat.company, horizon)}; la tribu fija base y meta reales.`;
  const pedir = async (m: "sugerir" | "validar") => {
    setModo(m); setLoading(true); setError(null); setSug(null); setVal(null); setFuentes([]);
    const res = await fetch(m === "sugerir" ? "/api/td/okr/sugerir" : "/api/td/okr/validar", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m === "sugerir" ? { lever: o.lever, tribe: tribeId, objective: { id: o.id, name: o.name, desc: o.desc ?? "", indicator: o.indicator ?? "" } } : { objective: o.id }) });
    const j = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); return; }
    setFuentes(Array.isArray(j?.fuentes) ? j.fuentes : []);
    if (m === "sugerir") {
      const p: OkrSugerido | undefined = j?.propuestas?.[0];
      if (!p) { setError("El asistente no devolvió una propuesta utilizable; inténtalo de nuevo."); return; }
      setSug({ krs: p.krs, chosen: p.krs.map(() => true) });
    } else {
      const v = j as ValidacionOkr; setVal({ v, chosen: v.faltantes.map(() => true) });
    }
  };
  const crear = async (lista: KrSugerido[]) => {
    setCreando(true); const ok = await crearKrs(cat, o.id, o.lever ?? "KR", tribeId, horizon, lista, mutate); setCreando(false);
    if (ok) { setSug(null); setVal(null); setModo(null); }
  };
  // la redacción corregida abre el formulario del KR ya prellenado; la tribu confirma y guarda
  const aplicar = (k: KpiFull, p: KrPropuesta) => onEditKr({ ...k, name: p.name, unit: p.unit ?? k.unit, goodDirection: p.goodDirection ?? k.goodDirection, frequency: p.frequency ?? k.frequency, formula: p.formula ?? k.formula,
    definition: [p.definition, p.formula ? `Fórmula: ${p.formula}` : ""].filter(Boolean).join(" · ") || k.definition, target: p.target ?? k.target });
  const lleno = krs.length >= KR_MAX;
  return (
    <div className="mt-3 rounded-xl border border-dashed border-line px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-faint"><Sparkles size={12} /> Asistente</span>
        {canEdit && <button type="button" onClick={() => void pedir("sugerir")} disabled={loading || lleno} className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40" title={lleno ? "Este objetivo ya tiene el máximo de 5 resultados clave" : "El modelo propone resultados clave complementarios a los registrados; eliges cuáles se crean"}>{loading && modo === "sugerir" ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Sugerir KR</button>}
        <button type="button" onClick={() => void pedir("validar")} disabled={loading || krs.length === 0} className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40" title={krs.length ? "El modelo revisa cada resultado clave y el conjunto: resultado y no actividad, medible, base y meta, cobertura del objetivo" : "Primero registra los resultados clave"}>{loading && modo === "validar" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Validar KR</button>
        {fuentes.length > 0 && (sug || val) && <FuentesButton onClick={() => setVerFuentes(true)} />}
        <span className="text-[11px] leading-snug text-faint">{canEdit ? "Propone KR que falten y revisa los registrados con las reglas del método y la base de conocimiento del sector; nada se guarda sin confirmarlo." : "Revisa los resultados clave de tu tribu con las reglas del método y la base de conocimiento del sector; el líder registra los cambios."}</span>
      </div>
      {verFuentes && <FuentesModal fuentes={fuentes} usadas={sug ? usadasDe({ krs: sug.krs }) : val ? usadasDe({ krs: [...val.v.faltantes, ...val.v.krs] }) : []} onClose={() => setVerFuentes(false)} />}
      {error && <p className="mt-2 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, white)" }}>{error}</p>}
      {modo === "sugerir" && sug && (
        <div className="mt-2.5 space-y-1.5">
          <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">Resultados clave propuestos{krs.length ? " (complementan los registrados)" : ""} · marca los que se crean</div>
          <KrChecklist krs={sug.krs} chosen={sug.chosen} onToggle={(n, v) => setSug({ ...sug, chosen: sug.chosen.map((c, m) => (m === n ? v : c)) })} onCrear={(l) => void crear(l)} creando={creando} nota={nota} />
        </div>
      )}
      {modo === "validar" && val && (
        <div className="mt-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2"><span className={`chip ${VEREDICTO[val.v.veredicto][1]} text-[10.5px]`}>{VEREDICTO[val.v.veredicto][0]}</span></div>
          <p className="text-[12px] leading-snug text-ink">{val.v.resumen}</p>
          <div className="space-y-1.5">
            {val.v.krs.map((e) => { const k = krs.find((x) => x.code === e.code); if (!k) return null; const [label, cls] = ESTADO_KR[e.estado]; return (
              <div key={e.code} className="rounded-lg bg-surface-2/60 px-3 py-2 text-[12px]">
                <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                  <span className="num shrink-0 font-extrabold text-cyan-deep">{e.code}</span>
                  <span className="min-w-0 flex-1 font-semibold text-ink">{k.name}</span>
                  <span className={`chip ${cls} !py-0 text-[9.5px]`}>{label}</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-muted">{e.comentario}<Refs n={e.sources} /></p>
                {e.propuesta && (
                  <div className="mt-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
                    <div className="num text-[9.5px] font-bold uppercase tracking-wider text-faint">{e.estado === "reemplazar" ? "Resultado clave que lo sustituye" : "Redacción sugerida"}</div>
                    <div className="text-[12px] font-semibold text-ink">{e.propuesta.name}{e.propuesta.unit ? <span className="num font-normal text-muted"> · {e.propuesta.unit}{e.propuesta.goodDirection ? ` · mejor si ${e.propuesta.goodDirection === "down" ? "baja" : "sube"}` : ""}</span> : null}</div>
                    {(e.propuesta.formula || e.propuesta.definition) && <div className="text-[11px] text-muted">{e.propuesta.definition ? e.propuesta.definition + " " : ""}{e.propuesta.formula ? `Fórmula: ${e.propuesta.formula}` : ""}</div>}
                    {canEdit && <button type="button" onClick={() => aplicar(k, e.propuesta!)} className="mt-1 text-[11px] font-semibold text-cyan-deep hover:underline">Aplicar en {e.code} y revisar antes de guardar</button>}
                  </div>
                )}
              </div>
            ); })}
          </div>
          {val.v.faltantes.length > 0 && (
            <div className="space-y-1.5">
              <div className="num text-[10px] font-bold uppercase tracking-wider text-faint">Resultados clave que faltan para cubrir el objetivo{canEdit ? " · marca los que se crean" : ""}</div>
              <KrChecklist krs={val.v.faltantes} chosen={val.chosen} onToggle={(n, v) => setVal({ ...val, chosen: val.chosen.map((c, m) => (m === n ? v : c)) })} onCrear={canEdit && !lleno ? (l) => void crear(l) : undefined} creando={creando} nota={nota} />
            </div>
          )}
          <p className="text-[10.5px] leading-snug text-faint">Revisión del asistente, no una decisión: la tribu discute y el líder registra. Vuelve a validar después de los cambios.</p>
        </div>
      )}
    </div>
  );
}

/** Crea los resultados clave sugeridos bajo un objetivo: código consecutivo por palanca, base 0, meta sugerida, dueño la tribu y plazo a fin del horizonte. */
async function crearKrs(cat: Cat, objId: string, lever: string, tribeId: string, horizon: string, krs: KrSugerido[], mutate: Mutate, existing?: { code: string }[]): Promise<boolean> {
  const prefix = lever.slice(0, 4); let used = (existing ?? cat.kpis).map((k) => k.code);
  const next = () => { let i = 1; while (used.includes(`${prefix}-${String(i).padStart(2, "0")}`)) i++; const c = `${prefix}-${String(i).padStart(2, "0")}`; used = [...used, c]; return c; };
  const year = /^\d{4}/.test(horizon) ? horizon.slice(0, 4) : String(new Date().getFullYear() + 1);
  let ok = true;
  for (const k of krs) {
    ok = (await mutate("kpi", "upsert", { code: next(), cmi: objId, name: k.name, unit: k.unit, goodDirection: k.goodDirection, frequency: k.frequency, definition: [k.definition, k.formula ? `Fórmula: ${k.formula}` : ""].filter(Boolean).join(" · "), formula: k.formula ?? "", baseline: 0, target: k.target ?? 0, ownerId: tribeId, due: `${year}-T4` })) && ok;
  }
  return ok;
}
