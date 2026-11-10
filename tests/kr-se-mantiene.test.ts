// Resultado clave «mejor si se mantiene»: la meta puede ser igual a la línea base, el avance mide la cercanía
// al nivel de la meta y se guarda y se lee con ese sentido.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, catalog } from "../src/server/store";
import { krFaltantes } from "../src/lib/convencion";
import { avanceAMeta, mejora, mejorSi } from "../src/data/cmi";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };

test("sentido «se mantiene»: etiquetas, avance por cercanía a la meta y mejora al acercarse", () => {
  assert.equal(mejorSi("up"), "sube"); assert.equal(mejorSi("down"), "baja"); assert.equal(mejorSi("keep"), "se mantiene");
  assert.equal(Math.round(avanceAMeta("keep", 95, 95)), 100);
  assert.equal(Math.round(avanceAMeta("keep", 90, 100)), 90);
  assert.equal(Math.round(avanceAMeta("keep", 110, 100)), 90, "pasarse también aleja de la meta");
  assert.equal(Math.round(avanceAMeta("up", 50, 100)), 50); assert.equal(Math.round(avanceAMeta("down", 20, 10)), 50);
  assert.ok(mejora("keep", 96, 92, 95)); assert.ok(!mejora("keep", 80, 94, 95));
  assert.ok(mejora("up", 5, 4, 10)); assert.ok(mejora("down", 4, 5, 1));
});

test("KR de sostenimiento: meta igual a la base es completo solo con «se mantiene»", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Sostener SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("sostener-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Director de marketing", dependencia: "Marketing", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Consolidar el crecimiento sostenible, medido por la participación de mercado", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    const kr = { code: "EXC-09", line: 1, cmi: "OE-01", name: "Variación de MS en valores vs. mercado: 2,3", unit: "MS", baseline: 2.3, target: 2.3, ownerId: "R01", definition: "Crecimiento MS del laboratorio en valores y unidades", formula: "MS propio ÷ MS mercado", frequency: "Anual", source: "IQVIA", due: "2027-T4" };
    assert.ok(upsertKpi(advisor, { ...kr, goodDirection: "up" }).ok);
    assert.deepEqual(krFaltantes(catalog().kpis.find((k) => k.code === "EXC-09")!), ["meta distinta de la línea base"]);
    assert.ok(upsertKpi(advisor, { ...kr, goodDirection: "keep" }).ok);
    const k = catalog().kpis.find((x) => x.code === "EXC-09")!;
    assert.equal(k.goodDirection, "keep");
    assert.deepEqual(krFaltantes(k), [], "con «se mantiene» el KR está completo");
    // un valor desconocido cae en «sube», como antes
    assert.ok(upsertKpi(advisor, { ...kr, target: 2.5, goodDirection: "otro" as never }).ok);
    assert.equal(catalog().kpis.find((x) => x.code === "EXC-09")!.goodDirection, "up");
  });
});
