-- AlterTable
ALTER TABLE "CmiObjective" ADD COLUMN "okr" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmiObjective" ADD COLUMN "parent" TEXT;
