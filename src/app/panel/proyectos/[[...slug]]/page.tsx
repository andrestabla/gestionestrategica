"use client";

// GP · Gestor de proyectos — Fase 1 con escritura real.
// El seguimiento de cada iniciativa tiene ruta propia:
//   /panel/proyectos          → portafolio completo
//   /panel/proyectos/<iniId>  → plan de trabajo de esa iniciativa (i1…i14)
// Los datos vienen del store del servidor (memoria + write-through a
// Postgres); las mutaciones pasan por la matriz de permisos y las reglas de
// negocio (403/422 con explicación). La UI refleja lo que el servidor exige:
// controles de edición solo donde `editable[task]` lo permite.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { AccessChip, useUser, useCan } from "@/components/user-context";
import { useCatalog, useCatalogRefetch } from "@/components/catalog-context";
import { evidencesOf, person } from "@/lib/vista";
import {
  initials, isOverdue as isOverdueFn, dueSoon as dueSoonFn, DEMO_TODAY,
  TASK_STATUS_META, assigneesOf,
  type Task, type TaskStatus, type Person,
} from "@/data/proyectos";
import type { TaskAlert, Workload } from "@/lib/proyectos";
import {
  KanbanSquare, CalendarRange, Users, X, Link2, FileText, ShieldCheck,
  AlertTriangle, Lock, ChevronRight, Loader2, Save, History, Paperclip,
  Plus, Archive,
} from "lucide-react";

type View = "tablero" | "cronograma" | "personas";
const COLUMNS: TaskStatus[] = ["POR_HACER", "EN_CURSO", "EN_REVISION", "BLOQUEADA", "HECHA"];

type ApiData = {
  tasks: Task[];
  people: Person[];
  alerts: TaskAlert[];
  workload: Workload[];
  stats: {
    total: number; byStatus: Record<TaskStatus, number>;
    overdue: number; dueSoon: number; withEvidence: number; people: number;
  };
  audit: { id: number; at: string; actor: string; role: string; entity: string; entityId: string; change: string }[];
  editable: Record<string, boolean>;
  canVerifyEvidence: boolean;
  evidenceStatus: Record<string, "VERIFICADA" | "PENDIENTE">;
  comments: { id: number; taskId: string; author: string; role: string; text: string; at: string }[];
  uploads: { id: string; taskId: string; title: string; kind: string; fileName: string; size: number; uploadedBy: string; date: string; status: "VERIFICADA" | "PENDIENTE" }[];
  slippage: { tasksShifted: number; daysLost: number; daysGained: number };
  deviations: Record<string, number>;
  baselines: Record<string, { start: string; due: string } | null>;
};

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${MES[Number(m) - 1]} ${y.slice(2)}`;
};

const MONTHS = Array.from({ length: 13 }, (_, i) => {
  const y = 2026 + Math.floor((7 + i) / 12);
  const m = ((7 + i) % 12) + 1;
  return { y, m, label: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][m - 1] + (m === 1 || i === 0 ? `'${String(y).slice(2)}` : "") };
});
const monthIndex = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return (y - 2026) * 12 + (m - 1) - 7;
};

export default function ProyectosPage() {
  const user = useUser();
  const router = useRouter();
  const params = useParams<{ slug?: string[] }>();
  const [view, setView] = useState<View>("tablero");
  const [data, setData] = useState<ApiData | null>(null);
  const v = useCatalog();
  const refetchCatalog = useCatalogRefetch();
  const inis = v.initiatives;

  // el seguimiento de cada iniciativa vive en la URL: /panel/proyectos/<iniId>
  const slugIni = params.slug?.[0] ? decodeURIComponent(params.slug[0]).toLowerCase() : null;
  const iniFilter = slugIni && inis.some((i) => i.id === slugIni) ? slugIni : null;
  const setIniFilter = (id: string | null) =>
    router.push(id ? `/panel/proyectos/${id}` : "/panel/proyectos", { scroll: false });

  // compatibilidad con los enlaces antiguos ?ini=<id>
  useEffect(() => {
    if (typeof window === "undefined" || iniFilter) return;
    const legacy = new URLSearchParams(window.location.search).get("ini");
    if (legacy && inis.some((i) => i.id === legacy)) {
      router.replace(`/panel/proyectos/${legacy}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/td/tasks");
    if (res.ok) setData(await res.json());
  }, []);
  // tras una mutación, además del plan se refresca la vista de la empresa
  // (las tareas vigentes alimentan los conteos de otras páginas)
  const refetchAll = useCallback(async () => {
    await Promise.all([refetch(), refetchCatalog()]);
  }, [refetch, refetchCatalog]);
  useEffect(() => { refetch(); }, [refetch]);

  const patchTask = useCallback(async (id: string, patch: Record<string, unknown>) => {
    setSaving(true); setError(null);
    const res = await fetch(`/api/td/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `Error ${res.status}`);
    } else {
      await refetchAll();
    }
    setSaving(false);
  }, [refetchAll]);

  const verifyEv = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const res = await fetch(`/api/td/evidence/${id}`, { method: "PATCH" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `Error ${res.status}`);
    } else {
      await refetch();
    }
    setSaving(false);
  }, [refetch]);

  const [creating, setCreating] = useState(false);
  const createTask = useCallback(async (input: Record<string, unknown>) => {
    setSaving(true); setError(null);
    const res = await fetch("/api/td/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const ok = res.ok;
    if (!ok) setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
    else { await refetchAll(); setCreating(false); }
    setSaving(false);
    return ok;
  }, [refetchAll]);

  const archiveTask = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const res = await fetch(`/api/td/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
    else { setOpenTask(null); await refetchAll(); }
    setSaving(false);
  }, [refetchAll]);

  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const personOf = useCallback(
    (id: string) => data?.people.find((p) => p.id === id) ?? null, [data]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (iniFilter) list = list.filter((t) => t.iniId === iniFilter);
    if (personFilter) list = list.filter((t) => assigneesOf(t).includes(personFilter));
    return list;
  }, [tasks, iniFilter, personFilter]);

  const task = openTask ? tasks.find((t) => t.id === openTask) ?? null : null;
  const canCreate = useCan("edit_tasks");

  if (!data) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <Loader2 size={16} className="animate-spin" /> Cargando el plan de trabajo…
        </span>
      </div>
    );
  }

  const currentIni = iniFilter ? inis.find((i) => i.id === iniFilter) : null;

  return (
    <>
      <PageHeader kicker={`GP · Gestor de proyectos${currentIni ? ` · ${currentIni.id.toUpperCase()}` : ""}`}
        title={currentIni ? currentIni.name : "Plan de trabajo del portafolio"}
        desc={currentIni
          ? `Plan de trabajo de la iniciativa: ${filtered.length} tareas. Hoy (demo): ${fmtDate(DEMO_TODAY)}.`
          : `${data.stats.total} tareas en ${inis.length} iniciativas · las mutaciones pasan por la matriz de permisos del servidor. Hoy (demo): ${fmtDate(DEMO_TODAY)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {currentIni && (
              <Link href={`/panel/iniciativas/${currentIni.id}`} className="chip chip-gold">
                Ficha de la iniciativa →
              </Link>
            )}
            {canCreate && inis.length > 0 && (
              <button onClick={() => setCreating((c) => !c)}
                className="btn-primary !py-1.5 text-[12px]">
                <Plus size={13} /> Nueva tarea
              </button>
            )}
            <AccessChip module="proyectos" />
            <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
              {([["tablero", KanbanSquare, "Tablero"], ["cronograma", CalendarRange, "Cronograma"], ["personas", Users, "Personas"]] as const).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${
                    view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
                  <Icon size={13} className={view === v ? "text-cyan-deep" : ""} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        } />

      {/* error de mutación (403/422 explicado por el servidor) */}
      {error && (
        <div className="rise mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
          style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} />
          <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">{error}</p>
          <button onClick={() => setError(null)} className="text-faint hover:text-ink"><X size={14} /></button>
        </div>
      )}

      {/* alta de tarea */}
      {creating && canCreate && inis.length > 0 && (
        <NewTaskForm people={data.people} allTasks={tasks}
          defaultIni={iniFilter ?? inis[0].id}
          saving={saving} onCreate={createTask} onClose={() => setCreating(false)} />
      )}

      {/* métricas */}
      <div className="rise rise-1 mb-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Tareas del portafolio" value={data.stats.total}
          unit={`en ${inis.length} iniciativas`}
          foot={`${data.stats.byStatus.HECHA} hechas · ${data.stats.byStatus.EN_CURSO + data.stats.byStatus.EN_REVISION} activas`} />
        <StatCard label="Vencidas" value={data.stats.overdue} unit="tareas"
          foot="Fecha compromiso superada sin cierre"
          accent="linear-gradient(90deg, var(--bad), #a13c44)" />
        <StatCard label="Vencen en 14 días" value={data.stats.dueSoon} unit="tareas"
          foot="La ventana de gestión de esta quincena"
          accent="linear-gradient(90deg, var(--warn), var(--gold))" />
        <StatCard label="Hechas con evidencia"
          value={tasks.filter((t) => t.status === "HECHA" && (t.evidenceIds?.length ?? 0) > 0).length}
          unit={`de ${data.stats.byStatus.HECHA} hechas`}
          foot={`Regla dura: ninguna actividad se cierra sin soporte · ${data.stats.people} personas asignadas`}
          accent="linear-gradient(90deg, var(--n4), var(--n5))" />
      </div>

      {/* deslizamiento del cronograma (línea base vs vigente) */}
      {data.slippage.tasksShifted > 0 && (
        <div className="rise rise-2 mb-5 flex items-center gap-2.5 rounded-xl px-4 py-2.5"
          style={{ background: "color-mix(in srgb, var(--warn) 9%, white)" }}>
          <CalendarRange size={14} style={{ color: "var(--warn)" }} />
          <p className="text-[12px] text-ink-soft">
            <b>Deslizamiento del cronograma:</b> {data.slippage.tasksShifted} tarea{data.slippage.tasksShifted > 1 ? "s" : ""} reprogramada{data.slippage.tasksShifted > 1 ? "s" : ""} frente a la línea base ·{" "}
            <b className="num" style={{ color: "var(--bad)" }}>+{data.slippage.daysLost} días perdidos</b>
            {data.slippage.daysGained > 0 && <> · <span className="num" style={{ color: "var(--ok)" }}>−{data.slippage.daysGained} recuperados</span></>}
          </p>
        </div>
      )}

      {/* alertas */}
      {data.alerts.length > 0 && (
        <div className="rise rise-2 mb-5 flex flex-wrap gap-2">
          {data.alerts.slice(0, 4).map((a) => (
            <button key={a.id} onClick={() => setOpenTask(a.taskId)}
              className="flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] transition-transform hover:-translate-y-0.5"
              style={{ background: a.severity === 1 ? "color-mix(in srgb, var(--bad) 9%, white)" : "color-mix(in srgb, var(--warn) 10%, white)" }}>
              {a.kind === "TAREA_BLOQUEADA"
                ? <Lock size={12} className="shrink-0" style={{ color: "var(--bad)" }} />
                : <AlertTriangle size={12} className="shrink-0" style={{ color: a.severity === 1 ? "var(--bad)" : "var(--warn)" }} />}
              <span className="min-w-0 max-w-[300px] truncate font-semibold text-ink">{a.title}</span>
              <span className="num text-[10px] text-muted">{a.ownerName.split(" ")[0]}</span>
            </button>
          ))}
          {data.alerts.length > 4 && (
            <span className="self-center text-[11px] text-faint">+{data.alerts.length - 4} más en el panel</span>
          )}
        </div>
      )}

      {/* filtros */}
      <div className="rise rise-2 mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setIniFilter(null)}
          className={`chip cursor-pointer ${iniFilter === null ? "chip-cyan" : ""}`}>
          Todas las iniciativas
        </button>
        {inis.filter((i) => tasks.some((t) => t.iniId === i.id)).map((i) => (
          <button key={i.id} onClick={() => setIniFilter(iniFilter === i.id ? null : i.id)}
            className={`chip cursor-pointer ${iniFilter === i.id ? "chip-cyan" : ""}`} title={i.name}>
            {i.name.length > 26 ? i.name.slice(0, 25) + "…" : i.name}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line-strong" />
        {data.people.filter((p) => tasks.some((t) => t.assigneeId === p.id)).map((p) => (
          <button key={p.id} onClick={() => setPersonFilter(personFilter === p.id ? null : p.id)}
            className={`num grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[9.5px] font-extrabold transition-all ${
              personFilter === p.id
                ? "text-white shadow-md ring-2 ring-cyan ring-offset-1"
                : "bg-surface-2 text-ink-soft hover:bg-surface-3"}`}
            style={personFilter === p.id ? { background: "var(--cyan-deep)" } : undefined}
            title={`${p.name} · ${p.cargo}`}>
            {initials(p.name)}
          </button>
        ))}
      </div>

      <div className={`grid gap-5 ${task ? "lg:grid-cols-[1fr_350px]" : ""}`}>
        <div className="min-w-0">
          {/* ═══ TABLERO ═══ */}
          {view === "tablero" && (
            <div className="grid gap-3 lg:grid-cols-5">
              {COLUMNS.map((col) => {
                const colTasks = filtered.filter((t) => t.status === col)
                  .sort((a, b) => a.due.localeCompare(b.due));
                const meta = TASK_STATUS_META[col];
                return (
                  <div key={col} className="rounded-2xl bg-surface-2/70 p-2">
                    <div className="mb-2 flex items-baseline justify-between px-2 pt-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
                        <i className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="num text-[10px] font-bold text-faint">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map((t) => (
                        <TaskCard key={t.id} t={t} person={personOf(t.assigneeId)}
                          onOpen={() => setOpenTask(t.id)} />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="rounded-xl px-3 py-4 text-center text-[10.5px] italic text-faint">Sin tareas</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ CRONOGRAMA ═══ */}
          {view === "cronograma" && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto px-5 py-4">
                <div className="min-w-[840px]">
                  <div className="mb-2 grid" style={{ gridTemplateColumns: `240px repeat(${MONTHS.length}, 1fr)` }}>
                    <div />
                    {MONTHS.map((m, i) => (
                      <div key={i} className="num border-l border-line text-center text-[9px] font-bold text-faint">
                        {m.label}
                      </div>
                    ))}
                  </div>
                  {inis.filter((i) => filtered.some((t) => t.iniId === i.id)).map((ini) => {
                    const mine = filtered.filter((t) => t.iniId === ini.id)
                      .sort((a, b) => a.start.localeCompare(b.start));
                    return (
                      <div key={ini.id} className="border-t border-line py-1.5">
                        <div className="mb-1 text-[11.5px] font-bold text-ink">{ini.name}</div>
                        {mine.map((t) => {
                          const s = Math.max(0, monthIndex(t.start));
                          const e = Math.min(MONTHS.length - 1, Math.max(s, monthIndex(t.due)));
                          const meta = TASK_STATUS_META[t.status];
                          const late = isOverdueFn(t);
                          return (
                            <div key={t.id} className="grid items-center"
                              style={{ gridTemplateColumns: `240px repeat(${MONTHS.length}, 1fr)` }}>
                              <button onClick={() => setOpenTask(t.id)}
                                className="truncate pr-3 text-left text-[10.5px] text-muted transition-colors hover:text-ink">
                                {t.title}
                              </button>
                              {MONTHS.map((_, mi) => (
                                <div key={mi} className="relative h-[18px] border-l border-line/60">
                                  {mi === s && (
                                    <button onClick={() => setOpenTask(t.id)}
                                      className="absolute inset-y-[3px] left-[2px] rounded-full transition-transform hover:scale-y-125"
                                      style={{
                                        width: `calc(${(e - s + 1) * 100}% - 4px)`,
                                        background: late ? "var(--bad)" : meta.color,
                                        opacity: t.status === "HECHA" ? 0.45 : 0.9,
                                      }}
                                      title={`${t.title} · ${fmtDate(t.start)} → ${fmtDate(t.due)}`} />
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-2.5 text-[10.5px] text-muted">
                {COLUMNS.map((c) => (
                  <span key={c} className="flex items-center gap-1.5">
                    <i className="h-2 w-4 rounded-full" style={{ background: TASK_STATUS_META[c].color }} />
                    {TASK_STATUS_META[c].label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-4 rounded-full" style={{ background: "var(--bad)" }} /> vencida
                </span>
              </div>
            </Card>
          )}

          {/* ═══ PERSONAS ═══ */}
          {view === "personas" && (
            <Card>
              <CardHeader title="Carga de trabajo por persona"
                sub="Tareas abiertas, vencidas y próximas — clic para filtrar el tablero" />
              <div className="overflow-x-auto px-3 pb-4">
                <table className="w-full min-w-[680px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line-strong">
                      {["Persona", "Cargo", "Abiertas", "Vencidas", "Vencen pronto", "Hechas", "Carga"].map((h) => (
                        <th key={h} className="label px-3 pb-2 text-left !text-[8.5px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.workload.map((w) => {
                      const max = Math.max(...data.workload.map((x) => x.open), 1);
                      return (
                        <tr key={w.personId} className="border-b border-line last:border-0 hover:bg-surface-2/50">
                          <td className="px-3 py-2.5">
                            <button onClick={() => { setPersonFilter(w.personId); setView("tablero"); }}
                              className="flex items-center gap-2.5 text-left">
                              <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white"
                                style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}>
                                {initials(w.name)}
                              </span>
                              <span className="font-bold text-ink">{w.name}</span>
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-muted">{w.cargo}</td>
                          <td className="num px-3 py-2.5 text-center font-bold text-ink">{w.open}</td>
                          <td className="num px-3 py-2.5 text-center font-extrabold"
                            style={{ color: w.overdue > 0 ? "var(--bad)" : "var(--faint)" }}>{w.overdue}</td>
                          <td className="num px-3 py-2.5 text-center font-bold"
                            style={{ color: w.dueSoon > 0 ? "var(--warn)" : "var(--faint)" }}>{w.dueSoon}</td>
                          <td className="num px-3 py-2.5 text-center text-muted">{w.done}</td>
                          <td className="px-3 py-2.5">
                            <div className="h-[7px] w-28 overflow-hidden rounded-full bg-surface-2">
                              <div className="h-full rounded-full"
                                style={{ width: `${(w.open / max) * 100}%`, background: w.overdue > 0 ? "var(--bad)" : "var(--grad-brand)" }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line px-5 py-2.5 text-[10.5px] text-faint">
                Personas ficticias de demostración; en operación el directorio se sincroniza con talento humano.
              </div>
            </Card>
          )}
        </div>

        {/* ═══ FICHA DE TAREA (con edición si hay permiso) ═══ */}
        {task && (
          <TaskSheet
            task={task}
            people={data.people}
            personOf={personOf}
            editable={data.editable[task.id] === true}
            canVerify={data.canVerifyEvidence}
            evidenceStatus={data.evidenceStatus}
            audit={data.audit.filter((a) => a.entityId === task.id)}
            comments={data.comments.filter((c) => c.taskId === task.id)}
            uploads={data.uploads.filter((u) => u.taskId === task.id)}
            deviation={data.deviations[task.id] ?? 0}
            baseline={data.baselines[task.id] ?? null}
            onComment={async (text) => {
              setSaving(true); setError(null);
              const res = await fetch(`/api/td/tasks/${task.id}/comments`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
              });
              if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "Error");
              else await refetch();
              setSaving(false);
            }}
            onUpload={async (file, title, kind) => {
              setSaving(true); setError(null);
              const fd = new FormData();
              fd.append("file", file); fd.append("title", title); fd.append("kind", kind);
              const res = await fetch(`/api/td/tasks/${task.id}/evidence`, { method: "POST", body: fd });
              if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "Error");
              else await refetch();
              setSaving(false);
            }}
            saving={saving}
            userRole={user.role}
            onClose={() => setOpenTask(null)}
            onOpenTask={setOpenTask}
            onPatch={patchTask}
            onVerify={verifyEv}
            onArchive={archiveTask}
            onRefetch={refetch}
            allTasks={tasks}
          />
        )}
      </div>
    </>
  );
}

/* ─── tarjeta del tablero ─── */

function TaskCard({ t, person: p, onOpen }: { t: Task; person: Person | null; onOpen: () => void }) {
  const v = useCatalog();
  const ini = v.initiatives.find((i) => i.id === t.iniId);
  const late = isOverdueFn(t);
  const soon = dueSoonFn(t);
  return (
    <button onClick={onOpen} className="panel panel-lift block w-full p-3 text-left">
      <div className="text-[12px] font-bold leading-snug text-ink">{t.title}</div>
      <div className="mt-1.5 truncate text-[9.5px] text-faint">{ini?.name ?? t.iniId.toUpperCase()}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center -space-x-1.5">
          <span className="num grid h-6 w-6 place-items-center rounded-full text-[8.5px] font-extrabold text-white ring-2 ring-surface"
            style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}
            title={p ? `${p.name} (responsable)` : undefined}>
            {p ? initials(p.name) : "?"}
          </span>
          {(t.coAssigneeIds ?? []).slice(0, 2).map((cid) => {
            const cp = person(v, cid);
            return (
              <span key={cid} className="num grid h-6 w-6 place-items-center rounded-full bg-surface-3 text-[8.5px] font-extrabold text-ink-soft ring-2 ring-surface"
                title={`${cp.name} (corresponsable)`}>
                {initials(cp.name)}
              </span>
            );
          })}
          {(t.coAssigneeIds?.length ?? 0) > 2 && (
            <span className="num grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[8px] font-bold text-faint ring-2 ring-surface">
              +{t.coAssigneeIds!.length - 2}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {(t.evidenceIds?.length ?? 0) > 0 && <FileText size={11} className="text-cyan-deep" />}
          {t.dependsOn?.length ? <Link2 size={11} className="text-faint" /> : null}
          <span className="num text-[10px] font-bold"
            style={{ color: late ? "var(--bad)" : soon ? "var(--warn)" : "var(--faint)" }}>
            {fmtDate(t.due)}
          </span>
        </span>
      </div>
    </button>
  );
}

/* ─── ficha con edición ─── */

function TaskSheet({ task, people, personOf, editable, canVerify, evidenceStatus, audit, comments, uploads, deviation, baseline, saving, userRole, onClose, onOpenTask, onPatch, onVerify, onArchive, onRefetch, onComment, onUpload, allTasks }: {
  task: Task;
  people: Person[];
  personOf: (id: string) => Person | null;
  editable: boolean;
  canVerify: boolean;
  evidenceStatus: Record<string, "VERIFICADA" | "PENDIENTE">;
  audit: { id: number; at: string; actor: string; change: string }[];
  saving: boolean;
  userRole: string;
  onClose: () => void;
  onOpenTask: (id: string) => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onVerify: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRefetch: () => Promise<void>;
  onComment: (text: string) => Promise<void>;
  onUpload: (file: File, title: string, kind: string) => Promise<void>;
  comments: ApiData["comments"];
  uploads: ApiData["uploads"];
  deviation: number;
  baseline: { start: string; due: string } | null;
  allTasks: Task[];
}) {
  const v = useCatalog();
  const evidences = evidencesOf(v);
  const [commentText, setCommentText] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [draft, setDraft] = useState({
    status: task.status, assigneeId: task.assigneeId,
    coAssigneeIds: task.coAssigneeIds ?? [], start: task.start, due: task.due,
  });
  useEffect(() => {
    setDraft({
      status: task.status, assigneeId: task.assigneeId,
      coAssigneeIds: task.coAssigneeIds ?? [], start: task.start, due: task.due,
    });
  }, [task]);
  const dirty = draft.status !== task.status || draft.assigneeId !== task.assigneeId
    || draft.start !== task.start || draft.due !== task.due
    || draft.coAssigneeIds.join(",") !== (task.coAssigneeIds ?? []).join(",");
  const assignee = personOf(task.assigneeId);
  const coAssignees = (task.coAssigneeIds ?? []).map((cid) => personOf(cid)).filter(Boolean) as Person[];

  return (
    <div className="order-first min-w-0 lg:order-none lg:sticky lg:top-[70px] lg:self-start">
      <Card className="ring-1 ring-cyan/40">
        <CardHeader title={task.id}
          sub={editable ? "Ficha editable — tu rol puede modificarla" : `Solo lectura para tu rol (${userRole})`}
          right={
            <button onClick={onClose}
              className="rounded-md p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink">
              <X size={15} />
            </button>
          } />
        <div className="space-y-4 px-5 pb-5">
          <h3 className="text-[14px] font-extrabold leading-snug text-ink">{task.title}</h3>

          {/* descripción: qué se hace y qué produce */}
          <p className="rounded-lg bg-surface-2/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-soft">
            {task.desc}
          </p>

          {/* responsable principal */}
          {editable ? (
            <div>
              <div className="label mb-1 !text-[8.5px]">Responsable principal</div>
              <select value={draft.assigneeId}
                onChange={(e) => setDraft({
                  ...draft,
                  assigneeId: e.target.value,
                  coAssigneeIds: draft.coAssigneeIds.filter((c) => c !== e.target.value),
                })}
                className="input !py-2 text-[12.5px]">
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.cargo}</option>
                ))}
              </select>
            </div>
          ) : (
            assignee && (
              <div className="flex items-center gap-2.5">
                <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}>
                  {initials(assignee.name)}
                </span>
                <div>
                  <div className="text-[13px] font-bold text-ink">{assignee.name}</div>
                  <div className="text-[10.5px] text-faint">{assignee.cargo} · {assignee.email}</div>
                </div>
              </div>
            )
          )}

          {/* corresponsables */}
          <div>
            <div className="label mb-1.5 !text-[8.5px]">
              Corresponsables {editable ? "" : `(${coAssignees.length})`}
            </div>
            {editable ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {draft.coAssigneeIds.map((cid) => {
                    const cp = personOf(cid);
                    return (
                      <span key={cid} className="chip chip-cyan">
                        {cp?.name ?? cid}
                        <button
                          onClick={() => setDraft({ ...draft, coAssigneeIds: draft.coAssigneeIds.filter((c) => c !== cid) })}
                          className="ml-0.5 cursor-pointer" title="Quitar">
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                  {draft.coAssigneeIds.length === 0 && (
                    <span className="text-[10.5px] italic text-faint">Sin corresponsables</span>
                  )}
                </div>
                <select value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setDraft({ ...draft, coAssigneeIds: [...draft.coAssigneeIds, e.target.value] });
                    }
                  }}
                  className="input mt-1.5 !py-1.5 text-[11.5px] text-muted">
                  <option value="">+ Añadir corresponsable…</option>
                  {people
                    .filter((p) => p.id !== draft.assigneeId && !draft.coAssigneeIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.cargo}</option>
                    ))}
                </select>
              </>
            ) : coAssignees.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {coAssignees.map((cp) => (
                  <span key={cp.id} className="chip" title={`${cp.cargo} · ${cp.email}`}>
                    {cp.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10.5px] italic text-faint">Sin corresponsables</span>
            )}
          </div>

          {/* fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label mb-1 !text-[8.5px]">Inicio</div>
              {editable ? (
                <input type="date" value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                  className="input !py-1.5 text-[12px]" />
              ) : (
                <div className="num rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] font-bold text-ink">{fmtDate(task.start)}</div>
              )}
            </div>
            <div>
              <div className="label mb-1 !text-[8.5px]">Compromiso</div>
              {editable ? (
                <input type="date" value={draft.due}
                  onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                  className="input !py-1.5 text-[12px]" />
              ) : (
                <div className="num rounded-lg px-3 py-2 text-[12.5px] font-bold"
                  style={{
                    background: isOverdueFn(task) ? "color-mix(in srgb, var(--bad) 9%, white)" : "var(--surface-2)",
                    color: isOverdueFn(task) ? "var(--bad)" : "var(--ink)",
                  }}>
                  {fmtDate(task.due)}{isOverdueFn(task) ? " · vencida" : ""}
                </div>
              )}
            </div>
          </div>

          {/* línea base y deslizamiento */}
          {baseline && deviation !== 0 && (
            <p className="num rounded-lg px-3 py-2 text-[11px]"
              style={{
                background: deviation > 0 ? "color-mix(in srgb, var(--warn) 10%, white)" : "color-mix(in srgb, var(--ok) 8%, white)",
                color: deviation > 0 ? "var(--warn)" : "var(--ok)",
              }}>
              Línea base: {fmtDate(baseline.due)} → vigente {fmtDate(task.due)} ({deviation > 0 ? "+" : ""}{deviation} días)
            </p>
          )}

          {/* reprogramación en cadena (si tiene dependientes) */}
          <CascadeBlock task={task} allTasks={allTasks} editable={editable} onRefetch={onRefetch} />

          {/* estado */}
          <div>
            <div className="label mb-1 !text-[8.5px]">Estado</div>
            {editable ? (
              <div className="flex flex-wrap gap-1.5">
                {COLUMNS.map((st) => (
                  <button key={st} onClick={() => setDraft({ ...draft, status: st })}
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all ${
                      draft.status === st ? "text-white shadow-sm" : "bg-surface-2 text-muted hover:text-ink"}`}
                    style={draft.status === st ? { background: TASK_STATUS_META[st].color } : undefined}>
                    {TASK_STATUS_META[st].label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white"
                style={{ background: TASK_STATUS_META[task.status].color }}>
                {TASK_STATUS_META[task.status].label}
              </span>
            )}
          </div>

          {editable && dirty && (
            <button onClick={() => onPatch(task.id, draft)} disabled={saving}
              className="btn-primary w-full !py-2 text-[12.5px]">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Guardar cambios
            </button>
          )}

          {task.note && (
            <p className="rounded-lg bg-gold-wash px-3 py-2.5 text-[11.5px] leading-relaxed" style={{ color: "#6b5312" }}>
              {task.note}
            </p>
          )}

          {/* dependencias */}
          {task.dependsOn && task.dependsOn.length > 0 && (
            <div>
              <div className="label mb-1.5 flex items-center gap-1 !text-[8.5px]"><Link2 size={10} /> Depende de</div>
              {task.dependsOn.map((d) => {
                const dep = allTasks.find((x) => x.id === d)!;
                return (
                  <button key={d} onClick={() => onOpenTask(d)}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-left transition-colors hover:bg-surface-3">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: TASK_STATUS_META[dep.status].color }} />
                    <span className="flex-1 truncate text-[11.5px] font-medium text-ink">{dep.title}</span>
                    <span className="num text-[9.5px] text-faint">{fmtDate(dep.due)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* evidencia + verificación */}
          <div>
            <div className="label mb-1.5 flex items-center gap-1 !text-[8.5px]"><FileText size={10} /> Evidencia del entregable</div>
            {(task.evidenceIds?.length ?? 0) > 0 ? (
              task.evidenceIds!.map((eid) => {
                const ev = evidences.find((e) => e.id === eid)
                  ?? { id: eid, title: `Evidencia ${eid}`, kind: "—", date: "—", status: "PENDIENTE" as const };
                const st = evidenceStatus[eid] ?? ev.status;
                return (
                  <div key={eid} className="mb-1 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-semibold text-ink">{ev.title}</div>
                      <div className="num mt-0.5 text-[9.5px] text-faint">{ev.kind} · {ev.date}</div>
                    </div>
                    {st === "VERIFICADA" ? (
                      <span className="chip chip-ok"><ShieldCheck size={10} /> Verificada</span>
                    ) : canVerify ? (
                      <button onClick={() => onVerify(eid)} disabled={saving}
                        className="chip chip-cyan cursor-pointer">
                        Verificar
                      </button>
                    ) : (
                      <span className="chip chip-warn">Pendiente</span>
                    )}
                  </div>
                );
              })
            ) : null}
            {/* evidencias subidas como archivo */}
            {uploads.map((u) => (
              <div key={u.id} className="mb-1 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <a href={`/api/files/${u.id}`} className="text-[11.5px] font-semibold text-cyan-deep hover:underline">
                    {u.title}
                  </a>
                  <div className="num mt-0.5 text-[9.5px] text-faint">
                    {u.fileName} · {(u.size / 1024).toFixed(0)} KB · subida por {u.uploadedBy} · {u.date}
                  </div>
                </div>
                {u.status === "VERIFICADA" ? (
                  <span className="chip chip-ok"><ShieldCheck size={10} /> Verificada</span>
                ) : canVerify ? (
                  <button onClick={() => onVerify(u.id)} disabled={saving} className="chip chip-cyan cursor-pointer">
                    Verificar
                  </button>
                ) : (
                  <span className="chip chip-warn">Pendiente</span>
                )}
              </div>
            ))}
            {(task.evidenceIds?.length ?? 0) === 0 && uploads.length === 0 && task.status !== "HECHA" && (
              <p className="rounded-lg px-3 py-2 text-[11.5px]"
                style={{ background: "color-mix(in srgb, var(--warn) 10%, white)", color: "var(--warn)" }}>
                Toda actividad exige al menos una evidencia: el servidor rechazará «Hecha» sin soporte adjunto.
              </p>
            )}
            {/* adjuntar archivo (si puede editar) */}
            {editable && (
              <div className="mt-2 space-y-2 rounded-lg bg-surface-2/70 p-2.5">
                <input type="text" placeholder="Título de la evidencia (p. ej. Acta del comité)"
                  value={evTitle} onChange={(e) => setEvTitle(e.target.value)}
                  className="input !py-1.5 text-[11.5px]" />
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-3 py-2 shadow-sm transition-colors hover:bg-cyan-wash">
                  <Paperclip size={13} className="shrink-0 text-cyan-deep" />
                  <span className={`min-w-0 flex-1 truncate text-[11.5px] ${evFile ? "font-semibold text-ink" : "text-muted"}`}>
                    {evFile ? evFile.name : "Seleccionar archivo…"}
                  </span>
                  {evFile && (
                    <span className="num shrink-0 text-[9.5px] text-faint">{(evFile.size / 1024).toFixed(0)} KB</span>
                  )}
                  <input type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.csv"
                    onChange={(e) => setEvFile(e.target.files?.[0] ?? null)} />
                </label>
                <button
                  onClick={async () => {
                    if (evFile && evTitle.trim()) {
                      await onUpload(evFile, evTitle, "Documento");
                      setEvFile(null); setEvTitle("");
                    }
                  }}
                  disabled={saving || !evFile || !evTitle.trim()}
                  className="btn-primary w-full !py-1.5 text-[11.5px] disabled:opacity-40">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                  Adjuntar evidencia
                </button>
                <p className="text-[9.5px] text-faint">
                  Máx. 15 MB · pdf, office, imagen, zip, csv · nace pendiente de verificación del consultor.
                </p>
              </div>
            )}
          </div>

          {/* comentarios */}
          <div>
            <div className="label mb-1.5 !text-[8.5px]">Comentarios ({comments.length})</div>
            <div className="max-h-44 space-y-1.5 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-surface-2/70 px-3 py-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-bold text-ink">{c.author}</span>
                    <span className="num text-[9px] text-faint">
                      {new Date(c.at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{c.text}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-[11px] italic text-faint">Sin comentarios aún — cualquier rol puede deliberar aquí.</p>
              )}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <input type="text" placeholder="Escribe un comentario…"
                value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    await onComment(commentText); setCommentText("");
                  }
                }}
                className="input flex-1 !py-1.5 text-[11.5px]" />
              <button
                onClick={async () => {
                  if (commentText.trim()) { await onComment(commentText); setCommentText(""); }
                }}
                disabled={saving || !commentText.trim()}
                className="btn-ghost !py-1.5 text-[11px] disabled:opacity-40">
                Enviar
              </button>
            </div>
          </div>

          {/* auditoría */}
          {audit.length > 0 && (
            <div>
              <div className="label mb-1.5 flex items-center gap-1 !text-[8.5px]"><History size={10} /> Últimos cambios</div>
              <div className="space-y-1">
                {audit.slice(0, 4).map((a) => (
                  <div key={a.id} className="rounded-lg bg-surface-2/70 px-3 py-1.5">
                    <div className="text-[11px] leading-snug text-ink-soft">{a.change}</div>
                    <div className="num mt-0.5 text-[9px] text-faint">
                      {a.actor} · {new Date(a.at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* archivar */}
          {editable && (
            <button
              onClick={() => {
                if (window.confirm(`¿Archivar «${task.title}»? Sale del plan activo pero conserva su auditoría.`)) {
                  onArchive(task.id);
                }
              }}
              disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11.5px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
              <Archive size={12} /> Archivar tarea
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ─── alta de tarea ─── */

function NewTaskForm({ people, allTasks, defaultIni, saving, onCreate, onClose }: {
  people: Person[];
  allTasks: Task[];
  defaultIni: string;
  saving: boolean;
  onCreate: (input: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const v = useCatalog();
  const [iniId, setIniId] = useState(defaultIni);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assigneeId, setAssigneeId] = useState(people[0]?.id ?? "P01");
  const [start, setStart] = useState(DEMO_TODAY);
  const [due, setDue] = useState(DEMO_TODAY);
  const [dependsOn, setDependsOn] = useState("");
  const [requiresEvidence, setRequiresEvidence] = useState(false);

  const iniTasks = allTasks.filter((t) => t.iniId === iniId);

  return (
    <Card className="rise mb-5 ring-1 ring-cyan/40">
      <CardHeader title="Nueva tarea"
        sub="Nace en «Por hacer», con línea base congelada en sus fechas — cerrar exigirá evidencia"
        right={<button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink"><X size={15} /></button>} />
      <div className="grid gap-3 px-5 pb-5 lg:grid-cols-2">
        <div className="space-y-2.5">
          <div>
            <div className="label mb-1 !text-[8.5px]">Iniciativa</div>
            <select value={iniId} onChange={(e) => { setIniId(e.target.value); setDependsOn(""); }}
              className="input !py-2 text-[12px]">
              {v.initiatives.map((i) => (
                <option key={i.id} value={i.id}>{i.id.toUpperCase()} · {i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1 !text-[8.5px]">Título</div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Qué actividad se ejecuta (mín. 8 caracteres)"
              className="input !py-2 text-[12px]" />
          </div>
          <div>
            <div className="label mb-1 !text-[8.5px]">Descripción — qué se hace y qué produce</div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              placeholder="Alcance verificable de la actividad (mín. 20 caracteres)"
              className="input w-full resize-y text-[12px]" />
          </div>
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="label mb-1 !text-[8.5px]">Responsable principal</div>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
              className="input !py-2 text-[12px]">
              {people.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.cargo}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="label mb-1 !text-[8.5px]">Inicio</div>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="input !py-1.5 text-[12px]" />
            </div>
            <div>
              <div className="label mb-1 !text-[8.5px]">Compromiso</div>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
                className="input !py-1.5 text-[12px]" />
            </div>
          </div>
          <div>
            <div className="label mb-1 !text-[8.5px]">Depende de (opcional)</div>
            <select value={dependsOn} onChange={(e) => setDependsOn(e.target.value)}
              className="input !py-2 text-[12px]">
              <option value="">Sin prerrequisito</option>
              {iniTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.id} · {t.title.slice(0, 48)}</option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-1 text-[11.5px] text-ink-soft">
            <input type="checkbox" checked={requiresEvidence}
              onChange={(e) => setRequiresEvidence(e.target.checked)} />
            Entregable formal (marca de evidencia en el tablero)
          </label>
          <button
            onClick={() => onCreate({
              iniId, title, desc, assigneeId, start, due,
              dependsOn: dependsOn ? [dependsOn] : undefined, requiresEvidence,
            })}
            disabled={saving || title.trim().length < 8 || desc.trim().length < 20 || !start || !due}
            className="btn-primary w-full !py-2 text-[12.5px] disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Crear tarea
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ─── reprogramación en cadena ─── */

type CascadeShiftUi = {
  id: string; title: string; due: string; newDue: string; newDeviation: number;
};

function CascadeBlock({ task, allTasks, editable, onRefetch }: {
  task: Task; allTasks: Task[]; editable: boolean; onRefetch: () => Promise<void>;
}) {
  const dependents = allTasks.filter((t) => t.dependsOn?.includes(task.id) && t.status !== "HECHA");
  const [due, setDue] = useState(task.due);
  const [preview, setPreview] = useState<{ delta: number; shifts: CascadeShiftUi[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setDue(task.due); setPreview(null); setErr(null); }, [task.id, task.due]);

  if (!editable || dependents.length === 0) return null;

  const call = async (apply: boolean) => {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/td/tasks/${task.id}/cascade`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ due, apply }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) setErr(j?.error ?? `Error ${res.status}`);
    else if (apply) { setPreview(null); await onRefetch(); }
    else setPreview(j);
    setBusy(false);
  };

  return (
    <div className="rounded-lg bg-surface-2/70 p-2.5">
      <div className="label mb-1.5 flex items-center gap-1 !text-[8.5px]">
        <CalendarRange size={10} /> Reprogramar en cadena · {dependents.length} dependiente{dependents.length > 1 ? "s" : ""}
      </div>
      <div className="flex gap-1.5">
        <input type="date" value={due} onChange={(e) => { setDue(e.target.value); setPreview(null); }}
          className="input !py-1 text-[11px]" />
        <button onClick={() => call(false)} disabled={busy || due === task.due}
          className="btn-ghost shrink-0 !py-1 text-[10.5px] disabled:opacity-40">
          {busy ? <Loader2 size={11} className="animate-spin" /> : "Vista previa"}
        </button>
      </div>
      {err && <p className="mt-1.5 text-[10.5px]" style={{ color: "var(--bad)" }}>{err}</p>}
      {preview && (
        <div className="mt-2 space-y-1">
          <p className="text-[10.5px] font-semibold text-ink">
            {preview.delta > 0 ? "+" : ""}{preview.delta} días · se corren {preview.shifts.length} tarea{preview.shifts.length !== 1 ? "s" : ""}:
          </p>
          {preview.shifts.map((s) => (
            <div key={s.id} className="num flex items-baseline gap-2 rounded bg-surface px-2 py-1 text-[10px]">
              <span className="font-bold text-cyan-deep">{s.id}</span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{s.title}</span>
              <span className="text-faint">{fmtDate(s.due)} → <b className="text-ink">{fmtDate(s.newDue)}</b></span>
              <span style={{ color: s.newDeviation > 0 ? "var(--warn)" : "var(--ok)" }}>
                {s.newDeviation > 0 ? "+" : ""}{s.newDeviation}d
              </span>
            </div>
          ))}
          <button onClick={() => call(true)} disabled={busy}
            className="btn-primary w-full !py-1.5 text-[11px] disabled:opacity-40">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <CalendarRange size={11} />}
            Aplicar corrimiento
          </button>
        </div>
      )}
      <p className="mt-1.5 text-[9px] text-faint">
        Corre las dependientes no cerradas el mismo número de días. El deslizamiento se sigue midiendo contra la línea base.
      </p>
    </div>
  );
}
