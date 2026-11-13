import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { withTenant } from "../_helpers";
import { publicToken } from "@/lib/public-token";
import { catalog } from "@/server/store";
import { originOf } from "@/app/api/td/convencion/acceso/route";

// Devuelve la URL pública de solo lectura. El enlace no vence, así que lo obtiene solo quien puede compartirlo:
// el advisor, el líder y el administrador (no quien entró por el QR de la convención).
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (user.qr || !["ADMIN", "CONSULTOR", "LIDER"].includes(user.role)) return NextResponse.json({ error: "El enlace público lo comparte el advisor o el líder." }, { status: 403 });
  const origin = originOf(req);
  return NextResponse.json({
    url: `${origin}/p/${catalog().company.slug}-${publicToken(catalog().company.slug)}`,
  });
});
