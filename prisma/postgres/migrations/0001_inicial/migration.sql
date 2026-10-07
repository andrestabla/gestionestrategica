-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DIRECTIVO',
    "line" INTEGER,
    "companyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sector" TEXT,
    "size" TEXT,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsible" (
    "id" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "rolPlataforma" TEXT NOT NULL,

    CONSTRAINT "Responsible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmiObjective" (
    "id" TEXT NOT NULL,
    "perspective" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "line" INTEGER,

    CONSTRAINT "CmiObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_CAPTURA',
    "note" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DimensionScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION,

    CONSTRAINT "DimensionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeCapture" (
    "id" TEXT NOT NULL,
    "cut" TEXT NOT NULL DEFAULT 'A3',
    "practice" TEXT NOT NULL,
    "perception" INTEGER,
    "evidence" TEXT,
    "level" INTEGER,
    "note" TEXT,
    "by" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "practice" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "note" TEXT,
    "fileUrl" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResponse" (
    "email" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "cargo" TEXT,
    "objetivo" TEXT,
    "answers" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResponse_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "TestNote" (
    "participant" TEXT NOT NULL,
    "restriccion" TEXT,
    "evidencias" TEXT,
    "accion" TEXT,
    "noNecesita" TEXT,
    "by" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestNote_pkey" PRIMARY KEY ("participant")
);

-- CreateTable
CREATE TABLE "TeamResponse" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "area" TEXT,
    "answers" JSONB NOT NULL,
    "abierta" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT,
    "iniCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "assigneeId" TEXT NOT NULL,
    "coAssigneeIds" JSONB,
    "start" TIMESTAMP(3) NOT NULL,
    "due" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceIds" JSONB,
    "dependsOn" JSONB,
    "note" TEXT,
    "baseStart" TIMESTAMP(3),
    "baseDue" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" SERIAL NOT NULL,
    "taskId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiReport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "by" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeOverride" (
    "code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeOverride_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "InitiativeEvaluation" (
    "id" TEXT NOT NULL,
    "iniCode" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeDecision" (
    "code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeDecision_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Integration" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "fields" JSONB NOT NULL,
    "updatedBy" TEXT,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotifRead" (
    "email" TEXT NOT NULL,
    "ids" JSONB NOT NULL,

    CONSTRAINT "NotifRead_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT,
    "formula" TEXT,
    "cmiObjective" TEXT,
    "unit" TEXT NOT NULL,
    "source" TEXT,
    "ownerRole" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'TRIMESTRAL',
    "baseline" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "goodDirection" TEXT NOT NULL DEFAULT 'up',

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiValue" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subsistema" TEXT,
    "cmiObjective" TEXT,
    "dimension" TEXT,
    "framework" TEXT,
    "metaResultado" TEXT,
    "actions" JSONB,
    "log" JSONB,
    "nextMilestone" JSONB,
    "horizon" TEXT NOT NULL,
    "impact" INTEGER NOT NULL,
    "feasibility" INTEGER NOT NULL,
    "urgency" INTEGER NOT NULL DEFAULT 3,
    "dependency" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'PLANEADA',
    "ownerRole" TEXT,
    "startQuarter" TEXT,
    "endQuarter" TEXT,
    "budgetPlanned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetCommitted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetExecuted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "kpiId" TEXT,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessFactor" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'VERDE',
    "history" JSONB,
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuccessFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Assessment_companyId_publishedAt_idx" ON "Assessment"("companyId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DimensionScore_assessmentId_dimension_key" ON "DimensionScore"("assessmentId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeCapture_cut_practice_key" ON "PracticeCapture"("cut", "practice");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_practice_key" ON "Evidence"("practice");

-- CreateIndex
CREATE INDEX "TeamResponse_companyId_at_idx" ON "TeamResponse"("companyId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE INDEX "ProjectTask_iniCode_status_idx" ON "ProjectTask"("iniCode", "status");

-- CreateIndex
CREATE INDEX "ProjectTask_assigneeId_due_idx" ON "ProjectTask"("assigneeId", "due");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_at_idx" ON "TaskComment"("taskId", "at");

-- CreateIndex
CREATE INDEX "FileAsset_taskId_idx" ON "FileAsset"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiReport_code_period_key" ON "KpiReport"("code", "period");

-- CreateIndex
CREATE INDEX "InitiativeEvaluation_iniCode_idx" ON "InitiativeEvaluation"("iniCode");

-- CreateIndex
CREATE INDEX "Kpi_companyId_line_idx" ON "Kpi"("companyId", "line");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_companyId_code_key" ON "Kpi"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "KpiValue_kpiId_period_key" ON "KpiValue"("kpiId", "period");

-- CreateIndex
CREATE INDEX "Initiative_companyId_horizon_idx" ON "Initiative"("companyId", "horizon");

-- CreateIndex
CREATE UNIQUE INDEX "Initiative_companyId_code_key" ON "Initiative"("companyId", "code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimensionScore" ADD CONSTRAINT "DimensionScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResponse" ADD CONSTRAINT "TestResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamResponse" ADD CONSTRAINT "TeamResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessFactor" ADD CONSTRAINT "SuccessFactor_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

