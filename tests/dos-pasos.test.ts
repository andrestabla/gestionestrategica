import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, createCompany, companyBySlug, setTwoFactor, exigeCodigo, exigeCodigoEn, emitirCodigo, verificarCodigo, anularCodigo, type UsuarioEncontrado } from "../src/server/store";
import { encodeSession, decodeSession, type SessionUser } from "../src/lib/session";
import { enmascarar, limpiarCodigo, codigoValido, correoCodigo, mensajeCodigo, CODIGO_INTENTOS } from "../src/lib/dos-pasos";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };
const cuenta = (email: string, role: SessionUser["role"]) => ({ email, name: "Persona", role, active: true }) as UsuarioEncontrado["user"];

test("el doble factor nace apagado, lo cambia quien administra los usuarios y decide a quién se le pide el código", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Segura SA", template: "vacia" })).ok);
  assert.ok((await createCompany(admin, { name: "Abierta SA", template: "vacia" })).ok);
  const segura = () => companyBySlug("segura-sa")!, abierta = () => companyBySlug("abierta-sa")!;
  assert.equal(segura().twoFactor, undefined, "apagado por defecto");
  assert.equal(exigeCodigoEn("segura-sa"), false);
  const persona = (c: ReturnType<typeof segura> | null, otras: UsuarioEncontrado["otras"] = []): UsuarioEncontrado => ({ user: cuenta("ana@segura.test", "LIDER"), company: c, otras });
  assert.equal(exigeCodigo(persona(segura()), segura()), false);
  assert.equal(exigeCodigo({ user: cuenta(admin.email, "ADMIN"), company: null, otras: [] }, null), false);

  runWithTenant("segura-sa", () => {
    const directivo: SessionUser = { email: "dir@segura.test", name: "Directivo", role: "DIRECTIVO", company: { slug: "segura-sa", name: "Segura SA", shortName: "Segura" } };
    assert.deepEqual(setTwoFactor(directivo, true), { ok: false, status: 403, error: "Solo quien administra los usuarios de la empresa cambia la seguridad del acceso." });
    assert.deepEqual(setTwoFactor(admin, true), { ok: true, twoFactor: true });
  });
  assert.equal(segura().twoFactor, true);
  assert.equal(exigeCodigoEn("segura-sa"), true);
  assert.equal(exigeCodigoEn("abierta-sa"), false);
  // se le pide a quien entra a la empresa que lo exige, a quien puede pasar a ella por membresía y al admin de plataforma
  assert.equal(exigeCodigo(persona(segura()), segura()), true);
  assert.equal(exigeCodigo(persona(abierta()), abierta()), false);
  assert.equal(exigeCodigo(persona(abierta(), [{ company: segura(), role: "CONSULTOR" }]), abierta()), true);
  assert.equal(exigeCodigo({ user: cuenta(admin.email, "ADMIN"), company: null, otras: [] }, null), true);
  // la salida de emergencia del entorno lo apaga para toda la plataforma
  process.env.ACCESO_DOS_PASOS = "off";
  assert.equal(exigeCodigo(persona(segura()), segura()), false);
  assert.equal(exigeCodigoEn("segura-sa"), false);
  delete process.env.ACCESO_DOS_PASOS;

  runWithTenant("segura-sa", () => assert.deepEqual(setTwoFactor(admin, false), { ok: true, twoFactor: false }));
  assert.equal(exigeCodigoEn("segura-sa"), false);
});

test("el código es de un solo uso, se invalida al agotar los intentos y no se reenvía de inmediato", async () => {
  resetStore();
  const email = "ana@segura.test";
  const r = await emitirCodigo(email);
  assert.ok(r.ok && /^\d{6}$/.test(r.code));
  if (!r.ok) return;
  // otro envío enseguida: hay que esperar, y el primero sigue valiendo
  const otra = await emitirCodigo(email);
  assert.ok(!otra.ok && otra.status === 429 && (otra.espera ?? 0) > 0);
  const mal = r.code === "000000" ? "111111" : "000000";
  const f1 = await verificarCodigo(email, mal);
  assert.deepEqual(f1, { ok: false, status: 401, error: `Código incorrecto. Te quedan ${CODIGO_INTENTOS - 1} intentos.` });
  assert.deepEqual(await verificarCodigo(email, r.code), { ok: true });
  assert.deepEqual(await verificarCodigo(email, r.code), { ok: false, status: 410, error: "El código venció o ya se usó. Pide uno nuevo." }, "un código usado no vuelve a servir");
  // tras usarlo se puede emitir otro sin esperar; con los intentos agotados deja de servir aunque luego se acierte
  const s = await emitirCodigo(email);
  assert.ok(s.ok); if (!s.ok) return;
  const mal2 = s.code === "000000" ? "111111" : "000000";
  for (let i = 1; i < CODIGO_INTENTOS; i++) assert.equal((await verificarCodigo(email, mal2)).ok, false);
  const ultimo = await verificarCodigo(email, mal2);
  assert.ok(!ultimo.ok && ultimo.status === 429 && /agotaron/.test(ultimo.error));
  assert.equal((await verificarCodigo(email, s.code)).ok, false);
  // un código anulado (no se pudo enviar) no sirve y permite pedir otro enseguida
  await anularCodigo(email);
  const t = await emitirCodigo(email);
  assert.ok(t.ok); if (!t.ok) return;
  await anularCodigo(email);
  assert.equal((await verificarCodigo(email, t.code)).ok, false);
  // el código de una cuenta no sirve para otra
  const u = await emitirCodigo("otra@segura.test");
  assert.ok(u.ok); if (!u.ok) return;
  assert.equal((await verificarCodigo("tercera@segura.test", u.code)).ok, false);
});

test("la sesión recuerda que pasó por el código y el correo explica por qué se pide", () => {
  const base: SessionUser = { email: "ana@segura.test", name: "Ana Gómez", role: "LIDER", company: { slug: "segura-sa", name: "Segura SA", shortName: "Segura" } };
  assert.equal(decodeSession(encodeSession(base))?.mfa, undefined);
  assert.equal(decodeSession(encodeSession({ ...base, mfa: true }))?.mfa, true);
  assert.equal(enmascarar("andres.tabla@empresa.com"), "an••••••@empresa.com");
  assert.equal(enmascarar("ab@x.co"), "a•••@x.co");
  assert.equal(limpiarCodigo(" 123 456 "), "123456");
  assert.ok(codigoValido("123456") && !codigoValido("12345") && !codigoValido("1234567"));
  assert.equal(mensajeCodigo("Siegfried"), "Por seguridad del acceso a la información de Siegfried, escribe el código que enviamos a tu correo.");
  assert.match(mensajeCodigo(), /la organización/);
  const m = correoCodigo("Ana Gómez", "012345", "Siegfried");
  assert.ok(!m.subject.includes("012") && !m.subject.includes("345"), "el asunto no lleva el código: el registro de correos guarda el asunto");
  assert.ok(m.text.includes("012 345") && m.text.includes("Hola Ana") && m.text.includes("Siegfried") && m.text.includes("10 minutos"));
  assert.ok(m.html.includes("012 345"));
});
