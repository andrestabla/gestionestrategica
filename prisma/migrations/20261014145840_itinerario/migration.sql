-- AlterTable
ALTER TABLE "Company" ADD COLUMN "itinerary" JSONB;

-- CreateTable
CREATE TABLE "ItineraryComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItineraryComment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ItineraryComment_companyId_momentId_idx" ON "ItineraryComment"("companyId", "momentId");
