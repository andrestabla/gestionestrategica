-- Códigos de acceso a los diagnósticos (uno por persona, generados por el admin o el advisor).
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "scope" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "companySlug" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessCode_code_key" ON "AccessCode"("code");
CREATE INDEX "AccessCode_email_idx" ON "AccessCode"("email");
