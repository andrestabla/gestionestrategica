import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInvestigacion, encargoInvestigacion, industriaDe, baseCombinada, urlClave, esInvestigado } from "../src/lib/inteligencia-base";
import { parseMadInforme, citasDe } from "../src/lib/madurez-ia";

const LINEAS = [{ n: 1, name: "Clientes" }, { n: 2, name: "Operación" }, { n: 3, name: "Innovación" }, { n: 4, name: "Arquitectura" }];
const hecho = (url: string, extra: Record<string, unknown> = {}) => ({ hecho: `Dato de prueba con cifra para ${url}`, temas: ["digital", "cliente"], fuente: { titulo: "Estudio", editor: "Gremio", fecha: "2026", url, tipo: "oficial" }, nota: "", dato: null, par: null, ...extra });

test("la investigación solo guarda los hechos cuya fuente está entre las páginas consultadas", () => {
  const base = parseInvestigacion([{
    data: { hechos: [
      hecho("https://www.dane.gov.co/encuesta/edit?utm_source=x", { dato: { linea: 2, indicador: "Empresas con procesos automatizados", valor: 41.26, unidad: "%", alcance: "Manufactura, Colombia", anio: "2025" } }),
      hecho("https://inventada.example.com/informe"),                                   // no se consultó: se descarta
      hecho("https://empresa.com/nota/", { par: { empresa: "Laboratorio X", anio: "2025", linea: 1 } }),
      hecho("no es una dirección"),
      hecho("https://empresa.com/otra", { dato: { linea: 9, indicador: "x", valor: 300, unidad: "%" } }),   // dato inválido: el hecho queda, sin dato
    ] },
    urls: ["https://dane.gov.co/encuesta/edit", "https://www.empresa.com/nota", "https://empresa.com/otra/"],
  }], { industria: "Industria X · Colombia", model: "m", at: "2026-11-12T00:00:00.000Z" }, LINEAS);
  assert.equal(base.hechos.length, 3);
  assert.equal(base.descartados, 2);
  assert.equal(base.consultadas, 3);
  assert.deepEqual(base.hechos[0].dato, { linea: 2, indicador: "Empresas con procesos automatizados", valor: 41.3, unidad: "%", alcance: "Manufactura, Colombia", anio: "2025" });
  assert.deepEqual(base.hechos[1].par, { empresa: "Laboratorio X", anio: "2025", linea: 1 });
  assert.equal(base.hechos[2].dato, undefined);
  assert.ok(base.hechos.every((h) => esInvestigado(h) && base.fuentes.some((f) => f.id === h.fuente)));
  assert.equal(urlClave("HTTPS://WWW.Sitio.com/a/b/?x=1#y"), "sitio.com/a/b");
});

test("sin páginas consultadas no se guarda ningún hecho", () => {
  const base = parseInvestigacion([{ data: { hechos: [hecho("https://sitio.com/a")] }, urls: [] }], { industria: "X", model: "m", at: "2026-01-01T00:00:00.000Z" }, LINEAS);
  assert.equal(base.hechos.length, 0);
  assert.equal(base.descartados, 1);
});

test("la industria sale de la ficha y decide qué se investiga", () => {
  const c = { name: "Empresa", sector: "Industria farmacéutica", ciiu: "C2100", country: "CO" as const };
  assert.equal(industriaDe(c), "Industria farmacéutica (CIIU C2100) · Colombia");
  assert.equal(industriaDe({ name: "Sin ficha" }), "");
  // con base curada solo se investiga lo digital; sin ella, también el panorama del sector
  assert.deepEqual(encargoInvestigacion(c, LINEAS, true).bloques.map((b) => b.id), ["digital"]);
  assert.deepEqual(encargoInvestigacion({ name: "Textiles", sector: "Confecciones", country: "CO" }, LINEAS, false).bloques.map((b) => b.id), ["digital", "sector"]);
  // la base de la empresa suma lo curado de su sector y lo investigado
  const inv = parseInvestigacion([{ data: { hechos: [hecho("https://sitio.com/a")] }, urls: ["https://sitio.com/a"] }], { industria: industriaDe(c), model: "m", at: "2026-01-01T00:00:00.000Z" }, LINEAS);
  const curada = baseCombinada(c, null)!, todo = baseCombinada(c, inv)!;
  assert.equal(todo.hechos.length, curada.hechos.length + 1);
  assert.equal(baseCombinada({ name: "Textiles", sector: "Confecciones", country: "CO" }, inv)!.hechos.length, 1);
});

test("el informe de madurez valida el cruce con la industria y encuentra las citas", () => {
  const informe = parseMadInforme({
    titulo: "T", resumen: ["uno [2]", "dos"], lineas: [{ linea: "L1 · Clientes", lectura: "x", variables_clave: ["CL-ORG-1 · Estrategia", "CL-ORG-1", "CL-TEC-1"] }],
    sector: { lectura: "El sector exige [1, 4].", industria: "La industria [3][7].", comparacion: [{ practica: "CRM omnicanal", industria: "70 % [3]", organizacion: "nivel 2", posicion: "Rezago", variables: ["CL-TEC-1"] }, { practica: "sin posición", posicion: "otra" }],
      lineas: [{ linea: "L1", exigencia: "Alta", posicion: "en línea", que_exige: "a", lectura: "b" }, { linea: "L2", exigencia: "extrema", posicion: "rezago" }], oportunidades: [{ titulo: "O", lectura: "l", variables: ["A-1"] }], riesgos: [] },
    estrategia: [{ prioridad: "Excelencia", dependencia: "ALTA", variables: ["CL-TEC-1"], lectura: "l" }],
    prioridades: [{ orden: 2, variable: "B", primer_paso: "p", esfuerzo: "Bajo", impacto: "alto" }, { orden: 1, variable: "A", primer_paso: "p", esfuerzo: "enorme" }],
  });
  assert.equal(informe.version, 2);
  assert.deepEqual(informe.lineas[0].variables_clave, ["CL-ORG-1", "CL-TEC-1"]);
  assert.deepEqual(informe.sector!.lineas.map((l) => [l.exigencia, l.posicion]), [["alta", "en_linea"]]);
  assert.deepEqual(informe.sector!.comparacion!.map((c) => c.posicion), ["rezago"]);
  assert.equal(informe.estrategia![0].dependencia, "alta");
  assert.deepEqual(informe.prioridades.map((p) => [p.variable, p.esfuerzo, p.impacto]), [["A", undefined, undefined], ["B", "bajo", "alto"]]);
  assert.deepEqual(citasDe(informe), [1, 2, 3, 4, 7]);
});
