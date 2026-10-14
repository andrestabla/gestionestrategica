// Carga el itinerario de la convención en una empresa y, si se pide, lo publica:
//   npx tsx scripts/itinerario.ts --slug cresio --archivo "Cresio/Convención/itinerario.json" --publicar --origen https://gestionestrategica-seven.vercel.app
import "dotenv/config";
import { readFileSync } from "fs";
import { inTenant } from "../src/app/api/td/_helpers";
import { hydrateCompanies, companyBySlug, setItinerary, publishItinerary, itineraryOf } from "../src/server/store";
import { itineraryPublicPath } from "../src/lib/itinerario";
import type { SessionUser } from "../src/lib/session";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug"), archivo = arg("--archivo"), publicar = process.argv.includes("--publicar"), origen = arg("--origen") ?? "http://localhost:3000";
if (!slug) { console.error("uso: npx tsx scripts/itinerario.ts --slug <empresa> [--archivo itinerario.json] [--publicar] [--origen https://…]"); process.exit(1); }
async function main() {
  await hydrateCompanies();
  const c = companyBySlug(slug!); if (!c) throw new Error(`la empresa ${slug} no existe`);
  const actor: SessionUser = { email: "andrestablarico@gmail.com", name: "Andrés Tabla Rico", role: "CONSULTOR", company: { slug: c.slug, name: c.name, shortName: c.shortName } };
  await inTenant(c.slug, async () => {
    if (archivo) { const r = setItinerary(actor, JSON.parse(readFileSync(archivo, "utf8"))); if (!r.ok) throw new Error(r.error); console.log(`itinerario cargado: ${r.itinerary.items.length} momentos`); }
    // las escrituras a la base son asíncronas: dejar que la carga termine antes de publicar, para que no la pise
    if (archivo && publicar) await new Promise((r) => setTimeout(r, 2500));
    if (publicar) { const r = publishItinerary(actor, true); if (!r.ok) throw new Error(r.error); }
    const it = itineraryOf();
    if (it) console.log(`público: ${it.public ? "sí" : "no"}${it.token ? ` · ${origen}${itineraryPublicPath(c.slug, it.token)}` : ""}`);
  });
  await new Promise((r) => setTimeout(r, 2500));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message ?? e); process.exit(1); });
