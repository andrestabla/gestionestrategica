"use client";

// Primitivas de interfaz v2 — superficies por sombra, números con count-up,
// microcopy sobrio.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";

/* ─── count-up para métricas ─── */

export function useCountUp(target: number, decimals = 0, duration = 900) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setValue(target); return; }
    started.current = true;
    if (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target); return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

function CountUp({ value, decimals = 0, suffix = "" }:
  { value: number; decimals?: number; suffix?: string }) {
  const text = useCountUp(value, decimals);
  return <>{text}{suffix}</>;
}

/* ─── cabecera de página ─── */

export function PageHeader({ kicker, title, desc, actions }:
  { kicker: string; title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <div className="kicker mb-2">{kicker}</div>
        <h1 className="text-[27px] font-extrabold leading-[1.15] tracking-[-0.028em] text-ink">
          {title}
        </h1>
        {desc && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{desc}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── superficies ─── */

export function Card({ children, className = "", hover = false }:
  { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`panel ${hover ? "panel-lift" : ""} ${className}`}>{children}</div>
  );
}

export function CardHeader({ title, sub, right }:
  { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="p-head pb-4">
      <div>
        <div className="p-title">{title}</div>
        {sub && <div className="p-sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ─── modal ─── */

/** Diálogo modal para crear y editar: cierra con Escape, con la X o
    pulsando el fondo; el cuerpo hace scroll si no cabe. `footer` recibe los
    botones de acción. */
export function Modal({ title, sub, onClose, children, footer, wide = false }: {
  title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // portal sobre el body: así la capa cubre la ventana aunque un ancestro tenga transform (animaciones .rise)
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      style={{ background: "color-mix(in srgb, var(--ink) 45%, transparent)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`panel rise my-auto flex w-full flex-col ${wide ? "max-w-[1080px]" : "max-w-[600px]"}`}>
        <div className="flex items-start gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="p-title">{title}</div>
            {sub && <div className="p-sub">{sub}</div>}
          </div>
          <button type="button" onClick={onClose} title="Cerrar (Esc)" className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink"><X size={15} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ─── métrica ─── */

export function StatCard({ label, value, decimals = 0, prefix = "", unit, delta, good, foot, accent }: {
  label: string; value: number; decimals?: number; prefix?: string; unit?: string;
  delta?: number; good?: boolean; foot?: string; accent?: string;
}) {
  const DeltaIcon = delta !== undefined && delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="panel relative overflow-hidden px-5 pb-4 pt-4">
      <div className="absolute inset-x-0 top-0 h-[3px] opacity-90"
        style={{ background: accent ?? "var(--grad-brand)" }} />
      <div className="text-[11.5px] font-medium leading-snug text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[30px] font-extrabold text-ink">
          {prefix}<CountUp value={value} decimals={decimals} />
        </span>
        {unit && <span className="text-[12px] font-medium text-faint">{unit}</span>}
        {delta !== undefined && (
          <span className={`num ml-auto inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold ${
            good ? "chip-ok" : "chip-bad"} chip`}>
            <DeltaIcon size={12} strokeWidth={2.6} />
            {Math.abs(delta).toLocaleString("es-CO", { maximumFractionDigits: 1 })}
          </span>
        )}
      </div>
      {foot && <div className="mt-2 text-[11px] text-faint">{foot}</div>}
    </div>
  );
}

/* ─── badges de estado ─── */

const LEVEL_META = [
  null,
  { name: "Inicial", color: "var(--n1)" },
  { name: "En desarrollo", color: "var(--n2)" },
  { name: "Definido", color: "var(--n3)" },
  { name: "Gestionado", color: "var(--n4)" },
  { name: "Optimizado", color: "var(--n5)" },
] as const;

export function LevelBadge({ level }: { level: number }) {
  const idx = Math.max(1, Math.min(5, Math.round(level)));
  const meta = LEVEL_META[idx]!;
  return (
    <span className="inline-flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3 text-[11.5px] font-bold text-white shadow-sm"
      style={{ background: meta.color }}>
      <span className="num grid h-[18px] w-[18px] place-items-center rounded-full bg-white/25 text-[10.5px]">
        {idx}
      </span>
      {meta.name}
    </span>
  );
}

export function StateDot({ state, size = 9 }: { state: "VERDE" | "AMBAR" | "ROJO"; size?: number }) {
  const c = state === "VERDE" ? "var(--ok)" : state === "AMBAR" ? "var(--warn)" : "var(--bad)";
  return (
    <span className="inline-block rounded-full"
      style={{
        width: size, height: size, background: c,
        boxShadow: `0 0 0 3px color-mix(in srgb, ${c} 16%, transparent)`,
      }}
      aria-label={state} />
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PLANEADA: { label: "Planeada", cls: "chip" },
    EN_CURSO: { label: "En curso", cls: "chip chip-cyan" },
    EN_RIESGO: { label: "En riesgo", cls: "chip chip-bad" },
    COMPLETADA: { label: "Completada", cls: "chip chip-ok" },
    SUSPENDIDA: { label: "Suspendida", cls: "chip" },
  };
  const m = map[status] ?? map.PLANEADA;
  return <span className={m.cls}>{m.label}</span>;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] leading-relaxed text-faint">
      {children}
    </p>
  );
}

/* El aviso de datos demo vive ahora en la topbar (una sola vez).
   Se conserva el export para compatibilidad. */
export function DemoBanner() {
  return null;
}

/* ─── tarjeta de módulo ─── */

export function ModuleCard({ href, code, title, desc, tags }: {
  href: string; code: string; title: string; desc: string; tags?: string[];
}) {
  return (
    <Link href={href} className="panel panel-lift group relative block overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-bold tracking-tight text-ink transition-colors group-hover:text-navy">
          {title}
        </h3>
        <span className="num shrink-0 rounded-lg bg-surface-2 px-2 py-0.5 text-[10.5px] font-bold text-faint transition-colors group-hover:bg-cyan-wash group-hover:text-cyan-deep">
          {code}
        </span>
      </div>
      <p className="mt-1.5 min-h-[3.4em] text-[12.5px] leading-relaxed text-muted">{desc}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tags?.map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
        <ArrowUpRight size={15} className="shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan-deep" />
      </div>
      <div className="spine absolute inset-x-0 bottom-0 h-[2.5px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
