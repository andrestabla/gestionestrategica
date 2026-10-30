// Sector de referencia por inferencia, inteligencia regulatoria por sector y base de conocimiento (node:test + tsx).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sectorKeyDe, SECTORS, SECTOR_OPTIONS, DEFAULT_SECTOR_KEY } from "../src/data/sector";
import { inteligenciaOf, titularDe, normTitular, atc2Nombre } from "../src/data/inteligencia";
import { baseDe, evidenciaPara } from "../src/data/conocimiento-sector";

test("sector: la ficha manda; sin ficha, el CIIU o el texto farmacéutico llevan al sector farmacéutico del país", () => {
  assert.equal(sectorKeyDe({ sectorKey: "farmacias-ecuador" }), "farmacias-ecuador");
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, ciiu: "C2100", country: "CO" }), "farmaceutico-colombia");
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, sector: "Laboratorio farmacéutico", country: "CO" }), "farmaceutico-colombia");
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, sector: "Farmacias", country: "EC" }), "farmacias-ecuador");
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, ciiu: "G4659", sector: "Distribución de suministros industriales" }), DEFAULT_SECTOR_KEY);
  assert.equal(sectorKeyDe({ sectorKey: "no-existe" }), DEFAULT_SECTOR_KEY);
  // ficha vacía: la razón social ubica a la empresa entre las sociedades del sector farmacéutico
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, name: "Siegfried", shortName: "Siegfried", country: "CO" }), "farmaceutico-colombia");
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, name: "Empresa Vacía", shortName: "Vacía", country: "CO" }), DEFAULT_SECTOR_KEY);
  assert.equal(sectorKeyDe({ sectorKey: DEFAULT_SECTOR_KEY, name: "Andina Suministros", shortName: "Andina", ciiu: "G4659", sector: "Distribución", country: "CO" }), DEFAULT_SECTOR_KEY);
  assert.ok(SECTOR_OPTIONS.every((o) => SECTORS[o.key]));
  assert.equal(SECTORS["farmaceutico-colombia"].byCiiu.length, 2);
});

test("inteligencia: el sector farmacéutico trae INVIMA, precios regulados y TRM, y ubica a la empresa por su nombre", () => {
  const d = inteligenciaOf("farmaceutico-colombia");
  assert.ok(d && d.invima.registros > 5000 && d.regulados.presentaciones > 10000 && d.trm.valor > 1000);
  assert.equal(inteligenciaOf("suministros-industriales"), null);
  assert.equal(normTitular("Laboratorios Siegfried S.A.S."), "LABORATORIOS SIEGFRIED");
  const t = titularDe({ name: "Siegfried", shortName: "Siegfried" }, d);
  assert.ok(t && t.key.includes("SIEGFRIED") && t.registros > 100);
  assert.equal(titularDe({ name: "Empresa Inexistente XYZ" }, d), null);
  assert.equal(atc2Nombre("N02"), "Analgésicos");
  assert.equal(atc2Nombre("Z99", "x"), "x");
});

test("conocimiento: la industria farmacéutica colombiana tiene base propia con hechos de regulación y margen", () => {
  const b = baseDe({ sectorKey: "suministros-industriales", ciiu: "C2100", country: "CO", sector: "" });
  assert.equal(b?.id, "farmaceutico-colombia");
  assert.ok(b!.hechos.every((h) => b!.fuentes.some((f) => f.id === h.fuente)), "cada hecho cita una fuente existente");
  const ev = evidenciaPara({ sectorKey: "farmaceutico-colombia", country: "CO", sector: "" }, { id: "MAR", name: "Margen y portafolio" });
  assert.ok(ev.length >= 5 && ev.some((e) => /Circular 22/.test(e.hecho)));
  assert.equal(baseDe({ sectorKey: "suministros-industriales", ciiu: "G4659", country: "CO", sector: "" }), null);
});
