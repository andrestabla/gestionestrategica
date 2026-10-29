-- CreateTable
CREATE TABLE "F1Response" (
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "cargo" TEXT,
    "answers" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "F1Response_pkey" PRIMARY KEY ("companyId","email")
);

-- AddForeignKey
ALTER TABLE "F1Response" ADD CONSTRAINT "F1Response_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
