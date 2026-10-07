@AGENTS.md

# Plataforma 4Shine Empresas

- Derivada de PGTD. Las definiciones del sistema (capacidades, dimensiones, prácticas, evidencias, metodologías, frameworks, etapas, test) viven en `src/data/4shine.json`, exportado desde `/Users/andrestabla/Documents/4Shine empresas/4Shine Empresas/_generadores/export_plataforma.py`. No se editan en este repositorio: se regenera el JSON.
- El índice `line` 1..4 de PGTD se conserva en todo el código y significa capacidad: 1 Dirección, 2 Liderazgo, 3 Ejecución, 4 Multiplicación. Las dimensiones se identifican por su código (`DIR-1`…`MUL-5`) y cuelgan de una capacidad; no hay rejilla línea × dimensión.
- Lenguaje de la interfaz: capacidad, dimensión, práctica, evidencia, advisor, empresa, junta. Nunca «línea 4.x», «institución» ni «universidad».
- La empresa demo es Andina Suministros; sus datos están en `src/data/demo.ts`, `cmi.ts`, `proyectos.ts` y `od-demo.ts`.
- El benchmark sectorial (M2, M7) lee `src/data/sector/<clave>.json`, generado con `npm run sector:fetch -- <clave> <CIIU…>` desde datos abiertos de Supersociedades; no se edita a mano. El sector de la empresa se fija en `INSTITUTION.sectorKey` y sus estados financieros en `FINANCIALS` (`demo.ts`).
- La matriz 4Shine de priorización (criterios, pesos, escala, reglas de decisión) vive en `src/lib/priorizacion.ts` y sigue el documento `Matriz_priorización.pdf`; los permisos de evaluar y decidir están en `src/lib/permissions.ts`.
- Multiempresa: la empresa es el tenant. Nada en `src/app`, `src/components`, `src/lib` importa constantes de Andina (`INSTITUTION`, `INITIATIVES`, `KPIS`, `SCORES`, `PEOPLE`…): los datos de empresa llegan por `useCatalog()` en el cliente y por `tenantView()`/`catalog()` del store en el servidor; `lib/logic` y `lib/proyectos` reciben la vista como primer argumento. Toda ruta de la API va envuelta en `withTenant()` (`src/app/api/td/_helpers.ts`). `tests/aislamiento.test.ts` lo verifica.
- `npm test` debe pasar antes de cerrar un cambio.
