// Acceso por sección de la convención con QR: enlaces por sección, regeneración,
// entrada con alta única por correo y rutas con prefijo de empresa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, accessLinks, updateAccess, accessSectionOf, accessUser, getUsers, catalog } from "../src/server/store";
import { parseAccess, sectionOfToken, ACCESS_SECTIONS, accessUrl, sectionPath, isCompanyMode } from "../src/lib/acceso";
import { splitTenantPath } from "../src/lib/tenant-url";
import type { SessionUser } from "../src/lib/session";

const advisor: SessionUser = { email: "c@a.co", name: "Advisor", role: "CONSULTOR", company: { slug: "andina", name: "Andina", shortName: "Andina" } };
const junta: SessionUser = { email: "j@a.co", name: "Junta", role: "DIRECTIVO" };
const inAndina = <T,>(fn: () => Promise<T> | T) => runWithTenant("andina", async () => fn());

test("acceso único de la convención: se crea una vez, se conserva y solo lo regenera quien administra usuarios", async () => {
  await inAndina(() => {
    resetStore();
    const r1 = accessLinks(advisor); assert.equal(r1.ok, true);
    const a1 = (r1 as { access: { section: string; token: string; role: string }[] }).access;
    assert.deepEqual(a1.map((x) => x.section), ["convencion"]);
    const r2 = accessLinks(advisor);
    assert.deepEqual((r2 as typeof r1 & { access: unknown }).access, a1);                     // estable
    assert.equal(accessLinks(junta).ok, false);
    const before = a1[0].token;
    const r3 = updateAccess(advisor, "convencion", { regenerate: true });
    assert.equal(r3.ok, true);
    const cv = (r3 as typeof r1 & { access: { section: string; token: string; role: string }[] }).access.find((x) => x.section === "convencion")!;
    assert.notEqual(cv.token, before);
    assert.equal(accessSectionOf(before), null);
    assert.equal(accessSectionOf(cv.token), "convencion");
    assert.equal(updateAccess(advisor, "otra", {}).ok, false);
    assert.equal(updateAccess(advisor, "convencion", { role: "ADMIN" }).ok, false);
  });
});

test("entrada por QR: tribu y rol obligatorios, cuenta única por correo, líder con edición y tokens o correos inválidos rechazados", async () => {
  await inAndina(async () => {
    resetStore();
    const links = accessLinks(advisor) as { ok: true; access: { section: string; token: string }[] };
    const tok = links.access[0].token;
    const tribe = catalog().responsibles[0].id;
    const n0 = getUsers().length;
    // sin aceptar el tratamiento de datos, sin tribu o sin rol no se crea la cuenta
    assert.equal((await accessUser(tok, { name: "Mishell Mendieta", email: "Mishell@Cresio.ec", responsibleId: tribe, entryRole: "miembro" })).ok, false);
    assert.equal((await accessUser(tok, { name: "Mishell Mendieta", email: "Mishell@Cresio.ec", consent: true, entryRole: "miembro" })).ok, false);
    assert.equal((await accessUser(tok, { name: "Mishell Mendieta", email: "Mishell@Cresio.ec", consent: true, responsibleId: tribe })).ok, false);
    assert.equal((await accessUser(tok, { name: "Mishell Mendieta", email: "Mishell@Cresio.ec", consent: true, responsibleId: "no-existe", entryRole: "miembro" })).ok, false);
    // miembro de tribu: cuenta acotada a su tribu (responsable del catálogo)
    const r1 = await accessUser(tok, { name: "Mishell Mendieta", email: "Mishell@Cresio.ec", consent: true, responsibleId: tribe, entryRole: "miembro" });
    assert.equal(r1.ok, true);
    const u1 = (r1 as { user: SessionUser; created: boolean; section: string });
    assert.equal(u1.created, true); assert.equal(u1.section, "convencion");
    assert.equal(u1.user.email, "mishell@cresio.ec"); assert.equal(u1.user.role, "RESPONSABLE"); assert.equal(u1.user.responsibleId, tribe);
    assert.equal(u1.user.company?.slug, "andina");
    assert.equal(getUsers().length, n0 + 1);
    // vuelve a entrar: misma cuenta, sin duplicar, sin exigir de nuevo la aceptación
    const r2 = await accessUser(tok, { name: "Mishell M.", email: "  mishell@cresio.ec ", responsibleId: tribe, entryRole: "miembro" });
    assert.equal(r2.ok, true);
    assert.equal((r2 as { created: boolean }).created, false);
    assert.equal(getUsers().length, n0 + 1);
    assert.equal((r2 as { user: SessionUser }).user.name, "Mishell Mendieta");
    // si entra como líder, recibe edición solo en la sesión; la cuenta guardada sigue siendo de miembro
    const r3 = await accessUser(tok, { name: "Mishell Mendieta", email: "mishell@cresio.ec", responsibleId: tribe, entryRole: "lider" });
    assert.equal((r3 as { user: SessionUser }).user.role, "LIDER");
    assert.equal(getUsers().find((u) => u.email === "mishell@cresio.ec")?.role, "RESPONSABLE");
    // líder de tribu nuevo: cuenta con rol de edición y su tribu
    const r4 = await accessUser(tok, { name: "Pedro Pérez Líder", email: "pedro@cresio.ec", consent: true, responsibleId: tribe, entryRole: "lider" });
    assert.equal(r4.ok, true); assert.equal((r4 as { user: SessionUser }).user.role, "LIDER"); assert.equal((r4 as { user: SessionUser }).user.responsibleId, tribe);
    assert.equal((await accessUser("token-que-no-existe-xx", { name: "Alguien Más", email: "x@y.co", consent: true, responsibleId: tribe, entryRole: "miembro" })).ok, false);
    assert.equal((await accessUser(tok, { name: "Sin", email: "x@y.co", consent: true, responsibleId: tribe, entryRole: "miembro" })).ok, false);
    assert.equal((await accessUser(tok, { name: "Sin Correo Válido", email: "no-es-correo", consent: true, responsibleId: tribe, entryRole: "miembro" })).ok, false);
    // directivo: entra sin tribu, con rol de consulta; la sesión queda marcada como entrada por QR
    assert.equal((await accessUser(tok, { name: "Doris Directiva", email: "doris@cresio.ec", consent: true, entryRole: "no-es-rol" })).ok, false);
    const r5 = await accessUser(tok, { name: "Doris Directiva", email: "doris@cresio.ec", consent: true, entryRole: "directivo", responsibleId: tribe });
    assert.equal(r5.ok, true);
    const u5 = (r5 as { user: SessionUser; created: boolean }).user;
    assert.equal(u5.role, "DIRECTIVO"); assert.equal(u5.responsibleId, undefined); assert.equal(u5.qr, true);
    assert.equal(getUsers().find((u) => u.email === "doris@cresio.ec")?.responsibleId, undefined);
    assert.equal(u1.user.qr, true);
  });
});

test("reglas puras: parseAccess, sectionOfToken, rutas y modo", () => {
  assert.deepEqual(parseAccess(undefined), { ok: true, access: undefined });
  assert.equal(parseAccess({ convencion: { token: "corto", role: "LIDER" } }).ok, false);
  const ok = parseAccess({ convencion: { token: "abcdefghijklmnopqrstuv", role: "LIDER" }, otra: { token: "x" } });
  assert.equal(ok.ok, true);
  const acc = (ok as { access: Record<string, { token: string; role: string }> }).access;
  assert.deepEqual(Object.keys(acc), ["convencion"]);
  assert.equal(sectionOfToken(acc as never, "abcdefghijklmnopqrstuv"), "convencion");
  assert.equal(sectionOfToken(acc as never, "zzz"), null);
  assert.deepEqual(splitTenantPath("/cresio/acceso/abcdefghijklmnopqrstuv"), { tenant: "cresio", path: "/acceso/abcdefghijklmnopqrstuv" });
  assert.deepEqual(splitTenantPath("/acceso/abc"), { tenant: null, path: "/acceso/abc" });
  assert.equal(accessUrl("https://x.app/", "cresio", "t0k"), "https://x.app/cresio/acceso/t0k");
  assert.equal(sectionPath("cresio", "convencion"), "/cresio/panel/convencion?t=itinerario");   // lo primero que se ve al entrar por el QR es el itinerario
  assert.equal(isCompanyMode("convencion"), true); assert.equal(isCompanyMode("otro"), false);
});
