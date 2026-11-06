import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { catalog, puedeRevisarCap } from "@/server/store";
import { chatJson, iaDisponible } from "@/server/ia";
import { encargoCapacidades, parsePropuestaCapacidades } from "@/lib/capacidades";
import { contextoCapacidades } from "../_contexto";

// POST /api/td/capacidades/proponer { iniId } — lectura inicial del checklist (nivel por afirmación, justificación y
// qué haría falta) con el contexto de la empresa, para que quien revisa confirme o corrija. No guarda nada.
export const maxDuration = 90;
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!iaDisponible()) return NextResponse.json({ error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const ini = catalog().initiatives.find((i) => i.id === String(body?.iniId ?? ""));
  if (!ini) return NextResponse.json({ error: "La iniciativa no existe." }, { status: 404 });
  if (!puedeRevisarCap(user, ini)) return NextResponse.json({ error: "La lectura inicial la pide quien revisa la iniciativa." }, { status: 403 });
  const ctx = contextoCapacidades(ini.id)!;
  const { system, user: u } = encargoCapacidades(ctx);
  let raw: unknown;
  try { raw = await chatJson(system, u, { maxTokens: 3500, timeoutMs: 85_000 }); }
  catch (e) { return NextResponse.json({ error: `El modelo no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }
  const propuesta = parsePropuestaCapacidades(raw, ctx.checklist);
  if (!propuesta) return NextResponse.json({ error: "El modelo no devolvió una lectura utilizable; inténtalo de nuevo." }, { status: 502 });
  return NextResponse.json({ ok: true, propuesta });
});
