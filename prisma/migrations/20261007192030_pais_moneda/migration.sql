-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sector" TEXT,
    "size" TEXT,
    "sectorKey" TEXT,
    "ciiu" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "financials" JSONB,
    "territories" JSONB,
    "template" TEXT NOT NULL DEFAULT 'vacia',
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Company" ("active", "ciiu", "city", "createdAt", "createdBy", "department", "financials", "id", "logoUrl", "name", "sector", "sectorKey", "shortName", "size", "slug", "template", "territories") SELECT "active", "ciiu", "city", "createdAt", "createdBy", "department", "financials", "id", "logoUrl", "name", "sector", "sectorKey", "shortName", "size", "slug", "template", "territories" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
