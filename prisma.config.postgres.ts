import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuración de Prisma para PostgreSQL (producción):
//   npx prisma generate --config prisma.config.postgres.ts
//   npx prisma migrate deploy --config prisma.config.postgres.ts
export default defineConfig({
  schema: "prisma/postgres/schema.prisma",
  migrations: { path: "prisma/postgres/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
