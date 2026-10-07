-- CreateTable
CREATE TABLE "KpiReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "note" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InitiativeOverride" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Integration" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "fields" JSONB NOT NULL,
    "updatedBy" TEXT,
    "at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotifRead" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "ids" JSONB NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectTask" (
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
    "baseStart" DATETIME,
    "baseDue" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTask" ("assigneeId", "coAssigneeIds", "dependsOn", "desc", "due", "evidenceIds", "id", "iniCode", "initiativeId", "note", "requiresEvidence", "start", "status", "title") SELECT "assigneeId", "coAssigneeIds", "dependsOn", "desc", "due", "evidenceIds", "id", "iniCode", "initiativeId", "note", "requiresEvidence", "start", "status", "title" FROM "ProjectTask";
DROP TABLE "ProjectTask";
ALTER TABLE "new_ProjectTask" RENAME TO "ProjectTask";
CREATE INDEX "ProjectTask_iniCode_status_idx" ON "ProjectTask"("iniCode", "status");
CREATE INDEX "ProjectTask_assigneeId_due_idx" ON "ProjectTask"("assigneeId", "due");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "KpiReport_code_period_key" ON "KpiReport"("code", "period");
