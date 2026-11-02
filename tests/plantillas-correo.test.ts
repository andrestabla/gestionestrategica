// Plantillas parametrizables de correo: variables, botón, recuadro, texto plano y validación (node:test + tsx).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderPlantilla, renderLibre, sustituir, validarPlantilla, defaultTemplate, SAMPLE_VARS, MAIL_TEMPLATES } from "../src/lib/plantillas-correo";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, saveMailTemplate, getMailTemplateStored, logMail, listMailLog } from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR", company: { slug: "andina", name: "Andina", shortName: "Andina" } };

test("plantillas: sustitución de variables, botón hacia el enlace, recuadro y versión en texto", () => {
  assert.equal(sustituir("Hola {{nombre}} de {{ Empresa }} {{nada}}", { nombre: "Ana", empresa: "Cresio" }), "Hola Ana de Cresio ");
  const r = renderPlantilla(defaultTemplate("bienvenida"), SAMPLE_VARS.bienvenida, { company: "Siegfried" });
  assert.equal(r.subject, "Tu acceso a la plataforma de Siegfried · Gestión estratégica");
  assert.match(r.html, /href="https:\/\/gestionestrategica\.io\/siegfried\/login"[^>]*>Entrar a la plataforma</);
  assert.match(r.html, /Contraseña inicial: k7Rp2mVx9Qd4/);
  assert.match(r.html, /background:#F3F5F8;border-radius:10px/);
  assert.match(r.text, /Entrar a la plataforma: https:\/\/gestionestrategica\.io\/siegfried\/login/);
  assert.doesNotMatch(r.text, /^>/m);
  assert.match(renderPlantilla({ subject: "x", title: "y", body: "<script>alert(1)</script>" }, {}).html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, "el cuerpo se escapa");
  assert.ok(MAIL_TEMPLATES.every((t) => t.variables.every((v) => t.body.includes(`{{${v.id}}}`) || t.subject.includes(`{{${v.id}}}`))), "cada variable declarada se usa en la plantilla");
});

test("plantillas: validación y correo libre", () => {
  assert.equal(validarPlantilla({ subject: "a", title: "b", body: "c" }), null);
  assert.match(validarPlantilla({ subject: "", title: "b", body: "c" }) ?? "", /asunto/);
  assert.match(validarPlantilla({ subject: "a", title: "b", body: "x".repeat(6001) }) ?? "", /6\.000/);
  const l = renderLibre({ subject: "Sesión del 12 · Gestión estratégica", body: "Hola {{nombre}},\n\nNos vemos.\n\n[[Entrar a la plataforma]]" }, { nombre: "Ana", enlace: "https://x.app/login" }, { company: "Andina" });
  assert.match(l.html, /<h1[^>]*>Sesión del 12<\/h1>/);
  assert.match(l.html, /Hola Ana,/);
  assert.match(l.html, /href="https:\/\/x\.app\/login"/);
});

test("plantillas en el store: solo el admin de plataforma guarda y restaura; el registro de correos conserva los envíos", async () => {
  resetStore();
  await runWithTenant("andina", async () => {
    const no = await saveMailTemplate(advisor, "bienvenida", { subject: "x", title: "y", body: "z" });
    assert.ok(!no.ok && no.status === 403);
    assert.equal((await saveMailTemplate(admin, "otra", { subject: "x", title: "y", body: "z" })).ok, false);
    const bad = await saveMailTemplate(admin, "restablecer", { subject: "", title: "y", body: "z" });
    assert.ok(!bad.ok && bad.status === 422);
    const ok = await saveMailTemplate(admin, "restablecer", { subject: "Nueva clave · {{empresa}}", title: "Nueva clave", body: "Hola {{nombre}}\n\n[[Crear clave]]" });
    assert.ok(ok.ok && ok.template?.updatedBy === admin.email);
    assert.equal(getMailTemplateStored("restablecer")?.subject, "Nueva clave · {{empresa}}");
    assert.ok((await saveMailTemplate(admin, "restablecer", null)).ok);
    assert.equal(getMailTemplateStored("restablecer"), null);
    await logMail({ by: "sistema", companySlug: "andina", kind: "restablecer", to: "ana@x.co", subject: "s", status: "enviado", messageId: "m1" });
    await logMail({ by: admin.email, companySlug: null, kind: "directo", to: "b@x.co", subject: "s2", status: "error", error: "SES" });
    const todos = await listMailLog();
    assert.equal(todos.length, 2); assert.equal(todos[0].to, "b@x.co");
    assert.equal((await listMailLog({ companySlug: "andina" })).length, 1);
  });
});
