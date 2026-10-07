// Dependencias de servidor que el store carga con una importación opaca (para
// no entrar al bundle del navegador). Importarlas aquí de forma estática hace
// que el rastreador de archivos de Next las incluya en las funciones
// serverless (Vercel); instrumentation.ts carga este módulo en cada entrada.
// Sin esto, en producción «Cannot find package '@prisma/client'» y la
// plataforma corre solo en memoria.

import "@prisma/client";
import "@prisma/adapter-pg";
import "@prisma/adapter-better-sqlite3";
import "bcryptjs";

export const serverDepsLoaded = true;
