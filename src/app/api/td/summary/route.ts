import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import { guard } from "../_helpers";
import { executiveSummary } from "@/lib/logic";

export async function GET() {
  await hydrateFromDb();
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(executiveSummary());
}
