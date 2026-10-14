import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { itineraryOf, itineraryComments, setItinerary, publishItinerary, addItineraryComment, resolveItineraryComment, deleteItineraryComment } from "@/server/store";
import { can } from "@/lib/permissions";
import { itineraryPublicPath, publicItinerary } from "@/lib/itinerario";
import { originOf } from "../convencion/acceso/route";

// GET /api/td/itinerario — itinerario de la empresa activa, comentarios y, para
// quien lo administra, el enlace público. POST { op, … } para cargar
// (op: "set", itinerary), publicar (op: "publish", on, regenerate), comentar
// (op: "comment", momentId, kind, text), atender (op: "resolve", id, resolved)
// o eliminar un comentario (op: "delete", id).
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const it = itineraryOf();
  const manage = can(user, "manage_catalog");
  return NextResponse.json({
    itinerary: it ? (manage ? it : publicItinerary(it)) : null,
    comments: itineraryComments(),
    publicUrl: it?.token && manage ? `${originOf(req)}${itineraryPublicPath(user.company!.slug, it.token)}` : null,
    canManage: manage,
  });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.op) return NextResponse.json({ error: "Falta la operación" }, { status: 400 });
  let r;
  switch (body.op) {
    case "set": r = setItinerary(user, body.itinerary); break;
    case "publish": r = publishItinerary(user, !!body.on, !!body.regenerate); break;
    case "comment": r = addItineraryComment(body, user); break;
    case "resolve": r = resolveItineraryComment(user, body.id, body.resolved !== false); break;
    case "delete": r = deleteItineraryComment(user, body.id); break;
    default: return NextResponse.json({ error: "Operación desconocida" }, { status: 400 });
  }
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const it = itineraryOf();
  return NextResponse.json({ ok: true, itinerary: it ?? null, comments: itineraryComments(), publicUrl: it?.token ? `${originOf(req)}${itineraryPublicPath(user.company!.slug, it.token)}` : null });
});
