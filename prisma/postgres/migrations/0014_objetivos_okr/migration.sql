-- AlterTable
ALTER TABLE "CmiObjective" ADD COLUMN     "okr" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent" TEXT;
