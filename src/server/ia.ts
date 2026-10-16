// Asistencia con OpenAI (integración opcional configurada en Administración →
// Integraciones). Una sola función: pregunta y respuesta en JSON. Sin clave
// configurada, devuelve null y la plataforma sigue funcionando sin sugerencias.
import { effectiveIntegration } from "@/server/store";

export const iaDisponible = () => !!effectiveIntegration("openai");

/** Llama al modelo y devuelve el JSON que responde (o lanza con un mensaje claro). */
export async function chatJson(system: string, user: string, opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<unknown> {
  const cfg = effectiveIntegration("openai");
  if (!cfg) throw new Error("OpenAI no está configurado en Administración → Integraciones.");
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.fields.apiKey.trim()}` },
      body: JSON.stringify({ model: cfg.fields.model.trim() || "gpt-4o-mini", temperature: 0.4, max_tokens: opts.maxTokens ?? 1800, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!res.ok) { const e = await res.text().catch(() => ""); throw new Error(`OpenAI respondió ${res.status}${e ? ": " + e.slice(0, 160) : ""}`); }
    const j = await res.json() as { choices?: { message?: { content?: string } }[] };
    const text = j.choices?.[0]?.message?.content ?? "";
    return JSON.parse(text);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("OpenAI tardó demasiado en responder; inténtalo de nuevo.");
    throw e;
  } finally { clearTimeout(t); }
}
