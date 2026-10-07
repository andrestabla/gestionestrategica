// Demanda y competencia por territorio (M7): población oficial × sector × presencia.
import { test } from "node:test";
import assert from "node:assert/strict";
import { demandByTerritory, coverage, openMarkets, competitorsByTerritory } from "../src/lib/demanda";
import { EC_POPULATION } from "../src/data/demanda-ec";
import { observatoriesFor } from "../src/data/observatorios";

const POP = [{ name: "A", population: 1_000_000 }, { name: "B", population: 500_000 }, { name: "C", population: 500_000 }];
const SECTOR = [{ name: "A", n: 10, revenue: 50 }, { name: "C", n: 2, revenue: 1 }];
const TERR = [{ name: "A", weight: 3 as const, presence: "sede" as const, reading: "" }, { name: "B", weight: 1 as const, presence: "oportunidad" as const, reading: "" }];

test("demanda: una fila por territorio, ordenada por población, con presencia, sociedades e ingresos por habitante", () => {
  const rows = demandByTerritory(POP, SECTOR, TERR, true);
  assert.deepEqual(rows.map((r) => r.name), ["A", "B", "C"]);
  assert.equal(rows[0].presence, "sede"); assert.equal(rows[0].weight, 3); assert.equal(rows[0].companies, 10);
  assert.equal(rows[0].perCapita, 50, "50 M USD / 1 M habitantes = 50 USD por habitante");
  assert.equal(rows[1].presence, "oportunidad"); assert.equal(rows[1].perCapita, null);
  assert.equal(rows[2].presence, "ninguna"); assert.equal(rows[2].perCapita, 2);
  assert.equal(rows[0].share, 50);
});

test("cobertura: población cubierta, en oportunidad y sin presencia; mercados abiertos por tamaño", () => {
  const rows = demandByTerritory(POP, SECTOR, TERR);
  const c = coverage(rows);
  assert.equal(c.total, 2_000_000); assert.equal(c.coveredPct, 50); assert.equal(c.opportunityPct, 25); assert.equal(c.nonePct, 25);
  assert.deepEqual(openMarkets(rows).map((r) => r.name), ["C"]);
});

test("competencia: sociedades del sector en cada territorio de la empresa, las mayores primero", () => {
  const peers = [
    { name: "Grande", dept: "A", revenue: 30, growth: 10 }, { name: "Media", dept: "A", revenue: 15, growth: null },
    { name: "Chica", dept: "A", revenue: 5, growth: -2 }, { name: "Mini", dept: "A", revenue: 1, growth: 0 }, { name: "Otra", dept: "Z", revenue: 99, growth: 1 },
  ];
  const out = competitorsByTerritory(peers, TERR, 3);
  assert.equal(out[0].count, 4); assert.equal(out[0].revenue, 51); assert.deepEqual(out[0].top.map((p) => p.name), ["Grande", "Media", "Chica"]);
  assert.equal(out[1].count, 0);
});

test("datos: 24 provincias del censo 2022 y observatorios por país sin fuentes ajenas", () => {
  assert.equal(EC_POPULATION.length, 24);
  assert.equal(EC_POPULATION.reduce((a, p) => a + p.population, 0), 16938983, "suma de las 24 provincias (el total nacional del censo, 16.938.986, incluye zonas no delimitadas)");
  const ec = observatoriesFor("EC"), co = observatoriesFor("CO");
  assert.ok(ec.every((o) => !/Supersociedades|DANE|DIAN|datos\.gov\.co|departamentos/i.test(o.tags.join(" ") + o.desc)), "Ecuador no enlaza fuentes colombianas");
  assert.ok(ec.some((o) => /ARCSA/.test(o.tags.join(" "))), "Ecuador incluye la regulación farmacéutica");
  assert.ok(co.some((o) => /Supersociedades/.test(o.tags.join(" "))));
  assert.deepEqual(observatoriesFor(undefined), co);
});
