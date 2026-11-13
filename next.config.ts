import type { NextConfig } from "next";

// El store carga Prisma, los adaptadores y bcrypt con una importación opaca
// (no entran al bundle del navegador), así que el rastreador de archivos de
// Next no los ve desde las rutas. Dos refuerzos para que viajen al despliegue:
// src/instrumentation.ts (los importa de forma estática) y esta lista de
// paquetes, tomada del rastreo de la instrumentación, incluida en toda ruta.
const SERVER_PACKAGES = [
  "./node_modules/.prisma/**",
  "./node_modules/@prisma/**",
  "./node_modules/@prisma/adapter-better-sqlite3/**",
  "./node_modules/@prisma/adapter-pg/**",
  "./node_modules/@prisma/client/**",
  "./node_modules/@prisma/client-runtime-utils/**",
  "./node_modules/@prisma/debug/**",
  "./node_modules/@prisma/driver-adapter-utils/**",
  "./node_modules/bcryptjs/**",
  "./node_modules/better-sqlite3/**",
  "./node_modules/bindings/**",
  "./node_modules/file-uri-to-path/**",
  "./node_modules/pg/**",
  "./node_modules/pg-cloudflare/**",
  "./node_modules/pg-connection-string/**",
  "./node_modules/pg-int8/**",
  "./node_modules/pg-pool/**",
  "./node_modules/pg-protocol/**",
  "./node_modules/pg-types/**",
  "./node_modules/pgpass/**",
  "./node_modules/postgres-array/**",
  "./node_modules/postgres-bytea/**",
  "./node_modules/postgres-date/**",
  "./node_modules/postgres-interval/**",
  "./node_modules/split2/**",
  "./node_modules/xtend/**"
];

// Cabeceras de seguridad de toda respuesta. La política de contenido limita de dónde carga el navegador: todo sale
// de este mismo origen, salvo las imágenes (los logos de marca pueden ser enlaces externos) y las descargas directas
// del almacenamiento. Next necesita scripts y estilos en línea para arrancar; en desarrollo, además, eval y el canal
// de recarga. Nadie puede incrustar la plataforma en un marco ajeno ni enviar sus formularios a otro sitio.
const DEV = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",   // la tipografía de marca de una empresa puede venir de Google Fonts
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://*.r2.cloudflarestorage.com${DEV ? " ws: wss:" : ""}`,
  "media-src 'self' blob: https:",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(DEV ? [] : ["upgrade-insecure-requests"]),
].join("; ");
const SEGURIDAD = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
const SIN_CACHE = [{ key: "Cache-Control", value: "no-store" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,   // no anunciar la tecnología del servidor
  async headers() {
    return [
      { source: "/:path*", headers: SEGURIDAD },
      // las respuestas de la API con sesión no se guardan en ninguna caché intermedia ni en el navegador
      { source: "/api/td/:path*", headers: SIN_CACHE },
      { source: "/api/auth/:path*", headers: SIN_CACHE },
    ];
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "@prisma/adapter-better-sqlite3", "better-sqlite3", "pg", "bcryptjs"],
  outputFileTracingIncludes: { "/**": SERVER_PACKAGES },
};

export default nextConfig;
