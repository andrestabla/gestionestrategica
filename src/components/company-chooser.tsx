"use client";

// Elección de la empresa activa (admin de plataforma): tarjetas por empresa,
// buscador cuando hay muchas, alta de empresa en modal y cierre de sesión.
// Elegir una tarjeta fija la empresa en la sesión y entra al panel.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlgoritmoMark } from "@/components/logo";
import { CompanyForm } from "@/components/company-form";
import { Building2, Search, LogOut, Loader2, Plus, Users2, Rocket, Gauge, MapPin, ArrowRight, Settings2 } from "lucide-react";

export type ChooserCompany = {
  slug: string; name: string; shortName: string; sector: string; city: string; department: string;
  country: "CO" | "EC"; currency: "COP" | "USD"; active: boolean; template: string;
  users: number; initiatives: number; kpis: number; people: number;
};

export function CompanyChooser({ companies, current, userName }: { companies: ChooserCompany[]; current: string | null; userName: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? companies.filter((c) => [c.name, c.shortName, c.sector, c.city, c.department, c.slug].some((x) => x.toLowerCase().includes(t))) : companies;
  }, [companies, q]);

  const choose = async (slug: string) => {
    setBusy(slug); setError(null);
    const res = await fetch("/api/auth/empresa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
    if (res.ok) { router.push("/panel"); router.refresh(); return; }
    setError((await res.json().catch(() => null))?.error ?? "No se pudo activar la empresa.");
    setBusy(null);
  };
  const create = async (input: Record<string, unknown>) => {
    setSaving(true); setError(null);
    const res = await fetch("/api/td/empresas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    setSaving(false);
    if (!res.ok) { setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`); return false; }
    const { company } = await res.json();
    if (company?.slug) await choose(company.slug); else router.refresh();
    return true;
  };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-8">
        <AlgoritmoMark size={26} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13.5px] font-extrabold tracking-tight text-ink">4Shine Empresas</div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-faint">Administración de la plataforma</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[12px] text-muted sm:inline">{userName}</span>
          <button onClick={logout} className="btn-ghost !py-1.5 text-[12px]"><LogOut size={13} /> <span className="hidden sm:inline">Cerrar sesión</span></button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-8 sm:py-12">
        <div className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label mb-2">Paso 1 de 2</div>
            <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">¿Con qué empresa vas a trabajar?</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
              Cada empresa es un contexto independiente: su diagnóstico, su portafolio, sus KPI y sus cuentas.
              Elige una para entrar a su panel; podrás cambiarla en cualquier momento desde el menú.
            </p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary !py-2 text-[12.5px]"><Plus size={13} /> Nueva empresa</button>
        </div>

        {error && <p className="rise mb-4 rounded-xl px-4 py-3 text-[12.5px] text-ink-soft" style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>{error}</p>}

        {companies.length > 6 && (
          <label className="rise rise-1 mb-5 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-sm">
            <Search size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, sector o ciudad" className="w-full bg-transparent text-[13px] outline-none" />
          </label>
        )}

        {companies.length === 0 ? (
          <div className="rise rise-1 panel px-6 py-10 text-center">
            <Building2 size={28} className="mx-auto text-faint" />
            <p className="mt-3 text-[14px] font-bold text-ink">Aún no hay empresas</p>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted">Crea la primera: puede partir vacía (solo el mapa 4Shine) o copiar la plantilla demo.</p>
            <button onClick={() => setCreating(true)} className="btn-primary mt-5 !py-2 text-[12.5px]"><Plus size={13} /> Nueva empresa</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c, i) => {
              const isCurrent = c.slug === current;
              return (
                <button key={c.slug} type="button" disabled={busy !== null || !c.active} onClick={() => choose(c.slug)}
                  className={`panel rise rise-${Math.min(i + 1, 4)} group relative flex flex-col p-5 text-left transition-all ${c.active ? "hover:-translate-y-0.5 hover:shadow-lg" : "opacity-55"} ${isCurrent ? "ring-2 ring-cyan-deep" : ""} disabled:cursor-default`}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold text-white" style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}>
                      {c.shortName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-extrabold tracking-tight text-ink">{c.name}</div>
                      <div className="truncate text-[11.5px] text-muted">{c.sector || "Sector por definir"}</div>
                    </div>
                    {busy === c.slug ? <Loader2 size={16} className="animate-spin text-cyan-deep" /> : c.active && <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-deep" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {isCurrent && <span className="chip chip-cyan !py-0 text-[9.5px]">activa ahora</span>}
                    {!c.active && <span className="chip chip-bad !py-0 text-[9.5px]">desactivada</span>}
                    {c.template === "demo" && <span className="chip chip-gold !py-0 text-[9.5px]">plantilla demo</span>}
                    <span className="chip !py-0 text-[9.5px]"><MapPin size={9} /> {[c.city, c.department].filter(Boolean).join(", ") || (c.country === "EC" ? "Ecuador" : "Colombia")} · {c.currency}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[11px] text-muted">
                    <div><dt className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-faint"><Rocket size={9} /> Iniciativas</dt><dd className="num text-[14px] font-extrabold text-ink">{c.initiatives}</dd></div>
                    <div><dt className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-faint"><Gauge size={9} /> KPI</dt><dd className="num text-[14px] font-extrabold text-ink">{c.kpis}</dd></div>
                    <div><dt className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-faint"><Users2 size={9} /> Cuentas</dt><dd className="num text-[14px] font-extrabold text-ink">{c.users}</dd></div>
                  </dl>
                </button>
              );
            })}
            {list.length === 0 && <p className="text-[12.5px] italic text-faint">Ninguna empresa coincide con «{q}».</p>}
          </div>
        )}

        <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
          <Settings2 size={12} className="mt-0.5 shrink-0" />
          Las empresas desactivadas no se pueden elegir: reactívalas o elimínalas desde Administración → Empresas, dentro de cualquier empresa activa.
        </p>
      </main>

      {creating && <CompanyForm saving={saving} initial={null} onCancel={() => setCreating(false)} onSubmit={create} />}
    </div>
  );
}
