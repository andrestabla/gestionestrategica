"use client";

// Formulario público «Solicitar un código». La solicitud llega al equipo, que la aprueba o la rechaza desde
// Administración → Códigos de acceso; si la aprueba, la plataforma envía el código al correo que se escribe aquí.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, MailCheck, Send } from "lucide-react";
import { MarcaGE, DESARROLLADO_POR } from "@/components/logo";
import { INDUSTRIAS, PAISES, FUENTES } from "@/lib/solicitudes";
import type { AlcanceCodigo } from "@/lib/codigos";

const OPCIONES: { id: string; scope: AlcanceCodigo[]; t: string; d: string }[] = [
  { id: "madurez", scope: ["madurez"], t: "Madurez digital", d: "Diagnóstico de madurez en transformación digital" },
  { id: "test", scope: ["test"], t: "Test de capacidades", d: "Veinticinco preguntas y un informe de una página" },
  { id: "ambos", scope: ["madurez", "test"], t: "Los dos", d: "El diagnóstico de madurez y el test de capacidades" },
];
const VACIO = { name: "", company: "", industry: "", country: "Colombia", email: "", phone: "", source: "", sitio: "" };
const CAMPO = "input mt-1 !py-2.5 text-[14px]";

export function SolicitarClient({ inicial, volver }: { inicial: AlcanceCodigo[]; volver: string }) {
  const [f, setF] = useState(VACIO);
  const [opcion, setOpcion] = useState(inicial.length === 2 ? "ambos" : inicial[0]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [enviada, setEnviada] = useState<{ correo: string; repetida: boolean } | null>(null);
  const set = (k: keyof typeof VACIO) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const mal = (campo: string) => (error?.campo === campo ? { "aria-invalid": true, "aria-describedby": "solicitud-error" } : {});

  const enviar = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/solicitud-codigo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, scope: OPCIONES.find((o) => o.id === opcion)!.scope, consent }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError({ campo: j?.campo, texto: j?.error ?? `Error ${res.status}` }); setBusy(false); return; }
      setEnviada({ correo: j?.correo ?? f.email, repetida: Boolean(j?.repetida) });
    } catch { setError({ texto: "No se pudo conectar con el servidor." }); }
    setBusy(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-[620px]">
        <div className="mb-6 flex justify-center"><Link href="/" aria-label="Gestión estratégica, inicio"><MarcaGE oscura={false} firma={false} alto="34px" /></Link></div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm sm:p-8">
          {enviada ? (
            <div role="status">
              <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--ok) 12%, var(--surface))", color: "var(--ok-text)" }}><MailCheck size={22} /></span>
              <h1 className="mt-4 text-[23px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{enviada.repetida ? "Ya teníamos tu solicitud" : "Recibimos tu solicitud"}</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{enviada.repetida ? "Tu solicitud anterior sigue en revisión; no hace falta enviarla de nuevo." : "El equipo que acompaña los diagnósticos la revisará."} Si se aprueba, el código llega a <b className="text-ink">{enviada.correo}</b>, con las instrucciones para usarlo.</p>
              <ol className="mt-5 space-y-2.5">
                {["Revisamos tu solicitud.", "Te enviamos el código por correo.", "Entras por «Tengo un código», registras tu organización y empiezas."].map((t, i) => (
                  <li key={t} className="flex items-start gap-3 text-[13.5px] text-ink-soft"><span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-[12px] font-bold text-white">{i + 1}</span>{t}</li>
                ))}
              </ol>
              <Link href={volver} className="btn-primary mt-6 inline-flex items-center gap-2 !py-2.5 text-[13.5px] font-bold"><ArrowLeft size={15} /> Volver</Link>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void enviar(); }} noValidate>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-wash)] text-[var(--gold)]"><Send size={19} /></span>
              <h1 className="mt-4 text-[23px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Solicitar un código</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Cuéntanos quién eres y qué diagnóstico te interesa. El equipo revisa la solicitud y, si se aprueba, te envía el código por correo.</p>

              <fieldset className="mt-6">
                <legend className="label !text-[11px]">Diagnóstico que te interesa</legend>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">{OPCIONES.map((o) => (
                  <label key={o.id} className="flex cursor-pointer flex-col rounded-xl border border-line px-3.5 py-3" style={opcion === o.id ? { borderColor: "var(--navy)", background: "var(--surface-2)" } : undefined}>
                    <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink"><input type="radio" name="diagnostico" checked={opcion === o.id} onChange={() => setOpcion(o.id)} className="h-4 w-4 accent-[var(--navy)]" />{o.t}</span>
                    <span className="mt-1 text-[12px] leading-snug text-muted">{o.d}</span>
                  </label>
                ))}</div>
              </fieldset>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2"><span className="label !text-[11px]">Nombre completo</span>
                  <input value={f.name} onChange={set("name")} required minLength={5} maxLength={120} autoComplete="name" className={CAMPO} {...mal("name")} /></label>
                <label className="block sm:col-span-2"><span className="label !text-[11px]">Empresa</span>
                  <input value={f.company} onChange={set("company")} required minLength={2} maxLength={120} autoComplete="organization" className={CAMPO} {...mal("company")} /></label>
                <label className="block"><span className="label !text-[11px]">Industria</span>
                  <select value={f.industry} onChange={set("industry")} required className={CAMPO} {...mal("industry")}><option value="" disabled>Elige una</option>{INDUSTRIAS.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label className="block"><span className="label !text-[11px]">País</span>
                  <select value={f.country} onChange={set("country")} required autoComplete="country-name" className={CAMPO} {...mal("country")}>{PAISES.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label className="block"><span className="label !text-[11px]">Correo electrónico</span>
                  <input type="email" value={f.email} onChange={set("email")} required maxLength={160} autoComplete="email" placeholder="tu@empresa.com" className={CAMPO} {...mal("email")} /></label>
                <label className="block"><span className="label !text-[11px]">Teléfono (opcional)</span>
                  <input type="tel" value={f.phone} onChange={set("phone")} maxLength={30} autoComplete="tel" placeholder="+57 300 000 0000" className={CAMPO} {...mal("phone")} /></label>
                <label className="block sm:col-span-2"><span className="label !text-[11px]">¿Cómo te enteraste de nosotros?</span>
                  <select value={f.source} onChange={set("source")} required className={CAMPO} {...mal("source")}><option value="" disabled>Elige una</option>{FUENTES.map((x) => <option key={x}>{x}</option>)}</select></label>
              </div>
              {/* campo trampa para formularios automáticos: las personas no lo ven ni lo alcanzan con el teclado */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}><label>Sitio web<input tabIndex={-1} autoComplete="off" value={f.sitio} onChange={set("sitio")} /></label></div>

              <label className="mt-4 flex items-start gap-2.5"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--navy)]" {...mal("consent")} />
                <span className="text-[12px] leading-snug text-ink-soft">Autorizo a 4Shine Empresas a usar estos datos para responder mi solicitud y contactarme sobre el diagnóstico. Puedo pedir que los corrijan o los eliminen escribiendo a plataforma@algoritmot.com.</span></label>
              {error && <p id="solicitud-error" role="alert" className="mt-4 rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error.texto}</p>}
              <button type="submit" disabled={busy || !consent} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 !py-2.5 text-[13.5px] font-bold disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {busy ? "Enviando…" : "Enviar solicitud"}
              </button>
              <p className="mt-4 text-[12.5px] leading-snug text-faint">¿Ya tienes un código? Entra por <Link href="/codigo" className="font-semibold text-cyan-deep hover:underline">Tengo un código</Link>.</p>
            </form>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12px] text-faint">
          <span>{DESARROLLADO_POR}</span>
          <Link href={volver} className="inline-flex items-center gap-1.5 font-semibold text-cyan-deep hover:underline"><ArrowLeft size={13} /> Volver</Link>
        </div>
      </div>
    </main>
  );
}
