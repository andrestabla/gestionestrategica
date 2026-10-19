import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { activityFeed } from "@/server/store";
import { can } from "@/lib/permissions";

// GET /api/td/actividad?since=<ISO>&limit=<n> — actividad en vivo de la empresa (quién hizo qué y cuándo),
// leída de la base para que se vea lo de todas las instancias. Solo quien administra usuarios.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Solo el equipo consultor ve la actividad en vivo." }, { status: 403 });
  const u = new URL(req.url);
  const r = await activityFeed({ since: u.searchParams.get("since") ?? undefined, limit: Number(u.searchParams.get("limit") ?? 200) || 200 });
  return NextResponse.json({ ...r, now: new Date().toISOString() });
});
