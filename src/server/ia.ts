// Asistencia con OpenAI (integración opcional configurada en Administración →
// Integraciones). Una sola función: pregunta y respuesta en JSON. Sin clave
// configurada, devuelve null y la plataforma sigue funcionando sin sugerencias.
import { effectiveIntegration } from "@/server/store";
import { esModeloAnterior } from "@/lib/modelos-ia";

export const iaDisponible = () => !!effectiveIntegration("openai");

const jsonDe = (text: string): unknown => { const i = text.indexOf("{"), k = text.lastIndexOf("}"); if (i < 0 || k <= i) throw new Error("El modelo no devolvió un objeto JSON; inténtalo de nuevo."); return JSON.parse(text.slice(i, k + 1)); };
type RespuestaApi = { output?: { type?: string; content?: { type?: string; text?: string; annotations?: { type?: string; url?: string }[] }[]; action?: { sources?: { url?: string }[] } }[]; output_text?: string };
const textoDe = (j: RespuestaApi) => j.output_text ?? (j.output ?? []).flatMap((o) => (o.type === "message" ? (o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "") : [])).join("");

/** Llama al modelo y devuelve el JSON que responde (o lanza con un mensaje claro). Los modelos anteriores (GPT-4) se
    llaman por la API de chat; los vigentes razonan antes de responder y se llaman por la API de respuestas, con un
    esfuerzo de razonamiento (`effort`) y un margen de tokens mayor, porque el razonamiento cuenta como salida. */
export async function chatJson(system: string, user: string, opts: { maxTokens?: number; timeoutMs?: number; effort?: "low" | "medium" | "high" } = {}): Promise<unknown> {
  const cfg = effectiveIntegration("openai");
  if (!cfg) throw new Error("OpenAI no está configurado en Administración → Integraciones.");
  const model = cfg.fields.model.trim() || "gpt-4o-mini", anterior = esModeloAnterior(model), maxTokens = opts.maxTokens ?? 1800;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? (anterior ? 45_000 : 55_000));
  const post = (path: string, body: Record<string, unknown>) => fetch(`https://api.openai.com/v1/${path}`, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.fields.apiKey.trim()}` }, body: JSON.stringify(body) });
  const chat = async (extra: Record<string, unknown>) => {
    const res = await post("chat/completions", { model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }], ...extra });
    if (!res.ok) { const e = await res.text().catch(() => ""); throw new Error(`OpenAI respondió ${res.status}${e ? ": " + e.slice(0, 200) : ""}`); }
    const j = await res.json() as { choices?: { message?: { content?: string } }[] };
    return jsonDe(j.choices?.[0]?.message?.content ?? "");
  };
  try {
    if (anterior) return await chat({ temperature: 0.4, max_tokens: maxTokens });
    const res = await post("responses", { model, instructions: system, input: user, max_output_tokens: Math.max(8000, maxTokens * 3), reasoning: { effort: opts.effort ?? "low" }, text: { format: { type: "json_object" } } });
    // si la API de respuestas rechaza la petición, se intenta por la de chat con los parámetros que admiten los modelos vigentes
    if (res.status === 400) return await chat({ max_completion_tokens: Math.max(8000, maxTokens * 3), reasoning_effort: opts.effort ?? "low" });
    if (!res.ok) { const e = await res.text().catch(() => ""); throw new Error(`OpenAI respondió ${res.status}${e ? ": " + e.slice(0, 200) : ""}`); }
    return jsonDe(textoDe(await res.json() as RespuestaApi));
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("OpenAI tardó demasiado en responder; inténtalo de nuevo.");
    if (e instanceof SyntaxError) throw new Error("El modelo devolvió una respuesta que no se pudo leer; inténtalo de nuevo.");
    throw e;
  } finally { clearTimeout(t); }
}

/** Pregunta al modelo con búsqueda en la web (API de respuestas de OpenAI) y devuelve el JSON que responde
    junto con las direcciones de las páginas que consultó o citó. Con esas direcciones se comprueba que cada
    fuente declarada existe entre lo que el modelo abrió de verdad. */
export async function buscarJson(system: string, user: string, opts: { timeoutMs?: number; country?: string; maxTokens?: number } = {}): Promise<{ data: unknown; urls: string[] }> {
  const cfg = effectiveIntegration("openai");
  if (!cfg) throw new Error("OpenAI no está configurado en Administración → Integraciones.");
  const model = cfg.fields.model.trim() || "gpt-4o-mini";
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 170_000);
  const pedir = (tool: Record<string, unknown>, extra: Record<string, unknown>) => fetch("https://api.openai.com/v1/responses", {
    method: "POST", signal: ctrl.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.fields.apiKey.trim()}` },
    body: JSON.stringify({ model, instructions: system, input: user, tools: [tool], tool_choice: "required", max_output_tokens: opts.maxTokens ?? (esModeloAnterior(model) ? 9000 : 20000), ...(esModeloAnterior(model) ? {} : { reasoning: { effort: "low" } }), ...extra }),
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
