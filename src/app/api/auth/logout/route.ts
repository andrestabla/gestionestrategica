import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { clearSession } from "@/lib/session";

export async function POST() {
  await hydrateFromDb();
  await clearSession();
  return NextResponse.json({ ok: true });
}
