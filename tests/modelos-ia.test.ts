import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, createCompany, effectiveIntegration, setIntegration, getIntegrationsMasked } from "../src/server/store";
import { OPENAI_MODELOS, esModeloAnterior } from "../src/lib/modelos-ia";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };

test("el modelo de OpenAI se elige de una lista y vale aunque la clave venga del entorno", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Modelos SA", template: "vacia" })).ok);
  const antes = { k: process.env.OPENAI_API_KEY, m: process.env.OPENAI_MODEL };
  process.env.OPENAI_API_KEY = "sk-prueba-0000000000000000000000"; delete process.env.OPENAI_MODEL;
  try {
    runWithTenant("modelos-sa", () => {
      assert.equal(effectiveIntegration("openai")?.fields.model, "gpt-4o-mini", "sin elegir, rige el modelo por defecto del entorno");
      const campo = () => getIntegrationsMasked().find((i) => i.key === "openai")!.fields.find((f) => f.key === "model")!;
      assert.deepEqual(campo().options?.map((o) => o.value), OPENAI_MODELOS.map((m) => m.value));
      assert.deepEqual(setIntegration(admin, "openai", { fields: { model: "gpt-6.1-sol" } }), { ok: true });
      const cfg = effectiveIntegration("openai")!;
      assert.equal(cfg.fields.model, "gpt-6.1-sol");
      assert.equal(cfg.fields.apiKey, process.env.OPENAI_API_KEY, "la clave sigue siendo la del entorno");
      assert.equal(campo().value, "gpt-6.1-sol");
      assert.equal(getIntegrationsMasked().find((i) => i.key === "openai")!.source, "entorno");
    });
  } finally { if (antes.k === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = antes.k; if (antes.m !== undefined) process.env.OPENAI_MODEL = antes.m; }
  assert.ok(esModeloAnterior("gpt-4o-mini") && esModeloAnterior("gpt-4.1") && !esModeloAnterior("gpt-6.1-sol") && !esModeloAnterior("gpt-6-luna"));
  assert.equal(OPENAI_MODELOS[0].value, "gpt-6.1-sol", "el recomendado va primero");
  assert.ok(OPENAI_MODELOS.find((m) => m.value === "gpt-4o-mini")?.retiro);
});
