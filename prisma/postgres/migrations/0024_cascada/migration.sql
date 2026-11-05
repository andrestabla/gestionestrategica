-- CreateTable
CREATE TABLE "QuarterGoal" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterGoal_pkey" PRIMARY KEY ("companyId","id")
);

-- AddForeignKey
ALTER TABLE "QuarterGoal" ADD CONSTRAINT "QuarterGoal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
