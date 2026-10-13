-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "access" JSONB,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'completa';
