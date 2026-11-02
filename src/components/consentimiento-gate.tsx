"use client";

// Primer ingreso con cuenta: antes de usar la plataforma, la persona lee y acepta la política de tratamiento
// de datos personales conforme a la legislación vigente (Colombia: Ley 1581 de 2012 y Decreto 1377 de 2013;
// Ecuador: LOPDP 2021). Queda registrada con fecha y versión en su cuenta. Sin aceptar, no se entra.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { consentSummary, consentText, consentLegal, consentRights, CONSENT_VERSION } from "@/lib/consentimiento";
import { MarcaGE } from "@/components/logo";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";

export function ConsentGate({ company, country, nombre }: { company: string; country?: string; nombre: string }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aceptar = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/td/perfil/consentimiento", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); setBusy(false); return; }
      router.refresh();
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); }
  };
  const salir = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="panel px-6 py-7 sm:px-9">
        <MarcaGE oscura={false} alto="30px" />
        <div className="mt-5 text-[12px] font-bold uppercase tracking-[0.18em] text-cyan-deep">Primer ingreso · tratamiento de datos personales</div>
        <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-ink">Hola {nombre}: antes de empezar, autoriza el tratamiento de tus datos</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{consentSummary(company)}</p>
        <div className="mt-4 max-h-[42vh] space-y-2.5 overflow-auto rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          {consentText(company).map((p, i) => <p key={i}>{p}</p>)}
          <p>{consentLegal(country)}</p>
          <p>{consentRights()}</p>
          <p className="text-[11.5px] text-faint">Versión de la política: {CONSENT_VERSION}. La aceptación queda registrada con fecha en tu cuenta.</p>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] text-ink">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>He leído la política y autorizo, de forma libre, previa, expresa e informada, el tratamiento de mis datos personales por {company} en esta plataforma.</span>
        </label>
        {error && <p className="mt-3 text-[12.5px] text-bad-text">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={salir} className="btn-ghost inline-flex items-center gap-1.5 text-[12.5px]"><LogOut size={13} /> No acepto · salir</button>
          <button type="button" onClick={aceptar} disabled={!ok || busy} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Acepto y continúo</button>
        </div>
      </div>
    </div>
  );
}
