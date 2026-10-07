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

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "@prisma/adapter-better-sqlite3", "better-sqlite3", "pg", "bcryptjs"],
  outputFileTracingIncludes: { "/**": SERVER_PACKAGES },
};

export default nextConfig;
