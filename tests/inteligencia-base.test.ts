import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInvestigacion, encargoInvestigacion, industriaDe, baseCombinada, urlClave, esInvestigado } from "../src/lib/inteligencia-base";
import { parseMadInforme, citasDe } from "../src/lib/madurez-ia";

const LINEAS = [{ n: 1, name: "Clientes" }, { n: 2, name: "Operación" }, { n: 3, name: "Innovación" }, { n: 4, name: "Arquitectura" }];
const hecho = (url: string, extra: Record<string, unknown> = {}) => ({ hecho: `Dato de prueba: 12 % de las empresas en 2025, según ${url}`, temas: ["digital", "cliente"], fuente: { titulo: "Estudio", editor: "Gremio", fecha: "2026", url, tipo: "oficial" }, nota: "", dato: null, par: null, ...extra });

test("la investigación solo guarda los hechos cuya fuente está entre las páginas consultadas", () => {
  const base = parseInvestigacion([{
    data: { hechos: [
      hecho("https://www.dane.gov.co/encuesta/edit?utm_source=x", { dato: { linea: 2, indicador: "Empresas con procesos automatizados", valor: 41.26, unidad: "%", alcance: "Manufactura, Colombia", anio: "2025" } }),
      hecho("https://inventada.example.com/informe"),                                   // no se consultó: se descarta
      { ...hecho("https://empresa.com/nota/", { par: { empresa: "Laboratorio X", anio: "2025", linea: 1 } }), hecho: "Laboratorio X implantó en 2025 una plataforma de gestión de clientes para 300 visitadores." },
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

test("se descartan las páginas de inicio, lo que no trae cifra, el texto comercial de proveedores y lo que ya está curado", () => {
  const urls = ["https://proveedor.com/", "https://proveedor.com/industrias/farma", "https://prensa.com/nota-1", "https://prensa.com/nota-2", "https://oficial.gov.co/boletin"];
  const base = parseInvestigacion([{ data: { hechos: [
    { ...hecho("https://proveedor.com/"), hecho: "Proveedor creció 20 % en 2025 en el sector." },                                  // página de inicio
    { ...hecho("https://proveedor.com/industrias/farma"), hecho: "Proveedor ofrece soluciones tecnológicas para la industria desde 2010." },   // comercial
    { ...hecho("https://prensa.com/nota-1"), hecho: "La industria avanza en su transformación digital." },                         // sin cifra
    { ...hecho("https://oficial.gov.co/boletin"), hecho: "El 41 % de las empresas del sector usa analítica (2025)." },             // ya está curado
    { ...hecho("https://prensa.com/nota-2", { par: { empresa: "Laboratorio X", anio: "2026", linea: 1 } }), hecho: "Laboratorio X ofrece desde 2026 visitas médicas digitales a 24.000 profesionales." },   // iniciativa de un par: vale
  ] }, urls }], { industria: "X", model: "m", at: "2026-01-01T00:00:00.000Z" }, LINEAS, ["https://www.oficial.gov.co/boletin/"]);
  assert.deepEqual(base.hechos.map((h) => h.par?.empresa), ["Laboratorio X"]);
  assert.equal(base.descartados, 3);
  // un «par» que solo trae cifras financieras, o que habla de la propia empresa, no es una iniciativa digital de un competidor
  const pares = parseInvestigacion([{ data: { hechos: [
    { ...hecho("https://prensa.com/nota-3", { par: { empresa: "Laboratorio Y", anio: "2022", linea: 2 } }), hecho: "En 2022, Laboratorio Y reportó ingresos de $604.148 millones con margen de 19,8 %." },
    { ...hecho("https://prensa.com/nota-4", { par: { empresa: "Laboratorios Siegfried", anio: "2022", linea: 1 } }), hecho: "En 2022, Laboratorios Siegfried lanzó una plataforma digital para 5.000 médicos." },
    { ...hecho("https://prensa.com/nota-5", { par: { empresa: "Laboratorio Z", anio: "2024", linea: 2 } }), hecho: "Laboratorio Z automatizó en 2024 dos líneas de empaque." },
  ] }, urls: ["https://prensa.com/nota-3", "https://prensa.com/nota-4", "https://prensa.com/nota-5"] }], { industria: "X", model: "m", at: "2026-01-01T00:00:00.000Z" }, LINEAS, [], "Laboratorios Siegfried");
  assert.deepEqual(pares.hechos.map((h) => h.par?.empresa), ["Laboratorio Z"]);
  assert.equal(pares.descartados, 2);
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
  assert.deepEqual(encargoInvestigacion(c, LINEAS, true).bloques.map((b) => b.id), ["adopcion", "pares", "exigencias"]);
  assert.deepEqual(encargoInvestigacion({ name: "Textiles", sector: "Confecciones", country: "CO" }, LINEAS, false).bloques.map((b) => b.id), ["adopcion", "pares", "exigencias", "sector"]);
  assert.ok(encargoInvestigacion(c, LINEAS, true, ["Laboratorio Uno", "Laboratorio Dos"]).bloques.find((b) => b.id === "pares")!.user.includes("Laboratorio Uno, Laboratorio Dos"));
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
