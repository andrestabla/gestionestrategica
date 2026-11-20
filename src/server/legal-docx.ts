// Word de los documentos legales (src/lib/legal) para revisión y firma: tamaño carta, portada breve con título,
// versión y partes, secciones con títulos de nivel 1 (aparecen en el panel de navegación de Word), tablas con
// cabecera navy, bloque de firmas y pie con versión y número de página. Las plantillas salen llenas con los datos
// de la empresa que se pasen; lo que falte queda como línea para completar a mano.

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle, Header, Footer, PageNumber, HeadingLevel } from "docx";
import { PROVEEDOR, fechaLarga, llenarDoc, type Bloque, type DatosFirma, type DocLegal } from "@/lib/legal";

const NAVY = "0D1B2A", GOLD = "A87A14", INK = "1F2430", MUTED = "5C6470", ZEBRA = "F4F5F7", LINE = "D9DCE1";
const FONT = "Arial";
const ANCHO = 9360;   // DXA útiles en carta con márgenes de 1"
const borde = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const bordes = { top: borde, bottom: borde, left: borde, right: borde, insideHorizontal: borde, insideVertical: borde };
const sinBorde = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const sinBordes = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde };

const texto = (t: string, o: { size?: number; color?: string; bold?: boolean; italics?: boolean } = {}) =>
  new TextRun({ text: t, font: FONT, size: o.size ?? 21, color: o.color ?? INK, bold: o.bold, italics: o.italics });
const parrafo = (t: string, o: { after?: number; size?: number; color?: string; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { after: o.after ?? 140, line: 300 }, children: [texto(t, o)] });

function tabla(cabeza: string[], filas: string[][]): Table {
  const pesos = cabeza.map((_, i) => (i === 0 ? 1 : cabeza.length >= 4 ? 1.25 : 2));
  const suma = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => Math.floor((p / suma) * ANCHO));
  anchos[anchos.length - 1] += ANCHO - anchos.reduce((a, b) => a + b, 0);
  const celda = (t: string, i: number, cab: boolean, zebra: boolean) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: cab ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" } : zebra ? { type: ShadingType.CLEAR, fill: ZEBRA, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [texto(cab ? t.toUpperCase() : t, { size: cab ? 16 : 18, bold: cab || i === 0, color: cab ? "FFFFFF" : INK })] })],
  });
  return new Table({ width: { size: ANCHO, type: WidthType.DXA }, columnWidths: anchos, borders: bordes, rows: [
    new TableRow({ tableHeader: true, children: cabeza.map((c, i) => celda(c, i, true, false)) }),
    ...filas.map((f, r) => new TableRow({ cantSplit: true, children: cabeza.map((_, i) => celda(f[i] ?? "", i, false, r % 2 === 1)) })),
  ] });
}

function bloques(bs: Bloque[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const b of bs) {
    if (typeof b === "string") out.push(parrafo(b));
    else if ("lista" in b) for (const [i, x] of b.lista.entries()) out.push(new Paragraph({ bullet: { level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: i === b.lista.length - 1 ? 160 : 80, line: 290 }, children: [texto(x)] }));
    else if ("nota" in b) out.push(parrafo(b.nota, { color: MUTED, italics: true }));
    else { out.push(tabla(b.tabla.cabeza, b.tabla.filas)); out.push(new Paragraph({ spacing: { after: 120 }, children: [] })); }
  }
  return out;
}

function firmas(doc: DocLegal): (Paragraph | Table)[] {
  if (!doc.firmas?.length) return [];
  const n = doc.firmas.length, ancho = Math.floor(ANCHO / n);
  const celda = (f: { parte: string; campos: string[] }) => new TableCell({
    width: { size: ancho, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 80, right: 240 },
    children: [
      new Paragraph({ spacing: { before: 900, after: 60 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 6 } }, children: [texto(f.parte, { bold: true, size: 19 })] }),
      ...f.campos.map((c) => new Paragraph({ spacing: { after: 40 }, children: [texto(c, { size: 18, color: MUTED })] })),
    ],
  });
  return [
    new Paragraph({ spacing: { before: 360 }, keepNext: true, children: [] }),
    new Table({ width: { size: ancho * n, type: WidthType.DXA }, columnWidths: doc.firmas.map(() => ancho), borders: sinBordes, rows: [new TableRow({ cantSplit: true, children: doc.firmas.map(celda) })] }),
  ];
}

/** Genera el Word de un documento legal. `datos` llena los campos de las plantillas (empresa, NIT, representante…). */
export async function docLegalDocx(original: DocLegal, datos: DatosFirma = {}): Promise<Buffer> {
  const doc = llenarDoc(original, datos);
  const children: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { after: 80 }, children: [texto(doc.plantilla ? "ACUERDO" : "POLÍTICA", { size: 16, bold: true, color: GOLD })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 120 }, children: [texto(doc.titulo, { size: 40, bold: true, color: NAVY })] }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } }, spacing: { after: 200 }, children: [texto(`${PROVEEDOR.razon} · NIT ${PROVEEDOR.nit} · Versión del ${fechaLarga(doc.version)}`, { size: 18, color: MUTED })] }),
    parrafo(doc.resumen, { color: MUTED, after: 280 }),
  ];
  for (const s of doc.secciones) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 280, after: 120 }, children: [texto(s.titulo, { size: 25, bold: true, color: NAVY })] }));
    children.push(...bloques(s.bloques));
  }
  children.push(...firmas(doc));
  const d = new Document({
    creator: `${PROVEEDOR.producto} · ${PROVEEDOR.razon}`, title: doc.titulo, description: doc.resumen,
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: INK } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 40, bold: true, color: NAVY } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 25, bold: true, color: NAVY }, paragraph: { outlineLevel: 0 } },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1300, left: 1440, right: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [texto(`${PROVEEDOR.producto.toUpperCase()} · ${PROVEEDOR.razon.toUpperCase()}`, { size: 14, bold: true, color: GOLD })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [
        texto(`${original.corto} · versión ${doc.version} · Página `, { size: 15, color: MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: MUTED }),
        texto(" de ", { size: 15, color: MUTED }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUTED }),
      ] })] }) },
      children,
    }],
  });
  return Packer.toBuffer(d);
}

/** Nombre del archivo: «Acuerdo de confidencialidad · Andina Suministros · v2026-11-20.docx». */
export const nombreDocx = (doc: DocLegal, empresa?: string) =>
  `${[doc.corto, empresa, `v${doc.version}`].filter(Boolean).join(" · ").replace(/[\\/:*?"<>|]+/g, "-")}.docx`;
