/*
  Warnings:

  - The primary key for the `Assessment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Branding` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Branding` table. All the data in the column will be lost.
  - The primary key for the `CmiObjective` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Evidence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `FileAsset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `InitiativeDecision` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `InitiativeEvaluation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `InitiativeOverride` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Integration` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `NotifRead` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Person` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ProjectTask` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Responsible` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TeamResponse` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TestNote` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TestResponse` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `companyId` to the `Branding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `CmiObjective` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `DimensionScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Evidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `FileAsset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `InitiativeDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `InitiativeEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `InitiativeOverride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Integration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `KpiReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `NotifRead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Person` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `PracticeCapture` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `ProjectTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Responsible` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `TaskComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `TestNote` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assessment" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_CAPTURA',
    "note" TEXT,
    "publishedAt" DATETIME,
    "publishedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "Assessment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Assessment" ("companyId", "createdAt", "id", "label", "note", "period", "publishedAt", "publishedBy", "status") SELECT "companyId", "createdAt", "id", "label", "note", "period", "publishedAt", "publishedBy", "status" FROM "Assessment";
DROP TABLE "Assessment";
ALTER TABLE "new_Assessment" RENAME TO "Assessment";
CREATE INDEX "Assessment_companyId_publishedAt_idx" ON "Assessment"("companyId", "publishedAt" DESC);
CREATE TABLE "new_Branding" (
    "companyId" TEXT NOT NULL PRIMARY KEY,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL,
    CONSTRAINT "Branding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Branding" ("at", "data") SELECT "at", "data" FROM "Branding";
DROP TABLE "Branding";
ALTER TABLE "new_Branding" RENAME TO "Branding";
CREATE TABLE "new_CmiObjective" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "perspective" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "line" INTEGER,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "CmiObjective_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CmiObjective" ("id", "kpis", "line", "name", "perspective") SELECT "id", "kpis", "line", "name", "perspective" FROM "CmiObjective";
DROP TABLE "CmiObjective";
ALTER TABLE "new_CmiObjective" RENAME TO "CmiObjective";
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sector" TEXT,
    "size" TEXT,
    "sectorKey" TEXT,
    "ciiu" TEXT,
    "financials" JSONB,
    "territories" JSONB,
    "template" TEXT NOT NULL DEFAULT 'vacia',
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Company" ("active", "city", "createdAt", "department", "id", "logoUrl", "name", "sector", "shortName", "size", "slug") SELECT "active", "city", "createdAt", "department", "id", "logoUrl", "name", "sector", "shortName", "size", "slug" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE TABLE "new_DimensionScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "target" REAL,
    CONSTRAINT "DimensionScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DimensionScore_companyId_assessmentId_fkey" FOREIGN KEY ("companyId", "assessmentId") REFERENCES "Assessment" ("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DimensionScore" ("assessmentId", "dimension", "id", "line", "target", "value") SELECT "assessmentId", "dimension", "id", "line", "target", "value" FROM "DimensionScore";
DROP TABLE "DimensionScore";
ALTER TABLE "new_DimensionScore" RENAME TO "DimensionScore";
CREATE UNIQUE INDEX "DimensionScore_companyId_assessmentId_dimension_key" ON "DimensionScore"("companyId", "assessmentId", "dimension");
CREATE TABLE "new_Evidence" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "practice" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "note" TEXT,
    "fileUrl" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "Evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Evidence" ("fileUrl", "id", "note", "practice", "status", "verifiedAt", "verifiedBy") SELECT "fileUrl", "id", "note", "practice", "status", "verifiedAt", "verifiedBy" FROM "Evidence";
DROP TABLE "Evidence";
ALTER TABLE "new_Evidence" RENAME TO "Evidence";
CREATE UNIQUE INDEX "Evidence_companyId_practice_key" ON "Evidence"("companyId", "practice");
CREATE TABLE "new_FileAsset" (
    "companyId" TEXT NOT NULL,
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
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "FileAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FileAsset" ("at", "fileName", "filePath", "id", "kind", "mime", "size", "status", "taskId", "title", "uploadedBy") SELECT "at", "fileName", "filePath", "id", "kind", "mime", "size", "status", "taskId", "title", "uploadedBy" FROM "FileAsset";
DROP TABLE "FileAsset";
ALTER TABLE "new_FileAsset" RENAME TO "FileAsset";
CREATE INDEX "FileAsset_companyId_taskId_idx" ON "FileAsset"("companyId", "taskId");
CREATE TABLE "new_Initiative" (
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
    CONSTRAINT "Initiative_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Initiative_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Initiative" ("actions", "budgetCommitted", "budgetExecuted", "budgetPlanned", "cmiObjective", "code", "companyId", "dependency", "description", "dimension", "endQuarter", "feasibility", "framework", "horizon", "id", "impact", "kpiId", "line", "log", "metaResultado", "name", "nextMilestone", "ownerRole", "progress", "startQuarter", "status", "subsistema", "urgency") SELECT "actions", "budgetCommitted", "budgetExecuted", "budgetPlanned", "cmiObjective", "code", "companyId", "dependency", "description", "dimension", "endQuarter", "feasibility", "framework", "horizon", "id", "impact", "kpiId", "line", "log", "metaResultado", "name", "nextMilestone", "ownerRole", "progress", "startQuarter", "status", "subsistema", "urgency" FROM "Initiative";
DROP TABLE "Initiative";
ALTER TABLE "new_Initiative" RENAME TO "Initiative";
CREATE INDEX "Initiative_companyId_horizon_idx" ON "Initiative"("companyId", "horizon");
CREATE UNIQUE INDEX "Initiative_companyId_code_key" ON "Initiative"("companyId", "code");
CREATE TABLE "new_InitiativeDecision" (
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL,

    PRIMARY KEY ("companyId", "code"),
    CONSTRAINT "InitiativeDecision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InitiativeDecision" ("at", "code", "data") SELECT "at", "code", "data" FROM "InitiativeDecision";
DROP TABLE "InitiativeDecision";
ALTER TABLE "new_InitiativeDecision" RENAME TO "InitiativeDecision";
CREATE TABLE "new_InitiativeEvaluation" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "iniCode" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "InitiativeEvaluation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InitiativeEvaluation" ("at", "by", "data", "id", "iniCode") SELECT "at", "by", "data", "id", "iniCode" FROM "InitiativeEvaluation";
DROP TABLE "InitiativeEvaluation";
ALTER TABLE "new_InitiativeEvaluation" RENAME TO "InitiativeEvaluation";
CREATE INDEX "InitiativeEvaluation_companyId_iniCode_idx" ON "InitiativeEvaluation"("companyId", "iniCode");
CREATE TABLE "new_InitiativeOverride" (
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL,

    PRIMARY KEY ("companyId", "code"),
    CONSTRAINT "InitiativeOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InitiativeOverride" ("at", "code", "data") SELECT "at", "code", "data" FROM "InitiativeOverride";
DROP TABLE "InitiativeOverride";
ALTER TABLE "new_InitiativeOverride" RENAME TO "InitiativeOverride";
CREATE TABLE "new_Integration" (
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "fields" JSONB NOT NULL,
    "updatedBy" TEXT,
    "at" DATETIME NOT NULL,

    PRIMARY KEY ("companyId", "key"),
    CONSTRAINT "Integration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Integration" ("at", "enabled", "fields", "key", "updatedBy") SELECT "at", "enabled", "fields", "key", "updatedBy" FROM "Integration";
DROP TABLE "Integration";
ALTER TABLE "new_Integration" RENAME TO "Integration";
CREATE TABLE "new_Kpi" (
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
    CONSTRAINT "Kpi_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Kpi" ("baseline", "cmiObjective", "code", "companyId", "definition", "formula", "frequency", "goodDirection", "id", "line", "name", "ownerRole", "source", "target", "unit") SELECT "baseline", "cmiObjective", "code", "companyId", "definition", "formula", "frequency", "goodDirection", "id", "line", "name", "ownerRole", "source", "target", "unit" FROM "Kpi";
DROP TABLE "Kpi";
ALTER TABLE "new_Kpi" RENAME TO "Kpi";
CREATE INDEX "Kpi_companyId_line_idx" ON "Kpi"("companyId", "line");
CREATE UNIQUE INDEX "Kpi_companyId_code_key" ON "Kpi"("companyId", "code");
CREATE TABLE "new_KpiReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "note" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KpiReport" ("at", "by", "code", "id", "note", "period", "value") SELECT "at", "by", "code", "id", "note", "period", "value" FROM "KpiReport";
DROP TABLE "KpiReport";
ALTER TABLE "new_KpiReport" RENAME TO "KpiReport";
CREATE UNIQUE INDEX "KpiReport_companyId_code_period_key" ON "KpiReport"("companyId", "code", "period");
CREATE TABLE "new_NotifRead" (
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ids" JSONB NOT NULL,

    PRIMARY KEY ("companyId", "email"),
    CONSTRAINT "NotifRead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotifRead" ("email", "ids") SELECT "email", "ids" FROM "NotifRead";
DROP TABLE "NotifRead";
ALTER TABLE "new_NotifRead" RENAME TO "NotifRead";
CREATE TABLE "new_Person" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("cargo", "dependencia", "email", "id", "name", "responsibleId") SELECT "cargo", "dependencia", "email", "id", "name", "responsibleId" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE UNIQUE INDEX "Person_companyId_email_key" ON "Person"("companyId", "email");
CREATE TABLE "new_PracticeCapture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "cut" TEXT NOT NULL DEFAULT 'A3',
    "practice" TEXT NOT NULL,
    "perception" INTEGER,
    "evidence" TEXT,
    "level" INTEGER,
    "note" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeCapture_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PracticeCapture" ("at", "by", "cut", "evidence", "id", "level", "note", "perception", "practice") SELECT "at", "by", "cut", "evidence", "id", "level", "note", "perception", "practice" FROM "PracticeCapture";
DROP TABLE "PracticeCapture";
ALTER TABLE "new_PracticeCapture" RENAME TO "PracticeCapture";
CREATE UNIQUE INDEX "PracticeCapture_companyId_cut_practice_key" ON "PracticeCapture"("companyId", "cut", "practice");
CREATE TABLE "new_ProjectTask" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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
    "baseStart" DATETIME,
    "baseDue" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "ProjectTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTask" ("archived", "assigneeId", "baseDue", "baseStart", "coAssigneeIds", "dependsOn", "desc", "due", "evidenceIds", "id", "iniCode", "initiativeId", "note", "requiresEvidence", "start", "status", "title") SELECT "archived", "assigneeId", "baseDue", "baseStart", "coAssigneeIds", "dependsOn", "desc", "due", "evidenceIds", "id", "iniCode", "initiativeId", "note", "requiresEvidence", "start", "status", "title" FROM "ProjectTask";
DROP TABLE "ProjectTask";
ALTER TABLE "new_ProjectTask" RENAME TO "ProjectTask";
CREATE INDEX "ProjectTask_companyId_iniCode_status_idx" ON "ProjectTask"("companyId", "iniCode", "status");
CREATE INDEX "ProjectTask_companyId_assigneeId_due_idx" ON "ProjectTask"("companyId", "assigneeId", "due");
CREATE TABLE "new_Responsible" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "rolPlataforma" TEXT NOT NULL,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "Responsible_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Responsible" ("cargo", "dependencia", "id", "rolPlataforma") SELECT "cargo", "dependencia", "id", "rolPlataforma" FROM "Responsible";
DROP TABLE "Responsible";
ALTER TABLE "new_Responsible" RENAME TO "Responsible";
CREATE TABLE "new_TaskComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskComment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskComment" ("at", "author", "id", "role", "taskId", "text") SELECT "at", "author", "id", "role", "taskId", "text" FROM "TaskComment";
DROP TABLE "TaskComment";
ALTER TABLE "new_TaskComment" RENAME TO "TaskComment";
CREATE INDEX "TaskComment_companyId_taskId_at_idx" ON "TaskComment"("companyId", "taskId", "at");
CREATE TABLE "new_TeamResponse" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "area" TEXT,
    "answers" JSONB NOT NULL,
    "abierta" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "TeamResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TeamResponse" ("abierta", "answers", "area", "at", "companyId", "id") SELECT "abierta", "answers", "area", "at", "companyId", "id" FROM "TeamResponse";
DROP TABLE "TeamResponse";
ALTER TABLE "new_TeamResponse" RENAME TO "TeamResponse";
CREATE INDEX "TeamResponse_companyId_at_idx" ON "TeamResponse"("companyId", "at");
CREATE TABLE "new_TestNote" (
    "companyId" TEXT NOT NULL,
    "participant" TEXT NOT NULL,
    "restriccion" TEXT,
    "evidencias" TEXT,
    "accion" TEXT,
    "noNecesita" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("companyId", "participant"),
    CONSTRAINT "TestNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TestNote" ("accion", "at", "by", "evidencias", "noNecesita", "participant", "restriccion") SELECT "accion", "at", "by", "evidencias", "noNecesita", "participant", "restriccion" FROM "TestNote";
DROP TABLE "TestNote";
ALTER TABLE "new_TestNote" RENAME TO "TestNote";
CREATE TABLE "new_TestResponse" (
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "cargo" TEXT,
    "objetivo" TEXT,
    "answers" JSONB NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("companyId", "email"),
    CONSTRAINT "TestResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TestResponse" ("answers", "at", "cargo", "companyId", "email", "name", "objetivo", "role") SELECT "answers", "at", "cargo", "companyId", "email", "name", "objetivo", "role" FROM "TestResponse";
DROP TABLE "TestResponse";
ALTER TABLE "new_TestResponse" RENAME TO "TestResponse";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DIRECTIVO',
    "line" INTEGER,
    "companyId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "companyId", "createdAt", "email", "failedLogins", "id", "line", "lockedUntil", "name", "passwordHash", "role", "updatedAt") SELECT "active", "companyId", "createdAt", "email", "failedLogins", "id", "line", "lockedUntil", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
