"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn-ghost btn-sm no-print" title="Se abre el diálogo de impresión: elige «Guardar como PDF»"><Printer size={13} /> Descargar PDF</button>;
}
