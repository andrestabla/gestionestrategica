import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { randomBytes } from "crypto";
import { getUsers, createUser, updateUser, moveUser, getPlatformUsers, setUserPassword, removeUser, flushOrError } from "@/server/store";
import { can } from "@/lib/permissions";
import { passwordOk } from "@/lib/recuperacion";
import { welcomeMail, passwordFromBytes } from "@/lib/correos";
import { sendMail, mailConfigured } from "@/server/mail";
import { originOf } from "@/app/api/td/convencion/acceso/route";

// GET/POST/PATCH/DELETE /api/td/users — administración de usuarios (manage_users).
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) {
    return NextResponse.json({ error: "Solo el equipo consultor administra usuarios." }, { status: 403 });
  }
  return NextResponse.json({ users: getUsers(), platformUsers: user.role === "ADMIN" ? getPlatformUsers() : [], company: user.company ?? null });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  // contraseña: "auto" la genera el servidor; una cadena la fija tal cual; sin ella, la cuenta queda sin contraseña (entra por QR o por «¿Olvidaste tu contraseña?»)
  const wantsPassword = body.password === "auto" || typeof body.password === "string";
  if (typeof body.password === "string" && body.password !== "auto" && !passwordOk(body.password)) return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres." }, { status: 422 });
  if (body.sendWelcome && !mailConfigured()) return NextResponse.json({ error: "El envío de correo no está configurado (Administración → Integraciones → AWS SES)." }, { status: 503 });
  if (body.sendWelcome && !wantsPassword) return NextResponse.json({ error: "Para enviar el correo de bienvenida la cuenta necesita contraseña (manual o automática)." }, { status: 422 });
  const result = createUser(user, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  let password: string | undefined; let generated = false;
  if (wantsPassword) {
    generated = body.password === "auto";
    password = generated ? passwordFromBytes(randomBytes(12)) : String(body.password);
    const p = await setUserPassword(user, result.user.email, password);
    if (!p.ok) return NextResponse.json({ user: result.user, error: `Cuenta creada, pero no se pudo fijar la contraseña: ${p.error}` }, { status: 201 });
  }
  let mailed = false; let mailError: string | undefined;
  if (body.sendWelcome && password) {
    const slug = user.company?.slug ?? "";
    const m = welcomeMail({ name: result.user.name, company: user.company?.name ?? "la empresa", loginLink: `${originOf(req)}${slug ? `/${slug}` : ""}/login`, email: result.user.email, password, by: user.name });
    const sent = await sendMail({ to: result.user.email, subject: m.subject, text: m.text, html: m.html });
    mailed = sent.ok; if (!sent.ok) mailError = sent.error;
  }
  return NextResponse.json({ user: result.user, ...(generated ? { password } : {}), mailed, ...(mailError ? { mailError } : {}) }, { status: 201 });
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

export const DELETE = withTenant(async (req: Request, _ctx: unknown, user) => {
  const email = new URL(req.url).searchParams.get("email") ?? "";
  if (!email) return NextResponse.json({ error: "Falta el correo." }, { status: 400 });
  const r = removeUser(user, email);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const guardado = await flushOrError(); if (guardado) return NextResponse.json({ error: guardado }, { status: 500 });
  return NextResponse.json({ ok: true });
});
