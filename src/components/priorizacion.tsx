"use client";

// Matriz 4Shine de priorización en la ficha de iniciativa: consolidado del
// comité, evaluación propia (según rol y capacidad) y decisión de tiempo
// (gerencia y advisor). La UI refleja la matriz de permisos; el servidor la
// exige (403/422) y explica el motivo.

import { useCallback, useEffect, useState } from "react";
import { useCan, useUser } from "@/components/user-context";
import { useCatalog } from "@/components/catalog-context";
import { horizonLabel } from "@/data/catalogo";
import {
  CRITERIA, TYPE_CRITERIA, DECISIONS, LEVEL_NAMES, decisionLabel, typeOf,
  type Consolidated, type CriterionKey, type Decision, type Evaluation, type Level, type TypeMark, type TypeMarks,
} from "@/lib/priorizacion";
import type { Catalog } from "@/data/catalogo";
import { Loader2, Save, AlertTriangle, X, Scale, Users, Gavel, Info, CheckCircle2 } from "lucide-react";

/** Decisión de la gerencia sobre una iniciativa (misma forma que las del catálogo). */
type DecisionRecord = Catalog["seedDecisions"][number];

export type PriorizacionData = {
  me: string;
  evaluations: Evaluation[];
  decisions: Record<string, DecisionRecord>;
  ranking: { id: string; horizon: string; line: number; name: string; c: Consolidated; position: number; suggested: string | null }[];
};

/** Chip del horizonte sugerido por el puntaje frente al actual. */
export function HorizonHint({ current, suggested, company, compact = false }: {
  current: string; suggested: string | null; company: Parameters<typeof horizonLabel>[0]; compact?: boolean;
}) {
  if (!suggested) return compact ? null : <span className="chip" title="Sin evaluación no hay horizonte sugerido">Horizonte: {horizonLabel(company, current)}</span>;
  if (suggested === current) return <span className="chip chip-ok !py-0 text-[9.5px]" title="El puntaje consolidado confirma el horizonte actual">✓ {horizonLabel(company, current)}</span>;
  return (
    <span className="chip chip-gold !py-0 text-[9.5px]" title={`El puntaje sugiere ${horizonLabel(company, suggested)}; hoy está en ${horizonLabel(company, current)}`}>
      → {horizonLabel(company, suggested)}
    </span>
  );
}

export function usePriorizacion(iniId?: string) {
  const [data, setData] = useState<PriorizacionData | null>(null);
  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/td/priorizacion${iniId ? `?id=${iniId}` : ""}`);
      if (res.ok) setData(await res.json());
    } catch { /* sin red: la ficha sigue mostrándose */ }
  }, [iniId]);
  useEffect(() => {
    // carga inicial fuera del ciclo síncrono del efecto (la mutación usa refetch)
    let alive = true;
    fetch(`/api/td/priorizacion${iniId ? `?id=${iniId}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j) setData(j); })
      .catch(() => { /* sin red */ });
    return () => { alive = false; };
  }, [iniId]);
  return { data, refetch };
}

const SCORE_COLOR = (s: number) => s >= 80 ? "var(--ok)" : s >= 65 ? "var(--cyan-deep)" : s >= 50 ? "var(--warn)" : "var(--bad)";
export const DECISION_CLS: Record<Decision, string> = { IMPLEMENTAR: "chip chip-ok", PREPARAR: "chip chip-cyan", BACKLOG: "chip chip-gold", RENUNCIAR: "chip chip-bad" };

/** Chip compacto para listados: puntaje consolidado + decisión. */
export function PrioChip({ c, decision }: { c: Consolidated | undefined; decision?: Decision | null }) {
  if (!c || c.n === 0) return <span className="chip" title="Sin evaluación con la matriz 4Shine">Sin priorizar</span>;
  return (
    <>
      <span className="chip" title={`Matriz 4Shine · D ${c.avg.D} · E ${c.avg.E} · M ${c.avg.M} · L ${c.avg.L} · ${c.n} evaluador${c.n > 1 ? "es" : ""}`}
        style={{ color: SCORE_COLOR(c.score), fontWeight: 800 }}>
        {c.score} pts
      </span>
      {decision && <span className={DECISION_CLS[decision]}>{decisionLabel(decision)}</span>}
    </>
  );
}

export function MatrizPanel({ iniId, line, horizon }: { iniId: string; line: number; horizon: string }) {
  const user = useUser();
  const cv = useCatalog();
  const canEval = useCan("evaluate_initiatives", line);
  const canDecide = useCan("decide_initiatives");
  const { data, refetch } = usePriorizacion(iniId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const post = async (body: Record<string, unknown>) => {
    setSaving(true); setError(null);
    const res = await fetch("/api/td/priorizacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: iniId, ...body }) });
    if (!res.ok) setError((await res.json()).error ?? "Error al guardar");
    else await refetch();
    setSaving(false);
    return res.ok;
  };

  const row = data?.ranking.find((r) => r.id === iniId);
  const c = row?.c;
  const mine = data?.evaluations.find((e) => e.by === user.email.toLowerCase());
  const decision = data?.decisions[iniId] ?? null;
  const sameHorizon = data?.ranking.filter((r) => r.horizon === horizon).length ?? 0;

  return (
    <div className="rise rise-3 panel mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <Scale size={16} className="text-cyan-deep" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold tracking-tight text-ink">Matriz 4Shine de priorización</div>
          <div className="text-[11.5px] text-muted">Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4 · ordena dentro del horizonte y sugiere el horizonte · la decisión de tiempo la registra la gerencia</div>
        </div>
        {c && c.n > 0 && row && (
          <span className="chip chip-cyan" title="Posición por puntaje entre las iniciativas del mismo horizonte">
            {row.position}.º de {sameHorizon} · {horizonLabel(cv.catalog.company, horizon).toLowerCase()}
          </span>
        )}
        {row && row.suggested && row.suggested !== horizon && (
          <span className="flex items-center gap-1.5">
            <span className="chip chip-gold" title="Según el puntaje consolidado y las reglas de la matriz">Sugerido: {horizonLabel(cv.catalog.company, row.suggested)}</span>
            {canDecide && (
              <button type="button" disabled={saving} onClick={() => post({ horizon: row.suggested })}
                className="btn-ghost !py-1 text-[10.5px]" title="Mover la iniciativa al horizonte sugerido (decisión de tiempo)">
                Mover a {horizonLabel(cv.catalog.company, row.suggested)}
              </button>
            )}
          </span>
        )}
        {row && row.suggested && row.suggested === horizon && (
          <span className="chip chip-ok" title="El puntaje consolidado confirma el horizonte actual">Horizonte confirmado</span>
        )}
        {decision && <span className={DECISION_CLS[decision.decision]}>{decisionLabel(decision.decision)}</span>}
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} />
          <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">{error}</p>
          <button onClick={() => setError(null)} className="text-faint hover:text-ink"><X size={14} /></button>
        </div>
      )}

      <div className="grid gap-7 px-6 py-5 lg:grid-cols-[1fr_1.15fr]">
        {/* consolidado */}
        <div>
          <div className="label mb-3 flex items-center gap-2"><Users size={12} /> Consolidado del comité</div>
          {!c || c.n === 0 ? (
            <p className="rounded-xl bg-surface-2/60 px-4 py-4 text-[12px] leading-relaxed text-muted">
              Nadie ha evaluado esta iniciativa con la matriz. Sin evaluación no puede competir como prioridad ni aprobarse para implementar.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-4">
                <div>
                  <div className="num text-[38px] font-extrabold leading-none tracking-tight" style={{ color: SCORE_COLOR(c.score) }}>{c.score}</div>
                  <div className="num mt-1 text-[10px] uppercase tracking-wider text-faint">puntos · {c.n} evaluador{c.n > 1 ? "es" : ""}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <span className={c.eligible ? "chip chip-ok" : "chip chip-warn"} title="Para competir como prioridad crítica, D debe ser 3 o 4">
                    {c.eligible ? "Elegible · D ≥ 3" : `No elegible · D = ${c.rounded.D}`}
                  </span>
                  <span className={c.capacityFirst ? "chip chip-warn" : "chip chip-ok"} title="Con L = 1 o 2 se resuelve primero la capacidad de la siguiente etapa">
                    {c.capacityFirst ? `Capacidad primero · L = ${c.rounded.L}` : "Capacidad · L ≥ 3"}
                  </span>
                  <span className="chip" title={`${c.strategicVotes} de ${c.n} evaluadores la ven estratégica`}>
                    {c.type === "ESTRATEGICO" ? "Estratégica" : "Táctica"} · {c.strategicVotes}/{c.n}
                  </span>
                  {c.lowConsensus && <span className="chip chip-bad" title={`Diferencia de ${c.spread} puntos entre evaluadores`}>Consenso bajo · ±{c.spread}</span>}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {CRITERIA.map((cr) => (
                  <div key={cr.key} className="flex items-center gap-3">
                    <span className="num w-5 text-[11px] font-extrabold text-cyan-deep">{cr.key}</span>
                    <span className="w-28 shrink-0 truncate text-[11.5px] font-semibold text-ink" title={cr.name}>{cr.short}</span>
                    <div className="relative h-[8px] flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((c.avg[cr.key] - 1) / 3) * 100}%`, background: "var(--grad-brand)" }} />
                    </div>
                    <span className="num w-8 text-right text-[12px] font-extrabold text-ink">{c.avg[cr.key]}</span>
                    <span className="w-24 shrink-0 whitespace-nowrap text-[10px] text-faint">{LEVEL_NAMES[c.rounded[cr.key]]} · {cr.weight} %</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1">
                {c.evaluators.map((e) => (
                  <div key={e.by} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-[11.5px]">
                    <span className="font-semibold text-ink">{e.name}</span>
                    <span className="chip !py-0 text-[9.5px]">{e.role.toLowerCase()}</span>
                    <span className="ml-auto text-[10px] text-faint">{e.type === "ESTRATEGICO" ? "estratégica" : "táctica"}</span>
                    <span className="num font-extrabold" style={{ color: SCORE_COLOR(e.score) }}>{e.score}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* decisión de tiempo */}
          <div className="label mb-2 mt-6 flex items-center gap-2"><Gavel size={12} /> Decisión de tiempo</div>
          {decision ? (
            <div className="rounded-xl bg-surface-2/60 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={DECISION_CLS[decision.decision]}>{decisionLabel(decision.decision)}</span>
                <span className="text-[10.5px] text-faint">{decision.name} · {decision.at.slice(0, 10)}</span>
              </div>
              {decision.rationale && <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">{decision.rationale}</p>}
            </div>
          ) : (
            <p className="text-[11.5px] italic text-faint">Sin decisión registrada.</p>
          )}
          {canDecide && c && <DecisionForm current={decision} c={c} saving={saving} onSave={(d, r) => post({ decision: d, rationale: r })} />}
          {!canDecide && (
            <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-faint"><Info size={11} className="mt-0.5 shrink-0" /> La decisión de tiempo la registra la gerencia o el advisor.</p>
          )}
        </div>

        {/* evaluación propia */}
        <div>
          <div className="label mb-3">{mine ? "Tu evaluación" : "Evaluar con la matriz"}</div>
          {canEval ? (
            <EvaluationForm key={mine?.at ?? "nueva"} initial={mine} saving={saving} onSave={(ev) => post({ evaluation: ev })} />
          ) : (
            <p className="rounded-xl bg-surface-2/60 px-4 py-4 text-[12px] leading-relaxed text-muted">
              {user.role === "RESPONSABLE"
                ? "Evalúas las iniciativas de tu capacidad; esta pertenece a otra. Puedes leer el consolidado y las notas del comité."
                : "Tu rol consulta la priorización: el advisor, la gerencia, la junta y los responsables de capacidad la evalúan."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EvaluationForm({ initial, saving, onSave }: {
  initial?: Evaluation; saving: boolean;
  onSave: (ev: { scores: Record<CriterionKey, Level>; type: TypeMarks; notes: Partial<Record<CriterionKey, string>> }) => Promise<boolean>;
}) {
  const [scores, setScores] = useState<Partial<Record<CriterionKey, Level>>>(initial?.scores ?? {});
  const [type, setType] = useState<TypeMarks>(initial?.type ?? {});
  const [notes, setNotes] = useState<Partial<Record<CriterionKey, string>>>(initial?.notes ?? {});
  const [openNote, setOpenNote] = useState<CriterionKey | null>(null);
  const [saved, setSaved] = useState(false);
  const complete = CRITERIA.every((c) => scores[c.key]) && TYPE_CRITERIA.every((t) => type[t.key]);
  const preview = complete ? Math.round(((40 * scores.D! + 30 * scores.E! + 20 * scores.M! + 10 * scores.L!) / 4) * 10) / 10 : null;
  const previewType: TypeMark | null = TYPE_CRITERIA.every((t) => type[t.key]) ? typeOf(type) : null;

  return (
    <div className="space-y-3">
      {CRITERIA.map((cr) => (
        <div key={cr.key} className="rounded-xl bg-surface-2/60 px-3.5 py-3">
          <div className="flex items-start gap-2">
            <span className="num mt-0.5 text-[12px] font-extrabold text-cyan-deep">{cr.key}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-ink">{cr.name} <span className="num text-[10px] font-semibold text-faint">· {cr.weight} %</span></div>
              <div className="text-[11px] leading-snug text-muted">{cr.question}</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {([1, 2, 3, 4] as Level[]).map((lv) => {
              const on = scores[cr.key] === lv;
              return (
                <button key={lv} type="button" onClick={() => setScores({ ...scores, [cr.key]: lv })} title={cr.levels[lv]}
                  className={`rounded-lg px-2 py-1.5 text-left transition-all ${on ? "text-white shadow-sm" : "bg-surface text-ink-soft hover:bg-cyan-wash"}`}
                  style={on ? { background: "var(--grad-brand)" } : undefined}>
                  <div className="num text-[11px] font-extrabold">{lv} · {LEVEL_NAMES[lv]}</div>
                  <div className={`mt-0.5 text-[9.5px] leading-snug ${on ? "text-white/85" : "text-faint"}`}>{cr.levels[lv]}</div>
                </button>
              );
            })}
          </div>
          {openNote === cr.key || notes[cr.key] ? (
            <textarea value={notes[cr.key] ?? ""} onChange={(e) => setNotes({ ...notes, [cr.key]: e.target.value })} rows={2} maxLength={600}
              placeholder="Sustento de la calificación: qué resultado, qué indicador, qué capacidad falta…"
              className="input mt-2 !py-1.5 text-[11px]" />
          ) : (
            <button type="button" onClick={() => setOpenNote(cr.key)} className="mt-1.5 text-[10px] font-bold text-cyan-deep hover:underline">+ Sustento</button>
          )}
        </div>
      ))}

      <div className="rounded-xl bg-surface-2/60 px-3.5 py-3">
        <div className="text-[12.5px] font-bold text-ink">¿Estratégica o táctica?</div>
        <div className="text-[11px] leading-snug text-muted">Marca cada criterio común; con tres o más marcas estratégicas, la iniciativa es estratégica.</div>
        <div className="mt-2 space-y-1.5">
          {TYPE_CRITERIA.map((t) => (
            <div key={t.key} className="grid gap-1.5 sm:grid-cols-[120px_1fr_1fr]">
              <span className="pt-1.5 text-[11px] font-semibold text-ink">{t.name}</span>
              {(["ESTRATEGICO", "TACTICO"] as TypeMark[]).map((m) => {
                const on = type[t.key] === m;
                return (
                  <button key={m} type="button" onClick={() => setType({ ...type, [t.key]: m })}
                    className={`rounded-lg px-2.5 py-1.5 text-left text-[10px] leading-snug transition-all ${on ? "text-white shadow-sm" : "bg-surface text-ink-soft hover:bg-cyan-wash"}`}
                    style={on ? { background: m === "ESTRATEGICO" ? "var(--navy)" : "var(--cyan-deep)" } : undefined}>
                    <b className="text-[10.5px]">{m === "ESTRATEGICO" ? "Estratégico" : "Táctico"}</b> · {m === "ESTRATEGICO" ? t.strategic : t.tactical}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="num text-[12px] text-muted">
          {preview !== null ? <>Tu puntaje: <b className="text-[15px] text-ink">{preview}</b> · {previewType === "ESTRATEGICO" ? "estratégica" : "táctica"}</> : "Califica los cuatro criterios y marca el tipo."}
        </div>
        <button type="button" disabled={!complete || saving}
          onClick={async () => { setSaved(false); if (await onSave({ scores: scores as Record<CriterionKey, Level>, type, notes })) setSaved(true); }}
          className="btn-primary ml-auto !py-1.5 text-[11.5px] disabled:opacity-40">
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />} {initial ? "Actualizar evaluación" : "Registrar evaluación"}
        </button>
      </div>
    </div>
  );
}

function DecisionForm({ current, c, saving, onSave }: {
  current: DecisionRecord | null; c: Consolidated; saving: boolean;
  onSave: (d: Decision, rationale: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Decision | null>(current?.decision ?? null);
  const [rationale, setRationale] = useState(current?.rationale ?? "");
  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-ghost mt-2 !py-1 text-[10.5px]">{current ? "Cambiar la decisión" : "Registrar la decisión"}</button>;
  }
  const hint = (k: Decision) =>
    k === "IMPLEMENTAR" && c.n === 0 ? "exige evaluación"
      : k === "IMPLEMENTAR" && !c.eligible ? "D debe ser 3 o 4"
        : k === "IMPLEMENTAR" && c.capacityFirst ? "L = 1 o 2: capacidad primero"
          : k === "PREPARAR" && c.n === 0 ? "exige evaluación" : null;
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-surface px-3.5 py-3 shadow-sm">
      {DECISIONS.map((x) => {
        const h = hint(x.key); const on = d === x.key;
        return (
          <button key={x.key} type="button" onClick={() => setD(x.key)} disabled={Boolean(h)}
            className={`block w-full rounded-lg px-3 py-2 text-left transition-all ${on ? "ring-2 ring-cyan-deep" : "hover:bg-surface-2/70"} disabled:opacity-45`}>
            <div className="flex items-center gap-2"><span className={DECISION_CLS[x.key]}>{x.label}</span>{h && <span className="text-[10px] text-faint">· no admisible: {h}</span>}</div>
            <div className="mt-1 text-[10.5px] leading-snug text-muted">{x.rule}</div>
          </button>
        );
      })}
      <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2}
        placeholder={d === "RENUNCIAR" ? "Motivo (obligatorio): qué alineación perdió, qué alternativa la sustituye…" : "Motivo de la decisión (recomendado)"}
        className="input !py-1.5 text-[11px]" />
      <div className="flex gap-1.5">
        <button type="button" disabled={!d || saving} onClick={async () => { if (d && await onSave(d, rationale)) setOpen(false); }}
          className="btn-primary flex-1 !py-1 text-[10.5px] disabled:opacity-40">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Registrar decisión
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-1 text-[10.5px]">Cancelar</button>
      </div>
    </div>
  );
}
