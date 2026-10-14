import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hydrateCompanies, companyBySlug, publicItineraryOf, itineraryComments } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { publicItinerary } from "@/lib/itinerario";
import { PublicItinerario } from "./publico";

export const dynamic = "force-dynamic";

// /<empresa>/p/itinerario/<token>: itinerario público de la convención, sin
// sesión. El proxy deja la empresa en x-tenant; el token debe ser el vigente y
// el itinerario estar publicado.
export default async function ItinerarioPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = (await headers()).get("x-tenant");
  if (!tenant) notFound();
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) notFound();
  const data = await inTenant(c.slug, async () => { const it = publicItineraryOf(token); return it ? { itinerary: publicItinerary(it), comments: itineraryComments() } : null; });
  if (!data) notFound();
  return <PublicItinerario tenant={c.slug} token={token} company={{ name: c.name, shortName: c.shortName }} itinerary={data.itinerary} comments={data.comments} />;
}
