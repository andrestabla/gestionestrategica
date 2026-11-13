// Una petición a la API nunca opera sobre una empresa distinta de la que muestra la página que la originó.
// La sesión (cookie) es una sola para todas las pestañas: con una pestaña en la empresa A y la sesión activa en la B
// (otra pestaña la cambió), las lecturas y escrituras de la pestaña de A deben ir a A —si la cuenta tiene acceso— o
// rechazarse sin tocar nada.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, createCompany, updateCompany, createUser, removeUser, addMembership, getUsers, setTwoFactor } from "../src/server/store";
import { resolverEmpresa } from "../src/server/empresa-peticion";
import { pageTenant, PAGE_TENANT_HEADER } from "../src/lib/tenant-url";
import { initConEmpresa } from "../src/lib/fetch-empresa";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };
type Empresa = { slug: string; name: string; shortName: string };
type Caso = { A: Empresa; B: Empresa; advisor: string; soloB: string };
let serie = 0;

/** Dos empresas; un consultor con A como principal (CONSULTOR) y membresía en B (DIRECTIVO); una cuenta solo de B.
    resetStore no borra las empresas ya creadas ni sus cuentas: cada prueba usa las suyas. */
async function dosEmpresas(): Promise<Caso> {
  resetStore();
  const n = ++serie;
  const A = { slug: `empresa-a${n}`, name: "Empresa A", shortName: "A" }, B = { slug: `empresa-b${n}`, name: "Empresa B", shortName: "B" };
  const advisor = `advisor${n}@consultora.test`, soloB = `solo-b${n}@empresa-b.test`;
  for (const e of [A, B]) { const r = await createCompany(admin, { name: e.name, slug: e.slug, template: "vacia", mode: "acompanamiento" }); assert.ok(r.ok, r.ok ? "" : r.error); }
  runWithTenant(A.slug, () => { assert.ok(createUser({ ...admin, company: A }, { email: advisor, name: "Advisor", role: "CONSULTOR" }).ok); });
  await runWithTenant(B.slug, async () => {
    assert.ok((await addMembership({ ...admin, company: B }, advisor, { role: "DIRECTIVO" })).ok);
    assert.ok(createUser({ ...admin, company: B }, { email: soloB, name: "Solo B", role: "DIRECTIVO" }).ok);
  });
  return { A, B, advisor, soloB };
}
const usuariosDe = (slug: string) => runWithTenant(slug, () => getUsers().map((u) => u.email));

test("administrador: la página es de A y la sesión está en B; la petición opera sobre A", async () => {
  const { A, B } = await dosEmpresas();
  const sesionEnB: SessionUser = { ...admin, company: B };
  const r = await resolverEmpresa(sesionEnB, { pagina: A.slug });
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (!r.ok) return;
  assert.equal(r.slug, A.slug);
  assert.equal(r.actor.role, "ADMIN");
  assert.equal(r.actor.company?.slug, A.slug, "quien actúa lleva la empresa de la página, no la de la cookie");
  assert.equal(sesionEnB.company?.slug, B.slug, "la sesión no se toca: la otra pestaña sigue en B");
  // la escritura que lanzó la página de A queda en A y no en B (el caso real: demo-siegfried → siegfried)
  runWithTenant(r.slug, () => { assert.ok(createUser(r.actor, { email: "nueva@empresa-a.test", name: "Nueva", role: "LIDER" }).ok); });
  assert.ok(usuariosDe(A.slug).includes("nueva@empresa-a.test"));
  assert.ok(!usuariosDe(B.slug).includes("nueva@empresa-a.test"));
  // sin empresa activa en la sesión (recién entrado) también manda la página
  const sin = await resolverEmpresa(admin, { pagina: A.slug });
  assert.ok(sin.ok && sin.slug === A.slug && sin.actor.company?.slug === A.slug);
});

test("consultor con membresía en ambas: opera sobre la empresa de la página con el rol que tiene allí", async () => {
  const { A, B, advisor } = await dosEmpresas();
  // entró a B por su membresía: la sesión lleva el rol de B
  const sesionEnB: SessionUser = { email: advisor, name: "Advisor", role: "DIRECTIVO", company: B, empresas: [{ slug: A.slug, shortName: "A", role: "CONSULTOR" }, { slug: B.slug, shortName: "B", role: "DIRECTIVO" }] };
  const enA = await resolverEmpresa(sesionEnB, { pagina: A.slug });
  assert.ok(enA.ok, enA.ok ? "" : enA.error);
  if (!enA.ok) return;
  assert.equal(enA.slug, A.slug);
  assert.equal(enA.actor.role, "CONSULTOR", "el rol es el de la cuenta en A, no el de la sesión (DIRECTIVO en B)");
  assert.equal(enA.actor.company?.slug, A.slug);
  assert.equal(enA.actor.company?.mode, "acompanamiento");
  // y al revés: sesión en A (principal), página de B → rol de la membresía
  const sesionEnA: SessionUser = { ...sesionEnB, role: "CONSULTOR", company: A };
  const enB = await resolverEmpresa(sesionEnA, { pagina: B.slug });
  assert.ok(enB.ok && enB.slug === B.slug && enB.actor.role === "DIRECTIVO" && enB.actor.company?.slug === B.slug);
  // la página coincide con la sesión: nada cambia
  const igual = await resolverEmpresa(sesionEnB, { pagina: B.slug });
  assert.ok(igual.ok && igual.slug === B.slug && igual.actor.role === "DIRECTIVO");
  // una petición que no dice de qué página viene (p. ej. desde /empresas) usa la empresa activa de la sesión
  const sinPagina = await resolverEmpresa(sesionEnB, {});
  assert.ok(sinPagina.ok && sinPagina.slug === B.slug);
  // retirada la membresía de B, la página de B que quedó abierta deja de operar
  runWithTenant(B.slug, () => { assert.ok(removeUser({ ...admin, company: B }, advisor).ok); });
  const retirada = await resolverEmpresa(sesionEnA, { pagina: B.slug });
  assert.ok(!retirada.ok && retirada.status === 409);
});

test("cuenta sin acceso a la empresa de la página: 409, sin operar sobre ninguna de las dos", async () => {
  const { A, B, soloB } = await dosEmpresas();
  const sesionSoloB: SessionUser = { email: soloB, name: "Solo B", role: "DIRECTIVO", company: B };
  const r = await resolverEmpresa(sesionSoloB, { pagina: A.slug });
  assert.ok(!r.ok);
  if (r.ok) return;
  assert.equal(r.status, 409);
  assert.equal(r.recargar, true);
  assert.match(r.error, /otra empresa/);
  assert.match(r.error, /«Empresa B»/, "dice en qué empresa está ahora la sesión");
  assert.ok(!("slug" in r), "no se resuelve ninguna empresa: ni la de la página ni, en silencio, la de la sesión");
  // por el prefijo de la URL (/empresa-a/api/…) se conserva el rechazo de siempre
  const porUrl = await resolverEmpresa(sesionSoloB, { url: A.slug });
  assert.ok(!porUrl.ok && porUrl.status === 403);
  // en su propia empresa sigue operando
  const propia = await resolverEmpresa(sesionSoloB, { pagina: B.slug });
  assert.ok(propia.ok && propia.slug === B.slug);
  // una página de una empresa que ya no existe no cae en la de la sesión
  const fantasma = await resolverEmpresa({ ...admin, company: B }, { pagina: "no-existe" });
  assert.ok(!fantasma.ok && fantasma.status === 409 && /ya no existe/.test(fantasma.error));
});

test("el acceso en dos pasos y la desactivación se exigen sobre la empresa finalmente resuelta", async () => {
  const { A, B, advisor } = await dosEmpresas();
  runWithTenant(A.slug, () => assert.deepEqual(setTwoFactor(admin, true), { ok: true, twoFactor: true }));
  // sesión en B (que no lo exige) sin haber pasado por el código; la página es de A (que sí)
  const sinCodigo = await resolverEmpresa({ ...admin, company: B }, { pagina: A.slug });
  assert.ok(!sinCodigo.ok && sinCodigo.status === 401 && sinCodigo.verificar === `/${A.slug}/login?verificar=1`);
  const advisorSinCodigo = await resolverEmpresa({ email: advisor, name: "Advisor", role: "DIRECTIVO", company: B }, { pagina: A.slug });
  assert.ok(!advisorSinCodigo.ok && advisorSinCodigo.status === 401);
  const conCodigo = await resolverEmpresa({ ...admin, mfa: true, company: B }, { pagina: A.slug });
  assert.ok(conCodigo.ok && conCodigo.slug === A.slug);
  // al revés: la sesión está en A (exige código, sesión verificada o no) y la página es de B, que no lo exige
  const haciaB = await resolverEmpresa({ ...admin, company: A }, { pagina: B.slug });
  assert.ok(haciaB.ok && haciaB.slug === B.slug);
  // empresa de la página desactivada: el admin sigue entrando, el resto no
  assert.ok((await updateCompany(admin, A.slug, { active: false })).ok);
  const desactivada = await resolverEmpresa({ email: advisor, name: "Advisor", role: "DIRECTIVO", mfa: true, company: B }, { pagina: A.slug });
  assert.ok(!desactivada.ok && desactivada.status === 403 && /desactivada/.test(desactivada.error));
  const adm = await resolverEmpresa({ ...admin, mfa: true, company: B }, { pagina: A.slug });
  assert.ok(adm.ok && adm.slug === A.slug);
});

test("la empresa de la página sale de la cabecera del cliente o, si falta, del Referer del mismo sitio", () => {
  const hosts = ["app.4shine.test"];
  assert.equal(pageTenant({ declarada: "empresa-a", referer: "https://app.4shine.test/empresa-b/panel", hosts }), "empresa-a", "manda lo que declara la página");
  assert.equal(pageTenant({ referer: "https://app.4shine.test/empresa-a/panel/kpi?x=1", hosts }), "empresa-a");
  assert.equal(pageTenant({ referer: "http://localhost:3000/demo-siegfried/panel/madurez", hosts: ["localhost:3000", null] }), "demo-siegfried");
  assert.equal(pageTenant({ referer: "https://app.4shine.test/empresa-a/panel", hosts: ["interno:3000", "app.4shine.test"] }), "empresa-a", "detrás de un proxy vale el host reenviado");
  assert.equal(pageTenant({ referer: "https://app.4shine.test/empresas", hosts }), null, "página sin empresa: decide la sesión");
  assert.equal(pageTenant({ referer: "https://app.4shine.test/panel/kpi", hosts }), null);
  assert.equal(pageTenant({ referer: "https://otro-sitio.test/empresa-a/panel", hosts }), null, "un Referer ajeno no cuenta");
  assert.equal(pageTenant({ referer: "https://app.4shine.test/empresa-a/panel", hosts: [] }), null);
  assert.equal(pageTenant({ referer: "no es una url", hosts }), null);
  assert.equal(pageTenant({ declarada: "Empresa A!", referer: "https://app.4shine.test/empresa-b/panel", hosts }), "empresa-b", "una cabecera inválida se ignora");
  assert.equal(pageTenant({ declarada: "api", hosts }), null, "un nombre reservado no es una empresa");
  assert.equal(pageTenant({}), null);
});

test("el navegador declara la empresa de la página solo en las llamadas a la API de empresa de este sitio", () => {
  const pagina = { origin: "https://app.4shine.test", pathname: "/empresa-a/panel/proyectos" };
  const cab = (init: RequestInit | undefined) => new Headers(init?.headers).get(PAGE_TENANT_HEADER);
  assert.equal(cab(initConEmpresa("/api/td/tasks", undefined, pagina)), "empresa-a");
  assert.equal(cab(initConEmpresa("/api/td/tasks/7/comments?x=1", { method: "POST" }, pagina)), "empresa-a");
  assert.equal(cab(initConEmpresa("https://app.4shine.test/api/td/kpi", undefined, pagina)), "empresa-a");
  assert.equal(cab(initConEmpresa(new URL("https://app.4shine.test/api/branding-asset"), { method: "POST" }, pagina)), "empresa-a");
  // conserva método, cuerpo y cabeceras de quien llama
  const init = initConEmpresa("/api/td/tasks", { method: "PATCH", body: "{}", headers: { "Content-Type": "application/json" } }, pagina)!;
  assert.equal(init.method, "PATCH"); assert.equal(init.body, "{}");
  assert.equal(new Headers(init.headers).get("content-type"), "application/json");
  // un Request como primer argumento: se parte de sus cabeceras
  const req = new Request("https://app.4shine.test/api/td/kpi", { headers: { "X-Propia": "1" } });
  const h = new Headers(initConEmpresa(req, undefined, pagina)?.headers);
  assert.equal(h.get(PAGE_TENANT_HEADER), "empresa-a"); assert.equal(h.get("x-propia"), "1");
  // quien ya la fija a mano no se pisa
  assert.equal(cab(initConEmpresa("/api/td/kpi", { headers: { [PAGE_TENANT_HEADER]: "empresa-b" } }, pagina)), "empresa-b");
  // no se añade a otras rutas, a otros sitios ni desde páginas sin empresa
  const intacto = { method: "POST" };
  assert.equal(initConEmpresa("/api/auth/logout", intacto, pagina), intacto);
  assert.equal(initConEmpresa("/api/tdx", intacto, pagina), intacto);
  assert.equal(initConEmpresa("https://api.openai.com/api/td/x", intacto, pagina), intacto);
  assert.equal(initConEmpresa("/api/td/empresas", intacto, { origin: pagina.origin, pathname: "/empresas" }), intacto);
  assert.equal(initConEmpresa("/api/td/kpi", undefined, { origin: pagina.origin, pathname: "/panel/kpi" }), undefined);
});
