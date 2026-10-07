import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hydrateFromDb } from "@/server/store";

/** Todas las rutas /api/td/* exigen sesión. */
export async function guard() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return null;
}
