// PDF de «Descargar decisiones» con pdf-lib: A4 apaisado, banda de marca (navy) con título, filete dorado, tablas
// con cabecera navy y filas alternas, texto ajustado por columna, saltos de página y pie con marca y paginación.
// Fuentes estándar (Helvetica, WinAnsi): se sanean los caracteres que no cubre.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Documento, Seccion } from "@/server/exportar";

const NAVY = rgb(0x0d / 255, 0x1b / 255, 0x2a / 255);
const GOLD = rgb(0xa8 / 255, 0x7a / 255, 0x14 / 255);
const INK = rgb(0x0f / 255, 0x15 / 255, 0x20 / 255);
const MUTED = rgb(0x5c / 255, 0x64 / 255, 0x70 / 255);
const LINE = rgb(0xe6 / 255, 0xe8 / 255, 0xec / 255);
const ZEBRA = rgb(0xf4 / 255, 0xf5 / 255, 0xf7 / 255);
const WHITE = rgb(1, 1, 1);

/** Sustituye lo que Helvetica (WinAnsi) no codifica. */
export const sanear = (t: string) => t.replace(/→/g, "->").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-").replace(/[    ]/g, " ").replace(/[^\x20-\x7e\xa0-\xff–—‘’“”•…€]/g, "");

function partir(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const out: string[] = [];
  for (const parrafo of sanear(texto).split("\n")) {
    const palabras = parrafo.split(" ");
    let linea = "";
    for (const p of palabras) {
      const prueba = linea ? `${linea} ${p}` : p;
      if (font.widthOfTextAtSize(prueba, size) <= ancho) linea = prueba;
      else {
        if (linea) out.push(linea);
        // palabra más larga que la columna: se corta por caracteres
        let resto = p;
        while (font.widthOfTextAtSize(resto, size) > ancho && resto.length > 1) { let k = resto.length - 1; while (k > 1 && font.widthOfTextAtSize(resto.slice(0, k), size) > ancho) k--; out.push(resto.slice(0, k)); resto = resto.slice(k); }
        linea = resto;
      }
    }
    out.push(linea);
  }
  return out;
}

export async function documentoPdf(doc: Documento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.titulo} · ${doc.empresa}`); pdf.setAuthor("Gestión estratégica · 4Shine Empresas"); pdf.setSubject(doc.subtitulo);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 841.89, H = 595.28, M = 36;   // A4 apaisado
  let page: PDFPage = pdf.addPage([W, H]); let y = 0; let nPag = 0;

  const cabecera = () => {
    nPag++;
    page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: NAVY });
    page.drawRectangle({ x: 0, y: H - 67, width: W, height: 3, color: GOLD });
    page.drawText(sanear("GESTIÓN ESTRATÉGICA · 4SHINE EMPRESAS"), { x: M, y: H - 24, size: 8, font: bold, color: rgb(0.85, 0.87, 0.9) });
    page.drawText(sanear(`${doc.titulo} · ${doc.empresa}`), { x: M, y: H - 44, size: 15, font: bold, color: WHITE });
    const f = sanear(doc.fecha); page.drawText(f, { x: W - M - font.widthOfTextAtSize(f, 9), y: H - 44, size: 9, font, color: rgb(0.85, 0.87, 0.9) });
    y = H - 88;
  };
  const pie = () => {
    page.drawLine({ start: { x: M, y: 28 }, end: { x: W - M, y: 28 }, thickness: 0.5, color: LINE });
    page.drawText(sanear(doc.pie), { x: M, y: 16, size: 7.5, font, color: MUTED });
    const p = `Página ${nPag}`; page.drawText(p, { x: W - M - font.widthOfTextAtSize(p, 7.5), y: 16, size: 7.5, font, color: MUTED });
  };
  const nueva = () => { pie(); page = pdf.addPage([W, H]); cabecera(); };
  const asegurar = (alto: number) => { if (y - alto < 40) nueva(); };

  cabecera();
  page.drawText(sanear(doc.subtitulo), { x: M, y, size: 10, font, color: MUTED }); y -= 22;

  for (const s of doc.secciones) seccion(s);

  function seccion(s: Seccion) {
    asegurar(40);
    page.drawText(sanear(s.titulo), { x: M, y, size: 12, font: bold, color: NAVY }); y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: M + 40, y }, thickness: 2, color: GOLD }); y -= 14;
    if (s.intro) { for (const l of partir(s.intro, font, 8.5, W - 2 * M)) { asegurar(12); page.drawText(l, { x: M, y, size: 8.5, font, color: MUTED }); y -= 11; } y -= 4; }
    const anchoTotal = W - 2 * M;
    const pesos = s.anchos && s.anchos.length === s.columnas.length ? s.anchos : s.columnas.map(() => 1);
    const suma = pesos.reduce((a, b) => a + b, 0);
    const anchos = pesos.map((p) => (p / suma) * anchoTotal);
    const size = 7.5, pad = 4, lh = 9.5;
    const filaAltura = (celdas: string[], f: PDFFont) => Math.max(...celdas.map((c, i) => partir(c, f, size, anchos[i] - 2 * pad).length)) * lh + 2 * pad;
    const dibujarFila = (celdas: string[], f: PDFFont, fondo: typeof NAVY | null, color: typeof INK) => {
      const alto = filaAltura(celdas, f);
      asegurar(alto);
      if (fondo) page.drawRectangle({ x: M, y: y - alto, width: anchoTotal, height: alto, color: fondo });
      let x = M;
      celdas.forEach((c, i) => {
        const lineas = partir(c, f, size, anchos[i] - 2 * pad);
        lineas.forEach((l, j) => page.drawText(l, { x: x + pad, y: y - pad - lh * (j + 1) + 3, size, font: f, color }));
        x += anchos[i];
      });
      page.drawLine({ start: { x: M, y: y - alto }, end: { x: M + anchoTotal, y: y - alto }, thickness: 0.4, color: LINE });
      y -= alto;
    };
    const cab = () => dibujarFila(s.columnas.map((c) => c.toUpperCase()), bold, NAVY, WHITE);
    cab();
    if (!s.filas.length) dibujarFila(["Sin registros."], font, null, MUTED);
    s.filas.forEach((f, i) => { const antes = nPag; const alto = filaAltura(f, font); if (y - alto < 40) { nueva(); cab(); } dibujarFila(f, font, i % 2 ? ZEBRA : null, INK); void antes; });
    y -= 8;
    for (const nota of s.notas ?? []) { for (const l of partir(`• ${nota}`, font, 8, W - 2 * M)) { asegurar(11); page.drawText(l, { x: M, y, size: 8, font, color: MUTED }); y -= 10.5; } }
    y -= 14;
  }
  pie();
  return pdf.save();
}
