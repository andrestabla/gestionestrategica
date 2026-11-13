-- Códigos de acceso a los diagnósticos (uno por persona, generados por el admin o el advisor).
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "scope" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdByRole" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "usedAt" DATETIME,
    "companySlug" TEXT,
    "revokedAt" DATETIME
);
CREATE UNIQUE INDEX "AccessCode_code_key" ON "AccessCode"("code");
CREATE INDEX "AccessCode_email_idx" ON "AccessCode"("email");
