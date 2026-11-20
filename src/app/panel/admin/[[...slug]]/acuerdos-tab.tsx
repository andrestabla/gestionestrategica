"use client";

// Administración → Acuerdos: lo legal de la empresa en un solo lugar.
// 1. Datos de la empresa con que se llenan los acuerdos (razón social, NIT, representante…).
// 2. Acuerdo de confidencialidad y contrato de transmisión de datos: descargar el Word lleno, marcar enviado, registrar
//    la firma (fecha y firmante) y cargar la copia firmada en PDF.
// 3. Registro de aceptaciones: quién aceptó la política de tratamiento y el compromiso de confidencialidad, con qué
//    versión y cuándo (prueba de la autorización que exige la ley). Se descarga en CSV.

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Download, ExternalLink, FileSignature, FileText, Loader2, Save, Send, Upload, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { avisar } from "@/components/feedback";
import { useCatalog } from "@/components/catalog-context";
import { fechaLarga } from "@/lib/legal/base";
import { CAMPOS_FIRMA, ESTADOS_ACUERDO, type Acuerdos, type AcuerdoId, type DatosEmpresaFirma, type RegistroAcuerdo } from "@/lib/legal/acuerdos";
import { downloadCsv } from "@/lib/csv";

type Modelo = { id: string; corto: string; version: string; resumen: string };
type Aceptacion = { email: string; name: string; role: string; active: boolean; consentAt: string | null; consentVersion: string | null; vigente: boolean; membresia: boolean };
type Datos = { acuerdos: Acuerdos; datos: DatosEmpresaFirma; modelos: Modelo[]; vigente: string; aceptaciones: Aceptacion[] };

const ROL: Record<string, string> = { ADMIN: "Admin", CONSULTOR: "Consultor", LIDER: "Líder", RESPONSABLE: "Responsable", DIRECTIVO: "Directivo" };
const hoy = () => new Date().toISOString().slice(0, 10);
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function Estado({ r }: { r?: RegistroAcuerdo }) {
  const e = r?.estado ?? "pendiente";
  const st = e === "firmado" ? { bg: "var(--good-wash, #e7f6ee)", fg: "var(--good-text, #146c43)", I: CheckCircle2 } : e === "enviado" ? { bg: "var(--gold-wash, #fbf3e2)", fg: "var(--gold-text, #8a6212)", I: Send } : { bg: "var(--surface-2)", fg: "var(--muted)", I: Clock };
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: st.bg, color: st.fg }}><st.I size={12} /> {ESTADOS_ACUERDO.find((x) => x.id === e)?.label}</span>;
}

export function AcuerdosTab() {
  const v = useCatalog();
  const empresa = v.catalog.company.name;
  const [d, setD] = useState<Datos | null>(null);
  const [form, setForm] = useState<DatosEmpresaFirma>({});
  const [cambios, setCambios] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<{ doc: AcuerdoId; fecha: string; firmante: string } | null>(null);
  const subir = useRef<HTMLInputElement>(null);
  const [subirDoc, setSubirDoc] = useState<AcuerdoId | null>(null);

  const cargar = async () => {
    const r = await fetch("/api/td/acuerdos", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
    setD(j); setForm(j.datos ?? {}); setCambios(false);
  };
  useEffect(() => { void cargar(); }, []);

  const put = async (body: unknown, ok: string) => {
    setError(null);
    const r = await fetch("/api/td/acuerdos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return false; }
    avisar(ok); await cargar(); return true;
  };
  const guardarDatos = async () => { setBusy("datos"); await put({ datos: form }, "Datos de los acuerdos guardados."); setBusy(null); };
  const marcar = async (doc: AcuerdoId, estado: "pendiente" | "enviado") => { setBusy(doc); await put({ doc, estado }, estado === "enviado" ? "Marcado como enviado para firma." : "Marcado como pendiente."); setBusy(null); };
  const registrarFirma = async () => {
    if (!firma) return;
    setBusy(firma.doc);
    if (await put({ doc: firma.doc, estado: "firmado", fecha: firma.fecha, firmante: firma.firmante }, "Firma registrada.")) setFirma(null);
    setBusy(null);
  };
  const cargarPdf = async (f: File) => {
    if (!subirDoc) return;
    setBusy(subirDoc); setError(null);
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch(`/api/td/acuerdos/${subirDoc}/firmado`, { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error ?? `Error ${r.status}`); else { avisar("Copia firmada cargada."); await cargar(); }
    setBusy(null); setSubirDoc(null);
  };

  const resumen = useMemo(() => {
    const act = (d?.aceptaciones ?? []).filter((a) => a.active);
    return { total: act.length, vigentes: act.filter((a) => a.vigente).length };
  }, [d]);
  const csv = () => {
    if (!d) return;
    downloadCsv(`Aceptaciones · ${empresa} · ${hoy()}`, ["Nombre", "Correo", "Rol", "Estado de la cuenta", "Versión aceptada", "Fecha de aceptación", "Al día"],
      d.aceptaciones.map((a) => [a.name, a.email, ROL[a.role] ?? a.role, a.active ? "Activa" : "Inactiva", a.consentVersion ?? "", a.consentAt ? new Date(a.consentAt).toISOString() : "", a.vigente ? "Sí" : "No"]));
  };

  if (!d) return error ? <p className="text-[13px]" style={{ color: "var(--bad-text)" }}>{error}</p> : <p className="text-[13px] text-muted">Cargando los acuerdos…</p>;
  const acuerdos = d.modelos.filter((m) => m.id !== "compromiso") as (Modelo & { id: AcuerdoId })[];
  const compromiso = d.modelos.find((m) => m.id === "compromiso");

  return (
    <div className="space-y-5">
      <input ref={subir} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void cargarPdf(f); }} />

      <Card className="rise">
        <CardHeader title={`Acuerdos con ${empresa}`} sub="Algoritmo T y la empresa firman un acuerdo de confidencialidad y un contrato de transmisión de datos personales antes de cargar información. Aquí se descargan llenos, se registra la firma y se guarda la copia firmada." />
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
          {acuerdos.map((m) => {
            const r = d.acuerdos.docs?.[m.id];
            const viejo = r?.version && r.version !== m.version;
            return (
              <div key={m.id} className="flex flex-col rounded-xl border border-line bg-surface px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-cyan-deep"><FileSignature size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-[14px] font-extrabold text-ink">{m.corto}</h3><Estado r={r} /></div>
                    <p className="mt-1 text-[12px] leading-snug text-muted">{m.resumen}</p>
                  </div>
                </div>
                <dl className="mt-3 grid gap-1 text-[12px] text-ink-soft">
                  <div><dt className="inline text-faint">Modelo vigente: </dt><dd className="inline">versión del {fechaLarga(m.version)}</dd></div>
                  {r?.estado === "firmado" && <div><dt className="inline text-faint">Firmado: </dt><dd className="inline">{fechaLarga(r.fecha!)} por {r.firmante}</dd></div>}
                  {r && r.estado !== "pendiente" && <div><dt className="inline text-faint">Registró: </dt><dd className="inline">{r.by} · {fechaHora(r.at)}</dd></div>}
                  {r?.archivo && <div><dt className="inline text-faint">Copia firmada: </dt><dd className="inline">{r.archivo.name} ({Math.max(1, Math.round(r.archivo.size / 1024))} KB)</dd></div>}
                  {viejo && <div className="text-[11.5px] font-semibold" style={{ color: "var(--gold-text)" }}>Se firmó la versión {r.version}; hay un modelo más reciente.</div>}
                </dl>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  <a href={`/api/td/acuerdos/${m.id}`} className="btn-ghost btn-sm text-[12px]"><Download size={13} /> Word lleno</a>
                  {r?.estado !== "enviado" && r?.estado !== "firmado" && <button type="button" disabled={busy === m.id} onClick={() => void marcar(m.id, "enviado")} className="btn-ghost btn-sm text-[12px] disabled:opacity-50"><Send size={13} /> Marcar enviado</button>}
                  <button type="button" disabled={busy === m.id} onClick={() => setFirma({ doc: m.id, fecha: r?.fecha ?? hoy(), firmante: r?.firmante ?? form.representante_cliente ?? "" })} className="btn-ghost btn-sm text-[12px] disabled:opacity-50"><CheckCircle2 size={13} /> {r?.estado === "firmado" ? "Corregir firma" : "Registrar firma"}</button>
                  <button type="button" disabled={busy === m.id} onClick={() => { setSubirDoc(m.id); subir.current?.click(); }} className="btn-ghost btn-sm text-[12px] disabled:opacity-50">{busy === m.id && subirDoc === m.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {r?.archivo ? "Reemplazar PDF" : "Cargar PDF firmado"}</button>
                  {r?.archivo && <a href={`/api/td/acuerdos/${m.id}/firmado`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm text-[12px]"><FileText size={13} /> Ver PDF</a>}
                  {r?.estado === "enviado" && <button type="button" disabled={busy === m.id} onClick={() => void marcar(m.id, "pendiente")} className="text-[12px] font-semibold text-muted hover:text-ink">Volver a pendiente</button>}
                </div>
                {firma?.doc === m.id && (
                  <div className="mt-3 grid gap-2 rounded-xl bg-surface-2/70 px-3 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-end">
                    <label className="text-[12px] text-muted">Fecha de firma<input type="date" max={hoy()} value={firma.fecha} onChange={(e) => setFirma({ ...firma, fecha: e.target.value })} className="input mt-0.5 w-full text-[12.5px]" /></label>
                    <label className="text-[12px] text-muted">Firmó por la empresa<input value={firma.firmante} onChange={(e) => setFirma({ ...firma, firmante: e.target.value })} placeholder="Nombre y cargo" className="input mt-0.5 w-full text-[12.5px]" /></label>
                    <span className="flex gap-1.5"><button type="button" onClick={() => setFirma(null)} className="btn-ghost btn-sm text-[12px]">Cancelar</button><button type="button" onClick={() => void registrarFirma()} disabled={busy === m.id} className="btn-primary btn-sm text-[12px] disabled:opacity-50">Guardar</button></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rise rise-1">
        <CardHeader title="Datos de la empresa para los acuerdos" sub="se usan al descargar el Word lleno; lo que falte queda como espacio para completar a mano"
          right={<button type="button" onClick={() => void guardarDatos()} disabled={!cambios || busy === "datos"} className="btn-primary btn-sm text-[12px] disabled:opacity-50">{busy === "datos" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar</button>} />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          {CAMPOS_FIRMA.map((c) => (
            <label key={c.key} className="text-[12px] text-muted">{c.label}
              <input value={form[c.key] ?? ""} placeholder={c.ph} onChange={(e) => { setForm({ ...form, [c.key]: e.target.value }); setCambios(true); }} className="input mt-0.5 w-full text-[13px]" type={c.key === "correo_cliente" ? "email" : "text"} />
            </label>
          ))}
        </div>
      </Card>

      <Card className="rise rise-2">
        <CardHeader title="Registro de aceptaciones" sub={`prueba de la autorización de cada persona: política de tratamiento de datos y compromiso de confidencialidad, versión vigente ${d.vigente}`}
          right={<span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-ink">{resumen.vigentes} de {resumen.total} cuentas activas al día</span>
            <button type="button" onClick={csv} className="btn-ghost btn-sm text-[12px]"><Download size={13} /> CSV</button>
          </span>} />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-[0.08em] text-faint"><th className="py-2 pr-3 font-bold">Persona</th><th className="py-2 pr-3 font-bold">Rol</th><th className="py-2 pr-3 font-bold">Versión aceptada</th><th className="py-2 pr-3 font-bold">Fecha</th><th className="py-2 font-bold">Estado</th></tr></thead>
            <tbody>
              {d.aceptaciones.map((a) => (
                <tr key={a.email} className="border-t border-line" style={a.active ? undefined : { opacity: 0.55 }}>
                  <td className="py-2 pr-3"><div className="font-semibold text-ink">{a.name}</div><div className="text-[11.5px] text-muted">{a.email}{a.membresia ? " · también en otra empresa" : ""}</div></td>
                  <td className="py-2 pr-3 text-ink-soft">{ROL[a.role] ?? a.role}</td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-ink-soft">{a.consentVersion ?? (a.consentAt ? "anterior" : "—")}</td>
                  <td className="py-2 pr-3 text-ink-soft">{a.consentAt ? fechaHora(a.consentAt) : "—"}</td>
                  <td className="py-2">{a.vigente ? <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: "var(--good-text, #146c43)" }}><ShieldCheck size={13} /> Al día</span> : <span className="text-[12px] text-muted">{a.consentAt ? "Debe aceptar la nueva versión al entrar" : "Aún no ha entrado"}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rise rise-3">
        <CardHeader title="Documentos de referencia" sub="públicos en el centro de confianza; el compromiso se firma además con cada consultor del equipo" />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm text-[12px]"><ExternalLink size={13} /> Política de tratamiento</a>
          <a href="/seguridad" target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm text-[12px]"><ExternalLink size={13} /> Política de seguridad</a>
          <a href="/legal" target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm text-[12px]"><ExternalLink size={13} /> Centro de confianza</a>
          {compromiso && <a href="/api/td/acuerdos/compromiso" className="btn-ghost btn-sm text-[12px]"><Download size={13} /> Compromiso para consultores (Word)</a>}
        </div>
      </Card>
      {error && <p className="text-[12.5px]" style={{ color: "var(--bad-text)" }}>{error}</p>}
    </div>
  );
}
