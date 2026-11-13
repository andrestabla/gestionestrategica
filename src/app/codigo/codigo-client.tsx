"use client";

// Entrada con código de acceso a los diagnósticos. Tres momentos: escribir el código; si es nuevo, registrar la
// organización (con eso la plataforma crea su espacio); si ya se usó, volver a entrar.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, KeyRound, Loader2 } from "lucide-react";
import { MarcaGE, DESARROLLADO_POR } from "@/components/logo";
import { consentSummary, consentText } from "@/lib/consentimiento";

type Info = { estado: "nuevo" | "usado"; codigo: string; nombre: string; correo: string; organizacion: string; invita: string; alcance: { id: string; label: string }[]; vence: string };
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export function CodigoClient({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(inicial);
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState({ organizacion: "", sector: "", pais: "CO", ciudad: "", tamano: "" });
  const [consent, setConsent] = useState(false);
  const [verTexto, setVerTexto] = useState(false);
  const pedido = useRef(false);

  const llamar = async (cuerpo: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/codigo-acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); setBusy(false); return null; }
      return j;
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); return null; }
  };
  const consultar = async (valor: string) => {
    const j = await llamar({ codigo: valor });
    if (!j) return;
    setInfo(j as Info); setOrg((o) => ({ ...o, organizacion: o.organizacion || j.organizacion || "" })); setBusy(false);
  };
  const entrar = async (cuerpo: Record<string, unknown>) => { const j = await llamar(cuerpo); if (j?.next) { router.push(j.next); router.refresh(); } };
  // el correo trae el código en el enlace: se consulta al llegar, una sola vez
  useEffect(() => { if (inicial && !pedido.current) { pedido.current = true; void consultar(inicial); } });

  const empresa = org.organizacion.trim() || "tu organización";
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-[520px]">
        <div className="mb-6 flex justify-center"><Link href="/" aria-label="Gestión estratégica, inicio"><MarcaGE oscura={false} firma={false} alto="34px" /></Link></div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm sm:p-8">
          {!info ? (
            <form onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) void consultar(codigo); }}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-wash)] text-[var(--gold)]"><KeyRound size={20} /></span>
              <h1 className="mt-4 text-[23px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Tengo un código</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Escribe el código que te envió tu asesor por correo. Con él registras tu organización y entras a tus diagnósticos.</p>
              <label className="mt-6 block"><span className="label">Código de acceso</span>
                <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} placeholder="GE-XXXX-XXXX"
                  aria-describedby={error ? "codigo-error" : undefined} className="input num mt-1.5 text-center !text-[20px] font-bold tracking-[0.18em]" /></label>
              {error && <p id="codigo-error" role="alert" className="mt-3 rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error}</p>}
              <button type="submit" disabled={busy || !codigo.trim()} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 !py-2.5 text-[13.5px] font-bold disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Continuar
              </button>
              <p className="mt-4 text-[12.5px] leading-snug text-faint">¿No tienes un código? Los genera el equipo que acompaña el diagnóstico. Puedes <Link href="/#diagnosticos" className="font-semibold text-cyan-deep hover:underline">conocer los diagnósticos</Link> o <Link href="/solicitar-codigo" className="font-semibold text-cyan-deep hover:underline">solicitar el tuyo</Link>.</p>
            </form>
          ) : info.estado === "usado" ? (
            <div>
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Hola de nuevo, {info.nombre.split(" ")[0]}</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Ya registraste tu organización con este código. Entra para continuar con {info.alcance.length > 1 ? "tus diagnósticos" : "tu diagnóstico"}.</p>
              <ul className="mt-4 space-y-1.5">{info.alcance.map((a) => <li key={a.id} className="flex items-start gap-2 text-[13.5px] text-ink-soft"><Check size={15} className="mt-0.5 shrink-0 text-[var(--ok)]" />{a.label}</li>)}</ul>
              {error && <p role="alert" className="mt-4 rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error}</p>}
              <button type="button" onClick={() => void entrar({ codigo: info.codigo, accion: "entrar" })} disabled={busy} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 !py-2.5 text-[13.5px] font-bold disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Entrar
              </button>
              <p className="mt-3 text-[12px] text-faint">El código vale hasta el {fecha(info.vence)}.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void entrar({ codigo: info.codigo, accion: "registrar", ...org, consent }); }}>
              <div className="label">Código {info.codigo}</div>
              <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Hola, {info.nombre.split(" ")[0]}</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{info.invita} te invita a realizar:</p>
              <ul className="mt-2 space-y-1.5">{info.alcance.map((a) => <li key={a.id} className="flex items-start gap-2 text-[13.5px] font-semibold text-ink"><Check size={15} className="mt-0.5 shrink-0 text-[var(--ok)]" />{a.label}</li>)}</ul>
              <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] leading-snug text-ink-soft">Cuéntanos de tu organización. Con estos datos creamos su espacio en la plataforma; tu cuenta queda con el correo <b>{info.correo}</b>.</p>
              <div className="mt-4 space-y-3">
                <label className="block"><span className="label !text-[11px]">Nombre de la organización</span>
                  <input value={org.organizacion} onChange={(e) => setOrg({ ...org, organizacion: e.target.value })} required minLength={3} maxLength={120} autoComplete="organization" className="input mt-1 !py-2.5 text-[14px]" /></label>
                <label className="block"><span className="label !text-[11px]">Sector o industria</span>
                  <input value={org.sector} onChange={(e) => setOrg({ ...org, sector: e.target.value })} required minLength={3} maxLength={120} placeholder="Por ejemplo: industria farmacéutica, comercio minorista de alimentos" className="input mt-1 !py-2.5 text-[14px]" />
                  <span className="mt-1 block text-[12px] leading-snug text-faint">Con el sector, la plataforma reúne información de tu industria para comparar tus resultados.</span></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="label !text-[11px]">País</span>
                    <select value={org.pais} onChange={(e) => setOrg({ ...org, pais: e.target.value })} className="input mt-1 !py-2.5 text-[14px]"><option value="CO">Colombia</option><option value="EC">Ecuador</option></select></label>
                  <label className="block"><span className="label !text-[11px]">Ciudad</span>
                    <input value={org.ciudad} onChange={(e) => setOrg({ ...org, ciudad: e.target.value })} required minLength={2} maxLength={80} autoComplete="address-level2" className="input mt-1 !py-2.5 text-[14px]" /></label>
                </div>
                <label className="block"><span className="label !text-[11px]">Tamaño (opcional)</span>
                  <input value={org.tamano} onChange={(e) => setOrg({ ...org, tamano: e.target.value })} maxLength={80} placeholder="Por ejemplo: 120 colaboradores" className="input mt-1 !py-2.5 text-[14px]" /></label>
              </div>
              <label className="mt-4 flex items-start gap-2.5"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--navy)]" />
                <span className="text-[12px] leading-snug text-ink-soft">{consentSummary(empresa)}</span></label>
              <button type="button" onClick={() => setVerTexto((x) => !x)} aria-expanded={verTexto} className="mt-1.5 text-[12px] font-semibold text-cyan-deep hover:underline">{verTexto ? "Ocultar" : "Leer"} la política de tratamiento de datos</button>
              {verTexto && <div className="mt-1.5 space-y-1.5 rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-snug text-ink-soft">{consentText(empresa).map((p, i) => <p key={i}>{p}</p>)}</div>}
              {error && <p role="alert" className="mt-4 rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error}</p>}
              <button type="submit" disabled={busy || !consent} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 !py-2.5 text-[13.5px] font-bold disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} {busy ? "Creando tu espacio…" : "Registrar y entrar"}
              </button>
              <button type="button" onClick={() => { setInfo(null); setError(null); }} disabled={busy} className="mt-3 text-[12px] text-faint hover:underline">Usar otro código</button>
            </form>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12px] text-faint">
          <span>{DESARROLLADO_POR}</span>
          <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Volver al sitio</Link>
        </div>
      </div>
    </main>
  );
}
