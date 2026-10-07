import { test } from "node:test";
import assert from "node:assert/strict";
import { SECTOR, percentileOf, sectorComparison, sectorQuadrant, sectorPeerBars, shortName, companyRatios } from "../src/data/sector";
import { TERRITORIES } from "../src/data/demo";

test("el sector trae empresas reales con distribución coherente", () => {
  assert.ok(SECTOR.n > 100, "más de 100 sociedades");
  assert.equal(SECTOR.peers.length, 60);
  assert.ok(SECTOR.comparables.length >= 20);
  for (const k of ["growth", "grossMargin", "opMargin", "netMargin", "roa", "leverage", "revenue"] as const) {
    const q = SECTOR.dist[k];
    assert.ok(q.p25! <= q.p50! && q.p50! <= q.p75!, `${k}: cuartiles ordenados`);
  }
  const share = SECTOR.departments.reduce((a, d) => a + d.share, 0);
  assert.ok(share > 98 && share < 102, `participación por departamento suma ${share}`);
  assert.equal(SECTOR.sizes.reduce((a, s) => a + s.n, 0), SECTOR.n);
  for (let i = 1; i < SECTOR.peers.length; i++) assert.ok(SECTOR.peers[i - 1].revenue >= SECTOR.peers[i].revenue, "pares ordenados por ingresos");
  assert.match(SECTOR.source.cut, /^\d{4}-12-31$/);
});

test("percentil interpola entre cuartiles y se invierte cuando menos es mejor", () => {
  const q = { n: 10, p10: -20, p25: -5, p50: 5, p75: 15, p90: 30 };
  assert.equal(percentileOf(q, 5), 0.5);
  assert.equal(percentileOf(q, 10), 0.625);
  assert.ok(percentileOf(q, -40) < 0.1);
  assert.ok(percentileOf(q, 60) > 0.9);
  assert.equal(percentileOf(q, 10, true), 1 - 0.625);
});

test("la comparación de Andina con el sector cubre las seis razones", () => {
  const cmp = sectorComparison();
  assert.equal(cmp.length, 6);
  const g = cmp.find((c) => c.key === "growth")!;
  assert.equal(g.value, companyRatios().growth);
  assert.ok(g.percentile >= 1 && g.percentile <= 99);
  const lev = cmp.find((c) => c.key === "leverage")!;
  assert.equal(lev.best, SECTOR.dist.leverage.p25, "para endeudamiento el mejor cuartil es el inferior");
});

test("cuadrante y barras ubican a la empresa entre pares reales", () => {
  const pts = sectorQuadrant();
  assert.equal(pts.filter((p) => p.self).length, 1);
  assert.ok(pts.length > 10);
  for (const p of pts) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  const bars = sectorPeerBars(TERRITORIES.filter((t) => t.presence === "sede").map((t) => t.name));
  assert.ok(bars.peers.some((p) => p.self));
  assert.ok(bars.peers.length >= 2);
  assert.equal(bars.nationalAvg, SECTOR.dist.growth.p50);
});

test("razón social abreviada", () => {
  assert.equal(shortName("COLOMBIANA DE REPRESENTACIONES INGENIERIA Y SUMINISTROS S.A."), "Colombiana de Representaciones…");
  assert.equal(shortName("GYJ FERRETERIAS S.A."), "GYJ Ferreterias");
});
