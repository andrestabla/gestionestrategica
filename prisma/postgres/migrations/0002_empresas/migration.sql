-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_companyId_fkey";

-- DropForeignKey
ALTER TABLE "DimensionScore" DROP CONSTRAINT "DimensionScore_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "TestResponse" DROP CONSTRAINT "TestResponse_companyId_fkey";

-- DropForeignKey
ALTER TABLE "TeamResponse" DROP CONSTRAINT "TeamResponse_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectTask" DROP CONSTRAINT "ProjectTask_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "Kpi" DROP CONSTRAINT "Kpi_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Initiative" DROP CONSTRAINT "Initiative_companyId_fkey";

-- DropIndex
DROP INDEX "DimensionScore_assessmentId_dimension_key";

-- DropIndex
DROP INDEX "PracticeCapture_cut_practice_key";

-- DropIndex
DROP INDEX "Evidence_practice_key";

-- DropIndex
DROP INDEX "Person_email_key";

-- DropIndex
DROP INDEX "ProjectTask_iniCode_status_idx";

-- DropIndex
DROP INDEX "ProjectTask_assigneeId_due_idx";

-- DropIndex
DROP INDEX "TaskComment_taskId_at_idx";

-- DropIndex
DROP INDEX "FileAsset_taskId_idx";

-- DropIndex
DROP INDEX "KpiReport_code_period_key";

-- DropIndex
DROP INDEX "InitiativeEvaluation_iniCode_idx";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "ciiu" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "financials" JSONB,
ADD COLUMN     "sectorKey" TEXT,
ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'vacia',
ADD COLUMN     "territories" JSONB;

-- AlterTable
ALTER TABLE "Responsible" DROP CONSTRAINT "Responsible_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "Responsible_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "CmiObjective" DROP CONSTRAINT "CmiObjective_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "CmiObjective_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_pkey",
ADD CONSTRAINT "Assessment_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "DimensionScore" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PracticeCapture" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "Evidence_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "TestResponse" DROP CONSTRAINT "TestResponse_pkey",
ADD CONSTRAINT "TestResponse_pkey" PRIMARY KEY ("companyId", "email");

-- AlterTable
ALTER TABLE "TestNote" DROP CONSTRAINT "TestNote_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "TestNote_pkey" PRIMARY KEY ("companyId", "participant");

-- AlterTable
ALTER TABLE "TeamResponse" DROP CONSTRAINT "TeamResponse_pkey",
ADD CONSTRAINT "TeamResponse_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "Person" DROP CONSTRAINT "Person_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "Person_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "ProjectTask" DROP CONSTRAINT "ProjectTask_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "TaskComment" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FileAsset" DROP CONSTRAINT "FileAsset_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "KpiReport" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InitiativeOverride" DROP CONSTRAINT "InitiativeOverride_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "InitiativeOverride_pkey" PRIMARY KEY ("companyId", "code");

-- AlterTable
ALTER TABLE "InitiativeEvaluation" DROP CONSTRAINT "InitiativeEvaluation_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "InitiativeEvaluation_pkey" PRIMARY KEY ("companyId", "id");

-- AlterTable
ALTER TABLE "InitiativeDecision" DROP CONSTRAINT "InitiativeDecision_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "InitiativeDecision_pkey" PRIMARY KEY ("companyId", "code");

-- AlterTable
ALTER TABLE "Integration" DROP CONSTRAINT "Integration_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "Integration_pkey" PRIMARY KEY ("companyId", "key");

-- AlterTable
ALTER TABLE "Branding" DROP CONSTRAINT "Branding_pkey",
DROP COLUMN "id",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "Branding_pkey" PRIMARY KEY ("companyId");

-- AlterTable
ALTER TABLE "NotifRead" DROP CONSTRAINT "NotifRead_pkey",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD CONSTRAINT "NotifRead_pkey" PRIMARY KEY ("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "DimensionScore_companyId_assessmentId_dimension_key" ON "DimensionScore"("companyId", "assessmentId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeCapture_companyId_cut_practice_key" ON "PracticeCapture"("companyId", "cut", "practice");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_companyId_practice_key" ON "Evidence"("companyId", "practice");

-- CreateIndex
CREATE UNIQUE INDEX "Person_companyId_email_key" ON "Person"("companyId", "email");

-- CreateIndex
CREATE INDEX "ProjectTask_companyId_iniCode_status_idx" ON "ProjectTask"("companyId", "iniCode", "status");

-- CreateIndex
CREATE INDEX "ProjectTask_companyId_assigneeId_due_idx" ON "ProjectTask"("companyId", "assigneeId", "due");

-- CreateIndex
CREATE INDEX "TaskComment_companyId_taskId_at_idx" ON "TaskComment"("companyId", "taskId", "at");

-- CreateIndex
CREATE INDEX "FileAsset_companyId_taskId_idx" ON "FileAsset"("companyId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiReport_companyId_code_period_key" ON "KpiReport"("companyId", "code", "period");

-- CreateIndex
CREATE INDEX "InitiativeEvaluation_companyId_iniCode_idx" ON "InitiativeEvaluation"("companyId", "iniCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responsible" ADD CONSTRAINT "Responsible_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmiObjective" ADD CONSTRAINT "CmiObjective_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimensionScore" ADD CONSTRAINT "DimensionScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimensionScore" ADD CONSTRAINT "DimensionScore_companyId_assessmentId_fkey" FOREIGN KEY ("companyId", "assessmentId") REFERENCES "Assessment"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeCapture" ADD CONSTRAINT "PracticeCapture_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResponse" ADD CONSTRAINT "TestResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestNote" ADD CONSTRAINT "TestNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamResponse" ADD CONSTRAINT "TeamResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiReport" ADD CONSTRAINT "KpiReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeOverride" ADD CONSTRAINT "InitiativeOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeEvaluation" ADD CONSTRAINT "InitiativeEvaluation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeDecision" ADD CONSTRAINT "InitiativeDecision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifRead" ADD CONSTRAINT "NotifRead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

