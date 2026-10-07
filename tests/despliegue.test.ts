// Preparación del despliegue: el esquema PostgreSQL es idéntico al SQLite
// salvo el proveedor, la migración inicial cubre todos los modelos y la
// configuración de Vercel apunta al build con Prisma/PostgreSQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const norm = (s: string) => s.split("\n").filter((l) => !l.trim().startsWith("//")).map((l) => l.replace(/provider\s*=\s*"(sqlite|postgresql)"/, 'provider = "DB"')).join("\n").trim();

test("los dos esquemas Prisma solo difieren en el proveedor", () => {
  const sqlite = norm(readFileSync("prisma/schema.prisma", "utf8"));
  const pg = norm(readFileSync("prisma/postgres/schema.prisma", "utf8"));
  assert.equal(pg, sqlite);
});

test("la migración inicial de PostgreSQL crea todos los modelos", () => {
  const schema = readFileSync("prisma/postgres/schema.prisma", "utf8");
  const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
  const sql = readFileSync("prisma/postgres/migrations/0001_inicial/migration.sql", "utf8");
  assert.ok(models.length >= 26);
  for (const m of models) assert.ok(sql.includes(`CREATE TABLE "${m}"`), `tabla ${m}`);
  assert.match(readFileSync("prisma/postgres/migrations/migration_lock.toml", "utf8"), /provider = "postgresql"/);
});

test("vercel.json y los scripts de build quedan alineados", () => {
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(vercel.buildCommand, "npm run build:vercel");
  assert.match(pkg.scripts["build:vercel"], /prisma\.config\.postgres\.ts/);
  assert.match(pkg.scripts["build:vercel"], /migrate deploy/);
  assert.match(pkg.scripts["db:pg:deploy"], /migrate deploy/);
  const env = readFileSync(".env.example", "utf8");
  for (const k of ["DATABASE_URL", "AUTH_SECRET", "DEMO_LOGIN", "R2_BUCKET"]) assert.ok(env.includes(k), k);
});
