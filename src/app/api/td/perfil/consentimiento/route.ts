import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { acceptConsent } from "@/server/store";

// POST /api/td/perfil/consentimiento — acepta la política de tratamiento de datos (primer ingreso).
export const POST = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const r = await acceptConsent(user);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, at: r.at });
});
