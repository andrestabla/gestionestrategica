// DOCX de «Descargar decisiones» con la librería docx: página apaisada, cabecera con marca, título en navy con filete
// dorado, tablas con cabecera navy y filas alternas, notas al pie de cada sección, pie con marca y número de página.

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle, Header, Footer, PageNumber, PageOrientation, HeadingLevel } from "docx";
import type { Documento, Seccion } from "@/server/exportar";

const NAVY = "0D1B2A", GOLD = "A87A14", INK = "0F1520", MUTED = "5C6470", ZEBRA = "F4F5F7", LINE = "E6E8EC";
const FONT = "Arial";
const borde = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const bordes = { top: borde, bottom: borde, left: borde, right: borde, insideHorizontal: borde, insideVertical: borde };

const tabla = (s: Seccion) => {
  const total = 14400;   // DXA del ancho útil apaisado (A4 - márgenes)
  const pesos = s.anchos && s.anchos.length === s.columnas.length ? s.anchos : s.columnas.map(() => 1);
  const suma = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => Math.round((p / suma) * total));
  const celda = (t: string, i: number, cab: boolean, zebra: boolean) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: cab ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" } : zebra ? { type: ShadingType.CLEAR, fill: ZEBRA, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: cab, size: cab ? 15 : 16, font: FONT, color: cab ? "FFFFFF" : INK })] })],
  });
  const filas = s.filas.length ? s.filas : [["Sin registros.", ...s.columnas.slice(1).map(() => "")]];
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: anchos, borders: bordes, rows: [
    new TableRow({ tableHeader: true, children: s.columnas.map((c, i) => celda(c.toUpperCase(), i, true, false)) }),
    ...filas.map((f, r) => new TableRow({ children: s.columnas.map((_, i) => celda(f[i] ?? "", i, false, r % 2 === 1)) })),
  ] });
};

export async function documentoDocx(doc: Documento): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: doc.titulo, bold: true, size: 40, font: FONT, color: NAVY })] }),
    new Paragraph({ children: [new TextRun({ text: `${doc.empresa} · ${doc.fecha}`, size: 20, font: FONT, color: MUTED })], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 4 } }, spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: doc.subtitulo, size: 20, font: FONT, color: INK })], spacing: { after: 240 } }),
  ];
  for (const s of doc.secciones) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: s.titulo, bold: true, size: 26, font: FONT, color: NAVY })], spacing: { before: 240, after: 80 } }));
    if (s.intro) children.push(new Paragraph({ children: [new TextRun({ text: s.intro, size: 18, font: FONT, color: MUTED })], spacing: { after: 120 } }));
    children.push(tabla(s));
    for (const n of s.notas ?? []) children.push(new Paragraph({ children: [new TextRun({ text: n, size: 17, font: FONT, color: MUTED })], bullet: { level: 0 }, spacing: { before: 80 } }));
  }
  const d = new Document({
    creator: "Gestión estratégica · 4Shine Empresas", title: `${doc.titulo} · ${doc.empresa}`, description: doc.subtitulo,
    styles: { default: { document: { run: { font: FONT, size: 18, color: INK } } } },
    numbering: { config: [] },
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 }, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "GESTIÓN ESTRATÉGICA · 4SHINE EMPRESAS", bold: true, size: 14, font: FONT, color: GOLD, characterSpacing: 40 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: `${doc.pie} · Página `, size: 14, font: FONT, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 14, font: FONT, color: MUTED })] })] }) },
      children,
    }],
  });
  return Packer.toBuffer(d);
}
