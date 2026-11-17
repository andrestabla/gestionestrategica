-- Cuenta de solo lectura (demostración) y tour guiado por empresa.
ALTER TABLE "User" ADD COLUMN "readOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "tour" JSONB;
