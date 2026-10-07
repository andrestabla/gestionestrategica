import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { SECTOR, sectorOf, sectorComparison } from "@/data/sector";

// GET /api/td/sector[?key=] — el benchmark sectorial (Supersociedades) y la
// posición de la empresa en cada razón financiera.
export const GET = withTenant(async (req: Request, _ctx: unknown, _user) => {
  const key = new URL(req.url).searchParams.get("key");
  const sector = key ? sectorOf(key) : SECTOR;
  if (!sector) return NextResponse.json({ error: "Sector no disponible" }, { status: 404 });
  const { peers: _p, comparables: _c, ...summary } = sector;
  void _p; void _c;
  return NextResponse.json({ sector: summary, comparables: sector.comparables.length, comparison: sectorComparison(sector) });
});
