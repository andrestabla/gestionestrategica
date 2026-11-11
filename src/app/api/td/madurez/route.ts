import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { getMadurez, captureMadurez, setMadSafeguard, publishMadurez, flushOrError } from "@/server/store";

// GET /api/td/madurez — instrumento que aplica a la empresa (empresa o institución
// educativa), captura vigente, salvaguardas, cortes publicados y lo que el usuario puede hacer.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => NextResponse.json(getMadurez(user)));

// POST /api/td/madurez — { op: "capturar", id, patch } registra percepción (cualquier persona de la
// empresa) o evidencia, nivel, meta, hallazgo y recomendación (advisor); { op: "salvaguarda", id,
// status, note } evalúa una salvaguarda; { op: "publicar", label } publica el corte. El store exige
// permisos (403) y reglas (422) con explicación.
export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const r = body?.op === "capturar" ? captureMadurez(user, body.id, body.patch)
    : body?.op === "salvaguarda" ? setMadSafeguard(user, body.id, body.status, body.note)
    : body?.op === "publicar" ? publishMadurez(user, body.label)
    : { ok: false as const, status: 400, error: "Operación no reconocida." };
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError();
  if (e) return NextResponse.json({ error: e }, { status: 500 });
  return NextResponse.json(getMadurez(user));
});
