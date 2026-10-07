import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { getUsers, createUser, updateUser, moveUser, getPlatformUsers } from "@/server/store";
import { can } from "@/lib/permissions";

// GET/POST/PATCH /api/td/users — administración de usuarios (manage_users).
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) {
    return NextResponse.json({ error: "Solo el equipo consultor administra usuarios." }, { status: 403 });
  }
  return NextResponse.json({ users: getUsers(), platformUsers: user.role === "ADMIN" ? getPlatformUsers() : [], company: user.company ?? null });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const result = createUser(user, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ user: result.user }, { status: 201 });
});

export const PATCH = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ error: "Cuerpo inválido: falta email" }, { status: 400 });
  if (body.companySlug) {
    const moved = await moveUser(user, body.email, String(body.companySlug));
    if (!moved.ok) return NextResponse.json({ error: moved.error }, { status: moved.status });
    return NextResponse.json({ ok: true });
  }
  const result = updateUser(user, body.email, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ user: result.user });
});
