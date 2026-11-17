import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant, DEFAULT_TENANT } from "../src/server/tenant";
import { resetStore, createUser, updateUser, getUsers, setTour, tourOf, catalog } from "../src/server/store";
import { parseTour, tourSugerido, tourAplica, claveTourVisto } from "../src/lib/tour";
import { bloqueaSoloLectura } from "../src/lib/solo-lectura";
import { crearDemoAndina } from "../src/server/demo-andina";
import type { SessionUser } from "../src/lib/session";

const advisor: SessionUser = { email: "advisor@algoritmot.com", name: "Advisor", role: "CONSULTOR", company: { slug: DEFAULT_TENANT, name: "Andina" } } as SessionUser;
const directivo: SessionUser = { email: "junta@andina.example", name: "Junta", role: "DIRECTIVO", company: { slug: DEFAULT_TENANT, name: "Andina" } } as SessionUser;

test("solo lectura: se bloquean las escrituras a la API, salvo marcar avisos como leídos", () => {
  assert.equal(bloqueaSoloLectura("GET", "/api/td/catalogo"), false);
  assert.equal(bloqueaSoloLectura("POST", "/api/td/initiatives"), true);
  assert.equal(bloqueaSoloLectura("PATCH", "/andina/api/td/kpi"), true);
  assert.equal(bloqueaSoloLectura("DELETE", "https://gestionestrategica.io/andina/api/td/users?email=x"), true);
  assert.equal(bloqueaSoloLectura("PUT", "/api/td/perfil/contrasena"), true, "tampoco cambia la contraseña de la cuenta compartida");
  assert.equal(bloqueaSoloLectura("POST", "/api/td/notifications"), false);
  assert.equal(bloqueaSoloLectura("POST", "/andina/api/td/notifications"), false);
  assert.equal(bloqueaSoloLectura("POST", "/api/td/perfil/consentimiento"), false, "acepta el tratamiento de datos del primer ingreso");
  assert.equal(bloqueaSoloLectura("POST", "/api/auth/logout"), false, "puede cerrar sesión");
});

test("solo lectura: la cuenta se crea y se cambia desde Usuarios; no aplica a la propia cuenta", () => {
  runWithTenant(DEFAULT_TENANT, () => {
    resetStore();
    const r = createUser(advisor, { email: "demo.cliente@ejemplo.com", name: "Cliente potencial", role: "LIDER", soloLectura: true });
    assert.ok(r.ok && r.user.soloLectura === true);
    assert.equal(getUsers().find((u) => u.email === "demo.cliente@ejemplo.com")?.soloLectura, true);
    const off = updateUser(advisor, "demo.cliente@ejemplo.com", { soloLectura: false });
    assert.ok(off.ok && !off.user.soloLectura);
    const propia = createUser(advisor, { email: "otra.persona@ejemplo.com", name: "Otra persona", role: "CONSULTOR" });
    assert.ok(propia.ok);
    const yo = updateUser({ ...advisor, email: "otra.persona@ejemplo.com" } as SessionUser, "otra.persona@ejemplo.com", { soloLectura: true });
    assert.ok(!yo.ok);
  });
});

test("tour: validación, tour sugerido por módulos y para quién se abre", () => {
  assert.ok(!parseTour({ pasos: [{ titulo: "x", texto: "corto", ruta: "/panel" }] }).ok);
  assert.ok(!parseTour({ pasos: [{ titulo: "Paso uno", texto: "Un texto suficientemente largo", ruta: "https://otro.sitio" }] }).ok, "la ruta es una pantalla del panel");
  const ok = parseTour({ activo: true, audiencia: "todos", pasos: [{ titulo: "Paso uno", texto: "Un texto suficientemente largo", ruta: "/panel/diagnostico", ancla: "main h1" }] });
  assert.ok(ok.ok && ok.tour?.activo && ok.tour.audiencia === "todos");
  const sug = tourSugerido({ name: "Andina", mode: "acompanamiento" });
  assert.ok(sug.pasos.some((p) => p.ruta === "/panel/estrategia/priorizacion") && sug.pasos.some((p) => p.ruta === "/panel/cascada"));
  assert.ok(!sug.pasos.some((p) => p.ruta === "/panel/kpi"), "solo los módulos del modo de la empresa");
  assert.equal(tourAplica(sug, { lectura: true }), true);
  assert.equal(tourAplica(sug, {}), false, "por defecto se abre solo a las cuentas de solo lectura");
  assert.equal(tourAplica({ ...sug, audiencia: "todos" }, {}), true);
  assert.equal(tourAplica({ ...sug, activo: false }, { lectura: true }), false);
  assert.notEqual(claveTourVisto("andina", "A@x.com", 1), claveTourVisto("andina", "a@x.com", 2));
});

test("tour: lo administra el equipo consultor de la empresa y cada guardado sube la versión", () => {
  runWithTenant(DEFAULT_TENANT, () => {
    resetStore();
    assert.ok(!setTour(directivo, tourSugerido({ name: "Andina", mode: "acompanamiento" })).ok);
    const a = setTour(advisor, tourSugerido({ name: "Andina", mode: "acompanamiento" }));
    assert.ok(a.ok && a.tour?.version === 1);
    const b = setTour(advisor, { ...a.tour, audiencia: "todos" });
    assert.ok(b.ok && b.tour?.version === 2 && tourOf()?.audiencia === "todos");
    assert.equal(catalog().company.tour?.version, 2);
    assert.ok(setTour(advisor, null).ok && !tourOf());
  });
});

test("la demo de Andina queda con su tour para las cuentas de solo lectura", async () => {
  runWithTenant(DEFAULT_TENANT, () => resetStore());
  const r = await crearDemoAndina({ email: "admin@plataforma.test", name: "Admin", role: "ADMIN" } as SessionUser, { recrear: true });
  assert.ok(r.ok && r.avisos.length === 0, r.ok ? r.avisos.join(" · ") : r.error);
  runWithTenant(DEFAULT_TENANT, () => {
    const t = tourOf();
    assert.ok(t?.activo && t.audiencia === "lectura" && t.pasos.length >= 12);
    assert.ok(t.pasos.every((p) => p.ruta.startsWith("/panel")));
  });
});
