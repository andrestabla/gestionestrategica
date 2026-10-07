-- CreateTable
CREATE TABLE "InitiativeEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iniCode" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InitiativeDecision" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "InitiativeEvaluation_iniCode_idx" ON "InitiativeEvaluation"("iniCode");
