// Rutas únicas por empresa: prefijo en la URL, cookie de sesión para el proxy
// y cambio de identificador de una empresa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTenantPath, tenantBase, parseSessionCookie, RESERVED } from "../src/lib/tenant-url";
import { encodeSession } from "../src/lib/session";
import { resetStore, createCompany, updateCompany, companyBySlug, listCompanies } from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@algoritmot.com", name: "Admin", role: "ADMIN" };

test("rutas: el primer segmento es la empresa y el resto la ruta interna", () => {
  assert.deepEqual(splitTenantPath("/cresio/login"), { tenant: "cresio", path: "/login" });
  assert.deepEqual(splitTenantPath("/cresio/panel/kpi?x=1".split("?")[0]), { tenant: "cresio", path: "/panel/kpi" });
  assert.deepEqual(splitTenantPath("/cresio"), { tenant: "cresio", path: "/panel" });
  assert.deepEqual(splitTenantPath("/cresio/"), { tenant: "cresio", path: "/panel" });
  assert.deepEqual(splitTenantPath("/login"), { tenant: null, path: "/login" });
  assert.deepEqual(splitTenantPath("/panel/kpi"), { tenant: null, path: "/panel/kpi" });
  assert.deepEqual(splitTenantPath("/api/td/kpi"), { tenant: null, path: "/api/td/kpi" });
  assert.deepEqual(splitTenantPath("/empresas"), { tenant: null, path: "/empresas" });
  assert.deepEqual(splitTenantPath("/cresio/otra-cosa"), { tenant: null, path: "/cresio/otra-cosa" }, "solo las secciones de la app admiten prefijo");
  assert.deepEqual(splitTenantPath("/Cresio/panel"), { tenant: null, path: "/Cresio/panel" }, "el identificador va en minúsculas");
  assert.equal(tenantBase("cresio"), "/cresio"); assert.equal(tenantBase(null), ""); assert.equal(tenantBase("A B"), "");
  assert.ok(RESERVED.has("api") && RESERVED.has("panel") && RESERVED.has("empresas"));
});

test("cookie: el proxy lee rol y empresa sin verificar la firma, y descarta sesiones vencidas", () => {
  const tok = encodeSession({ email: "g@cresio.example", name: "Gerencia Ñandú", role: "LIDER", company: { slug: "cresio", name: "Cresio", shortName: "Cresio" } });
  assert.deepEqual(parseSessionCookie(tok), { role: "LIDER", company: "cresio" });
  assert.deepEqual(parseSessionCookie(encodeSession(admin)), { role: "ADMIN", company: undefined });
  assert.equal(parseSessionCookie(undefined), null); assert.equal(parseSessionCookie("basura"), null);
});

test("empresa: el identificador se puede cambiar; no a uno reservado, repetido ni el de la demo", async () => {
  resetStore();
  const c = await createCompany(admin, { name: "Rutas Prueba", template: "vacia" });
  assert.ok(c.ok && c.company.slug === "rutas-prueba");
  const reserved = await createCompany(admin, { name: "Panel", slug: "panel", template: "vacia" });
  assert.ok(!reserved.ok && reserved.status === 422, "identificador reservado");
  assert.ok(!(await updateCompany(admin, "rutas-prueba", { newSlug: "api" })).ok);
  assert.ok(!(await updateCompany(admin, "rutas-prueba", { newSlug: "andina" })).ok, "repetido");
  assert.ok(!(await updateCompany(admin, "andina", { newSlug: "demo" })).ok, "la demo conserva el suyo");
  const r = await updateCompany(admin, "rutas-prueba", { newSlug: "rutas", name: "Rutas SA" });
  assert.ok(r.ok && r.company.slug === "rutas" && r.company.name === "Rutas SA");
  assert.equal(companyBySlug("rutas-prueba"), null);
  assert.equal(companyBySlug("rutas")?.name, "Rutas SA");
  assert.ok(listCompanies().filter((x) => x.slug === "rutas").length === 1);
  resetStore();
});
