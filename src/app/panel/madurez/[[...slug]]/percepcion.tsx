"use client";

// Madurez digital · diagnóstico de percepción. Lo primero que ve un directivo o un líder al entrar
// al módulo: la invitación a iniciar el diagnóstico y, al aceptarla, el cuestionario en modo focal,
// una afirmación por pantalla. Cada respuesta se guarda al elegirla y el cuestionario se puede
// pausar y retomar. El advisor lo recorre en vista previa, sin guardar.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, ClipboardCheck, Eye, Play, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui";
import { ModoFocal, pedirPantallaCompleta } from "@/components/modo-focal";
import { PERCEPTION_SCALE, type MadInstrument, type MadVariable } from "@/lib/madurez";

export type Mia = { answers: Record<string, number>; done: string | null };
type Guardar = (id: string, value: number | null) => Promise<boolean>;

const f1 = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const afirmacion = (v: MadVariable) => v.items.find((i) => i.type === "likert")?.text ?? v.name;
const duracion = (n: number) => { const m = Math.round((n * 12) / 60); return m <= 1 ? "Menos de dos minutos" : `Unos ${m} minutos`; };

/** Promedio propio por línea, sin contar «No lo sé». */
function porLinea(ins: MadInstrument, answers: Record<string, number>) {
  return ins.lines.map((l) => {
    const vs = ins.variables.filter((v) => v.line === l.n), xs = vs.map((v) => answers[v.id]).filter((a) => typeof a === "number" && a >= 1);
    return { line: l, total: vs.length, respondidas: vs.filter((v) => answers[v.id] !== undefined).length, media: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null };
  });
}

function MiLectura({ ins, answers }: { ins: MadInstrument; answers: Record<string, number> }) {
  return (
    <div className="space-y-3">
      {porLinea(ins, answers).map(({ line, media }) => (
        <div key={line.n}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]"><span className="font-semibold text-ink">{line.name}</span><span className="num font-bold text-ink">{media === null ? "—" : `${f1(media)} de 5`}</span></div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${media === null ? 0 : ((media - 1) / 4) * 100}%`, background: line.color }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Entrada: «Iniciar diagnóstico» ═══ */
export function PercepcionInicio({ ins, mia, hayCorte, soloVer, onStart }: { ins: MadInstrument; mia: Mia; hayCorte: boolean; soloVer: boolean; onStart: () => void }) {
  const total = ins.variables.length, hechas = ins.variables.filter((v) => mia.answers[v.id] !== undefined).length;
  const estado: "nuevo" | "curso" | "listo" = hechas === 0 ? "nuevo" : hechas < total ? "curso" : "listo";
  const lineas = porLinea(ins, mia.answers);
  const PASOS = [
    { t: "Percepción", d: "Tú y las demás personas de la empresa responden cómo ven hoy cada práctica.", on: true },
    { t: "Evidencia", d: "El advisor contrasta esa percepción con documentos, uso real e indicadores." },
    { t: "Resultados", d: "Nivel de madurez, brechas entre lo que se cree y lo que se demuestra, y prioridades." },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="rise overflow-hidden">
        <div className="bg-navy px-6 py-7 text-white sm:px-8 sm:py-9">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-fill)]">Paso 1 de 3 · Percepción</div>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[32px]">
            {soloVer ? "Diagnóstico de percepción" : estado === "nuevo" ? "Iniciar diagnóstico" : estado === "curso" ? "Continúa tu diagnóstico" : "Diagnóstico completado"}
          </h2>
          <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-white/80">
            {soloVer
              ? <>Así lo ven las personas de la empresa: {total} afirmaciones, una por pantalla. Aquí lo recorres en vista previa; tus respuestas no se guardan.</>
              : estado === "listo"
                ? <>Respondiste las {total} afirmaciones. Tu percepción ya cuenta en la medición de la empresa; puedes revisarla y ajustarla cuando quieras.</>
                : <>Son {total} afirmaciones sobre cómo trabaja hoy la empresa en lo digital. Una por pantalla: lees, eliges qué tan de acuerdo estás y pasas a la siguiente.</>}
          </p>
          {estado === "curso" && !soloVer && (
            <div className="mt-5 max-w-[420px]">
              <div className="flex justify-between text-[12.5px] text-white/75"><span>Llevas {hechas} de {total}</span><span className="num">{Math.round((hechas / total) * 100)} %</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[var(--gold-fill)]" style={{ width: `${(hechas / total) * 100}%` }} /></div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => { pedirPantallaCompleta(); onStart(); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold-fill)] px-5 py-3 text-[15px] font-extrabold text-[#0D1B2A] shadow-[0_8px_24px_-10px_rgb(241_186_91/0.8)] transition-transform hover:-translate-y-0.5">
              {soloVer ? <><Eye size={17} /> Ver el cuestionario</> : estado === "nuevo" ? <><Play size={17} /> Iniciar diagnóstico</> : estado === "curso" ? <><ArrowRight size={17} /> Continuar donde quedé</> : <><RotateCcw size={16} /> Revisar mis respuestas</>}
            </button>
            {estado !== "listo" && <span className="text-[12.5px] text-white/65">{duracion(total - (soloVer ? 0 : hechas))} · se guarda sola · puedes pausar</span>}
          </div>
        </div>
        <div className="grid gap-x-6 gap-y-3 px-6 py-5 sm:grid-cols-2 sm:px-8">
          {lineas.map(({ line, total: t, respondidas }, i) => (
            <div key={line.n} className="flex items-center gap-3">
              <span className="num grid h-8 w-8 flex-none place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: line.color }}>{!soloVer && respondidas === t ? <Check size={15} /> : i + 1}</span>
              <span className="min-w-0"><span className="block text-[13.5px] font-semibold leading-snug text-ink">{line.name}</span>
                <span className="block text-[12px] text-muted">{soloVer || respondidas === 0 ? `${t} afirmaciones` : `${respondidas} de ${t} respondidas`}</span></span>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-5">
        {estado === "listo" && !soloVer && (
          <Card className="rise rise-1 p-5">
            <div className="label">Tu lectura por línea</div>
            <p className="mb-4 mt-1 text-[12.5px] text-muted">Promedio de tus respuestas, de 1 a 5. Es tu percepción, no el nivel de madurez de la empresa.</p>
            <MiLectura ins={ins} answers={mia.answers} />
          </Card>
        )}
        <Card className="rise rise-1 p-5">
          <div className="label">Cómo se arma el diagnóstico</div>
          <ol className="mt-3 space-y-3.5">
            {PASOS.map((p, i) => (
              <li key={p.t} className="flex gap-3">
                <span className={`num grid h-7 w-7 flex-none place-items-center rounded-full text-[12px] font-bold ${p.on ? "bg-[var(--gold-fill)] text-[#0D1B2A]" : "bg-surface-3 text-muted"}`}>{i + 1}</span>
                <span><span className="block text-[13.5px] font-semibold text-ink">{p.t}</span><span className="block text-[12.5px] leading-snug text-muted">{p.d}</span></span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-snug text-muted">
            {hayCorte ? "Ya hay una medición publicada: la encuentras en Resumen." : "Los resultados aparecen en Resumen cuando el advisor publique la medición."} Tus respuestas se muestran promediadas con las de las demás personas.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ═══ Cuestionario: una afirmación por pantalla ═══ */
export function Cuestionario({ ins, inicial, soloVer, guardar, onExit }: { ins: MadInstrument; inicial: Record<string, number>; soloVer: boolean; guardar: Guardar; onExit: () => void }) {
  const vars = ins.variables, total = vars.length;
  const [answers, setAnswers] = useState<Record<string, number>>(inicial);
  const [i, setI] = useState(() => { const k = vars.findIndex((v) => inicial[v.id] === undefined); return k < 0 ? 0 : k; });   // total = pantalla de cierre
  const [enCurso, setEnCurso] = useState(0), [fallo, setFallo] = useState<string | null>(null), [hora, setHora] = useState<string | null>(null);
  const salto = useRef<number | null>(null);
  useEffect(() => () => { if (salto.current) window.clearTimeout(salto.current); }, []);

  const hechas = useMemo(() => vars.filter((v) => answers[v.id] !== undefined).length, [vars, answers]);
  const ir = useCallback((k: number) => { if (salto.current) { window.clearTimeout(salto.current); salto.current = null; } setI(Math.max(0, Math.min(total, k))); }, [total]);

  const responder = useCallback((v: MadVariable, valor: number) => {
    setAnswers((a) => ({ ...a, [v.id]: valor }));
    if (!soloVer) {
      setEnCurso((n) => n + 1);
      void guardar(v.id, valor).then((ok) => {
        setEnCurso((n) => n - 1);
        if (ok) { setFallo(null); setHora(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })); }
        else setFallo(`No se guardó la respuesta de «${v.name}». Vuelve a esa afirmación y elige de nuevo.`);
      });
    }
    // deja ver la elección un instante y pasa a la siguiente
    if (salto.current) window.clearTimeout(salto.current);
    const desde = vars.indexOf(v);
    salto.current = window.setTimeout(() => { salto.current = null; setI((k) => (k === desde ? Math.min(total, desde + 1) : k)); }, 320);
  }, [guardar, soloVer, total, vars]);

  const v = i < total ? vars[i] : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); ir(i - 1); return; }
      if (e.key === "ArrowRight") { if (!v || answers[v.id] !== undefined) { e.preventDefault(); if (i < total) ir(i + 1); } return; }
      if (!v) return;
      const n = Number(e.key);
      if (e.key.length === 1 && Number.isInteger(n) && n >= 0 && n <= 5) { e.preventDefault(); responder(v, n); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answers, i, ir, responder, total, v]);

  const linea = v ? ins.lines.find((l) => l.n === v.line)! : ins.lines[ins.lines.length - 1];
  const bloque = ins.lines.indexOf(linea) + 1;
  const dim = v ? ins.dimensions.find((d) => d.key === v.dimension)?.name : null;
  const valor = v ? answers[v.id] : undefined;
  const pendientes = total - hechas;
  const primeraPendiente = vars.findIndex((x) => answers[x.id] === undefined);

  return (
    <ModoFocal
      kicker={v ? `Bloque ${bloque} de ${ins.lines.length} · ${linea.short}` : "Madurez digital"}
      title={soloVer ? "Vista previa del diagnóstico" : "Diagnóstico de percepción"}
      color={linea.color}
      progress={{ n: hechas, total, label: "respondidas" }}
      status={soloVer ? "Vista previa · no se guarda" : enCurso > 0 ? "Guardando…" : hora ? `Guardado ${hora}` : undefined}
      alerta={fallo}
      onExit={onExit}
      exitLabel={soloVer ? "Cerrar" : "Guardar y salir"}
      footer={v ? (
        <>
          <button type="button" onClick={() => ir(i - 1)} disabled={i === 0} className="btn-ghost disabled:opacity-40"><ArrowLeft size={15} /> Anterior</button>
          <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
            {ins.lines.map((l) => { const vs = vars.filter((x) => x.line === l.n), n = vs.filter((x) => answers[x.id] !== undefined).length; return (
              <span key={l.n} className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-3" title={`${l.name}: ${n} de ${vs.length}`}><span className="block h-full rounded-full" style={{ width: `${(n / vs.length) * 100}%`, background: l.color }} /></span>
            ); })}
          </div>
          <button type="button" onClick={() => ir(i + 1)} disabled={valor === undefined} className="btn-primary disabled:opacity-40">{i === total - 1 ? "Terminar" : "Siguiente"} <ArrowRight size={15} /></button>
        </>
      ) : undefined}
    >
      {v ? (
        <section key={v.id} className="rise mx-auto max-w-[720px] pt-2 sm:pt-8 lg:pt-[7vh]" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="num rounded-full bg-surface px-2.5 py-1 font-bold text-ink shadow-[var(--e1)]">{i + 1} de {total}</span>
            {dim && <span className="chip">{dim}</span>}
            <span className="font-semibold text-muted">{v.name}</span>
          </div>
          <h2 className="mt-5 text-[22px] font-extrabold leading-[1.25] tracking-[-0.018em] text-ink sm:text-[29px]">{afirmacion(v)}</h2>
          <p className="mt-5 text-[13.5px] font-semibold text-muted">¿Qué tan de acuerdo estás?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Qué tan de acuerdo estás">
            {PERCEPTION_SCALE.map((t, k) => { const n = k + 1, on = valor === n; return (
              <button key={n} type="button" role="radio" aria-checked={on} onClick={() => responder(v, n)}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all sm:flex-col sm:items-start sm:gap-2.5 sm:px-3.5 sm:py-4 ${on ? "bg-navy text-white shadow-[var(--e2)]" : "bg-surface text-ink-soft shadow-[var(--e1)] hover:-translate-y-0.5 hover:shadow-[var(--e2)]"}`}>
                <span className={`num grid h-9 w-9 flex-none place-items-center rounded-full text-[15px] font-extrabold ${on ? "bg-[var(--gold-fill)] text-[#0D1B2A]" : "bg-surface-2 text-ink group-hover:bg-[var(--gold-wash)]"}`}>{on ? <Check size={17} /> : n}</span>
                <span className="text-[13.5px] font-semibold leading-snug">{t}</span>
              </button>
            ); })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => responder(v, 0)} aria-pressed={valor === 0}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${valor === 0 ? "bg-navy text-white" : "text-muted hover:bg-surface hover:text-ink"}`}>
              <CircleHelp size={15} /> No lo sé
            </button>
            <span className="hidden text-[12px] text-faint lg:block">Teclas 1 a 5 para responder · 0 para «No lo sé» · ← → para moverte</span>
          </div>
        </section>
      ) : (
        <section className="rise mx-auto max-w-[620px] pt-4 sm:pt-10">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--gold-fill)] text-[#0D1B2A]"><ClipboardCheck size={26} /></span>
          <h2 className="mt-5 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">{pendientes === 0 ? (soloVer ? "Fin del cuestionario" : "Listo. Gracias por tu diagnóstico.") : `Te faltan ${pendientes} afirmaciones`}</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
            {pendientes > 0
              ? "Puedes responderlas ahora o salir y retomar después: lo que ya respondiste quedó guardado."
              : soloVer ? "Así termina para quien responde. En la vista previa no se guardó ninguna respuesta."
                : "Tu percepción quedó guardada y ya cuenta en la medición de la empresa. El paso siguiente es del advisor: contrastarla con la evidencia."}
          </p>
          {hechas > 0 && (
            <Card className="mt-6 p-5">
              <div className="label">Tu lectura por línea</div>
              <p className="mb-4 mt-1 text-[12.5px] text-muted">Promedio de tus respuestas, de 1 a 5. Es tu percepción, no el nivel de madurez de la empresa.</p>
              <MiLectura ins={ins} answers={answers} />
            </Card>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {pendientes > 0 && <button type="button" onClick={() => ir(primeraPendiente)} className="btn-primary">Responder las que faltan <ArrowRight size={15} /></button>}
            <button type="button" onClick={onExit} className={pendientes > 0 ? "btn-ghost" : "btn-primary"}>Volver al módulo</button>
            <button type="button" onClick={() => ir(0)} className="btn-ghost"><RotateCcw size={14} /> Revisar desde el inicio</button>
          </div>
        </section>
      )}
    </ModoFocal>
  );
}
