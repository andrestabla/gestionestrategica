// Prioridades estratégicas editadas por varias personas a la vez: cada operación actúa sobre la lista vigente
// del servidor (no sobre la que un navegador tenía cargada), toda versión anterior queda en el historial y
// una lista completa enviada desde una vista desactualizada se rechaza.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, setLever, removeLever, reorderLevers, restoreLevers, getHistorialPalancas, catalog } from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const empresa = { slug: "comite-sa", name: "Comité SA", shortName: "Comité", mode: "acompanamiento" as const };
const d = (name: string): SessionUser => ({ email: `${name.toLowerCase()}@comite.example`, name, role: "DIRECTIVO", company: empresa });
const ids = () => (catalog().company.levers ?? []).map((l) => l.id).join(",");

test("prioridades: guardados concurrentes de una en una no se pisan; el historial guarda cada versión y se restaura", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Comité SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("comite-sa", async () => {
    assert.ok(upsertResponsible(admin, { id: "R01", cargo: "Director comercial", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(admin, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01" }, { id: "OPE", name: "Disciplina operacional", order: 2 }]).ok);
    // Mónica y Hernán abrieron la página con la misma lista; Mónica añade LEG, Hernán edita OPE sin saber de LEG
    assert.ok(setLever(d("Monica"), { id: "LEG", name: "Confianza y valor sostenible", desc: "Riesgos críticos con plan" }).ok);
    assert.ok(setLever(d("Hernan"), { id: "OPE", name: "Rentabilidad sostenible y productividad", order: 2 }).ok);
    assert.equal(ids(), "EXC,OPE,LEG");
    assert.equal(catalog().company.levers!.find((l) => l.id === "OPE")!.name, "Rentabilidad sostenible y productividad");
    assert.equal(catalog().company.levers!.find((l) => l.id === "LEG")!.desc, "Riesgos críticos con plan");
    // renombrar la sigla conserva la posición; la sigla repetida se rechaza
    assert.ok(setLever(d("Julieth"), { id: "COM", name: "Innovación comercial", order: 1 }, "EXC").ok);
    assert.equal(ids(), "COM,OPE,LEG");
    const dup = setLever(d("Julieth"), { id: "OPE", name: "Otra" }, "LEG"); assert.ok(!dup.ok && dup.status === 422);
    // reordenar y quitar
    assert.ok(reorderLevers(d("Monica"), ["LEG", "COM"]).ok);
    assert.equal(ids(), "LEG,COM,OPE");
    assert.ok(removeLever(d("Hernan"), "OPE").ok);
    assert.equal(ids(), "LEG,COM");
    const otra = removeLever(d("Hernan"), "OPE"); assert.ok(!otra.ok && otra.status === 404);
    // una lista completa desde una vista desactualizada se rechaza; con la base vigente pasa
    const vieja = setLevers(d("Constanza"), [{ id: "EXC", name: "Excelencia comercial", order: 1 }], ["EXC", "OPE"]);
    assert.ok(!vieja.ok && vieja.status === 409);
    assert.ok(setLevers(d("Constanza"), [{ id: "DES", name: "Desarrollo sostenible", order: 1 }], ["LEG", "COM"]).ok);
    assert.equal(ids(), "DES");
    // historial: una versión por cambio, la más reciente primero, con autor y motivo; restaurar vuelve a la lista
    const h = getHistorialPalancas();
    assert.equal(h.length, 7);
    assert.equal(h[0].by, "constanza@comite.example");
    assert.deepEqual(h[0].levers.map((l) => l.id), ["LEG", "COM"]);
    assert.match(h[1].motivo, /eliminada/);
    const tres = h.find((v) => v.levers.length === 3 && v.levers[0].id === "EXC")!;
    assert.ok(restoreLevers(d("Monica"), tres.id).ok);
    assert.equal(ids(), "EXC,OPE,LEG");
    assert.equal(getHistorialPalancas()[0].levers.map((l) => l.id).join(","), "DES");
  });
});
