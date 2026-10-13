// Muestra la configuración de una empresa en la base (modo, regla de tipo,
// secciones con acceso por QR y número de usuarios):
//   npx tsx scripts/estado-empresa.ts --slug cresio
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug");
if (!slug) { console.error("uso: npx tsx scripts/estado-empresa.ts --slug <empresa>"); process.exit(1); }
async function client() {
  let url = process.env.DATABASE_URL ?? "";
  if (/^postgres(ql)?:\/\//.test(url)) { const { PrismaPg } = await import("@prisma/adapter-pg"); return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }); }
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  if (url.startsWith("file:./")) url = "file:" + process.cwd() + "/" + url.slice(7);
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
client().then(async (db) => {
  const c = await db.company.findUnique({ where: { slug }, include: { _count: { select: { users: true } } } });
  if (!c) throw new Error(`la empresa ${slug} no existe`);
  const rule = c.typeRule as { id?: string } | null, access = (c.access ?? {}) as Record<string, { role: string }>;
  console.log(`${c.slug} · ${c.name} · ${c.active ? "activa" : "inactiva"}\n  modo: ${c.mode}\n  regla de tipo: ${rule?.id ?? (rule ? "propia" : "4shine")}\n  acceso por QR: ${Object.keys(access).length ? Object.entries(access).map(([k, v]) => `${k} (${v.role})`).join(", ") : "sin enlaces"}\n  usuarios: ${c._count.users}`);
  await db.$disconnect();
}).catch((e) => { console.error(e.message); process.exit(1); });
