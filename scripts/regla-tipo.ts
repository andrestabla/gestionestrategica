// Fija la regla estratégica/táctica de una empresa directamente en la base
// (sin pasar por el catálogo): npx tsx scripts/regla-tipo.ts --slug cresio --regla cresio
// Reglas: 4shine (tres de cuatro marcas; se guarda como nulo) · cresio (tres criterios obligatorios).
// Con DATABASE_URL de producción (ver .env.vercel.production) actúa sobre Neon; las
// instancias la recogen en el siguiente refresco del registro (un minuto) o con un redeploy.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { TYPE_RULES } from "../src/lib/priorizacion";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug"), regla = (arg("--regla") ?? "cresio").toLowerCase();
if (!slug) { console.error("uso: npx tsx scripts/regla-tipo.ts --slug <empresa> --regla 4shine|cresio"); process.exit(1); }
const preset = TYPE_RULES[regla as keyof typeof TYPE_RULES];
if (!preset) { console.error(`regla desconocida: ${regla}`); process.exit(1); }
const db = new PrismaClient();
db.company.update({ where: { slug }, data: { typeRule: (regla === "4shine" ? null : preset) as never } })
  .then((c) => { console.log(`empresa ${c.slug}: regla de tipo → ${regla}${regla === "4shine" ? " (por defecto, nulo en la base)" : ` (${preset.criteria.map((x) => x.key).join(", ")}; mínimo ${preset.min}; excluye tácticas: ${!!preset.excludeTactical})`}`); })
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => db.$disconnect());
