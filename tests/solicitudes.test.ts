import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, createCompany, createUser, crearSolicitud, listarSolicitudes, decidirSolicitud, listarCodigos, consultarCodigo } from "../src/server/store";
import { validarSolicitud, correoSolicitudNueva, INDUSTRIAS, PAISES, FUENTES, DESTINO_SOLICITUDES } from "../src/lib/solicitudes";
import { formatoCodigo } from "../src/lib/codigos";
import { splitTenantPath } from "../src/lib/tenant-url";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin Plataforma", role: "ADMIN" };
const advisor: SessionUser = { email: "laura@advisor.test", name: "Laura Advisor", role: "CONSULTOR" };
const otro: SessionUser = { email: "pedro@advisor.test", name: "Pedro Advisor", role: "CONSULTOR" };
const BASE = { name: "Ana Gómez", company: "Textiles del Valle", industry: "Manufactura e industria", country: "Colombia", email: "Ana@Textiles.test", phone: "+57 300 123 4567", source: "Referido", scope: ["madurez"], consent: true };

test("la solicitud exige los datos obligatorios, acepta el teléfono vacío y solo admite opciones de las listas", () => {
  const ok = validarSolicitud(BASE);
  assert.ok(ok.ok); if (!ok.ok) return;
  assert.deepEqual(ok.datos, { name: "Ana Gómez", company: "Textiles del Valle", industry: "Manufactura e industria", country: "Colombia", email: "ana@textiles.test", phone: "+57 300 123 4567", source: "Referido", scope: ["madurez"] });
  const sinTel = validarSolicitud({ ...BASE, phone: "  " });
  assert.ok(sinTel.ok && !("phone" in sinTel.datos), "el teléfono es opcional");
  const campo = (extra: Record<string, unknown>) => { const r = validarSolicitud({ ...BASE, ...extra }); return r.ok ? null : r.campo; };
  assert.equal(campo({ name: "Ana" }), "name");
  assert.equal(campo({ company: "" }), "company");
  assert.equal(campo({ industry: "Minería de datos" }), "industry");
  assert.equal(campo({ country: "Narnia" }), "country");
  assert.equal(campo({ email: "ana@" }), "email");
  assert.equal(campo({ phone: "llámame" }), "phone");
  assert.equal(campo({ source: "Un amigo" }), "source");
  assert.equal(campo({ scope: [] }), "scope");
  assert.equal(campo({ consent: false }), "consent");
  assert.deepEqual([...FUENTES], ["Google", "Redes sociales", "Evento", "Referido", "Otro"]);
  assert.ok(INDUSTRIAS.includes("Otra") && PAISES[0] === "Colombia" && PAISES.includes("Otro país"));
  assert.equal(DESTINO_SOLICITUDES, "proyectos@algoritmot.com");
  const m = correoSolicitudNueva(ok.datos, "https://sitio.test/panel/admin/codigos");
  assert.equal(m.subject, "Solicitud de código: Textiles del Valle");
  for (const t of ["Ana Gómez", "ana@textiles.test", "+57 300 123 4567", "Manufactura e industria", "Colombia", "Referido", "el diagnóstico de madurez en transformación digital", "https://sitio.test/panel/admin/codigos"]) assert.ok(m.text.includes(t), t);
  assert.ok(correoSolicitudNueva({ ...ok.datos, phone: undefined }, "x").text.includes("No lo indicó"));
  assert.deepEqual(splitTenantPath("/solicitar-codigo"), { tenant: null, path: "/solicitar-codigo" });
});

test("la solicitud queda pendiente, no se duplica y la ven el admin y los advisors", async () => {
  resetStore();
  const a = await crearSolicitud(BASE);
  assert.ok(a.ok && !a.repetida); if (!a.ok) return;
  assert.equal(a.solicitud.status, "pendiente");
  assert.equal(a.solicitud.email, "ana@textiles.test");
  const b = await crearSolicitud({ ...BASE, company: "Otra razón social" });
  assert.ok(b.ok && b.repetida && b.solicitud.id === a.solicitud.id, "una pendiente por correo");
  const mala = await crearSolicitud({ ...BASE, email: "x" });
  assert.ok(!mala.ok && mala.status === 422 && mala.campo === "email");
  assert.equal((await listarSolicitudes(admin)).length, 1);
  assert.equal((await listarSolicitudes(advisor)).length, 1);
  assert.deepEqual(await listarSolicitudes({ email: "d@cliente.test", name: "Directivo", role: "DIRECTIVO" }), []);
  const no = await decidirSolicitud({ email: "d@cliente.test", name: "Directivo", role: "DIRECTIVO" }, a.solicitud.id, "aprobar");
  assert.ok(!no.ok && no.status === 403);
});

test("al aprobar se genera el código a nombre de quien aprueba; al rechazar queda cerrada", async () => {
  resetStore();
  const a = await crearSolicitud(BASE), b = await crearSolicitud({ ...BASE, name: "Luis Pérez", email: "luis@otra.test", company: "Otra Empresa", scope: ["test"] });
  assert.ok(a.ok && b.ok); if (!a.ok || !b.ok) return;
  // el advisor aprueba y amplía el alcance a los dos diagnósticos
  const ap = await decidirSolicitud(advisor, a.solicitud.id, "aprobar", { scope: ["madurez", "test"] });
  assert.ok(ap.ok && ap.codigo); if (!ap.ok || !ap.codigo) return;
  assert.equal(ap.solicitud.status, "aprobada");
  assert.equal(ap.solicitud.decidedByName, "Laura Advisor");
  assert.equal(ap.solicitud.codeId, ap.codigo.id);
  assert.deepEqual(ap.codigo.scope, ["madurez", "test"]);
  assert.equal(ap.codigo.email, "ana@textiles.test");
  assert.equal(ap.codigo.organization, "Textiles del Valle");
  assert.equal(ap.codigo.createdBy, "laura@advisor.test");
  const consulta = await consultarCodigo(formatoCodigo(ap.codigo.code));
  assert.ok(consulta.ok && consulta.estado === "nuevo", "el código generado sirve");
  assert.equal((await listarCodigos(advisor)).length, 1);
  const otraVez = await decidirSolicitud(admin, a.solicitud.id, "rechazar");
  assert.ok(!otraVez.ok && otraVez.status === 409 && /ya fue aprobada por Laura Advisor/.test(otraVez.error));
  // el admin rechaza la otra, con una nota interna
  const re = await decidirSolicitud(admin, b.solicitud.id, "rechazar", { note: "  Solicitud   duplicada " });
  assert.ok(re.ok && !re.codigo); if (!re.ok) return;
  assert.equal(re.solicitud.status, "rechazada");
  assert.equal(re.solicitud.note, "Solicitud duplicada");
  // decididas: el admin ve todas; cada advisor, las suyas
  assert.equal((await listarSolicitudes(admin)).length, 2);
  assert.deepEqual((await listarSolicitudes(advisor)).map((s) => s.id), [a.solicitud.id]);
  assert.deepEqual(await listarSolicitudes(otro), []);
  // tras una rechazada, la persona puede volver a solicitar
  const nueva = await crearSolicitud({ ...BASE, name: "Luis Pérez", email: "luis@otra.test", scope: ["test"] });
  assert.ok(nueva.ok && !nueva.repetida);
  assert.equal((await decidirSolicitud(admin, "sol_no_existe", "aprobar") as { status?: number }).status, 404);
});

test("si el correo ya tiene cuenta, la solicitud no se puede aprobar y sigue pendiente", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Cliente Uno", template: "vacia" })).ok);
  runWithTenant("cliente-uno", () => { assert.ok(createUser(admin, { email: "ya@cliente.test", name: "Persona Existente", role: "DIRECTIVO" }).ok); });
  const s = await crearSolicitud({ ...BASE, email: "ya@cliente.test" });
  assert.ok(s.ok, "el formulario no revela si el correo ya tiene cuenta"); if (!s.ok) return;
  const ap = await decidirSolicitud(admin, s.solicitud.id, "aprobar");
  assert.ok(!ap.ok && ap.status === 409 && /ya tiene una cuenta en Cliente Uno/.test(ap.error));
  assert.equal((await listarSolicitudes(admin))[0].status, "pendiente");
});
