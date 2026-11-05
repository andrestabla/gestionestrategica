-- CreateTable
CREATE TABLE "QuarterGoal" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "QuarterGoal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
