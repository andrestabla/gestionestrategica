import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUsers, createUser, updateUser, hydrateFromDb } from "@/server/store";
import { can } from "@/lib/permissions";

// GET/POST/PATCH /api/td/users — administración de usuarios (manage_users).
export async function GET() {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can(user, "manage_users")) {
    return NextResponse.json({ error: "Solo el equipo consultor administra usuarios." }, { status: 403 });
  }
  return NextResponse.json({ users: getUsers() });
}

export async function POST(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const result = createUser(user, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ user: result.user }, { status: 201 });
}

export async function PATCH(req: Request) {
  await hydrateFromDb();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ error: "Cuerpo inválido: falta email" }, { status: 400 });
  const result = updateUser(user, body.email, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ user: result.user });
}
