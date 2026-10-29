// Contraste de los tokens de texto (sistema de diseño MASTER): cada color de texto debe alcanzar
// 4,5:1 (WCAG AA) sobre las superficies en las que se usa, en el tema claro y en el oscuro.
// Se leen directamente de src/app/globals.css: si alguien cambia un token, la prueba lo detecta.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}
function section(start: RegExp): string {
  const i = css.search(start); assert.ok(i >= 0, `no se encontró ${start}`);
  const open = css.indexOf("{", i); let depth = 0;
  for (let j = open; j < css.length; j++) { if (css[j] === "{") depth++; else if (css[j] === "}") { depth--; if (depth === 0) return css.slice(open, j); } }
  throw new Error("bloque sin cerrar");
}
const lum = (hex: string) => {
  const h = hex.slice(1); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const TEXTO = ["ink", "ink-soft", "muted", "faint", "cyan-deep", "gold-text", "ok-text", "warn-text", "bad-text"];
const FONDO = ["surface", "surface-2", "bg"];

test("tema claro: los tokens de texto alcanzan 4,5:1 sobre superficie, superficie 2 y fondo", () => {
  const t = tokens(section(/^:root \{/m));
  for (const k of [...TEXTO, ...FONDO]) assert.ok(t[k], `falta el token --${k}`);
  for (const tx of TEXTO) for (const bg of FONDO) {
    const c = contraste(t[tx], t[bg]);
    assert.ok(c >= 4.5, `--${tx} (${t[tx]}) sobre --${bg} (${t[bg]}) da ${c.toFixed(2)}:1`);
  }
  assert.ok(contraste("#ffffff", t.navy) >= 7, "blanco sobre marino");
  assert.ok(contraste(t["gold-fill"], t.navy) >= 4.5, "dorado sobre marino");
});

test("tema oscuro: los tokens de texto alcanzan 4,5:1 sobre sus superficies", () => {
  const claro = tokens(section(/^:root \{/m));
  const oscuro = { ...claro, ...tokens(section(/^:root\[data-theme="dark"\] \{/m)) };
  for (const tx of TEXTO) for (const bg of FONDO) {
    const c = contraste(oscuro[tx], oscuro[bg]);
    assert.ok(c >= 4.5, `oscuro: --${tx} (${oscuro[tx]}) sobre --${bg} (${oscuro[bg]}) da ${c.toFixed(2)}:1`);
  }
});
