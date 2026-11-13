import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, createCompany, createUser, companyBySlug, crearCodigo, listarCodigos, anularCodigoAcceso, consultarCodigo, canjearCodigo, entrarConCodigo, findUserForLogin, getUsers, catalog } from "../src/server/store";
import { formatoCodigo, normalizarCodigo, estadoCodigo, alcanceDe, alcanceTexto, validarOrganizacion, correoCodigoAcceso, CODIGO_ALFABETO } from "../src/lib/codigos";
import { hasInstrument } from "../src/lib/instrumentos";
import { splitTenantPath } from "../src/lib/tenant-url";
import { DIAGNOSTICOS_PUBLICOS, diagnosticoPublico } from "../src/data/diagnosticos-publicos";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin Plataforma", role: "ADMIN" };
const ORG = { organizacion: "Textiles del Valle", sector: "Confecciones", pais: "CO", ciudad: "Cali", tamano: "80 colaboradores", consent: true };

test("el código de acceso tiene una forma fija, se lee aunque se escriba distinto y declara su estado", () => {
  assert.equal(formatoCodigo("ABCD2345"), "GE-ABCD-2345");
  for (const v of ["GE-ABCD-2345", "ge abcd 2345", "abcd2345", " GE-ABCD-2345 "]) assert.equal(normalizarCodigo(v), "ABCD2345");
  for (const v of ["", "GE-ABCD-234", "GE-ABCD-23O5", "GE-ABCD-2315", 12345678]) assert.equal(normalizarCodigo(v), null, String(v));
  assert.ok(!/[ILO01]/.test(CODIGO_ALFABETO));
  assert.deepEqual(alcanceDe("test,madurez,otro"), ["madurez", "test"]);
  assert.match(alcanceTexto(["madurez", "test"]), /madurez en transformación digital y el test de capacidades/);
  const base = { expiresAt: new Date(Date.now() + 86_400_000).toISOString() };
  assert.equal(estadoCodigo(base), "sin_enviar");
  assert.equal(estadoCodigo({ ...base, sentAt: "2026-01-01" }), "enviado");
  assert.equal(estadoCodigo({ ...base, sentAt: "2026-01-01", usedAt: "2026-01-02" }), "usado");
  assert.equal(estadoCodigo({ expiresAt: "2020-01-01T00:00:00.000Z", sentAt: "2019-12-01" }), "vencido");
  assert.equal(estadoCodigo({ ...base, usedAt: "2026-01-02", revokedAt: "2026-01-03" }), "anulado");
  assert.deepEqual(validarOrganizacion({ ...ORG, consent: false }), { ok: false, error: "Para continuar debes aceptar el tratamiento de tus datos personales." });
  assert.equal(validarOrganizacion({ ...ORG, sector: "" }).ok, false);
  const m = correoCodigoAcceso({ name: "Ana Gómez", code: "ABCD2345", scope: ["test"], createdByName: "Laura Advisor", expiresAt: "2026-12-12T12:00:00.000Z" }, "https://sitio.test/codigo?c=GE-ABCD-2345");
  assert.ok(m.text.includes("GE-ABCD-2345") && m.text.includes("Hola Ana") && m.text.includes("Laura Advisor") && m.text.includes("el test de capacidades") && m.text.includes("https://sitio.test/codigo?c=GE-ABCD-2345"));
  assert.ok(!m.subject.includes("ABCD"), "el asunto no lleva el código");
  // las rutas públicas nuevas no se confunden con el identificador de una empresa
  assert.deepEqual(splitTenantPath("/codigo"), { tenant: null, path: "/codigo" });
  assert.deepEqual(splitTenantPath("/diagnosticos/madurez-digital"), { tenant: null, path: "/diagnosticos/madurez-digital" });
  assert.deepEqual(DIAGNOSTICOS_PUBLICOS.map((d) => d.slug), ["madurez-digital", "test-de-capacidades"]);
  assert.ok(diagnosticoPublico("test-de-capacidades")?.pasos.length && !diagnosticoPublico("otro"));
});

test("solo el admin o el advisor generan códigos, y no para un correo que ya tiene cuenta", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Cliente Uno", template: "vacia" })).ok);
  runWithTenant("cliente-uno", () => { assert.ok(createUser(admin, { email: "ya@cliente.test", name: "Persona Existente", role: "DIRECTIVO" }).ok); });
  const directivo: SessionUser = { email: "ya@cliente.test", name: "Persona Existente", role: "DIRECTIVO" };
  assert.deepEqual(await crearCodigo(directivo, { name: "Ana Gómez", email: "ana@nueva.test", scope: ["test"] }), { ok: false, status: 403, error: "Los códigos de acceso los genera el administrador o el advisor." });
  assert.equal((await crearCodigo(admin, { name: "Ana", email: "ana@nueva.test", scope: ["test"] })).ok, false, "nombre incompleto");
  assert.equal((await crearCodigo(admin, { name: "Ana Gómez", email: "ana@nueva.test", scope: [] })).ok, false, "sin diagnóstico");
  const ya = await crearCodigo(admin, { name: "Persona Existente", email: "ya@cliente.test", scope: ["test"] });
  assert.ok(!ya.ok && ya.status === 409 && /ya tiene una cuenta en Cliente Uno/.test(ya.error));
  // un segundo código para la misma persona anula el anterior
  const a = await crearCodigo(admin, { name: "Ana Gómez", email: "Ana@Nueva.test", organization: "Textiles", scope: ["madurez"] });
  const b = await crearCodigo(admin, { name: "Ana Gómez", email: "ana@nueva.test", scope: ["madurez", "test"] });
  assert.ok(a.ok && b.ok); if (!a.ok || !b.ok) return;
  assert.notEqual(a.codigo.code, b.codigo.code);
  assert.equal(a.codigo.email, "ana@nueva.test");
  const primero = await consultarCodigo(formatoCodigo(a.codigo.code));
  assert.ok(!primero.ok && primero.status === 410);
  assert.equal((await consultarCodigo("GE-ZZZZ-9999")).ok, false);
  const lista = await listarCodigos(admin);
  assert.equal(lista.length, 2);
  assert.deepEqual(await listarCodigos(directivo), []);
  // anular un código abierto lo deja sin efecto
  const an = await anularCodigoAcceso(admin, b.codigo.id);
  assert.ok(an.ok);
  const q = await consultarCodigo(b.codigo.code);
  assert.ok(!q.ok && /anulado/.test(q.error));
});

test("al usar el código nace el espacio de la organización, limitado a los diagnósticos que incluye", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Casa Advisor", template: "vacia" })).ok);
  runWithTenant("casa-advisor", () => { assert.ok(createUser(admin, { email: "laura@advisor.test", name: "Laura Advisor", role: "CONSULTOR" }).ok); });
  const advisor: SessionUser = { email: "laura@advisor.test", name: "Laura Advisor", role: "CONSULTOR", company: { slug: "casa-advisor", name: "Casa Advisor", shortName: "Casa" } };
  const c = await crearCodigo(advisor, { name: "Ana Gómez", email: "ana@textiles.test", scope: ["test"] });
  assert.ok(c.ok); if (!c.ok) return;
  const consulta = await consultarCodigo(formatoCodigo(c.codigo.code).toLowerCase());
  assert.ok(consulta.ok && consulta.estado === "nuevo");
  assert.equal((await entrarConCodigo(c.codigo.code)).ok, false, "sin usar no abre sesión");
  assert.equal((await canjearCodigo(c.codigo.code, { ...ORG, consent: false })).ok, false);
  const r = await canjearCodigo(c.codigo.code, ORG);
  assert.ok(r.ok, r.ok ? "" : r.error); if (!r.ok) return;
  assert.equal(r.slug, "textiles-del-valle");
  assert.equal(r.next, "/textiles-del-valle/panel");
  assert.deepEqual([r.user.email, r.user.role, r.user.company?.slug], ["ana@textiles.test", "DIRECTIVO", "textiles-del-valle"]);
  const rec = companyBySlug("textiles-del-valle")!;
  assert.deepEqual([rec.name, rec.sector, rec.city, rec.country], ["Textiles del Valle", "Confecciones", "Cali", "CO"]);
  // solo el diagnóstico (con el test) queda encendido; madurez digital y el resto, fuera del alcance
  assert.ok(!rec.modulesOff?.includes("diagnostico") && rec.modulesOff?.includes("madurez") && rec.modulesOff?.includes("proyectos") && rec.modulesOff?.includes("inteligencia"));
  assert.ok(hasInstrument(rec, "test") && !hasInstrument(rec, "f1"));
  runWithTenant("textiles-del-valle", () => {
    assert.equal(catalog().company.name, "Textiles del Valle");
    const us = getUsers();
    const ana = us.find((u) => u.email === "ana@textiles.test"), laura = us.find((u) => u.email === "laura@advisor.test");
    assert.ok(ana && ana.role === "DIRECTIVO" && ana.consentAt, "la persona queda como directivo, con el tratamiento de datos aceptado");
    assert.ok(laura && laura.role === "CONSULTOR" && laura.membresia, "quien generó el código acompaña el espacio");
  });
  assert.equal((await findUserForLogin("ana@textiles.test"))?.company?.slug, "textiles-del-valle");
  // el código no sirve para registrar otra organización, pero sí para volver a entrar
  assert.equal((await canjearCodigo(c.codigo.code, { ...ORG, organizacion: "Otra" })).ok, false);
  const usado = await consultarCodigo(c.codigo.code);
  assert.ok(usado.ok && usado.estado === "usado" && usado.codigo.companySlug === "textiles-del-valle");
  const otra = await entrarConCodigo(c.codigo.code);
  assert.ok(otra.ok && otra.user.email === "ana@textiles.test" && otra.next === "/textiles-del-valle/panel");
  assert.equal((await anularCodigoAcceso(advisor, c.codigo.id)).ok, false, "un código usado no se anula");
  // con los dos diagnósticos entra al panel; si el nombre ya existe, el espacio recibe otro identificador
  const d = await crearCodigo(admin, { name: "Pedro Ruiz", email: "pedro@textiles2.test", scope: ["madurez", "test"] });
  assert.ok(d.ok); if (!d.ok) return;
  const r2 = await canjearCodigo(d.codigo.code, ORG);
  assert.ok(r2.ok, r2.ok ? "" : r2.error); if (!r2.ok) return;
  assert.equal(r2.slug, "textiles-del-valle-2");
  assert.equal(r2.next, "/textiles-del-valle-2/panel");
  const rec2 = companyBySlug("textiles-del-valle-2")!;
  assert.ok(!rec2.modulesOff?.includes("madurez") && !rec2.modulesOff?.includes("diagnostico"));
});
