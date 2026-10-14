// Itinerario de la convención: validación, publicación con enlace, y comentarios
// metodológicos o logísticos (desde la sesión y desde el enlace público).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, setItinerary, publishItinerary, publicItineraryOf, itineraryOf, addItineraryComment, resolveItineraryComment, deleteItineraryComment, itineraryComments } from "../src/server/store";
import { parseItinerary, publicItinerary, itineraryPublicPath } from "../src/lib/itinerario";
import type { SessionUser } from "../src/lib/session";

const advisor: SessionUser = { email: "c@a.co", name: "Advisor", role: "CONSULTOR", company: { slug: "andina", name: "Andina", shortName: "Andina" } };
const junta: SessionUser = { email: "j@a.co", name: "Junta Directiva", role: "DIRECTIVO" };
const IT = { title: "Convención de prueba", days: [{ id: "d1", title: "Día 1 · miércoles" }], items: [
  { id: "d1-01", day: "d1", time: "8:00", minutes: 30, title: "Apertura", kind: "conferencia", who: "Carmenza", method: "Enmarcar.", materials: ["Deck 01"], platform: "Deck", output: "Marco" },
  { id: "d1-02", day: "d1", time: "8:30", minutes: 60, title: "Mesa", kind: "mesa", who: "Directivos", method: "Rondas.", materials: [], platform: "Dirección", output: "Ternas" },
] };
const inAndina = <T,>(fn: () => Promise<T> | T) => runWithTenant("andina", async () => fn());

test("parseItinerary valida días, momentos y tipos", () => {
  const ok = parseItinerary(IT); assert.equal(ok.ok, true);
  assert.equal((ok as { itinerary: { items: { kind: string }[] } }).itinerary.items[0].kind, "conferencia");
  assert.equal(parseItinerary({ title: "x" }).ok, false);
  assert.equal(parseItinerary({ ...IT, items: [{ ...IT.items[0], day: "d9" }] }).ok, false);
  assert.equal(parseItinerary({ ...IT, items: [IT.items[0], IT.items[0]] }).ok, false);
  const k = parseItinerary({ ...IT, items: [{ ...IT.items[0], kind: "raro" }] });
  assert.equal((k as { itinerary: { items: { kind: string }[] } }).itinerary.items[0].kind, "plenaria");   // tipo desconocido → plenaria
  assert.equal(itineraryPublicPath("cresio", "tok"), "/cresio/p/itinerario/tok");
});

test("cargar, publicar sin login y regenerar el enlace", async () => {
  await inAndina(() => {
    resetStore();
    assert.equal(setItinerary(junta, IT).ok, false);
    const r = setItinerary(advisor, IT); assert.equal(r.ok, true);
    assert.equal(itineraryOf()?.public, false);
    assert.equal(publicItineraryOf("cualquiera"), null);
    const p = publishItinerary(advisor, true); assert.equal(p.ok, true);
    const tok = (p as { itinerary: { token: string } }).itinerary.token;
    assert.ok(tok.length >= 16);
    assert.equal(publicItineraryOf(tok)?.title, "Convención de prueba");
    assert.equal("token" in publicItinerary(itineraryOf()!), false);                  // el público no ve el token
    assert.equal(publishItinerary(junta, false).ok, false);
    publishItinerary(advisor, false);
    assert.equal(publicItineraryOf(tok), null);                                         // retirado: el enlace no abre
    const r2 = publishItinerary(advisor, true, true);
    const tok2 = (r2 as { itinerary: { token: string } }).itinerary.token;
    assert.notEqual(tok2, tok); assert.equal(publicItineraryOf(tok), null); assert.ok(publicItineraryOf(tok2));
    // recargar el itinerario conserva publicación y enlace
    setItinerary(advisor, { ...IT, title: "Convención v2" });
    assert.equal(itineraryOf()?.token, tok2); assert.equal(itineraryOf()?.public, true);
  });
});

test("comentarios: desde la sesión y desde el enlace público; atender y eliminar", async () => {
  await inAndina(() => {
    resetStore(); setItinerary(advisor, IT); publishItinerary(advisor, true);
    const c1 = addItineraryComment({ momentId: "d1-02", kind: "logistico", text: "Faltan adhesivos de tres colores." }, junta);
    assert.equal(c1.ok, true); assert.equal((c1 as { comment: { author: string; via: string } }).comment.author, "Junta Directiva");
    // el comentario público exige aceptar el tratamiento de datos
    assert.equal(addItineraryComment({ momentId: "d1-02", kind: "metodologico", text: "Reducir H3 a 45 segundos.", author: "Yorman Nieto" }, { public: true }).ok, false);
    const c2 = addItineraryComment({ momentId: "d1-02", kind: "metodologico", text: "Reducir H3 a 45 segundos.", author: "Yorman Nieto", email: "Yorman@Cresio.ec", consent: true }, { public: true });
    assert.equal(c2.ok, true); assert.equal((c2 as { comment: { via: string; email?: string } }).comment.via, "publico");
    assert.equal((c2 as { comment: { email?: string } }).comment.email, "yorman@cresio.ec");
    assert.equal(addItineraryComment({ momentId: "d1-09", kind: "logistico", text: "x" }, junta).ok, false);
    assert.equal(addItineraryComment({ momentId: "d1-02", kind: "otro", text: "xxx" }, junta).ok, false);
    assert.equal(addItineraryComment({ momentId: "d1-02", kind: "logistico", text: "sin nombre", consent: true }, { public: true }).ok, false);
    assert.equal(itineraryComments().length, 2);
    const id = (c1 as { comment: { id: string } }).comment.id;
    assert.equal(resolveItineraryComment(junta, id, true).ok, false);
    const r = resolveItineraryComment(advisor, id, true); assert.equal(r.ok, true);
    assert.ok((r as { comment: { resolvedAt?: string } }).comment.resolvedAt);
    assert.equal(deleteItineraryComment(junta, id).ok, false);
    assert.equal(deleteItineraryComment(advisor, id).ok, true);
    assert.equal(itineraryComments().length, 1);
  });
});

test("materiales: registro, vínculo por momento y retiro", async () => {
  const { addItineraryFile, removeItineraryFile, setMomentFiles, itineraryFileOf } = await import("../src/server/store");
  await inAndina(() => {
    resetStore(); setItinerary(advisor, IT);
    assert.equal(addItineraryFile(junta, { id: "deck-01", name: "Deck 01", size: 10 }).ok, false);
    const a = addItineraryFile(advisor, { id: "deck-01", name: "Deck 01", size: 1024, group: "presentacion" }); assert.equal(a.ok, true);
    addItineraryFile(advisor, { id: "plantilla-01", name: "Plantilla 01", size: 2048 });
    assert.equal(itineraryOf()?.files?.length, 2);
    assert.equal(addItineraryFile(advisor, { id: "MAL ID", name: "x", size: 1 }).ok, false);
    const v = setMomentFiles(advisor, "d1-02", ["deck-01", "inexistente", "plantilla-01"]); assert.equal(v.ok, true);
    assert.deepEqual(itineraryOf()?.items.find((x) => x.id === "d1-02")?.files, ["deck-01", "plantilla-01"]);
    assert.equal(itineraryFileOf("deck-01")?.name, "Deck 01");
    publishItinerary(advisor, true); const tok = itineraryOf()!.token!;
    assert.equal(itineraryFileOf("deck-01", tok)?.id, "deck-01"); assert.equal(itineraryFileOf("deck-01", "otro-token-no-valido-xx"), null);
    // recargar el itinerario desde JSON conserva archivos y vínculos válidos
    const again = setItinerary(advisor, { ...IT, files: itineraryOf()!.files, items: IT.items.map((x) => (x.id === "d1-02" ? { ...x, files: ["deck-01", "fantasma"] } : x)) });
    assert.equal(again.ok, true); assert.deepEqual(itineraryOf()?.items.find((x) => x.id === "d1-02")?.files, ["deck-01"]);
    // una carga nueva sin la clave «files» (p. ej. scripts/itinerario.ts) conserva los materiales y los vínculos
    const reload = setItinerary(advisor, { ...IT, items: IT.items.map((x) => ({ ...x })) }); assert.equal(reload.ok, true);
    assert.equal(itineraryOf()?.files?.length, 2);
    assert.deepEqual(itineraryOf()?.items.find((x) => x.id === "d1-02")?.files, ["deck-01"]);
    const r = removeItineraryFile(advisor, "deck-01"); assert.equal(r.ok, true);
    assert.equal(itineraryOf()?.items.find((x) => x.id === "d1-02")?.files, undefined);
    assert.equal(removeItineraryFile(advisor, "deck-01").ok, false);
  });
});
