// Base de Inteligencia de cada empresa. Tiene dos orígenes: la base curada del sector (hechos revisados a
// mano, `data/conocimiento-sector.ts`) y la base investigada, que la plataforma arma con el modelo y
// búsqueda en la web según la industria y el país de la empresa: cómo va el sector y, sobre todo, cómo
// están las empresas de la misma industria en transformación digital. La investigada se crea al abrir el
// espacio de la empresa y se actualiza cuando el advisor lo pide o cuando cambia la industria. Un hecho
// investigado solo se guarda si su fuente está entre las páginas que el modelo consultó de verdad.
// Reglas puras: el servidor llama al modelo (src/server/inteligencia-ia.ts) y guarda el resultado.

import { baseDe, type BaseConocimiento, type Fuente, type Hecho, type Tema, type TipoFuente } from "@/data/conocimiento-sector";
import type { CompanyInfo } from "@/data/catalogo";

export const TEMAS_BASE: Tema[] = ["mercado", "expansion", "cliente", "digital", "salud", "talento", "liderazgo", "margen", "regulacion", "macro", "demanda"];
const TIPOS: TipoFuente[] = ["oficial", "empresa", "prensa", "consultora", "academico"];

export type LineaDigital = { n: number; name: string };
export type BaseInvestigada = {
  version: 1;
  industria: string;          // la industria y el país con que se investigó: si cambian, la base queda desactualizada
  at: string; model: string;
  fuentes: Fuente[]; hechos: Hecho[];
  consultadas: number;        // páginas que el modelo consultó
  descartados: number;        // hechos que no se guardaron: fuente fuera de las páginas consultadas, página de inicio, sin cifra o texto comercial
};

type Empresa = Pick<CompanyInfo, "name" | "sector" | "sectorKey" | "country"> & { ciiu?: string; size?: string };
const pais = (c: Empresa) => (c.country === "EC" ? "Ecuador" : "Colombia");
/** Descripción de la industria de la empresa: es la clave de la investigación. Vacía si la ficha no dice a qué se dedica. */
export const industriaDe = (c: Empresa) => { const s = (c.sector ?? "").trim(), ciiu = (c.ciiu ?? "").trim(); return s || ciiu ? `${s || "actividad CIIU " + ciiu}${s && ciiu ? ` (CIIU ${ciiu})` : ""} · ${pais(c)}` : ""; };

/** Base de la empresa: los hechos curados de su sector más los investigados para su industria. */
export function baseCombinada(c: Empresa, inv: BaseInvestigada | null): BaseConocimiento | null {
  const curada = baseDe(c);
  if (!inv?.hechos.length) return curada;
  return {
    id: curada?.id ?? "investigada", nombre: curada?.nombre ?? inv.industria, sectorKeys: curada?.sectorKeys ?? [], paises: curada?.paises ?? [],
    fuentes: [...(curada?.fuentes ?? []), ...inv.fuentes], hechos: [...(curada?.hechos ?? []), ...inv.hechos],
  };
}
export const esInvestigado = (h: Pick<Hecho, "id">) => h.id.startsWith("ia-");

/* ═══ Encargo de la investigación ═══ */

const SISTEMA = "Eres analista de inteligencia sectorial de la plataforma Gestión estratégica. Investigas en la web y entregas hechos verificables para comités directivos de empresas medianas de Colombia y Ecuador. Reglas: cada hecho lleva una cifra o un dato concreto, el año al que corresponde, su alcance (país, región o mundo; universo o muestra) y la dirección exacta de la página donde lo leíste. Solo incluyes lo que encontraste en una página que abriste en esta búsqueda; nunca completas de memoria ni estimas. Prefieres fuentes oficiales, gremios, consultoras con informe público, notas de prensa de las propias empresas y prensa económica seria, de los últimos tres años. No incluyes proveedores de tecnología, consultoras, agencias ni páginas comerciales que ofrecen sus servicios: solo datos de la industria y hechos de las empresas que la componen. La fuente es la página concreta del dato (un informe, una nota, un boletín), nunca la página de inicio de un sitio. Si no encuentras un dato, lo omites. Escribes en español neutro de Colombia. Respondes solo con un objeto JSON válido, sin texto antes ni después y sin bloques de código.";

const FORMATO = (lineas: LineaDigital[]) => `Devuelve un objeto JSON con exactamente esta forma:
{"hechos": [{
  "hecho": string (una o dos oraciones con la cifra, el año del dato y el alcance; máximo 55 palabras),
  "temas": string[] (uno a tres de: ${TEMAS_BASE.join(", ")}; el primero es el principal),
  "fuente": {"titulo": string, "editor": string, "fecha": string (mes y año, o año, de publicación), "url": string (la dirección exacta de la página), "tipo": ${TIPOS.map((t) => `"${t}"`).join(" | ")}},
  "nota": string (cautela si la cifra es de otro país, de otra industria, antigua o de una muestra pequeña; cadena vacía si no aplica),
  "dato": null o {"linea": ${lineas.map((l) => l.n).join(" | ")}, "indicador": string (qué mide el porcentaje, máximo 14 palabras, por ejemplo «Empresas que usan inteligencia artificial en algún proceso»), "valor": number (el porcentaje, de 0 a 100), "unidad": "%", "alcance": string (universo y geografía, por ejemplo «Farmacéuticas, global»), "anio": string} (solo cuando el hecho es un porcentaje de adopción o de uso de una práctica digital),
  "par": null o {"empresa": string (nombre de la empresa), "anio": string, "linea": ${lineas.map((l) => l.n).join(" | ")}} (solo cuando el hecho es una iniciativa digital concreta de una empresa nombrada de la misma industria)
}]}
Líneas de la transformación digital para clasificar «linea»: ${lineas.map((l) => `${l.n} = ${l.name}`).join("; ")}.`;

export type BloqueInvestigacion = "adopcion" | "pares" | "exigencias" | "sector";
/** Bloques de investigación, cada uno una búsqueda dirigida: cifras de adopción digital de la industria, iniciativas de
    sus empresas (con los nombres de las que compiten con la empresa, si se conocen) y exigencias que obligan a
    digitalizar; el panorama del sector solo si no hay base curada. */
export function encargoInvestigacion(c: Empresa, lineas: LineaDigital[], conCurada: boolean, competidores: string[] = []): { system: string; bloques: { id: BloqueInvestigacion; user: string }[] } {
  const ind = industriaDe(c), p = pais(c);
  const quien = `EMPRESA: ${c.name}. INDUSTRIA: ${ind}.${c.size ? ` TAMAÑO: ${c.size}.` : ""}`;
  const comun = `Busca primero en ${p}; si no hay datos, en América Latina y luego en el mundo, diciéndolo en el alcance. Haz varias búsquedas distintas y abre las páginas antes de escribir.`;
  const adopcion = `${quien}

Investiga qué tan digitalizadas están las empresas de esta industria, con cifras. ${comun} Entrega entre 8 y 12 hechos, cada uno un porcentaje publicado por una encuesta, un gremio, una entidad oficial o una consultora: empresas del sector que usan gestión de clientes y canales digitales, comercio electrónico, automatización o digitalización de procesos, trazabilidad, analítica, inteligencia artificial, nube, ciberseguridad o gobierno de datos; etapa de madurez digital; inversión en tecnología. Todos llevan «digital» como primer tema y «dato» con el porcentaje; «par» va en null.
${FORMATO(lineas)}`;
  const pares = `${quien}

Investiga qué han hecho en transformación digital las empresas de esta misma industria que compiten en ${p}.${competidores.length ? ` Busca una por una, entre otras: ${competidores.join(", ")}.` : ""} Entrega entre 8 y 12 hechos, de al menos cinco empresas distintas: cada uno una iniciativa concreta y fechada (de 2022 en adelante) de una empresa nombrada: sistemas implantados, plantas o procesos automatizados, canales digitales para clientes, analítica o inteligencia artificial, alianzas tecnológicas o reconocimientos, con su cifra si la hay. La fuente es una nota de prensa, un informe de la propia empresa o prensa económica. Todos llevan «digital» como primer tema y «par» con la empresa; «dato» va en null.
${FORMATO(lineas)}`;
  const exigencias = `${quien}

Investiga qué normas, entidades de control o clientes obligan o empujan a digitalizar en esta industria en ${p}: requisitos de trazabilidad, de datos, de facturación o trámites electrónicos, de seguridad de la información y de protección de datos, con su fecha de entrada en vigor o su plazo. Entrega entre 4 y 6 hechos de fuentes oficiales o de prensa jurídica o económica. Todos llevan «digital» y «regulacion» como temas; «dato» y «par» van en null.
${FORMATO(lineas)}`;
  const sector = `${quien}

Investiga el panorama de esta industria en ${p} para alimentar la planeación estratégica de la empresa. Entrega entre 12 y 16 hechos con cifra, repartidos entre: tamaño y crecimiento del mercado y principales competidores (mercado); márgenes y costos (margen); clientes, canales y demanda (cliente, demanda); regulación y precios (regulacion); talento y empleo (talento); variables macroeconómicas y de comercio exterior que la afectan (macro); expansión geográfica (expansion). En este bloque «dato» y «par» van en null.
${FORMATO(lineas)}`;
  return { system: SISTEMA, bloques: [{ id: "adopcion", user: adopcion }, { id: "pares", user: pares }, { id: "exigencias", user: exigencias }, ...(conCurada ? [] : [{ id: "sector" as const, user: sector }])] };
}

/* ═══ Validación de lo que responde el modelo ═══ */

const s = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Dirección sin protocolo, «www», parámetros ni barra final: así se compara la fuente de un hecho con las páginas consultadas. */
export function urlClave(u: string): string | null {
  try { const x = new URL(u.trim()); if (!/^https?:$/.test(x.protocol)) return null; return `${x.hostname.toLowerCase().replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}`; } catch { return null; }
}

/** Texto de vendedor: describe lo que alguien ofrece, no un hecho de la industria. */
const COMERCIAL = /\b(ofrece|ofrecen|ofrecemos|brinda|brindan|soluciones (?:tecnol[oó]gicas |digitales |integrales )?para|con m[aá]s de \d+ a[nñ]os de experiencia|l[ií]der en soluciones)\b/i;

/** Arma la base investigada con las respuestas de los bloques. `yaCuradas`: direcciones de las fuentes que la base curada
    ya tiene (no se repiten). */
export function parseInvestigacion(respuestas: { data: unknown; urls: string[] }[], meta: { industria: string; model: string; at: string }, lineas: LineaDigital[], yaCuradas: string[] = []): BaseInvestigada {
  const curadas = new Set(yaCuradas.map(urlClave).filter((x): x is string => !!x));
  const consultadas = new Set(respuestas.flatMap((r) => r.urls).map(urlClave).filter((x): x is string => !!x));
  const nLineas = new Set(lineas.map((l) => l.n));
  const fuentes: Fuente[] = [], hechos: Hecho[] = [], vistos = new Set<string>();
  let descartados = 0;
  for (const r of respuestas) {
    const lista = (r.data as { hechos?: unknown } | null)?.hechos;
    if (!Array.isArray(lista)) continue;
    for (const raw of lista) {
      const o = (raw ?? {}) as Record<string, unknown>, f = (o.fuente ?? {}) as Record<string, unknown>;
      const hecho = s(o.hecho, 700), url = s(f.url, 600), clave = urlClave(url);
      if (!hecho || !clave) { descartados++; continue; }
      if (!consultadas.has(clave)) { descartados++; continue; }   // la fuente no está entre las páginas que el modelo abrió
      if (curadas.has(clave)) continue;                              // ya está en la base curada del sector
      if (!clave.includes("/")) { descartados++; continue; }         // la fuente es la página de inicio de un sitio, no la página del dato
      const esPar = !!(o.par && typeof o.par === "object");
      if (!/\d/.test(hecho) || (COMERCIAL.test(hecho) && !esPar)) { descartados++; continue; }   // sin cifra ni fecha, o texto comercial de un proveedor
      const firma = hecho.toLowerCase().replace(/\W+/g, " ").slice(0, 90); if (vistos.has(firma)) continue; vistos.add(firma);
      const temas = (Array.isArray(o.temas) ? o.temas : []).map((t) => s(t, 20).toLowerCase()).filter((t): t is Tema => (TEMAS_BASE as string[]).includes(t)).slice(0, 3);
      let fuente = fuentes.find((x) => urlClave(x.url) === clave);
      if (!fuente) { fuente = { id: `ia-f${fuentes.length + 1}`, titulo: s(f.titulo, 240) || s(f.editor, 120) || clave, editor: s(f.editor, 120) || clave.split("/")[0], fecha: s(f.fecha, 60) || "sin fecha", url, tipo: TIPOS.find((t) => t === s(f.tipo, 20).toLowerCase()) ?? "prensa" }; fuentes.push(fuente); }
      const d = (o.dato ?? null) as Record<string, unknown> | null, p = (o.par ?? null) as Record<string, unknown> | null;
      const lin = (v: unknown) => (typeof v === "number" && nLineas.has(v) ? (v as 1 | 2 | 3 | 4) : null);
      const dato = d && typeof d.valor === "number" && d.valor >= 0 && d.valor <= 100 && lin(d.linea) && s(d.indicador) ? { linea: lin(d.linea)!, indicador: s(d.indicador, 160), valor: Math.round(d.valor * 10) / 10, unidad: "%", alcance: s(d.alcance, 120) || "sin precisar", anio: s(d.anio, 20) || "s. f." } : undefined;
      const par = p && s(p.empresa) && lin(p.linea) ? { empresa: s(p.empresa, 80), anio: s(p.anio, 20) || "s. f.", linea: lin(p.linea)! } : undefined;
      hechos.push({ id: `ia-${hechos.length + 1}`, temas: temas.length ? temas : ["mercado"], hecho, fuente: fuente.id, ...(s(o.nota) ? { nota: s(o.nota, 300) } : {}), ...(dato ? { dato } : {}), ...(par ? { par } : {}) });
    }
  }
  return { version: 1, industria: meta.industria, at: meta.at, model: meta.model, fuentes, hechos, consultadas: consultadas.size, descartados };
}
