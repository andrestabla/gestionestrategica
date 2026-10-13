"use client";

// Pantalla mínima de entrada por QR: nombre y correo, y a la sección.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export function AccesoClient({ tenant, token, company, section }: {
  tenant: string; token: string; company: { name: string; shortName: string }; section: { id: string; label: string; what: string };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant, token, name, email }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); setBusy(false); return; }
      router.push(j.next); router.refresh();
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-sm">
        <div className="label">{company.name} · convención</div>
        <h1 className="mt-1 text-[22px] font-extrabold leading-tight text-ink">{section.label}</h1>
        <p className="mt-1 text-[12.5px] text-muted">{section.what}</p>
        <label className="mt-5 block"><span className="label !text-[9px]">Nombre completo</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" required minLength={5} className="input mt-1 !py-2.5 text-[14px]" placeholder="Nombre y apellido" /></label>
        <label className="mt-3 block"><span className="label !text-[9px]">Correo</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" autoCapitalize="none" inputMode="email" required className="input mt-1 !py-2.5 text-[14px]" placeholder="tu@correo.com" /></label>
        <p className="mt-2 text-[11px] leading-snug text-faint">El correo te identifica: si ya entraste antes, se usa tu misma cuenta.</p>
        {error && <p className="mt-3 rounded-lg px-3 py-2 text-[12px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 10%, white)" }}>{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full justify-center !py-2.5 text-[13.5px] disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} Entrar a {section.label}
        </button>
      </form>
    </main>
  );
}
