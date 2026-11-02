"use client";

// Administración → Correos: gestor de correos salientes. Tres bloques: redactar y enviar un correo nuevo
// (directo a correos sueltos o grupal a las cuentas de una empresa), las plantillas parametrizables de los
// correos automáticos (creación de cuenta y olvido de contraseña) con vista previa, y el historial de envíos.

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, Modal, Field, ResponsiveTable } from "@/components/ui";
import { useUser } from "@/components/user-context";
import { confirmar, avisar } from "@/components/feedback";
import { renderPlantilla, renderLibre, SAMPLE_VARS, type MailTemplate, type MailTemplateKey } from "@/lib/plantillas-correo";
import { Send, Loader2, Eye, RotateCcw, Save, Mail, Users2, AtSign, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

type PlantillaApi = { key: MailTemplateKey; nombre: string; descripcion: string; variables: { id: string; desc: string }[]; predeterminada: MailTemplate; actual: MailTemplate; editada: boolean; updatedBy: string | null; at: string | null };
type Envio = { id: string; at: string; by: string; companySlug: string | null; kind: string; to: string; subject: string; status: "enviado" | "error" | "sin-config"; error?: string };
type EmpresaLite = { slug: string; name: string; active: boolean };
type Destinatario = { email: string; name: string; role: string };

const ROLES: { id: string; label: string }[] = [{ id: "LIDER", label: "Líder" }, { id: "DIRECTIVO", label: "Junta o directivo" }, { id: "RESPONSABLE", label: "Responsable" }, { id: "CONSULTOR", label: "Advisor" }, { id: "ADMIN", label: "Admin" }];
const KIND_LABEL: Record<string, string> = { bienvenida: "Cuenta nueva", restablecer: "Contraseña", directo: "Directo", grupal: "Grupal" };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init ? { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } } : undefined);
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error ?? `Error ${res.status}`);
  return j as T;
}

export function CorreosTab() {
  const me = useUser();
  const [envios, setEnvios] = useState<Envio[] | null>(null);
  const [configurado, setConfigurado] = useState(true);
  const [empresas, setEmpresas] = useState<EmpresaLite[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [tick, setTick] = useState(0);
  const cargar = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let vivo = true;
    api<{ envios: Envio[]; configurado: boolean; empresas: EmpresaLite[] }>(`/api/td/correos${filtro ? `?empresa=${encodeURIComponent(filtro)}` : ""}`)
      .then((j) => { if (vivo) { setEnvios(j.envios); setConfigurado(j.configurado); setEmpresas(j.empresas); } })
      .catch((e) => { if (vivo) { avisar((e as Error).message, "warn"); setEnvios([]); } });
    return () => { vivo = false; };
  }, [filtro, tick]);

  return (
    <div className="space-y-5">
      {!configurado && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px] leading-snug text-ink-soft" style={{ background: "var(--gold-wash)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--gold-text)" }} />
          <span><b className="text-ink">El envío de correo no está configurado.</b> Completa AWS SES en Administración → Integraciones (o las variables del despliegue). Las plantillas se pueden editar y previsualizar igual.</span>
        </div>
      )}
      <NuevoCorreo empresas={empresas} esAdmin={me.role === "ADMIN"} miEmpresa={me.company ?? null} configurado={configurado} onEnviado={() => cargar()} />
      <Plantillas />
      <Card className="rise rise-3">
        <CardHeader title="Historial de envíos" sub="todo correo que sale de la plataforma queda aquí: automáticos (cuenta nueva, contraseña) y manuales (directos y grupales)"
          right={<div className="flex items-center gap-2">
            {me.role === "ADMIN" && <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="input !py-1.5 text-[12px]"><option value="">Todas las empresas</option>{empresas.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
            <button type="button" onClick={() => cargar()} className="btn-ghost btn-sm" title="Actualizar"><RefreshCw size={13} /></button>
          </div>} />
        <div className="px-2 pb-3">
          <ResponsiveTable<Envio> rows={envios ?? []} rowKey={(e) => e.id} empty={envios === null ? "Cargando…" : "Aún no hay envíos registrados."} columns={[
            { key: "at", header: "Fecha", priority: 2, cell: (e) => <span className="num text-muted">{fecha(e.at)}</span> },
            { key: "kind", header: "Tipo", priority: 2, cell: (e) => <span className="chip !py-0 text-[11px]">{KIND_LABEL[e.kind] ?? e.kind}</span> },
            { key: "to", header: "Para", priority: 1, cell: (e) => <span className="font-semibold text-ink">{e.to}</span> },
            { key: "subject", header: "Asunto", priority: 1, cell: (e) => <span className="text-ink-soft" title={e.subject}>{e.subject.length > 60 ? `${e.subject.slice(0, 60)}…` : e.subject}</span> },
            { key: "companySlug", header: "Empresa", priority: 3, cell: (e) => <span className="text-muted">{e.companySlug ?? "—"}</span> },
            { key: "by", header: "Origen", priority: 3, cell: (e) => <span className="text-muted">{e.by}</span> },
            { key: "status", header: "Estado", priority: 1, cell: (e) => e.status === "enviado" ? <span className="chip chip-ok !py-0 text-[11px]"><CheckCircle2 size={10} className="mr-1 inline" />enviado</span> : <span className="chip chip-bad !py-0 text-[11px]" title={e.error}>{e.status === "sin-config" ? "sin configurar" : "error"}</span> },
          ]} />
        </div>
      </Card>
    </div>
  );
}

/* ═══ Correo nuevo: directo o grupal ═══ */
function NuevoCorreo({ empresas, esAdmin, miEmpresa, configurado, onEnviado }: { empresas: EmpresaLite[]; esAdmin: boolean; miEmpresa: { slug: string; name: string } | null; configurado: boolean; onEnviado: () => void }) {
  const [modo, setModo] = useState<"directo" | "empresa">("directo");
  const [para, setPara] = useState("");
  const [empresa, setEmpresa] = useState(miEmpresa?.slug ?? "");
  const [roles, setRoles] = useState<string[]>([]);
  const [destDe, setDestDe] = useState<{ slug: string; usuarios: Destinatario[] } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hola {{nombre}},\n\n");
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ enviados: string[]; fallidos: { to: string; error: string }[] } | null>(null);
  const slugActivo = esAdmin ? empresa : (miEmpresa?.slug ?? "");
  useEffect(() => {
    if (modo !== "empresa" || !slugActivo) return;
    let vivo = true;
    api<{ usuarios: Destinatario[] }>(`/api/td/correos/destinatarios?empresa=${encodeURIComponent(slugActivo)}`).then((j) => { if (vivo) setDestDe({ slug: slugActivo, usuarios: j.usuarios }); }).catch((e) => { if (vivo) { setDestDe({ slug: slugActivo, usuarios: [] }); avisar((e as Error).message, "warn"); } });
    return () => { vivo = false; };
  }, [modo, slugActivo]);
  const dest = destDe && destDe.slug === slugActivo ? destDe.usuarios : null;
  const elegidos = (dest ?? []).filter((u) => !roles.length || roles.includes(u.role));
  const nombreEmpresa = (esAdmin ? empresas.find((c) => c.slug === slugActivo)?.name : miEmpresa?.name) ?? "";
  const nDirectos = para.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean).length;
  const listo = subject.trim().length > 0 && body.trim().length > 0 && (modo === "directo" ? nDirectos > 0 : elegidos.length > 0);

  const vistaPrevia = () => {
    const vars = modo === "empresa" && elegidos[0] ? { nombre: elegidos[0].name, empresa: nombreEmpresa, correo: elegidos[0].email } : { nombre: "Ana Gómez", empresa: nombreEmpresa || "4Shine Empresas", correo: "ana.gomez@ejemplo.com" };
    setPreview(renderLibre({ subject, body }, { ...vars, enlace: `https://gestionestrategica.io${slugActivo ? `/${slugActivo}` : ""}/login` }, { company: nombreEmpresa || undefined }).html);
  };
  const enviar = async () => {
    const n = modo === "directo" ? nDirectos : elegidos.length;
    if (!(await confirmar(`¿Enviar «${subject.trim()}» a ${n} ${n === 1 ? "destinatario" : "destinatarios"}${modo === "empresa" ? ` de ${nombreEmpresa}` : ""}? El envío es inmediato y no se puede deshacer.`))) return;
    setEnviando(true); setResultado(null);
    try {
      const r = await api<{ enviados: string[]; fallidos: { to: string; error: string }[] }>("/api/td/correos", { method: "POST", body: JSON.stringify(modo === "directo" ? { modo, para, subject, body } : { modo, empresa: slugActivo, roles, subject, body }) });
      setResultado(r); avisar(r.fallidos.length ? `${r.enviados.length} enviados · ${r.fallidos.length} con error` : `${r.enviados.length} ${r.enviados.length === 1 ? "correo enviado" : "correos enviados"}`, r.fallidos.length ? "warn" : undefined);
      if (!r.fallidos.length) { setSubject(""); setBody("Hola {{nombre}},\n\n"); setPara(""); }
      onEnviado();
    } catch (e) { avisar((e as Error).message, "warn"); }
    setEnviando(false);
  };

  return (
    <Card className="rise rise-1">
      <CardHeader title="Correo nuevo" sub="directo a uno o varios correos, o grupal a las cuentas activas de una empresa · con la cabecera y el pie de la plataforma" />
      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div className="flex rounded-xl bg-surface-2 p-1">
            {([["directo", "Directo", AtSign], ["empresa", "Por empresa", Users2]] as const).map(([id, l, Icon]) => (
              <button key={id} type="button" onClick={() => setModo(id)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold transition-colors ${modo === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}><Icon size={13} /> {l}</button>
            ))}
          </div>
          {modo === "directo" ? (
            <Field label="Destinatarios" help="Uno por línea o separados por coma. Si el correo es de una cuenta de la empresa activa, el mensaje se personaliza con su nombre.">
              <textarea value={para} onChange={(e) => setPara(e.target.value)} rows={5} placeholder={"ana@empresa.com\ncarlos@empresa.com"} className="input !py-2 text-[12.5px]" />
            </Field>
          ) : (
            <>
              {esAdmin ? (
                <Field label="Empresa"><select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="input !py-2 text-[12.5px]"><option value="">Elige una empresa…</option>{empresas.filter((c) => c.active).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
              ) : <div className="text-[12.5px] text-ink-soft">Empresa: <b className="text-ink">{miEmpresa?.name ?? "—"}</b></div>}
              <div>
                <span className="label !text-[11px]">Roles (vacío = todos)</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{ROLES.map((r) => <button key={r.id} type="button" onClick={() => setRoles((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])} className={`chip ${roles.includes(r.id) ? "chip-cyan" : ""}`}>{r.label}</button>)}</div>
              </div>
              <div className="rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-[12.5px]">
                {dest === null ? <span className="text-muted">{slugActivo ? "Cargando cuentas…" : "Elige la empresa para ver sus cuentas."}</span> : <><b className="text-ink">{elegidos.length}</b> <span className="text-ink-soft">{elegidos.length === 1 ? "cuenta activa recibirá el correo" : "cuentas activas recibirán el correo"}</span>{elegidos.length > 0 && <div className="mt-1.5 max-h-28 overflow-auto text-[12px] text-muted">{elegidos.map((u) => <div key={u.email}>{u.name} · {u.email}</div>)}</div>}</>}
              </div>
            </>
          )}
        </div>
        <div className="space-y-3">
          <Field label="Asunto"><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="p. ej. Sesión de trabajo del 12 de noviembre" className="input !py-2 text-[13px]" /></Field>
          <Field label="Mensaje" help="Variables: {{nombre}}, {{empresa}}, {{correo}}. Párrafos separados por línea en blanco; «[[Entrar a la plataforma]]» en una línea crea el botón al acceso de la empresa; las líneas que empiezan por «> » van en un recuadro.">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={6000} className="input !py-2 font-mono text-[12.5px] leading-relaxed" />
          </Field>
          {resultado && (
            <div className="rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-[12.5px]">
              <div className="text-ink"><CheckCircle2 size={12} className="mr-1 inline text-ok" />{resultado.enviados.length} enviados{resultado.enviados.length ? `: ${resultado.enviados.slice(0, 6).join(", ")}${resultado.enviados.length > 6 ? "…" : ""}` : ""}</div>
              {resultado.fallidos.map((f) => <div key={f.to} className="mt-1 text-bad-text"><AlertTriangle size={12} className="mr-1 inline" />{f.to}: {f.error}</div>)}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={vistaPrevia} disabled={!subject.trim() || !body.trim()} className="btn-ghost inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40"><Eye size={13} /> Vista previa</button>
            <button type="button" onClick={enviar} disabled={!listo || enviando || !configurado} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">{enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar{modo === "directo" ? nDirectos ? ` a ${nDirectos}` : "" : elegidos.length ? ` a ${elegidos.length}` : ""}</button>
          </div>
        </div>
      </div>
      {preview && <VistaPrevia html={preview} onClose={() => setPreview(null)} />}
    </Card>
  );
}

/* ═══ Plantillas de los correos automáticos ═══ */
function Plantillas() {
  const [plantillas, setPlantillas] = useState<PlantillaApi[] | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [tick, setTick] = useState(0);
  const cargar = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let vivo = true;
    api<{ plantillas: PlantillaApi[]; puedeEditar: boolean }>("/api/td/correos/plantillas")
      .then((j) => { if (vivo) { setPlantillas(j.plantillas); setPuedeEditar(j.puedeEditar); } })
      .catch((e) => { if (vivo) { avisar((e as Error).message, "warn"); setPlantillas([]); } });
    return () => { vivo = false; };
  }, [tick]);
  return (
    <Card className="rise rise-2">
      <CardHeader title="Plantillas de los correos automáticos" sub={puedeEditar ? "asunto, título y cuerpo con variables; se guardan para toda la plataforma y se pueden restaurar" : "las edita el administrador de la plataforma; aquí se consultan y previsualizan"} />
      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
        {plantillas === null && <p className="text-[12.5px] text-muted">Cargando…</p>}
        {plantillas?.map((p) => <PlantillaCard key={`${p.key}-${p.at ?? "predeterminada"}`} p={p} puedeEditar={puedeEditar} onSaved={cargar} />)}
      </div>
    </Card>
  );
}

function PlantillaCard({ p, puedeEditar, onSaved }: { p: PlantillaApi; puedeEditar: boolean; onSaved: () => void }) {
  const [t, setT] = useState<MailTemplate>(p.actual);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const cambiada = t.subject !== p.actual.subject || t.title !== p.actual.title || t.body !== p.actual.body;
  const guardar = async () => {
    setSaving(true);
    try { await api("/api/td/correos/plantillas", { method: "PUT", body: JSON.stringify({ key: p.key, ...t }) }); avisar("Plantilla guardada"); onSaved(); }
    catch (e) { avisar((e as Error).message, "warn"); }
    setSaving(false);
  };
  const restaurar = async () => {
    if (!(await confirmar(`¿Restaurar la plantilla «${p.nombre}» a la predeterminada? Se pierde lo editado.`))) return;
    setSaving(true);
    try { await api("/api/td/correos/plantillas", { method: "PUT", body: JSON.stringify({ key: p.key, restaurar: true }) }); avisar("Plantilla restaurada"); onSaved(); }
    catch (e) { avisar((e as Error).message, "warn"); }
    setSaving(false);
  };
  const insertar = (v: string) => setT((x) => ({ ...x, body: `${x.body}${x.body.endsWith("\n") || !x.body ? "" : " "}{{${v}}}` }));
  return (
    <div className="rounded-xl border border-line px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><div className="flex items-center gap-2 text-[14px] font-extrabold text-ink"><Mail size={14} className="text-cyan-deep" /> {p.nombre}{p.editada && <span className="chip chip-gold !py-0 text-[11px]">editada</span>}</div><p className="mt-0.5 text-[12px] text-muted">{p.descripcion}</p></div>
        {p.editada && p.at && <span className="text-[11.5px] text-faint">por {p.updatedBy} · {fecha(p.at)}</span>}
      </div>
      <div className="mt-3 space-y-2.5">
        <Field label="Asunto"><input value={t.subject} onChange={(e) => setT({ ...t, subject: e.target.value })} disabled={!puedeEditar} maxLength={200} className="input !py-2 text-[12.5px]" /></Field>
        <Field label="Título (encabezado del correo)"><input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} disabled={!puedeEditar} maxLength={120} className="input !py-2 text-[12.5px]" /></Field>
        <Field label="Cuerpo"><textarea value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} disabled={!puedeEditar} rows={11} maxLength={6000} className="input !py-2 font-mono text-[12px] leading-relaxed" /></Field>
        <div>
          <span className="label !text-[11px]">Variables</span>
          <div className="mt-1 flex flex-wrap gap-1.5">{p.variables.map((v) => <button key={v.id} type="button" disabled={!puedeEditar} onClick={() => insertar(v.id)} className="chip" title={v.desc}><span className="num">{`{{${v.id}}}`}</span></button>)}</div>
          <p className="mt-1.5 text-[11.5px] leading-snug text-faint">«[[Texto]]» en una línea propia crea el botón hacia {"{{enlace}}"}; las líneas que empiezan por «&gt; » van en un recuadro.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setPreview(renderPlantilla(t, SAMPLE_VARS[p.key], { company: SAMPLE_VARS[p.key].empresa }).html)} className="btn-ghost inline-flex items-center gap-1.5 text-[12.5px]"><Eye size={13} /> Vista previa</button>
        {puedeEditar && p.editada && <button type="button" onClick={restaurar} disabled={saving} className="btn-ghost inline-flex items-center gap-1.5 text-[12.5px]"><RotateCcw size={13} /> Restaurar</button>}
        {puedeEditar && <button type="button" onClick={guardar} disabled={saving || !cambiada} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar</button>}
      </div>
      {preview && <VistaPrevia html={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function VistaPrevia({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <Modal title="Vista previa del correo" sub="así lo verá quien lo reciba (datos de muestra)" onClose={onClose} wide>
      <iframe title="Vista previa" srcDoc={html} sandbox="" className="h-[70vh] w-full rounded-xl border border-line bg-white" />
    </Modal>
  );
}
