// Acceso por sección de la convención con QR: enlaces por sección, regeneración,
// entrada con alta única por correo y rutas con prefijo de empresa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, accessLinks, updateAccess, accessSectionOf, accessUser, getUsers } from "../src/server/store";
import { parseAccess, sectionOfToken, ACCESS_SECTIONS, accessUrl, sectionPath, isCompanyMode } from "../src/lib/acceso";
import { splitTenantPath } from "../src/lib/tenant-url";
import type { SessionUser } from "../src/lib/session";

const advisor: SessionUser = { email: "c@a.co", name: "Advisor", role: "CONSULTOR", company: { slug: "andina", name: "Andina", shortName: "Andina" } };
const junta: SessionUser = { email: "j@a.co", name: "Junta", role: "DIRECTIVO" };
const inAndina = <T,>(fn: () => Promise<T> | T) => runWithTenant("andina", async () => fn());

test("enlaces por sección: se crean una vez, se conservan y solo los regenera quien administra usuarios", async () => {
  await inAndina(() => {
    resetStore();
    const r1 = accessLinks(advisor); assert.equal(r1.ok, true);
    const a1 = (r1 as { access: { section: string; token: string; role: string }[] }).access;
    assert.deepEqual(a1.map((x) => x.section), ACCESS_SECTIONS.map((s) => s.id));
    assert.equal(a1.find((x) => x.section === "okr")?.role, "LIDER");
    assert.equal(a1.find((x) => x.section === "priorizacion")?.role, "DIRECTIVO");
    const r2 = accessLinks(advisor);
    assert.deepEqual((r2 as typeof r1 & { access: unknown }).access, a1);                     // estable
    assert.equal(new Set(a1.map((x) => x.token)).size, 5);                                     // únicos
    assert.equal(accessLinks(junta).ok, false);
    const before = a1.find((x) => x.section === "okr")!.token;
    const r3 = updateAccess(advisor, "okr", { regenerate: true, role: "DIRECTIVO" });
    assert.equal(r3.ok, true);
    const okr = (r3 as typeof r1 & { access: { section: string; token: string; role: string }[] }).access.find((x) => x.section === "okr")!;
    assert.notEqual(okr.token, before); assert.equal(okr.role, "DIRECTIVO");
    assert.equal(accessSectionOf(before), null);
    assert.equal(accessSectionOf(okr.token), "okr");
    assert.equal(updateAccess(advisor, "otra", {}).ok, false);
    assert.equal(updateAccess(advisor, "okr", { role: "ADMIN" }).ok, false);
  });
});

test("entrada por QR: crea la cuenta una sola vez, la reutiliza por correo y rechaza tokens y correos inválidos", async () => {
  await inAndina(async () => {
    resetStore();
    const links = accessLinks(advisor) as { ok: true; access: { section: string; token: string }[] };
    const tok = links.access.find((x) => x.section === "priorizacion")!.token;
    const n0 = getUsers().length;
    const r1 = await accessUser(tok, { name: "Mishell Mendieta", email: "Mishell@Cresio.ec" });
    assert.equal(r1.ok, true);
    const u1 = (r1 as { user: SessionUser; created: boolean; section: string });
    assert.equal(u1.created, true); assert.equal(u1.section, "priorizacion");
    assert.equal(u1.user.email, "mishell@cresio.ec"); assert.equal(u1.user.role, "DIRECTIVO");
    assert.equal(u1.user.company?.slug, "andina");
    assert.equal(getUsers().length, n0 + 1);
    const r2 = await accessUser(tok, { name: "Mishell M.", email: "  mishell@cresio.ec " });
    assert.equal(r2.ok, true);
    assert.equal((r2 as { created: boolean }).created, false);
    assert.equal(getUsers().length, n0 + 1);                                                  // sin duplicados
    assert.equal((r2 as { user: SessionUser }).user.name, "Mishell Mendieta");               // conserva la cuenta existente
    // quien ya tiene cuenta conserva su rol aunque entre por otra sección
    const okrTok = links.access.find((x) => x.section === "okr")!.token;
    const r3 = await accessUser(okrTok, { name: "Mishell Mendieta", email: "mishell@cresio.ec" });
    assert.equal((r3 as { user: SessionUser }).user.role, "DIRECTIVO");
    assert.equal((await accessUser("token-que-no-existe-xx", { name: "Alguien Más", email: "x@y.co" })).ok, false);
    assert.equal((await accessUser(tok, { name: "Sin", email: "x@y.co" })).ok, false);
    assert.equal((await accessUser(tok, { name: "Sin Correo Válido", email: "no-es-correo" })).ok, false);
  });
});

test("reglas puras: parseAccess, sectionOfToken, rutas y modo", () => {
  assert.deepEqual(parseAccess(undefined), { ok: true, access: undefined });
  assert.equal(parseAccess({ okr: { token: "corto", role: "LIDER" } }).ok, false);
  const ok = parseAccess({ okr: { token: "abcdefghijklmnopqrstuv", role: "LIDER" }, otra: { token: "x" } });
  assert.equal(ok.ok, true);
  const acc = (ok as { access: Record<string, { token: string; role: string }> }).access;
  assert.deepEqual(Object.keys(acc), ["okr"]);
  assert.equal(sectionOfToken(acc as never, "abcdefghijklmnopqrstuv"), "okr");
  assert.equal(sectionOfToken(acc as never, "zzz"), null);
  assert.deepEqual(splitTenantPath("/cresio/acceso/abcdefghijklmnopqrstuv"), { tenant: "cresio", path: "/acceso/abcdefghijklmnopqrstuv" });
  assert.deepEqual(splitTenantPath("/acceso/abc"), { tenant: null, path: "/acceso/abc" });
  assert.equal(accessUrl("https://x.app/", "cresio", "t0k"), "https://x.app/cresio/acceso/t0k");
  assert.equal(sectionPath("cresio", "okr"), "/cresio/panel/convencion?t=okr");
  assert.equal(isCompanyMode("convencion"), true); assert.equal(isCompanyMode("otro"), false);
});
