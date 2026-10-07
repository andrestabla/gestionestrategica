import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { SECTOR, sectorOf, sectorComparison } from "@/data/sector";

// GET /api/td/sector[?key=] — el benchmark sectorial (Supersociedades) y la
// posición de la empresa en cada razón financiera.
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key");
  const sector = key ? sectorOf(key) : SECTOR;
  if (!sector) return NextResponse.json({ error: "Sector no disponible" }, { status: 404 });
  const { peers: _p, comparables: _c, ...summary } = sector;
  void _p; void _c;
  return NextResponse.json({ sector: summary, comparables: sector.comparables.length, comparison: sectorComparison(sector) });
}
