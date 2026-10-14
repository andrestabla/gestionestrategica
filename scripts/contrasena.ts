// Fija la contraseña de un usuario (de empresa o administrador de la plataforma)
// directamente en la base, sin pasar por el chat ni por la línea de argumentos:
//   read -rs "p?Nueva contraseña: "; echo; CONTRASENA="$p" npx tsx scripts/contrasena.ts --email andrestablarico@gmail.com
// Con DATABASE_URL de producción actúa sobre Neon. Mínimo 10 caracteres.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const email = arg("--email")?.trim().toLowerCase(), password = process.env.CONTRASENA ?? "";
if (!email) { console.error("uso: CONTRASENA=… npx tsx scripts/contrasena.ts --email <correo>"); process.exit(1); }
if (password.length < 10) { console.error("La contraseña debe tener al menos 10 caracteres (variable CONTRASENA)."); process.exit(1); }
async function client() {
  let url = process.env.DATABASE_URL ?? "";
  if (/^postgres(ql)?:\/\//.test(url)) { const { PrismaPg } = await import("@prisma/adapter-pg"); return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }); }
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  if (url.startsWith("file:./")) url = "file:" + process.cwd() + "/" + url.slice(7);
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
client().then(async (db) => {
  const hash = await bcrypt.hash(password, 10);
  const u = await db.user.update({ where: { email }, data: { passwordHash: hash, failedLogins: 0, lockedUntil: null }, select: { email: true, name: true, role: true } });
  console.log(`contraseña fijada: ${u.email} · ${u.name} · ${u.role}`);
  await db.$disconnect();
}).catch((e) => { console.error(e.message); process.exit(1); });
