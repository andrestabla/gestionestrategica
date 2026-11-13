-- Cierre de sesiones al cambiar la contraseña: las sesiones abiertas antes de este momento dejan de valer.
ALTER TABLE "User" ADD COLUMN "sessionsFrom" DATETIME;
