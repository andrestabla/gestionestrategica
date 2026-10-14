import { RestablecerClient } from "./restablecer-client";

// /restablecer/<token> (administrador) o /<empresa>/restablecer/<token>: el
// token del correo se valida al enviar la contraseña nueva.
export default async function RestablecerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RestablecerClient token={token} />;
}
