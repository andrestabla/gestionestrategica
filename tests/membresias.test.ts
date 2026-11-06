import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, createCompany, createUser, addMembership, findUserForLogin, membershipOf, empresasDe, getUsers, updateUser, removeUser } from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };

test("membresías: una cuenta opera en varias empresas con rol propio en cada una", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Empresa A", slug: "empresa-a", template: "vacia", mode: "acompanamiento" })).ok);
  assert.ok((await createCompany(admin, { name: "Empresa B", slug: "empresa-b", template: "vacia", mode: "acompanamiento" })).ok);
  const actorA = { ...admin, company: { slug: "empresa-a", name: "Empresa A", shortName: "A" } };
  runWithTenant("empresa-a", () => { assert.ok(createUser(actorA, { email: "advisor@consultora.test", name: "Advisor Consultora", role: "CONSULTOR" }).ok); });
  const actorB = { ...admin, company: { slug: "empresa-b", name: "Empresa B", shortName: "B" } };
  // en B no se duplica la cuenta: se agrega como membresía con otro rol
  await runWithTenant("empresa-b", async () => {
    const r = await addMembership(actorB, "advisor@consultora.test", { role: "DIRECTIVO" });
    assert.ok(r.ok, r.ok ? "" : r.error);
    const otra = await addMembership(actorB, "advisor@consultora.test", { role: "DIRECTIVO" });
    assert.ok(!otra.ok && otra.status === 422);
    const u = getUsers().find((x) => x.email === "advisor@consultora.test")!;
    assert.equal(u.membresia, true); assert.equal(u.principal, "empresa-a"); assert.equal(u.role, "DIRECTIVO");
  });
  const f = await findUserForLogin("advisor@consultora.test");
  assert.ok(f && f.company?.slug === "empresa-a" && f.user.role === "CONSULTOR");
  assert.deepEqual(f!.otras.map((o) => [o.company.slug, o.role]), [["empresa-b", "DIRECTIVO"]]);
  assert.deepEqual(empresasDe(f!).map((e) => [e.slug, e.role]), [["empresa-a", "CONSULTOR"], ["empresa-b", "DIRECTIVO"]]);
  assert.equal((await membershipOf("advisor@consultora.test", "empresa-b"))?.role, "DIRECTIVO");
  assert.equal(await membershipOf("advisor@consultora.test", "andina"), null);
  // cambiar el rol en B no toca el rol en A; retirar la membresía deja la cuenta en A
  runWithTenant("empresa-b", () => { assert.ok(updateUser(actorB, "advisor@consultora.test", { role: "LIDER" }).ok); });
  const f2 = await findUserForLogin("advisor@consultora.test");
  assert.equal(f2!.user.role, "CONSULTOR"); assert.equal(f2!.otras[0].role, "LIDER");
  runWithTenant("empresa-b", () => { assert.ok(removeUser(actorB, "advisor@consultora.test").ok); assert.ok(!getUsers().some((x) => x.email === "advisor@consultora.test")); });
  runWithTenant("empresa-a", () => { assert.ok(getUsers().some((x) => x.email === "advisor@consultora.test" && !x.membresia)); });
  // una cuenta inexistente o un admin de plataforma no se agregan por membresía
  await runWithTenant("empresa-b", async () => {
    assert.ok(!(await addMembership(actorB, "nadie@x.test", { role: "DIRECTIVO" })).ok);
    assert.equal((await addMembership(actorB, admin.email, { role: "DIRECTIVO" })).status, 404);
  });
});
