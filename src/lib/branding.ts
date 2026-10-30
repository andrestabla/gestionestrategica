"use client";

// Aplicación del tema de marca en vivo: colores (con derivados), tipografía
// de Google Fonts, radio de borde, ancho máximo y CSS personalizado. Se usa
// desde el shell (al entrar) y desde Administración → Branding (al guardar).

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) :
    max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h.toFixed(0)} ${clamp(s, 0, 100).toFixed(0)}% ${clamp(l, 0, 100).toFixed(0)}%)`;

/** Tonos derivados de un hex (hover más oscuro, focus más claro). */
export function derive(hex: string) {
  const [h, s, l] = hexToHsl(hex);
  return {
    hover: hsl(h, s, l - 8),
    focus: hsl(h, clamp(s, 20, 70), l + 14),
    deep: hsl(h, s, l - 14),
    fill: hsl(h, clamp(s, 40, 90), l + 22),
    wash: hsl(h, clamp(s, 30, 60), 96),
  };
}

export type ThemeInput = {
  primary: string; secondary: string; accent: string;
  font: string; radius: string; maxWidth: string;
  customCss?: string; favicon?: string | null;
};

const STYLE_ID = "pgtd-brand-css";
const FONT_ID = "pgtd-brand-font";

export function applyTheme(t: ThemeInput) {
  const root = document.documentElement;
  const a = derive(t.accent);

  // acento: el matiz de marca (kickers, chips, gráficos)
  root.style.setProperty("--cyan", t.accent);
  root.style.setProperty("--cyan-deep", a.deep);
  root.style.setProperty("--cyan-fill", a.fill);
  root.style.setProperty("--cyan-wash", a.wash);
  // primario/secundario: superficies de marca (rail, gradiente profundo)
  root.style.setProperty("--navy", t.primary);
  root.style.setProperty("--navy-deep", t.secondary);
  root.style.setProperty("--grad-deep",
    `linear-gradient(160deg, ${t.secondary} 0%, ${t.primary} 52%, ${a.deep} 130%)`);
  root.style.setProperty("--grad-brand",
    `linear-gradient(90deg, ${a.fill}, ${t.accent} 38%, ${t.primary})`);
  // forma
  root.style.setProperty("--r-md", t.radius);
  root.style.setProperty("--r-lg", `calc(${t.radius} + 4px)`);

  // tipografía (Google Fonts; Inter es la local por defecto)
  if (t.font && t.font !== "Inter") {
    let link = document.getElementById(FONT_ID) as HTMLLinkElement | null;
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.font)}:wght@400;500;600;700;800&display=swap`;
    if (!link) {
      link = document.createElement("link");
      link.id = FONT_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
    root.style.setProperty("--font-sans", `"${t.font}", "Inter", system-ui, sans-serif`);
  } else {
    document.getElementById(FONT_ID)?.remove();
    root.style.removeProperty("--font-sans");
  }

  // ancho máximo del contenido + CSS personalizado
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent =
    `main{max-width:${t.maxWidth} !important}\n` +
    `body{font-family:var(--font-sans)}\n` +
    (t.customCss ?? "");

  // favicon
  if (t.favicon) {
    let icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = t.favicon;
  }
}

/** Compatibilidad con la firma anterior (solo acento). */
export function applyAccent(accent: string | null) {
  const root = document.documentElement;
  if (!accent) {
    for (const v of ["--cyan", "--cyan-deep", "--cyan-fill", "--cyan-wash"]) root.style.removeProperty(v);
    return;
  }
  const a = derive(accent);
  root.style.setProperty("--cyan", accent);
  root.style.setProperty("--cyan-deep", a.deep);
  root.style.setProperty("--cyan-fill", a.fill);
  root.style.setProperty("--cyan-wash", a.wash);
}

/* ─── presets rápidos: colores + tipografía + radio listos ─── */

export type BrandPreset = {
  id: string;
  name: string;
  desc: string;
  values: { primary: string; secondary: string; accent: string; font: string; radius: string };
};

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: "algoritmo", name: "4Shine Empresas",
    desc: "Navy · Cian · Inter · 14px — el tema original",
    values: { primary: "#1a2d5a", secondary: "#0d1830", accent: "#0e93b4", font: "Inter", radius: "14px" },
  },
  {
    id: "institucional", name: "Institucional dorado",
    desc: "Azul profundo · Dorado · Manrope · 12px",
    values: { primary: "#0d1b2a", secondary: "#091220", accent: "#d4af37", font: "Manrope", radius: "12px" },
  },
  {
    id: "territorial", name: "Territorial",
    desc: "Verde monte · Tierra · Outfit · 16px",
    values: { primary: "#1e4d3a", secondary: "#10291f", accent: "#c77b3a", font: "Outfit", radius: "16px" },
  },
  {
    id: "corporativo", name: "Corporativo",
    desc: "Grafito · Azul · Inter · 4px",
    values: { primary: "#22303f", secondary: "#141d27", accent: "#2f6fb6", font: "Inter", radius: "4px" },
  },
  {
    id: "energetico", name: "Energético",
    desc: "Vino · Coral · Poppins · 16px",
    values: { primary: "#5b1f3c", secondary: "#38122a", accent: "#e0634a", font: "Poppins", radius: "16px" },
  },
  {
    id: "tech", name: "Tech",
    desc: "Carbón · Verde neón · Roboto · 0px",
    values: { primary: "#16211c", secondary: "#0b120f", accent: "#27b06a", font: "Roboto", radius: "0px" },
  },
];
