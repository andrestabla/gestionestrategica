import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { tenantView } from "@/server/store";
import { sectorFor, sectorOf, sectorComparison } from "@/data/sector";

// GET /api/td/sector[?key=] — el benchmark sectorial (Supersociedades) y la
// posición de la empresa activa en cada razón financiera. Sin `key` se usa el
// sector del catálogo de la empresa; con `key` se consulta otro sector (la
// comparación sigue siendo la de la empresa frente a su propio sector). Si la
// empresa no tiene estados financieros registrados, `comparison` es [].
export const GET = withTenant(async (req: Request, _ctx: unknown, _user) => {
  const key = new URL(req.url).searchParams.get("key");
  const view = tenantView();
  const sector = key ? sectorOf(key) : sectorFor(view.catalog);
  if (!sector) return NextResponse.json({ error: "Sector no disponible" }, { status: 404 });
  const { peers: _p, comparables: _c, ...summary } = sector;
  void _p; void _c;
  return NextResponse.json({
    sector: summary,
    comparables: sector.comparables.length,
    hasFinancials: view.catalog.financials !== null,
    comparison: sectorComparison(view.catalog),
  });
});
