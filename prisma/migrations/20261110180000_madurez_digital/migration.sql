-- AlterTable
ALTER TABLE "Company" ADD COLUMN "orgKind" TEXT NOT NULL DEFAULT 'empresa';

-- CreateTable
CREATE TABLE "MaturityRecord" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "MaturityRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
