import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { can } from "@/lib/permissions";
import { resetStore } from "@/server/store";

// POST /api/td/reset — restablece los datos demo (solo CONSULTOR).
export const POST = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) {
    return NextResponse.json({ error: "Solo el equipo consultor puede restablecer la demo." }, { status: 403 });
  }
  resetStore();
  return NextResponse.json({ ok: true });
});
