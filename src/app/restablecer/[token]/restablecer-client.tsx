"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { PASSWORD_MIN } from "@/lib/recuperacion";

export function RestablecerClient({ token }: { token: string }) {
  const router = useRouter();
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (p1 !== p2) { setError("Las dos contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/restablecer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: p1 }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); setBusy(false); return; }
      router.push(j.next); router.refresh();
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-sm">
        <div className="label">Gestión estratégica · plataforma de 4Shine Empresas</div>
        <h1 className="mt-1 text-[22px] font-extrabold leading-tight text-ink">Crea una contraseña nueva</h1>
        <p className="mt-1 text-[12.5px] text-muted">Mínimo {PASSWORD_MIN} caracteres. Al guardarla entras directamente.</p>
        <label className="mt-5 block"><span className="label !text-[11px]">Contraseña nueva</span>
          <input value={p1} onChange={(e) => setP1(e.target.value)} type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} className="input mt-1 !py-2.5 text-[14px]" /></label>
        <label className="mt-3 block"><span className="label !text-[11px]">Repítela</span>
          <input value={p2} onChange={(e) => setP2(e.target.value)} type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} className="input mt-1 !py-2.5 text-[14px]" /></label>
        {error && <p className="mt-3 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--surface))" }}>{error}</p>}
        <button type="submit" disabled={busy || p1.length < PASSWORD_MIN} className="btn-primary mt-4 w-full justify-center !py-2.5 text-[13.5px] disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Guardar y entrar
        </button>
      </form>
    </main>
  );
}
