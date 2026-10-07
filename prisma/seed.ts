// Seed de la plataforma: crea la empresa de demostración (Andina Suministros)
// con su catálogo, sus cuentas y el admin de plataforma. Es idempotente.
// Uso: npm run db:seed (SQLite) · npm run db:pg:seed (PostgreSQL); requiere DATABASE_URL.

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ANDINA_CATALOG, PLATFORM_USERS } from "../src/data/catalogo";
import { writeCatalog, companyRow } from "../src/server/catalog-db";

const url = process.env.DATABASE_URL ?? "file:./var/4shine.db";
const adapter = /^postgres(ql)?:\/\//.test(url) ? new PrismaPg({ connectionString: url }) : new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });
const DEMO_PASSWORD = "4shine-demo-2026";

async function main() {
  const info = ANDINA_CATALOG.company;
  const company = await prisma.company.upsert({
    where: { slug: info.slug },
    update: companyRow(info),
    create: companyRow(info),
  });

  // admin de plataforma (sin empresa) y cuentas de la empresa demo
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of PLATFORM_USERS) {
    await prisma.user.upsert({ where: { email: u.email }, update: { companyId: null, role: u.role }, create: { email: u.email, name: u.name, role: u.role, passwordHash: hash, companyId: null } });
  }
  for (const u of ANDINA_CATALOG.seedUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { companyId: company.id, role: u.role, line: u.line ?? null, responsibleId: u.responsibleId ?? null },
      create: { email: u.email, name: u.name, role: u.role, line: u.line ?? null, responsibleId: u.responsibleId ?? null, passwordHash: hash, companyId: company.id },
    });
  }

  await writeCatalog(prisma, company.id, ANDINA_CATALOG);
  console.log("Seed completo:", company.name, `(${company.slug})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
