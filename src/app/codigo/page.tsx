import type { Metadata } from "next";
import { CodigoClient } from "./codigo-client";

export const metadata: Metadata = { title: "Tengo un código · Gestión estratégica", description: "Usa el código que te envió tu consultor para registrar tu organización y entrar a tus diagnósticos." };

// /codigo — entrada con el código de acceso a los diagnósticos que envía el administrador o el advisor.
// ?c=GE-XXXX-XXXX deja el código ya escrito (así llega en el correo).
export default async function CodigoPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const c = (await searchParams).c;
  return <CodigoClient inicial={typeof c === "string" ? c.slice(0, 20) : ""} />;
}
