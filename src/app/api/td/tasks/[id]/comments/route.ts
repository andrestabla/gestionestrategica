import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addComment, getComments, hydrateFromDb } from "@/server/store";

// POST /api/td/tasks/:id/comments — comentar es deliberación: todos los roles.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = addComment(user, id, String(body?.text ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ comment: result.comment, comments: getComments(id) });
}
