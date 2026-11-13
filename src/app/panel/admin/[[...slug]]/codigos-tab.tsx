"use client";

// Administración → Códigos de acceso. El administrador o el advisor genera un código para una persona que aún no
// tiene espacio en la plataforma y se lo envía por correo. El código incluye el diagnóstico de madurez, el test de
// capacidades o los dos. Cuando la persona lo usa, registra su organización y la plataforma crea su espacio.

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, Modal, ResponsiveTable } from "@/components/ui";
import { avisar, confirmar } from "@/components/feedback";
import { ALCANCES, ESTADO_CODIGO, CODIGO_DIAS, type AlcanceCodigo, type EstadoCodigo } from "@/lib/codigos";
import { Copy, KeyRound, Loader2, Send, Ban, ExternalLink } from "lucide-react";

type Fila = { id: string; codigo: string; name: string; email: string; organization?: string; scope: AlcanceCodigo[]; createdByName: string; createdAt: string; expiresAt: string; sentAt?: string; usedAt?: string; companySlug?: string; estado: EstadoCodigo; enlace: string; empresa: string | null };
const dia = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");
const alcance = (s: AlcanceCodigo[]) => ALCANCES.filter((a) => s.includes(a.id)).map((a) => a.corto).join(" + ");

export function CodigosTab() {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    try { const r = await fetch("/api/td/codigos", { cache: "no-store" }); const j = await r.json().catch(() => null); if (r.ok) setFilas(j.codigos); else setError(j?.error ?? `Error ${r.status}`); }
    catch { setError("No se pudo conectar con el servidor."); }
  }, []);
  useEffect(() => {
    let vivo = true;
    fetch("/api/td/codigos", { cache: "no-store" }).then(async (r) => { const j = await r.json().catch(() => null); if (!vivo) return; if (r.ok) setFilas(j.codigos); else setError(j?.error ?? `Error ${r.status}`); }).catch(() => { if (vivo) setError("No se pudo conectar con el servidor."); });
    return () => { vivo = false; };
  }, []);

  const accion = async (f: Fila, que: "reenviar" | "anular") => {
    if (que === "anular" && !(await confirmar({ title: "¿Anular este código?", body: `El código de ${f.name} dejará de servir. Si lo necesita, tendrás que generarle uno nuevo.`, confirmLabel: "Anular", danger: true }))) return;
    setBusy(f.id); setError(null);
    try {
      const r = await fetch("/api/td/codigos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: f.id, accion: que }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) setError(j?.error ?? `Error ${r.status}`); else { avisar(que === "anular" ? "Código anulado." : `Código enviado de nuevo a ${f.email}.`); await cargar(); }
    } catch { setError("No se pudo conectar con el servidor."); }
    setBusy(null);
  };
  const copiar = async (f: Fila) => { await navigator.clipboard.writeText(`${f.codigo} · ${f.enlace}`); avisar("Código y enlace copiados."); };

  return (
    <>
      {error && <p className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px]" role="alert" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error}</p>}
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title={`Códigos de acceso a los diagnósticos${filas ? ` (${filas.length})` : ""}`}
          sub={`para personas que aún no tienen espacio en la plataforma · cada código es personal y vale ${CODIGO_DIAS} días`}
          right={<button type="button" onClick={() => setNuevo(true)} className="btn-primary btn-sm text-[12px]"><KeyRound size={12} /> Nuevo código</button>} />
        <p className="border-b border-line px-5 pb-4 text-[12.5px] leading-snug text-muted">Quien recibe el código entra por «Tengo un código» en el sitio público, registra su organización y la plataforma le crea un espacio limitado a los diagnósticos que el código incluye. Tú quedas con acceso a ese espacio para acompañar el diagnóstico.</p>
        <div className="px-2 pb-2">
          {!filas ? <p className="flex items-center gap-2 px-3 py-6 text-[13px] text-muted"><Loader2 size={14} className="animate-spin" /> Cargando…</p> : (
            <ResponsiveTable rows={filas} rowKey={(f) => f.id} empty="Aún no has generado códigos. Con «Nuevo código» creas uno y la plataforma lo envía al correo de la persona." columns={[
              { key: "persona", header: "Persona", priority: 1, cell: (f) => <div><div className="font-semibold text-ink">{f.name}</div><div className="num text-[12px] text-muted">{f.email}</div>{f.organization && <div className="text-[12px] text-faint">{f.organization}</div>}</div> },
              { key: "codigo", header: "Código", priority: 1, cell: (f) => <div><code className="num text-[12.5px] font-bold text-ink">{f.codigo}</code><div className="text-[12px] text-muted">{alcance(f.scope)}</div></div> },
              { key: "estado", header: "Estado", priority: 2, cell: (f) => <div><span className={`chip ${ESTADO_CODIGO[f.estado].chip}`}>{ESTADO_CODIGO[f.estado].label}</span>
                <div className="mt-1 text-[12px] text-faint">{f.estado === "usado" ? <>el {dia(f.usedAt)}{f.empresa && f.companySlug ? <> · <a href={`/${f.companySlug}/panel`} className="inline-flex items-center gap-1 font-semibold text-cyan-deep hover:underline">{f.empresa} <ExternalLink size={10} /></a></> : null}</> : f.estado === "enviado" ? `el ${dia(f.sentAt)} · vence el ${dia(f.expiresAt)}` : f.estado === "vencido" ? `venció el ${dia(f.expiresAt)}` : f.estado === "sin_enviar" ? "el correo no salió: reenvíalo o cópialo" : ""}</div></div> },
              { key: "quien", header: "Generado", priority: 3, cell: (f) => <div className="text-[12px] text-muted">{f.createdByName}<div className="text-faint">{dia(f.createdAt)}</div></div> },
              { key: "acciones", header: "", priority: 2, align: "right", cell: (f) => (f.estado === "enviado" || f.estado === "sin_enviar") ? (
                <span className="inline-flex items-center justify-end gap-0.5">
                  <button type="button" disabled={busy === f.id} onClick={() => void copiar(f)} title="Copiar el código y su enlace" aria-label="Copiar el código y su enlace" className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"><Copy size={14} /></button>
                  <button type="button" disabled={busy === f.id} onClick={() => void accion(f, "reenviar")} title="Enviar de nuevo el correo con el código" aria-label="Enviar de nuevo el correo con el código" className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink">{busy === f.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
                  <button type="button" disabled={busy === f.id} onClick={() => void accion(f, "anular")} title="Anular el código" aria-label="Anular el código" className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-[var(--bad-text)]"><Ban size={14} /></button>
                </span>
              ) : null },
            ]} />
          )}
        </div>
      </Card>
      {nuevo && <NuevoCodigo onClose={() => setNuevo(false)} onCreado={async (aviso) => { setNuevo(false); avisar(aviso); await cargar(); }} />}
    </>
  );
}

function NuevoCodigo({ onClose, onCreado }: { onClose: () => void; onCreado: (aviso: string) => Promise<void> }) {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [organization, setOrganization] = useState("");
  const [scope, setScope] = useState<AlcanceCodigo[]>(["madurez", "test"]);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const cambiar = (id: AlcanceCodigo) => setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const crear = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/td/codigos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, organization, scope }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? `Error ${r.status}`); setBusy(false); return; }
      await onCreado(j.enviado ? `Código ${j.codigo.codigo} enviado a ${j.codigo.email}.` : (j.aviso ?? "Código generado."));
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); }
  };
  return (
    <Modal variante="dialogo" title="Nuevo código de acceso" sub="la plataforma lo envía al correo de la persona" onClose={() => { if (!busy) onClose(); }}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" onClick={() => void crear()} disabled={busy || name.trim().length < 5 || !email.includes("@") || !scope.length} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Generar y enviar</button>
      </>}>
      <div className="space-y-3">
        <label className="block"><span className="label !text-[11px]">Nombre completo</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={120} autoComplete="off" className="input mt-1 !py-2 text-[13px]" placeholder="Nombre y apellido" /></label>
        <label className="block"><span className="label !text-[11px]">Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} autoComplete="off" className="input mt-1 !py-2 text-[13px]" placeholder="persona@organizacion.com" /></label>
        <label className="block"><span className="label !text-[11px]">Organización (opcional)</span>
          <input value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={120} autoComplete="off" className="input mt-1 !py-2 text-[13px]" placeholder="La persona la confirma al usar el código" /></label>
        <fieldset>
          <legend className="label !text-[11px]">El código incluye</legend>
          <div className="mt-1.5 space-y-1.5">{ALCANCES.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-[13px] text-ink-soft" style={scope.includes(a.id) ? { borderColor: "var(--navy)", background: "var(--surface-2)" } : undefined}>
              <input type="checkbox" checked={scope.includes(a.id)} onChange={() => cambiar(a.id)} className="h-4 w-4 accent-[var(--navy)]" /><span className="font-semibold text-ink">{a.label}</span>
            </label>
          ))}</div>
        </fieldset>
        {error && <p role="alert" className="rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" }}>{error}</p>}
        <p className="text-[12px] leading-snug text-faint">El código es personal y vale {CODIGO_DIAS} días. Si ya le habías generado uno a este correo y no lo usó, el anterior deja de servir.</p>
      </div>
    </Modal>
  );
}
