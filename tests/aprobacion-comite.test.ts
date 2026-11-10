// Aprobación del comité directivo sobre la validación de objetivos: deja el objetivo en verde, conserva la lectura
// del modelo, la registra quien conduce la validación y deja de valer si el objetivo cambia.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, saveAlineacion, getAlineacion, aprobarObjetivos } from "../src/server/store";
import type { AlineacionIA, AlineacionItem } from "../src/lib/alineacion";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@c.co", name: "Directiva", role: "DIRECTIVO", company: { slug: "comite-ok", name: "Comité OK", shortName: "Comité", mode: "acompanamiento" } };
const item = (id: string, color: AlineacionItem["color"]): AlineacionItem => ({ id, color, justificacion: `lectura del modelo de ${id}`, recomendaciones: color === "verde" ? [] : ["Afinar el indicador"], naturaleza: "objetivo", duplicaDe: [], reformulacion: "", indicadorPropuesto: "", faltan: [] });
const obj = (id: string, name: string, lever?: string) => ({ id, perspective: "clientes", name, kpis: [], horizon: "H1", ...(lever ? { lever } : {}) });

test("aprobación del comité: verde con la lectura del modelo conservada; se pierde si el objetivo cambia", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Comité OK", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("comite-ok", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Director", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Innovación comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, obj("OE-01", "Consolidar el crecimiento sostenible del negocio, medido por la participación", "EXC")).ok);
    assert.ok(upsertObjective(advisor, obj("OE-02", "Expandir el negocio mediante nuevos mercados, medido por la venta nueva", "EXC")).ok);
    assert.ok(upsertObjective(advisor, obj("OE-03", "Objetivo que aún no cuelga de ninguna prioridad del comité")).ok);
    const informe: AlineacionIA = { horizon: "H1", resumen: "r", items: [item("OE-01", "verde"), item("OE-02", "amarillo"), item("OE-03", "amarillo")] };
    assert.ok(saveAlineacion(advisor, "H1", "h", informe).ok);
    const validadoEl = getAlineacion("H1")!.at;

    // el directivo no aprueba; el advisor sí
    const d = aprobarObjetivos(directivo, "H1", ["OE-02"], "aprobar", "h"); assert.ok(!d.ok && d.status === 403);
    const r = aprobarObjetivos(advisor, "H1", ["OE-02", "OE-03", "OE-99"], "aprobar", "h");
    assert.ok(r.ok); if (!r.ok) return;
    assert.deepEqual(r.aprobados, ["OE-02"]);
    assert.deepEqual(r.omitidos.map((x) => x.id), ["OE-03", "OE-99"], "sin prioridad o inexistente no se aprueba");
    const it = getAlineacion("H1")!.informe.items.find((x) => x.id === "OE-02")!;
    assert.equal(it.color, "verde"); assert.equal(it.colorIA, "amarillo"); assert.equal(it.aprobado?.name, "Advisor");
    assert.equal(it.justificacion, "lectura del modelo de OE-02"); assert.deepEqual(it.recomendaciones, ["Afinar el indicador"]);
    assert.equal(getAlineacion("H1")!.at, validadoEl, "no cambia la fecha de la validación del modelo");
    assert.equal(getAlineacion("H1")!.informe.items.find((x) => x.id === "OE-03")!.color, "amarillo");

    // si el objetivo cambia, la aprobación deja de valer y vuelve la lectura del modelo
    assert.ok(upsertObjective(advisor, obj("OE-02", "Expandir el negocio con una redacción distinta, medido por la venta nueva", "EXC")).ok);
    const tras = getAlineacion("H1")!.informe.items.find((x) => x.id === "OE-02")!;
    assert.equal(tras.color, "amarillo"); assert.equal(tras.aprobado, undefined);
    // volver al texto aprobado la recupera (la huella coincide de nuevo)
    assert.ok(upsertObjective(advisor, obj("OE-02", "Expandir el negocio mediante nuevos mercados, medido por la venta nueva", "EXC")).ok);
    assert.equal(getAlineacion("H1")!.informe.items.find((x) => x.id === "OE-02")!.color, "verde");

    // quitar la aprobación devuelve la lectura del modelo
    const q = aprobarObjetivos(advisor, "H1", ["OE-02"], "quitar", "h"); assert.ok(q.ok && q.aprobados.length === 1);
    const fin = getAlineacion("H1")!.informe.items.find((x) => x.id === "OE-02")!;
    assert.equal(fin.color, "amarillo"); assert.equal(fin.aprobado, undefined); assert.equal(fin.colorIA, undefined);
  });
});
