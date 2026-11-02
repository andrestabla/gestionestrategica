import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { ownProfile, updateOwnProfile, deleteOwnAccount, hasPassword, flushOrError } from "@/server/store";
import { setSession, clearSession } from "@/lib/session";

// GET    /api/td/perfil — datos de la propia cuenta.
// PATCH  /api/td/perfil { name } — actualiza los datos básicos (y la sesión).
// DELETE /api/td/perfil { password | confirm } — elimina la cuenta y toda su información; cierra la sesión.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  const p = ownProfile(user);
  if (!p) return NextResponse.json({ error: "La cuenta no existe." }, { status: 404 });
  return NextResponse.json({ ...p, tienePassword: await hasPassword(user.email), esAdmin: user.role === "ADMIN" });
});

export const PATCH = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  const r = updateOwnProfile(user, { name: body?.name });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  await setSession({ ...user, name: r.name });
  return NextResponse.json({ ok: true, name: r.name });
});

export const DELETE = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => ({}));
  const r = await deleteOwnAccount(user, { password: body?.password, confirm: body?.confirm });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const e = await flushOrError(); if (e) return NextResponse.json({ error: e }, { status: 500 });
  await clearSession();
  return NextResponse.json({ ok: true });
});
