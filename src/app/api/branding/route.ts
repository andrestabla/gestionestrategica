import { NextResponse } from "next/server";
import { getBranding, hydrateFromDb } from "@/server/store";

// GET /api/branding — configuración de marca PÚBLICA (el login la necesita
// antes de autenticar). No expone nada sensible: nombres, colores, textos
// e imágenes del acceso.
export async function GET() {
  await hydrateFromDb();
  return NextResponse.json({ branding: getBranding() });
}
