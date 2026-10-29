"use client";

// Modo focal para responder un instrumento (test, autoevaluación, encuesta): una capa a pantalla
// completa que tapa el shell, con barra de avance y estado de guardado siempre visibles, pantalla
// completa del navegador opcional, Esc para salir, teclas 1 a 5 para responder la afirmación
// enfocada y avance automático a la siguiente pendiente. Las reglas de cada cuestionario siguen
// en su componente: aquí solo vive el marco.

import { useCallback, useEffect, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Maximize2, Minimize2, Keyboard } from "lucide-react";

/** Pide la pantalla completa del navegador: solo funciona dentro de un gesto del usuario (clic). */
export function pedirPantallaCompleta() {
  if (typeof document === "undefined" || document.fullscreenElement) return;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const fn = el.requestFullscreen ?? el.webkitRequestFullscreen;
  try { void fn?.call(el)?.catch?.(() => undefined); } catch { /* el navegador no lo permite: se sigue sin pantalla completa */ }
}
export function salirPantallaCompleta() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  try { void document.exitFullscreen().catch(() => undefined); } catch { /* nada */ }
}

/** Tecla 1 a 5 sobre una tarjeta: responde la afirmación enfocada. */
export function teclaNumero(e: KeyboardEvent<HTMLElement>, max: number, set: (n: number) => void) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= max) { e.preventDefault(); set(n); }
}

/** Tras responder la afirmación `code`, lleva el foco y la vista a la siguiente pendiente
    (las tarjetas llevan data-item y data-pendiente). Si no hay más, no hace nada. */
export function irAlSiguientePendiente(code: string) {
  window.setTimeout(() => {
    const cards = [...document.querySelectorAll<HTMLElement>("[data-item]")];
    const i = cards.findIndex((c) => c.dataset.item === code);
    const next = cards.slice(i + 1).find((c) => c.dataset.pendiente === "1") ?? cards.slice(0, Math.max(0, i)).find((c) => c.dataset.pendiente === "1");
    if (!next) return;
    next.scrollIntoView({ behavior: "smooth", block: "center" });
    next.focus({ preventScroll: true });
  }, 80);
}

/** Clases comunes de una tarjeta de afirmación en modo focal (foco visible al navegar con teclado). */
export const ITEM_CLS = "focal-item mb-2 rounded-2xl outline-none";

/** Lleva el contenido del modo focal al inicio (el scroll vive en la capa, no en la ventana). */
export function focalArriba() { document.querySelector(".focal-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }

type Props = {
  kicker: string;
  title: string;
  color?: string;                     // acento de la barra (capacidad o marca)
  progress: { n: number; total: number; label?: string };
  status?: ReactNode;                 // «Guardado 10:32», «Guardando…»
  extra?: ReactNode;                  // chips a la derecha (p. ej. «Anónima»)
  onExit?: () => void;                // sin salida: encuesta pública
  exitLabel?: string;
  marca?: boolean;                    // logotipo en lugar del botón de salir
  footer?: ReactNode;                 // acciones fijas abajo (Anterior / Siguiente / Guardar)
  children: ReactNode;
};

export function ModoFocal({ kicker, title, color, progress, status, extra, onExit, exitLabel = "Salir", marca, footer, children }: Props) {
  // el portal solo existe en el cliente: en el servidor no se renderiza nada
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.focal = "1";
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    onFs();
    document.addEventListener("fullscreenchange", onFs);
    return () => { document.body.style.overflow = prev; delete document.documentElement.dataset.focal; document.removeEventListener("fullscreenchange", onFs); salirPantallaCompleta(); };
  }, []);
  const exit = useCallback(() => { salirPantallaCompleta(); onExit?.(); }, [onExit]);
  useEffect(() => {
    if (!onExit) return;
    // en pantalla completa, Esc la cierra (lo hace el navegador); fuera de ella, Esc sale del modo focal
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) { const t = e.target as HTMLElement | null; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; exit(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, exit]);
  const pct = progress.total ? Math.round((progress.n / progress.total) * 100) : 0;
  const soportaFull = typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);
  if (!mounted) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="focal fixed inset-0 z-[70] flex flex-col overflow-hidden bg-bg text-ink">
      <header className="relative z-10 shrink-0 border-b border-line/70 bg-surface/90 backdrop-blur-xl">
        <div aria-hidden className="h-[3px] w-full bg-surface-2"><div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color ?? "var(--gold)" }} /></div>
        <div className="mx-auto flex h-[56px] max-w-[1080px] items-center gap-3 px-4 sm:px-6">
          {marca ? (
            // eslint-disable-next-line @next/next/no-img-element
            <><img src="/ge-logo-negro.png" alt="Gestión estratégica" className="focal-logo-claro h-6 shrink-0 object-contain" /><img src="/ge-logo-blanco.png" alt="" aria-hidden className="focal-logo-oscuro hidden h-6 shrink-0 object-contain" /></>
          ) : onExit ? (
            <button type="button" onClick={exit} className="btn-ghost btn-sm shrink-0" title="Guarda lo respondido y vuelve (Esc)"><ArrowLeft size={14} /> <span className="hidden sm:inline">{exitLabel}</span></button>
          ) : null}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: color ?? "var(--gold-text)" }}>{kicker}</div>
            <div className="truncate text-[14px] font-extrabold text-ink">{title}</div>
          </div>
          <div className="hidden items-center gap-1.5 text-[11.5px] text-faint lg:flex" title="Atajos de teclado"><Keyboard size={13} /> 1–5 responde · Esc sale</div>
          {status && <span className="hidden text-[12px] text-faint sm:inline">{status}</span>}
          {extra}
          <span className="num shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-ink" aria-live="polite">{progress.n} <span className="font-medium text-muted">de {progress.total}</span>{progress.label ? <span className="hidden font-medium text-muted sm:inline"> · {progress.label}</span> : null}</span>
          {soportaFull && (
            <button type="button" onClick={() => (full ? salirPantallaCompleta() : pedirPantallaCompleta())} className="btn-ghost btn-sm shrink-0 !px-2.5" title={full ? "Salir de pantalla completa" : "Pantalla completa"} aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"}>
              {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </header>
      <div className="focal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <main className="mx-auto w-full max-w-[860px] px-4 pb-32 pt-6 sm:px-6 sm:pt-8">{children}</main>
      </div>
      {footer && (
        <footer className="shrink-0 border-t border-line/70 bg-surface/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">{footer}</div>
        </footer>
      )}
    </div>,
    document.body,
  );
}
