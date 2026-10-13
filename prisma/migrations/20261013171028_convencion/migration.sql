-- AlterTable
ALTER TABLE "CmiObjective" ADD COLUMN "desc" TEXT;
ALTER TABLE "CmiObjective" ADD COLUMN "horizon" TEXT;
ALTER TABLE "CmiObjective" ADD COLUMN "indicator" TEXT;
ALTER TABLE "CmiObjective" ADD COLUMN "lever" TEXT;
ALTER TABLE "CmiObjective" ADD COLUMN "pillar" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "levers" JSONB;

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN "due" TEXT;
