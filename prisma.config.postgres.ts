import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuración de Prisma para PostgreSQL (producción):
//   npx prisma generate --config prisma.config.postgres.ts
//   npx prisma migrate deploy --config prisma.config.postgres.ts
export default defineConfig({
  schema: "prisma/postgres/schema.prisma",
  migrations: { path: "prisma/postgres/migrations" },
  // Las migraciones usan la conexión directa (sin pooler) cuando existe,
  // como recomienda Prisma con Neon; el runtime usa DATABASE_URL (pooled).
  datasource: { url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"] },
});
