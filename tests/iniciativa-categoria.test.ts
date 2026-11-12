// Categoría de la iniciativa (node:test + tsx): un proyecto especial o una iniciativa disruptiva se
// mapea sin objetivo ni resultado clave, en cualquier modo, y no pasa a Priorización hasta tener uno.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, catalog, resetStore, upsertResponsible, upsertObjective, upsertKpi, upsertInitiative, calificables } from "../src/server/store";
import { INI_CATEGORIAS, categoriaLabel, iniCategoria } from "../src/data/cmi";
import { pasaAPriorizacion } from "../src/lib/convencion";
import { documentoDecisiones } from "../src/server/exportar";
import { documentoXlsx } from "../src/server/exportar-xlsx";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };

test("categoría: catálogo de categorías y lectura tolerante", () => {
  assert.deepEqual(INI_CATEGORIAS.map((c) => c.id), ["especial", "disruptiva"]);
  assert.deepEqual([iniCategoria("especial"), iniCategoria("otra"), iniCategoria(null), categoriaLabel("disruptiva"), categoriaLabel(undefined)], ["especial", undefined, undefined, "Iniciativa disruptiva", undefined]);
});

test("categoría: se mapea sin objetivo ni KR, no se califica hasta tener KR y se conserva si el formulario no la envía", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Mapa SA", template: "vacia" })).ok);
  await runWithTenant("mapa-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Gerente general", dependencia: "Gerencia", rolPlataforma: "LIDER" }).ok);
    assert.ok(upsertObjective(advisor, { perspective: "financiera", name: "Crecer 20 % con margen", kpis: [], line: 1 }).ok);
    assert.ok(upsertKpi(advisor, { code: "DIR-01", line: 1, cmi: "OE-01", name: "Crecimiento de ventas", unit: "%", frequency: "Trimestral", ownerId: "R01", baseline: 5, target: 20, goodDirection: "up" }).ok);

    // una iniciativa corriente sigue exigiendo objetivo fuera del acompañamiento
    const corriente = upsertInitiative(advisor, { name: "Iniciativa sin objetivo", capability: "DIR-1", ownerId: "R01" });
    assert.ok(!corriente.ok && corriente.status === 422 && /proyecto especial/.test(corriente.error));

    // un proyecto especial y una iniciativa disruptiva se mapean sin objetivo ni resultado clave
    const esp = upsertInitiative(advisor, { name: "Traslado de la sede principal", capability: "EJE-1", ownerId: "R01", categoria: "especial" });
    const dis = upsertInitiative(advisor, { name: "Venta directa con agentes de IA", capability: "MUL-1", ownerId: "R01", categoria: "disruptiva" });
    assert.ok(esp.ok && dis.ok);
    const de = (id: string) => catalog().initiatives.find((i) => i.id === id)!;
    assert.deepEqual([de(esp.id!).categoria, de(esp.id!).cmi, de(esp.id!).kpi, de(dis.id!).categoria], ["especial", "", "", "disruptiva"]);

    // no pasan a Priorización, y el motivo dice que quedaron mapeadas
    const cal = calificables();
    assert.ok(!cal[esp.id!].ok && /proyecto especial sin resultado clave/.test(cal[esp.id!].motivo ?? ""));
    assert.ok(!cal[dis.id!].ok && /iniciativa disruptiva sin resultado clave/.test(cal[dis.id!].motivo ?? ""));

    // fuera del acompañamiento una iniciativa corriente sin KR sigue apareciendo en Priorización (sin poder calificarse); las mapeadas, no
    assert.equal(catalog().company.mode ?? "completa", "completa");
    assert.deepEqual([pasaAPriorizacion(catalog(), de(esp.id!)), pasaAPriorizacion(catalog(), de(dis.id!)), pasaAPriorizacion(catalog(), { kpi: "" })], [false, false, true]);

    // con un resultado clave asociado entra a Priorización, toma el objetivo del KR y conserva la categoría
    assert.ok(upsertInitiative(advisor, { ...de(esp.id!), kpi: "DIR-01", cmi: "" }).ok);
    assert.deepEqual([de(esp.id!).categoria, de(esp.id!).cmi, de(esp.id!).kpi, calificables()[esp.id!].ok, pasaAPriorizacion(catalog(), de(esp.id!))], ["especial", "OE-01", "DIR-01", true, true]);

    // un formulario que no envía la categoría la conserva; enviarla vacía la borra; un valor desconocido no se guarda
    const { categoria: _c, ...sinCategoria } = de(dis.id!); void _c;
    assert.ok(upsertInitiative(advisor, { ...sinCategoria, name: "Venta directa con agentes de inteligencia artificial" }).ok);
    assert.equal(de(dis.id!).categoria, "disruptiva");
    assert.ok(upsertInitiative(advisor, { ...de(esp.id!), categoria: null as never }).ok);
    assert.equal(de(esp.id!).categoria, undefined);
    assert.ok(upsertInitiative(advisor, { ...de(esp.id!), categoria: "otra" as never }).ok);
    assert.equal(de(esp.id!).categoria, undefined);
    // la descarga de iniciativas trae la categoría de cada una y avisa de las que quedaron mapeadas
    const doc = documentoDecisiones("iniciativas", advisor), sec = doc.secciones[0], col = sec.columnas.indexOf("Categoría");
    assert.equal(col, 2);
    assert.equal(sec.anchos?.length, sec.columnas.length);
    assert.ok(sec.filas.every((f) => f.length === sec.columnas.length));
    assert.deepEqual(sec.filas.map((f) => [f[0], f[col]]), [[esp.id!, "Iniciativa"], [dis.id!, "Iniciativa disruptiva"]]);
    assert.ok(/1 proyecto especial o iniciativa disruptiva está mapeado/.test(sec.notas?.[0] ?? ""));
    assert.ok((await documentoXlsx(doc)).length > 2000);

    // Priorización y Portafolio: la categoría acompaña a cada iniciativa que sí compite y una nota cuenta las mapeadas que no figuran
    for (const modulo of ["priorizacion", "portafolio"] as const) {
      const d = documentoDecisiones(modulo, advisor), s2 = d.secciones[d.secciones.length - 1], k = s2.columnas.indexOf("Categoría");
      assert.equal(k, 2);
      assert.equal(s2.anchos?.length, s2.columnas.length);
      assert.ok(s2.filas.every((f) => f.length === s2.columnas.length));
      assert.deepEqual(s2.filas.map((f) => [f[1], f[k]]), [[de(esp.id!).name, "Iniciativa"]]);   // la disruptiva sin KR no compite
      assert.ok(/1 proyecto especial o iniciativa disruptiva no figura/.test(s2.notas?.[0] ?? ""));
    }

    // al quitarle la categoría a una que sigue sin objetivo, vuelve a regir la regla corriente
    const sinCat = upsertInitiative(advisor, { ...de(dis.id!), categoria: null as never });
    assert.ok(!sinCat.ok && sinCat.status === 422);

    // con resultado clave, la disruptiva entra al orden y conserva su categoría en la descarga
    assert.ok(upsertKpi(advisor, { code: "DIR-02", line: 1, cmi: "OE-01", name: "Ingresos por líneas nuevas", unit: "%", frequency: "Trimestral", ownerId: "R01", baseline: 0, target: 5, goodDirection: "up" }).ok);
    assert.ok(upsertInitiative(advisor, { ...de(dis.id!), kpi: "DIR-02" }).ok);
    const conKr = documentoDecisiones("priorizacion", advisor).secciones[0];
    assert.deepEqual(conKr.filas.map((f) => f[2]).sort(), ["Iniciativa", "Iniciativa disruptiva"]);
    assert.equal(conKr.notas, undefined);
  });
});
