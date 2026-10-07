"use client";

// Administración → Catálogo: el editor del catálogo de la empresa activa
// (responsables, personas, objetivos, KPI, iniciativas, finanzas y
// territorio). Toda mutación va a POST /api/td/catalogo { entity, op, data }
// y, si el servidor responde 200, se recarga la vista con useCatalogRefetch().
// El mapa 4Shine (capacidades, dimensiones, prácticas) no se edita aquí: es
// la definición del sistema y es igual para todas las empresas.

import { useState, type ReactNode } from "react";
import { Card, CardHeader, EmptyNote } from "@/components/ui";
import { useCatalog, useCatalogRefetch } from "@/components/catalog-context";
import { horizonsOf, horizonLabel } from "@/data/catalogo";
import type { TenantView } from "@/lib/vista";
import type { Financials } from "@/data/catalogo";
import {
  PERSPECTIVES, type Responsible, type CmiObjective, type KpiFull, type InitiativeFull, type ActionStatus,
} from "@/data/cmi";
import type { Person } from "@/data/proyectos";
import { LINES, type Territory } from "@/data/demo";
import { DIMS, frameworkOfPractice } from "@/data/mapa";
import { CO_PATHS } from "@/data/geo";
import {
  Briefcase, Users, Target, Gauge, Rocket, Landmark, Pencil, Trash2, Plus, Loader2, Save,
  AlertTriangle, X, ListOrdered, Minus,
} from "lucide-react";

/* ═══ contrato con la API ═══ */

type Entity = "responsible" | "person" | "objective" | "kpi" | "initiative" | "financials" | "territories";
type Op = "upsert" | "delete";
type Mutate = (entity: Entity, op: Op, data: unknown) => Promise<boolean>;
type SectionProps = { v: TenantView; saving: boolean; mutate: Mutate };

type Section = "responsables" | "personas" | "objetivos" | "kpi" | "iniciativas" | "finanzas";
const SECTIONS: { id: Section; label: string; icon: typeof Users }[] = [
  { id: "responsables", label: "Responsables", icon: Briefcase },
  { id: "personas", label: "Personas", icon: Users },
  { id: "objetivos", label: "Objetivos", icon: Target },
  { id: "kpi", label: "KPI", icon: Gauge },
  { id: "iniciativas", label: "Iniciativas", icon: Rocket },
  { id: "finanzas", label: "Finanzas y territorio", icon: Landmark },
];

const INPUT = "input !py-2 text-[12px]";
const PERIOD_RE = /^\d{4}(-(T[1-4]|S[12]))?$/;   // AAAA · AAAA-Tn · AAAA-Sn
const QUARTER_RE = /^\d{4}-T[1-4]$/;              // AAAA-Tn

const num = (s: string | number) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const currentQuarter = (offsetYears = 0) => {
  const d = new Date();
  return `${d.getFullYear() + offsetYears}-T${Math.floor(d.getMonth() / 3) + 1}`;
};
const fmtCop = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

/** Framework que instala una dimensión (el servidor lo recalcula; aquí solo se muestra). */
function frameworkOfCapability(code: string): { id: string; name: string } | null {
  const dim = DIMS.find((d) => d.code === code);
  const prac = dim?.prac[0];
  if (!prac) return null;
  const fw = frameworkOfPractice(prac.code) as { id: string; name: string } | undefined;
  return fw ? { id: fw.id, name: fw.name } : null;
}

/* ═══ pestaña ═══ */

export function CatalogoTab() {
  const v = useCatalog();
  const refetch = useCatalogRefetch();
  const [section, setSection] = useState<Section>("responsables");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate: Mutate = async (entity, op, data) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/td/catalogo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, op, data }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
        setSaving(false);
        return false;
      }
      await refetch();
      setSaving(false);
      return true;
    } catch {
      setError("No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.");
      setSaving(false);
      return false;
    }
  };

  const c = v.catalog;
  const counts: Record<Section, number> = {
    responsables: c.responsibles.length, personas: c.people.length, objetivos: c.objectives.length,
    kpi: c.kpis.length, iniciativas: c.initiatives.length, finanzas: c.territories.length + (c.financials ? 1 : 0),
  };
  const starting = c.responsibles.length === 0;

  return (
    <>
      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}

      <div className="rise mb-4">
        <div className="label !text-[8.5px]">Empresa activa</div>
        <h2 className="text-[18px] font-extrabold leading-tight text-ink">Catálogo de {c.company.name}</h2>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
          Lo que la plataforma gestiona por empresa: cargos y personas, el cuadro de mando (objetivos y KPI),
          el portafolio de iniciativas, las cifras financieras y el territorio. El mapa 4Shine no se edita: es del sistema.
        </p>
      </div>

      <div className="rise mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all ${
              section === s.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            <s.icon size={13} className={section === s.id ? "text-cyan-deep" : ""} />
            {s.label}
            <span className={`num rounded-md px-1.5 text-[9.5px] ${section === s.id ? "bg-cyan-wash text-cyan-deep" : "bg-surface text-faint"}`}>{counts[s.id]}</span>
          </button>
        ))}
      </div>

      {starting && (
        <div className="rise mb-5 flex items-start gap-2.5 rounded-xl bg-cyan-wash/50 px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
          <ListOrdered size={15} className="mt-0.5 shrink-0 text-cyan-deep" />
          <div>
            <b>Esta empresa aún no tiene responsables.</b> Empieza por los cargos; luego personas, objetivos, KPI e iniciativas.
            <div className="mt-1 text-[11px] text-muted">
              Orden recomendado: 1 Responsables (cargos) → 2 Personas → 3 Objetivos → 4 KPI → 5 Iniciativas → 6 Finanzas y territorio.
              Cada paso usa referencias del anterior (un KPI tiene un responsable y un objetivo; una iniciativa, un objetivo, una dimensión y un KPI).
            </div>
          </div>
        </div>
      )}

      {section === "responsables" && <ResponsablesSection v={v} saving={saving} mutate={mutate} />}
      {section === "personas" && <PersonasSection v={v} saving={saving} mutate={mutate} />}
      {section === "objetivos" && <ObjetivosSection v={v} saving={saving} mutate={mutate} />}
      {section === "kpi" && <KpiSection v={v} saving={saving} mutate={mutate} />}
      {section === "iniciativas" && <IniciativasSection v={v} saving={saving} mutate={mutate} />}
      {section === "finanzas" && <FinanzasSection v={v} saving={saving} mutate={mutate} />}

      <p className="mt-5 text-[10.5px] leading-relaxed text-faint">
        Reglas del servidor: no se elimina un responsable con KPI o iniciativas a cargo, una persona con tareas,
        un objetivo con KPI o iniciativas, un KPI referenciado por un objetivo o una iniciativa, ni una iniciativa con tareas.
        Los identificadores (R01, P01, OE-01, i1) los asigna el servidor; el código del KPI lo escribes tú y debe ser único.
      </p>
    </>
  );
}

/* ═══ Responsables (cargos) ═══ */

const ROL_PLATAFORMA: Record<Responsible["rolPlataforma"], string> = {
  LIDER: "Líder", RESPONSABLE: "Responsable", APORTA: "Aporta", CONSULTA: "Consulta",
};

function ResponsablesSection({ v, saving, mutate }: SectionProps) {
  const [editing, setEditing] = useState<Responsible | null>(null);
  const list = v.catalog.responsibles;
  const usage = (id: string) => ({
    kpis: v.catalog.kpis.filter((k) => k.ownerId === id).length,
    inis: v.catalog.initiatives.filter((i) => i.ownerId === id).length,
    people: v.catalog.people.filter((p) => p.responsibleId === id).length,
  });
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title={`Responsables (${list.length})`} sub="cargos, no personas: a ellos se asignan los KPI y las iniciativas" />
        {list.length === 0 ? (
          <div className="px-5 pb-5"><EmptyNote>Esta empresa aún no tiene responsables. Empieza por los cargos; luego personas, objetivos, KPI e iniciativas.</EmptyNote></div>
        ) : (
          <Table heads={["Id", "Cargo", "Dependencia", "Rol en la plataforma", "A cargo", ""]}>
            {list.map((r) => {
              const u = usage(r.id);
              return (
                <tr key={r.id} className={`border-b border-line last:border-0 ${editing?.id === r.id ? "bg-cyan-wash/40" : ""}`}>
                  <td className="num px-4 py-2.5 text-[11px] text-faint">{r.id}</td>
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.cargo}</td>
                  <td className="px-4 py-2.5 text-muted">{r.dependencia}</td>
                  <td className="px-4 py-2.5"><span className="chip">{ROL_PLATAFORMA[r.rolPlataforma]}</span></td>
                  <td className="num whitespace-nowrap px-4 py-2.5 text-[11px] text-muted">{u.kpis} KPI · {u.inis} inic. · {u.people} pers.</td>
                  <RowActions saving={saving} onEdit={() => setEditing(r)}
                    onDelete={() => { if (window.confirm(`¿Eliminar el cargo «${r.cargo}» (${r.id})?`)) mutate("responsible", "delete", { id: r.id }); }} />
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      <ResponsableForm key={editing?.id ?? "nuevo"} saving={saving} initial={editing}
        onCancel={() => setEditing(null)}
        onSubmit={async (d) => { const ok = await mutate("responsible", "upsert", editing ? { id: editing.id, ...d } : d); if (ok) setEditing(null); return ok; }} />
    </div>
  );
}

type RespDraft = { cargo: string; dependencia: string; rolPlataforma: Responsible["rolPlataforma"] };

function ResponsableForm({ saving, initial, onSubmit, onCancel }: {
  saving: boolean; initial: Responsible | null;
  onSubmit: (d: RespDraft) => Promise<boolean>; onCancel: () => void;
}) {
  const empty = (): RespDraft => ({ cargo: "", dependencia: "", rolPlataforma: "RESPONSABLE" });
  const [f, setF] = useState<RespDraft>(initial ? { cargo: initial.cargo, dependencia: initial.dependencia, rolPlataforma: initial.rolPlataforma } : empty());
  return (
    <FormCard title={initial ? `Editar · ${initial.id}` : "Nuevo responsable"} sub={initial ? "cargo y dependencia" : "un cargo de la empresa (no una persona)"}
      saving={saving} isEdit={!!initial} canSave={f.cargo.trim().length > 0} onCancel={onCancel}
      onSave={async () => { if (await onSubmit({ ...f, cargo: f.cargo.trim(), dependencia: f.dependencia.trim() }) && !initial) setF(empty()); }}>
      <Field label="Cargo"><input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} placeholder="Gerente comercial" className={INPUT} /></Field>
      <Field label="Dependencia"><input value={f.dependencia} onChange={(e) => setF({ ...f, dependencia: e.target.value })} placeholder="Gerencia comercial" className={INPUT} /></Field>
      <Field label="Rol en la plataforma">
        <select value={f.rolPlataforma} onChange={(e) => setF({ ...f, rolPlataforma: e.target.value as RespDraft["rolPlataforma"] })} className={INPUT}>
          {(Object.keys(ROL_PLATAFORMA) as Responsible["rolPlataforma"][]).map((r) => <option key={r} value={r}>{ROL_PLATAFORMA[r]}</option>)}
        </select>
      </Field>
    </FormCard>
  );
}

/* ═══ Personas ═══ */

function PersonasSection({ v, saving, mutate }: SectionProps) {
  const [editing, setEditing] = useState<Person | null>(null);
  const list = v.catalog.people;
  const respName = (id: string) => v.catalog.responsibles.find((r) => r.id === id)?.cargo ?? "—";
  const tasksOf = (id: string) => v.catalog.tasks.filter((t) => t.assigneeId === id || t.coAssigneeIds?.includes(id)).length;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title={`Personas (${list.length})`} sub="nombres propios: a ellas se asignan las tareas del plan" />
        {list.length === 0 ? (
          <div className="px-5 pb-5"><EmptyNote>
            {v.catalog.responsibles.length === 0
              ? "Esta empresa aún no tiene personas ni responsables. Crea primero los cargos en «Responsables»; cada persona se enlaza a uno."
              : "Esta empresa aún no tiene personas. Añade a quienes ejecutarán las tareas y enlázalas a su cargo."}
          </EmptyNote></div>
        ) : (
          <Table heads={["Id", "Nombre", "Cargo · dependencia", "Correo", "Cargo del directorio", "Tareas", ""]} minW={720}>
            {list.map((p) => (
              <tr key={p.id} className={`border-b border-line last:border-0 ${editing?.id === p.id ? "bg-cyan-wash/40" : ""}`}>
                <td className="num px-4 py-2.5 text-[11px] text-faint">{p.id}</td>
                <td className="px-4 py-2.5 font-semibold text-ink">{p.name}</td>
                <td className="px-4 py-2.5 text-muted">{p.cargo || "—"}<div className="text-[10.5px] text-faint">{p.dependencia || "—"}</div></td>
                <td className="num px-4 py-2.5 text-[11px] text-muted">{p.email || "—"}</td>
                <td className="px-4 py-2.5 text-muted">{respName(p.responsibleId)}</td>
                <td className="num px-4 py-2.5 text-[11px] text-muted">{tasksOf(p.id)}</td>
                <RowActions saving={saving} onEdit={() => setEditing(p)}
                  onDelete={() => { if (window.confirm(`¿Eliminar a «${p.name}» (${p.id})?`)) mutate("person", "delete", { id: p.id }); }} />
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <PersonaForm key={editing?.id ?? "nueva"} v={v} saving={saving} initial={editing}
        onCancel={() => setEditing(null)}
        onSubmit={async (d) => { const ok = await mutate("person", "upsert", editing ? { id: editing.id, ...d } : d); if (ok) setEditing(null); return ok; }} />
    </div>
  );
}

type PersonDraft = { name: string; cargo: string; dependencia: string; email: string; responsibleId: string };

function PersonaForm({ v, saving, initial, onSubmit, onCancel }: {
  v: TenantView; saving: boolean; initial: Person | null;
  onSubmit: (d: PersonDraft) => Promise<boolean>; onCancel: () => void;
}) {
  const resps = v.catalog.responsibles;
  const empty = (): PersonDraft => ({ name: "", cargo: "", dependencia: "", email: "", responsibleId: resps[0]?.id ?? "" });
  const [f, setF] = useState<PersonDraft>(initial ? { name: initial.name, cargo: initial.cargo, dependencia: initial.dependencia, email: initial.email, responsibleId: initial.responsibleId } : empty());
  const set = (k: keyof PersonDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pick = (id: string) => {
    const r = resps.find((x) => x.id === id);
    setF({ ...f, responsibleId: id, cargo: f.cargo || (r?.cargo ?? ""), dependencia: f.dependencia || (r?.dependencia ?? "") });
  };
  return (
    <FormCard title={initial ? `Editar · ${initial.name}` : "Nueva persona"} sub={initial ? "datos y cargo del directorio" : "se enlaza a un cargo del directorio"}
      saving={saving} isEdit={!!initial} canSave={f.name.trim().length > 0} onCancel={onCancel}
      onSave={async () => {
        const d: PersonDraft = { name: f.name.trim(), cargo: f.cargo.trim(), dependencia: f.dependencia.trim(), email: f.email.trim(), responsibleId: f.responsibleId };
        if (await onSubmit(d) && !initial) setF(empty());
      }}>
      <Field label="Nombre completo"><input value={f.name} onChange={set("name")} placeholder="Nombre y apellido" className={INPUT} /></Field>
      <Field label="Cargo del directorio">
        <select value={f.responsibleId} onChange={(e) => pick(e.target.value)} className={INPUT}>
          {resps.length === 0 && <option value="">Sin responsables aún</option>}
          {resps.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.cargo}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cargo"><input value={f.cargo} onChange={set("cargo")} placeholder="Cargo" className={INPUT} /></Field>
        <Field label="Dependencia"><input value={f.dependencia} onChange={set("dependencia")} placeholder="Dependencia" className={INPUT} /></Field>
      </div>
      <Field label="Correo"><input type="email" value={f.email} onChange={set("email")} placeholder="correo@empresa.com" className={INPUT} /></Field>
    </FormCard>
  );
}

/* ═══ Objetivos del cuadro de mando ═══ */

function ObjetivosSection({ v, saving, mutate }: SectionProps) {
  const [editing, setEditing] = useState<CmiObjective | null>(null);
  const list = v.catalog.objectives;
  const persp = (id: string) => PERSPECTIVES.find((p) => p.id === id)?.name ?? id;
  const inisOf = (id: string) => v.catalog.initiatives.filter((i) => i.cmi === id).length;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title={`Objetivos (${list.length})`} sub="cuadro de mando: un objetivo por perspectiva con sus resultados clave (KPI)" />
        {list.length === 0 ? (
          <div className="px-5 pb-5"><EmptyNote>Esta empresa aún no tiene objetivos. Crea los objetivos del cuadro de mando por perspectiva; después los KPI se enlazan a ellos.</EmptyNote></div>
        ) : (
          <Table heads={["Id", "Objetivo", "Perspectiva", "Capacidad", "KPI", "Inic.", ""]} minW={700}>
            {list.map((o) => (
              <tr key={o.id} className={`border-b border-line last:border-0 ${editing?.id === o.id ? "bg-cyan-wash/40" : ""}`}>
                <td className="num px-4 py-2.5 text-[11px] text-faint">{o.id}</td>
                <td className="px-4 py-2.5 font-semibold text-ink">{o.name}</td>
                <td className="px-4 py-2.5"><span className="chip">{persp(o.perspective)}</span></td>
                <td className="px-4 py-2.5 text-muted">{o.line ? (LINES.find((l) => l.n === o.line)?.name ?? o.line) : "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {o.kpis.length === 0 ? <span className="text-faint">—</span> : o.kpis.map((k) => <span key={k} className="num chip !py-0 !text-[9px]">{k}</span>)}
                  </div>
                </td>
                <td className="num px-4 py-2.5 text-[11px] text-muted">{inisOf(o.id)}</td>
                <RowActions saving={saving} onEdit={() => setEditing(o)}
                  onDelete={() => { if (window.confirm(`¿Eliminar el objetivo «${o.name}» (${o.id})?`)) mutate("objective", "delete", { id: o.id }); }} />
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <ObjetivoForm key={editing?.id ?? "nuevo"} v={v} saving={saving} initial={editing}
        onCancel={() => setEditing(null)}
        onSubmit={async (d) => { const ok = await mutate("objective", "upsert", editing ? { id: editing.id, ...d } : d); if (ok) setEditing(null); return ok; }} />
    </div>
  );
}

type ObjDraft = { perspective: string; name: string; kpis: string[]; line: string };
type ObjPayload = { perspective: string; name: string; kpis: string[]; line?: number };

function ObjetivoForm({ v, saving, initial, onSubmit, onCancel }: {
  v: TenantView; saving: boolean; initial: CmiObjective | null;
  onSubmit: (d: ObjPayload) => Promise<boolean>; onCancel: () => void;
}) {
  const empty = (): ObjDraft => ({ perspective: PERSPECTIVES[0].id, name: "", kpis: [], line: "" });
  const [f, setF] = useState<ObjDraft>(initial ? { perspective: initial.perspective, name: initial.name, kpis: [...initial.kpis], line: initial.line ? String(initial.line) : "" } : empty());
  const kpis = v.catalog.kpis;
  const toggle = (code: string) => setF({ ...f, kpis: f.kpis.includes(code) ? f.kpis.filter((k) => k !== code) : [...f.kpis, code] });
  return (
    <FormCard title={initial ? `Editar · ${initial.id}` : "Nuevo objetivo"} sub={initial ? "perspectiva, nombre y resultados clave" : "un objetivo del cuadro de mando"}
      saving={saving} isEdit={!!initial} canSave={f.name.trim().length > 0} onCancel={onCancel}
      onSave={async () => {
        const d: ObjPayload = { perspective: f.perspective, name: f.name.trim(), kpis: f.kpis, line: f.line ? num(f.line) : undefined };
        if (await onSubmit(d) && !initial) setF(empty());
      }}>
      <Field label="Objetivo"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Crecer con margen en los clientes prioritarios" className={INPUT} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Perspectiva">
          <select value={f.perspective} onChange={(e) => setF({ ...f, perspective: e.target.value })} className={INPUT}>
            {PERSPECTIVES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Capacidad dominante">
          <select value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} className={INPUT}>
            <option value="">— sin capacidad —</option>
            {LINES.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label={`Resultados clave (KPI) · ${f.kpis.length}`}>
        {kpis.length === 0 ? (
          <p className="text-[11px] text-faint">Aún no hay KPI en el catálogo. Crea el objetivo y enlaza sus KPI al crearlos en «KPI».</p>
        ) : (
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg bg-surface-2/60 p-2">
            {kpis.map((k) => (
              <label key={k.code} className="flex cursor-pointer items-center gap-2 text-[11.5px] text-ink-soft">
                <input type="checkbox" checked={f.kpis.includes(k.code)} onChange={() => toggle(k.code)} />
                <span className="num font-bold text-cyan-deep">{k.code}</span>
                <span className="truncate">{k.name}</span>
              </label>
            ))}
          </div>
        )}
      </Field>
    </FormCard>
  );
}

/* ═══ KPI ═══ */

const FREQUENCIES: KpiFull["frequency"][] = ["Mensual", "Trimestral", "Semestral", "Anual"];

function KpiSection({ v, saving, mutate }: SectionProps) {
  const [editing, setEditing] = useState<KpiFull | null>(null);
  const list = v.catalog.kpis;
  const objName = (id: string) => v.catalog.objectives.find((o) => o.id === id)?.name ?? id;
  const owner = (id: string) => v.catalog.responsibles.find((r) => r.id === id)?.dependencia ?? "—";
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title={`KPI (${list.length})`} sub="indicadores con definición operativa, meta, responsable del dato y serie" />
        {list.length === 0 ? (
          <div className="px-5 pb-5"><EmptyNote>
            {v.catalog.objectives.length === 0 || v.catalog.responsibles.length === 0
              ? "Esta empresa aún no tiene KPI. Un KPI necesita un objetivo y un responsable del dato: crea primero esos dos."
              : "Esta empresa aún no tiene KPI. Escribe el código (p. ej. DIR-01), el nombre, la unidad y la meta."}
          </EmptyNote></div>
        ) : (
          <Table heads={["Código", "KPI", "Objetivo", "Responsable", "Unidad · frecuencia", "Base → meta", "Serie", ""]} minW={820}>
            {list.map((k) => (
              <tr key={k.code} className={`border-b border-line last:border-0 ${editing?.code === k.code ? "bg-cyan-wash/40" : ""}`}>
                <td className="num px-4 py-2.5 text-[11px] font-bold text-cyan-deep">{k.code}</td>
                <td className="px-4 py-2.5 font-semibold text-ink">{k.name}<div className="text-[10.5px] font-normal text-faint">{LINES.find((l) => l.n === k.line)?.name ?? ""}</div></td>
                <td className="px-4 py-2.5 text-muted"><span className="num text-[10.5px] text-faint">{k.cmi}</span> {objName(k.cmi)}</td>
                <td className="px-4 py-2.5 text-muted">{owner(k.ownerId)}</td>
                <td className="px-4 py-2.5 text-muted">{k.unit} · {k.frequency}</td>
                <td className="num whitespace-nowrap px-4 py-2.5 text-muted">{k.baseline} → <b className="text-ink">{k.target}</b> <span className="text-faint">{k.goodDirection === "up" ? "↑" : "↓"}</span></td>
                <td className="num px-4 py-2.5 text-[11px] text-muted">{k.series.length} pts</td>
                <RowActions saving={saving} onEdit={() => setEditing(k)}
                  onDelete={() => { if (window.confirm(`¿Eliminar el KPI «${k.name}» (${k.code})?`)) mutate("kpi", "delete", { code: k.code }); }} />
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <KpiForm key={editing?.code ?? "nuevo"} v={v} saving={saving} initial={editing}
        onCancel={() => setEditing(null)}
        onSubmit={async (d) => { const ok = await mutate("kpi", "upsert", d); if (ok) setEditing(null); return ok; }} />
    </div>
  );
}

type SeriesDraft = { period: string; value: string; note: string };
type KpiDraft = {
  code: string; line: string; cmi: string; name: string; definition: string; formula: string; unit: string;
  frequency: KpiFull["frequency"]; source: string; ownerId: string; baseline: string; target: string;
  goodDirection: KpiFull["goodDirection"]; series: SeriesDraft[];
};

function KpiForm({ v, saving, initial, onSubmit, onCancel }: {
  v: TenantView; saving: boolean; initial: KpiFull | null;
  onSubmit: (d: KpiFull) => Promise<boolean>; onCancel: () => void;
}) {
  const objs = v.catalog.objectives;
  const resps = v.catalog.responsibles;
  const empty = (): KpiDraft => ({
    code: "", line: "1", cmi: objs[0]?.id ?? "", name: "", definition: "", formula: "", unit: "", frequency: "Trimestral",
    source: "", ownerId: resps[0]?.id ?? "", baseline: "0", target: "0", goodDirection: "up", series: [],
  });
  const [f, setF] = useState<KpiDraft>(initial ? {
    code: initial.code, line: String(initial.line), cmi: initial.cmi, name: initial.name, definition: initial.definition,
    formula: initial.formula, unit: initial.unit, frequency: initial.frequency, source: initial.source, ownerId: initial.ownerId,
    baseline: String(initial.baseline), target: String(initial.target), goodDirection: initial.goodDirection,
    series: initial.series.map((s) => ({ period: s.period, value: String(s.value), note: s.note ?? "" })),
  } : empty());
  const set = (k: keyof KpiDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const setSerie = (i: number, patch: Partial<SeriesDraft>) => setF({ ...f, series: f.series.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const codeOk = /^[A-Z0-9][A-Z0-9-]{1,}$/.test(f.code.trim().toUpperCase());
  const codeDup = !initial && v.catalog.kpis.some((k) => k.code === f.code.trim().toUpperCase());
  const seriesOk = f.series.every((s) => PERIOD_RE.test(s.period.trim().toUpperCase()));
  const canSave = codeOk && !codeDup && f.name.trim().length > 0 && f.unit.trim().length > 0 && seriesOk;

  const payload = (): KpiFull => ({
    code: f.code.trim().toUpperCase(), line: num(f.line), cmi: f.cmi, name: f.name.trim(), definition: f.definition.trim(),
    formula: f.formula.trim(), unit: f.unit.trim(), frequency: f.frequency, source: f.source.trim(), ownerId: f.ownerId,
    baseline: num(f.baseline), target: num(f.target), goodDirection: f.goodDirection,
    series: f.series.filter((s) => s.period.trim()).map((s) => ({
      period: s.period.trim().toUpperCase(), value: num(s.value), ...(s.note.trim() ? { note: s.note.trim() } : {}),
    })),
  });

  return (
    <FormCard title={initial ? `Editar · ${initial.code}` : "Nuevo KPI"} sub={initial ? "el código no cambia; lo demás sí" : "código único en mayúsculas (p. ej. DIR-04)"}
      saving={saving} isEdit={!!initial} canSave={canSave} onCancel={onCancel}
      onSave={async () => { if (await onSubmit(payload()) && !initial) setF(empty()); }}>
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <Field label="Código">
          <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="DIR-04" readOnly={!!initial}
            className={`${INPUT} num ${initial ? "opacity-60" : ""} ${codeDup ? "!border-[var(--bad)]" : ""}`} />
        </Field>
        <Field label="Nombre"><input value={f.name} onChange={set("name")} placeholder="Cumplimiento de compromisos semanales" className={INPUT} /></Field>
      </div>
      {codeDup && <p className="text-[10.5px]" style={{ color: "var(--bad)" }}>Ya existe un KPI con ese código.</p>}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Objetivo">
          <select value={f.cmi} onChange={set("cmi")} className={INPUT}>
            {objs.length === 0 && <option value="">Sin objetivos aún</option>}
            {objs.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
          </select>
        </Field>
        <Field label="Capacidad">
          <select value={f.line} onChange={set("line")} className={INPUT}>
            {LINES.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Definición operativa"><textarea value={f.definition} onChange={set("definition")} rows={2} placeholder="Qué mide y cómo se lee" className={`${INPUT} resize-y`} /></Field>
      <Field label="Fórmula"><input value={f.formula} onChange={set("formula")} placeholder="compromisos cerrados a tiempo / compromisos del periodo" className={INPUT} /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Unidad"><input value={f.unit} onChange={set("unit")} placeholder="%" className={INPUT} /></Field>
        <Field label="Frecuencia">
          <select value={f.frequency} onChange={set("frequency")} className={INPUT}>
            {FREQUENCIES.map((fr) => <option key={fr} value={fr}>{fr}</option>)}
          </select>
        </Field>
        <Field label="Buena dirección">
          <select value={f.goodDirection} onChange={set("goodDirection")} className={INPUT}>
            <option value="up">Sube (↑)</option>
            <option value="down">Baja (↓)</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Línea base"><input type="number" step="any" value={f.baseline} onChange={set("baseline")} className={`${INPUT} num`} /></Field>
        <Field label="Meta"><input type="number" step="any" value={f.target} onChange={set("target")} className={`${INPUT} num`} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Responsable del dato">
          <select value={f.ownerId} onChange={set("ownerId")} className={INPUT}>
            {resps.length === 0 && <option value="">Sin responsables aún</option>}
            {resps.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.cargo}</option>)}
          </select>
        </Field>
        <Field label="Fuente del dato"><input value={f.source} onChange={set("source")} placeholder="ERP · acta semanal" className={INPUT} /></Field>
      </div>
      <Field label={`Serie · ${f.series.length} ${f.series.length === 1 ? "periodo" : "periodos"}`}>
        <div className="space-y-1.5">
          {f.series.map((s, i) => (
            <div key={i} className="grid grid-cols-[88px_80px_1fr_26px] items-center gap-1.5">
              <input value={s.period} onChange={(e) => setSerie(i, { period: e.target.value.toUpperCase() })} placeholder="2026-T4"
                className={`input num !py-1.5 !text-[11px] ${s.period && !PERIOD_RE.test(s.period.trim().toUpperCase()) ? "!border-[var(--bad)]" : ""}`} />
              <input type="number" step="any" value={s.value} onChange={(e) => setSerie(i, { value: e.target.value })} placeholder="valor" className="input num !py-1.5 !text-[11px]" />
              <input value={s.note} onChange={(e) => setSerie(i, { note: e.target.value })} placeholder="nota (opcional)" className="input !py-1.5 !text-[11px]" />
              <RemoveBtn onClick={() => setF({ ...f, series: f.series.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <AddBtn label="añadir periodo" onClick={() => setF({ ...f, series: [...f.series, { period: "", value: "", note: "" }] })} />
          <p className="text-[10px] text-faint">Periodos con formato AAAA-Tn (trimestre), AAAA-Sn (semestre) o AAAA (año). Puede ir vacía al crear.</p>
        </div>
      </Field>
    </FormCard>
  );
}

/* ═══ Iniciativas ═══ */

const SUBSISTEMAS: InitiativeFull["subsistema"][] = ["Dirección", "Comercial", "Operación", "Administración", "Talento"];
const INI_STATUS: Record<InitiativeFull["status"], string> = { PLANEADA: "Planeada", EN_CURSO: "En curso", EN_RIESGO: "En riesgo", COMPLETADA: "Completada" };
const ACTION_STATUS: Record<ActionStatus, string> = { HECHA: "Hecha", EN_CURSO: "En curso", PENDIENTE: "Pendiente" };
type FactorState = InitiativeFull["factors"][number]["state"];
const FACTOR_STATES: FactorState[] = ["VERDE", "AMBAR", "ROJO"];

function IniciativasSection({ v, saving, mutate }: SectionProps) {
  const [editing, setEditing] = useState<InitiativeFull | null>(null);
  const list = v.catalog.initiatives;
  const owner = (id: string) => v.catalog.responsibles.find((r) => r.id === id)?.dependencia ?? "—";
  const dimName = (code: string) => DIMS.find((d) => d.code === code)?.name ?? code;
  const tasksOf = (id: string) => v.catalog.tasks.filter((t) => t.iniId === id).length;
  const ready = v.catalog.objectives.length > 0 && v.catalog.responsibles.length > 0;
  return (
    <div className="space-y-5">
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title={`Iniciativas (${list.length})`} sub="el portafolio: cada iniciativa instala una dimensión del mapa y mueve un KPI" />
        {list.length === 0 ? (
          <div className="px-5 pb-5"><EmptyNote>
            {ready
              ? "Esta empresa aún no tiene iniciativas. Crea la primera con su objetivo, la dimensión que instala y el KPI que mueve."
              : "Esta empresa aún no tiene iniciativas. Una iniciativa necesita un objetivo y un responsable: crea primero esos dos (y, si puedes, el KPI que moverá)."}
          </EmptyNote></div>
        ) : (
          <Table heads={["Id", "Iniciativa", "Objetivo · KPI", "Dimensión", "Responsable", "Estado", "Avance", "Tareas", ""]} minW={880}>
            {list.map((i) => (
              <tr key={i.id} className={`border-b border-line last:border-0 ${editing?.id === i.id ? "bg-cyan-wash/40" : ""}`}>
                <td className="num px-4 py-2.5 text-[11px] text-faint">{i.id}</td>
                <td className="px-4 py-2.5 font-semibold text-ink">{i.name}<div className="text-[10.5px] font-normal text-faint">{i.subsistema} · {horizonLabel(v.catalog.company, i.horizon)} · {i.start} → {i.end}</div></td>
                <td className="num px-4 py-2.5 text-[11px] text-muted">{i.cmi}{i.kpi ? ` · ${i.kpi}` : ""}</td>
                <td className="px-4 py-2.5 text-muted"><span className="num text-[10.5px] text-faint">{i.capability}</span> {dimName(i.capability)}</td>
                <td className="px-4 py-2.5 text-muted">{owner(i.ownerId)}</td>
                <td className="px-4 py-2.5"><span className={`chip ${i.status === "EN_RIESGO" ? "chip-bad" : i.status === "COMPLETADA" ? "chip-ok" : i.status === "EN_CURSO" ? "chip-cyan" : ""}`}>{INI_STATUS[i.status]}</span></td>
                <td className="num px-4 py-2.5 text-muted">{i.progress} %</td>
                <td className="num px-4 py-2.5 text-[11px] text-muted">{tasksOf(i.id)}</td>
                <RowActions saving={saving} onEdit={() => setEditing(i)}
                  onDelete={() => { if (window.confirm(`¿Eliminar la iniciativa «${i.name}» (${i.id})?`)) mutate("initiative", "delete", { id: i.id }); }} />
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <IniciativaForm key={editing?.id ?? "nueva"} v={v} saving={saving} initial={editing}
        onCancel={() => setEditing(null)}
        onSubmit={async (d) => { const ok = await mutate("initiative", "upsert", editing ? { id: editing.id, ...d } : d); if (ok) setEditing(null); return ok; }} />
    </div>
  );
}

type ActionDraft = { name: string; meta: string; status: ActionStatus; quarter: string };
type FactorDraft = { name: string; state: FactorState; note: string; history: string[] };
type IniDraft = {
  name: string; objetivo: string; line: string; subsistema: InitiativeFull["subsistema"]; cmi: string;
  horizon: InitiativeFull["horizon"]; impact: string; feasibility: string; urgency: string; dependency: string;
  status: InitiativeFull["status"]; start: string; end: string; ownerId: string; metaResultado: string;
  budgetPlanned: string; budgetCommitted: string; budgetExecuted: string; progress: string;
  capability: string; kpi: string; actions: ActionDraft[]; factors: FactorDraft[];
  milestoneDate: string; milestoneText: string;
};
type IniPayload = Omit<InitiativeFull, "id">;

function IniciativaForm({ v, saving, initial, onSubmit, onCancel }: {
  v: TenantView; saving: boolean; initial: InitiativeFull | null;
  onSubmit: (d: IniPayload) => Promise<boolean>; onCancel: () => void;
}) {
  const objs = v.catalog.objectives;
  const resps = v.catalog.responsibles;
  const kpis = v.catalog.kpis;
  const empty = (): IniDraft => ({
    name: "", objetivo: "", line: String(DIMS[0]?.line ?? 1), subsistema: "Dirección", cmi: objs[0]?.id ?? "",
    horizon: horizonsOf(v.catalog.company)[0].id, impact: "3", feasibility: "3", urgency: "3", dependency: "3", status: "PLANEADA",
    start: currentQuarter(), end: currentQuarter(1), ownerId: resps[0]?.id ?? "", metaResultado: "",
    budgetPlanned: "0", budgetCommitted: "0", budgetExecuted: "0", progress: "0",
    capability: DIMS[0]?.code ?? "", kpi: kpis[0]?.code ?? "", actions: [], factors: [], milestoneDate: "", milestoneText: "",
  });
  const [f, setF] = useState<IniDraft>(initial ? {
    name: initial.name, objetivo: initial.objetivo, line: String(initial.line), subsistema: initial.subsistema, cmi: initial.cmi,
    horizon: initial.horizon, impact: String(initial.impact), feasibility: String(initial.feasibility), urgency: String(initial.urgency),
    dependency: String(initial.dependency), status: initial.status, start: initial.start, end: initial.end, ownerId: initial.ownerId,
    metaResultado: initial.metaResultado, budgetPlanned: String(initial.budgetPlanned), budgetCommitted: String(initial.budgetCommitted),
    budgetExecuted: String(initial.budgetExecuted), progress: String(initial.progress), capability: initial.capability, kpi: initial.kpi,
    actions: initial.actions.map((a) => ({ ...a })),
    factors: initial.factors.map((x) => ({ name: x.name, state: x.state, note: x.note ?? "", history: [...x.history] })),
    milestoneDate: initial.nextMilestone?.date ?? "", milestoneText: initial.nextMilestone?.text ?? "",
  } : empty());
  const set = (k: keyof IniDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const pickCapability = (code: string) => {
    const dim = DIMS.find((d) => d.code === code);
    setF({ ...f, capability: code, line: dim ? String(dim.line) : f.line });
  };
  const setAction = (i: number, patch: Partial<ActionDraft>) => setF({ ...f, actions: f.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const setFactor = (i: number, patch: Partial<FactorDraft>) => setF({ ...f, factors: f.factors.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const fw = frameworkOfCapability(f.capability);
  const datesOk = QUARTER_RE.test(f.start.trim().toUpperCase()) && QUARTER_RE.test(f.end.trim().toUpperCase());
  const canSave = f.name.trim().length > 0 && f.capability.length > 0 && f.cmi.length > 0 && datesOk;

  const payload = (): IniPayload => ({
    line: num(f.line), subsistema: f.subsistema, cmi: f.cmi, name: f.name.trim(), objetivo: f.objetivo.trim(), horizon: f.horizon,
    impact: num(f.impact), feasibility: num(f.feasibility), urgency: num(f.urgency), dependency: num(f.dependency), status: f.status,
    start: f.start.trim().toUpperCase(), end: f.end.trim().toUpperCase(), ownerId: f.ownerId, metaResultado: f.metaResultado.trim(),
    budgetPlanned: num(f.budgetPlanned), budgetCommitted: num(f.budgetCommitted), budgetExecuted: num(f.budgetExecuted),
    progress: Math.max(0, Math.min(100, num(f.progress))), capability: f.capability, framework: fw?.id ?? "", kpi: f.kpi,
    actions: f.actions.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), meta: a.meta.trim(), status: a.status, quarter: a.quarter.trim().toUpperCase() })),
    log: initial?.log ?? [],                                   // la bitácora no se edita aquí: se conserva
    nextMilestone: { date: f.milestoneDate.trim(), text: f.milestoneText.trim() },
    factors: f.factors.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), state: x.state, history: x.history, ...(x.note.trim() ? { note: x.note.trim() } : {}) })),
  });

  const scale = (k: "impact" | "feasibility" | "urgency" | "dependency", label: string) => (
    <Field label={label}>
      <select value={f[k]} onChange={set(k)} className={INPUT}>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </Field>
  );

  return (
    <FormCard title={initial ? `Editar · ${initial.id}` : "Nueva iniciativa"}
      sub={initial ? "la bitácora se conserva tal cual; el framework se recalcula con la dimensión" : "qué instala, qué mueve y quién responde"}
      saving={saving} isEdit={!!initial} canSave={canSave} onCancel={onCancel} wide
      onSave={async () => { if (await onSubmit(payload()) && !initial) setF(empty()); }}>
      <div className="grid gap-x-5 gap-y-2.5 lg:grid-cols-2">
        {/* columna 1: identidad y referencias */}
        <div className="space-y-2.5">
          <Field label="Iniciativa"><input value={f.name} onChange={set("name")} placeholder="Plan trimestral con responsables únicos" className={INPUT} /></Field>
          <Field label="Objetivo de la iniciativa"><textarea value={f.objetivo} onChange={set("objetivo")} rows={2} placeholder="Qué cambia cuando esté hecha" className={`${INPUT} resize-y`} /></Field>
          <Field label="Objetivo del cuadro de mando">
            <select value={f.cmi} onChange={set("cmi")} className={INPUT}>
              {objs.length === 0 && <option value="">Sin objetivos aún</option>}
              {objs.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dimensión que instala">
              <select value={f.capability} onChange={(e) => pickCapability(e.target.value)} className={INPUT}>
                {LINES.map((l) => (
                  <optgroup key={l.n} label={`${l.code} · ${l.name}`}>
                    {DIMS.filter((d) => d.line === l.n).map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Framework (se calcula)">
              <div className="input !py-2 text-[12px] opacity-70">{fw ? `${fw.id} · ${fw.name}` : "—"}</div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Capacidad">
              <select value={f.line} onChange={set("line")} className={INPUT}>
                {LINES.map((l) => <option key={l.n} value={l.n}>{l.code} · {l.name}</option>)}
              </select>
            </Field>
            <Field label="Subsistema">
              <select value={f.subsistema} onChange={set("subsistema")} className={INPUT}>
                {SUBSISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="KPI que mueve">
              <select value={f.kpi} onChange={set("kpi")} className={INPUT}>
                <option value="">— sin KPI —</option>
                {kpis.map((k) => <option key={k.code} value={k.code}>{k.code} · {k.name}</option>)}
              </select>
            </Field>
            <Field label="Responsable">
              <select value={f.ownerId} onChange={set("ownerId")} className={INPUT}>
                {resps.length === 0 && <option value="">Sin responsables aún</option>}
                {resps.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.cargo}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Meta de resultado"><textarea value={f.metaResultado} onChange={set("metaResultado")} rows={2} placeholder="El 80 % de los compromisos se cierra en la fecha acordada" className={`${INPUT} resize-y`} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Próximo hito · fecha"><input type="date" value={f.milestoneDate} onChange={set("milestoneDate")} className={`${INPUT} num`} /></Field>
            <Field label="Próximo hito · qué"><input value={f.milestoneText} onChange={set("milestoneText")} placeholder="Cierre del primer trimestre con registro" className={INPUT} /></Field>
          </div>
        </div>

        {/* columna 2: priorización, plan y presupuesto */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-4 gap-2">
            {scale("impact", "Impacto")}
            {scale("feasibility", "Factibilidad")}
            {scale("urgency", "Urgencia")}
            {scale("dependency", "Dependencia")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Horizonte">
              <select value={f.horizon} onChange={set("horizon")} className={INPUT}>
                {horizonsOf(v.catalog.company).map((h) => <option key={h.id} value={h.id}>{h.label} · {h.months} meses</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select value={f.status} onChange={set("status")} className={INPUT}>
                {(Object.keys(INI_STATUS) as InitiativeFull["status"][]).map((s) => <option key={s} value={s}>{INI_STATUS[s]}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Inicio (AAAA-Tn)"><input value={f.start} onChange={(e) => setF({ ...f, start: e.target.value.toUpperCase() })} placeholder="2026-T4" className={`${INPUT} num ${f.start && !QUARTER_RE.test(f.start.trim().toUpperCase()) ? "!border-[var(--bad)]" : ""}`} /></Field>
            <Field label="Fin (AAAA-Tn)"><input value={f.end} onChange={(e) => setF({ ...f, end: e.target.value.toUpperCase() })} placeholder="2027-T2" className={`${INPUT} num ${f.end && !QUARTER_RE.test(f.end.trim().toUpperCase()) ? "!border-[var(--bad)]" : ""}`} /></Field>
            <Field label="Avance (%)"><input type="number" min={0} max={100} value={f.progress} onChange={set("progress")} className={`${INPUT} num`} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Presupuesto planeado"><input type="number" step="any" value={f.budgetPlanned} onChange={set("budgetPlanned")} className={`${INPUT} num`} /></Field>
            <Field label="Comprometido"><input type="number" step="any" value={f.budgetCommitted} onChange={set("budgetCommitted")} className={`${INPUT} num`} /></Field>
            <Field label="Ejecutado"><input type="number" step="any" value={f.budgetExecuted} onChange={set("budgetExecuted")} className={`${INPUT} num`} /></Field>
          </div>
          <p className="num -mt-1 text-[10px] text-faint">Presupuesto en {v.catalog.company.currency ?? "COP"}: {fmtCop(num(f.budgetPlanned))} planeado · {fmtCop(num(f.budgetCommitted))} comprometido · {fmtCop(num(f.budgetExecuted))} ejecutado.</p>

          <Field label={`Acciones · ${f.actions.length}`}>
            <div className="space-y-1.5">
              {f.actions.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_96px_76px_26px] items-center gap-1.5">
                  <input value={a.name} onChange={(e) => setAction(i, { name: e.target.value })} placeholder="acción" className="input !py-1.5 !text-[11px]" />
                  <input value={a.meta} onChange={(e) => setAction(i, { meta: e.target.value })} placeholder="meta" className="input !py-1.5 !text-[11px]" />
                  <select value={a.status} onChange={(e) => setAction(i, { status: e.target.value as ActionStatus })} className="input !py-1.5 pr-6 !text-[11px]">
                    {(Object.keys(ACTION_STATUS) as ActionStatus[]).map((s) => <option key={s} value={s}>{ACTION_STATUS[s]}</option>)}
                  </select>
                  <input value={a.quarter} onChange={(e) => setAction(i, { quarter: e.target.value.toUpperCase() })} placeholder="2026-T4" className="input num !py-1.5 !text-[11px]" />
                  <RemoveBtn onClick={() => setF({ ...f, actions: f.actions.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <AddBtn label="añadir acción" onClick={() => setF({ ...f, actions: [...f.actions, { name: "", meta: "", status: "PENDIENTE", quarter: f.start }] })} />
            </div>
          </Field>

          <Field label={`Factores de éxito · ${f.factors.length}`}>
            <div className="space-y-1.5">
              {f.factors.map((x, i) => (
                <div key={i} className="grid grid-cols-[1fr_84px_1fr_26px] items-center gap-1.5">
                  <input value={x.name} onChange={(e) => setFactor(i, { name: e.target.value })} placeholder="factor" className="input !py-1.5 !text-[11px]" />
                  <select value={x.state} onChange={(e) => setFactor(i, { state: e.target.value as FactorState })} className="input !py-1.5 pr-6 !text-[11px]">
                    {FACTOR_STATES.map((s) => <option key={s} value={s}>{s === "AMBAR" ? "Ámbar" : s === "VERDE" ? "Verde" : "Rojo"}</option>)}
                  </select>
                  <input value={x.note} onChange={(e) => setFactor(i, { note: e.target.value })} placeholder="nota (opcional)" className="input !py-1.5 !text-[11px]" />
                  <RemoveBtn onClick={() => setF({ ...f, factors: f.factors.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <AddBtn label="añadir factor" onClick={() => setF({ ...f, factors: [...f.factors, { name: "", state: "VERDE", note: "", history: [] }] })} />
            </div>
          </Field>
          {initial && (
            <p className="text-[10px] text-faint">Bitácora: {initial.log.length} {initial.log.length === 1 ? "entrada" : "entradas"} (se gestiona desde el módulo de iniciativas; aquí se conserva).</p>
          )}
        </div>
      </div>
    </FormCard>
  );
}

/* ═══ Finanzas y territorio ═══ */

const FIN_FIELDS: { key: keyof Financials; label: string }[] = [
  { key: "revenue", label: "Ingresos" }, { key: "revenuePrev", label: "Ingresos año anterior" },
  { key: "grossProfit", label: "Utilidad bruta" }, { key: "operatingProfit", label: "Utilidad operativa" },
  { key: "netProfit", label: "Utilidad neta" }, { key: "assets", label: "Activos" },
  { key: "liabilities", label: "Pasivos" }, { key: "equity", label: "Patrimonio" },
];
type FinDraft = Record<keyof Financials, string>;
const DEPARTAMENTOS = Array.from(new Set(CO_PATHS.map((p) => p.name)));
const PRESENCE: Record<Territory["presence"], string> = { sede: "Sede", cobertura: "Cobertura", oportunidad: "Oportunidad" };

function FinanzasSection({ v, saving, mutate }: SectionProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <FinanzasForm key={v.catalog.financials ? `fin-${v.catalog.financials.year}` : "fin-vacia"} initial={v.catalog.financials} saving={saving}
        onSubmit={(d) => mutate("financials", "upsert", d)} />
      <TerritorioForm key={`ter-${v.catalog.territories.length}`} initial={v.catalog.territories} saving={saving}
        onSubmit={(d) => mutate("territories", "upsert", d)} />
    </div>
  );
}

function FinanzasForm({ initial, saving, onSubmit }: { initial: Financials | null; saving: boolean; onSubmit: (d: Financials) => Promise<boolean> }) {
  const v = useCatalog();
  const [f, setF] = useState<FinDraft>({
    year: String(initial?.year ?? new Date().getFullYear()),
    revenue: String(initial?.revenue ?? ""), revenuePrev: String(initial?.revenuePrev ?? ""),
    grossProfit: String(initial?.grossProfit ?? ""), operatingProfit: String(initial?.operatingProfit ?? ""), netProfit: String(initial?.netProfit ?? ""),
    assets: String(initial?.assets ?? ""), liabilities: String(initial?.liabilities ?? ""), equity: String(initial?.equity ?? ""),
  });
  const set = (k: keyof FinDraft) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const yearOk = /^\d{4}$/.test(f.year.trim());
  const dirty = !initial || (Object.keys(f) as (keyof FinDraft)[]).some((k) => num(f[k]) !== initial[k]);
  const payload = (): Financials => ({
    year: num(f.year), revenue: num(f.revenue), revenuePrev: num(f.revenuePrev), grossProfit: num(f.grossProfit),
    operatingProfit: num(f.operatingProfit), netProfit: num(f.netProfit), assets: num(f.assets), liabilities: num(f.liabilities), equity: num(f.equity),
  });
  return (
    <Card className="rise rise-1 self-start">
      <CardHeader title={initial ? `Finanzas · ${initial.year}` : "Finanzas"} sub={`cifras del último cierre, en ${v.catalog.company.currency === "USD" ? "USD" : "COP"} millones`} />
      <div className="space-y-2.5 px-5 pb-5">
        {!initial && <EmptyNote>Esta empresa aún no tiene cifras financieras. Registra el último cierre: ingresos, utilidades y balance.</EmptyNote>}
        <Field label="Año del cierre"><input type="number" value={f.year} onChange={set("year")} placeholder="2025" className={`${INPUT} num ${f.year && !yearOk ? "!border-[var(--bad)]" : ""}`} /></Field>
        <div className="grid grid-cols-2 gap-2">
          {FIN_FIELDS.map((x) => (
            <Field key={x.key} label={x.label}><input type="number" step="any" value={f[x.key]} onChange={set(x.key)} placeholder="0" className={`${INPUT} num`} /></Field>
          ))}
        </div>
        <button onClick={() => onSubmit(payload())} disabled={saving || !yearOk || !dirty}
          className="btn-primary w-full !py-2 text-[12.5px] disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {initial ? "Guardar finanzas" : "Registrar finanzas"}
        </button>
      </div>
    </Card>
  );
}

function TerritorioForm({ initial, saving, onSubmit }: { initial: Territory[]; saving: boolean; onSubmit: (d: Territory[]) => Promise<boolean> }) {
  const [rows, setRows] = useState<Territory[]>(initial.map((t) => ({ ...t })));
  const setRow = (i: number, patch: Partial<Territory>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const used = new Set(rows.map((r) => r.name));
  const dup = rows.length !== used.size;
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);
  const add = () => {
    const free = DEPARTAMENTOS.find((d) => !used.has(d)) ?? DEPARTAMENTOS[0] ?? "";
    setRows([...rows, { name: free, weight: 1, presence: "cobertura", reading: "" }]);
  };
  return (
    <Card className="rise rise-2 self-start overflow-hidden">
      <CardHeader title={`Territorio (${rows.length})`} sub="departamentos donde la empresa tiene sede, cobertura u oportunidad, con su peso comercial" />
      <div className="space-y-2.5 px-5 pb-5">
        {rows.length === 0 && <EmptyNote>Esta empresa aún no tiene territorio. Añade los departamentos con sede, los de cobertura y las oportunidades.</EmptyNote>}
        {rows.length > 0 && (
          <div className="grid grid-cols-[1fr_72px_112px_1.4fr_26px] gap-1.5 px-0.5">
            {["Departamento", "Peso", "Presencia", "Lectura", ""].map((h, i) => <span key={i} className="label !text-[8.5px]">{h}</span>)}
          </div>
        )}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_72px_112px_1.4fr_26px] items-center gap-1.5">
            <select value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} className={`input !py-1.5 !text-[11px] ${rows.filter((x) => x.name === r.name).length > 1 ? "!border-[var(--bad)]" : ""}`}>
              {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={r.weight} onChange={(e) => setRow(i, { weight: num(e.target.value) as Territory["weight"] })} className="input num !py-1.5 pr-6 !text-[11px]">
              {[1, 2, 3].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <select value={r.presence} onChange={(e) => setRow(i, { presence: e.target.value as Territory["presence"] })} className="input !py-1.5 pr-6 !text-[11px]">
              {(Object.keys(PRESENCE) as Territory["presence"][]).map((p) => <option key={p} value={p}>{PRESENCE[p]}</option>)}
            </select>
            <input value={r.reading} onChange={(e) => setRow(i, { reading: e.target.value })} placeholder="qué pasa allí" className="input !py-1.5 !text-[11px]" />
            <RemoveBtn onClick={() => setRows(rows.filter((_, j) => j !== i))} />
          </div>
        ))}
        {dup && <p className="text-[10.5px]" style={{ color: "var(--bad)" }}>Hay departamentos repetidos: cada uno va una sola vez.</p>}
        <div className="flex items-center gap-2 pt-1">
          <AddBtn label="añadir departamento" onClick={add} />
          <button onClick={() => onSubmit(rows.map((r) => ({ ...r, reading: r.reading.trim() })))} disabled={saving || dup || !dirty}
            className="btn-primary ml-auto !py-2 text-[12.5px] disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar territorio
          </button>
        </div>
        <p className="text-[10px] text-faint">Peso comercial 1 a 3 (3 = concentra ventas). Se guarda la lista completa: quitar una fila la elimina al guardar.</p>
      </div>
    </Card>
  );
}

/* ═══ piezas compartidas ═══ */

function FormCard({ title, sub, saving, isEdit, canSave, onSave, onCancel, children, wide = false }: {
  title: string; sub?: string; saving: boolean; isEdit: boolean; canSave: boolean;
  onSave: () => void | Promise<void>; onCancel: () => void; children: ReactNode; wide?: boolean;
}) {
  return (
    <Card className="rise rise-2 self-start">
      <CardHeader title={title} sub={sub} />
      <div className="space-y-2.5 px-5 pb-5">
        {children}
        <div className="flex gap-2 pt-1">
          <button onClick={onSave} disabled={saving || !canSave}
            className={`btn-primary !py-2 text-[12.5px] disabled:opacity-40 ${wide ? "" : "flex-1"}`}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : isEdit ? <Save size={13} /> : <Plus size={13} />}
            {isEdit ? "Guardar cambios" : "Crear"}
          </button>
          {isEdit && <button onClick={onCancel} className="btn-ghost !py-2 text-[12px]">Cancelar</button>}
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="label !text-[8.5px]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Table({ heads, children, minW = 560 }: { heads: string[]; children: ReactNode; minW?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]" style={{ minWidth: minW }}>
        <thead>
          <tr className="border-b border-line-strong bg-surface-2/60">
            {heads.map((h, i) => <th key={i} className="label whitespace-nowrap px-4 py-2.5 text-left !text-[8.5px]">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function RowActions({ saving, onEdit, onDelete }: { saving: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="whitespace-nowrap px-4 py-2.5 text-right">
      <button disabled={saving} onClick={onEdit} title="Editar" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40"><Pencil size={14} /></button>
      <button disabled={saving} onClick={onDelete} title="Eliminar" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-bad disabled:opacity-40"><Trash2 size={14} /></button>
    </td>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-[11px] font-bold text-cyan-deep hover:underline">
      <Plus size={12} /> {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Quitar" className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-bad">
      <Minus size={12} />
    </button>
  );
}

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
