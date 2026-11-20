"use client";

// Primer ingreso con cuenta (y cada vez que cambian los documentos): antes de usar la plataforma, la persona autoriza el
// tratamiento de sus datos personales y acepta el compromiso de confidencialidad, con enlace a los documentos completos
// (src/lib/legal). Queda registrado con fecha y versión en su cuenta. Sin aceptar ambos, no se entra.

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { consentSummary, consentText, consentLegal, consentRights, compromisoPuntos, CONSENT_VERSION } from "@/lib/consentimiento";
import { MarcaGE } from "@/components/logo";
import { ShieldCheck, Loader2, LogOut, ExternalLink, Lock } from "lucide-react";

/** Enlace a un documento legal, en pestaña nueva para no perder el formulario. */
export const EnlaceLegal = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-cyan-deep underline-offset-2 hover:underline">{children}<ExternalLink size={10} aria-hidden="true" /></a>
);

/** Frase de aceptación de los formularios de acceso por código o QR: autorización y compromiso en una sola casilla. */
export const AceptacionAcceso = ({ company }: { company: string }) => (
  <>{consentSummary(company)} Acepto también el <EnlaceLegal href="/legal/compromiso">compromiso de confidencialidad</EnlaceLegal> sobre la información de {company}, según la <EnlaceLegal href="/privacidad">política de tratamiento de datos</EnlaceLegal>.</>
);

export function ConsentGate({ company, country, nombre, actualizacion }: { company: string; country?: string; nombre: string; actualizacion?: boolean }) {
  const router = useRouter();
  const [datos, setDatos] = useState(false);
  const [reserva, setReserva] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aceptar = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/td/perfil/consentimiento", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); setBusy(false); return; }
      // recarga completa: el servidor vuelve a leer la aceptación desde la base
      window.location.reload();
      setTimeout(() => { setBusy(false); setError("La aceptación quedó registrada. Si sigues viendo esta pantalla, recarga la página."); }, 8000);
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); }
  };
  const salir = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };
  return (
    <div className="mx-auto max-w-[780px]">
      <div className="panel px-6 py-7 sm:px-9">
        <MarcaGE oscura={false} alto="30px" />
        <div className="mt-5 text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-deep">{actualizacion ? "Actualizamos nuestros documentos" : "Primer ingreso"} · datos personales y confidencialidad</div>
        <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
          {actualizacion ? `Hola ${nombre}: antes de seguir, revisa y acepta la nueva versión` : `Hola ${nombre}: antes de empezar, autoriza el tratamiento de tus datos y acepta el compromiso de confidencialidad`}
        </h1>
        {actualizacion && <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Publicamos una nueva política de tratamiento de datos y un compromiso de confidencialidad que protege la información de {company}. Tu participación anterior sigue guardada.</p>}

        <section aria-labelledby="gate-datos" className="mt-5">
          <h2 id="gate-datos" className="flex items-center gap-2 text-[13.5px] font-extrabold text-ink"><ShieldCheck size={15} className="text-cyan-deep" /> 1. Tratamiento de tus datos personales</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{consentSummary(company)}</p>
          <div className="mt-3 max-h-[26vh] space-y-2.5 overflow-auto rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft" tabIndex={0} aria-label="Texto completo de la autorización">
            {consentText(company).map((p, i) => <p key={i}>{p}</p>)}
            <p>{consentLegal(country)}</p>
            <p>{consentRights()}</p>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] text-ink">
            <input type="checkbox" checked={datos} onChange={(e) => setDatos(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>He leído la <EnlaceLegal href="/privacidad">política de tratamiento de datos</EnlaceLegal> y autorizo, de forma libre, previa, expresa e informada, el tratamiento de mis datos personales por {company} en esta plataforma.</span>
          </label>
        </section>

        <section aria-labelledby="gate-reserva" className="mt-6">
          <h2 id="gate-reserva" className="flex items-center gap-2 text-[13.5px] font-extrabold text-ink"><Lock size={15} className="text-cyan-deep" /> 2. Compromiso de confidencialidad</h2>
          <ul className="mt-2 list-disc space-y-1.5 rounded-xl bg-surface-2/70 py-3 pl-8 pr-4 text-[12.5px] leading-relaxed text-ink-soft">
            {compromisoPuntos(company).map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] text-ink">
            <input type="checkbox" checked={reserva} onChange={(e) => setReserva(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>Acepto el <EnlaceLegal href="/legal/compromiso">compromiso de confidencialidad y uso aceptable</EnlaceLegal> y me obligo a guardar reserva sobre la información de {company}, también después de dejar el proceso.</span>
          </label>
        </section>

        <p className="mt-4 text-[11.5px] text-faint">Versión de los documentos: {CONSENT_VERSION}. La aceptación queda registrada con fecha en tu cuenta. Consulta también la <EnlaceLegal href="/seguridad">política de seguridad</EnlaceLegal>.</p>
        {error && <p className="mt-3 text-[12.5px] text-bad-text">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={salir} className="btn-ghost inline-flex items-center gap-1.5 text-[12.5px]"><LogOut size={13} /> No acepto · salir</button>
          <button type="button" onClick={aceptar} disabled={!datos || !reserva || busy} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Acepto y continúo</button>
        </div>
      </div>
    </div>
  );
}
