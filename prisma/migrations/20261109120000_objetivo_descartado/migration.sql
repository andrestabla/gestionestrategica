-- AlterTable
ALTER TABLE "CmiObjective" ADD COLUMN "descartado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmiObjective" ADD COLUMN "motivoDescarte" TEXT;
