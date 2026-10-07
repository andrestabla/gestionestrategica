import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { withTenant } from "../_helpers";
import { publicToken } from "@/lib/public-token";
import { catalog } from "@/server/store";

// Devuelve la URL pública de solo lectura (solo para usuarios autenticados).
export const GET = withTenant(async (req: Request, _ctx: unknown, _user) => {
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    url: `${origin}/p/${catalog().company.slug}-${publicToken(catalog().company.slug)}`,
  });
});
