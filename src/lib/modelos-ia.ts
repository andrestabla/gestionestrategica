// Modelos de OpenAI que la plataforma ofrece en Administración → Integraciones. Lista revisada con la documentación
// de OpenAI el 12 de noviembre de 2026 (modelos vigentes y fechas de retiro). Los precios son por millón de tokens
// (entrada / salida) y sirven para comparar, no para facturar.

export type ModeloIA = { value: string; label: string; nota: string; retiro?: string };

export const OPENAI_MODELOS: ModeloIA[] = [
  { value: "gpt-6.1-sol", label: "GPT-6.1 Sol · análisis profundo (recomendado)", nota: "Casi la capacidad del modelo mayor a una quinta parte del costo: el indicado para informes que deben explicar causas y cruzar con la industria. US$ 2 / US$ 10 por millón de tokens." },
  { value: "gpt-6-astra", label: "GPT-6 Astra · el más capaz", nota: "El de mayor capacidad y el más costoso: cinco veces el precio de Sol. US$ 10 / US$ 50 por millón de tokens." },
  { value: "gpt-6.1-terra", label: "GPT-6.1 Terra · rápido y equilibrado", nota: "Rápido y con buena redacción, a la mitad del costo de Sol. US$ 1 / US$ 5 por millón de tokens." },
  { value: "gpt-6-luna", label: "GPT-6 Luna · el más económico", nota: "El más barato, para tareas simples y de alto volumen; es el reemplazo directo de GPT-4o mini. US$ 0,10 / US$ 0,50 por millón de tokens." },
  { value: "gpt-4o-mini", label: "GPT-4o mini · anterior", nota: "El modelo con el que nació la plataforma. Redacta informes más cortos y generales.", retiro: "OpenAI lo retira el 14 de enero de 2027: conviene cambiarlo antes." },
];

/** Los modelos anteriores (GPT-4 y GPT-3.5) se llaman por la API de chat; los vigentes, por la de respuestas. */
export const esModeloAnterior = (model: string) => /^gpt-(3|4)/i.test(model.trim());
