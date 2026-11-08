import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { saveChecklistCap, flushOrError, effectiveIntegration } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { can } from "@/lib/permissions";

import { encargoPersonalizarChecklist, parseChecklistPersonalizado } from "@/lib/capacidades";
import { contextoCapacidades } from "../_contexto";

// POST /api/td/capacidades/personalizar { iniId } — el advisor o el admin pide al modelo un checklist adaptado a la
// iniciativa y a la empresa (frentes fijos; afirmaciones, preguntas y niveles adaptados). Se guarda y rige desde ya.
export const maxDuration = 90;
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!(can(user, "manage_catalog") && (user.role === "ADMIN" || user.role === "CONSULTOR"))) return NextResponse.json({ error: "El checklist lo personaliza el advisor o el administrador." }, { status: 403 });
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const ctx = contextoCapacidades(String(body?.iniId ?? ""));
  if (!ctx) return NextResponse.json({ error: "La iniciativa no existe." }, { status: 404 });
  const { system, user: u } = encargoPersonalizarChecklist(ctx);
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 4000, timeoutMs: 85_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const parsed = parseChecklistPersonalizado(raw);
  if (!parsed) return NextResponse.json({ error: "El modelo no devolvió un checklist completo (cinco frentes con 2 o 3 afirmaciones); inténtalo de nuevo." }, { status: 502 });
  const r = saveChecklistCap(user, ctx.ini.id, parsed.frentes, parsed.resumen, effectiveIntegration("openai")?.fields.model?.trim() || "openai");
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json({ ok: true, checklist: r.checklist });
});
