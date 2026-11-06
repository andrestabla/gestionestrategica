"use client";

// Revisión de capacidades para ejecutar una iniciativa, en modo focal y un paso por afirmación (la misma experiencia
// de la calificación de iniciativas): introducción con la ficha de la iniciativa y el checklist en vigor (genérico o
// personalizado por la IA), una pantalla por afirmación con la pregunta guía y la descripción de los tres niveles,
// un campo «qué haría falta» por frente, y al final el resumen con el semáforo y el botón de registrar.

import { useState, type ReactNode } from "react";
import { ModoFocal } from "@/components/modo-focal";
import { UnaAUna, type Pantalla } from "@/components/una-a-una";
import { FRENTES, NIVEL_CAP, SEMAFORO, lecturaCapacidades, faltaPorDescribir, itemsDe, type Frente, type FrenteKey, type NivelCap, type RevisionCapacidades, type PropuestaCapacidades } from "@/lib/capacidades";
import { Loader2, Save, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export type RevisionBorrador = { respuestas: Record<string, NivelCap>; falta: Partial<Record<FrenteKey, string>> };
export const SEMAFORO_CLS = { lista: "chip chip-ok", ajustes: "chip chip-warn", brechas: "chip chip-bad" } as const;

export function RevisionCapacidadesFocal({ ini, frentes, personalizado, initial, saving, error, onSave, onExit, proponer }: {
  ini: { id: string; name: string; objetivo?: string; detalle?: ReactNode };
  frentes: Frente[]; personalizado?: { by: string; at: string; resumen: string } | null;
  initial?: RevisionCapacidades | null; saving: boolean; error?: string | null;
  onSave: (r: RevisionBorrador) => Promise<boolean>; onExit: () => void;
  proponer?: () => Promise<PropuestaCapacidades | null>;   // lectura inicial con IA (quien revisa)
}) {
  const [respuestas, setRespuestas] = useState<Record<string, NivelCap>>(initial?.respuestas ?? {});
  const [falta, setFalta] = useState<Partial<Record<FrenteKey, string>>>(initial?.falta ?? {});
  const [justif, setJustif] = useState<Record<string, string>>({});
  const [resumenIA, setResumenIA] = useState("");
  const [pidiendo, setPidiendo] = useState(false);
  const [saved, setSaved] = useState(false);
  const items = itemsDe(frentes);
  const lect = lecturaCapacidades({ respuestas, falta }, frentes);
  const sinTexto = faltaPorDescribir({ respuestas, falta }, frentes);
  const puedeRegistrar = lect.completa && sinTexto.length === 0;

  const registrar = async () => { setSaved(false); if (await onSave({ respuestas, falta })) setSaved(true); };
  const pedirLectura = async () => {
    if (!proponer) return;
    setPidiendo(true);
    try {
      const p = await proponer();
      if (p) { setRespuestas(p.respuestas); setFalta((prev) => ({ ...p.falta, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v)) })); setJustif(p.justificacion); setResumenIA(p.resumen); }
    } finally { setPidiendo(false); }
  };

  const intro = (
    <div className="panel px-6 py-6 sm:px-8">
      <div className="num text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">{ini.id} · capacidades para ejecutar</div>
      <h2 className="mt-1 text-[20px] font-extrabold leading-snug text-ink sm:text-[22px]">{ini.name}</h2>
      {ini.objetivo && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{ini.objetivo}</p>}
      {ini.detalle && <div className="mt-2 text-[12.5px] text-muted">{ini.detalle}</div>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-snug text-ink-soft"><b className="text-ink">Cinco frentes · {items.length} afirmaciones.</b> {frentes.map((f) => `${f.name} (${f.items.length})`).join(" · ")}. Cada afirmación se califica en tres niveles: 1 no existe, 2 parcial, 3 instalada. Elige el nivel que describe la realidad de hoy, no la intención.</div>
        <div className="rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-snug text-ink-soft"><b className="text-ink">{personalizado ? "Checklist personalizado." : "Checklist genérico."}</b> {personalizado ? `${personalizado.resumen || "Afirmaciones, preguntas y niveles adaptados a esta iniciativa."} Personalizado por ${personalizado.by} el ${personalizado.at.slice(0, 10)}.` : "El advisor o el administrador puede personalizarlo con IA para esta iniciativa desde el listado."}</div>
      </div>
      {proponer && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void pedirLectura()} disabled={pidiendo} className="btn-ghost btn-sm inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{pidiendo ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Lectura inicial con IA</button>
          <span className="text-[12px] text-muted">{resumenIA ? resumenIA : "Propone un nivel por afirmación con lo que la plataforma sabe de la empresa; tú confirmas o corriges en cada paso."}</span>
        </div>
      )}
      <p className="mt-4 text-[12.5px] text-muted">Una afirmación por pantalla: lee la pregunta guía y los tres niveles, elige y pasa con «Siguiente», Enter o →. En cada frente no instalado escribe qué haría falta.</p>
    </div>
  );

  const fin = (
    <div className="panel px-6 py-7 sm:px-8">
      <div className="text-center text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-deep">Resumen de la revisión</div>
      <div className="mt-1 text-center text-[18px] font-extrabold text-ink">{ini.name}</div>
      <div className="mx-auto mt-4 grid max-w-[640px] gap-2">
        {lect.frentes.map((f) => (
          <div key={f.key} className="rounded-xl bg-surface-2/70 px-3 py-2.5 text-[12.5px]">
            <div className="flex items-center justify-between gap-2"><span className="font-bold text-ink">{f.name}</span><b className={`num ${f.nivel === 3 ? "text-ok" : f.nivel === 2 ? "text-warn" : f.nivel === 1 ? "text-bad" : "text-faint"}`}>{f.nivel ? `${f.nivel} · ${NIVEL_CAP[f.nivel]}` : "sin calificar"}</b></div>
            {f.faltantes.length > 0 && <div className="mt-0.5 text-[12px] text-muted">Con brecha: {f.faltantes.join(", ")}</div>}
            {f.nivel !== null && f.nivel < 3 && (
              <textarea value={falta[f.key] ?? ""} onChange={(e) => setFalta({ ...falta, [f.key]: e.target.value })} rows={2} maxLength={600}
                placeholder="Qué haría falta para instalarlo: qué, quién, cuándo…" className={`input mt-1.5 !py-1.5 text-[12px] ${!falta[f.key]?.trim() ? "ring-1 ring-warn/50" : ""}`} />
            )}
          </div>
        ))}
      </div>
      {lect.semaforo
        ? <div className="mt-5 text-center"><span className={`${SEMAFORO_CLS[lect.semaforo]} !text-[13px]`}><ShieldCheck size={13} /> {SEMAFORO[lect.semaforo].label}</span><p className="mt-1.5 text-[12.5px] text-muted">{SEMAFORO[lect.semaforo].desc}</p></div>
        : <p className="mt-5 text-center text-[13px] text-muted">Faltan {lect.total - lect.respondidas} afirmaciones. Usa el mapa de puntos para volver a las pendientes.</p>}
      {sinTexto.length > 0 && lect.completa && <p className="mt-2 text-center text-[12.5px] text-warn">Describe qué haría falta en: {sinTexto.map((k) => FRENTES.find((f) => f.key === k)!.name.toLowerCase()).join(", ")}.</p>}
      {error && <p className="mx-auto mt-3 max-w-[52ch] rounded-lg px-3 py-2 text-center text-[12.5px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--surface))" }}>{error}</p>}
      <div className="mt-5 text-center">
        <button type="button" disabled={!puedeRegistrar || saving} onClick={() => void registrar()} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />} {initial ? "Actualizar revisión" : "Registrar revisión"}
        </button>
      </div>
    </div>
  );

  const pantallas: Pantalla[] = [
    { kind: "libre", id: "intro", node: intro },
    ...frentes.flatMap((f, fi) => f.items.map((it, ii) => ({
      kind: "item" as const, id: it.code, grupo: `Frente ${fi + 1} de ${frentes.length} · ${f.name} · afirmación ${ii + 1} de ${f.items.length}`, grupoDesc: f.que,
      code: it.code, texto: it.texto, pregunta: it.pregunta, variante: "tarjetas" as const,
      niveles: ([1, 2, 3] as NivelCap[]).map((n) => ({ n, name: NIVEL_CAP[n], desc: it.niveles[n] })),
      value: respuestas[it.code],
      onSet: (v: number | string | undefined) => setRespuestas((prev) => { const next = { ...prev }; if (v === undefined) delete next[it.code]; else next[it.code] = Number(v) as NivelCap; return next; }),
      nota: ii === f.items.length - 1
        ? { value: falta[f.key] ?? "", onChange: (v: string) => setFalta((prev) => ({ ...prev, [f.key]: v })), etiqueta: `Qué haría falta en ${f.name.toLowerCase()} (obligatorio si el frente no está instalado)`, placeholder: "Qué, quién, cuándo: p. ej. «integrar el CRM con la plataforma de contenido; TI; mar-2027»" }
        : justif[it.code] ? { value: justif[it.code], onChange: (v: string) => setJustif((prev) => ({ ...prev, [it.code]: v })), etiqueta: "Lectura inicial de la IA (edítala o bórrala)" } : undefined,
    }))),
    { kind: "libre", id: "fin", node: fin },
  ];

  return (
    <ModoFocal kicker="Capacidades para ejecutar · checklist de cinco frentes" title={ini.name} color="var(--cyan-deep)"
      progress={{ n: lect.respondidas, total: lect.total, label: "afirmaciones" }} status={saving ? "Guardando…" : saved ? "Registrada" : undefined}
      onExit={onExit} exitLabel="Volver"
      extra={<span className="chip hidden sm:inline-flex"><ShieldCheck size={11} /> {personalizado ? "checklist personalizado" : "checklist genérico"}</span>}>
      <UnaAUna key={ini.id} pantallas={pantallas} color="var(--cyan-deep)" etiqueta="afirmaciones" inicio={initial ? 0 : undefined} />
    </ModoFocal>
  );
}
