"use client";

// M6 · Seguimiento profundo con ruta por iniciativa:
//   /panel/iniciativas            → listado del portafolio
//   /panel/iniciativas/priorizacion → portafolio ordenado con la matriz 4Shine
//   /panel/iniciativas/<id>       → ficha a pantalla completa (i1…i8)
// La ficha declara responsable, objetivo CMI, meta de resultado, acciones,
// presupuesto en tres estados, motores de riesgo, factores con historial y
// bitácora — con navegación anterior/siguiente (también flechas del teclado).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, StateDot, StatusChip, StatCard } from "@/components/ui";
import { AccessChip, useCan } from "@/components/user-context";
import { BudgetBar } from "@/components/charts";
import { INITIATIVES, fmtCOP, type InitiativeDemo } from "@/data/demo";
import { CMI_OBJECTIVES, responsible, type ActionStatus, type InitiativeFull } from "@/data/cmi";
import { initiativeRisk } from "@/lib/logic";
import { initiativeTaskStats } from "@/lib/proyectos";
import { MatrizPanel, PrioChip, usePriorizacion, DECISION_CLS } from "@/components/priorizacion";
import { CRITERIA, LEVEL_NAMES, decisionLabel } from "@/lib/priorizacion";
import { LINES } from "@/data/demo";
import {
  ChevronRight, CircleCheck, CircleDashed, Circle, Flag, AlertTriangle,
  StickyNote, CalendarClock, User, Target, ArrowLeft, ArrowRight,
  Loader2, Save, PlusCircle, Pencil, X, Scale, ListChecks,
} from "lucide-react";

const FACTOR_COLORS = { VERDE: "var(--ok)", AMBAR: "var(--warn)", ROJO: "var(--bad)" } as const;

const RISK_CLS: Record<string, string> = {
  BAJO: "chip chip-ok", MEDIO: "chip", ALTO: "chip chip-warn", "CRÍTICO": "chip chip-bad",
};

const ACTION_META: Record<ActionStatus, { icon: typeof Circle; color: string; label: string }> = {
  HECHA: { icon: CircleCheck, color: "var(--ok)", label: "Hecha" },
  EN_CURSO: { icon: CircleDashed, color: "var(--cyan)", label: "En curso" },
  PENDIENTE: { icon: Circle, color: "var(--faint)", label: "Pendiente" },
};

const LOG_META = {
  HITO: { icon: Flag, color: "var(--ok)" },
  ALERTA: { icon: AlertTriangle, color: "var(--bad)" },
  NOTA: { icon: StickyNote, color: "var(--muted)" },
} as const;

export default function IniciativasPage() {
  const router = useRouter();
  const params = useParams<{ slug?: string[] }>();
  const slug = params.slug ?? [];
  const openId = slug[0] ? decodeURIComponent(slug[0]).toLowerCase() : null;

  const { data: prio } = usePriorizacion();
  const go = (path: string) => router.push(path, { scroll: false });
  const openIni = (id: string) => go(`/panel/iniciativas/${id}`);
  const closeIni = () => go("/panel/iniciativas");

  if (openId === "priorizacion") {
    return <PriorizacionView onOpen={openIni} onBack={closeIni} />;
  }
  if (openId) {
    return <IniciativaFicha id={openId} onClose={closeIni} onNav={openIni} />;
  }

  const totals = INITIATIVES.reduce(
    (a, i) => ({
      planned: a.planned + i.budgetPlanned,
      committed: a.committed + i.budgetCommitted,
      executed: a.executed + i.budgetExecuted,
    }),
    { planned: 0, committed: 0, executed: 0 },
  );
  const redFactors = INITIATIVES.flatMap((i) => i.factors.filter((f) => f.state === "ROJO"));
  const allActions = INITIATIVES.flatMap((i) => i.actions);
  const doneActions = allActions.filter((a) => a.status === "HECHA").length;

  return (
    <>
      <PageHeader kicker="M6 · Seguimiento" title="Iniciativas, acciones y factores de éxito"
        desc="Cada iniciativa declara su meta de resultado, sus acciones con meta propia, su responsable, su presupuesto en tres estados y su bitácora. Cuando un factor acumula dos revisiones en rojo, la conversación se puede tener a tiempo."
        actions={<span className="flex items-center gap-2"><Link href="/panel/iniciativas/priorizacion" className="btn-ghost !py-1.5 text-[11.5px]"><Scale size={13} /> Portafolio priorizado</Link><AccessChip module="iniciativas" /></span>} />

      <div className="rise rise-1 mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Presupuesto del portafolio" value={totals.planned / 1e6} decimals={0}
          prefix="$ " unit="M COP" foot={`${INITIATIVES.length} iniciativas`} />
        <StatCard label="Ejecutado + comprometido"
          value={Math.round(((totals.executed + totals.committed) / totals.planned) * 100)} unit="%"
          foot={fmtCOP(totals.executed + totals.committed)}
          accent="linear-gradient(90deg, var(--n4), var(--n5))" />
        <StatCard label="Acciones completadas" value={doneActions} unit={`de ${allActions.length}`}
          foot="Con meta de resultado verificable" />
        <StatCard label="Factores en rojo" value={redFactors.length}
          unit={redFactors.length === 1 ? "factor" : "factores"}
          foot="dos revisiones seguidas → conversación"
          accent="linear-gradient(90deg, var(--bad), #a13c44)" />
      </div>

      <div className="space-y-3.5">
        {INITIATIVES.map((i, idx) => {
          const owner = responsible(i.ownerId);
          const done = i.actions.filter((a) => a.status === "HECHA").length;
          const risk = initiativeRisk(i);
          const ts = initiativeTaskStats(i.id);
          return (
            <Card key={i.id} className={`rise rise-${Math.min(idx + 1, 4)} overflow-hidden`}>
              <button onClick={() => openIni(i.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2/50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[14.5px] font-extrabold tracking-tight text-ink">{i.name}</span>
                    <StatusChip status={i.status} />
                    <span className="chip">{i.subsistema}</span>
                    <span className={RISK_CLS[risk.level]} title={risk.drivers.map((d) => d.text).join(" · ")}>
                      Riesgo {risk.level.toLowerCase()} · {risk.score}
                    </span>
                    <PrioChip c={prio?.ranking.find((r) => r.id === i.id)?.c} decision={prio?.decisions[i.id]?.decision} />
                  </div>
                  <div className="num mt-1 text-[10.5px] text-faint">
                    {owner.dependencia} · {i.start} → {i.end} · acciones {done}/{i.actions.length}
                    {ts.total > 0 && <> · tareas {ts.done}/{ts.total}{ts.overdue > 0 && <span style={{ color: "var(--bad)" }}> · {ts.overdue} vencida{ts.overdue > 1 ? "s" : ""}</span>}</>}
                  </div>
                </div>
                <div className="hidden w-44 shrink-0 sm:block">
                  <div className="num mb-1 flex justify-between text-[9px] text-faint">
                    <span>{fmtCOP(i.budgetPlanned)}</span><span>{i.progress} %</span>
                  </div>
                  <BudgetBar planned={i.budgetPlanned} committed={i.budgetCommitted} executed={i.budgetExecuted} />
                </div>
                <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {i.factors.map((f) => <StateDot key={f.name} state={f.state} size={8} />)}
                </span>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </button>
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-center text-[11px] text-faint">
        ¿Buscas la vista de planeación? El <Link href="/panel/ruta" className="font-semibold text-cyan-deep">roadmap por horizontes</Link>{" "}
        muestra estas mismas iniciativas en Gantt y matriz de priorización.
      </p>
    </>
  );
}

/* ─── ficha de iniciativa a pantalla completa ─── */

function IniciativaFicha({ id, onClose, onNav }: {
  id: string;
  onClose: () => void;
  onNav: (id: string) => void;
}) {
  const base: InitiativeDemo | null = INITIATIVES.find((x) => x.id === id) ?? null;

  // iniciativa efectiva: el seed + los cambios hechos desde la plataforma
  const [effIni, setEffIni] = useState<InitiativeDemo | null>(null);
  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/td/initiatives");
      if (!res.ok) return;
      const j = await res.json();
      const found = (j.initiatives as (InitiativeFull & { owner: unknown; risk: unknown })[])
        .find((x) => x.id === id);
      if (found) {
        const { owner: _o, risk: _r, ...rest } = found;
        setEffIni({ ...rest, owner: responsible(rest.ownerId).dependencia });
      }
    } catch { /* seed como respaldo */ }
  }, [id]);
  useEffect(() => { setEffIni(null); refetch(); }, [refetch]);

  const i = effIni ?? base;
  const canEdit = useCan("edit_initiatives", i?.line);

  // mutación con el error explicado por el servidor
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutate = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/td/initiatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Error al guardar");
    else await refetch();
    setSaving(false);
    return res.ok;
  };

  const idx = i ? INITIATIVES.findIndex((x) => x.id === i.id) : -1;
  const prev = idx > 0 ? INITIATIVES[idx - 1] : null;
  const next = idx >= 0 && idx < INITIATIVES.length - 1 ? INITIATIVES[idx + 1] : null;

  // Escape vuelve al listado · flechas navegan entre iniciativas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNav(prev.id);
      if (e.key === "ArrowRight" && next) onNav(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav, prev, next]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  if (!i) {
    return (
      <>
        <button onClick={onClose} className="btn-ghost rise mb-5">
          <ArrowLeft size={13} /> Iniciativas
        </button>
        <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-muted">
          La iniciativa <b className="num">{id}</b> no existe en el portafolio.
        </p>
      </>
    );
  }

  const owner = responsible(i.ownerId);
  const cmiObj = CMI_OBJECTIVES.find((o) => o.id === i.cmi);
  const done = i.actions.filter((a) => a.status === "HECHA").length;
  const risk = initiativeRisk(i);
  const ts = initiativeTaskStats(i.id);

  return (
    <>
      {/* barra de contexto: volver + anterior/siguiente */}
      <div className="rise mb-5 flex flex-wrap items-center gap-2">
        <button onClick={onClose} className="btn-ghost" title="Volver al listado (Esc)">
          <ArrowLeft size={13} /> Iniciativas
        </button>
        <span className="num text-[11px] text-faint">{idx + 1} de {INITIATIVES.length}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => prev && onNav(prev.id)} disabled={!prev}
            title={prev ? `${prev.id} · ${prev.name}` : undefined}
            className="btn-ghost disabled:opacity-30">
            <ArrowLeft size={13} /> <span className="num hidden sm:inline">{prev?.id ?? "—"}</span>
          </button>
          <button onClick={() => next && onNav(next.id)} disabled={!next}
            title={next ? `${next.id} · ${next.name}` : undefined}
            className="btn-ghost disabled:opacity-30">
            <span className="num hidden sm:inline">{next?.id ?? "—"}</span> <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* error de mutación (403/422 explicado por el servidor) */}
      {error && (
        <div className="rise mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
          style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} />
          <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">{error}</p>
          <button onClick={() => setError(null)} className="text-faint hover:text-ink"><X size={14} /></button>
        </div>
      )}

      {/* cabecera de la iniciativa */}
      <div className="rise rise-1 panel mb-5 overflow-hidden">
        <div className="spine h-[3px]" />
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6 py-5">
          <div className="min-w-0 flex-1 basis-80">
            <div className="num text-[10.5px] font-bold text-cyan-deep">
              {i.id.toUpperCase()} <span className="font-medium text-faint">· {i.subsistema} · {i.start} → {i.end}</span>
            </div>
            <h1 className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
              {i.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip status={i.status} />
              <span className={RISK_CLS[risk.level]} title={risk.drivers.map((d) => d.text).join(" · ")}>
                Riesgo {risk.level.toLowerCase()} · {risk.score}/100
              </span>
              <span className="chip">acciones {done}/{i.actions.length}</span>
              {ts.total > 0 && (
                <Link href={`/panel/proyectos/${i.id}`} className="chip chip-cyan">
                  tareas {ts.done}/{ts.total}
                  {ts.overdue > 0 && <b style={{ color: "var(--bad)" }}> · {ts.overdue} vencida{ts.overdue > 1 ? "s" : ""}</b>}
                  {" "}→
                </Link>
              )}
            </div>
          </div>
          <div className="w-full max-w-xs shrink-0 sm:w-56">
            <div className="num mb-1 flex items-center justify-between text-[10px] text-faint">
              <span>{fmtCOP(i.budgetPlanned)}</span>
              {canEdit ? (
                <AvanceEditor value={i.progress} saving={saving}
                  onSave={(v) => mutate({ progress: v })} />
              ) : (
                <span className="font-bold text-ink">avance {i.progress} %</span>
              )}
            </div>
            <BudgetBar planned={i.budgetPlanned} committed={i.budgetCommitted} executed={i.budgetExecuted} />
            <div className="mt-2 flex items-center gap-1.5">
              {i.factors.map((f) => <StateDot key={f.name} state={f.state} size={8} />)}
              <span className="ml-1 text-[9.5px] uppercase tracking-wide text-faint">factores</span>
            </div>
          </div>
        </div>
      </div>

      {/* franja de contexto */}
      <div className="rise rise-2 panel mb-5 grid gap-4 px-6 py-4 sm:grid-cols-3">
        <div className="flex items-start gap-2.5">
          <User size={14} className="mt-0.5 shrink-0 text-cyan-deep" />
          <div>
            <div className="label !text-[8.5px]">Responsable</div>
            <div className="text-[12px] font-bold leading-snug text-ink">{owner.cargo}</div>
            <div className="text-[10.5px] text-faint">{owner.dependencia}</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Target size={14} className="mt-0.5 shrink-0 text-cyan-deep" />
          <div>
            <div className="label !text-[8.5px]">Objetivo CMI · {i.cmi}</div>
            <div className="text-[11.5px] font-semibold leading-snug text-ink">{cmiObj?.name}</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Flag size={14} className="mt-0.5 shrink-0 text-cyan-deep" />
          <div>
            <div className="label !text-[8.5px]">Meta de resultado</div>
            <div className="text-[11.5px] font-semibold leading-snug text-ink">{i.metaResultado}</div>
          </div>
        </div>
      </div>

      {/* matriz 4Shine de priorización: evaluación por roles y decisión de tiempo */}
      <MatrizPanel iniId={i.id} line={i.line} horizon={i.horizon} />

      {/* detalle */}
      <div className="rise rise-4 panel">
        <div className="grid gap-7 px-6 py-5 lg:grid-cols-2">
          {/* acciones */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="label">Acciones y metas de resultado</span>
              {ts.total > 0 && (
                <Link href={`/panel/proyectos/${i.id}`} className="chip chip-cyan">
                  Plan de trabajo · {ts.total} tareas →
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {i.actions.map((a) => {
                const meta = ACTION_META[a.status];
                return (
                  <div key={a.name} className="flex items-start gap-2.5 rounded-xl bg-surface-2/60 px-3.5 py-2.5">
                    <meta.icon size={16} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold leading-snug text-ink">{a.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted">Meta: {a.meta}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-[9.5px] font-bold" style={{ color: meta.color }}>{meta.label}</div>
                      <div className="num text-[9px] text-faint">{a.quarter}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="label mb-3 mt-6">Ejecución presupuestal</div>
            <BudgetBar planned={i.budgetPlanned} committed={i.budgetCommitted} executed={i.budgetExecuted} />
            <div className="mt-2.5 grid grid-cols-3 gap-3">
              {[
                { l: "Ejecutado", v: i.budgetExecuted, c: "var(--n5)" },
                { l: "Comprometido", v: i.budgetCommitted, c: "var(--cyan-fill)" },
                { l: "Disponible", v: i.budgetPlanned - i.budgetExecuted - i.budgetCommitted, c: "var(--line-strong)" },
              ].map((x) => (
                <div key={x.l}>
                  <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-wide text-faint">
                    <i className="h-2 w-2 rounded-sm" style={{ background: x.c }} />{x.l}
                  </div>
                  <div className="num mt-0.5 text-[12px] font-bold text-ink">{fmtCOP(x.v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* factores + bitácora */}
          <div>
            {risk.drivers.length > 0 && (
              <div className="mb-5">
                <div className="label mb-2.5">Motores del riesgo ({risk.score}/100)</div>
                <div className="space-y-1.5">
                  {risk.drivers.map((d) => (
                    <div key={d.text} className="flex items-center gap-2.5 rounded-lg bg-surface-2/60 px-3 py-2">
                      <span className="chip shrink-0">{d.category}</span>
                      <span className="flex-1 text-[11.5px] leading-snug text-ink-soft">{d.text}</span>
                      <span className="num text-[10px] font-bold text-muted">+{d.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="label mb-3">Factores críticos de éxito</div>
            <div className="space-y-1.5">
              {i.factors.map((f) => (
                <div key={f.name} className="rounded-xl bg-surface-2/60 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <StateDot state={f.state} />
                    <span className="flex-1 text-[12.5px] font-semibold text-ink">{f.name}</span>
                    <span className="flex items-center gap-1">
                      {f.history.map((h, hi) => (
                        <StateDot key={hi} state={h as "VERDE" | "AMBAR" | "ROJO"} size={7} />
                      ))}
                    </span>
                  </div>
                  {f.note && <div className="mt-1 pl-[22px] text-[11px] leading-snug text-muted">{f.note}</div>}
                  {canEdit && (
                    <FactorReview name={f.name} current={f.state} saving={saving}
                      onSave={(state, note) => mutate({ factor: { name: f.name, state, note } })} />
                  )}
                </div>
              ))}
            </div>

            <div className="label mb-3 mt-6">Bitácora de seguimiento</div>
            {canEdit && (
              <LogForm saving={saving}
                onSave={(type, text) => mutate({ log: { type, text } })} />
            )}
            {i.log.length === 0 ? (
              <p className="text-[11.5px] italic text-faint">Sin registros: la iniciativa no ha iniciado.</p>
            ) : (
              <div className="relative space-y-3 pl-5">
                <span className="absolute bottom-1 left-[7px] top-1 w-px bg-line-strong" />
                {i.log.map((l) => {
                  const meta = LOG_META[l.type];
                  return (
                    <div key={l.date + l.text} className="relative">
                      <span className="absolute -left-[18px] top-[3px] grid h-[14px] w-[14px] place-items-center rounded-full bg-surface"
                        style={{ boxShadow: `0 0 0 1.5px ${meta.color}` }}>
                        <meta.icon size={8} style={{ color: meta.color }} />
                      </span>
                      <div className="num text-[9.5px] font-bold text-faint">{l.date}</div>
                      <div className="text-[12px] leading-snug text-ink-soft">{l.text}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-cyan-wash px-3.5 py-3">
              <CalendarClock size={14} className="mt-0.5 shrink-0 text-cyan-deep" />
              <div className="min-w-0 flex-1">
                <div className="label !text-[8.5px] !text-cyan-deep">Próximo hito · {i.nextMilestone.date}</div>
                <div className="text-[12px] font-semibold leading-snug text-ink">{i.nextMilestone.text}</div>
              </div>
              {canEdit && (
                <HitoEditor current={i.nextMilestone} saving={saving}
                  onSave={(date, text) => mutate({ nextMilestone: { date, text } })} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── portafolio priorizado: la matriz aplicada a todas las iniciativas ─── */

function PriorizacionView({ onOpen, onBack }: { onOpen: (id: string) => void; onBack: () => void }) {
  const { data } = usePriorizacion();
  const rows = data?.ranking ?? [];
  const evaluated = rows.filter((r) => r.c.n > 0);
  const decided = Object.values(data?.decisions ?? {});
  const byDecision = (d: string) => decided.filter((x) => x.decision === d).length;
  return (
    <>
      <div className="rise mb-5 flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="btn-ghost" title="Volver al listado (Esc)"><ArrowLeft size={13} /> Iniciativas</button>
      </div>
      <PageHeader kicker="M6 · Priorización" title="Portafolio priorizado con la matriz 4Shine"
        desc="Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4. El puntaje ordena alternativas dentro de cada horizonte; para competir como prioridad crítica D debe ser 3 o 4, y con L en 1 o 2 se resuelve primero la capacidad. La aprobación exige impacto estratégico, capacidad y recursos disponibles."
        actions={<AccessChip module="iniciativas" />} />

      <div className="rise rise-1 mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Iniciativas evaluadas" value={evaluated.length} unit={`de ${rows.length}`} foot={`${data?.evaluations.length ?? 0} evaluaciones del comité`} />
        <StatCard label="Ahora: implementar" value={byDecision("IMPLEMENTAR")} foot="contribución, capacidad y urgencia" accent="linear-gradient(90deg, var(--ok), #2f8f5b)" />
        <StatCard label="Ahora: preparar o validar" value={byDecision("PREPARAR")} foot="etapa acotada con evidencia esperada" accent="linear-gradient(90deg, var(--cyan), var(--cyan-deep))" />
        <StatCard label="Backlog y renuncias" value={byDecision("BACKLOG") + byDecision("RENUNCIAR")} foot="pueden esperar o perdieron alineación" accent="linear-gradient(90deg, var(--gold), #a87a14)" />
      </div>

      {(["CORTO", "MEDIANO"] as const).map((h, hi) => (
        <Card key={h} className={`rise rise-${hi + 2} mb-5 overflow-hidden`}>
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <ListChecks size={14} className="text-cyan-deep" />
            <span className="text-[13px] font-extrabold text-ink">{h === "CORTO" ? "Corto plazo" : "Mediano plazo"}</span>
            <span className="text-[11px] text-faint">· {rows.filter((r) => r.horizon === h).length} iniciativas, ordenadas por puntaje consolidado</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[9.5px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-2">#</th><th className="px-2 py-2">Iniciativa</th>
                  {CRITERIA.map((c) => <th key={c.key} className="num px-2 py-2 text-center" title={`${c.name} · ${c.weight} %`}>{c.key}</th>)}
                  <th className="num px-2 py-2 text-right">Puntaje</th><th className="px-2 py-2">Tipo</th><th className="px-2 py-2">Reglas</th><th className="px-2 py-2">Decisión</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.horizon === h).map((r) => {
                  const d = data?.decisions[r.id];
                  const cap = LINES.find((l) => l.n === r.line);
                  return (
                    <tr key={r.id} onClick={() => onOpen(r.id)} className="cursor-pointer border-t border-line transition-colors hover:bg-surface-2/50">
                      <td className="num px-4 py-2.5 font-extrabold text-cyan-deep">{r.c.n > 0 ? r.position : "—"}</td>
                      <td className="px-2 py-2.5">
                        <div className="font-bold text-ink">{r.name}</div>
                        <div className="num text-[10px] text-faint">{r.id.toUpperCase()} · {cap?.name} · {r.c.n} evaluador{r.c.n === 1 ? "" : "es"}</div>
                      </td>
                      {CRITERIA.map((c) => (
                        <td key={c.key} className="num px-2 py-2.5 text-center" title={r.c.n ? `${c.name}: ${r.c.avg[c.key]} · ${LEVEL_NAMES[r.c.rounded[c.key]]}` : undefined}>
                          {r.c.n ? <span className={`font-bold ${r.c.rounded[c.key] >= 3 ? "text-ink" : "text-muted"}`}>{r.c.avg[c.key]}</span> : <span className="text-faint">—</span>}
                        </td>
                      ))}
                      <td className="num px-2 py-2.5 text-right text-[14px] font-extrabold" style={{ color: r.c.n ? (r.c.score >= 80 ? "var(--ok)" : r.c.score >= 65 ? "var(--cyan-deep)" : r.c.score >= 50 ? "var(--warn)" : "var(--bad)") : "var(--faint)" }}>{r.c.n ? r.c.score : "—"}</td>
                      <td className="px-2 py-2.5 text-[11px] text-ink-soft">{r.c.type ? (r.c.type === "ESTRATEGICO" ? "Estratégica" : "Táctica") : "—"}</td>
                      <td className="px-2 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          {r.c.n > 0 && !r.c.eligible && <span className="chip chip-warn !py-0 text-[9.5px]" title="D < 3: no compite como prioridad crítica">D {r.c.rounded.D}</span>}
                          {r.c.n > 0 && r.c.capacityFirst && <span className="chip chip-warn !py-0 text-[9.5px]" title="L ≤ 2: resolver la capacidad primero">L {r.c.rounded.L}</span>}
                          {r.c.lowConsensus && <span className="chip chip-bad !py-0 text-[9.5px]" title={`±${r.c.spread} puntos entre evaluadores`}>consenso</span>}
                          {r.c.n > 0 && r.c.eligible && !r.c.capacityFirst && !r.c.lowConsensus && <span className="chip chip-ok !py-0 text-[9.5px]">elegible</span>}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">{d ? <span className={DECISION_CLS[d.decision]}>{decisionLabel(d.decision)}</span> : <span className="text-[10.5px] italic text-faint">pendiente</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      <p className="text-center text-[11px] text-faint">La matriz ayuda a comparar. La priorización ocurre cuando se decide dónde comprometer recursos, qué debe esperar y a qué se renuncia.</p>
    </>
  );
}

/* ─── controles de edición (edit_initiatives, por línea) ─── */

function AvanceEditor({ value, saving, onSave }: {
  value: number; saving: boolean; onSave: (v: number) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const dirty = Number(draft) !== value;
  return (
    <span className="flex items-center gap-1">
      <span className="text-faint">avance</span>
      <input type="number" min={0} max={100} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="input w-14 !px-1.5 !py-0.5 text-center !text-[11px] font-bold" />
      <span className="text-faint">%</span>
      {dirty && (
        <button onClick={() => onSave(Number(draft))} disabled={saving}
          className="rounded p-0.5 text-cyan-deep hover:bg-cyan-wash" title="Guardar avance">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        </button>
      )}
    </span>
  );
}

function FactorReview({ name, current, saving, onSave }: {
  name: string;
  current: "VERDE" | "AMBAR" | "ROJO";
  saving: boolean;
  onSave: (state: "VERDE" | "AMBAR" | "ROJO", note?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"VERDE" | "AMBAR" | "ROJO">(current);
  const [note, setNote] = useState("");
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setState(current); setNote(""); }}
        className="mt-1.5 flex items-center gap-1 pl-[22px] text-[10px] font-bold text-cyan-deep hover:underline">
        <Pencil size={9} /> Registrar revisión
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-surface px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5">
        {(["VERDE", "AMBAR", "ROJO"] as const).map((s) => (
          <button key={s} onClick={() => setState(s)}
            className={`flex-1 rounded-lg py-1 text-[10px] font-bold transition-all ${
              state === s ? "text-white shadow-sm" : "bg-surface-2 text-muted"}`}
            style={state === s ? { background: FACTOR_COLORS[s] } : undefined}>
            {s.toLowerCase()}
          </button>
        ))}
      </div>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Nota de la revisión (opcional)"
        className="input !py-1 text-[10.5px]" />
      <div className="flex gap-1.5">
        <button onClick={async () => { if (await onSave(state, note || undefined)) setOpen(false); }}
          disabled={saving}
          className="btn-primary flex-1 !py-1 text-[10.5px] disabled:opacity-40">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Registrar
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost !py-1 text-[10.5px]">Cancelar</button>
      </div>
    </div>
  );
}

function LogForm({ saving, onSave }: {
  saving: boolean;
  onSave: (type: "HITO" | "ALERTA" | "NOTA", text: string) => Promise<boolean>;
}) {
  const [type, setType] = useState<"HITO" | "ALERTA" | "NOTA">("NOTA");
  const [text, setText] = useState("");
  return (
    <div className="mb-3 flex gap-1.5">
      <select value={type} onChange={(e) => setType(e.target.value as typeof type)}
        className="input w-24 !py-1.5 text-[11px]">
        <option value="NOTA">Nota</option>
        <option value="HITO">Hito</option>
        <option value="ALERTA">Alerta</option>
      </select>
      <input type="text" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Registrar seguimiento…"
        onKeyDown={async (e) => {
          if (e.key === "Enter" && text.trim() && await onSave(type, text)) setText("");
        }}
        className="input min-w-0 flex-1 !py-1.5 text-[11px]" />
      <button onClick={async () => { if (text.trim() && await onSave(type, text)) setText(""); }}
        disabled={saving || !text.trim()}
        className="btn-ghost !py-1.5 text-[11px] disabled:opacity-40">
        {saving ? <Loader2 size={11} className="animate-spin" /> : <PlusCircle size={11} />}
      </button>
    </div>
  );
}

function HitoEditor({ current, saving, onSave }: {
  current: { date: string; text: string };
  saving: boolean;
  onSave: (date: string, text: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(current.date);
  const [text, setText] = useState(current.text);
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setDate(current.date); setText(current.text); }}
        className="shrink-0 rounded p-1 text-cyan-deep hover:bg-white/60" title="Editar próximo hito">
        <Pencil size={12} />
      </button>
    );
  }
  return (
    <div className="w-full space-y-1.5 pt-1">
      <div className="flex gap-1.5">
        <input type="text" value={date} onChange={(e) => setDate(e.target.value)}
          placeholder="2027-04" className="input w-24 !py-1 text-[10.5px]" />
        <input type="text" value={text} onChange={(e) => setText(e.target.value)}
          className="input min-w-0 flex-1 !py-1 text-[10.5px]" />
      </div>
      <div className="flex gap-1.5">
        <button onClick={async () => { if (await onSave(date, text)) setOpen(false); }}
          disabled={saving}
          className="btn-primary !py-1 text-[10.5px] disabled:opacity-40">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Guardar
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost !py-1 text-[10.5px]">Cancelar</button>
      </div>
    </div>
  );
}
