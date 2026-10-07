"use client";

// Formulario de la Fuente 2: 34 afirmaciones por dimensión, 6 de contraste
// general y una pregunta abierta. Cada número trae la guía propia de la
// afirmación. No pide nombre ni correo.

import { useMemo, useState } from "react";
import { CAPS, DIMS, F2_GENERAL, GUIDES, MAPA } from "@/data/mapa";
import { Loader2, Send, CheckCircle2, ShieldCheck } from "lucide-react";

const SCALE = MAPA.escalaF2;

export function SurveyForm({ token, company }: { token: string; company: string }) {
  const [r, setR] = useState<Record<string, number>>({});
  const [area, setArea] = useState("");
  const [abierta, setAbierta] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const items = useMemo(() => [...DIMS.flatMap((d) => d.f2.map((q) => ({ ...q, cap: d.cap }))), ...F2_GENERAL.map((q) => ({ ...q, cap: "Una mirada general" }))], []);
  const answered = Object.keys(r).length;
  const submit = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/e/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ r, area, abierta }) });
    const j = await res.json();
    if (!res.ok) setMsg(j.error ?? "No se pudo enviar."); else { setDone(j.total); window.scrollTo({ top: 0 }); }
    setBusy(false);
  };
  const groups = [...CAPS.map((c) => c.name), "Una mirada general"];

  return (
    <div className="min-h-screen bg-bg">
      <header className="px-6 py-5 text-white" style={{ background: "var(--grad-deep)" }}>
        <div className="mx-auto flex max-w-[860px] items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/4shine-logo-blanco.png" alt="4Shine" className="h-7 object-contain" />
          <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-fill">Diagnóstico 4Shine-OD · Percepción de equipos</div><div className="truncate text-[15px] font-extrabold">{company}</div></div>
          <span className="chip ml-auto hidden sm:inline-flex" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}><ShieldCheck size={11} /> Anónima</span>
        </div>
      </header>
      <main className="mx-auto max-w-[860px] px-5 py-8">
        {done !== null ? (
          <div className="panel px-7 py-8 text-center">
            <CheckCircle2 size={34} className="mx-auto" style={{ color: "var(--ok)" }} />
            <h1 className="mt-3 text-[22px] font-extrabold text-ink">Gracias por responder</h1>
            <p className="mx-auto mt-2 max-w-[52ch] text-[13.5px] text-muted">Tu respuesta se sumó a las demás de {company}. Solo se reportan resultados agregados, con un mínimo de cinco respuestas por grupo; nadie verá tu respuesta individual.</p>
            <p className="mt-4 text-[12px] text-faint">Puedes cerrar esta ventana.</p>
          </div>
        ) : (
          <>
            <div className="panel mb-5 px-7 py-6">
              <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Cómo funciona esta empresa en el día a día</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">Responde según tu experiencia real en {company} durante los últimos seis meses. No hay respuestas correctas: buscamos entender cómo funciona la organización, no evaluar personas.</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted"><b className="text-ink">Tu respuesta es anónima.</b> No se pide tu nombre ni tu correo, no se guarda desde dónde respondes y solo se reportan agregados con un mínimo de cinco respuestas por grupo. Son 40 afirmaciones; toma entre 15 y 20 minutos.</p>
              <div className="mt-4 grid gap-1.5 sm:grid-cols-5">
                {SCALE.map((e) => <div key={e.n} className="rounded-lg bg-surface-2 px-3 py-2 text-[11.5px]"><b className="text-ink">{e.n} · {e.name}</b><div className="text-muted">{e.desc}</div></div>)}
              </div>
              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-faint">Área (opcional)<input className="input mt-1 font-normal normal-case tracking-normal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Comercial, operaciones, administración…" /></label>
            </div>
            {groups.map((gname) => (
              <div key={gname} className="mb-5">
                <div className="mb-2 rounded-xl px-5 py-3 text-white" style={{ background: "var(--navy)" }}><div className="text-[15px] font-extrabold">{gname}</div></div>
                {items.filter((q) => q.cap === gname).map((q) => {
                  const g = GUIDES.f2[q.code]; const v = r[q.code];
                  return (
                    <div key={q.code} className="panel mb-2 px-5 py-4">
                      <p className="text-[13.5px] font-semibold leading-snug text-ink">{q.text}</p>
                      <div className="mt-3 grid grid-cols-5 gap-1.5">
                        {SCALE.map((e, i) => { const n = i + 1; return (
                          <button key={n} type="button" onClick={() => setR((p) => ({ ...p, [q.code]: n }))} title={g?.n?.[String(n)]}
                            className={`rounded-lg border px-1 py-2 text-center transition-all ${v === n ? "border-navy text-white" : "border-line bg-surface hover:border-gold"}`} style={v === n ? { background: "var(--navy)" } : undefined}>
                            <div className="num text-[16px] font-extrabold">{n}</div><div className={`text-[9.5px] font-semibold ${v === n ? "text-cyan-fill" : "text-muted"}`}>{e.name}</div>
                          </button>
                        ); })}
                      </div>
                      {v && g?.n?.[String(v)] && <p className="mt-2 rounded-lg bg-cyan-wash px-3 py-2 text-[12px] leading-snug text-ink-soft"><b className="text-ink">{v} · {SCALE[v - 1].name}.</b> {g.n[String(v)]}{g.q && <i className="mt-0.5 block text-muted">{g.q}</i>}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="panel mb-5 px-5 py-4">
              <p className="text-[13.5px] font-semibold text-ink">Si pudieras cambiar una sola cosa de cómo funciona esta empresa, ¿cuál sería?</p>
              <p className="text-[11.5px] text-muted">Opcional y anónima. Se cita sin nombre en la devolución.</p>
              <textarea className="input mt-2 min-h-[80px]" value={abierta} onChange={(e) => setAbierta(e.target.value)} maxLength={600} />
            </div>
            {msg && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: "#fbeaea", color: "var(--bad)" }}>{msg}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="num text-[12px] text-muted">{answered} de 40 respondidas · se necesitan al menos 30</span>
              <button onClick={submit} disabled={busy || answered < 30} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar mi respuesta</button>
            </div>
          </>
        )}
      </main>
      <footer className="px-6 pb-8 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-faint/70">Sistema 4Shine® · Diagnóstico 4Shine-OD · Fuente 2</footer>
    </div>
  );
}
