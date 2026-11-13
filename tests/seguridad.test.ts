// Endurecimiento de seguridad: lo que cada corrección debe seguir garantizando.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import {
  resetStore, createCompany, createUser, updateUser, removeUser, addMembership, setUserPassword, accessLinks, accessUser, tenantView, fichaPublica,
  sesionVigente, cerrarSesionesDe, bloqueoLogin, registrarFalloLogin, limpiarFallosLogin, LOGIN_MAX, catalog,
} from "../src/server/store";
import { resolverEmpresa } from "../src/server/empresa-peticion";
import { encodeSession, decodeSession, type SessionUser } from "../src/lib/session";
import { rutaInterna } from "../src/lib/tenant-url";
import { renderPlantilla } from "../src/lib/plantillas-correo";
import { correoSolicitudNueva } from "../src/lib/solicitudes";
import { csvCell } from "../src/lib/convencion";
import { frenado, liberar, reiniciarFrenos, ipDe } from "../src/server/freno";
import { originOf } from "../src/app/api/td/convencion/acceso/route";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
let serie = 0;
async function empresa() {
  resetStore(); reiniciarFrenos();
  const slug = `seg-${++serie}`, c = { slug, name: `Seguridad ${serie}`, shortName: `S${serie}` };
  const r = await createCompany(admin, { name: c.name, slug, template: "vacia", mode: "convencion" });
  assert.ok(r.ok, r.ok ? "" : r.error);
  return c;
}
const en = <T,>(slug: string, fn: () => Promise<T> | T) => runWithTenant(slug, async () => fn());

test("la redirección tras cambiar de empresa solo admite rutas de este sitio", () => {
  assert.equal(rutaInterna("/acme/panel/kpi?x=1#a"), "/acme/panel/kpi?x=1#a");
  for (const mala of ["//evil.example", "/\\evil.example/login", "/\t/evil.example", "https://evil.example", "evil", "", null, 7]) assert.equal(rutaInterna(mala), null, String(mala));
});

test("un correo no convierte en enlace ni en marcado lo que alguien escribió en un formulario", () => {
  const m = correoSolicitudNueva({ name: "Ana Ruiz", company: 'Acme https://evil.example/login"style="position:fixed', industry: "Otra", country: "Colombia", email: "ana@acme.test", source: "Google", scope: ["test"] }, "https://sitio.test/panel/admin/codigos");
  assert.ok(!m.html.includes('href="https://evil.example'), "la dirección escrita por la persona no es un enlace");
  assert.ok(!m.html.includes('"style="position:fixed'), "las comillas van escapadas");
  assert.ok(m.html.includes("&quot;style=&quot;position:fixed"));
  assert.ok(m.html.includes('href="https://sitio.test/panel/admin/codigos"'), "el enlace que arma el servidor sí es un enlace");
  // un valor con saltos de línea no abre un botón ni un párrafo propio
  const t = { subject: "Hola {{nombre}}", title: "T", body: "Hola {{nombre}},\n\n[[Entrar]]\n\nEntra a {{enlace}} o escribe a https://ayuda.test" };
  const r = renderPlantilla(t, { nombre: "x\n\n[[Falso]]\n\n<b>y</b>", enlace: "https://sitio.test/a?b=1&c=2" });
  assert.equal((r.html.match(/border-radius:10px;font-weight:700/g) ?? []).length, 1, "un solo botón: el de la plantilla");
  assert.ok(r.html.includes("&lt;b&gt;y&lt;/b&gt;") && !r.html.includes("<b>y</b>"));
  assert.ok(r.html.includes('href="https://sitio.test/a?b=1&amp;c=2"') && r.html.includes('href="https://ayuda.test"'));
  assert.ok(!r.subject.includes("\n"));
});

test("una celda de texto que empieza como fórmula se exporta como texto", () => {
  assert.equal(csvCell('=HYPERLINK("https://evil.example","x")'), `"'=HYPERLINK(""https://evil.example"",""x"")"`);
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("+57 300"), "'+57 300");
  assert.equal(csvCell(-5), "-5", "los números negativos no cambian");
  assert.equal(csvCell("Plan 2027"), "Plan 2027");
});

test("la sesión guarda cuándo se abrió y si entró por QR, y no acepta cookies alteradas", () => {
  const antes = Date.now();
  const s = decodeSession(encodeSession({ email: "a@b.test", name: "A B", role: "DIRECTIVO", qr: true }));
  assert.ok(s && s.qr === true && typeof s.iat === "number" && s.iat >= antes);
  const renovada = decodeSession(encodeSession({ ...s!, name: "Otro nombre" }));
  assert.equal(renovada?.iat, s!.iat, "renovar o cambiar de empresa conserva el momento de apertura");
  const [cuerpo, firma] = encodeSession({ email: "a@b.test", name: "A B", role: "DIRECTIVO" }).split(".");
  const falso = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(cuerpo, "base64url").toString()), role: "ADMIN" })).toString("base64url");
  assert.equal(decodeSession(`${falso}.${firma}`), null);
});

test("la sesión se revalida: cuenta retirada, rol cambiado, administrador falso y contraseña cambiada", async () => {
  const c = await empresa();
  const correo = `dir${serie}@cliente.test`;
  en(c.slug, () => { assert.ok(createUser({ ...admin, company: c }, { email: correo, name: "Directora Uno", role: "DIRECTIVO" }).ok); });
  const sesion: SessionUser = { email: correo, name: "Directora Uno", role: "DIRECTIVO", company: c, iat: Date.now() };
  assert.ok((await resolverEmpresa(sesion, {})).ok);
  // la cookie dice un rol que la cuenta no tiene: manda el de la cuenta
  const inflada = await resolverEmpresa({ ...sesion, role: "CONSULTOR" }, {});
  assert.ok(inflada.ok && inflada.actor.role === "DIRECTIVO");
  // el rol cambia: la sesión abierta opera con el nuevo, sin volver a entrar
  await en(c.slug, () => { assert.ok(updateUser({ ...admin, company: c }, correo, { role: "LIDER" }).ok); });
  const tras = await resolverEmpresa(sesion, {});
  assert.ok(tras.ok && tras.actor.role === "LIDER");
  // una cookie que dice ADMIN para una cuenta que no administra la plataforma no vale
  const impostor = await sesionVigente({ ...sesion, role: "ADMIN" });
  assert.ok(!impostor.ok);
  // cambia la contraseña: las sesiones abiertas antes se cierran; las de después valen
  const vieja = { ...sesion, iat: Date.now() - 60_000 };
  await cerrarSesionesDe(correo);
  const cerrada = await resolverEmpresa(vieja, {});
  assert.ok(!cerrada.ok && cerrada.status === 401 && /contraseña/.test(cerrada.error));
  assert.ok((await resolverEmpresa({ ...sesion, iat: Date.now() + 10 }, {})).ok);
  // la cuenta se retira de la empresa: la sesión deja de valer
  await en(c.slug, () => { assert.ok(removeUser({ ...admin, company: c }, correo).ok); });
  const fuera = await resolverEmpresa({ ...sesion, iat: Date.now() + 10 }, {});
  assert.ok(!fuera.ok && fuera.status === 401);
});

test("el QR no abre cuentas con más alcance que un asistente, y editar como líder exige tribu", async () => {
  const c = await empresa();
  const actor = { ...admin, company: c };
  const otra = { slug: `${c.slug}-b`, name: "Otra", shortName: "Otra" };
  assert.ok((await createCompany(admin, { name: otra.name, slug: otra.slug, template: "vacia" })).ok);
  en(otra.slug, () => { assert.ok(createUser({ ...admin, company: otra }, { email: `visitante${serie}@otra.test`, name: "Visitante Otra", role: "DIRECTIVO" }).ok); });
  await en(c.slug, async () => {
    const links = accessLinks(actor); assert.ok(links.ok); if (!links.ok) return;
    const token = links.access[0].token;
    assert.ok(createUser(actor, { email: `advisor${serie}@consultora.test`, name: "Advisor Real", role: "CONSULTOR" }).ok);
    assert.ok(createUser(actor, { email: `gerencia${serie}@cliente.test`, name: "Gerencia Real", role: "LIDER" }).ok);
    assert.ok(createUser(actor, { email: `miembro${serie}@cliente.test`, name: "Miembro Real", role: "DIRECTIVO" }).ok);
    assert.ok((await addMembership(actor, `visitante${serie}@otra.test`, { role: "DIRECTIVO" })).ok);
    const entrar = (email: string, extra: Record<string, unknown> = {}) => accessUser(token, { name: "Alguien Que Entra", email, consent: true, entryRole: "directivo", ...extra });
    for (const email of [`advisor${serie}@consultora.test`, `gerencia${serie}@cliente.test`, `visitante${serie}@otra.test`]) {
      const r = await entrar(email);
      assert.ok(!r.ok && r.status === 403 && /contraseña/.test(r.error), email);
    }
    // una cuenta de asistente sin contraseña sí entra, con su propio rol
    const ok = await entrar(`miembro${serie}@cliente.test`);
    assert.ok(ok.ok && ok.user.role === "DIRECTIVO" && ok.user.qr === true);
    // pide editar como líder sin tener tribu: conserva su rol
    const sinTribu = await entrar(`miembro${serie}@cliente.test`, { entryRole: "lider" });
    assert.ok(sinTribu.ok && sinTribu.user.role === "DIRECTIVO");
    // la contraseña de una cuenta de otra empresa no se fija desde esta
    const pass = await setUserPassword(actor, `visitante${serie}@otra.test`, "una-clave-larga-123");
    assert.ok(!pass.ok && pass.status === 403 && /otra empresa/.test(pass.error));
  });
});

test("la vista que recibe cada usuario no lleva tokens de acceso ni el itinerario del organizador", async () => {
  const c = await empresa();
  await en(c.slug, () => {
    assert.ok(accessLinks({ ...admin, company: c }).ok);
    assert.ok((catalog().company as { access?: unknown }).access, "el servidor sí conserva el token");
    const ficha = tenantView().catalog.company as Record<string, unknown>;
    for (const k of ["access", "itinerary", "dbId"]) assert.ok(!(k in ficha), k);
    assert.equal(ficha.slug, c.slug);
  });
  assert.deepEqual(fichaPublica({ slug: "x", access: { a: 1 }, itinerary: { token: "t" }, dbId: "d", name: "X" }), { slug: "x", name: "X" });
});

test("tras varios intentos fallidos la cuenta se bloquea y un ingreso correcto la limpia", async () => {
  resetStore(); reiniciarFrenos();
  const correo = "bloqueo@cliente.test";
  assert.equal(await bloqueoLogin(correo), 0);
  for (let i = 0; i < LOGIN_MAX - 1; i++) await registrarFalloLogin(correo);
  assert.equal(await bloqueoLogin(correo), 0, "antes del tope no hay bloqueo");
  await registrarFalloLogin(correo);
  assert.ok((await bloqueoLogin(correo)) > 0);
  await limpiarFallosLogin(correo);
  assert.equal(await bloqueoLogin(correo), 0);
  // el freno en memoria corta por clave y se puede liberar
  for (let i = 0; i < 3; i++) assert.equal(frenado("k", 3, 60_000), false);
  assert.equal(frenado("k", 3, 60_000), true);
  liberar("k"); assert.equal(frenado("k", 3, 60_000), false);
  assert.equal(ipDe(new Request("http://x.test", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } })), "203.0.113.9");
});

test("en producción los enlaces de los correos salen del dominio propio aunque la petición diga otro", () => {
  const env = process.env as Record<string, string | undefined>, previo = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    const de = (host: string) => originOf(new Request("http://interno/api", { headers: { "x-forwarded-host": host, "x-forwarded-proto": "http" } }));
    assert.equal(de("evil.example"), "https://gestionestrategica.io");
    assert.equal(de("gestionestrategica.io"), "https://gestionestrategica.io");
    assert.equal(de("www.gestionestrategica.io"), "https://www.gestionestrategica.io");
  } finally { env.NODE_ENV = previo; }
});
