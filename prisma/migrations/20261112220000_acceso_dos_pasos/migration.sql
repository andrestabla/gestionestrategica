-- Acceso en dos pasos por empresa: además de la contraseña, un código enviado al correo.
ALTER TABLE "Company" ADD COLUMN "twoFactor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "otpHash" TEXT;
ALTER TABLE "User" ADD COLUMN "otpExpires" DATETIME;
ALTER TABLE "User" ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "otpSentAt" DATETIME;
