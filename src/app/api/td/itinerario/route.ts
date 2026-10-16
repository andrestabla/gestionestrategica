import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { itineraryOf, itineraryComments, setItinerary, publishItinerary, addItineraryComment, resolveItineraryComment, deleteItineraryComment, setMomentFiles, removeItineraryFile, addItineraryFile, itineraryFileOf } from "@/server/store";
import { deleteObject } from "@/server/storage";
import { can } from "@/lib/permissions";
import { itineraryPublicPath, participantsAsItinerary, fileIdFrom, fileKindOf, FILE_TYPES } from "@/lib/itinerario";
import { originOf } from "../convencion/acceso/route";

// GET /api/td/itinerario — itinerario de la empresa activa, comentarios y, para
// quien lo administra, el enlace público. Quien entró por el QR de la
// convención (o no administra el catálogo) recibe la agenda de participantes:
// horario, momento, quién y descripción, sin logística ni comentarios. POST { op, … } para cargar
// (op: "set", itinerary), publicar (op: "publish", on, regenerate), comentar
// (op: "comment", momentId, kind, text), atender (op: "resolve", id, resolved)
// o eliminar un comentario (op: "delete", id); vincular materiales a un momento
// (op: "files", momentId, fileIds); añadir un enlace como material (op: "link",
// name, url, group?) o retirar un material (op: "removeFile", id).
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  const it = itineraryOf();
  const manage = can(user, "manage_catalog") && !user.qr;
  return NextResponse.json({
    itinerary: it ? (manage ? it : participantsAsItinerary(it)) : null,
    audience: manage ? "organizador" : "participantes",
    comments: manage ? itineraryComments() : [],
    publicUrl: it?.token && manage ? `${originOf(req)}${itineraryPublicPath(user.company!.slug, it.token)}` : null,
    publicUrlP: it?.tokenP && manage ? `${originOf(req)}${itineraryPublicPath(user.company!.slug, it.tokenP)}` : null,
    canManage: manage,
  });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null);
  if (!body?.op) return NextResponse.json({ error: "Falta la operación" }, { status: 400 });
  let r;
  switch (body.op) {
    case "set": r = setItinerary(user, body.itinerary); break;
    case "publish": r = publishItinerary(user, !!body.on, !!body.regenerate, body.audience === "participantes" ? "participantes" : "organizador"); break;
    case "comment": r = addItineraryComment(body, user); break;
    case "resolve": r = resolveItineraryComment(user, body.id, body.resolved !== false); break;
    case "delete": r = deleteItineraryComment(user, body.id); break;
    case "files": r = setMomentFiles(user, body.momentId, body.fileIds); break;
    case "link": { const name = String(body.name ?? "").trim(); const id = String(body.id ?? fileIdFrom(name || "enlace")); r = addItineraryFile(user, { id, name: name || String(body.url ?? ""), size: 0, kind: "link", url: String(body.url ?? "").trim(), group: String(body.group ?? "") || undefined }); break; }
    case "removeFile": { const f = itineraryFileOf(String(body.id ?? "")); const kind = f ? fileKindOf(f) : "pdf"; r = removeItineraryFile(user, body.id); if (r.ok && kind !== "link") await deleteObject("materiales", `${user.company!.slug}/${String(body.id)}.${FILE_TYPES[kind].ext}`); break; }
    default: return NextResponse.json({ error: "Operación desconocida" }, { status: 400 });
  }
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const it = itineraryOf();
  return NextResponse.json({ ok: true, itinerary: it ?? null, comments: itineraryComments(), publicUrl: it?.token ? `${originOf(req)}${itineraryPublicPath(user.company!.slug, it.token)}` : null, publicUrlP: it?.tokenP ? `${originOf(req)}${itineraryPublicPath(user.company!.slug, it.tokenP)}` : null });
});
