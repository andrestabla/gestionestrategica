-- Acceso en dos pasos por empresa: además de la contraseña, un código enviado al correo.
ALTER TABLE "Company" ADD COLUMN "twoFactor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "otpHash" TEXT,
  ADD COLUMN "otpExpires" TIMESTAMP(3),
  ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "otpSentAt" TIMESTAMP(3);
