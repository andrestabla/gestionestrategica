-- Solicitudes de código de acceso a los diagnósticos (formulario público; las decide el admin o el advisor).
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "decidedBy" TEXT,
    "decidedByName" TEXT,
    "codeId" TEXT,
    "note" TEXT
);
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");
CREATE INDEX "AccessRequest_email_idx" ON "AccessRequest"("email");
