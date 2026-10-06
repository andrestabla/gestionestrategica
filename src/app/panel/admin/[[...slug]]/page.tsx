"use client";

// Módulo de administración (manage_users, solo consultor):
//   /panel/admin/usuarios       → cuentas, roles y estado
//   /panel/admin/permisos       → la matriz RBAC documentada
//   /panel/admin/integraciones  → OpenAI · Cloudflare R2 · AWS SES
//   /panel/admin/branding       → identidad de la plataforma (aplicada en vivo)

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader } from "@/components/ui";
import { AccessChip, useCan, useUser } from "@/components/user-context";
import { LINES } from "@/data/demo";
import { PERMISSION_MATRIX, MODULE_ACTIONS, type Action, type ModuleKey } from "@/lib/permissions";
import { BrandingTab } from "./branding-tab";
import {
  UserPlus, Loader2, AlertTriangle, X, ShieldCheck, Power, PowerOff,
  Users2, KeyRound, Plug, Palette, Check, Minus, Save,
} from "lucide-react";

/* ═══ pestañas con ruta propia ═══ */

type Tab = "usuarios" | "permisos" | "integraciones" | "branding";
const TABS: { id: Tab; label: string; icon: typeof Users2 }[] = [
  { id: "usuarios", label: "Usuarios y roles", icon: Users2 },
  { id: "permisos", label: "Permisos de acceso", icon: KeyRound },
  { id: "integraciones", label: "Integraciones", icon: Plug },
  { id: "branding", label: "Branding", icon: Palette },
];

export default function AdminPage() {
  const me = useUser();
  const canUsers = useCan("manage_users");
  const canPlatform = useCan("manage_platform");
  const router = useRouter();
  const params = useParams<{ slug?: string[] }>();

  // el consultor solo administra usuarios y roles; el admin, todo el módulo
  const visibleTabs = TABS.filter((t) =>
    t.id === "usuarios" ? canUsers : canPlatform);
  const tab: Tab = (visibleTabs.find((t) => t.id === params.slug?.[0])?.id
    ?? visibleTabs[0]?.id ?? "usuarios");

  if (!canUsers && !canPlatform) {
    return (
      <>
        <PageHeader kicker="Administración" title="Usuarios y permisos" />
        <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-muted">
          La administración es del admin de la plataforma (y usuarios/roles, también del consultor). Tu rol ({me.role}) es de {me.role === "DIRECTIVO" ? "consulta" : "operación"}.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader kicker="Administración" title="Administración de la plataforma"
        desc="Cuentas y roles, la matriz de permisos que el servidor exige, las integraciones externas y la identidad visual. Todo cambio queda en la auditoría."
        actions={<AccessChip module="admin" />} />

      <div className="rise mb-6 flex flex-wrap gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {visibleTabs.map((t) => (
          <button key={t.id}
            onClick={() => router.push(`/panel/admin/${t.id}`, { scroll: false })}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${
              tab === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            <t.icon size={14} className={tab === t.id ? "text-cyan-deep" : ""} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "usuarios" && <UsersTab />}
      {tab === "permisos" && <PermisosTab />}
      {tab === "integraciones" && <IntegracionesTab />}
      {tab === "branding" && <BrandingTab />}
    </>
  );
}

/* ═══ Usuarios y roles ═══ */

type ManagedUser = {
  email: string; name: string; role: "ADMIN" | "CONSULTOR" | "LIDER" | "RESPONSABLE" | "DIRECTIVO";
  line?: number; active: boolean; seeded: boolean; createdBy?: string; at?: string;
};

const ROLE_LABEL: Record<ManagedUser["role"], string> = {
  ADMIN: "Admin de la plataforma",
  CONSULTOR: "Consultor Algoritmo T",
  LIDER: "Líder de la empresa",
  RESPONSABLE: "Responsable de capacidad",
  DIRECTIVO: "Directivo",
};

function UsersTab() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/td/users");
    if (res.ok) setUsers((await res.json()).users);
  }, []);
  useEffect(() => { refetch(); }, [refetch]);

  const mutate = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    setSaving(true); setError(null);
    const res = await fetch("/api/td/users", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const ok = res.ok;
    if (!ok) setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
    else await refetch();
    setSaving(false);
    return ok;
  };

  return (
    <>
      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rise rise-1 overflow-hidden">
          <CardHeader title={`Cuentas (${users.length})`}
            sub="los usuarios del seed no se eliminan: se desactivan" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line-strong bg-surface-2/60">
                  {["Usuario", "Rol", "Capacidad", "Estado", ""].map((h) => (
                    <th key={h} className="label whitespace-nowrap px-4 py-2.5 text-left !text-[8.5px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email} className={`border-b border-line last:border-0 ${u.active ? "" : "opacity-45"}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ink">{u.name}</div>
                      <div className="num text-[10px] text-faint">{u.email}{u.seeded ? " · seed" : ` · creado por ${u.createdBy}`}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <select value={u.role} disabled={saving}
                        onChange={(e) => mutate("PATCH", { email: u.email, role: e.target.value })}
                        className="input w-auto !py-1 pr-7 !text-[11.5px]">
                        {(Object.keys(ROLE_LABEL) as ManagedUser["role"][]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {u.role === "RESPONSABLE" ? (
                        <select value={u.line ?? 1} disabled={saving}
                          onChange={(e) => mutate("PATCH", { email: u.email, line: Number(e.target.value) })}
                          className="input w-auto !py-1 pr-7 !text-[11.5px]">
                          {LINES.map((l) => <option key={l.n} value={l.n}>{l.code}</option>)}
                        </select>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`chip ${u.active ? "chip-ok" : "chip-bad"}`}>
                        {u.active ? "Activo" : "Desactivado"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button disabled={saving}
                        onClick={() => mutate("PATCH", { email: u.email, active: !u.active })}
                        title={u.active ? "Desactivar" : "Reactivar"}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
                        {u.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <NewUserCard saving={saving} onCreate={(input) => mutate("POST", input)} />
      </div>

      <p className="mt-5 flex items-start gap-2 text-[10.5px] leading-relaxed text-faint">
        <ShieldCheck size={12} className="mt-0.5 shrink-0" />
        Reglas del servidor: no puedes desactivar tu propia cuenta y debe quedar al menos un
        administrador activo. Contraseña demo compartida (pgtd-demo-2026) — con Auth.js pasa a
        invitación por correo.
      </p>
    </>
  );
}

function NewUserCard({ saving, onCreate }: {
  saving: boolean;
  onCreate: (input: Record<string, unknown>) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ManagedUser["role"]>("RESPONSABLE");
  const [line, setLine] = useState(1);

  return (
    <Card className="rise rise-2 self-start">
      <CardHeader title="Nueva cuenta" sub="nace activa, con la contraseña demo" />
      <div className="space-y-2.5 px-5 pb-5">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo" className="input !py-2 text-[12px]" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.com" className="input !py-2 text-[12px]" />
        <select value={role} onChange={(e) => setRole(e.target.value as ManagedUser["role"])}
          className="input !py-2 text-[12px]">
          {(Object.keys(ROLE_LABEL) as ManagedUser["role"][]).map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        {role === "RESPONSABLE" && (
          <select value={line} onChange={(e) => setLine(Number(e.target.value))}
            className="input !py-2 text-[12px]">
            {LINES.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.name}</option>)}
          </select>
        )}
        <button
          onClick={async () => {
            if (await onCreate({ name, email, role, line: role === "RESPONSABLE" ? line : undefined })) {
              setName(""); setEmail("");
            }
          }}
          disabled={saving || !name.trim() || !email.trim()}
          className="btn-primary w-full !py-2 text-[12.5px] disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          Crear cuenta
        </button>
      </div>
    </Card>
  );
}

/* ═══ Permisos de acceso (la matriz que el servidor exige) ═══ */

const ACTION_DESC: Record<Action, string> = {
  view: "Ver los módulos y sus datos",
  edit_tasks: "Crear, editar, archivar y reprogramar tareas del gestor",
  edit_initiatives: "Avance, factores, bitácora y próximo hito de iniciativas",
  report_kpi: "Registrar valores de KPI (incluida la importación CSV)",
  capture_maturity: "Capturar la medición en curso (percepción de su ámbito)",
  publish_maturity: "Calificar D/I/K y nivel, y publicar mediciones",
  verify_evidence: "Verificar evidencia — la garantía de independencia",
  manage_users: "Administrar usuarios y roles",
  manage_platform: "Integraciones, branding y configuración de la plataforma",
};

const ROLES = ["ADMIN", "CONSULTOR", "LIDER", "RESPONSABLE", "DIRECTIVO"] as const;

function PermisosTab() {
  return (
    <>
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title="Matriz de permisos por acción"
          sub="la exige el servidor en cada mutación (403 con explicación) y la refleja la UI — es la misma fuente en ambas capas" />
        <div className="overflow-x-auto px-5 pb-4">
          <table className="w-full min-w-[680px] text-[12px]">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="label px-2 py-2 text-left !text-[8.5px]">Acción</th>
                {ROLES.map((r) => (
                  <th key={r} className="label px-2 py-2 text-center !text-[8.5px]">{r.toLowerCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERMISSION_MATRIX) as Action[]).map((a) => (
                <tr key={a} className="border-b border-line last:border-0">
                  <td className="px-2 py-2">
                    <div className="num text-[10px] font-bold text-cyan-deep">{a}</div>
                    <div className="text-[11px] leading-snug text-muted">{ACTION_DESC[a]}</div>
                  </td>
                  {ROLES.map((r) => {
                    const grant = PERMISSION_MATRIX[a][r];
                    return (
                      <td key={r} className="px-2 py-2 text-center">
                        {grant === true ? (
                          <Check size={15} className="inline" style={{ color: "var(--ok)" }} />
                        ) : grant === "line" ? (
                          <span className="chip chip-cyan !py-0 !text-[8.5px]">su capacidad</span>
                        ) : (
                          <Minus size={14} className="inline text-faint" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rise rise-2 mt-5">
        <CardHeader title="Qué toca cada módulo" sub="acciones relevantes por módulo (alimenta el chip de acceso)" />
        <div className="grid gap-x-6 gap-y-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(MODULE_ACTIONS) as ModuleKey[]).map((m) => (
            <div key={m} className="rounded-lg bg-surface-2/60 px-3 py-2">
              <div className="text-[12px] font-bold text-ink">{m}</div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {MODULE_ACTIONS[m].map((a) => (
                  <span key={a} className="num chip !py-0 !text-[8px]">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-5 py-2.5 text-[10.5px] text-faint">
          La matriz es código versionado (única fuente de verdad, cubierta por tests). La edición de
          permisos por empresa llega con la fase multi-empresa; hoy los ajustes se hacen por rol.
        </div>
      </Card>
    </>
  );
}

/* ═══ Integraciones ═══ */

type IntegrationUi = {
  key: string; name: string; purpose: string;
  enabled: boolean; configured: boolean; updatedBy?: string; at?: string;
  fields: { key: string; label: string; secret: boolean; placeholder: string; value: string }[];
};

function IntegracionesTab() {
  const [items, setItems] = useState<IntegrationUi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/td/settings");
    if (res.ok) setItems((await res.json()).integrations);
  }, []);
  useEffect(() => { refetch(); }, [refetch]);

  if (!items) {
    return <p className="flex items-center gap-2 text-[13px] text-muted"><Loader2 size={15} className="animate-spin" /> Cargando integraciones…</p>;
  }

  return (
    <>
      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
      <div className="grid gap-5 lg:grid-cols-3">
        {items.map((it, idx) => (
          <IntegrationCard key={it.key} it={it} rise={idx + 1}
            onSaved={refetch} onError={setError} />
        ))}
      </div>
      <p className="mt-5 text-[10.5px] leading-relaxed text-faint">
        Los secretos se validan por formato, se guardan solo en el servidor y vuelven enmascarados
        (últimos 4 caracteres). En local viven en memoria (se limpian con el reset del demo); en
        despliegue pasan a variables de entorno del proveedor.
      </p>
    </>
  );
}

function IntegrationCard({ it, rise, onSaved, onError }: {
  it: IntegrationUi; rise: number;
  onSaved: () => Promise<void>;
  onError: (e: string | null) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft({}); }, [it.at]);

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    onError(null);
    const res = await fetch("/api/td/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integration: { key: it.key, ...body } }),
    });
    if (!res.ok) onError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
    else await onSaved();
    setSaving(false);
  };

  const dirty = Object.keys(draft).length > 0;

  return (
    <Card className={`rise rise-${Math.min(rise, 4)} self-start`}>
      <div className="flex items-start justify-between gap-2 px-5 pb-1 pt-4">
        <div>
          <div className="text-[14px] font-extrabold text-ink">{it.name}</div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">{it.purpose}</p>
        </div>
        <span className={`chip shrink-0 ${it.enabled ? "chip-ok" : it.configured ? "chip-cyan" : ""}`}>
          {it.enabled ? "Activa" : it.configured ? "Configurada" : "Sin configurar"}
        </span>
      </div>
      <div className="space-y-2 px-5 py-3">
        {it.fields.map((f) => (
          <label key={f.key} className="block">
            <span className="label !text-[8.5px]">{f.label}</span>
            <input
              type={f.secret ? "password" : "text"}
              value={draft[f.key] ?? f.value}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              autoComplete="off"
              className="input mt-1 !py-1.5 font-mono !text-[11.5px]" />
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={() => post({ fields: draft })} disabled={saving || !dirty}
            className="btn-primary flex-1 !py-1.5 text-[11.5px] disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
          </button>
          <button onClick={() => post({ enabled: !it.enabled })}
            disabled={saving || (!it.enabled && !it.configured)}
            title={!it.configured && !it.enabled ? "Completa la configuración primero" : undefined}
            className="btn-ghost !py-1.5 text-[11.5px] disabled:opacity-40">
            {it.enabled ? "Desactivar" : "Activar"}
          </button>
        </div>
        {it.updatedBy && (
          <p className="num text-[9px] text-faint">
            Última edición: {it.updatedBy} · {it.at ? new Date(it.at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
          </p>
        )}
      </div>
    </Card>
  );
}

/* ═══ util ═══ */

function ErrorBanner({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="rise mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
      style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>
      <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} />
      <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">{error}</p>
      <button onClick={onClose} className="text-faint hover:text-ink"><X size={14} /></button>
    </div>
  );
}
