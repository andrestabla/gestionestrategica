import { NextResponse } from "next/server";
import { withTenant } from "../../../_helpers";
import { addComment, getComments } from "@/server/store";

// POST /api/td/tasks/:id/comments — comentar es deliberación: todos los roles.
export const POST = withTenant(async (req: Request,
  { params }: { params: Promise<{ id: string }> }, user) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = addComment(user, id, String(body?.text ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ comment: result.comment, comments: getComments(id) });
});
