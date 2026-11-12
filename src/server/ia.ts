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

/** Pregunta al modelo con búsqueda en la web (API de respuestas de OpenAI) y devuelve el JSON que responde
    junto con las direcciones de las páginas que consultó o citó. Con esas direcciones se comprueba que cada
    fuente declarada existe entre lo que el modelo abrió de verdad. */
export async function buscarJson(system: string, user: string, opts: { timeoutMs?: number; country?: string; maxTokens?: number } = {}): Promise<{ data: unknown; urls: string[] }> {
  const cfg = effectiveIntegration("openai");
  if (!cfg) throw new Error("OpenAI no está configurado en Administración → Integraciones.");
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 170_000);
  const pedir = (tool: Record<string, unknown>, extra: Record<string, unknown>) => fetch("https://api.openai.com/v1/responses", {
    method: "POST", signal: ctrl.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.fields.apiKey.trim()}` },
    body: JSON.stringify({ model: cfg.fields.model.trim() || "gpt-4o-mini", instructions: system, input: user, tools: [tool], tool_choice: "required", max_output_tokens: opts.maxTokens ?? 9000, ...extra }),
  });
  try {
    const ubicacion = opts.country ? { user_location: { type: "approximate", country: opts.country } } : {};
    let res = await pedir({ type: "web_search", search_context_size: "high", ...ubicacion }, { include: ["web_search_call.action.sources"] });
    // modelos anteriores solo conocen la herramienta de búsqueda en su versión previa
    if (res.status === 400) res = await pedir({ type: "web_search_preview", ...ubicacion }, {});
    if (!res.ok) { const e = await res.text().catch(() => ""); throw new Error(`OpenAI respondió ${res.status}${e ? ": " + e.slice(0, 200) : ""}`); }
    const j = await res.json() as { output?: { type?: string; content?: { type?: string; text?: string; annotations?: { type?: string; url?: string }[] }[]; action?: { sources?: { url?: string }[] } }[] };
    const urls = new Set<string>(); let text = "";
    for (const item of j.output ?? []) {
      if (item.type === "web_search_call") for (const s of item.action?.sources ?? []) if (s.url) urls.add(s.url);
      if (item.type === "message") for (const c of item.content ?? []) { if (c.type === "output_text" && c.text) text += c.text; for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) urls.add(a.url); }
    }
    const i = text.indexOf("{"), k = text.lastIndexOf("}");
    if (i < 0 || k <= i) throw new Error("El modelo no devolvió la investigación en el formato esperado; inténtalo de nuevo.");
    let data: unknown;
    try { data = JSON.parse(text.slice(i, k + 1)); } catch { throw new Error("El modelo devolvió una investigación que no se pudo leer; inténtalo de nuevo."); }
    return { data, urls: [...urls] };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("La investigación tardó demasiado; inténtalo de nuevo.");
    throw e;
  } finally { clearTimeout(t); }
}
