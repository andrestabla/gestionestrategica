"use client";

// Retroalimentación de la plataforma (sistema de diseño MASTER, «Diálogos y avisos»):
//   avisar(mensaje, tono)      → aviso discreto (toast) abajo, 3,5 s, aria-live
//   confirmar(mensaje | opciones) → diálogo de confirmación propio en lugar de window.confirm
// Las dos funciones son imperativas y globales para poder usarse desde cualquier
// manejador sin enhebrar hooks; FeedbackProvider las conecta a la interfaz y debe
// envolver el árbol (lo hace el layout del panel). Sin proveedor montado, confirmar()
// recurre a window.confirm y avisar() no hace nada: nunca bloquea una acción.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { CheckCircle2, AlertTriangle, Info, X, Trash2 } from "lucide-react";

export type ToastTone = "ok" | "warn" | "bad" | "info";
type Toast = { id: number; text: string; tone: ToastTone; action?: { label: string; onClick: () => void } };
export type ConfirmOptions = {
  title?: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;      // acción destructiva: botón rojo e icono de papelera
};

let avisarImpl: ((text: string, tone?: ToastTone, action?: Toast["action"]) => void) | null = null;
let confirmarImpl: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

/** Aviso breve tras una acción («Guardado», «Eliminado»). Tono por defecto: ok. */
export function avisar(text: string, tone: ToastTone = "ok", action?: Toast["action"]) {
  avisarImpl?.(text, tone, action);
}

/** Deriva título, etiqueta del botón y peligrosidad de un mensaje de confirmación en español. */
function fromMessage(message: string): ConfirmOptions {
  const m = message.trim();
  const verb = /^¿\s*(eliminar|archivar|borrar|quitar|desvincular|reiniciar|vaciar|enviar|mover|abrir|cerrar|guardar|reabrir|publicar)/i.exec(m)?.[1];
  const danger = /eliminar|borrar|archivar|vaciar|reiniciar|no se puede deshacer/i.test(m);
  const label = verb ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : "Confirmar";
  // la primera frase va de título; el resto, como cuerpo
  const [first, ...rest] = m.split(/(?<=[.?!])\s+/);
  return { title: first.replace(/^¿|\?$/g, "").trim() ? first : "¿Confirmas?", body: rest.join(" ") || undefined, confirmLabel: label, danger };
}

/** Diálogo de confirmación. Acepta el mismo texto que antes recibía window.confirm. */
export function confirmar(message: string | ConfirmOptions): Promise<boolean> {
  const opts = typeof message === "string" ? fromMessage(message) : message;
  if (!confirmarImpl) return Promise.resolve(typeof window !== "undefined" ? window.confirm(typeof message === "string" ? message : `${opts.title ?? ""} ${opts.body ?? ""}`.trim()) : false);
  return confirmarImpl(opts);
}

const Ctx = createContext<{ avisar: typeof avisar; confirmar: typeof confirmar } | null>(null);
export const useFeedback = () => useContext(Ctx) ?? { avisar, confirmar };

const TONE = {
  ok: { icon: CheckCircle2, color: "var(--ok-text)" },
  warn: { icon: AlertTriangle, color: "var(--warn-text)" },
  bad: { icon: AlertTriangle, color: "var(--bad-text)" },
  info: { icon: Info, color: "var(--cyan-deep)" },
} as const;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const seq = useRef(0);
  const okRef = useRef<HTMLButtonElement>(null);

  const push = useCallback((text: string, tone: ToastTone = "ok", action?: Toast["action"]) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone, action }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3500);
  }, []);
  const ask = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirm({ ...opts, resolve })), []);

  useEffect(() => {
    avisarImpl = push; confirmarImpl = ask;
    return () => { avisarImpl = null; confirmarImpl = null; };
  }, [push, ask]);
  // el foco va al botón seguro: en una acción destructiva, a «Cancelar» (Enter no borra); en las demás, al botón de acción. Escape cancela (lo maneja Modal)
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirm) window.setTimeout(() => (confirm.danger ? cancelRef : okRef).current?.focus(), 30); }, [confirm]);

  const close = (ok: boolean) => { confirm?.resolve(ok); setConfirm(null); };

  return (
    <Ctx.Provider value={{ avisar: push, confirmar: (m) => ask(typeof m === "string" ? fromMessage(m) : m) }}>
      {children}
      {/* avisos */}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => { const T = TONE[t.tone]; return (
          <div key={t.id} role="status" className="pointer-events-auto flex max-w-[520px] items-center gap-2.5 rounded-xl bg-surface px-4 py-2.5 text-[13px] text-ink shadow-[var(--e2)] ring-1 ring-line">
            <T.icon size={16} style={{ color: T.color }} className="shrink-0" />
            <span className="min-w-0 flex-1">{t.text}</span>
            {t.action && <button type="button" onClick={() => { t.action!.onClick(); setToasts((x) => x.filter((y) => y.id !== t.id)); }} className="btn-ghost btn-sm">{t.action.label}</button>}
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Cerrar aviso" className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink"><X size={14} /></button>
          </div>
        ); })}
      </div>
      {/* confirmación */}
      {confirm && (
        <Modal title={confirm.title ?? "¿Confirmas?"} onClose={() => close(false)}
          footer={<>
            <button ref={cancelRef} type="button" onClick={() => close(false)} className="btn-ghost">{confirm.cancelLabel ?? "Cancelar"}</button>
            <button ref={okRef} type="button" onClick={() => close(true)} className="btn-primary" style={confirm.danger ? { background: "var(--bad-text)" } : undefined}>
              {confirm.danger && <Trash2 size={14} />} {confirm.confirmLabel ?? "Confirmar"}
            </button>
          </>}>
          <div className="text-[13.5px] leading-relaxed text-ink-soft">
            {confirm.body ?? (confirm.danger ? "Esta acción no se puede deshacer." : "Revisa antes de continuar.")}
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}
