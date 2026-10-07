import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { inScope } from "@/lib/permissions";
import { buildAlerts } from "@/lib/logic";
import { getComments, getTask, getNotifRead, markNotifRead, tenantView, catalog } from "@/server/store";

// GET /api/td/notifications — el buzón del usuario: alertas del motor
// dirigidas a su rol/línea + comentarios de su ámbito (las menciones llegan
// siempre). POST marca leídas.

export type Notification = {
  id: string;
  kind: string;
  severity: 1 | 2 | 3;
  title: string;
  detail: string;
  href: string;
  read: boolean;
  mention?: boolean;
};

export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {

  const read = getNotifRead(user.email);
  const items: Notification[] = [];

  // 1 · alertas del motor, dirigidas por rol y línea
  for (const a of buildAlerts(tenantView())) {
    const mine =
      user.role === "ADMIN" || user.role === "CONSULTOR" || user.role === "LIDER" ? true
      : user.role === "RESPONSABLE" ? inScope(user, { line: a.line })
      : a.severity <= 2;                       // directivo: lo estratégico
    if (!mine) continue;
    items.push({
      id: a.id, kind: a.kind, severity: a.severity,
      title: a.title, detail: a.detail, href: a.href,
      read: read.has(a.id),
    });
  }

  // 2 · comentarios del ámbito (excluye los propios); menciones siempre
  const firstName = user.name.split(" ")[0].toLowerCase();
  for (const c of getComments()) {
    if (c.author === user.name) continue;
    const t = getTask(c.taskId);
    const ini = t ? catalog().initiatives.find((i) => i.id === t.iniId) : undefined;
    const mention = c.text.includes("@") && c.text.toLowerCase().includes(firstName);
    const mine =
      user.role === "ADMIN" || user.role === "CONSULTOR" || user.role === "LIDER" ? true
      : user.role === "RESPONSABLE" ? (ini ? inScope(user, ini) : false)
      : false;
    if (!mine && !mention) continue;
    const id = `comment-${c.id}`;
    items.push({
      id, kind: mention ? "MENCION" : "COMENTARIO",
      severity: mention ? 2 : 3,
      title: `${c.author} comentó en ${c.taskId}`,
      detail: c.text.length > 140 ? c.text.slice(0, 139) + "…" : c.text,
      href: "/panel/proyectos",
      read: read.has(id),
      mention,
    });
  }

  items.sort((a, b) => Number(a.read) - Number(b.read) || a.severity - b.severity);
  return NextResponse.json({
    items,
    unread: items.filter((i) => !i.read).length,
  });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.ids)) {
    return NextResponse.json({ error: "Cuerpo inválido: ids[]" }, { status: 400 });
  }
  markNotifRead(user.email, body.ids);
  return NextResponse.json({ ok: true });
});
