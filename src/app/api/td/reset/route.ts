import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { can } from "@/lib/permissions";
import { resetStore } from "@/server/store";

// POST /api/td/reset — restablece los datos demo en memoria. Es una herramienta de desarrollo: en producción no
// existe (vaciaría el estado en memoria de la empresa y los códigos pendientes de todas).
export const POST = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "No disponible." }, { status: 404 });
  if (!can(user, "manage_users")) {
    return NextResponse.json({ error: "Solo el equipo consultor puede restablecer la demo." }, { status: 403 });
  }
  resetStore();
  return NextResponse.json({ ok: true });
});
