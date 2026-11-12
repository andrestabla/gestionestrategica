"use client";

// Segundo paso del acceso: el código de seis dígitos que llegó al correo. Lo usan el acceso con contraseña
// y el acceso por QR cuando la empresa exige el acceso en dos pasos. El servidor ya dejó la sesión pendiente;
// aquí solo se escribe el código (o se pide uno nuevo).

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";

export type PasoCodigoInfo = { mensaje: string; correo: string; minutos: number; reenvio: number; aviso?: string };
type Sesion = { user?: { role?: string; company?: { slug?: string }; empresas?: unknown[] }; next?: string; created?: boolean };

export function PasoCodigo({ info, onOk, onVolver, botonStyle }: { info: PasoCodigoInfo; onOk: (data: Sesion) => void; onVolver: () => void; botonStyle?: CSSProperties }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(info.aviso ?? null);
  const [busy, setBusy] = useState(false);
  const [espera, setEspera] = useState(info.reenvio);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { if (espera <= 0) return; const t = setTimeout(() => setEspera((s) => s - 1), 1000); return () => clearTimeout(t); }, [espera]);

  const enviar = async (valor: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/codigo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: valor }) });
      const j = await res.json().catch(() => null);
      if (res.ok) { onOk(j ?? {}); return; }   // la página navega: el botón sigue ocupado
      setError(j?.error ?? `Error ${res.status}`);
      if (j?.reiniciar) { setTimeout(onVolver, 2500); }
      else { setCodigo(""); input.current?.focus(); }
    } catch { setError("No se pudo conectar con el servidor."); }
    setBusy(false);
  };
  const reenviar = async () => {
    if (busy || espera > 0) return;
    setBusy(true); setError(null); setNota(null);
    try {
      const res = await fetch("/api/auth/codigo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reenviar: true }) });
      const j = await res.json().catch(() => null);
      if (res.ok) { setNota("Te enviamos un código nuevo. El anterior ya no sirve."); setEspera(info.reenvio); setCodigo(""); input.current?.focus(); }
      else { setError(j?.error ?? `Error ${res.status}`); if (j?.reiniciar) setTimeout(onVolver, 2500); }
    } catch { setError("No se pudo conectar con el servidor."); }
    setBusy(false);
  };
  const cambiar = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 6); setCodigo(d); if (d.length === 6) void enviar(d); };

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (codigo.length === 6) void enviar(codigo); }} className="mt-7 space-y-4" aria-label="Verificación en dos pasos">
      <div className="flex items-start gap-3 rounded-xl bg-surface-2 px-4 py-3.5">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan-deep" />
        <div>
          <p className="text-[13.5px] font-semibold leading-snug text-ink">{info.mensaje}</p>
          <p className="mt-1 text-[12.5px] leading-snug text-muted">Lo enviamos a <b className="text-ink-soft">{info.correo}</b>. Vale {info.minutos} minutos y sirve una sola vez. Revisa también la carpeta de correo no deseado.</p>
        </div>
      </div>
      <label className="block">
        <span className="label">Código de 6 dígitos</span>
        <input ref={input} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={7} value={codigo} onChange={(e) => cambiar(e.target.value)} disabled={busy}
          aria-describedby={error ? "codigo-error" : undefined} className="input num mt-1.5 text-center !text-[22px] font-bold tracking-[0.4em]" placeholder="······" />
      </label>
      {nota && !error && <p className="flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-[12.5px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--ok) 9%, var(--surface))" }}><MailCheck size={14} className="mt-0.5 shrink-0" />{nota}</p>}
      {error && <p id="codigo-error" role="alert" className="rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error}</p>}
      <button type="submit" disabled={busy || codigo.length !== 6} className="btn-primary flex w-full items-center justify-center gap-2 !py-2.5 text-[13.5px] font-bold disabled:opacity-60" style={botonStyle}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Verificar y entrar
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px]">
        <button type="button" onClick={() => void reenviar()} disabled={busy || espera > 0} className="font-semibold text-cyan-deep hover:underline disabled:text-faint disabled:no-underline">{espera > 0 ? `Reenviar el código en ${espera} s` : "Reenviar el código"}</button>
        <button type="button" onClick={onVolver} disabled={busy} className="text-faint hover:underline">Volver al inicio de sesión</button>
      </div>
    </form>
  );
}
