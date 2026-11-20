import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant, DEFAULT_TENANT } from "../src/server/tenant";
import { resetStore, createUser, getUsers, setDatosAcuerdos, setEstadoAcuerdo, setArchivoAcuerdo, acuerdosOf, aceptacionesEmpresa, consentVigente, consentPending, acceptConsent } from "../src/server/store";
import { DOCUMENTOS_LEGALES, VERSION_ACEPTACION, llenar, llenarDoc, docLegal, rutaDoc, parseDatosFirma, parseEstado, readAcuerdos, datosFirmaDe, SUBENCARGADOS } from "../src/lib/legal";
import { CONSENT_VERSION, consentText, compromisoPuntos } from "../src/lib/consentimiento";
import { cifrar, descifrar, camposParaGuardar, camposLeidos, secretosSinCifrar, estaCifrado } from "../src/server/secretos";
import { docLegalDocx } from "../src/server/legal-docx";
import { RESERVED } from "../src/lib/tenant-url";
import type { SessionUser } from "../src/lib/session";

const advisor: SessionUser = { email: "advisor@algoritmot.com", name: "Advisor", role: "CONSULTOR", company: { slug: DEFAULT_TENANT, name: "Andina" } } as SessionUser;
const directivo: SessionUser = { email: "junta@andina.example", name: "Junta", role: "DIRECTIVO", company: { slug: DEFAULT_TENANT, name: "Andina" } } as SessionUser;

test("documentos legales: versión, secciones únicas, sin la marca anterior y con los proveedores publicados", () => {
  assert.equal(DOCUMENTOS_LEGALES.length, 5);
  for (const d of DOCUMENTOS_LEGALES) {
    assert.match(d.version, /^\d{4}-\d{2}-\d{2}$/, d.id);
    const ids = d.secciones.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, `${d.id}: secciones repetidas`);
    const texto = JSON.stringify(llenarDoc(d));
    assert.ok(!/\{\{[a-z_]+\}\}/.test(texto), `${d.id}: quedó un campo sin llenar`);
    assert.ok(!/4Shine/i.test(JSON.stringify(d)), `${d.id}: no nombra a 4Shine (la plataforma es de Algoritmo T)`);
    assert.ok(docLegal(d.id) === d && rutaDoc(d.id).startsWith("/"));
  }
  const politica = JSON.stringify(docLegal("tratamiento"));
  for (const s of SUBENCARGADOS) assert.ok(politica.includes(s.nombre), `la política nombra a ${s.nombre}`);
  assert.ok(/901\.449\.696-2/.test(politica) && /plataforma@algoritmot\.com/.test(politica));
});

test("plantillas: los campos se llenan con los datos de la empresa y lo que falta queda para completar", () => {
  assert.equal(llenar("Entre {{cliente}} y NIT {{nit_cliente}}", { cliente: "Andina S.A.S." }), "Entre Andina S.A.S. y NIT __________________");
  const nda = llenarDoc(docLegal("confidencialidad")!, { cliente: "Andina S.A.S.", representante_cliente: "Laura Restrepo" });
  assert.ok(nda.titulo.includes("Andina S.A.S."));
  assert.ok(nda.firmas?.[0].campos.some((c) => c.includes("Laura Restrepo")));
  const d = datosFirmaDe({ name: "Andina Suministros", city: "Medellín" }, { datos: { nit_cliente: "900.123.456-7" } });
  assert.equal(d.cliente, "Andina Suministros", "sin razón social registrada, el nombre de la empresa");
  assert.equal(d.ciudad_cliente, "Medellín");
  assert.equal(d.nit_cliente, "900.123.456-7");
});

test("la aceptación del primer ingreso toma la versión de los documentos y nombra a la empresa responsable", () => {
  assert.equal(CONSENT_VERSION, VERSION_ACEPTACION);
  assert.ok(consentText("Andina").some((p) => p.includes("Algoritmo T S.A.S.") && p.includes("encargado")));
  assert.ok(compromisoPuntos("Andina")[0].includes("Andina"));
  assert.ok(consentVigente({ consentAt: "2026-11-20T10:00:00Z", consentVersion: CONSENT_VERSION }));
  assert.ok(!consentVigente({ consentAt: "2026-10-01T10:00:00Z", consentVersion: "2026-11" }), "la versión anterior obliga a aceptar de nuevo");
  assert.ok(!consentVigente({ consentAt: null, consentVersion: CONSENT_VERSION }));
});

test("aceptación: una versión anterior se pide de nuevo y la nueva queda en el registro de la empresa", async () => {
  await runWithTenant(DEFAULT_TENANT, async () => {
    resetStore();
    const r = createUser(advisor, { email: "persona@andina.example", name: "Persona Andina", role: "DIRECTIVO" });
    assert.ok(r.ok);
    const u = getUsers().find((x) => x.email === "persona@andina.example")!;
    u.consentAt = "2026-10-01T10:00:00Z"; u.consentVersion = "2026-11";
    const sesion = { email: u.email, name: u.name, role: "DIRECTIVO", company: { slug: DEFAULT_TENANT, name: "Andina" } } as SessionUser;
    assert.equal(consentPending(sesion), true);
    const a = await acceptConsent(sesion);
    assert.ok(a.ok);
    assert.equal(consentPending(sesion), false);
    const reg = aceptacionesEmpresa(advisor);
    assert.ok(reg.ok && reg.filas.find((f) => f.email === u.email)?.vigente === true);
    assert.ok(!aceptacionesEmpresa(directivo).ok, "el registro lo consulta el equipo consultor");
  });
});

test("acuerdos: datos de firma, estados y copia firmada; solo el equipo consultor", () => {
  runWithTenant(DEFAULT_TENANT, () => {
    resetStore();
    assert.ok(!parseDatosFirma({ correo_cliente: "no-es-correo" }).ok);
    assert.ok(!parseEstado({ estado: "firmado" }).ok, "firmado exige fecha y firmante");
    assert.ok(!parseEstado({ estado: "otro" }).ok);
    assert.ok(!setDatosAcuerdos(directivo, { cliente: "X" }).ok);
    assert.ok(setDatosAcuerdos(advisor, { cliente: "Andina Suministros S.A.S.", nit_cliente: "900.123.456-7", correo_cliente: "juridica@andina.example" }).ok);
    assert.ok(setEstadoAcuerdo(advisor, "confidencialidad", { estado: "enviado" }, "2026-11-20").ok);
    assert.ok(!setEstadoAcuerdo(advisor, "otro", { estado: "enviado" }, "2026-11-20").ok);
    const f = setEstadoAcuerdo(advisor, "confidencialidad", { estado: "firmado", fecha: "2026-11-19", firmante: "Laura Restrepo" }, "2026-11-20");
    assert.ok(f.ok && f.acuerdos.docs?.confidencialidad?.firmante === "Laura Restrepo");
    assert.ok(setArchivoAcuerdo(advisor, "confidencialidad", { key: "andina/confidencialidad.pdf", name: "nda.pdf", size: 1000 }, "2026-11-20").ok);
    const a = acuerdosOf()!;
    assert.equal(a.docs?.confidencialidad?.estado, "firmado", "cargar la copia no cambia el estado");
    assert.equal(a.docs?.confidencialidad?.archivo?.name, "nda.pdf");
    assert.equal(a.datos?.nit_cliente, "900.123.456-7");
    assert.deepEqual(readAcuerdos(JSON.parse(JSON.stringify(a))), a, "lo guardado se vuelve a leer igual");
    assert.equal(readAcuerdos({ docs: { confidencialidad: { estado: "raro" } } }), undefined);
  });
});

test("credenciales de integración: se cifran en la base y se leen en claro", () => {
  const c = cifrar("sk-secreto-123");
  assert.ok(estaCifrado(c) && !c.includes("secreto"));
  assert.notEqual(cifrar("sk-secreto-123"), c, "cada cifrado usa un vector distinto");
  assert.equal(descifrar(c), "sk-secreto-123");
  assert.equal(descifrar("enc:v1:dañado"), null);
  assert.equal(descifrar("texto-plano"), "texto-plano", "lo guardado antes del cifrado se lee tal cual");
  const g = camposParaGuardar({ apiKey: "sk-1", model: "gpt-x", accessKeyId: "AKIA1", secretAccessKey: "s3cr3t", bucket: "b" });
  assert.ok(estaCifrado(g.apiKey) && estaCifrado(g.accessKeyId) && estaCifrado(g.secretAccessKey));
  assert.equal(g.model, "gpt-x"); assert.equal(g.bucket, "b");
  assert.deepEqual(camposLeidos(g), { apiKey: "sk-1", model: "gpt-x", accessKeyId: "AKIA1", secretAccessKey: "s3cr3t", bucket: "b" });
  assert.equal(secretosSinCifrar({ apiKey: "sk-plano" }), true);
  assert.equal(secretosSinCifrar(g), false);
});

test("Word de los documentos y rutas públicas reservadas", async () => {
  const buf = await docLegalDocx(docLegal("transmision")!, { cliente: "Andina Suministros S.A.S." });
  assert.equal(buf.subarray(0, 2).toString("latin1"), "PK", "es un archivo .docx (zip)");
  for (const r of ["legal", "privacidad", "seguridad"]) assert.ok(RESERVED.has(r), `«${r}» no puede ser el identificador de una empresa`);
});
