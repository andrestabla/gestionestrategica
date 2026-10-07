// Ámbito por responsable (tribu, área) del rol RESPONSABLE: lo que tiene
// dueño se decide por el dueño; lo que no, por la capacidad 4.1–4.4.
import { test } from "node:test";
import assert from "node:assert/strict";
import { can, inScope } from "../src/lib/permissions";
import {
  resetStore, catalog, createUser, updateUser, getUsers, updateInitiative, evaluateInitiative,
  upsertResponsible, removeResponsible,
} from "../src/server/store";
import type { SessionUser } from "../src/lib/session";

const advisor: SessionUser = { email: "c@a.co", name: "Advisor", role: "CONSULTOR" };
const T = { contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "TACTICO", permanencia: "ESTRATEGICO" } as const;

/** Dos iniciativas de la misma capacidad con responsables distintos. */
function pair() {
  const inis = catalog().initiatives;
  for (const a of inis) for (const b of inis) {
    if (a.line === b.line && a.ownerId && b.ownerId && a.ownerId !== b.ownerId) return { a, b };
  }
  throw new Error("el catálogo demo no tiene dos iniciativas de la misma capacidad con distinto dueño");
}

test("inScope: el dueño manda cuando hay responsable; la capacidad, cuando no hay dueño", () => {
  const tribu: SessionUser = { email: "t@a.co", name: "Tribu", role: "RESPONSABLE", responsibleId: "R04" };
  const ambos: SessionUser = { email: "b@a.co", name: "Ambos", role: "RESPONSABLE", line: 3, responsibleId: "R04" };
  const capacidad: SessionUser = { email: "l@a.co", name: "Línea", role: "RESPONSABLE", line: 3 };

  assert.ok(inScope(tribu, { line: 1, ownerId: "R04" }));
  assert.ok(!inScope(tribu, { line: 1, ownerId: "R05" }));
  assert.ok(!inScope(tribu, { line: 3 }), "sin capacidad no captura prácticas");
  assert.ok(inScope(ambos, { line: 3 }), "con capacidad sí captura prácticas");
  assert.ok(!inScope(ambos, { line: 3, ownerId: "R05" }), "misma capacidad, otro dueño: fuera");
  assert.ok(inScope(capacidad, { line: 3, ownerId: "R05" }), "sin responsable asignado, rige la capacidad");
  assert.ok(can(tribu, "edit_initiatives"), "capacidad general: la UI muestra el control");
  assert.ok(can(tribu, "edit_initiatives", { line: 2, ownerId: "R04" }));
  assert.ok(!can(tribu, "edit_initiatives", 2));
  assert.ok(can(capacidad, "edit_initiatives", 3));
});

test("responsable por tribu: edita y evalúa solo las iniciativas de su dueño, aunque compartan capacidad", () => {
  resetStore();
  const { a, b } = pair();
  const tribu: SessionUser = { email: "t@a.co", name: "Tribu", role: "RESPONSABLE", responsibleId: a.ownerId };

  const own = updateInitiative(tribu, a.id, { progress: 50 });
  assert.ok(own.ok, "edita la suya");
  const other = updateInitiative(tribu, b.id, { progress: 50 });
  assert.ok(!other.ok && other.status === 403, "misma capacidad, otra tribu: 403");
  assert.match(other.ok ? "" : other.error, /tu ámbito es/);

  const ev = evaluateInitiative(tribu, a.id, { scores: { D: 3, E: 3, M: 2, L: 3 }, type: T });
  assert.ok(ev.ok, "evalúa la suya");
  const evOther = evaluateInitiative(tribu, b.id, { scores: { D: 3, E: 3, M: 2, L: 3 }, type: T });
  assert.ok(!evOther.ok && evOther.status === 403);
  resetStore();
});

test("cuentas: el responsable exige capacidad o responsable del catálogo; el responsable debe existir", () => {
  resetStore();
  const none = createUser(advisor, { email: "x@a.co", name: "Sin ámbito", role: "RESPONSABLE" });
  assert.ok(!none.ok && none.status === 422);
  const ghost = createUser(advisor, { email: "x@a.co", name: "Fantasma", role: "RESPONSABLE", responsibleId: "R99" });
  assert.ok(!ghost.ok && ghost.status === 422);
  const ok = createUser(advisor, { email: "x@a.co", name: "Tribu Oferta", role: "RESPONSABLE", responsibleId: "R04" });
  assert.ok(ok.ok && ok.user.responsibleId === "R04" && ok.user.line === undefined);

  // añadir capacidad, quitar responsable, y no dejarlo sin ámbito
  assert.ok(updateUser(advisor, "x@a.co", { line: 2 }).ok);
  assert.equal(getUsers().find((u) => u.email === "x@a.co")!.line, 2);
  assert.ok(updateUser(advisor, "x@a.co", { responsibleId: null }).ok);
  const empty = updateUser(advisor, "x@a.co", { line: null });
  assert.ok(!empty.ok && empty.status === 422, "no puede quedar sin ámbito");
  // cambiar de rol limpia el ámbito
  assert.ok(updateUser(advisor, "x@a.co", { role: "DIRECTIVO" }).ok);
  const u = getUsers().find((x) => x.email === "x@a.co")!;
  assert.equal(u.line, undefined); assert.equal(u.responsibleId, undefined);
  resetStore();
});

test("catálogo: un responsable que delimita cuentas no se elimina", () => {
  resetStore();
  const r = upsertResponsible(advisor, { cargo: "Líder de tribu", dependencia: "Tribu Prueba", rolPlataforma: "RESPONSABLE" });
  assert.ok(r.ok && r.id);
  assert.ok(createUser(advisor, { email: "y@a.co", name: "Cuenta Tribu", role: "RESPONSABLE", responsibleId: r.id }).ok);
  const del = removeResponsible(advisor, r.id!);
  assert.ok(!del.ok && del.status === 422 && del.error.includes("cuenta y@a.co"));
  resetStore();
});
