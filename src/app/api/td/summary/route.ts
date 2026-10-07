import { NextResponse } from "next/server";
import { hydrateFromDb, tenantView } from "@/server/store";
import { withTenant } from "../_helpers";
import { executiveSummary } from "@/lib/logic";

export const GET = withTenant(async (_req: Request, _ctx: unknown, _user) => {
  return NextResponse.json(executiveSummary(tenantView()));
});
