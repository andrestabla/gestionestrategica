"use client";

// Mi perfil: datos básicos, cambio de contraseña y eliminación de la cuenta con toda su información
// (derechos del titular de los datos: conocer, actualizar, rectificar y suprimir).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader, Field, Modal } from "@/components/ui";
import { useUser } from "@/components/user-context";
import { avisar, confirmarGuardar } from "@/components/feedback";
import { consentRights } from "@/lib/consentimiento";
import { UserCircle2, KeyRound, Trash2, Loader2, Save, ShieldCheck, AlertTriangle } from "lucide-react";

type Perfil = { email: string; name: string; role: string; consentAt: string | null; company: string | null; tienePassword: boolean; esAdmin: boolean };
const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin de la plataforma", CONSULTOR: "Consultor 4Shine Empresas", LIDER: "Líder de la empresa", RESPONSABLE: "Responsable de ámbito", DIRECTIVO: "Junta o directivo" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init ? { ...init, headers: { "Content-Type": "application/json" } } : undefined);
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error ?? `Error ${res.status}`);
  return j as T;
}

export default function PerfilPage() {
  const me = useUser();
  const router = useRouter();
  const [p, setP] = useState<Perfil | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [actual, setActual] = useState(""); const [nueva, setNueva] = useState(""); const [repite, setRepite] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [borrar, setBorrar] = useState(false);
  useEffect(() => {
    let vivo = true;
    api<Perfil>("/api/td/perfil").then((j) => { if (vivo) { setP(j); setName(j.name); } }).catch((e) => { if (vivo) avisar((e as Error).message, "warn"); });
    return () => { vivo = false; };
  }, []);

  const guardar = async () => {
    if (!(await confirmarGuardar("tus datos"))) return;
    setSaving(true);
    try { const r = await api<{ name: string }>("/api/td/perfil", { method: "PATCH", body: JSON.stringify({ name }) }); setP((x) => x ? { ...x, name: r.name } : x); avisar("Datos actualizados"); router.refresh(); }
    catch (e) { avisar((e as Error).message, "warn"); }
    setSaving(false);
  };
  const cambiar = async () => {
    if (nueva !== repite) { avisar("La contraseña nueva y su repetición no coinciden.", "warn"); return; }
    if (!(await confirmarGuardar("la nueva contraseña"))) return;
    setCambiando(true);
    try { await api("/api/td/perfil/contrasena", { method: "POST", body: JSON.stringify({ actual, nueva }) }); avisar("Contraseña cambiada"); setActual(""); setNueva(""); setRepite(""); setP((x) => x ? { ...x, tienePassword: true } : x); }
    catch (e) { avisar((e as Error).message, "warn"); }
    setCambiando(false);
  };

  return (
    <>
      <PageHeader kicker="Mi perfil" title={p?.name ?? me.name} desc="Tus datos básicos, tu contraseña y el control sobre tu información en la plataforma." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-1">
          <CardHeader title="Datos básicos" sub="lo que la plataforma muestra de ti" />
          <div className="space-y-3 px-5 pb-5">
            <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="input !py-2 text-[13px]" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Correo (acceso)"><input value={p?.email ?? me.email} disabled className="input !py-2 text-[13px] opacity-70" /></Field>
              <Field label="Rol"><input value={ROLE_LABEL[p?.role ?? me.role] ?? me.role} disabled className="input !py-2 text-[13px] opacity-70" /></Field>
            </div>
            {p?.company && <p className="text-[12.5px] text-muted">Empresa: <b className="text-ink">{p.company}</b>. El correo y el rol los administra el advisor o el administrador.</p>}
            {p?.consentAt && <p className="flex items-center gap-1.5 text-[12px] text-faint"><ShieldCheck size={12} className="text-ok" /> Política de tratamiento de datos aceptada el {new Date(p.consentAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.</p>}
            <div className="flex justify-end"><button type="button" onClick={guardar} disabled={saving || !p || name.trim() === p.name || name.trim().length < 2} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar</button></div>
          </div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Contraseña" sub={p?.tienePassword ? "cámbiala cuando quieras; mínimo 10 caracteres" : "tu cuenta aún no tiene contraseña: fija una para entrar sin el enlace"} />
          <div className="space-y-3 px-5 pb-5">
            {p?.tienePassword && <Field label="Contraseña actual"><input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className="input !py-2 text-[13px]" /></Field>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contraseña nueva"><input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" className="input !py-2 text-[13px]" /></Field>
              <Field label="Repite la nueva"><input type="password" value={repite} onChange={(e) => setRepite(e.target.value)} autoComplete="new-password" className="input !py-2 text-[13px]" /></Field>
            </div>
            <div className="flex justify-end"><button type="button" onClick={cambiar} disabled={cambiando || nueva.length < 10 || (p?.tienePassword && !actual)} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:opacity-40">{cambiando ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} {p?.tienePassword ? "Cambiar contraseña" : "Fijar contraseña"}</button></div>
          </div>
        </Card>
      </div>
      <Card className="rise rise-3 mt-5">
        <CardHeader title="Tu información en la plataforma" sub="derechos del titular de los datos" />
        <div className="px-5 pb-5">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">{consentRights()}</p>
          {p?.esAdmin
            ? <p className="mt-3 text-[12.5px] text-muted">La cuenta de administrador de la plataforma no se elimina desde aquí.</p>
            : <button type="button" onClick={() => setBorrar(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-[12.5px] font-bold text-bad-text transition-colors hover:bg-bad/10"><Trash2 size={13} /> Eliminar mi cuenta</button>}
        </div>
      </Card>
      {borrar && p && <EliminarCuenta tienePassword={p.tienePassword} onClose={() => setBorrar(false)} />}
    </>
  );
}

function EliminarCuenta({ tienePassword, onClose }: { tienePassword: boolean; onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const listo = tienePassword ? password.length > 0 : confirm.trim().toUpperCase() === "ELIMINAR";
  const eliminar = async () => {
    setBusy(true); setError(null);
    try {
      await api("/api/td/perfil", { method: "DELETE", body: JSON.stringify(tienePassword ? { password } : { confirm }) });
      router.push("/login"); router.refresh();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <Modal variante="dialogo" title="Eliminar mi cuenta" sub="esta acción no se puede deshacer" onClose={onClose}>
      <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] leading-relaxed text-ink" style={{ background: "color-mix(in srgb, var(--bad) 10%, var(--surface))" }}>
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bad-text" />
        <span>Se borrará <b>toda tu información</b> de la plataforma: tu cuenta y acceso, tus respuestas de diagnóstico (autoevaluación, test), tu análisis con IA, tus evaluaciones de iniciativas y tus notificaciones. Lo que pertenece a la empresa y no puede borrarse sin romper su historia (decisiones, comentarios, registro de actividad) queda anonimizado: tu nombre y tu correo desaparecen de ahí.</span>
      </div>
      <div className="mt-4">
        {tienePassword
          ? <Field label="Confirma con tu contraseña"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="input !py-2 text-[13px]" /></Field>
          : <Field label="Escribe ELIMINAR para confirmar"><input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input !py-2 text-[13px]" /></Field>}
      </div>
      {error && <p className="mt-3 text-[12.5px] text-bad-text">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost text-[12.5px]">Cancelar</button>
        <button type="button" onClick={eliminar} disabled={!listo || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-bad px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Eliminar definitivamente</button>
      </div>
    </Modal>
  );
}
