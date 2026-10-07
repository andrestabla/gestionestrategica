-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Person" (
    "companyId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "email" TEXT,
    "responsibleId" TEXT NOT NULL,

    PRIMARY KEY ("companyId", "id"),
    CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("cargo", "companyId", "dependencia", "email", "id", "name", "responsibleId") SELECT "cargo", "companyId", "dependencia", "email", "id", "name", "responsibleId" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE UNIQUE INDEX "Person_companyId_email_key" ON "Person"("companyId", "email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
