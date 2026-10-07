-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DIRECTIVO',
    "line" INTEGER,
    "companyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sector" TEXT,
    "size" TEXT,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Responsible" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "rolPlataforma" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CmiObjective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "perspective" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "line" INTEGER
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_CAPTURA',
    "note" TEXT,
    "publishedAt" DATETIME,
    "publishedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DimensionScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "target" REAL,
    CONSTRAINT "DimensionScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeCapture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cut" TEXT NOT NULL DEFAULT 'A3',
    "practice" TEXT NOT NULL,
    "perception" INTEGER,
    "evidence" TEXT,
    "level" INTEGER,
    "note" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practice" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "note" TEXT,
    "fileUrl" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME
);

-- CreateTable
CREATE TABLE "TestResponse" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "cargo" TEXT,
    "objetivo" TEXT,
    "answers" JSONB NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestNote" (
    "participant" TEXT NOT NULL PRIMARY KEY,
    "restriccion" TEXT,
    "evidencias" TEXT,
    "accion" TEXT,
    "noNecesita" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestNote_participant_fkey" FOREIGN KEY ("participant") REFERENCES "TestResponse" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "area" TEXT,
    "answers" JSONB NOT NULL,
    "abierta" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiativeId" TEXT,
    "iniCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "assigneeId" TEXT NOT NULL,
    "coAssigneeIds" JSONB,
    "start" DATETIME NOT NULL,
    "due" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceIds" JSONB,
    "dependsOn" JSONB,
    "note" TEXT,
    CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "baseline" REAL,
    "target" REAL,
    "goodDirection" TEXT NOT NULL DEFAULT 'up',
    CONSTRAINT "Kpi_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KpiValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kpiId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiValue_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "budgetPlanned" REAL NOT NULL DEFAULT 0,
    "budgetCommitted" REAL NOT NULL DEFAULT 0,
    "budgetExecuted" REAL NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "kpiId" TEXT,
    CONSTRAINT "Initiative_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Initiative_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuccessFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'VERDE',
    "history" JSONB,
    "note" TEXT,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuccessFactor_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "Kpi_companyId_line_idx" ON "Kpi"("companyId", "line");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_companyId_code_key" ON "Kpi"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "KpiValue_kpiId_period_key" ON "KpiValue"("kpiId", "period");

-- CreateIndex
CREATE INDEX "Initiative_companyId_horizon_idx" ON "Initiative"("companyId", "horizon");

-- CreateIndex
CREATE UNIQUE INDEX "Initiative_companyId_code_key" ON "Initiative"("companyId", "code");
