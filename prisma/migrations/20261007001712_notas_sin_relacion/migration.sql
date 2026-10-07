-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestNote" (
    "participant" TEXT NOT NULL PRIMARY KEY,
    "restriccion" TEXT,
    "evidencias" TEXT,
    "accion" TEXT,
    "noNecesita" TEXT,
    "by" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TestNote" ("accion", "at", "by", "evidencias", "noNecesita", "participant", "restriccion") SELECT "accion", "at", "by", "evidencias", "noNecesita", "participant", "restriccion" FROM "TestNote";
DROP TABLE "TestNote";
ALTER TABLE "new_TestNote" RENAME TO "TestNote";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
