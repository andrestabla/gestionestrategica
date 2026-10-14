-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "itinerary" JSONB;

-- CreateTable
CREATE TABLE "ItineraryComment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryComment_companyId_momentId_idx" ON "ItineraryComment"("companyId", "momentId");

-- AddForeignKey
ALTER TABLE "ItineraryComment" ADD CONSTRAINT "ItineraryComment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
