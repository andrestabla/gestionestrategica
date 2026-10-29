"use client";

// Cuestionario «una afirmación a la vez»: una sola pregunta grande por pantalla, la guía de cada nivel
// visible al pasar por los números (antes de elegir) y, tras elegir, la confirmación del nivel en la
// misma área de altura fija: nada salta. Avanza solo a la siguiente pendiente (en pantallas con
// cursor), navegación con flechas, Enter y teclas 1–5, y un mapa de puntos para saltar entre
// afirmaciones. Las pantallas «libres» (introducción, pregunta abierta, cierre) las trae cada formulario.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Rows3, LayoutList, Check } from "lucide-react";

export type Guia = { n?: Record<string, string>; q?: string; ni?: string };
export type Nivel = { n: number; name: string; desc?: string };
export type PantallaItem = {
  kind: "item"; id: string;
  grupo: string; grupoDesc?: string;          // dimensión o bloque al que pertenece
  code: string; texto: string; demo?: string;  // código visible, afirmación y «lo demuestra» (test)
  niveles: Nivel[]; guia?: Guia;
  value: number | string | undefined; onSet: (v: number | string | undefined) => void;
  ni?: boolean;                                // admite «Sin información»
  pregunta?: string;                           // pregunta guía bajo la afirmación (criterios de evaluación)
  variante?: "numeros" | "tarjetas";           // tarjetas: opciones con nombre y descripción visibles (sin número grande)
  nota?: { value: string; onChange: (v: string) => void; placeholder?: string; etiqueta?: string };   // sustento opcional
};
export type PantallaLibre = { kind: "libre"; id: string; node: ReactNode };
export type Pantalla = PantallaItem | PantallaLibre;

export type Vista = "una" | "lista";
const VISTA_KEY = "ge-cuestionario-vista";
/** Preferencia de vista del cuestionario (una a una por defecto), recordada en este navegador. */
export function useVista(): [Vista, (v: Vista) => void] {
  // solo se usa dentro del modo focal (que no se renderiza en el servidor): leer el almacenamiento al inicio es seguro
  const [vista, setVistaState] = useState<Vista>(() => { try { const v = typeof window !== "undefined" ? localStorage.getItem(VISTA_KEY) : null; return v === "lista" ? "lista" : "una"; } catch { return "una"; } });
  const setVista = (v: Vista) => { setVistaState(v); try { localStorage.setItem(VISTA_KEY, v); } catch { /* nada */ } };
  return [vista, setVista];
}

export function SelectorVista({ vista, onChange }: { vista: Vista; onChange: (v: Vista) => void }) {
  return (
    <div role="radiogroup" aria-label="Forma de responder" className="inline-flex rounded-xl bg-surface-2 p-1 text-[12px] font-bold">
      <button type="button" role="radio" aria-checked={vista === "una"} onClick={() => onChange("una")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${vista === "una" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}><Rows3 size={13} /> Una a una</button>
      <button type="button" role="radio" aria-checked={vista === "lista"} onClick={() => onChange("lista")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${vista === "lista" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}><LayoutList size={13} /> En lista</button>
    </div>
  );
}

const respondida = (p: Pantalla) => p.kind === "item" && p.value !== undefined && p.value !== "";

export function UnaAUna({ pantallas, color = "var(--navy)", etiqueta = "afirmación", inicio }: { pantallas: Pantalla[]; color?: string; etiqueta?: string; inicio?: number }) {
  const items = pantallas.filter((p): p is PantallaItem => p.kind === "item");
  // arranque: donde pida el formulario; si no, en la introducción cuando no hay nada respondido o en la primera pendiente
  const [i, setI] = useState(() => { if (inicio != null) return inicio; const algo = pantallas.some(respondida); const pend = pantallas.findIndex((p) => p.kind === "item" && !respondida(p)); return algo ? (pend >= 0 ? pend : pantallas.length - 1) : 0; });
  const [hover, setHover] = useState<number | null>(null);
  const [tocado, setTocado] = useState(false);       // ya eligió en esta pantalla: mostrar confirmación
  const siguienteRef = useRef<HTMLButtonElement | null>(null);
  const puedeHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
  const p = pantallas[Math.min(i, pantallas.length - 1)];
  const ir = (n: number) => { setHover(null); setTocado(false); setI(Math.max(0, Math.min(pantallas.length - 1, n))); };
  const siguiente = () => ir(i + 1);
  const anterior = () => ir(i - 1);

  const elegir = (item: PantallaItem, v: number | string) => {
    const quita = item.value === v;
    item.onSet(quita ? undefined : v);
    setTocado(!quita);
    // sin avance automático: la persona lee la confirmación y pasa con «Siguiente» (o Enter / →), que recibe el foco
    if (!quita) window.setTimeout(() => siguienteRef.current?.focus({ preventScroll: true }), 50);
  };

  // teclado: 1–5 responde, ← → navegan, Enter avanza (fuera de campos de texto). Se escucha en fase de captura y
  // se detiene la propagación de las teclas atendidas: la página de fondo (p. ej. ← → entre iniciativas) no debe reaccionar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const atendida = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (e.key === "ArrowRight" || e.key === "Enter") { atendida(); siguiente(); return; }
      if (e.key === "ArrowLeft") { atendida(); anterior(); return; }
      if (p?.kind === "item") { const n = Number(e.key); if (Number.isInteger(n) && n >= 1 && n <= p.niveles.length) { atendida(); elegir(p, n); } }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  if (!p) return null;
  const posItem = p.kind === "item" ? items.indexOf(p) + 1 : null;
  const respondidas = items.filter(respondida).length;

  return (
    <div>
      {/* mapa de la sección: un punto por afirmación; clic para saltar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-[4px]" role="tablist" aria-label="Afirmaciones de esta sección">
          {pantallas.map((q, k) => {
            const on = k === i; const ok = respondida(q);
            return <button key={q.id} type="button" role="tab" aria-selected={on} aria-label={q.kind === "item" ? `${q.code}${ok ? " · respondida" : ""}` : "Pantalla"} onClick={() => ir(k)}
              className={`h-[8px] min-w-[14px] flex-1 rounded-full transition-all ${on ? "ring-2 ring-offset-1 ring-offset-bg" : ""} ${q.kind === "libre" ? "max-w-[14px] opacity-60" : ""}`}
              style={{ background: ok ? color : "var(--surface-2)", ["--tw-ring-color" as string]: color }} />;
          })}
        </div>
        <span className="num shrink-0 text-[12px] font-bold text-muted">{posItem ? `${posItem} de ${items.length}` : `${respondidas} de ${items.length}`}</span>
      </div>

      {p.kind === "libre" ? (
        <div key={p.id} className="rise">{p.node}</div>
      ) : (
        <div key={p.id} className="rise panel overflow-hidden" style={{ borderTop: `3px solid ${color}` }}>
          <div className="px-6 pb-2 pt-5 sm:px-8">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">{p.grupo}</div>
            {p.grupoDesc && <p className="mt-0.5 text-[12px] leading-snug text-muted">{p.grupoDesc}</p>}
          </div>
          <div className="px-6 pb-5 sm:px-8">
            <div className="flex items-start gap-3">
              <span className="num mt-1 shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[12px] font-extrabold text-ink-soft">{p.code}</span>
              <h2 className="text-[18px] font-extrabold leading-snug text-ink sm:text-[20px]">{p.texto}</h2>
            </div>
            {p.demo && <p className="mt-2 pl-[52px] text-[12.5px] text-muted"><b className="uppercase tracking-wider text-cyan-deep">Lo demuestra</b> {p.demo}</p>}
            {p.pregunta && <p className="mt-2 pl-[52px] text-[13px] leading-snug text-ink-soft">{p.pregunta}</p>}
            {p.variante === "tarjetas" ? (
              <div className={`mt-5 grid gap-2 ${p.niveles.length <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
                {p.niveles.map((l) => {
                  const on = p.value === l.n;
                  return (
                    <button key={l.n} type="button" onClick={() => elegir(p, l.n)} aria-pressed={on}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${on ? "border-navy text-white shadow-md" : "border-line bg-surface hover:-translate-y-[1px] hover:border-gold hover:shadow-sm"}`} style={on ? { background: "var(--navy)" } : undefined}>
                      <div className="flex items-baseline gap-2"><span className={`num text-[12px] font-extrabold ${on ? "text-cyan-fill" : "text-cyan-deep"}`}>{l.n}</span><b className="text-[13.5px]">{l.name}</b></div>
                      {l.desc && <p className={`mt-1 text-[12.5px] leading-snug ${on ? "text-white/85" : "text-muted"}`}>{l.desc}</p>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-5 gap-2" onMouseLeave={() => setHover(null)}>
                {p.niveles.map((l) => {
                  const on = p.value === l.n;
                  return (
                    <button key={l.n} type="button" onClick={() => elegir(p, l.n)} onMouseEnter={() => setHover(l.n)} onFocus={() => setHover(l.n)} onBlur={() => setHover(null)}
                      aria-pressed={on} aria-label={`${l.n} · ${l.name}`}
                      className={`rounded-xl border px-1 py-3 text-center transition-all sm:py-4 ${on ? "border-navy text-white shadow-md" : "border-line bg-surface hover:-translate-y-[1px] hover:border-gold hover:shadow-sm"}`} style={on ? { background: "var(--navy)" } : undefined}>
                      <div className="num text-[20px] font-extrabold sm:text-[22px]">{l.n}</div>
                      <div className={`text-[11px] font-semibold sm:text-[12px] ${on ? "text-cyan-fill" : "text-muted"}`}>{l.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* guía: misma área siempre, para que nada salte */}
            <GuiaNivel item={p} hover={hover} tocado={tocado} />
            {p.nota && <Sustento nota={p.nota} />}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {p.ni ? <button type="button" onClick={() => elegir(p, "NI")} className={`chip ${p.value === "NI" ? "chip-warn" : ""}`}>{p.value === "NI" ? <Check size={11} /> : null} Sin información</button> : <span />}
              <span className="text-[11.5px] text-faint">{p.variante === "tarjetas" ? `Teclas 1–${p.niveles.length} eligen · Enter o → sigue` : puedeHover ? "Pasa por los números para ver qué significa cada uno · 1–5 responde · Enter o → sigue" : "Toca un número: verás qué significa y podrás cambiarlo antes de seguir"}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={anterior} disabled={i === 0} className="btn-ghost text-[12.5px] disabled:opacity-40"><ChevronLeft size={14} /> Anterior</button>
        <span className="text-[12px] text-muted">{respondidas} de {items.length} {etiqueta === "afirmación" ? "afirmaciones" : etiqueta} respondidas en esta sección</span>
        <button ref={siguienteRef} type="button" onClick={siguiente} disabled={i >= pantallas.length - 1} className={`${p.kind === "item" && !respondida(p) ? "btn-ghost" : "btn-primary"} inline-flex items-center gap-1 text-[12.5px] disabled:opacity-40`}>{p.kind === "item" && !respondida(p) ? "Omitir por ahora" : "Siguiente"} <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function Sustento({ nota }: { nota: NonNullable<PantallaItem["nota"]> }) {
  const [abierto, setAbierto] = useState(Boolean(nota.value));
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="mt-2 text-[12px] font-bold text-cyan-deep hover:underline">+ {nota.etiqueta ?? "Sustento"}</button>;
  return <textarea value={nota.value} onChange={(e) => nota.onChange(e.target.value)} rows={2} maxLength={600} placeholder={nota.placeholder} aria-label={nota.etiqueta ?? "Sustento"} className="input mt-2 text-[12.5px]" />;
}

function GuiaNivel({ item, hover, tocado }: { item: PantallaItem; hover: number | null; tocado: boolean }) {
  const g = item.guia;
  if (item.variante === "tarjetas") {
    const sel = typeof item.value === "number" ? item.niveles.find((l) => l.n === item.value) : null;
    return (
      <div aria-live="polite" className={`mt-3 min-h-[56px] rounded-xl px-4 py-3 text-[12.5px] leading-relaxed ${sel ? "bg-cyan-wash text-ink-soft" : "bg-surface-2/60 text-muted"}`}>
        {sel ? <p><b className="text-ink">{tocado ? "Elegiste " : ""}{sel.name}.</b> Puedes cambiarlo antes de seguir.</p> : <p>Elige la opción que describa mejor esta iniciativa.</p>}
      </div>
    );
  }
  const n = hover ?? (typeof item.value === "number" ? item.value : null);
  const nivel = n != null ? item.niveles.find((l) => l.n === n) : null;
  const texto = n != null ? g?.n?.[String(n)] : null;
  const confirm = tocado && hover == null && typeof item.value === "number";
  return (
    <div aria-live="polite" className={`mt-3 min-h-[92px] rounded-xl px-4 py-3 text-[12.5px] leading-relaxed transition-colors ${confirm ? "bg-cyan-wash text-ink-soft" : n != null ? "bg-surface-2 text-ink-soft" : "bg-surface-2/60 text-muted"}`}>
      {item.value === "NI" && hover == null ? (
        <p><b className="text-ink">Sin información.</b> {g?.ni ?? "No cuenta como nota baja: queda pendiente de verificar."}</p>
      ) : nivel ? (
        <>
          <p><b className="text-ink">{confirm ? "Elegiste " : ""}{nivel.n} · {nivel.name}.</b> {texto ?? nivel.desc ?? ""}</p>
          {g?.q && <p className="mt-1 italic text-muted">{g.q}</p>}
        </>
      ) : (
        <p>Elige el número que puedas sostener con un ejemplo, un documento o un indicador. {item.niveles.map((l) => `${l.n} ${l.name.toLowerCase()}`).join(" · ")}.</p>
      )}
    </div>
  );
}
