-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "levers" JSONB;

-- AlterTable
ALTER TABLE "CmiObjective" ADD COLUMN     "lever" TEXT,
ADD COLUMN     "horizon" TEXT,
ADD COLUMN     "pillar" TEXT,
ADD COLUMN     "desc" TEXT,
ADD COLUMN     "indicator" TEXT;

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "due" TEXT;
