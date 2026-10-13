import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { withTenant } from "../../../_helpers";
import { accessLinks } from "@/server/store";
import { accessUrl, isAccessSection } from "@/lib/acceso";
import { originOf } from "../route";

// GET /api/td/convencion/acceso/qr?section=okr — el QR de la sección en SVG
// (imprimible; apunta al enlace vigente de esa sección).
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const section = new URL(req.url).searchParams.get("section");
  if (!isAccessSection(section)) return NextResponse.json({ error: "Sección desconocida" }, { status: 400 });
  const r = accessLinks(user);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const a = r.access.find((x) => x.section === section)!;
  const svg = await QRCode.toString(accessUrl(originOf(req), user.company!.slug, a.token), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0D1B2A", light: "#FFFFFF" } });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
});
