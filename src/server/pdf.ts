// PDF de los informes, generado en el servidor con un navegador sin pantalla: abre la versión «documento» del informe
// (portada, tipografía editorial, secciones que no se cortan) con la misma sesión de quien lo pide y la descarga como
// archivo. Así el informe sale igual al de pantalla —gráficas incluidas— sin pasar por el cuadro de impresión.
// En Vercel usa el Chromium empaquetado de @sparticuz/chromium; en local, el Chrome instalado (o CHROME_PATH).

import type { Browser } from "puppeteer-core";

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter((x): x is string => !!x);

async function abrirNavegador(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true, defaultViewport: { width: 1240, height: 1754 } });
  }
  const { existsSync } = await import("node:fs");
  const ruta = LOCAL_CHROME.find((p) => existsSync(p));
  if (!ruta) throw new Error("No hay un navegador para generar el PDF en este equipo (define CHROME_PATH).");
  return puppeteer.launch({ executablePath: ruta, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"], defaultViewport: { width: 1240, height: 1754 } });
}

/** Encabezado y pie de cada página (fuera de la portada). Texto escapado: viene de datos de la empresa. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const plantilla = (izq: string, der: string) => `<div style="width:100%;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#8a93a3;padding:0 16mm;display:flex;justify-content:space-between;">${izq}${der}</div>`;

export type DocumentoPdf = {
  url: string;          // la página del informe en modo documento (mismo origen)
  cookie?: string;      // la cabecera Cookie de quien lo pide: el navegador abre el informe con su sesión
  empresa: string;
  titulo: string;
  hojas?: boolean;      // el informe ya trae sus propias hojas editoriales (márgenes y pie incluidos)
};

/** Genera el PDF del informe. Espera a que la página termine de cargar sus datos y sus gráficas. */
export async function generarPdf(d: DocumentoPdf): Promise<Buffer> {
  const navegador = await abrirNavegador();
  try {
    const page = await navegador.newPage();
    const url = new URL(d.url);
    if (d.cookie) {
      const cookies = d.cookie.split(/;\s*/).map((c) => { const i = c.indexOf("="); return i > 0 ? { name: c.slice(0, i), value: c.slice(i + 1), domain: url.hostname, path: "/", httpOnly: true, secure: url.protocol === "https:" } : null; }).filter((c): c is NonNullable<typeof c> => !!c);
      if (cookies.length) await page.setCookie(...cookies);
    }
    await page.emulateMediaType("print");
    await page.goto(url.href, { waitUntil: "networkidle0", timeout: 45_000 });
    // lo que carga después (datos del informe, gráficas): sin indicadores de carga y con las fuentes listas
    await page.waitForFunction(() => !document.querySelector(".animate-spin, [data-cargando]") && document.fonts.status === "loaded", { timeout: 25_000, polling: 250 }).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 400));
    if (d.hojas) return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
    // la portada va sin encabezado ni pie: se imprime aparte y se une al cuerpo, que numera desde su primera página
    const hayPortada = await page.evaluate(() => !!document.querySelector(".doc-portada"));
    await page.evaluate(() => document.documentElement.classList.add("pdf-cuerpo"));
    const cuerpo = await page.pdf({
      format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: plantilla(`<span>${esc(d.empresa)}</span>`, `<span>Gestión estratégica · 4Shine Empresas</span>`),
      footerTemplate: plantilla(`<span>${esc(d.titulo)}</span>`, `<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>`),
      margin: { top: "18mm", bottom: "18mm", left: "0", right: "0" },
    });
    if (!hayPortada) return Buffer.from(cuerpo);
    await page.evaluate(() => { document.documentElement.classList.remove("pdf-cuerpo"); document.documentElement.classList.add("pdf-portada"); });
    const portada = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, pageRanges: "1" });
    const { PDFDocument } = await import("pdf-lib");
    const out = await PDFDocument.create();
    const [a, b] = await Promise.all([PDFDocument.load(portada), PDFDocument.load(cuerpo)]);
    for (const pg of await out.copyPages(a, [0])) out.addPage(pg);
    for (const pg of await out.copyPages(b, b.getPageIndices())) out.addPage(pg);
    out.setTitle(`${d.titulo} · ${d.empresa}`); out.setAuthor("Gestión estratégica · 4Shine Empresas"); out.setCreator("Gestión estratégica");
    return Buffer.from(await out.save());
  } finally {
    await navegador.close().catch(() => undefined);
  }
}

/** Nombre de archivo seguro y legible: «Andina Suministros · Madurez digital · abril de 2027.pdf». */
export const nombrePdf = (partes: string[]) => `${partes.filter(Boolean).join(" · ").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 150)}.pdf`;
