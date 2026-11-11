-- AlterTable
ALTER TABLE "Company" ADD COLUMN "orgKind" TEXT NOT NULL DEFAULT 'empresa';

-- CreateTable
CREATE TABLE "MaturityRecord" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaturityRecord_pkey" PRIMARY KEY ("companyId","id")
);

-- AddForeignKey
ALTER TABLE "MaturityRecord" ADD CONSTRAINT "MaturityRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
