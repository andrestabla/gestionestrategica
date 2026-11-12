// Fecha fija en la que «viven» las instancias de demostración (AAAA-MM-DD), por slug. Una demo detenida en
// una fecha conserva el sentido de sus datos de ejemplo —vencidas, próximas, avance esperado, fin previsto—
// sin envejecer con el calendario. Archivo mínimo a propósito: lo consultan el servidor y el navegador.
export const HOY_DEMO: Record<string, string> = {
  "demo-siegfried": "2027-05-17",
};
