"use client";

// Administración → Códigos de acceso → Solicitudes. Llegan del formulario «Solicitar un código» del sitio público.
// El administrador o el advisor aprueba (la plataforma genera el código a su nombre y lo envía) o rechaza.

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, Modal, ResponsiveTable } from "@/components/ui";
import { avisar } from "@/components/feedback";
import { ALCANCES, type AlcanceCodigo } from "@/lib/codigos";
import { ESTADO_SOLICITUD, type SolicitudCodigo } from "@/lib/solicitudes";
import { Check, Inbox, Loader2, Send, X } from "lucide-react";

const dia = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");
const alcance = (s: AlcanceCodigo[]) => ALCANCES.filter((a) => s.includes(a.id)).map((a) => a.corto).join(" + ");
const ERR = { background: "color-mix(in srgb, var(--bad) 8%, var(--surface))", color: "var(--bad-text)" };

export function SolicitudesCard({ onAprobada }: { onAprobada: () => Promise<void> | void }) {
  const [filas, setFilas] = useState<SolicitudCodigo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todas, setTodas] = useState(false);
  const [decidir, setDecidir] = useState<{ s: SolicitudCodigo; accion: "aprobar" | "rechazar" } | null>(null);
  const cargar = useCallback(async () => {
    try { const r = await fetch("/api/td/solicitudes", { cache: "no-store" }); const j = await r.json().catch(() => null); if (r.ok) setFilas(j.solicitudes); else setError(j?.error ?? `Error ${r.status}`); }
    catch { setError("No se pudo conectar con el servidor."); }
  }, []);
  useEffect(() => {
    let vivo = true;
    fetch("/api/td/solicitudes", { cache: "no-store" }).then(async (r) => { const j = await r.json().catch(() => null); if (!vivo) return; if (r.ok) setFilas(j.solicitudes); else setError(j?.error ?? `Error ${r.status}`); }).catch(() => { if (vivo) setError("No se pudo conectar con el servidor."); });
    return () => { vivo = false; };
  }, []);

  const pendientes = filas?.filter((s) => s.status === "pendiente") ?? [];
  const decididas = (filas?.length ?? 0) - pendientes.length;
  const visibles = todas ? filas ?? [] : pendientes;
  return (
    <>
      <Card className="rise rise-1 mb-5 overflow-hidden">
        <CardHeader title={`Solicitudes de código${filas ? ` (${pendientes.length} ${pendientes.length === 1 ? "pendiente" : "pendientes"})` : ""}`}
          sub="llegan del formulario «Solicitar un código» del sitio público · al aprobar, la plataforma genera el código y lo envía"
          right={decididas > 0 ? <button type="button" onClick={() => setTodas((x) => !x)} aria-pressed={todas} className="btn-ghost btn-sm text-[12px]">{todas ? "Ver solo pendientes" : `Ver también las decididas (${decididas})`}</button> : undefined} />
        {error && <p className="mx-5 mb-3 rounded-xl px-4 py-2.5 text-[12.5px]" role="alert" style={ERR}>{error}</p>}
        <div className="px-2 pb-2">
          {!filas ? <p className="flex items-center gap-2 px-3 py-6 text-[13px] text-muted"><Loader2 size={14} className="animate-spin" /> Cargando…</p> : visibles.length === 0 ? (
            <p className="flex items-center gap-2.5 px-3 py-6 text-[13px] text-muted"><Inbox size={16} className="text-faint" /> No hay solicitudes pendientes.</p>
          ) : (
            <ResponsiveTable rows={visibles} rowKey={(s) => s.id} empty="No hay solicitudes." columns={[
              { key: "persona", header: "Solicitante", priority: 1, cell: (s) => <div><div className="font-semibold text-ink">{s.name}</div><div className="num text-[12px] text-muted">{s.email}</div>{s.phone && <div className="num text-[12px] text-faint">{s.phone}</div>}</div> },
              { key: "empresa", header: "Empresa", priority: 1, cell: (s) => <div><div className="font-semibold text-ink">{s.company}</div><div className="text-[12px] text-muted">{s.industry}</div><div className="text-[12px] text-faint">{s.country}</div></div> },
              { key: "pide", header: "Solicita", priority: 2, cell: (s) => <div className="text-[12.5px] text-ink-soft">{alcance(s.scope)}<div className="text-[12px] text-faint">Se enteró por: {s.source}</div></div> },
              { key: "estado", header: "Estado", priority: 2, cell: (s) => <div><span className={`chip ${ESTADO_SOLICITUD[s.status].chip}`}>{ESTADO_SOLICITUD[s.status].label}</span>
                <div className="mt-1 text-[12px] text-faint">{s.status === "pendiente" ? `llegó el ${dia(s.createdAt)}` : `${s.decidedByName ?? ""} · ${dia(s.decidedAt)}`}</div>{s.note && <div className="text-[12px] text-muted">Motivo: {s.note}</div>}</div> },
              { key: "acciones", header: "", priority: 1, align: "right", cell: (s) => s.status === "pendiente" ? (
                <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                  <button type="button" onClick={() => setDecidir({ s, accion: "aprobar" })} className="btn-primary btn-sm text-[12px]"><Check size={12} /> Aprobar</button>
                  <button type="button" onClick={() => setDecidir({ s, accion: "rechazar" })} className="btn-ghost btn-sm text-[12px]"><X size={12} /> Rechazar</button>
                </span>
              ) : null },
            ]} />
          )}
        </div>
      </Card>
      {decidir && <Decision s={decidir.s} accion={decidir.accion} onClose={() => setDecidir(null)} onHecho={async (aviso, aprobada) => { setDecidir(null); avisar(aviso); await cargar(); if (aprobada) await onAprobada(); }} />}
    </>
  );
}

function Decision({ s, accion, onClose, onHecho }: { s: SolicitudCodigo; accion: "aprobar" | "rechazar"; onClose: () => void; onHecho: (aviso: string, aprobada: boolean) => Promise<void> }) {
  const [scope, setScope] = useState<AlcanceCodigo[]>(s.scope);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const aprobar = accion === "aprobar";
  const cambiar = (id: AlcanceCodigo) => setScope((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const enviar = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/td/solicitudes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aprobar ? { id: s.id, accion, scope } : { id: s.id, accion, note }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setError(j?.error ?? `Error ${r.status}`); setBusy(false); return; }
      await onHecho(aprobar ? (j.enviado ? `Solicitud aprobada: código ${j.codigo} enviado a ${s.email}.` : (j.aviso ?? "Solicitud aprobada.")) : "Solicitud rechazada.", aprobar);
    } catch { setError("No se pudo conectar con el servidor."); setBusy(false); }
  };
  return (
    <Modal variante="dialogo" title={aprobar ? "Aprobar la solicitud" : "Rechazar la solicitud"} sub={`${s.name} · ${s.company}`} onClose={() => { if (!busy) onClose(); }}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" onClick={() => void enviar()} disabled={busy || (aprobar && !scope.length)} className="btn-primary !py-2 text-[12.5px] disabled:opacity-40" style={aprobar ? undefined : { background: "var(--bad-text)" }}>{busy ? <Loader2 size={13} className="animate-spin" /> : aprobar ? <Send size={13} /> : <X size={13} />} {aprobar ? "Aprobar y enviar código" : "Rechazar"}</button>
      </>}>
      <div className="space-y-3">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-xl bg-surface-2 px-4 py-3 text-[13px]">
          <dt className="text-muted">Correo</dt><dd className="num font-semibold text-ink">{s.email}</dd>
          {s.phone && <><dt className="text-muted">Teléfono</dt><dd className="num text-ink-soft">{s.phone}</dd></>}
          <dt className="text-muted">Industria</dt><dd className="text-ink-soft">{s.industry}</dd>
          <dt className="text-muted">País</dt><dd className="text-ink-soft">{s.country}</dd>
          <dt className="text-muted">Se enteró por</dt><dd className="text-ink-soft">{s.source}</dd>
        </dl>
        {aprobar ? (
          <>
            <fieldset>
              <legend className="label !text-[11px]">El código incluye</legend>
              <div className="mt-1.5 space-y-1.5">{ALCANCES.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-[13px] text-ink-soft" style={scope.includes(a.id) ? { borderColor: "var(--navy)", background: "var(--surface-2)" } : undefined}>
                  <input type="checkbox" checked={scope.includes(a.id)} onChange={() => cambiar(a.id)} className="h-4 w-4 accent-[var(--navy)]" /><span className="font-semibold text-ink">{a.label}</span>{s.scope.includes(a.id) && <span className="ml-auto text-[12px] text-faint">lo solicitó</span>}
                </label>
              ))}</div>
            </fieldset>
            <p className="text-[12px] leading-snug text-faint">La plataforma genera un código personal a tu nombre y lo envía a {s.email}. Cuando la persona lo use, quedas con acceso a su espacio para acompañar el diagnóstico.</p>
          </>
        ) : (
          <>
            <label className="block"><span className="label !text-[11px]">Motivo (opcional, para uso interno)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className="input mt-1 text-[13px]" placeholder="Por ejemplo: no corresponde al perfil, solicitud duplicada" /></label>
            <p className="text-[12px] leading-snug text-faint">La solicitud queda cerrada. La plataforma no envía ningún correo a la persona.</p>
          </>
        )}
        {error && <p role="alert" className="rounded-lg px-3.5 py-2.5 text-[12.5px]" style={ERR}>{error}</p>}
      </div>
    </Modal>
  );
}
