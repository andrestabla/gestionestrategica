import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { resetStore, hydrateFromDb } from "@/server/store";

// POST /api/td/reset — restablece los datos demo (solo CONSULTOR).
export async function POST() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can(user, "manage_users")) {
    return NextResponse.json({ error: "Solo el equipo consultor puede restablecer la demo." }, { status: 403 });
  }
  resetStore();
  return NextResponse.json({ ok: true });
}
