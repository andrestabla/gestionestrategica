// Montos de dinero escritos a mano: los miles se separan con punto y los decimales con coma (convención de Colombia).

export type Moneda = "COP" | "USD";
export const MONEDAS: Moneda[] = ["COP", "USD"];
export const esMoneda = (x: unknown): x is Moneda => x === "COP" || x === "USD";

/** Da formato a lo que la persona escribe: agrupa los miles con punto y deja hasta dos decimales tras la coma. */
export function formatoMiles(texto: string): string {
  const limpio = String(texto ?? "").replace(/[^\d,]/g, "");
  const coma = limpio.indexOf(",");
  const entero = (coma >= 0 ? limpio.slice(0, coma) : limpio).replace(/^0+(?=\d)/, "");
  const dec = coma >= 0 ? limpio.slice(coma + 1).replace(/,/g, "").slice(0, 2) : null;
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec === null ? agrupado : `${agrupado || "0"},${dec}`;
}

/** Lee un monto escrito con puntos de miles y coma decimal («40.000.000», «1.250,50»). Vacío o ilegible vale 0. */
export function leerMonto(texto: string): number {
  const n = Number(String(texto ?? "").replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Número con puntos de miles, sin moneda («40.000.000»). */
export const miles = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n || 0);

/** Monto con su moneda («COP 40.000.000», «USD 12.500»). */
export const fmtMonto = (n: number, moneda?: string | null) => `${esMoneda(moneda) ? moneda : "COP"} ${miles(n)}`;
