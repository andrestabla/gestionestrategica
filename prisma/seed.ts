// Seed de la plataforma: siembra Andina Suministros con los mismos datos del
// modo demo (src/data). Uso: npm run db:seed  (requiere DATABASE_URL)

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { INSTITUTION, KPIS, INITIATIVES, DEMO_USERS } from "../src/data/demo";
import { RESPONSIBLES, CMI_OBJECTIVES, SCORES_HISTORY, EVIDENCE_CATALOG } from "../src/data/cmi";
import { PEOPLE, TASKS } from "../src/data/proyectos";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./var/4shine.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: INSTITUTION.slug },
    update: {},
    create: {
      slug: INSTITUTION.slug, name: INSTITUTION.name, shortName: INSTITUTION.shortName,
      city: INSTITUTION.city, department: INSTITUTION.department, sector: INSTITUTION.sector, size: INSTITUTION.size,
    },
  });

  // usuarios
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email, name: u.name, role: u.role,
        line: "line" in u ? (u as { line?: number }).line : undefined,
        passwordHash: await bcrypt.hash(u.password, 10),
        companyId: company.id,
      },
    });
  }

  // gobierno del modelo: responsables y cuadro de mando
  for (const r of RESPONSIBLES) {
    await prisma.responsible.upsert({ where: { id: r.id }, update: {}, create: { ...r } });
  }
  for (const o of CMI_OBJECTIVES) {
    await prisma.cmiObjective.upsert({
      where: { id: o.id }, update: {},
      create: { id: o.id, perspective: o.perspective, name: o.name, kpis: o.kpis as never, line: o.line },
    });
  }

  // mediciones publicadas del diagnóstico (A1 y A2) con sus puntajes por dimensión
  for (const a of SCORES_HISTORY) {
    const created = await prisma.assessment.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id, companyId: company.id, label: a.label, period: a.period, status: a.status, note: a.note,
        publishedAt: a.status === "PUBLICADA" ? new Date(`${a.period}-28`) : null,
      },
    });
    if (!a.scores) continue;
    for (const [line, dims] of Object.entries(a.scores)) {
      for (const [dimension, s] of Object.entries(dims)) {
        await prisma.dimensionScore.upsert({
          where: { assessmentId_dimension: { assessmentId: created.id, dimension } },
          update: { value: s.value, target: s.target },
          create: { assessmentId: created.id, line: Number(line), dimension, value: s.value, target: s.target },
        });
      }
    }
  }

  // evidencias: una por práctica, con el estado de la verificación
  for (const e of EVIDENCE_CATALOG) {
    await prisma.evidence.upsert({
      where: { id: e.id }, update: {},
      create: { id: e.id, practice: e.practice, status: e.status, note: e.note },
    });
  }

  // KPI + series
  const kpiIds = new Map<string, string>();
  for (const k of KPIS) {
    const kpi = await prisma.kpi.upsert({
      where: { companyId_code: { companyId: company.id, code: k.code } },
      update: {},
      create: {
        companyId: company.id, line: k.line, code: k.code, name: k.name, unit: k.unit,
        source: k.source, ownerRole: k.owner, definition: k.definition, formula: k.formula,
        cmiObjective: k.cmi, frequency: k.frequency.toUpperCase(), baseline: k.baseline,
        target: k.target, goodDirection: k.goodDirection,
      },
    });
    kpiIds.set(k.code, kpi.id);
    for (const v of k.series) {
      await prisma.kpiValue.upsert({
        where: { kpiId_period: { kpiId: kpi.id, period: v.period } },
        update: {}, create: { kpiId: kpi.id, period: v.period, value: v.value, note: v.note },
      });
    }
  }

  // iniciativas + factores
  const iniIds = new Map<string, string>();
  for (const i of INITIATIVES) {
    const existing = await prisma.initiative.findUnique({ where: { companyId_code: { companyId: company.id, code: i.id } } });
    const ini = existing ?? await prisma.initiative.create({
      data: {
        companyId: company.id, code: i.id, line: i.line, name: i.name, description: i.objetivo,
        subsistema: i.subsistema, cmiObjective: i.cmi, dimension: i.capability, framework: i.framework,
        metaResultado: i.metaResultado, actions: i.actions as never, log: i.log as never,
        nextMilestone: i.nextMilestone as never, horizon: i.horizon, impact: i.impact,
        feasibility: i.feasibility, urgency: i.urgency, dependency: i.dependency, status: i.status,
        ownerRole: i.owner, startQuarter: i.start, endQuarter: i.end,
        budgetPlanned: i.budgetPlanned, budgetCommitted: i.budgetCommitted, budgetExecuted: i.budgetExecuted,
        progress: i.progress, kpiId: kpiIds.get(i.kpi),
        successFactors: { create: i.factors.map((f) => ({ name: f.name, state: f.state, history: f.history as never, note: f.note })) },
      },
    });
    iniIds.set(i.id, ini.id);
  }

  // gestor de proyectos: personas y tareas
  for (const p of PEOPLE) {
    await prisma.person.upsert({ where: { id: p.id }, update: {}, create: { ...p } });
  }
  for (const t of TASKS) {
    await prisma.projectTask.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id, initiativeId: iniIds.get(t.iniId), iniCode: t.iniId, title: t.title, desc: t.desc,
        assigneeId: t.assigneeId, coAssigneeIds: t.coAssigneeIds ?? [],
        start: new Date(t.start), due: new Date(t.due), baseStart: new Date(t.start), baseDue: new Date(t.due), status: t.status,
        requiresEvidence: t.requiresEvidence ?? false,
        evidenceIds: (t.evidenceIds ?? []) as never, dependsOn: (t.dependsOn ?? []) as never, note: t.note,
      },
    });
  }

  console.log("Seed completo:", company.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
