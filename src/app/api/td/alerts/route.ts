import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { withTenant } from "../_helpers";
import { buildAlerts } from "@/lib/logic";

export const GET = withTenant(async (_req: Request, _ctx: unknown, _user) => {
  return NextResponse.json({ alerts: buildAlerts() });
});
