// Configura una empresa directamente en la base (sin pasar por el catálogo):
//   npx tsx scripts/configurar-empresa.ts --slug cresio --modo convencion --regla cresio
//   npx tsx scripts/configurar-empresa.ts --slug siegfried --instrumentos f1   (test,f1,f2,captura; «todos» = sin restricción)
// --modo: completa | convencion (menú reducido a las cinco secciones de la convención)
// --regla: 4shine (tres de cuatro marcas; se guarda como nulo) | cresio (tres criterios obligatorios)
// Con DATABASE_URL de producción (ver .env.vercel.production y DATABASE_URL_UNPOOLED)
// actúa sobre Neon; las instancias lo recogen en el siguiente refresco del registro (un minuto).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { TYPE_RULES } from "../src/lib/priorizacion";
import { isCompanyMode } from "../src/lib/acceso";
import { parseInstruments } from "../src/lib/instrumentos";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug"), modo = arg("--modo"), regla = arg("--regla")?.toLowerCase(), instrumentos = arg("--instrumentos");
if (!slug || (!modo && !regla && !instrumentos)) { console.error("uso: npx tsx scripts/configurar-empresa.ts --slug <empresa> [--modo completa|convencion] [--regla 4shine|cresio] [--instrumentos test,f1,f2,captura|todos]"); process.exit(1); }
const ins = instrumentos ? (instrumentos === "todos" ? { ok: true as const, instruments: undefined } : parseInstruments(instrumentos.split(",").map((x) => x.trim()))) : undefined;
if (ins && !ins.ok) { console.error(ins.error); process.exit(1); }
if (modo && !isCompanyMode(modo)) { console.error(`modo desconocido: ${modo}`); process.exit(1); }
const preset = regla ? TYPE_RULES[regla as keyof typeof TYPE_RULES] : undefined;
if (regla && !preset) { console.error(`regla desconocida: ${regla}`); process.exit(1); }

// Cliente con el adaptador que corresponda a DATABASE_URL (Prisma 7 lo exige).
async function client() {
  let url = process.env.DATABASE_URL ?? "";
  if (/^postgres(ql)?:\/\//.test(url)) {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  if (url.startsWith("file:./")) url = "file:" + process.cwd() + "/" + url.slice(7);
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
client().then((db) => db.company.update({ where: { slug }, data: { ...(modo ? { mode: modo } : {}), ...(regla ? { typeRule: (regla === "4shine" ? null : preset) as never } : {}), ...(ins ? { instruments: (ins.instruments ?? null) as never } : {}) } })
  .then((c) => console.log(`empresa ${c.slug}:${modo ? ` modo → ${modo}` : ""}${regla ? ` · regla de tipo → ${regla}` : ""}${ins ? ` · instrumentos → ${ins.instruments?.join(", ") ?? "todos"}` : ""}`))
  .finally(() => db.$disconnect()))
  .catch((e) => { console.error(e.message); process.exit(1); });
