// ─────────────────────────────────────────────────────────────────────────────
// PGTD · Lógica del gestor de proyectos.
// Alertas de tareas (vencidas, bloqueadas, entregables sin evidencia,
// dependencias rotas), carga por persona y estadísticas por iniciativa.
// Funciones puras sobre los datos de proyectos; cubiertas por tests.
// ─────────────────────────────────────────────────────────────────────────────

import {
  isOverdue, dueSoon, DEMO_TODAY, assigneesOf,
  type Task, type TaskStatus,
} from "@/data/proyectos";
// Las tareas, las personas y las iniciativas vienen de la vista de la empresa
// (lib/vista): en el servidor, del store de la empresa activa; en el
// navegador, del CatalogProvider.
import { person as personOf, type TenantView } from "@/lib/vista";

/* ═══ Alertas de tareas ═══ */

export type TaskAlert = {
  id: string;
  kind: "TAREA_VENCIDA" | "TAREA_BLOQUEADA" | "ENTREGABLE_SIN_EVIDENCIA" | "DEPENDENCIA_VENCIDA";
  severity: 1 | 2 | 3;
  taskId: string;
  title: string;
  detail: string;
  ownerName: string;
  line: number;               // línea de la iniciativa (para dirigir notificaciones)
};

const daysLate = (t: Task) =>
  Math.round((new Date(DEMO_TODAY).getTime() - new Date(t.due).getTime()) / 86_400_000);

export function taskAlerts(v: TenantView): TaskAlert[] {
  const alerts: TaskAlert[] = [];
  const byId = new Map(v.tasks.map((t) => [t.id, t]));

  for (const t of v.tasks) {
    const ini = v.initiatives.find((i) => i.id === t.iniId);
    if (!ini) continue;
    const who = personOf(v, t.assigneeId).name;
    const line = ini.line;

    if (isOverdue(t)) {
      const late = daysLate(t);
      alerts.push({
        id: `tv-${t.id}`,
        kind: "TAREA_VENCIDA",
        severity: late > 21 ? 1 : 2,
        taskId: t.id,
        line,
        title: t.title,
        detail: `Vencida hace ${late} día${late === 1 ? "" : "s"} en «${ini.name}».${t.note ? " " + t.note : ""}`,
        ownerName: who,
      });
    }

    if (t.status === "BLOQUEADA") {
      alerts.push({
        id: `tb-${t.id}`,
        kind: "TAREA_BLOQUEADA",
        severity: 2,
        taskId: t.id,
        line,
        title: t.title,
        detail: `Bloqueada en «${ini.name}».${t.note ? " " + t.note : ""}`,
        ownerName: who,
      });
    }

    // toda tarea hecha debe tener al menos una evidencia (regla dura del cierre)
    if (t.status === "HECHA" && !(t.evidenceIds?.length)) {
      alerts.push({
        id: `te-${t.id}`,
        kind: "ENTREGABLE_SIN_EVIDENCIA",
        severity: 3,
        taskId: t.id,
        line,
        title: t.title,
        detail: `Cerrada sin evidencia adjunta en «${ini.name}»: toda actividad exige soporte verificable al cierre.`,
        ownerName: who,
      });
    }

    // dependencia vencida: la tarea espera un prerrequisito que ya venció
    if (t.status === "POR_HACER" && t.dependsOn?.length) {
      const lateDep = t.dependsOn.map((d) => byId.get(d)).find((d) => d && isOverdue(d));
      if (lateDep) {
        alerts.push({
          id: `td-${t.id}`,
          kind: "DEPENDENCIA_VENCIDA",
          severity: 3,
          taskId: t.id,
          line,
          title: t.title,
          detail: `Su prerrequisito «${lateDep.title}» está vencido: el cronograma de «${ini.name}» se corre en cadena.`,
          ownerName: who,
        });
      }
    }
  }
  return alerts.sort((a, b) => a.severity - b.severity);
}

/* ═══ Carga por persona ═══ */

export type Workload = {
  personId: string;
  name: string;
  cargo: string;
  open: number;        // tareas no cerradas
  overdue: number;
  dueSoon: number;     // vencen en ≤ 14 días
  done: number;
  total: number;
};

export function workload(v: TenantView): Workload[] {
  return v.catalog.people.map((p) => {
    // cuenta como suya toda tarea donde es principal o corresponsable
    const mine = v.tasks.filter((t) => assigneesOf(t).includes(p.id));
    return {
      personId: p.id,
      name: p.name,
      cargo: p.cargo,
      open: mine.filter((t) => t.status !== "HECHA").length,
      overdue: mine.filter(isOverdue).length,
      dueSoon: mine.filter((t) => dueSoon(t)).length,
      done: mine.filter((t) => t.status === "HECHA").length,
      total: mine.length,
    };
  }).filter((w) => w.total > 0)
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open);
}

/* ═══ Estadísticas por iniciativa ═══ */

export function initiativeTaskStats(v: TenantView, iniId: string) {
  const mine = v.tasks.filter((t) => t.iniId === iniId);
  return {
    total: mine.length,
    done: mine.filter((t) => t.status === "HECHA").length,
    overdue: mine.filter(isOverdue).length,
    blocked: mine.filter((t) => t.status === "BLOQUEADA").length,
    nextDue: mine
      .filter((t) => t.status !== "HECHA" && !isOverdue(t))
      .sort((a, b) => a.due.localeCompare(b.due))[0] ?? null,
  };
}

export function portfolioTaskStats(v: TenantView) {
  const byStatus: Record<TaskStatus, number> = {
    POR_HACER: 0, EN_CURSO: 0, EN_REVISION: 0, BLOQUEADA: 0, HECHA: 0,
  };
  for (const t of v.tasks) byStatus[t.status]++;
  return {
    total: v.tasks.length,
    byStatus,
    overdue: v.tasks.filter(isOverdue).length,
    dueSoon: v.tasks.filter((t) => dueSoon(t)).length,
    withEvidence: v.tasks.filter((t) => (t.evidenceIds?.length ?? 0) > 0).length,
    people: v.catalog.people.filter((p) => v.tasks.some((t) => assigneesOf(t).includes(p.id))).length,
  };
}
