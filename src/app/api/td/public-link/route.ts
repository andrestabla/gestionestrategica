import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { guard } from "../_helpers";
import { publicToken } from "@/lib/public-token";
import { INSTITUTION } from "@/data/demo";

// Devuelve la URL pública de solo lectura (solo para usuarios autenticados).
export async function GET(req: Request) {
  await hydrateFromDb();
  const denied = await guard();
  if (denied) return denied;
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    url: `${origin}/p/${INSTITUTION.slug}-${publicToken(INSTITUTION.slug)}`,
  });
}
