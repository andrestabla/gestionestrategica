// Plantilla común de los correos salientes: cabecera, pie y versiones de cada correo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mailLayout, mailText, mailButton, MAIL_CONTACT } from "../src/lib/correo-plantilla";
import { welcomeMail } from "../src/lib/correos";
import { resetMail } from "../src/lib/recuperacion";

test("mailLayout: cabecera con marca y empresa, cuerpo y pie con contacto", () => {
  const html = mailLayout({ title: "Hola & adiós", company: "Cresio <SA>", body: "<p>cuerpo</p>" });
  assert.match(html, /4shine-logo-blanco\.png/);
  assert.match(html, /CRESIO|Cresio &lt;SA&gt;/);
  assert.match(html, /Hola &amp; adiós/);
  assert.match(html, /<p>cuerpo<\/p>/);
  assert.match(html, new RegExp(MAIL_CONTACT));
  assert.match(html, /gestionestrategica\.io/);
  assert.match(mailButton("https://x.app/a?b=1&c=2", "Entrar"), /href="https:\/\/x\.app\/a\?b=1&amp;c=2"/);
  const text = mailText({ company: "Cresio", body: "Hola" });
  assert.match(text, /^4SHINE EMPRESAS · CRESIO/); assert.match(text, /plataforma@algoritmot\.com/);
});

test("bienvenida y restablecimiento usan la plantilla", () => {
  const w = welcomeMail({ name: "Ana", company: "Cresio", loginLink: "https://x.app/cresio/login", email: "ana@x.co", password: "abc123XYZ789", by: "Andrés" });
  assert.match(w.html, /4shine-logo-blanco\.png/); assert.match(w.html, /abc123XYZ789/); assert.match(w.html, /Entrar a la plataforma/);
  assert.match(w.text, /^4SHINE EMPRESAS · CRESIO/); assert.match(w.text, /https:\/\/x\.app\/cresio\/login/);
  const r = resetMail("Ana", "https://x.app/restablecer/t0k", 60, "Cresio");
  assert.match(r.html, /4shine-logo-blanco\.png/); assert.match(r.html, /Crear una contraseña nueva/); assert.match(r.text, /plataforma@algoritmot\.com/);
});
