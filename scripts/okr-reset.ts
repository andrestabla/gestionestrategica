// Deja la sección OKR vacía para que cada tribu cree sus resultados clave desde
// cero en el laboratorio, y carga la biblioteca de plantillas de KR por objetivo
// que el líder puede preseleccionar. Escribe directo en la base (local o la de
// producción con su archivo de entorno):
//   npx tsx scripts/okr-reset.ts --slug cresio --plantillas Cresio/kr-plantillas.json [--vaciar]
// Sin --vaciar solo carga las plantillas. Con --vaciar borra todos los KPI de la
// empresa y desvincula objetivos e iniciativas (no se puede deshacer).
import "dotenv/config";
import { readFileSync } from "fs";
import { inTenant } from "../src/app/api/td/_helpers";
import { hydrateCompanies, companyBySlug, updateCompany, clearOkr, catalog, flushPersist } from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg("--slug"), archivo = arg("--plantillas"), vaciar = process.argv.includes("--vaciar");
if (!slug) { console.error("uso: npx tsx scripts/okr-reset.ts --slug <empresa> [--plantillas kr-plantillas.json] [--vaciar]"); process.exit(1); }
async function main() {
  await hydrateCompanies();
  const c = companyBySlug(slug!); if (!c) throw new Error(`la empresa ${slug} no existe`);
  const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Andrés Tabla Rico", role: "ADMIN", company: { slug: c.slug, name: c.name, shortName: c.shortName } };
  const advisor: SessionUser = { ...admin, role: "CONSULTOR" };
  if (archivo) {
    const r = await updateCompany(admin, c.slug, { krTemplates: JSON.parse(readFileSync(archivo, "utf8")) });
    if (!r.ok) throw new Error(r.error);
    console.log(`plantillas de KR cargadas: ${r.company.krTemplates?.length ?? 0}`);
    await flushPersist();
  }
  await inTenant(c.slug, async () => {
    if (vaciar) {
      const r = clearOkr(advisor); if (!r.ok) throw new Error(r.error);
      console.log(`OKR vaciados: ${r.removed} KPI borrados, ${r.unlinked} iniciativas desvinculadas`);
      await flushPersist();
    }
    const cat = catalog();
    console.log(`estado: ${cat.kpis.length} KPI · ${cat.objectives.filter((o) => o.kpis.length).length} objetivos con KR · ${cat.initiatives.filter((i) => i.kpi).length} iniciativas vinculadas · ${cat.company.krTemplates?.length ?? 0} plantillas`);
  });
  await flushPersist();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message ?? e); process.exit(1); });
