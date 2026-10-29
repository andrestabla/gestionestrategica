"use client";

// Evaluación de una iniciativa en modo focal, un criterio por pantalla: primero los criterios de tipo
// (¿estratégica o táctica?) como tarjetas, luego los cuatro criterios de la matriz de 1 a 4 con la
// descripción de cada nivel visible antes de elegir y un sustento opcional, y al final el resumen con
// el puntaje previsto y el botón de registrar. Sirve para la calificación guiada (una iniciativa tras
// otra) y para evaluar una iniciativa suelta desde su panel.

import { useState, type ReactNode } from "react";
import { ModoFocal } from "@/components/modo-focal";
import { UnaAUna, type Pantalla } from "@/components/una-a-una";
import { confirmar } from "@/components/feedback";
import { CRITERIA, LEVEL_NAMES, typeOf, validationCriteriaCount, typeRuleLabel, type CriterionKey, type Level, type TypeMarks, type TypeMark, type TypeRule, type Evaluation } from "@/lib/priorizacion";
import { Loader2, Save, CheckCircle2, Scale, SkipForward } from "lucide-react";

export type EvaluacionGuardable = { scores: Record<CriterionKey, Level>; type: TypeMarks; notes: Partial<Record<CriterionKey, string>> };

type Iniciativa = { id: string; name: string; objetivo?: string; detalle?: ReactNode };

export function EvaluacionFocal({ ini, rule, initial, confirmOnce = false, saving, error, onSave, onExit, progreso, onSaltar, titulo }: {
  ini: Iniciativa; rule: TypeRule; initial?: Evaluation; confirmOnce?: boolean; saving: boolean; error?: string | null;
  onSave: (ev: EvaluacionGuardable) => Promise<boolean>; onExit: () => void;
  progreso?: { hechas: number; total: number };   // calificación guiada: iniciativa n de N
  onSaltar?: () => void;                           // dejar esta para después
  titulo?: string;                                 // kicker: de quién son las iniciativas
}) {
  const [scores, setScores] = useState<Partial<Record<CriterionKey, Level>>>(initial?.scores ?? {});
  const [type, setType] = useState<TypeMarks>(initial?.type ?? {});
  const [notes, setNotes] = useState<Partial<Record<CriterionKey, string>>>(initial?.notes ?? {});
  const [saved, setSaved] = useState(false);
  const complete = CRITERIA.every((c) => scores[c.key]) && rule.criteria.every((t) => type[t.key]);
  const preview = complete ? Math.round(((40 * scores.D! + 30 * scores.E! + 20 * scores.M! + 10 * scores.L!) / 4) * 10) / 10 : null;
  const previewType: TypeMark | null = complete ? typeOf(type, rule, scores) : null;
  const total = validationCriteriaCount(rule);
  const respondidos = rule.criteria.filter((t) => type[t.key]).length + CRITERIA.filter((c) => scores[c.key]).length;

  const registrar = async () => {
    if (confirmOnce && !initial && !(await confirmar("¿Estás seguro de tu valoración? Solo se puede calificar una vez; después no se puede cambiar."))) return;
    setSaved(false);
    if (await onSave({ scores: scores as Record<CriterionKey, Level>, type, notes })) setSaved(true);
  };

  const intro = (
    <div className="panel px-6 py-6 sm:px-8">
      <div className="num text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">{ini.id}</div>
      <h2 className="mt-1 text-[20px] font-extrabold leading-snug text-ink sm:text-[22px]">{ini.name}</h2>
      {ini.objetivo && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{ini.objetivo}</p>}
      {ini.detalle && <div className="mt-2 text-[12.5px] text-muted">{ini.detalle}</div>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {rule.criteria.length > 0 && <div className="rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-snug text-ink-soft"><b className="text-ink">Criterios 1 a {rule.criteria.length} · tipo.</b> ¿Estratégica o táctica? {typeRuleLabel(rule)}.{rule.excludeTactical ? " Lo táctico se transfiere al área y no compite en el portafolio estratégico." : ""}</div>}
        <div className="rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-snug text-ink-soft"><b className="text-ink">Criterios {rule.criteria.length + 1} a {total} · matriz.</b> Impacto (40 %), evidencia (30 %), sostenibilidad (20 %) y capacidad (10 %), de 1 a 4. Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4.</div>
      </div>
      <p className="mt-4 text-[12.5px] text-muted">Un criterio por pantalla: lee las opciones, elige y pasa a la siguiente con «Siguiente», Enter o →. {confirmOnce && !initial ? "Se registra una sola vez por persona." : "Puedes volver y ajustar antes de registrar."}</p>
    </div>
  );

  const fin = (
    <div className="panel px-6 py-7 text-center sm:px-8">
      <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-deep">Resumen de tu evaluación</div>
      <div className="mt-1 text-[18px] font-extrabold text-ink">{ini.name}</div>
      <div className="mx-auto mt-4 grid max-w-[560px] gap-2 sm:grid-cols-2">
        {rule.criteria.map((t, i) => <div key={t.key} className="flex items-center justify-between rounded-xl bg-surface-2/70 px-3 py-2 text-[12.5px]"><span className="text-ink-soft"><span className="num font-bold text-cyan-deep">{i + 1}.</span> {t.name}</span><b className="text-ink">{type[t.key] === "ESTRATEGICO" ? "Estratégico" : type[t.key] === "TACTICO" ? "Táctico" : "—"}</b></div>)}
        {CRITERIA.map((c, i) => <div key={c.key} className="flex items-center justify-between rounded-xl bg-surface-2/70 px-3 py-2 text-[12.5px]"><span className="text-ink-soft"><span className="num font-bold text-cyan-deep">{rule.criteria.length + i + 1}. {c.key}</span> {c.short}</span><b className="num text-ink">{scores[c.key] ? `${scores[c.key]} · ${LEVEL_NAMES[scores[c.key]!]}` : "—"}</b></div>)}
      </div>
      {preview !== null
        ? <div className="mt-5"><div className="num text-[40px] font-extrabold leading-none text-ink">{preview.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</div><div className="mt-1 text-[12.5px] text-muted">puntos · {previewType === "ESTRATEGICO" ? "estratégica" : "táctica"}</div></div>
        : <p className="mt-5 text-[13px] text-muted">Faltan {total - respondidos} criterios. Usa el mapa de puntos para volver a los pendientes.</p>}
      {error && <p className="mx-auto mt-3 max-w-[52ch] rounded-lg px-3 py-2 text-[12.5px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--surface))" }}>{error}</p>}
      <button type="button" disabled={!complete || saving} onClick={registrar} className="btn-primary mt-5 inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">
        {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />} {initial ? "Actualizar evaluación" : "Registrar evaluación"}
      </button>
    </div>
  );

  const pantallas: Pantalla[] = [
    { kind: "libre", id: "intro", node: intro },
    ...rule.criteria.map((t, i) => ({
      kind: "item" as const, id: `tipo-${t.key}`, grupo: `Criterio ${i + 1} de ${total} · tipo`, code: String(i + 1), texto: t.name,
      pregunta: "¿Esta iniciativa es estratégica o táctica según este criterio?", variante: "tarjetas" as const,
      niveles: [{ n: 1, name: "Estratégico", desc: t.strategic }, { n: 2, name: "Táctico", desc: t.tactical }],
      value: type[t.key] === "ESTRATEGICO" ? 1 : type[t.key] === "TACTICO" ? 2 : undefined,
      onSet: (v: number | string | undefined) => setType((prev) => { const next = { ...prev }; if (v === undefined) delete next[t.key]; else next[t.key] = v === 1 ? "ESTRATEGICO" : "TACTICO"; return next; }),
    })),
    ...CRITERIA.map((c, i) => ({
      kind: "item" as const, id: `matriz-${c.key}`, grupo: `Criterio ${rule.criteria.length + i + 1} de ${total} · matriz · ${c.weight} %`, grupoDesc: rule.notes?.[c.key], code: c.key, texto: c.name,
      pregunta: c.question, variante: "tarjetas" as const,
      niveles: ([1, 2, 3, 4] as Level[]).map((lv) => ({ n: lv, name: LEVEL_NAMES[lv], desc: c.levels[lv] })),
      value: scores[c.key],
      onSet: (v: number | string | undefined) => setScores((prev) => { const next = { ...prev }; if (v === undefined) delete next[c.key]; else next[c.key] = Number(v) as Level; return next; }),
      nota: { value: notes[c.key] ?? "", onChange: (v: string) => setNotes((prev) => ({ ...prev, [c.key]: v })), placeholder: "Sustento de la calificación: qué resultado, qué indicador, qué capacidad falta…" },
    })),
    { kind: "libre", id: "fin", node: fin },
  ];

  return (
    <ModoFocal kicker={titulo ?? "Priorización · evaluación con criterios"} title={progreso ? `Iniciativa ${progreso.hechas + 1} de ${progreso.total} · ${ini.name}` : ini.name} color="var(--cyan-deep)"
      progress={{ n: respondidos, total, label: "criterios" }} status={saving ? "Guardando…" : saved ? "Registrada" : undefined}
      onExit={onExit} exitLabel="Volver"
      extra={onSaltar ? <button type="button" onClick={onSaltar} className="btn-ghost btn-sm" title="Dejar esta iniciativa para después y pasar a la siguiente"><SkipForward size={13} /> <span className="hidden sm:inline">Saltar por ahora</span></button> : <span className="chip hidden sm:inline-flex"><Scale size={11} /> {total} criterios</span>}>
      <UnaAUna key={ini.id} pantallas={pantallas} color="var(--cyan-deep)" etiqueta="criterios" inicio={initial ? 0 : undefined} />
    </ModoFocal>
  );
}
