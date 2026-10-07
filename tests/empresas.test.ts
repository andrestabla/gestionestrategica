// Multiempresa: cada empresa es un contexto independiente; los roles valen
// solo dentro de la suya; el admin de plataforma crea, edita y elimina empresas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant, currentTenant, DEFAULT_TENANT } from "../src/server/tenant";
import {
  createCompany, updateCompany, deleteCompany, listCompanies, catalog, getUsers, createUser, moveUser,
  decideInitiative, getDecision, getTasks, effectiveInitiatives, findUserForLogin, resetStore,
} from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@algoritmot.com", name: "Admin", role: "ADMIN" };
const lider: SessionUser = { email: "g@a.co", name: "Gerencia", role: "LIDER", company: { slug: "andina", name: "Andina", shortName: "Andina" } };

test("fuera de una petición rige la empresa demo; dentro, la del contexto", async () => {
  assert.equal(currentTenant(), DEFAULT_TENANT);
  const inside = await runWithTenant("otra", async () => currentTenant());
  assert.equal(inside, "otra");
  assert.equal(currentTenant(), DEFAULT_TENANT);
});

test("solo el admin crea empresas; nacen vacías o desde la plantilla", async () => {
  const denied = await createCompany(lider, { name: "Cresio Farmacias" });
  assert.ok(!denied.ok && denied.status === 403);
  const vacia = await createCompany(admin, { name: "Cresio Farmacias", city: "Bogotá", template: "vacia" });
  assert.ok(vacia.ok);
  assert.equal(vacia.company.slug, "cresio-farmacias");
  const demo = await createCompany(admin, { name: "Empresa Plantilla", template: "demo" });
  assert.ok(demo.ok);
  const dup = await createCompany(admin, { name: "Cresio Farmacias" });
  assert.ok(!dup.ok && dup.status === 422);
  assert.ok(listCompanies().some((c) => c.slug === "cresio-farmacias"));

  await runWithTenant("cresio-farmacias", async () => {
    assert.equal(catalog().company.name, "Cresio Farmacias");
    assert.equal(catalog().initiatives.length, 0);
    assert.equal(getTasks().length, 0);
    assert.equal(getUsers().length, 0);
  });
  await runWithTenant("empresa-plantilla", async () => {
    assert.equal(catalog().company.slug, "empresa-plantilla");
    assert.equal(catalog().initiatives.length, 8, "copia las iniciativas de la plantilla");
    assert.equal(getTasks().length, 32);
    assert.equal(getUsers().length, 0, "las cuentas no se copian");
  });
});

test("el estado de una empresa no se ve desde otra", async () => {
  await runWithTenant(DEFAULT_TENANT, async () => {
    resetStore();
    assert.ok(decideInitiative(lider, "i7", { decision: "BACKLOG", rationale: "prueba de aislamiento" }).ok);
    assert.equal(getDecision("i7")!.rationale, "prueba de aislamiento");
    assert.equal(effectiveInitiatives().length, 8);
  });
  await runWithTenant("empresa-plantilla", async () => {
    assert.notEqual(getDecision("i7")?.rationale, "prueba de aislamiento");
    assert.equal(effectiveInitiatives().length, 8);
  });
  await runWithTenant("cresio-farmacias", async () => {
    assert.equal(getDecision("i7"), null);
    const r = decideInitiative(lider, "i7", { decision: "BACKLOG" });
    assert.ok(!r.ok && r.status === 404, "sin catálogo no hay iniciativa que decidir");
  });
  await runWithTenant(DEFAULT_TENANT, async () => resetStore());
});

test("los roles son de la empresa: no se crean admins dentro de una empresa y los usuarios se pueden mover", async () => {
  await runWithTenant("cresio-farmacias", async () => {
    const a = createUser(admin, { email: "jefe@cresio.example", name: "Jefa de Cresio", role: "ADMIN" });
    assert.ok(!a.ok && a.status === 422);
    const ok = createUser(admin, { email: "jefe@cresio.example", name: "Jefa de Cresio", role: "LIDER" });
    assert.ok(ok.ok);
    assert.equal(getUsers().length, 1);
    const found = await findUserForLogin("jefe@cresio.example");
    assert.equal(found?.company?.slug, "cresio-farmacias");
    const moved = await moveUser(admin, "jefe@cresio.example", "empresa-plantilla");
    assert.ok(moved.ok);
    assert.equal(getUsers().length, 0);
  });
  await runWithTenant("empresa-plantilla", async () => {
    assert.equal(getUsers().length, 1);
  });
  const adminFound = await findUserForLogin("admin@algoritmot.com");
  assert.equal(adminFound?.company, null, "el admin de plataforma no tiene empresa");
  const andina = await findUserForLogin("gerencia@andina.example");
  assert.equal(andina?.company?.slug, "andina");
});

test("editar, desactivar y eliminar empresas con sus protecciones", async () => {
  const up = await updateCompany(admin, "cresio-farmacias", { sector: "Farmacias", active: false });
  assert.ok(up.ok && up.company.sector === "Farmacias" && up.company.active === false);
  const noDemo = await deleteCompany(admin, DEFAULT_TENANT);
  assert.ok(!noDemo.ok && noDemo.status === 422);
  const noRole = await deleteCompany(lider, "cresio-farmacias");
  assert.ok(!noRole.ok && noRole.status === 403);
  assert.ok((await deleteCompany(admin, "cresio-farmacias")).ok);
  assert.ok((await deleteCompany(admin, "empresa-plantilla")).ok);
  assert.ok(!listCompanies().some((c) => c.slug === "cresio-farmacias"));
});
