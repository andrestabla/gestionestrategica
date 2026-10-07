// Encuesta anónima de la Fuente 2 (percepción de equipos). Sin sesión: el
// enlace firmado de la empresa da el acceso. Server component que valida el
// token y entrega el formulario cliente.

import { notFound } from "next/navigation";
import { verifySurveyToken } from "@/lib/public-token";
import { hydrateCompanies, companyBySlug } from "@/server/store";
import { SurveyForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [slug, ...rest] = token.split("-");
  await hydrateCompanies();
  const company = companyBySlug(slug);
  if (!company?.active || !verifySurveyToken(slug, rest.join("-"))) notFound();
  return <SurveyForm token={token} company={company.name} />;
}
