// Iniciativas en la convención: el advisor, el líder de tribu y el directivo
// (también por QR) crean; cada quien edita o elimina las suyas; quien
// administra el catálogo edita todas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, catalog, resetStore, upsertResponsible, upsertObjective, upsertKpi, upsertInitiative, removeInitiative } from "../src/server/store";
import { can } from "../src/lib/permissions";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@a.co", name: "Directivo QR", role: "DIRECTIVO", qr: true };
const lider: SessionUser = { email: "l@a.co", name: "Líder", role: "LIDER", responsibleId: "R01" };
const miembro: SessionUser = { email: "m@a.co", name: "Miembro", role: "RESPONSABLE", responsibleId: "R01" };

test("permiso: crean advisor, líder y directivo; el miembro no", () => {
  assert.ok(can(advisor, "create_initiatives")); assert.ok(can(lider, "create_initiatives")); assert.ok(can(directivo, "create_initiatives"));
  assert.ok(!can(miembro, "create_initiatives")); assert.ok(!can(directivo, "manage_catalog"));
});

test("el directivo por QR crea, edita y elimina solo las suyas; el advisor edita todas", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Autoría SA", template: "vacia" })).ok);
  await runWithTenant("autoria-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Líder de tribu", dependencia: "Tribu Uno", rolPlataforma: "LIDER" }).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Crecer con margen en 2027", kpis: [], line: 1 }).ok);
    assert.ok(upsertKpi(advisor, { code: "DIR-01", name: "Margen bruto", unit: "%", cmi: "OE-01" }).ok);
    const base = { cmi: "OE-01", capability: "EJE-1", ownerId: "R01", kpi: "DIR-01" };
    const d = upsertInitiative(directivo, { ...base, name: "Iniciativa del directivo" });
    assert.ok(d.ok && d.id === "i1"); assert.equal(catalog().initiatives[0].createdBy, "d@a.co");
    const a = upsertInitiative(advisor, { ...base, name: "Iniciativa del advisor" });
    assert.ok(a.ok && a.id === "i2");
    assert.ok(!upsertInitiative(miembro, { ...base, name: "Iniciativa del miembro" }).ok, "el miembro no crea");
    // el directivo edita la suya, no la del advisor
    assert.ok(upsertInitiative(directivo, { ...base, id: "i1", name: "Iniciativa del directivo (ajustada)" }).ok);
    assert.equal(upsertInitiative(directivo, { ...base, id: "i2", name: "Intento ajeno" }).ok, false);
    assert.equal(removeInitiative(directivo, "i2").ok, false);
    // el advisor (administra el catálogo) edita y elimina cualquiera; la autoría se conserva
    assert.ok(upsertInitiative(advisor, { ...base, id: "i1", name: "Iniciativa del directivo (revisada)" }).ok);
    assert.equal(catalog().initiatives.find((i) => i.id === "i1")?.createdBy, "d@a.co");
    assert.ok(removeInitiative(directivo, "i1").ok); assert.ok(removeInitiative(advisor, "i2").ok);
    assert.equal(catalog().initiatives.length, 0);
  });
});
