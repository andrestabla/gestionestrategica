// Recuperación de contraseña: reglas puras del enlace y del correo; sin base
// de datos el store no emite ni consume tokens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resetLink, isExpired, passwordOk, resetMail, RESET_MINUTES } from "../src/lib/recuperacion";
import { splitTenantPath } from "../src/lib/tenant-url";
import { requestPasswordReset, resetPassword } from "../src/server/store";

test("enlace, vencimiento, contraseña y correo", () => {
  assert.equal(resetLink("https://x.app/", null, "t0k"), "https://x.app/restablecer/t0k");
  assert.equal(resetLink("https://x.app", "cresio", "t0k"), "https://x.app/cresio/restablecer/t0k");
  assert.equal(isExpired(new Date(Date.now() + 60_000)), false);
  assert.equal(isExpired(new Date(Date.now() - 1)), true);
  assert.equal(isExpired(null), true);
  assert.equal(passwordOk("corta"), false); assert.equal(passwordOk("suficientemente-larga"), true);
  const m = resetMail("Andrés", "https://x.app/restablecer/abc");
  assert.match(m.subject, /contraseña/); assert.match(m.text, /abc/); assert.match(m.html, /abc/); assert.match(m.text, new RegExp(String(RESET_MINUTES)));
  assert.deepEqual(splitTenantPath("/cresio/restablecer/abc"), { tenant: "cresio", path: "/restablecer/abc" });
});

test("sin base de datos no hay tokens", async () => {
  assert.equal(await requestPasswordReset("x@y.co", null), null);
  const r = await resetPassword("a".repeat(40), "contrasena-larga-1");
  assert.equal(r.ok, false); assert.equal((r as { status: number }).status, 503);
});
