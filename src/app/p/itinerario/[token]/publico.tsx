"use client";

// Envoltorio público del itinerario: comenta con nombre y correo a través del
// API público; sin sesión ni edición.
import { useState } from "react";
import { ItinerarioView } from "@/components/itinerario";
import type { Itinerary, ItineraryComment, CommentKind } from "@/lib/itinerario";

export function PublicItinerario({ tenant, token, company, itinerary, comments: initial, audience = "organizador" }: {
  tenant: string; token: string; company: { name: string; shortName: string }; itinerary: Omit<Itinerary, "token" | "tokenP">; comments: ItineraryComment[]; audience?: "organizador" | "participantes";
}) {
  const [comments, setComments] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const comment = async (momentId: string, kind: CommentKind, text: string, author?: string, email?: string, consent?: boolean) => {
    setError(null);
    const res = await fetch("/api/public/itinerario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant, token, momentId, kind, text, author, email, consent }) });
    const j = await res.json().catch(() => null);
    if (!res.ok) { setError(j?.error ?? `Error ${res.status}`); return false; }
    setComments(j.comments); return true;
  };
  return (
    <main className="min-h-screen bg-surface-2">
      <ItinerarioView itinerary={itinerary} comments={comments} mode="publico" audience={audience} company={company} error={error} onComment={comment} publicRef={{ slug: tenant, token }} />
    </main>
  );
}
