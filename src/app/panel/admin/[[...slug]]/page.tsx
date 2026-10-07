"use client";

// Módulo de administración (manage_users, solo consultor):
//   /panel/admin/empresas       → empresas (tenants): crear, editar, desactivar, eliminar
//   /panel/admin/usuarios       → cuentas, roles y estado de la empresa activa
//   /panel/admin/catalogo       → catálogo de la empresa activa (manage_catalog): responsables,
//                                 personas, objetivos, KPI, iniciativas, finanzas y territorio
//   /panel/admin/permisos       → la matriz RBAC documentada
//   /panel/admin/integraciones  → OpenAI · Cloudflare R2 · AWS SES
//   /panel/admin/branding       → identidad de la plataforma (aplicada en vivo)

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader, Modal } from "@/components/ui";
import { AccessChip, useCan, useUser } from "@/components/user-context";
import { useCatalog } from "@/components/catalog-context";
import { CompanyForm, type CompanyLite } from "@/components/company-form";
import { LINES } from "@/data/demo";
import { PERMISSION_MATRIX, MODULE_ACTIONS, type Action, type ModuleKey } from "@/lib/permissions";
import { BrandingTab } from "./branding-tab";
import { CatalogoTab } from "../catalogo-tab";
import {
  UserPlus, Loader2, AlertTriangle, X, ShieldCheck, Power, PowerOff,
  Users2, KeyRound, Plug, Palette, Check, Minus, Save, Building2, Trash2, Pencil, ArrowRightLeft, BookOpen,
} from "lucide-react";

/* ═══ pestañas con ruta propia ═══ */

type Tab = "empresas" | "usuarios" | "catalogo" | "permisos" | "integraciones" | "branding";
const TABS: { id: Tab; label: string; icon: typeof Users2 }[] = [
  { id: "empresas", label: "Empresas", icon: Building2 },
  { id: "usuarios", label: "Usuarios y roles", icon: Users2 },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "permisos", label: "Permisos de acceso", icon: KeyRound },
  { id: "integraciones", label: "Integraciones", icon: Plug },
  { id: "branding", label: "Branding", icon: Palette },
];

export default function AdminPage() {
  const me = useUser();
  const canUsers = useCan("manage_users");
  const canPlatform = useCan("manage_platform");
  const canCompanies = useCan("manage_companies");
  const canCatalog = useCan("manage_catalog");
  const router = useRouter();
  const params = useParams<{ slug?: string[] }>();

  // el consultor administra usuarios, roles y el catálogo (también el líder); el admin, todo el módulo
  const visibleTabs = TABS.filter((t) =>
    t.id === "usuarios" ? canUsers : t.id === "empresas" ? canCompanies : t.id === "catalogo" ? canCatalog : canPlatform);
  const tab: Tab = (visibleTabs.find((t) => t.id === params.slug?.[0])?.id
    ?? visibleTabs[0]?.id ?? "usuarios");

  if (!canUsers && !canPlatform && !canCatalog) {
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

      {tab === "empresas" && <EmpresasTab />}
      {tab === "usuarios" && <UsersTab canCompanies={canCompanies} />}
      {tab === "catalogo" && <CatalogoTab />}
      {tab === "permisos" && <PermisosTab />}
      {tab === "integraciones" && <IntegracionesTab />}
      {tab === "branding" && <BrandingTab />}
    </>
  );
}

/* ═══ Usuarios y roles ═══ */

type ManagedUser = {
  email: string; name: string; role: "ADMIN" | "CONSULTOR" | "LIDER" | "RESPONSABLE" | "DIRECTIVO";
  line?: number; responsibleId?: string; active: boolean; seeded: boolean; createdBy?: string; at?: string;
};

type ResponsibleLite = { id: string; cargo: string; dependencia: string };

/** Ámbito de un responsable: capacidad 4.1–4.4 y/o responsable del catálogo (tribu, área). Al menos uno. */
function ScopeSelects({ line, responsibleId, responsibles, disabled, compact, onChange }: {
  line?: number; responsibleId?: string; responsibles: ResponsibleLite[]; disabled?: boolean; compact?: boolean;
  onChange: (patch: { line?: number | null; responsibleId?: string | null }) => void;
}) {
  const cls = compact ? "input w-auto !py-1 pr-7 !text-[11.5px]" : "input !py-2 text-[12px]";
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "space-y-2"}>
      <select value={line ?? ""} disabled={disabled} title="Capacidad (rige las prácticas del diagnóstico y lo que no tiene responsable)"
        onChange={(e) => onChange({ line: e.target.value ? Number(e.target.value) : null })} className={cls}>
        <option value="">Sin capacidad</option>
        {LINES.map((l) => <option key={l.n} value={l.n}>{l.code}{compact ? "" : ` · ${l.name}`}</option>)}
      </select>
      <select value={responsibleId ?? ""} disabled={disabled} title="Responsable del catálogo (rige iniciativas, KPI y tareas con dueño)"
        onChange={(e) => onChange({ responsibleId: e.target.value || null })} className={cls}>
        <option value="">Sin responsable</option>
        {responsibles.map((r) => <option key={r.id} value={r.id}>{r.dependencia || r.cargo}</option>)}
      </select>
    </div>
  );
}

const ROLE_LABEL: Record<ManagedUser["role"], string> = {
  ADMIN: "Admin de la plataforma",
  CONSULTOR: "Consultor Algoritmo T",
  LIDER: "Líder de la empresa",
  RESPONSABLE: "Responsable de ámbito",
  DIRECTIVO: "Directivo",
};

function EmpresasTab() {
  const me = useUser();
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<CompanyLite | "new" | null>(null);
  const editing = open === "new" ? null : open;
  const refetch = useCallback(async () => {
    const res = await fetch("/api/td/empresas");
    if (res.ok) setCompanies((await res.json()).companies);
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  const call = async (method: string, body?: Record<string, unknown>, query = "") => {
    setSaving(true); setError(null);
    const res = await fetch(`/api/td/empresas${query}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const ok = res.ok;
    if (!ok) setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
    else await refetch();
    setSaving(false);
    return ok;
  };
  const activate = async (slug: string) => {
    const res = await fetch("/api/auth/empresa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
    if (res.ok) window.location.href = "/panel";
  };
  return (
    <>
      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
      <div className="space-y-5">
        <Card className="rise rise-1 overflow-hidden">
          <CardHeader title={`Empresas (${companies.length})`} sub="cada empresa es un contexto independiente: usuarios, diagnóstico, portafolio y archivos propios"
            right={<button type="button" onClick={() => setOpen("new")} className="btn-primary !py-1.5 text-[11.5px]"><Building2 size={12} /> Nueva empresa</button>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line-strong bg-surface-2/60">
                  {["Empresa", "Sector · ciudad", "Origen", "Estado", ""].map((h) => (
                    <th key={h} className="label whitespace-nowrap px-4 py-2.5 text-left !text-[8.5px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.slug} className={`border-b border-line last:border-0 ${c.active ? "" : "opacity-50"} ${me.company?.slug === c.slug ? "bg-cyan-wash/40" : ""}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ink">{c.name} {me.company?.slug === c.slug && <span className="chip chip-cyan ml-1 !py-0 text-[9.5px]">activa</span>}</div>
                      <div className="num text-[10px] text-faint">{c.slug}{c.createdBy ? ` · creada por ${c.createdBy}` : ""}</div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.sector || "—"}<div className="text-[10.5px] text-faint">{[c.city, c.department].filter(Boolean).join(", ") || "—"}{c.country === "EC" ? " · Ecuador · USD" : ""}</div></td>
                    <td className="px-4 py-2.5"><span className="chip">{c.template === "demo" ? "Plantilla demo" : "Vacía"}</span></td>
                    <td className="px-4 py-2.5"><span className={`chip ${c.active ? "chip-ok" : "chip-bad"}`}>{c.active ? "Activa" : "Desactivada"}</span></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {me.company?.slug !== c.slug && c.active && (
                        <button disabled={saving} onClick={() => activate(c.slug)} title="Operar esta empresa" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40"><ArrowRightLeft size={14} /></button>
                      )}
                      <button disabled={saving} onClick={() => setOpen(c)} title="Editar" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40"><Pencil size={14} /></button>
                      <button disabled={saving} onClick={() => call("PATCH", { slug: c.slug, active: !c.active })} title={c.active ? "Desactivar" : "Reactivar"} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40">{c.active ? <PowerOff size={14} /> : <Power size={14} />}</button>
                      {c.slug !== "andina" && (
                        <button disabled={saving} title="Eliminar con todos sus datos"
                          onClick={() => { if (window.confirm(`¿Eliminar «${c.name}» con todos sus usuarios, diagnóstico, portafolio y archivos? No se puede deshacer.`)) call("DELETE", undefined, `?slug=${encodeURIComponent(c.slug)}`); }}
                          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-bad disabled:opacity-40"><Trash2 size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {open !== null && (
          <CompanyForm key={editing?.slug ?? "nueva"} saving={saving} initial={editing}
            onCancel={() => setOpen(null)}
            onSubmit={async (input) => { const ok = await call(editing ? "PATCH" : "POST", editing ? { slug: editing.slug, ...input } : input); if (ok) setOpen(null); return ok; }} />
        )}
      </div>
      <p className="mt-5 flex items-start gap-2 text-[10.5px] leading-relaxed text-faint">
        <ShieldCheck size={12} className="mt-0.5 shrink-0" />
        Los roles (advisor, líder, responsable, junta) valen solo dentro de su empresa. Como admin de la plataforma operas la empresa activa que elijas en el menú lateral; la demo (Andina) no se elimina, solo se desactiva.
      </p>
    </>
  );
}

function UsersTab({ canCompanies }: { canCompanies: boolean }) {
  const me = useUser();
  const responsibles = useCatalog().catalog.responsibles;
  const [newOpen, setNewOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/td/users");
    if (res.ok) setUsers((await res.json()).users);
    if (canCompanies) {
      const rc = await fetch("/api/td/empresas");
      if (rc.ok) setCompanies((await rc.json()).companies);
    }
  }, [canCompanies]);
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
      <div className="space-y-5">
        <Card className="rise rise-1 overflow-hidden">
          <CardHeader title={`Cuentas de ${me.company?.name ?? "la empresa"} (${users.length})`}
            sub="roles válidos solo en esta empresa · los usuarios iniciales no se eliminan: se desactivan"
            right={<button type="button" onClick={() => setNewOpen(true)} className="btn-primary !py-1.5 text-[11.5px]"><UserPlus size={12} /> Nueva cuenta</button>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line-strong bg-surface-2/60">
                  {["Usuario", "Rol", "Ámbito", "Estado", canCompanies ? "Empresa" : ""].map((h) => (
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
                        {(Object.keys(ROLE_LABEL) as ManagedUser["role"][]).filter((r) => r !== "ADMIN").map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {u.role === "RESPONSABLE" ? (
                        <ScopeSelects compact line={u.line} responsibleId={u.responsibleId} responsibles={responsibles} disabled={saving}
                          onChange={(patch) => mutate("PATCH", { email: u.email, ...patch })} />
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
                      {canCompanies && companies.length > 1 && (
                        <select value={me.company?.slug ?? ""} disabled={saving} title="Mover a otra empresa"
                          onChange={(e) => { if (e.target.value && e.target.value !== me.company?.slug && window.confirm(`¿Mover a ${u.name} a otra empresa?`)) mutate("PATCH", { email: u.email, companySlug: e.target.value }); }}
                          className="input mr-1 w-auto !py-1 pr-6 !text-[11px]">
                          {companies.map((c) => <option key={c.slug} value={c.slug}>{c.shortName}</option>)}
                        </select>
                      )}
                      <button disabled={saving}
                        onClick={() => mutate("PATCH", { email: u.email, active: !u.active })}
                        title={u.active ? "Desactivar" : "Reactivar"}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
                        {u.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {newOpen && (
          <NewUserCard saving={saving} responsibles={responsibles} onClose={() => setNewOpen(false)}
            onCreate={async (input) => { const ok = await mutate("POST", input); if (ok) setNewOpen(false); return ok; }} />
        )}
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

function NewUserCard({ saving, responsibles, onCreate, onClose }: {
  saving: boolean;
  responsibles: ResponsibleLite[];
  onCreate: (input: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ManagedUser["role"]>("RESPONSABLE");
  const [line, setLine] = useState<number | undefined>(1);
  const [responsibleId, setResponsibleId] = useState<string | undefined>(undefined);

  const submit = async () => {
    if (await onCreate({ name, email, role, line: role === "RESPONSABLE" ? line ?? null : undefined, responsibleId: role === "RESPONSABLE" ? responsibleId ?? null : undefined })) {
      setName(""); setEmail("");
    }
  };
  return (
    <Modal title="Nueva cuenta" sub="nace activa; fija su contraseña desde esta misma pestaña" onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} className="btn-ghost !py-2 text-[12px]">Cancelar</button>
        <button type="button" onClick={submit}
          disabled={saving || !name.trim() || !email.trim() || (role === "RESPONSABLE" && !line && !responsibleId)}
          className="btn-primary !py-2 text-[12.5px] disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          Crear cuenta
        </button>
      </>}>
      <div className="space-y-2.5">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo" className="input !py-2 text-[12px]" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.com" className="input !py-2 text-[12px]" />
        <select value={role} onChange={(e) => setRole(e.target.value as ManagedUser["role"])}
          className="input !py-2 text-[12px]">
          {(Object.keys(ROLE_LABEL) as ManagedUser["role"][]).filter((r) => r !== "ADMIN").map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        {role === "RESPONSABLE" && (
          <>
            <ScopeSelects line={line} responsibleId={responsibleId} responsibles={responsibles}
              onChange={(p) => { if (p.line !== undefined) setLine(p.line ?? undefined); if (p.responsibleId !== undefined) setResponsibleId(p.responsibleId ?? undefined); }} />
            <p className="text-[10.5px] leading-snug text-faint">
              Con responsable (tribu, área), edita y evalúa solo lo que tiene ese dueño; la capacidad rige las prácticas del diagnóstico. Hace falta al menos uno.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ═══ Permisos de acceso (la matriz que el servidor exige) ═══ */

const ACTION_DESC: Record<Action, string> = {
  view: "Ver los módulos y sus datos",
  edit_tasks: "Crear, editar, archivar y reprogramar tareas del gestor",
  edit_initiatives: "Avance, factores, bitácora y próximo hito de iniciativas",
  evaluate_initiatives: "Calificar iniciativas con la matriz 4Shine de priorización (D·E·M·L y tipo)",
  decide_initiatives: "Decidir el tiempo de cada iniciativa: implementar, preparar, backlog o renunciar",
  report_kpi: "Registrar valores de KPI (incluida la importación CSV)",
  capture_maturity: "Capturar la medición en curso (percepción de su ámbito)",
  publish_maturity: "Calificar D/I/K y nivel, y publicar mediciones",
  verify_evidence: "Verificar evidencia — la garantía de independencia",
  manage_users: "Administrar usuarios y roles de la empresa",
  manage_companies: "Crear, editar, desactivar y eliminar empresas",
  manage_catalog: "Editar el catálogo de la empresa (responsables, personas, objetivos, KPI, iniciativas, finanzas y territorio)",
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
                          <span className="chip chip-cyan !py-0 !text-[8.5px]">su ámbito</span>
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
