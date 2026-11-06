// XLSX de «Descargar decisiones» con exceljs: una hoja por sección, fila de título con la marca, cabecera navy con
// texto blanco, filas alternas, columnas con ancho proporcional, cabecera inmovilizada y filtro automático.

import ExcelJS from "exceljs";
import type { Documento } from "@/server/exportar";

const NAVY = "FF0D1B2A", GOLD = "FFA87A14", ZEBRA = "FFF4F5F7", INK = "FF0F1520", MUTED = "FF5C6470", WHITE = "FFFFFFFF";
const hoja = (t: string) => t.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Hoja";

export async function documentoXlsx(doc: Documento): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestión estratégica · 4Shine Empresas"; wb.created = new Date(); wb.title = `${doc.titulo} · ${doc.empresa}`; wb.subject = doc.subtitulo;
  const usados = new Set<string>();
  for (const s of doc.secciones) {
    let nombre = hoja(s.titulo); let k = 2; while (usados.has(nombre)) nombre = hoja(`${s.titulo} ${k++}`); usados.add(nombre);
    const ws = wb.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 5 }] });
    const nCols = s.columnas.length;
    const pesos = s.anchos && s.anchos.length === nCols ? s.anchos : s.columnas.map(() => 1);
    const suma = pesos.reduce((a, b) => a + b, 0);
    ws.columns = s.columnas.map((_, i) => ({ width: Math.max(8, Math.round((pesos[i] / suma) * 180)) }));
    ws.mergeCells(1, 1, 1, nCols); ws.mergeCells(2, 1, 2, nCols); ws.mergeCells(3, 1, 3, nCols);
    const r1 = ws.getCell(1, 1); r1.value = `${doc.titulo} · ${doc.empresa}`; r1.font = { name: "Arial", size: 14, bold: true, color: { argb: WHITE } }; r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; r1.alignment = { vertical: "middle" }; ws.getRow(1).height = 26;
    const r2 = ws.getCell(2, 1); r2.value = `${s.titulo}${s.intro ? ` — ${s.intro}` : ""}`; r2.font = { name: "Arial", size: 10, color: { argb: INK } }; r2.alignment = { wrapText: true, vertical: "top" }; ws.getRow(2).height = s.intro ? 34 : 18;
    const r3 = ws.getCell(3, 1); r3.value = `${doc.fecha} · Gestión estratégica · 4Shine Empresas`; r3.font = { name: "Arial", size: 9, italic: true, color: { argb: MUTED } }; r3.border = { bottom: { style: "medium", color: { argb: GOLD } } };
    ws.getRow(4).height = 6;
    const cab = ws.getRow(5); cab.values = s.columnas.map((c) => c.toUpperCase());
    cab.eachCell((cell) => { cell.font = { name: "Arial", size: 9, bold: true, color: { argb: WHITE } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; cell.alignment = { vertical: "middle", wrapText: true }; });
    cab.height = 22;
    (s.filas.length ? s.filas : [["Sin registros."]]).forEach((f, i) => {
      const row = ws.addRow(f.map((v) => (/^-?\d+(,\d+)?$/.test(v) ? Number(v.replace(",", ".")) : v)));
      row.eachCell({ includeEmpty: true }, (cell) => { cell.font = { name: "Arial", size: 9, color: { argb: INK } }; cell.alignment = { wrapText: true, vertical: "top" }; if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }; cell.border = { bottom: { style: "hair", color: { argb: "FFE6E8EC" } } }; });
    });
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + Math.max(1, s.filas.length), column: nCols } };
    for (const nota of s.notas ?? []) { const r = ws.addRow([`• ${nota}`]); ws.mergeCells(r.number, 1, r.number, nCols); r.getCell(1).font = { name: "Arial", size: 9, italic: true, color: { argb: MUTED } }; r.getCell(1).alignment = { wrapText: true }; }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
