import { test } from "node:test";
import assert from "node:assert/strict";
import { sectorFor, percentileOf, sectorComparison, sectorQuadrant, sectorPeerBars, shortName, companyRatios, SECTORS } from "../src/data/sector";
import { ANDINA_CATALOG, emptyCatalog } from "../src/data/catalogo";

const CAT = ANDINA_CATALOG;
const SECTOR = sectorFor(CAT);

test("el sector trae empresas reales con distribución coherente", () => {
  assert.equal(SECTOR, SECTORS[CAT.company.sectorKey], "sectorFor resuelve por sectorKey del catálogo");
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

test("un sectorKey desconocido cae al sector por defecto", () => {
  const other = emptyCatalog({ ...CAT.company, slug: "otra", sectorKey: "no-existe" });
  assert.equal(sectorFor(other), SECTORS["suministros-industriales"]);
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
  const cmp = sectorComparison(CAT);
  assert.equal(cmp.length, 6);
  const g = cmp.find((c) => c.key === "growth")!;
  assert.equal(g.value, companyRatios(CAT.financials!).growth);
  assert.ok(g.percentile >= 1 && g.percentile <= 99);
  const lev = cmp.find((c) => c.key === "leverage")!;
  assert.equal(lev.best, SECTOR.dist.leverage.p25, "para endeudamiento el mejor cuartil es el inferior");
});

test("cuadrante y barras ubican a la empresa entre pares reales", () => {
  const pts = sectorQuadrant(CAT);
  assert.equal(pts.filter((p) => p.self).length, 1);
  assert.equal(pts.find((p) => p.self)!.name, CAT.company.shortName);
  assert.ok(pts.length > 10);
  for (const p of pts) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  const home = CAT.territories.filter((t) => t.presence === "sede").map((t) => t.name);
  const bars = sectorPeerBars(CAT, home);
  assert.ok(bars.peers.some((p) => p.self));
  assert.ok(bars.peers.length >= 2);
  assert.equal(bars.nationalAvg, SECTOR.dist.growth.p50);
});

test("sin estados financieros ni territorio: estructuras vacías y seguras", () => {
  const cat = emptyCatalog({ ...CAT.company, slug: "nueva" });
  assert.equal(cat.financials, null);
  assert.deepEqual(sectorComparison(cat), []);
  const pts = sectorQuadrant(cat);
  assert.equal(pts.filter((p) => p.self).length, 0, "sin punto propio");
  assert.equal(pts.length, SECTOR.comparables.length, "solo los pares");
  const bars = sectorPeerBars(cat, []);
  assert.ok(!bars.peers.some((p) => p.self), "sin barra propia");
  assert.ok(bars.peers.length >= 2, "sin sedes se toman comparables del país");
  assert.equal(bars.nationalAvg, SECTOR.dist.growth.p50);
});

test("razón social abreviada", () => {
  assert.equal(shortName("COLOMBIANA DE REPRESENTACIONES INGENIERIA Y SUMINISTROS S.A."), "Colombiana de Representaciones…");
  assert.equal(shortName("GYJ FERRETERIAS S.A."), "GYJ Ferreterias");
});

test("el mapa del Ecuador tiene sus provincias continentales", async () => {
  const { EC_PATHS, EC_VIEW } = await import("../src/data/geo-ec");
  assert.equal(EC_PATHS.length, 23);
  for (const n of ["Guayas", "Manabí", "El Oro", "Pichincha", "Esmeraldas", "Santo Domingo de los Tsáchilas", "Los Ríos", "Santa Elena"]) {
    assert.ok(EC_PATHS.some((p) => p.name === n), n);
  }
  assert.ok(EC_VIEW.w === 300 && EC_VIEW.h > 200);
  for (const p of EC_PATHS) assert.match(p.d, /^M[\d.,\s L]+Z/);
});
