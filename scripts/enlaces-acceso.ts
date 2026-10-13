// Crea (si no existen) y muestra los enlaces de acceso por sección de una empresa:
//   npx tsx scripts/enlaces-acceso.ts --slug cresio --origen https://gestionestrategica-seven.vercel.app
// Los mismos enlaces aparecen en la plataforma (Convención → QR de acceso) para el advisor.
import "dotenv/config";
import { inTenant } from "../src/app/api/td/_helpers";
import { accessLinks, hydrateCompanies, companyBySlug } from "../src/server/store";
import { accessUrl } from "../src/lib/acceso";
import type { SessionUser } from "../src/lib/session";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug"), origen = arg("--origen") ?? "http://localhost:3000";
if (!slug) { console.error("uso: npx tsx scripts/enlaces-acceso.ts --slug <empresa> [--origen https://…]"); process.exit(1); }
async function main() {
  await hydrateCompanies();
  const c = companyBySlug(slug!);
  if (!c) throw new Error(`la empresa ${slug} no existe`);
  const admin: SessionUser = { email: "admin@plataforma", name: "Administrador", role: "ADMIN", company: { slug: c.slug, name: c.name, shortName: c.shortName } };
  await inTenant(c.slug, async () => {
    const r = accessLinks(admin);
    if (!r.ok) throw new Error(r.error);
    for (const a of r.access) console.log(`${a.label.padEnd(22)} ${a.role.padEnd(10)} ${accessUrl(origen, c.slug, a.token)}`);
  });
  await new Promise((r) => setTimeout(r, 2500));   // deja terminar el write-through
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message ?? e); process.exit(1); });
