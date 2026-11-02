// Perfil propio y purga total de una cuenta (node:test + tsx): datos básicos, consentimiento, eliminación
// con borrado de respuestas, evaluaciones y anonimización de decisiones y auditoría.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, createUser, resetStore, saveF1Response, saveTestResponse, evaluateInitiative, decideInitiative, removeUser, getUsers, getF1Responses, getTestResponses, getEvaluations, getDecision, getAudit, catalog, consentPending, acceptConsent, updateOwnProfile, ownProfile, deleteOwnAccount, ANON } from "../src/server/store";
import { PRACTICES } from "../src/data/mapa";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };

test("perfil: consentimiento pendiente en el primer ingreso, datos básicos y purga completa al eliminar la cuenta", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Perfil SA", template: "demo" })).ok);
  await runWithTenant("perfil-sa", async () => {
    const creado = createUser(admin, { email: "ana@perfil.co", name: "Ana Gómez", role: "LIDER" });
    assert.ok(creado.ok, (creado as { error?: string }).error);
    const ana: SessionUser = { email: "ana@perfil.co", name: "Ana Gómez", role: "LIDER", company: { slug: "perfil-sa", name: "Perfil SA", shortName: "P" } };
    // consentimiento
    assert.equal(consentPending(ana), true);
    assert.equal(consentPending(admin), false);
    assert.ok((await acceptConsent(ana)).ok);
    assert.equal(consentPending(ana), false);
    assert.ok(ownProfile(ana)?.consentAt);
    // datos básicos
    assert.equal(updateOwnProfile(ana, { name: "A" }).ok, false);
    assert.ok(updateOwnProfile(ana, { name: "Ana  María Gómez" }).ok);
    assert.equal(ownProfile(ana)?.name, "Ana María Gómez");
    // actividad de Ana: autoevaluación, test, evaluación y decisión
    assert.ok(saveF1Response(ana, { r: Object.fromEntries(PRACTICES.map((p) => [p.code, 4])) }).ok);
    assert.ok(saveTestResponse(ana, { r: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), 4])) }).ok);
    const ini = catalog().initiatives.find((i) => i.kpi)!;
    assert.ok(evaluateInitiative(ana, ini.id, { scores: { D: 3, E: 3, M: 3, L: 3 }, type: { contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "ESTRATEGICO", permanencia: "TACTICO" } }).ok);
    assert.ok(decideInitiative(ana, ini.id, { decision: "BACKLOG", rationale: "después" }).ok);
    // el admin de plataforma no se elimina desde el perfil; Ana sin contraseña confirma con la palabra
    assert.equal((await deleteOwnAccount(admin, { confirm: "ELIMINAR" })).ok, false);
    assert.equal((await deleteOwnAccount(ana, { confirm: "no" })).ok, false);
    assert.ok((await deleteOwnAccount(ana, { confirm: "eliminar" })).ok);
    assert.ok(!getUsers().some((u) => u.email === "ana@perfil.co"));
    assert.ok(!getF1Responses(admin).some((f) => f.email === "ana@perfil.co"));
    assert.ok(!getTestResponses(admin).some((t) => t.email === "ana@perfil.co"));
    assert.ok(!getEvaluations(ini.id).some((e) => e.by === "ana@perfil.co"));
    const d = getDecision(ini.id); assert.ok(d && d.by === ANON && d.name === ANON, "la decisión queda, anonimizada");
    assert.ok(!getAudit().some((a) => a.email === "ana@perfil.co"), "la auditoría no conserva su correo");
    assert.ok(getAudit().some((a) => /petición propia/.test(a.change)));
    // el admin también borra todo al eliminar un usuario
    assert.ok(createUser(admin, { email: "beto@perfil.co", name: "Beto Rojas", role: "DIRECTIVO" }).ok);
    const beto: SessionUser = { email: "beto@perfil.co", name: "Beto Rojas", role: "DIRECTIVO", company: ana.company };
    assert.ok(saveF1Response(beto, { r: { "DIR-1.1": 2 } }).ok);
    assert.ok(removeUser(admin, "beto@perfil.co").ok);
    assert.ok(!getF1Responses(admin).some((f) => f.email === "beto@perfil.co"));
  });
});
