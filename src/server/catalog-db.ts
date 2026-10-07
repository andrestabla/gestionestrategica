// Catálogo de una empresa ↔ base de datos. `writeCatalog` siembra (o copia la
// plantilla) y `readCatalog` reconstruye el catálogo para hidratar el estado
// de una empresa que no es la demo. El mapa 4Shine no se persiste.

import type { Catalog, CompanyInfo } from "@/data/catalogo";
import type { KpiFull, InitiativeFull, AssessmentRecord, EvidenceFull, CmiObjective, Responsible, CellScore } from "@/data/cmi";
import type { Person, Task } from "@/data/proyectos";
import { PRACTICES } from "@/data/mapa";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const day = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const FREQ: Record<string, KpiFull["frequency"]> = { MENSUAL: "Mensual", TRIMESTRAL: "Trimestral", SEMESTRAL: "Semestral", ANUAL: "Anual" };

export function companyRow(c: CompanyInfo) {
  return {
    slug: c.slug, name: c.name, shortName: c.shortName, city: c.city, department: c.department,
    sector: c.sector, size: c.size, sectorKey: c.sectorKey, ciiu: c.ciiu, template: c.template ?? "vacia",
    active: c.active, createdBy: c.createdBy ?? null,
  };
}

/** Escribe el catálogo completo de una empresa (idempotente: upsert por código). */
export async function writeCatalog(db: Db, companyId: string, cat: Catalog) {
  await db.company.update({ where: { id: companyId }, data: { financials: cat.financials ?? undefined, territories: cat.territories as never } });
  for (const r of cat.responsibles) {
    await db.responsible.upsert({ where: { companyId_id: { companyId, id: r.id } }, update: { cargo: r.cargo, dependencia: r.dependencia, rolPlataforma: r.rolPlataforma }, create: { companyId, ...r } });
  }
  for (const o of cat.objectives) {
    const data = { perspective: o.perspective, name: o.name, kpis: o.kpis as never, line: o.line ?? null };
    await db.cmiObjective.upsert({ where: { companyId_id: { companyId, id: o.id } }, update: data, create: { companyId, id: o.id, ...data } });
  }
  for (const a of cat.assessments) {
    await db.assessment.upsert({
      where: { companyId_id: { companyId, id: a.id } },
      update: { label: a.label, period: a.period, status: a.status, note: a.note },
      create: { id: a.id, companyId, label: a.label, period: a.period, status: a.status, note: a.note, publishedAt: a.status === "PUBLICADA" ? new Date(`${a.period}-28`) : null },
    });
    if (!a.scores) continue;
    for (const [line, dims] of Object.entries(a.scores)) {
      for (const [dimension, sc] of Object.entries(dims)) {
        await db.dimensionScore.upsert({
          where: { companyId_assessmentId_dimension: { companyId, assessmentId: a.id, dimension } },
          update: { value: sc.value, target: sc.target },
          create: { companyId, assessmentId: a.id, line: Number(line), dimension, value: sc.value, target: sc.target },
        });
      }
    }
  }
  for (const e of cat.evidences) {
    await db.evidence.upsert({ where: { companyId_id: { companyId, id: e.id } }, update: { practice: e.practice, status: e.status, note: e.note ?? null }, create: { companyId, id: e.id, practice: e.practice, status: e.status, note: e.note ?? null } });
  }
  const kpiIds = new Map<string, string>();
  for (const k of cat.kpis) {
    const data = {
      line: k.line, name: k.name, unit: k.unit, source: k.source, ownerRole: k.ownerId, definition: k.definition, formula: k.formula,
      cmiObjective: k.cmi, frequency: k.frequency.toUpperCase(), baseline: k.baseline, target: k.target, goodDirection: k.goodDirection,
    };
    const kpi = await db.kpi.upsert({ where: { companyId_code: { companyId, code: k.code } }, update: data, create: { companyId, code: k.code, ...data } });
    kpiIds.set(k.code, kpi.id);
    for (const v of k.series) {
      await db.kpiValue.upsert({ where: { kpiId_period: { kpiId: kpi.id, period: v.period } }, update: { value: v.value, note: v.note ?? null }, create: { kpiId: kpi.id, period: v.period, value: v.value, note: v.note ?? null } });
    }
  }
  for (const i of cat.initiatives) {
    const data = {
      line: i.line, name: i.name, description: i.objetivo, subsistema: i.subsistema, cmiObjective: i.cmi, dimension: i.capability, framework: i.framework,
      metaResultado: i.metaResultado, actions: i.actions as never, log: i.log as never, nextMilestone: i.nextMilestone as never, horizon: i.horizon,
      impact: i.impact, feasibility: i.feasibility, urgency: i.urgency, dependency: i.dependency, status: i.status, ownerRole: i.ownerId,
      startQuarter: i.start, endQuarter: i.end, budgetPlanned: i.budgetPlanned, budgetCommitted: i.budgetCommitted, budgetExecuted: i.budgetExecuted,
      progress: i.progress, kpiId: kpiIds.get(i.kpi) ?? null,
    };
    const existing = await db.initiative.findUnique({ where: { companyId_code: { companyId, code: i.id } } });
    const ini = existing
      ? await db.initiative.update({ where: { id: existing.id }, data })
      : await db.initiative.create({ data: { companyId, code: i.id, ...data } });
    await db.successFactor.deleteMany({ where: { initiativeId: ini.id } });
    for (const f of i.factors) await db.successFactor.create({ data: { initiativeId: ini.id, name: f.name, state: f.state, history: f.history as never, note: f.note ?? null } });
  }
  for (const p of cat.people) {
    await db.person.upsert({ where: { companyId_id: { companyId, id: p.id } }, update: { name: p.name, cargo: p.cargo, dependencia: p.dependencia, email: p.email, responsibleId: p.responsibleId }, create: { companyId, ...p } });
  }
  for (const t of cat.tasks) {
    const data = {
      iniCode: t.iniId, title: t.title, desc: t.desc, assigneeId: t.assigneeId, coAssigneeIds: (t.coAssigneeIds ?? []) as never,
      start: new Date(t.start), due: new Date(t.due), status: t.status, requiresEvidence: t.requiresEvidence ?? false,
      evidenceIds: (t.evidenceIds ?? []) as never, dependsOn: (t.dependsOn ?? []) as never, note: t.note ?? null,
    };
    await db.projectTask.upsert({ where: { companyId_id: { companyId, id: t.id } }, update: data, create: { companyId, id: t.id, baseStart: new Date(t.start), baseDue: new Date(t.due), ...data } });
  }
}

/** Reconstruye el catálogo de una empresa desde la base. */
export async function readCatalog(db: Db, company: CompanyInfo & { dbId: string }): Promise<Catalog> {
  const companyId = company.dbId;
  const row = await db.company.findUnique({ where: { id: companyId } });
  const responsibles: Responsible[] = (await db.responsible.findMany({ where: { companyId }, orderBy: { id: "asc" } }))
    .map((r: Responsible) => ({ id: r.id, cargo: r.cargo, dependencia: r.dependencia, rolPlataforma: r.rolPlataforma }));
  const objectives: CmiObjective[] = (await db.cmiObjective.findMany({ where: { companyId }, orderBy: { id: "asc" } }))
    .map((o: { id: string; perspective: string; name: string; kpis: unknown; line: number | null }) => ({ id: o.id, perspective: o.perspective, name: o.name, kpis: (o.kpis as string[]) ?? [], line: o.line ?? undefined }));
  const kpiRows = await db.kpi.findMany({ where: { companyId }, include: { values: true }, orderBy: { code: "asc" } });
  const kpiCodeById = new Map<string, string>();
  const kpis: KpiFull[] = kpiRows.map((k: Record<string, unknown> & { values: { period: string; value: number; note: string | null }[] }) => {
    kpiCodeById.set(k.id as string, k.code as string);
    return {
      code: k.code as string, line: k.line as number, cmi: (k.cmiObjective as string) ?? "", name: k.name as string,
      definition: (k.definition as string) ?? "", formula: (k.formula as string) ?? "", unit: k.unit as string,
      frequency: FREQ[(k.frequency as string) ?? "TRIMESTRAL"] ?? "Trimestral", source: (k.source as string) ?? "",
      ownerId: (k.ownerRole as string) ?? "", baseline: (k.baseline as number) ?? 0, target: (k.target as number) ?? 0,
      goodDirection: (k.goodDirection as "up" | "down") ?? "up",
      series: k.values.map((v) => ({ period: v.period, value: v.value, ...(v.note ? { note: v.note } : {}) })).sort((a, b) => a.period.localeCompare(b.period)),
    };
  });
  const iniRows = await db.initiative.findMany({ where: { companyId }, include: { successFactors: true }, orderBy: { code: "asc" } });
  const initiatives: InitiativeFull[] = iniRows.map((i: Record<string, unknown> & { successFactors: { name: string; state: string; history: unknown; note: string | null }[] }) => ({
    id: i.code as string, line: i.line as number, subsistema: (i.subsistema as InitiativeFull["subsistema"]) ?? "Dirección", cmi: (i.cmiObjective as string) ?? "",
    name: i.name as string, objetivo: (i.description as string) ?? "", horizon: i.horizon as InitiativeFull["horizon"],
    impact: i.impact as number, feasibility: i.feasibility as number, urgency: i.urgency as number, dependency: i.dependency as number,
    status: i.status as InitiativeFull["status"], start: (i.startQuarter as string) ?? "", end: (i.endQuarter as string) ?? "",
    ownerId: (i.ownerRole as string) ?? "", metaResultado: (i.metaResultado as string) ?? "",
    budgetPlanned: i.budgetPlanned as number, budgetCommitted: i.budgetCommitted as number, budgetExecuted: i.budgetExecuted as number,
    progress: i.progress as number, capability: (i.dimension as string) ?? "", framework: (i.framework as string) ?? "",
    kpi: i.kpiId ? (kpiCodeById.get(i.kpiId as string) ?? "") : "",
    actions: (i.actions as InitiativeFull["actions"]) ?? [], log: (i.log as InitiativeFull["log"]) ?? [],
    nextMilestone: (i.nextMilestone as InitiativeFull["nextMilestone"]) ?? { date: "", text: "" },
    factors: i.successFactors.map((f) => ({ name: f.name, state: f.state as "VERDE" | "AMBAR" | "ROJO", history: (f.history as string[]) ?? [], ...(f.note ? { note: f.note } : {}) })),
  }));
  const people: Person[] = (await db.person.findMany({ where: { companyId }, orderBy: { id: "asc" } }))
    .map((p: Person) => ({ id: p.id, name: p.name, cargo: p.cargo, dependencia: p.dependencia, email: p.email, responsibleId: p.responsibleId }));
  const tasks: Task[] = (await db.projectTask.findMany({ where: { companyId, archived: false }, orderBy: { id: "asc" } }))
    .map((t: Record<string, unknown>) => ({
      id: t.id as string, iniId: t.iniCode as string, title: t.title as string, desc: (t.desc as string) ?? "", assigneeId: t.assigneeId as string,
      coAssigneeIds: ((t.coAssigneeIds as string[]) ?? []).length ? (t.coAssigneeIds as string[]) : undefined,
      start: day(t.baseStart as Date ?? t.start as Date), due: day(t.baseDue as Date ?? t.due as Date), status: t.status as Task["status"],
      requiresEvidence: Boolean(t.requiresEvidence), evidenceIds: ((t.evidenceIds as string[]) ?? []).length ? (t.evidenceIds as string[]) : undefined,
      dependsOn: ((t.dependsOn as string[]) ?? []).length ? (t.dependsOn as string[]) : undefined, note: (t.note as string) ?? undefined,
    }));
  const aRows = await db.assessment.findMany({ where: { companyId }, include: { scores: true }, orderBy: { period: "asc" } });
  const assessments: AssessmentRecord[] = aRows.map((a: Record<string, unknown> & { scores: { line: number; dimension: string; value: number; target: number | null }[] }) => {
    let scores: AssessmentRecord["scores"] = null;
    if (a.scores.length) {
      scores = { 1: {}, 2: {}, 3: {}, 4: {} };
      for (const sc of a.scores) scores[sc.line][sc.dimension] = { value: sc.value, target: sc.target ?? 0 } as CellScore;
    }
    return { id: a.id as string, label: a.label as string, period: a.period as string, status: a.status as AssessmentRecord["status"], note: (a.note as string) ?? "", scores };
  });
  const evRows = await db.evidence.findMany({ where: { companyId }, orderBy: { id: "asc" } });
  const evidences: EvidenceFull[] = evRows.map((e: { id: string; practice: string; status: string; note: string | null }) => {
    const p = PRACTICES.find((x) => x.code === e.practice);
    return {
      id: e.id, line: p?.line ?? 1, dimension: p?.dim ?? "", practice: e.practice, title: p?.ev.split(".")[0] ?? e.practice,
      kind: "Documento", date: "", status: e.status as EvidenceFull["status"], sourceId: "", ...(e.note ? { note: e.note } : {}),
    };
  });
  return {
    company, responsibles, objectives, kpis, evidences, initiatives, people, tasks, assessments,
    financials: (row?.financials as Catalog["financials"]) ?? null,
    territories: (row?.territories as Catalog["territories"]) ?? [],
    demoResponses: [], seedEvaluations: [], seedDecisions: [], seedUsers: [],
  };
}
